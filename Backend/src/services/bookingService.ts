import { AssetStatus, BookingStatus, Prisma, Role } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { createAuditLog } from "../repositories/auditLogRepository.js";
import { createNotification } from "../repositories/notificationRepository.js";
import { badRequest, conflict, forbidden, notFound } from "../utils/httpError.js";
import { getPagination, paginated } from "../utils/pagination.js";

const requestedBookingStatuses: BookingStatus[] = [BookingStatus.REQUESTED, BookingStatus.PENDING];
const occupiedBookingStatuses: BookingStatus[] = [BookingStatus.APPROVED, BookingStatus.ACTIVE];
const blockingBookingStatuses: BookingStatus[] = [
  BookingStatus.REQUESTED,
  BookingStatus.PENDING,
  BookingStatus.APPROVED,
  BookingStatus.ACTIVE
];
const calendarBookingStatuses: BookingStatus[] = [
  BookingStatus.REQUESTED,
  BookingStatus.PENDING,
  BookingStatus.APPROVED,
  BookingStatus.ACTIVE,
  BookingStatus.COMPLETED
];
const completableBookingStatuses: BookingStatus[] = [BookingStatus.APPROVED, BookingStatus.ACTIVE];
const terminalBookingStatuses: BookingStatus[] = [
  BookingStatus.CANCELLED,
  BookingStatus.REJECTED,
  BookingStatus.COMPLETED
];
const nonBookableAssetStatuses: AssetStatus[] = [
  AssetStatus.MAINTENANCE,
  AssetStatus.RETIRED,
  AssetStatus.LOST
];

const userSummarySelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  departmentId: true
} satisfies Prisma.UserSelect;

const departmentSummarySelect = {
  id: true,
  name: true,
  code: true,
  status: true
} satisfies Prisma.DepartmentSelect;

const assetSummarySelect = {
  id: true,
  assetCode: true,
  serialNumber: true,
  name: true,
  status: true,
  departmentId: true,
  location: true,
  isBookable: true,
  department: { select: departmentSummarySelect }
} satisfies Prisma.AssetSelect;

const bookingInclude = {
  asset: { select: assetSummarySelect },
  requestedBy: { select: userSummarySelect },
  approvedBy: { select: userSummarySelect }
} satisfies Prisma.BookingInclude;

type BookingPayload = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

const hasWhere = (where: Prisma.BookingWhereInput) => Object.keys(where).length > 0;

const andWhere = (...clauses: Prisma.BookingWhereInput[]): Prisma.BookingWhereInput => {
  const activeClauses = clauses.filter(hasWhere);
  if (activeClauses.length === 0) return {};
  if (activeClauses.length === 1) return activeClauses[0];
  return { AND: activeClauses };
};

const textContains = (value: string) => ({
  contains: value,
  mode: Prisma.QueryMode.insensitive
});

const getResourceId = (data: { assetId?: string; resourceId?: string }) => {
  const resourceId = data.resourceId ?? data.assetId;
  if (!resourceId) throw badRequest("resourceId or assetId is required.");
  return resourceId;
};

const lifecycleStatus = (booking: Pick<BookingPayload, "status" | "startTime" | "endTime">, now = new Date()) => {
  if (requestedBookingStatuses.includes(booking.status)) return "REQUESTED";
  if (booking.status === BookingStatus.APPROVED && booking.startTime <= now && booking.endTime >= now) return "ACTIVE";
  if ((booking.status === BookingStatus.APPROVED || booking.status === BookingStatus.ACTIVE) && booking.endTime < now) {
    return "COMPLETED";
  }
  return booking.status;
};

const formatBooking = (booking: BookingPayload) => ({
  ...booking,
  resourceId: booking.assetId,
  resource: {
    ...booking.asset,
    assetTag: booking.asset.assetCode
  },
  bookedBy: booking.requestedBy,
  department: booking.asset.department ?? null,
  lifecycleStatus: lifecycleStatus(booking)
});

const formatCalendarEvent = (booking: BookingPayload) => ({
  id: booking.id,
  resourceId: booking.assetId,
  title: booking.purpose,
  start: booking.startTime.toISOString(),
  end: booking.endTime.toISOString(),
  status: lifecycleStatus(booking),
  bookingStatus: booking.status,
  bookedBy: booking.requestedBy,
  department: booking.asset.department
});

const assertFutureStart = (startTime: Date) => {
  if (startTime <= new Date()) {
    throw conflict("Past bookings cannot be created or modified.");
  }
};

const assertBookingIsFutureModifiable = (booking: BookingPayload) => {
  if (booking.startTime <= new Date()) {
    throw conflict("Past bookings cannot be modified.");
  }
};

const assertReadable = (booking: BookingPayload, actor: Express.User) => {
  if (actor.role === Role.EMPLOYEE && booking.requestedById !== actor.id) {
    throw forbidden("Employees can only access their own bookings.");
  }

  if (actor.role === Role.MANAGER && booking.asset.departmentId !== actor.departmentId) {
    throw forbidden("Managers can only access department bookings.");
  }
};

const assertCanWriteRequest = (booking: BookingPayload, actor: Express.User) => {
  if (actor.role === Role.EMPLOYEE && booking.requestedById !== actor.id) {
    throw forbidden("Employees can only modify their own bookings.");
  }

  if (actor.role === Role.MANAGER && booking.asset.departmentId !== actor.departmentId) {
    throw forbidden("Managers can only modify department bookings.");
  }
};

const assertCanApprove = (booking: BookingPayload, actor: Express.User) => {
  if (actor.role === Role.MANAGER && booking.asset.departmentId !== actor.departmentId) {
    throw forbidden("Managers can only approve department bookings.");
  }
};

const assertBookableAsset = async (resourceId: string, actor: Express.User) => {
  const asset = await prisma.asset.findUnique({ where: { id: resourceId }, select: assetSummarySelect });
  if (!asset) throw notFound("Resource not found.");
  if (!asset.isBookable) throw conflict("Resource is not bookable.");
  if (nonBookableAssetStatuses.includes(asset.status)) {
    throw conflict(`Resource cannot be booked while status is ${asset.status}.`);
  }
  if (actor.role === Role.MANAGER && asset.departmentId !== actor.departmentId) {
    throw forbidden("Managers can only book resources in their assigned department.");
  }
  return asset;
};

const assertNoBookingConflict = async (
  assetId: string,
  startTime: Date,
  endTime: Date,
  excludeBookingId?: string,
  statuses: BookingStatus[] = blockingBookingStatuses
) => {
  const conflictBooking = await prisma.booking.findFirst({
    where: {
      assetId,
      status: { in: statuses },
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      startTime: { lt: endTime },
      endTime: { gt: startTime }
    },
    select: { id: true, status: true, startTime: true, endTime: true }
  });

  if (conflictBooking) {
    throw conflict("Booking overlaps with an existing booking.");
  }
};

const assertNoDuplicateBooking = async (
  assetId: string,
  requestedById: string,
  startTime: Date,
  endTime: Date,
  excludeBookingId?: string
) => {
  const duplicate = await prisma.booking.findFirst({
    where: {
      assetId,
      requestedById,
      startTime,
      endTime,
      status: { in: blockingBookingStatuses },
      id: excludeBookingId ? { not: excludeBookingId } : undefined
    },
    select: { id: true }
  });

  if (duplicate) throw conflict("Duplicate booking request already exists.");
};

const completeElapsedBookings = async () => {
  const now = new Date();

  await prisma.booking.updateMany({
    where: { status: BookingStatus.APPROVED, startTime: { lte: now }, endTime: { gte: now } },
    data: { status: BookingStatus.ACTIVE }
  });

  const elapsed = await prisma.booking.findMany({
    where: { status: { in: [BookingStatus.APPROVED, BookingStatus.ACTIVE] }, endTime: { lt: now } },
    select: { id: true }
  });

  if (elapsed.length === 0) return;

  await prisma.booking.updateMany({
    where: { id: { in: elapsed.map((booking) => booking.id) } },
    data: { status: BookingStatus.COMPLETED }
  });

  await Promise.all(
    elapsed.map((booking) =>
      createAuditLog({
        actorId: null,
        entityType: "Booking",
        entityId: booking.id,
        action: "completed",
        metadata: { completedBy: "system" }
      })
    )
  );
};

const buildBookingListWhere = (query: Record<string, unknown>, actor: Express.User) => {
  const clauses: Prisma.BookingWhereInput[] = [];
  const resourceId = query.resourceId ?? query.assetId;

  if (resourceId) clauses.push({ assetId: String(resourceId) });
  if (query.requestedById) clauses.push({ requestedById: String(query.requestedById) });
  if (query.status) clauses.push({ status: query.status as BookingStatus });
  if (query.departmentId) clauses.push({ asset: { departmentId: String(query.departmentId) } });
  if (query.from || query.to) {
    clauses.push({
      startTime: {
        gte: query.from ? new Date(String(query.from)) : undefined,
        lte: query.to ? new Date(String(query.to)) : undefined
      }
    });
  }
  if (query.search) {
    const search = String(query.search);
    clauses.push({
      OR: [
        { purpose: textContains(search) },
        { asset: { name: textContains(search) } },
        { asset: { assetCode: textContains(search) } },
        { requestedBy: { name: textContains(search) } },
        { requestedBy: { email: textContains(search) } }
      ]
    });
  }

  const scopedWhere =
    actor.role === Role.EMPLOYEE
      ? { requestedById: actor.id }
      : actor.role === Role.MANAGER
        ? { asset: { departmentId: actor.departmentId } }
        : {};

  return andWhere(...clauses, scopedWhere);
};

const buildOrderBy = (query: Record<string, unknown>): Prisma.BookingOrderByWithRelationInput => {
  const sortBy = String(query.sortBy ?? "startTime");
  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";
  return { [sortBy]: sortOrder };
};

const getDateRange = (query: { date?: string; week?: string; month?: string }) => {
  if (query.date) {
    const start = new Date(`${query.date}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
  }

  if (query.month) {
    const [year, month] = query.month.split("-").map(Number);
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    return { start, end };
  }

  if (query.week) {
    const [yearValue, weekValue] = query.week.split("-W");
    const year = Number(yearValue);
    const week = Number(weekValue);
    const fourthOfJanuary = new Date(Date.UTC(year, 0, 4));
    const day = fourthOfJanuary.getUTCDay() || 7;
    const start = new Date(fourthOfJanuary);
    start.setUTCDate(fourthOfJanuary.getUTCDate() - day + 1 + (week - 1) * 7);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    return { start, end };
  }

  throw badRequest("date, week, or month is required.");
};

const notifyStartsSoon = async (booking: BookingPayload, client: Prisma.TransactionClient) => {
  const now = new Date();
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (booking.startTime > now && booking.startTime <= twentyFourHoursFromNow) {
    await createNotification(
      {
        userId: booking.requestedById,
        type: "BOOKING_STARTS_SOON",
        title: "Booking starts soon",
        message: `${booking.asset.name} booking starts soon.`,
        relatedEntityType: "Booking",
        relatedEntityId: booking.id
      },
      client
    );
  }
};

export const listBookings = async (query: Record<string, unknown>, actor: Express.User) => {
  await completeElapsedBookings();
  const { page, limit, skip } = getPagination(query);
  const where = buildBookingListWhere(query, actor);

  const [items, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: bookingInclude,
      orderBy: buildOrderBy(query),
      skip,
      take: limit
    }),
    prisma.booking.count({ where })
  ]);

  return paginated(items.map(formatBooking), total, page, limit);
};

export const getBooking = async (id: string, actor: Express.User) => {
  await completeElapsedBookings();
  const booking = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  if (!booking) throw notFound("Booking not found.");
  assertReadable(booking, actor);
  return formatBooking(booking);
};

export const createBooking = async (
  data: { assetId?: string; resourceId?: string; startTime: string; endTime: string; purpose: string },
  actor: Express.User
) => {
  const assetId = getResourceId(data);
  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);
  assertFutureStart(startTime);
  await assertBookableAsset(assetId, actor);

  await Promise.all([
    assertNoDuplicateBooking(assetId, actor.id, startTime, endTime),
    assertNoBookingConflict(assetId, startTime, endTime)
  ]);

  const booking = await prisma.booking.create({
    data: {
      assetId,
      requestedById: actor.id,
      startTime,
      endTime,
      purpose: data.purpose,
      status: BookingStatus.REQUESTED
    },
    include: bookingInclude
  });

  await createAuditLog({
    actorId: actor.id,
    entityType: "Booking",
    entityId: booking.id,
    action: "created",
    metadata: { assetId, startTime, endTime }
  });

  await createNotification({
    userId: actor.id,
    type: "BOOKING_CREATED",
    title: "Booking requested",
    message: `Booking request for ${booking.asset.name} was created.`,
    relatedEntityType: "Booking",
    relatedEntityId: booking.id
  });

  const managerId = booking.asset.department?.id
    ? (
        await prisma.department.findUnique({
          where: { id: booking.asset.department.id },
          select: { managerId: true }
        })
      )?.managerId
    : null;

  if (managerId && managerId !== actor.id) {
    await createNotification({
      userId: managerId,
      type: "BOOKING_APPROVAL_REQUIRED",
      title: "Booking approval needed",
      message: `${actor.name} requested ${booking.asset.name}.`,
      relatedEntityType: "Booking",
      relatedEntityId: booking.id
    });
  }

  return formatBooking(booking);
};

export const updateBooking = async (
  id: string,
  data: {
    assetId?: string;
    resourceId?: string;
    startTime?: string;
    endTime?: string;
    purpose?: string;
    status?: BookingStatus;
    decisionNotes?: string | null;
  },
  actor: Express.User
) => {
  const current = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  if (!current) throw notFound("Booking not found.");
  assertCanWriteRequest(current, actor);
  assertBookingIsFutureModifiable(current);

  if (data.status === BookingStatus.COMPLETED) {
    if (!completableBookingStatuses.includes(current.status)) {
      throw conflict("Only approved or active bookings can be completed.");
    }
    if (current.endTime > new Date()) throw conflict("Booking cannot be completed before the scheduled end time.");

    const completed = await prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.COMPLETED, decisionNotes: data.decisionNotes ?? current.decisionNotes },
      include: bookingInclude
    });
    await createAuditLog({
      actorId: actor.id,
      entityType: "Booking",
      entityId: id,
      action: "completed",
      metadata: { decisionNotes: data.decisionNotes }
    });
    return formatBooking(completed);
  }

  if (data.status && data.status !== current.status) {
    throw conflict("Use approve, reject, cancel, or complete workflow actions for booking status changes.");
  }

  if (!requestedBookingStatuses.includes(current.status)) {
    throw conflict("Only requested bookings can be updated.");
  }

  const assetId = data.resourceId ?? data.assetId ?? current.assetId;
  const startTime = data.startTime ? new Date(data.startTime) : current.startTime;
  const endTime = data.endTime ? new Date(data.endTime) : current.endTime;
  if (endTime <= startTime) throw badRequest("endTime must be after startTime.");
  assertFutureStart(startTime);
  await assertBookableAsset(assetId, actor);
  await Promise.all([
    assertNoDuplicateBooking(assetId, current.requestedById, startTime, endTime, id),
    assertNoBookingConflict(assetId, startTime, endTime, id)
  ]);

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      assetId,
      startTime,
      endTime,
      purpose: data.purpose ?? current.purpose,
      decisionNotes: data.decisionNotes === undefined ? undefined : data.decisionNotes
    },
    include: bookingInclude
  });

  await createAuditLog({
    actorId: actor.id,
    entityType: "Booking",
    entityId: id,
    action: "updated",
    metadata: data
  });

  return formatBooking(updated);
};

export const approveBooking = async (id: string, actor: Express.User, decisionNotes?: string) => {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id }, include: bookingInclude });
    if (!booking) throw notFound("Booking not found.");
    if (!requestedBookingStatuses.includes(booking.status)) throw conflict("Only requested bookings can be approved.");
    assertBookingIsFutureModifiable(booking);
    assertCanApprove(booking, actor);

    const approvalStatus =
      booking.startTime <= new Date() && booking.endTime >= new Date() ? BookingStatus.ACTIVE : BookingStatus.APPROVED;

    const conflictBooking = await tx.booking.findFirst({
      where: {
        assetId: booking.assetId,
        status: { in: occupiedBookingStatuses },
        id: { not: id },
        startTime: { lt: booking.endTime },
        endTime: { gt: booking.startTime }
      },
      select: { id: true }
    });
    if (conflictBooking) throw conflict("Booking overlaps with an approved booking.");

    const updated = await tx.booking.update({
      where: { id },
      data: { status: approvalStatus, approvedById: actor.id, decisionNotes },
      include: bookingInclude
    });

    await createAuditLog(
      {
        actorId: actor.id,
        entityType: "Booking",
        entityId: id,
        action: "approved",
        metadata: { decisionNotes }
      },
      tx
    );

    await createNotification(
      {
        userId: booking.requestedById,
        type: "BOOKING_APPROVED",
        title: "Booking approved",
        message: `Booking for ${booking.asset.name} was approved.`,
        relatedEntityType: "Booking",
        relatedEntityId: id
      },
      tx
    );

    await notifyStartsSoon(updated, tx);

    return formatBooking(updated);
  });
};

export const rejectBooking = async (id: string, actor: Express.User, decisionNotes?: string) => {
  const current = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  if (!current) throw notFound("Booking not found.");
  if (!requestedBookingStatuses.includes(current.status)) throw conflict("Only requested bookings can be rejected.");
  assertBookingIsFutureModifiable(current);
  assertCanApprove(current, actor);

  const booking = await prisma.booking.update({
    where: { id },
    data: { status: BookingStatus.REJECTED, approvedById: actor.id, decisionNotes },
    include: bookingInclude
  });

  await createAuditLog({ actorId: actor.id, entityType: "Booking", entityId: id, action: "rejected", metadata: { decisionNotes } });
  await createNotification({
    userId: booking.requestedById,
    type: "BOOKING_REJECTED",
    title: "Booking rejected",
    message: "Your booking request was rejected.",
    relatedEntityType: "Booking",
    relatedEntityId: id
  });

  return formatBooking(booking);
};

export const cancelBooking = async (id: string, actor: Express.User, reason?: string) => {
  const booking = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  if (!booking) throw notFound("Booking not found.");
  if (terminalBookingStatuses.includes(booking.status)) {
    throw conflict("Booking is no longer cancellable.");
  }
  assertBookingIsFutureModifiable(booking);
  if (
    actor.role !== Role.ADMIN &&
    booking.requestedById !== actor.id &&
    !(actor.role === Role.MANAGER && booking.asset.departmentId === actor.departmentId)
  ) {
    throw forbidden("Only the requester, admin, or department manager can cancel this booking.");
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: BookingStatus.CANCELLED, decisionNotes: reason ?? booking.decisionNotes },
    include: bookingInclude
  });

  await createAuditLog({ actorId: actor.id, entityType: "Booking", entityId: id, action: "cancelled", metadata: { reason } });
  await createNotification({
    userId: booking.requestedById,
    type: "BOOKING_CANCELLED",
    title: "Booking cancelled",
    message: `Booking for ${booking.asset.name} was cancelled.`,
    relatedEntityType: "Booking",
    relatedEntityId: id
  });
  return formatBooking(updated);
};

export const deleteBooking = async (id: string, actor: Express.User) => {
  return cancelBooking(id, actor, "Deleted by user request.");
};

export const getCalendar = async (
  query: { resourceId?: string; assetId?: string; date?: string; week?: string; month?: string },
  actor: Express.User
) => {
  await completeElapsedBookings();
  const { start, end } = getDateRange(query);
  const resourceId = query.resourceId ?? query.assetId;
  if (resourceId) await assertBookableAsset(resourceId, actor);

  const where = andWhere(
    {
      status: { in: calendarBookingStatuses },
      startTime: { lt: end },
      endTime: { gt: start },
      assetId: resourceId
    },
    actor.role === Role.EMPLOYEE ? { requestedById: actor.id } : {},
    actor.role === Role.MANAGER ? { asset: { departmentId: actor.departmentId } } : {}
  );

  const bookings = await prisma.booking.findMany({
    where,
    include: bookingInclude,
    orderBy: { startTime: "asc" }
  });

  return bookings.map(formatCalendarEvent);
};

export const getAvailability = async (
  query: { resourceId: string; date: string },
  actor: Express.User
) => {
  await completeElapsedBookings();
  await assertBookableAsset(query.resourceId, actor);
  const { start, end } = getDateRange({ date: query.date });
  const dayStart = new Date(start);
  dayStart.setUTCHours(9, 0, 0, 0);
  const dayEnd = new Date(start);
  dayEnd.setUTCHours(18, 0, 0, 0);

  const bookings = await prisma.booking.findMany({
    where: {
      assetId: query.resourceId,
      status: { in: blockingBookingStatuses },
      startTime: { lt: end },
      endTime: { gt: start }
    },
    include: bookingInclude,
    orderBy: { startTime: "asc" }
  });

  const occupiedSlots = bookings.map((booking) => ({
    id: booking.id,
    start: booking.startTime.toISOString(),
    end: booking.endTime.toISOString(),
    status: lifecycleStatus(booking),
    bookedBy: booking.requestedBy
  }));

  const availableSlots: Array<{ start: string; end: string }> = [];
  let cursor = new Date(dayStart);
  for (const booking of bookings) {
    const bookingStart = booking.startTime < dayStart ? dayStart : booking.startTime;
    const bookingEnd = booking.endTime > dayEnd ? dayEnd : booking.endTime;
    if (bookingStart > cursor) {
      availableSlots.push({ start: cursor.toISOString(), end: bookingStart.toISOString() });
    }
    if (bookingEnd > cursor) cursor = new Date(bookingEnd);
  }
  if (cursor < dayEnd) availableSlots.push({ start: cursor.toISOString(), end: dayEnd.toISOString() });

  const now = new Date();
  const nextAvailableSlot = availableSlots.find((slot) => new Date(slot.end) > now) ?? null;

  return {
    resourceId: query.resourceId,
    date: query.date,
    availableSlots,
    occupiedSlots,
    conflicts: occupiedSlots,
    nextAvailableSlot
  };
};

export const getBookingStatistics = async (query: Record<string, unknown>, actor: Express.User) => {
  const departmentWhere =
    actor.role === Role.MANAGER
      ? { asset: { departmentId: actor.departmentId } }
      : query.departmentId
        ? { asset: { departmentId: String(query.departmentId) } }
        : {};
  const ownershipWhere = actor.role === Role.EMPLOYEE ? { requestedById: actor.id } : {};
  const dateWhere =
    query.from || query.to
      ? {
          startTime: {
            gte: query.from ? new Date(String(query.from)) : undefined,
            lte: query.to ? new Date(String(query.to)) : undefined
          }
        }
      : {};
  const where = andWhere(departmentWhere, ownershipWhere, dateWhere);

  const [bookingCount, approvedCount, completedCount, cancelledCount, mostBookedResources, bookings] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.count({ where: { ...where, status: { in: [BookingStatus.APPROVED, BookingStatus.ACTIVE] } } }),
    prisma.booking.count({ where: { ...where, status: BookingStatus.COMPLETED } }),
    prisma.booking.count({ where: { ...where, status: BookingStatus.CANCELLED } }),
    prisma.booking.groupBy({
      by: ["assetId"],
      where,
      _count: { assetId: true },
      orderBy: { _count: { assetId: "desc" } },
      take: 5
    }),
    prisma.booking.findMany({
      where,
      select: { startTime: true, endTime: true },
      take: 500
    })
  ]);

  const totalBookedMs = bookings.reduce((sum, booking) => sum + (booking.endTime.getTime() - booking.startTime.getTime()), 0);
  const peakHours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: bookings.filter((booking) => booking.startTime.getUTCHours() === hour).length
  }))
    .filter((entry) => entry.count > 0)
    .sort((first, second) => second.count - first.count)
    .slice(0, 5);

  return {
    bookingCount,
    approvedCount,
    completedCount,
    cancelledCount,
    utilizationHours: Number((totalBookedMs / (60 * 60 * 1000)).toFixed(2)),
    mostBookedResources,
    peakHours
  };
};

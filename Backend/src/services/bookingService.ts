import { AssetStatus, BookingStatus, Role } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { createAuditLog } from "../repositories/auditLogRepository.js";
import { createNotification } from "../repositories/notificationRepository.js";
import { conflict, forbidden, notFound } from "../utils/httpError.js";
import { getPagination, paginated } from "../utils/pagination.js";

const assertNoBookingConflict = async (
  assetId: string,
  startTime: Date,
  endTime: Date,
  excludeBookingId?: string
) => {
  const conflictBooking = await prisma.booking.findFirst({
    where: {
      assetId,
      status: BookingStatus.APPROVED,
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      startTime: { lt: endTime },
      endTime: { gt: startTime }
    }
  });

  if (conflictBooking) {
    throw conflict("Booking overlaps with an approved booking.");
  }
};

export const listBookings = async (query: Record<string, unknown>, actor: Express.User) => {
  const { page, limit, skip } = getPagination(query);
  const where: Record<string, unknown> = {};
  if (query.status) where.status = query.status;
  if (query.assetId) where.assetId = query.assetId;
  if (actor.role === Role.EMPLOYEE) where.requestedById = actor.id;
  if (actor.role === Role.MANAGER) where.asset = { departmentId: actor.departmentId };

  const [items, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: { asset: true, requestedBy: { select: { id: true, name: true, email: true } } },
      orderBy: { startTime: "desc" },
      skip,
      take: limit
    }),
    prisma.booking.count({ where })
  ]);

  return paginated(items, total, page, limit);
};

export const createBooking = async (
  data: { assetId: string; startTime: string; endTime: string; purpose: string },
  actor: Express.User
) => {
  const asset = await prisma.asset.findUnique({ where: { id: data.assetId } });
  if (!asset) throw notFound("Asset not found.");
  if (actor.role === Role.MANAGER && asset.departmentId !== actor.departmentId) {
    throw forbidden("Managers can only book department assets.");
  }
  if (!asset.isBookable) throw conflict("Asset is not bookable.");
  if (asset.status === AssetStatus.RETIRED || asset.status === AssetStatus.LOST) {
    throw conflict(`Asset cannot be booked while status is ${asset.status}.`);
  }

  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);
  await assertNoBookingConflict(data.assetId, startTime, endTime);

  const booking = await prisma.booking.create({
    data: { assetId: data.assetId, requestedById: actor.id, startTime, endTime, purpose: data.purpose }
  });

  await createAuditLog({
    actorId: actor.id,
    entityType: "Booking",
    entityId: booking.id,
    action: "requested",
    metadata: { assetId: data.assetId }
  });

  return booking;
};

export const approveBooking = async (id: string, actor: Express.User, decisionNotes?: string) => {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id }, include: { asset: true } });
    if (!booking) throw notFound("Booking not found.");
    if (booking.status !== BookingStatus.PENDING) throw conflict("Only pending bookings can be approved.");
    if (actor.role === Role.MANAGER && booking.asset.departmentId !== actor.departmentId) {
      throw forbidden("Managers can only approve department bookings.");
    }

    await assertNoBookingConflict(booking.assetId, booking.startTime, booking.endTime, booking.id);

    const updated = await tx.booking.update({
      where: { id },
      data: { status: BookingStatus.APPROVED, approvedById: actor.id, decisionNotes }
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

    return updated;
  });
};

export const rejectBooking = async (id: string, actor: Express.User, decisionNotes?: string) => {
  const current = await prisma.booking.findUnique({ where: { id }, include: { asset: true } });
  if (!current) throw notFound("Booking not found.");
  if (current.status !== BookingStatus.PENDING) throw conflict("Only pending bookings can be rejected.");
  if (actor.role === Role.MANAGER && current.asset.departmentId !== actor.departmentId) {
    throw forbidden("Managers can only reject department bookings.");
  }

  const booking = await prisma.booking.update({
    where: { id },
    data: { status: BookingStatus.REJECTED, approvedById: actor.id, decisionNotes }
  });

  await createAuditLog({ actorId: actor.id, entityType: "Booking", entityId: id, action: "rejected" });
  await createNotification({
    userId: booking.requestedById,
    type: "BOOKING_REJECTED",
    title: "Booking rejected",
    message: "Your booking request was rejected.",
    relatedEntityType: "Booking",
    relatedEntityId: id
  });

  return booking;
};

export const cancelBooking = async (id: string, actor: Express.User) => {
  const booking = await prisma.booking.findUnique({ where: { id }, include: { asset: true } });
  if (!booking) throw notFound("Booking not found.");
  if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.REJECTED) {
    throw conflict("Booking is no longer cancellable.");
  }
  if (
    actor.role !== Role.ADMIN &&
    booking.requestedById !== actor.id &&
    !(actor.role === Role.MANAGER && booking.asset.departmentId === actor.departmentId)
  ) {
    throw forbidden("Only the requester, admin, or department manager can cancel this booking.");
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: BookingStatus.CANCELLED }
  });

  await createAuditLog({ actorId: actor.id, entityType: "Booking", entityId: id, action: "cancelled" });
  return updated;
};

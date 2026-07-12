import {
  AllocationStatus,
  AssetStatus,
  MaintenancePriority,
  MaintenanceStatus,
  Prisma,
  RecordStatus,
  Role
} from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { createAuditLog } from "../repositories/auditLogRepository.js";
import { createNotification } from "../repositories/notificationRepository.js";
import { badRequest, conflict, forbidden, notFound } from "../utils/httpError.js";
import { getPagination, paginated } from "../utils/pagination.js";

const requestedMaintenanceStatuses: MaintenanceStatus[] = [MaintenanceStatus.REQUESTED, MaintenanceStatus.OPEN];
const assignableMaintenanceStatuses: MaintenanceStatus[] = [MaintenanceStatus.APPROVED, MaintenanceStatus.ASSIGNED];
const deletableMaintenanceStatuses: MaintenanceStatus[] = [
  MaintenanceStatus.REQUESTED,
  MaintenanceStatus.OPEN,
  MaintenanceStatus.REJECTED
];
const activeMaintenanceStatuses: MaintenanceStatus[] = [
  MaintenanceStatus.REQUESTED,
  MaintenanceStatus.OPEN,
  MaintenanceStatus.APPROVED,
  MaintenanceStatus.ASSIGNED,
  MaintenanceStatus.IN_PROGRESS,
  MaintenanceStatus.RESOLVED
];
const terminalMaintenanceStatuses: MaintenanceStatus[] = [MaintenanceStatus.REJECTED, MaintenanceStatus.CLOSED];
const maintenanceBlockedAssetStatuses: AssetStatus[] = [AssetStatus.RETIRED, AssetStatus.LOST];

const userSummarySelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  departmentId: true,
  status: true
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
  condition: true,
  departmentId: true,
  location: true,
  department: { select: departmentSummarySelect }
} satisfies Prisma.AssetSelect;

const maintenanceInclude = {
  asset: { select: assetSummarySelect },
  reportedBy: { select: userSummarySelect },
  assignedTo: { select: userSummarySelect }
} satisfies Prisma.MaintenanceTicketInclude;

type MaintenancePayload = Prisma.MaintenanceTicketGetPayload<{ include: typeof maintenanceInclude }>;
type DbClient = Prisma.TransactionClient | typeof prisma;

const hasWhere = (where: Prisma.MaintenanceTicketWhereInput) => Object.keys(where).length > 0;

const andWhere = (...clauses: Prisma.MaintenanceTicketWhereInput[]): Prisma.MaintenanceTicketWhereInput => {
  const activeClauses = clauses.filter(hasWhere);
  if (activeClauses.length === 0) return {};
  if (activeClauses.length === 1) return activeClauses[0];
  return { AND: activeClauses };
};

const textContains = (value: string) => ({
  contains: value,
  mode: Prisma.QueryMode.insensitive
});

const lifecycleStatus = (status: MaintenanceStatus) => (status === MaintenanceStatus.OPEN ? "REQUESTED" : status);

const formatMaintenanceTicket = (ticket: MaintenancePayload) => ({
  ...ticket,
  asset: ticket.asset
    ? {
        ...ticket.asset,
        assetTag: ticket.asset.assetCode
      }
    : ticket.asset,
  assignedTechnicianId: ticket.assignedToId,
  assignedTechnician: ticket.assignedTo,
  lifecycleStatus: lifecycleStatus(ticket.status)
});

const normalizeTechnicianId = (data: { assignedToId?: string | null; assignedTechnicianId?: string | null }) =>
  data.assignedTechnicianId ?? data.assignedToId;

const assertCanRead = (ticket: MaintenancePayload, actor: Express.User) => {
  if (actor.role === Role.MANAGER && ticket.asset.departmentId !== actor.departmentId) {
    throw forbidden("Managers can only access department maintenance tickets.");
  }

  if (actor.role === Role.EMPLOYEE && ticket.reportedById !== actor.id && ticket.assignedToId !== actor.id) {
    throw forbidden("Employees can only access maintenance tickets related to them.");
  }
};

const assertCanManage = (ticket: MaintenancePayload, actor: Express.User) => {
  if (actor.role === Role.MANAGER && ticket.asset.departmentId !== actor.departmentId) {
    throw forbidden("Managers can only manage department maintenance tickets.");
  }
};

const assertNotTerminal = (ticket: Pick<MaintenancePayload, "status">) => {
  if (ticket.status === MaintenanceStatus.CLOSED) throw conflict("Closed maintenance tickets cannot be modified.");
  if (ticket.status === MaintenanceStatus.REJECTED) throw conflict("Rejected maintenance tickets cannot be modified.");
};

const assertActiveTechnician = async (technicianId: string, actor: Express.User, client: DbClient = prisma) => {
  const technician = await client.user.findUnique({
    where: { id: technicianId },
    select: userSummarySelect
  });

  if (!technician) throw notFound("Assigned technician not found.");
  if (technician.status !== RecordStatus.ACTIVE) throw badRequest("Assigned technician is inactive.");
  if (technician.role === Role.AUDITOR) throw badRequest("Auditors cannot be assigned as maintenance technicians.");
  if (actor.role === Role.MANAGER && technician.departmentId !== actor.departmentId) {
    throw forbidden("Managers can only assign technicians from their department.");
  }

  return technician;
};

const nextAssetStatusAfterMaintenance = async (assetId: string, excludeTicketId?: string, client: DbClient = prisma) => {
  const activeMaintenance = await client.maintenanceTicket.findFirst({
    where: {
      assetId,
      id: excludeTicketId ? { not: excludeTicketId } : undefined,
      status: { in: activeMaintenanceStatuses }
    },
    select: { id: true }
  });
  if (activeMaintenance) return AssetStatus.MAINTENANCE;

  const activeAllocation = await client.allocation.findFirst({
    where: { assetId, status: AllocationStatus.ACTIVE },
    select: { id: true }
  });

  return activeAllocation ? AssetStatus.ALLOCATED : AssetStatus.AVAILABLE;
};

const createMaintenanceNotification = (
  data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    ticketId: string;
  },
  client: DbClient
) =>
  createNotification(
    {
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      relatedEntityType: "MaintenanceTicket",
      relatedEntityId: data.ticketId
    },
    client
  );

const buildMaintenanceListWhere = (query: Record<string, unknown>, actor: Express.User) => {
  const clauses: Prisma.MaintenanceTicketWhereInput[] = [];
  const technicianId = query.assignedTechnicianId ?? query.assignedToId;

  if (query.status) clauses.push({ status: query.status as MaintenanceStatus });
  if (query.priority) clauses.push({ priority: query.priority as MaintenancePriority });
  if (query.assetId) clauses.push({ assetId: String(query.assetId) });
  if (query.departmentId) clauses.push({ asset: { departmentId: String(query.departmentId) } });
  if (query.reportedById) clauses.push({ reportedById: String(query.reportedById) });
  if (technicianId) clauses.push({ assignedToId: String(technicianId) });
  if (query.from || query.to) {
    clauses.push({
      reportedAt: {
        gte: query.from ? new Date(String(query.from)) : undefined,
        lte: query.to ? new Date(String(query.to)) : undefined
      }
    });
  }
  if (query.search) {
    const search = String(query.search);
    clauses.push({
      OR: [
        { issueSummary: textContains(search) },
        { issueDescription: textContains(search) },
        { asset: { name: textContains(search) } },
        { asset: { assetCode: textContains(search) } },
        { asset: { serialNumber: textContains(search) } },
        { reportedBy: { name: textContains(search) } },
        { reportedBy: { email: textContains(search) } },
        { assignedTo: { name: textContains(search) } },
        { assignedTo: { email: textContains(search) } }
      ]
    });
  }

  const scopedWhere =
    actor.role === Role.EMPLOYEE
      ? { OR: [{ reportedById: actor.id }, { assignedToId: actor.id }] }
      : actor.role === Role.MANAGER
        ? { asset: { departmentId: actor.departmentId } }
        : {};

  return andWhere(...clauses, scopedWhere);
};

const buildOrderBy = (query: Record<string, unknown>): Prisma.MaintenanceTicketOrderByWithRelationInput => {
  const sortBy = String(query.sortBy ?? "reportedAt");
  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";
  return { [sortBy]: sortOrder };
};

const getTodayRange = () => {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
};

export const listMaintenanceTickets = async (query: Record<string, unknown>, actor: Express.User) => {
  const { page, limit, skip } = getPagination(query);
  const where = buildMaintenanceListWhere(query, actor);

  const [items, total] = await Promise.all([
    prisma.maintenanceTicket.findMany({
      where,
      include: maintenanceInclude,
      orderBy: buildOrderBy(query),
      skip,
      take: limit
    }),
    prisma.maintenanceTicket.count({ where })
  ]);

  return paginated(items.map(formatMaintenanceTicket), total, page, limit);
};

export const getMaintenanceTicket = async (id: string, actor: Express.User) => {
  const ticket = await prisma.maintenanceTicket.findUnique({
    where: { id },
    include: maintenanceInclude
  });
  if (!ticket) throw notFound("Maintenance ticket not found.");
  assertCanRead(ticket, actor);
  return formatMaintenanceTicket(ticket);
};

export const createMaintenanceTicket = async (
  data: {
    assetId: string;
    priority: MaintenancePriority;
    issueSummary: string;
    issueDescription?: string;
    assignedToId?: string;
    assignedTechnicianId?: string;
  },
  actor: Express.User
) => {
  return prisma.$transaction(async (tx) => {
    const asset = await tx.asset.findUnique({
      where: { id: data.assetId },
      select: assetSummarySelect
    });
    if (!asset) throw notFound("Asset not found.");
    if (maintenanceBlockedAssetStatuses.includes(asset.status)) {
      throw conflict(`Asset cannot enter maintenance while status is ${asset.status}.`);
    }
    if (asset.status === AssetStatus.MAINTENANCE) {
      throw conflict("Asset is already under maintenance.");
    }
    if (actor.role === Role.MANAGER && asset.departmentId !== actor.departmentId) {
      throw forbidden("Managers can only create maintenance tickets for department assets.");
    }

    const duplicatePending = await tx.maintenanceTicket.findFirst({
      where: {
        assetId: data.assetId,
        reportedById: actor.id,
        issueSummary: data.issueSummary,
        status: { in: requestedMaintenanceStatuses }
      },
      select: { id: true }
    });
    if (duplicatePending) throw conflict("Duplicate pending maintenance request already exists.");

    const activeTicket = await tx.maintenanceTicket.findFirst({
      where: { assetId: data.assetId, status: { in: activeMaintenanceStatuses } },
      select: { id: true }
    });
    if (activeTicket) throw conflict("Asset already has an active maintenance ticket.");

    const assignedToId = normalizeTechnicianId(data);
    if (assignedToId) await assertActiveTechnician(assignedToId, actor, tx);

    const ticket = await tx.maintenanceTicket.create({
      data: {
        assetId: data.assetId,
        priority: data.priority,
        issueSummary: data.issueSummary,
        issueDescription: data.issueDescription,
        assignedToId,
        assignedAt: assignedToId ? new Date() : undefined,
        reportedById: actor.id
      },
      include: maintenanceInclude
    });

    await tx.asset.update({
      where: { id: data.assetId },
      data: { status: AssetStatus.MAINTENANCE, updatedById: actor.id }
    });

    await createAuditLog(
      {
        actorId: actor.id,
        entityType: "MaintenanceTicket",
        entityId: ticket.id,
        action: "created",
        metadata: { assetId: data.assetId, priority: data.priority, assignedToId }
      },
      tx
    );

    await createMaintenanceNotification(
      {
        userId: actor.id,
        type: "MAINTENANCE_CREATED",
        title: "Maintenance ticket created",
        message: `Maintenance ticket for ${asset.name} was created.`,
        ticketId: ticket.id
      },
      tx
    );

    if (asset.department?.id && asset.departmentId) {
      const department = await tx.department.findUnique({
        where: { id: asset.departmentId },
        select: { managerId: true }
      });
      if (department?.managerId && department.managerId !== actor.id) {
        await createMaintenanceNotification(
          {
            userId: department.managerId,
            type: "MAINTENANCE_APPROVAL_REQUIRED",
            title: "Maintenance approval needed",
            message: `${actor.name} reported maintenance for ${asset.name}.`,
            ticketId: ticket.id
          },
          tx
        );
      }
    }

    if (assignedToId && assignedToId !== actor.id) {
      await createMaintenanceNotification(
        {
          userId: assignedToId,
          type: "MAINTENANCE_ASSIGNED",
          title: "Maintenance assigned",
          message: `${ticket.issueSummary} is assigned to you.`,
          ticketId: ticket.id
        },
        tx
      );
    }

    return formatMaintenanceTicket(ticket);
  });
};

export const approveMaintenanceTicket = async (id: string, actor: Express.User, decisionNotes?: string) => {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.maintenanceTicket.findUnique({ where: { id }, include: maintenanceInclude });
    if (!ticket) throw notFound("Maintenance ticket not found.");
    if (ticket.status === MaintenanceStatus.APPROVED) throw conflict("Maintenance ticket is already approved.");
    if (!requestedMaintenanceStatuses.includes(ticket.status)) {
      throw conflict("Only requested maintenance tickets can be approved.");
    }
    assertCanManage(ticket, actor);

    const updated = await tx.maintenanceTicket.update({
      where: { id },
      data: { status: MaintenanceStatus.APPROVED },
      include: maintenanceInclude
    });

    await createAuditLog(
      {
        actorId: actor.id,
        entityType: "MaintenanceTicket",
        entityId: id,
        action: "approved",
        metadata: { decisionNotes }
      },
      tx
    );

    await createMaintenanceNotification(
      {
        userId: ticket.reportedById,
        type: "MAINTENANCE_APPROVED",
        title: "Maintenance approved",
        message: `Maintenance ticket for ${ticket.asset.name} was approved.`,
        ticketId: id
      },
      tx
    );

    return formatMaintenanceTicket(updated);
  });
};

export const rejectMaintenanceTicket = async (id: string, actor: Express.User, decisionNotes?: string) => {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.maintenanceTicket.findUnique({ where: { id }, include: maintenanceInclude });
    if (!ticket) throw notFound("Maintenance ticket not found.");
    if (!requestedMaintenanceStatuses.includes(ticket.status)) {
      throw conflict("Only requested maintenance tickets can be rejected.");
    }
    assertCanManage(ticket, actor);

    const updated = await tx.maintenanceTicket.update({
      where: { id },
      data: { status: MaintenanceStatus.REJECTED },
      include: maintenanceInclude
    });

    const nextStatus = await nextAssetStatusAfterMaintenance(ticket.assetId, id, tx);
    await tx.asset.update({
      where: { id: ticket.assetId },
      data: { status: nextStatus, updatedById: actor.id }
    });

    await createAuditLog(
      {
        actorId: actor.id,
        entityType: "MaintenanceTicket",
        entityId: id,
        action: "rejected",
        metadata: { decisionNotes }
      },
      tx
    );

    await createMaintenanceNotification(
      {
        userId: ticket.reportedById,
        type: "MAINTENANCE_REJECTED",
        title: "Maintenance rejected",
        message: `Maintenance ticket for ${ticket.asset.name} was rejected.`,
        ticketId: id
      },
      tx
    );

    return formatMaintenanceTicket(updated);
  });
};

export const assignMaintenanceTicket = async (
  id: string,
  data: { assignedToId?: string; assignedTechnicianId?: string },
  actor: Express.User
) => {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.maintenanceTicket.findUnique({ where: { id }, include: maintenanceInclude });
    if (!ticket) throw notFound("Maintenance ticket not found.");
    if (!assignableMaintenanceStatuses.includes(ticket.status)) {
      throw conflict("Only approved maintenance tickets can be assigned.");
    }
    assertCanManage(ticket, actor);

    const assignedToId = normalizeTechnicianId(data);
    if (!assignedToId) throw badRequest("assignedTechnicianId is required.");
    await assertActiveTechnician(assignedToId, actor, tx);

    const updated = await tx.maintenanceTicket.update({
      where: { id },
      data: { assignedToId, assignedAt: new Date(), status: MaintenanceStatus.ASSIGNED },
      include: maintenanceInclude
    });

    await createAuditLog(
      {
        actorId: actor.id,
        entityType: "MaintenanceTicket",
        entityId: id,
        action: "assigned",
        metadata: { assignedToId }
      },
      tx
    );

    await createMaintenanceNotification(
      {
        userId: assignedToId,
        type: "MAINTENANCE_ASSIGNED",
        title: "Maintenance assigned",
        message: `${ticket.issueSummary} is assigned to you.`,
        ticketId: id
      },
      tx
    );

    if (ticket.reportedById !== assignedToId) {
      await createMaintenanceNotification(
        {
          userId: ticket.reportedById,
          type: "MAINTENANCE_ASSIGNED",
          title: "Maintenance assigned",
          message: `Maintenance for ${ticket.asset.name} was assigned.`,
          ticketId: id
        },
        tx
      );
    }

    return formatMaintenanceTicket(updated);
  });
};

export const startMaintenanceTicket = async (id: string, actor: Express.User) => {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.maintenanceTicket.findUnique({ where: { id }, include: maintenanceInclude });
    if (!ticket) throw notFound("Maintenance ticket not found.");
    if (ticket.status !== MaintenanceStatus.ASSIGNED) {
      throw conflict("Only assigned maintenance tickets can be started.");
    }
    if (!ticket.assignedToId) throw conflict("Maintenance ticket cannot be started without technician assignment.");
    assertCanManage(ticket, actor);

    const updated = await tx.maintenanceTicket.update({
      where: { id },
      data: { status: MaintenanceStatus.IN_PROGRESS, startedAt: new Date() },
      include: maintenanceInclude
    });

    await createAuditLog(
      {
        actorId: actor.id,
        entityType: "MaintenanceTicket",
        entityId: id,
        action: "started",
        metadata: { assignedToId: ticket.assignedToId }
      },
      tx
    );

    await createMaintenanceNotification(
      {
        userId: ticket.reportedById,
        type: "MAINTENANCE_STARTED",
        title: "Maintenance started",
        message: `Maintenance for ${ticket.asset.name} has started.`,
        ticketId: id
      },
      tx
    );

    return formatMaintenanceTicket(updated);
  });
};

export const resolveMaintenanceTicket = async (
  id: string,
  data: { resolutionNotes: string; resolutionCost?: number },
  actor: Express.User
) => {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.maintenanceTicket.findUnique({ where: { id }, include: maintenanceInclude });
    if (!ticket) throw notFound("Maintenance ticket not found.");
    if (ticket.status !== MaintenanceStatus.IN_PROGRESS) {
      throw conflict("Only in-progress maintenance tickets can be resolved.");
    }
    assertCanManage(ticket, actor);

    const updated = await tx.maintenanceTicket.update({
      where: { id },
      data: {
        status: MaintenanceStatus.RESOLVED,
        resolutionNotes: data.resolutionNotes,
        resolutionCost: data.resolutionCost,
        resolvedAt: new Date()
      },
      include: maintenanceInclude
    });

    await createAuditLog(
      {
        actorId: actor.id,
        entityType: "MaintenanceTicket",
        entityId: id,
        action: "resolved",
        metadata: { resolutionNotes: data.resolutionNotes, resolutionCost: data.resolutionCost }
      },
      tx
    );

    await createMaintenanceNotification(
      {
        userId: ticket.reportedById,
        type: "MAINTENANCE_RESOLVED",
        title: "Maintenance resolved",
        message: `Maintenance for ${ticket.asset.name} was resolved.`,
        ticketId: id
      },
      tx
    );

    return formatMaintenanceTicket(updated);
  });
};

export const closeMaintenanceTicket = async (
  id: string,
  resolutionNotesOrData: string | { resolutionNotes?: string; resolutionCost?: number },
  actor: Express.User
) => {
  const data =
    typeof resolutionNotesOrData === "string"
      ? { resolutionNotes: resolutionNotesOrData }
      : resolutionNotesOrData;

  return prisma.$transaction(async (tx) => {
    const ticket = await tx.maintenanceTicket.findUnique({ where: { id }, include: maintenanceInclude });
    if (!ticket) throw notFound("Maintenance ticket not found.");
    if (ticket.status === MaintenanceStatus.CLOSED) throw conflict("Maintenance ticket is already closed.");
    if (ticket.status !== MaintenanceStatus.RESOLVED && ticket.status !== MaintenanceStatus.IN_PROGRESS) {
      throw conflict("Maintenance ticket must be resolved before it can be closed.");
    }
    if (ticket.status === MaintenanceStatus.IN_PROGRESS && !data.resolutionNotes) {
      throw badRequest("resolutionNotes is required when closing an in-progress ticket.");
    }
    assertCanManage(ticket, actor);

    const now = new Date();
    const updated = await tx.maintenanceTicket.update({
      where: { id },
      data: {
        status: MaintenanceStatus.CLOSED,
        resolutionNotes: data.resolutionNotes ?? ticket.resolutionNotes,
        resolutionCost: data.resolutionCost ?? ticket.resolutionCost,
        resolvedAt: ticket.resolvedAt ?? now,
        closedAt: now
      },
      include: maintenanceInclude
    });

    const nextStatus = await nextAssetStatusAfterMaintenance(ticket.assetId, id, tx);
    await tx.asset.update({
      where: { id: ticket.assetId },
      data: { status: nextStatus, updatedById: actor.id }
    });

    await createAuditLog(
      {
        actorId: actor.id,
        entityType: "MaintenanceTicket",
        entityId: id,
        action: "closed",
        metadata: { resolutionNotes: data.resolutionNotes, resolutionCost: data.resolutionCost }
      },
      tx
    );

    await createMaintenanceNotification(
      {
        userId: ticket.reportedById,
        type: "MAINTENANCE_CLOSED",
        title: "Maintenance closed",
        message: `Maintenance ticket for ${ticket.asset.name} has been closed.`,
        ticketId: id
      },
      tx
    );

    return formatMaintenanceTicket(updated);
  });
};

export const deleteMaintenanceTicket = async (id: string, actor: Express.User) => {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.maintenanceTicket.findUnique({ where: { id }, include: maintenanceInclude });
    if (!ticket) throw notFound("Maintenance ticket not found.");
    assertCanManage(ticket, actor);
    if (!deletableMaintenanceStatuses.includes(ticket.status)) {
      throw conflict("Only requested or rejected maintenance tickets can be deleted.");
    }

    await tx.maintenanceTicket.delete({ where: { id } });

    const nextStatus = await nextAssetStatusAfterMaintenance(ticket.assetId, id, tx);
    await tx.asset.update({
      where: { id: ticket.assetId },
      data: { status: nextStatus, updatedById: actor.id }
    });

    await createAuditLog(
      {
        actorId: actor.id,
        entityType: "MaintenanceTicket",
        entityId: id,
        action: "deleted",
        metadata: { assetId: ticket.assetId, status: ticket.status }
      },
      tx
    );

    return formatMaintenanceTicket(ticket);
  });
};

const applyLegacyStatusUpdate = async (
  id: string,
  data: {
    status: MaintenanceStatus;
    assignedToId?: string | null;
    assignedTechnicianId?: string | null;
    resolutionNotes?: string | null;
    resolutionCost?: number | null;
  },
  actor: Express.User
) => {
  const ticket = await prisma.maintenanceTicket.findUnique({ where: { id }, include: maintenanceInclude });
  if (!ticket) throw notFound("Maintenance ticket not found.");
  if (ticket.status === data.status) return formatMaintenanceTicket(ticket);

  if (data.status === MaintenanceStatus.APPROVED) {
    return approveMaintenanceTicket(id, actor);
  }

  if (data.status === MaintenanceStatus.REJECTED) {
    return rejectMaintenanceTicket(id, actor);
  }

  if (data.status === MaintenanceStatus.ASSIGNED) {
    const assignedToId = normalizeTechnicianId(data) ?? ticket.assignedToId;
    if (!assignedToId) throw badRequest("assignedTechnicianId is required.");
    return assignMaintenanceTicket(id, { assignedTechnicianId: assignedToId }, actor);
  }

  if (data.status === MaintenanceStatus.IN_PROGRESS) {
    let current = ticket;
    if (requestedMaintenanceStatuses.includes(current.status)) {
      current = (await approveMaintenanceTicket(id, actor)) as MaintenancePayload;
    }
    if (current.status === MaintenanceStatus.APPROVED) {
      const assignedToId = normalizeTechnicianId(data) ?? current.assignedToId ?? actor.id;
      current = (await assignMaintenanceTicket(id, { assignedTechnicianId: assignedToId }, actor)) as MaintenancePayload;
    }
    return startMaintenanceTicket(id, actor);
  }

  if (data.status === MaintenanceStatus.RESOLVED) {
    if (!data.resolutionNotes) throw badRequest("resolutionNotes is required.");
    return resolveMaintenanceTicket(
      id,
      { resolutionNotes: data.resolutionNotes, resolutionCost: data.resolutionCost ?? undefined },
      actor
    );
  }

  if (data.status === MaintenanceStatus.CLOSED) {
    return closeMaintenanceTicket(
      id,
      { resolutionNotes: data.resolutionNotes ?? undefined, resolutionCost: data.resolutionCost ?? undefined },
      actor
    );
  }

  throw conflict("Use maintenance workflow actions for status changes.");
};

export const updateMaintenanceTicket = async (
  id: string,
  data: {
    priority?: MaintenancePriority;
    status?: MaintenanceStatus;
    assignedToId?: string | null;
    assignedTechnicianId?: string | null;
    issueSummary?: string;
    issueDescription?: string | null;
    resolutionNotes?: string | null;
    resolutionCost?: number | null;
  },
  actor: Express.User
) => {
  if (data.status) {
    return applyLegacyStatusUpdate(id, data as { status: MaintenanceStatus }, actor);
  }

  const current = await prisma.maintenanceTicket.findUnique({ where: { id }, include: maintenanceInclude });
  if (!current) throw notFound("Maintenance ticket not found.");
  assertCanManage(current, actor);
  assertNotTerminal(current);

  const assignedToId = normalizeTechnicianId(data);
  if (assignedToId !== undefined && assignedToId !== null) {
    await assertActiveTechnician(assignedToId, actor);
  }

  const updated = await prisma.maintenanceTicket.update({
    where: { id },
    data: {
      priority: data.priority,
      issueSummary: data.issueSummary,
      issueDescription: data.issueDescription === undefined ? undefined : data.issueDescription,
      assignedToId: assignedToId === undefined ? undefined : assignedToId,
      assignedAt: assignedToId ? new Date() : undefined,
      resolutionNotes: data.resolutionNotes === undefined ? undefined : data.resolutionNotes,
      resolutionCost: data.resolutionCost === undefined ? undefined : data.resolutionCost
    },
    include: maintenanceInclude
  });

  await createAuditLog({
    actorId: actor.id,
    entityType: "MaintenanceTicket",
    entityId: id,
    action: "updated",
    metadata: data
  });

  return formatMaintenanceTicket(updated);
};

export const getMaintenanceStatistics = async (query: Record<string, unknown>, actor: Express.User) => {
  const departmentId = actor.role === Role.MANAGER ? actor.departmentId : (query.departmentId as string | undefined);
  const where: Prisma.MaintenanceTicketWhereInput =
    actor.role === Role.EMPLOYEE
      ? { OR: [{ reportedById: actor.id }, { assignedToId: actor.id }] }
      : departmentId
        ? { asset: { departmentId } }
        : {};

  const [tickets, statusCounts, priorityCounts, assetFrequency] = await Promise.all([
    prisma.maintenanceTicket.findMany({
      where,
      include: { asset: { select: assetSummarySelect } },
      orderBy: { createdAt: "desc" },
      take: 500
    }),
    prisma.maintenanceTicket.groupBy({ by: ["status"], where, _count: { status: true } }),
    prisma.maintenanceTicket.groupBy({ by: ["priority"], where, _count: { priority: true } }),
    prisma.maintenanceTicket.groupBy({
      by: ["assetId"],
      where,
      _count: { assetId: true },
      orderBy: { _count: { assetId: "desc" } },
      take: 5
    })
  ]);

  const totalRepairMs = tickets.reduce((sum, ticket) => {
    if (!ticket.startedAt || !ticket.resolvedAt) return sum;
    return sum + Math.max(0, ticket.resolvedAt.getTime() - ticket.startedAt.getTime());
  }, 0);
  const repairedCount = tickets.filter((ticket) => ticket.startedAt && ticket.resolvedAt).length;
  const totalDowntimeMs = tickets.reduce((sum, ticket) => {
    const end = ticket.closedAt ?? ticket.resolvedAt;
    if (!end) return sum;
    return sum + Math.max(0, end.getTime() - ticket.reportedAt.getTime());
  }, 0);
  const totalCost = tickets.reduce((sum, ticket) => sum + Number(ticket.resolutionCost ?? 0), 0);
  const mostRepairedAssets = assetFrequency.map((entry) => {
    const ticket = tickets.find((item) => item.assetId === entry.assetId);
    return {
      assetId: entry.assetId,
      asset: ticket?.asset
        ? {
            ...ticket.asset,
            assetTag: ticket.asset.assetCode
          }
        : null,
      count: entry._count.assetId
    };
  });

  return {
    maintenanceCount: tickets.length,
    activeCount: tickets.filter((ticket) => activeMaintenanceStatuses.includes(ticket.status)).length,
    closedCount: tickets.filter((ticket) => ticket.status === MaintenanceStatus.CLOSED).length,
    rejectedCount: tickets.filter((ticket) => ticket.status === MaintenanceStatus.REJECTED).length,
    averageRepairTimeHours: repairedCount === 0 ? 0 : Number((totalRepairMs / repairedCount / 36e5).toFixed(2)),
    maintenanceFrequency: assetFrequency,
    maintenanceCost: {
      total: Number(totalCost.toFixed(2)),
      average: tickets.length === 0 ? 0 : Number((totalCost / tickets.length).toFixed(2))
    },
    assetDowntimeHours: Number((totalDowntimeMs / 36e5).toFixed(2)),
    mostRepairedAssets,
    statusCounts,
    priorityCounts
  };
};

export const getMaintenanceDashboardCounts = async (actor: Express.User, departmentId?: string) => {
  const maintenanceWhere =
    actor.role === Role.EMPLOYEE
      ? { OR: [{ reportedById: actor.id }, { assignedToId: actor.id }] }
      : departmentId
        ? { asset: { departmentId } }
        : {};
  const { start, end } = getTodayRange();

  const [pendingMaintenance, approvedMaintenance, assignedMaintenance, inProgressMaintenance, resolvedTodayMaintenance] =
    await Promise.all([
      prisma.maintenanceTicket.count({
        where: { ...maintenanceWhere, status: { in: requestedMaintenanceStatuses } }
      }),
      prisma.maintenanceTicket.count({ where: { ...maintenanceWhere, status: MaintenanceStatus.APPROVED } }),
      prisma.maintenanceTicket.count({ where: { ...maintenanceWhere, status: MaintenanceStatus.ASSIGNED } }),
      prisma.maintenanceTicket.count({ where: { ...maintenanceWhere, status: MaintenanceStatus.IN_PROGRESS } }),
      prisma.maintenanceTicket.count({
        where: {
          ...maintenanceWhere,
          status: MaintenanceStatus.RESOLVED,
          resolvedAt: { gte: start, lt: end }
        }
      })
    ]);

  return {
    pendingMaintenance,
    approvedMaintenance,
    assignedMaintenance,
    inProgressMaintenance,
    resolvedTodayMaintenance,
    upcomingMaintenance: approvedMaintenance + assignedMaintenance
  };
};

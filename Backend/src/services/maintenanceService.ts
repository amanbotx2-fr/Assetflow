import { AllocationStatus, AssetStatus, MaintenancePriority, MaintenanceStatus, Role } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { createAuditLog } from "../repositories/auditLogRepository.js";
import { createNotification } from "../repositories/notificationRepository.js";
import { conflict, forbidden, notFound } from "../utils/httpError.js";
import { getPagination, paginated } from "../utils/pagination.js";

const assetStatusAfterMaintenance = async (assetId: string) => {
  const activeAllocation = await prisma.allocation.findFirst({
    where: { assetId, status: AllocationStatus.ACTIVE }
  });
  return activeAllocation ? AssetStatus.ALLOCATED : AssetStatus.AVAILABLE;
};

export const listMaintenanceTickets = async (query: Record<string, unknown>, actor: Express.User) => {
  const { page, limit, skip } = getPagination(query);
  const where: Record<string, unknown> = {};
  if (query.status) where.status = query.status;
  if (query.priority) where.priority = query.priority;
  if (query.assetId) where.assetId = query.assetId;
  if (actor.role === Role.EMPLOYEE) where.reportedById = actor.id;
  if (actor.role === Role.MANAGER) where.asset = { departmentId: actor.departmentId };

  const [items, total] = await Promise.all([
    prisma.maintenanceTicket.findMany({
      where,
      include: {
        asset: true,
        reportedBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    }),
    prisma.maintenanceTicket.count({ where })
  ]);

  return paginated(items, total, page, limit);
};

export const getMaintenanceTicket = async (id: string, actor: Express.User) => {
  const ticket = await prisma.maintenanceTicket.findUnique({
    where: { id },
    include: { asset: true, reportedBy: true, assignedTo: true }
  });
  if (!ticket) throw notFound("Maintenance ticket not found.");
  if (actor.role === Role.MANAGER && ticket.asset.departmentId !== actor.departmentId) {
    throw forbidden("Managers can only access department maintenance tickets.");
  }
  if (actor.role === Role.EMPLOYEE && ticket.reportedById !== actor.id && ticket.assignedToId !== actor.id) {
    throw forbidden("Employees can only access maintenance tickets related to them.");
  }
  return ticket;
};

export const createMaintenanceTicket = async (
  data: {
    assetId: string;
    priority: MaintenancePriority;
    issueSummary: string;
    issueDescription?: string;
    assignedToId?: string;
  },
  actor: Express.User
) => {
  return prisma.$transaction(async (tx) => {
    const asset = await tx.asset.findUnique({ where: { id: data.assetId } });
    if (!asset) throw notFound("Asset not found.");
    if (asset.status === AssetStatus.RETIRED || asset.status === AssetStatus.LOST) {
      throw conflict(`Asset cannot enter maintenance while status is ${asset.status}.`);
    }
    if (actor.role === Role.MANAGER && asset.departmentId !== actor.departmentId) {
      throw forbidden("Managers can only create maintenance tickets for department assets.");
    }

    const ticket = await tx.maintenanceTicket.create({
      data: {
        assetId: data.assetId,
        priority: data.priority,
        issueSummary: data.issueSummary,
        issueDescription: data.issueDescription,
        assignedToId: data.assignedToId,
        reportedById: actor.id
      }
    });

    await tx.asset.update({
      where: { id: data.assetId },
      data: { status: AssetStatus.MAINTENANCE }
    });

    await createAuditLog(
      {
        actorId: actor.id,
        entityType: "MaintenanceTicket",
        entityId: ticket.id,
        action: "created",
        metadata: { assetId: data.assetId, priority: data.priority }
      },
      tx
    );

    return ticket;
  });
};

export const updateMaintenanceTicket = async (id: string, data: Record<string, unknown>, actor: Express.User) => {
  const current = await prisma.maintenanceTicket.findUnique({ where: { id }, include: { asset: true } });
  if (!current) throw notFound("Maintenance ticket not found.");
  if (actor.role === Role.MANAGER && current.asset.departmentId !== actor.departmentId) {
    throw forbidden("Managers can only update department maintenance tickets.");
  }

  const ticket = await prisma.maintenanceTicket.update({
    where: { id },
    data: {
      ...data,
      resolvedAt:
        data.status === MaintenanceStatus.RESOLVED || data.status === MaintenanceStatus.CLOSED
          ? new Date()
          : undefined
    }
  });

  await createAuditLog({
    actorId: actor.id,
    entityType: "MaintenanceTicket",
    entityId: id,
    action: "updated",
    metadata: data
  });

  return ticket;
};

export const closeMaintenanceTicket = async (id: string, resolutionNotes: string, actor: Express.User) => {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.maintenanceTicket.findUnique({ where: { id }, include: { asset: true } });
    if (!ticket) throw notFound("Maintenance ticket not found.");
    if (ticket.status === MaintenanceStatus.CLOSED) throw conflict("Maintenance ticket is already closed.");
    if (actor.role === Role.MANAGER && ticket.asset.departmentId !== actor.departmentId) {
      throw forbidden("Managers can only close department maintenance tickets.");
    }

    const updated = await tx.maintenanceTicket.update({
      where: { id },
      data: { status: MaintenanceStatus.CLOSED, resolutionNotes, resolvedAt: new Date() }
    });

    const nextStatus = await assetStatusAfterMaintenance(ticket.assetId);
    await tx.asset.update({
      where: { id: ticket.assetId },
      data: { status: nextStatus }
    });

    await createAuditLog(
      {
        actorId: actor.id,
        entityType: "MaintenanceTicket",
        entityId: id,
        action: "closed",
        metadata: { resolutionNotes }
      },
      tx
    );

    await createNotification(
      {
        userId: ticket.reportedById,
        type: "MAINTENANCE_CLOSED",
        title: "Maintenance closed",
        message: `Maintenance ticket for ${ticket.asset.name} has been closed.`,
        relatedEntityType: "MaintenanceTicket",
        relatedEntityId: id
      },
      tx
    );

    return updated;
  });
};

import { AllocationStatus, AssetStatus, Role, TransferStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { createAuditLog } from "../repositories/auditLogRepository.js";
import { createNotification } from "../repositories/notificationRepository.js";
import { badRequest, conflict, forbidden, notFound } from "../utils/httpError.js";
import { getPagination, paginated } from "../utils/pagination.js";

export const listTransfers = async (query: Record<string, unknown>, actor: Express.User) => {
  const { page, limit, skip } = getPagination(query);
  const where: Record<string, unknown> = {};

  if (query.status) where.status = query.status;
  if (query.assetId) where.assetId = query.assetId;

  if (actor.role === Role.EMPLOYEE) {
    where.requestedById = actor.id;
  }

  if (actor.role === Role.MANAGER) {
    where.OR = [
      { fromDepartmentId: actor.departmentId },
      { toDepartmentId: actor.departmentId },
      { asset: { departmentId: actor.departmentId } }
    ];
  }

  const [items, total] = await Promise.all([
    prisma.transfer.findMany({
      where,
      include: {
        asset: true,
        requestedBy: { select: { id: true, name: true, email: true, role: true } },
        approvedBy: { select: { id: true, name: true, email: true, role: true } },
        fromUser: { select: { id: true, name: true, email: true } },
        toUser: { select: { id: true, name: true, email: true } },
        fromDepartment: true,
        toDepartment: true
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    }),
    prisma.transfer.count({ where })
  ]);

  return paginated(items, total, page, limit);
};

export const getTransfer = async (id: string, actor: Express.User) => {
  const transfer = await prisma.transfer.findUnique({
    where: { id },
    include: { asset: true, requestedBy: true, approvedBy: true, fromUser: true, toUser: true }
  });
  if (!transfer) throw notFound("Transfer not found.");
  if (
    actor.role === Role.EMPLOYEE &&
    transfer.requestedById !== actor.id &&
    transfer.fromUserId !== actor.id &&
    transfer.toUserId !== actor.id
  ) {
    throw forbidden("Employees can only access transfers related to them.");
  }
  if (
    actor.role === Role.MANAGER &&
    transfer.asset.departmentId !== actor.departmentId &&
    transfer.fromDepartmentId !== actor.departmentId &&
    transfer.toDepartmentId !== actor.departmentId
  ) {
    throw forbidden("Managers can only access department transfers.");
  }
  return transfer;
};

export const createTransfer = async (
  data: { assetId: string; toUserId?: string; toDepartmentId?: string; reason: string },
  actor: Express.User
) => {
  if (!data.toUserId && !data.toDepartmentId) {
    throw badRequest("Transfer destination is required.");
  }

  const activeAllocation = await prisma.allocation.findFirst({
    where: { assetId: data.assetId, status: AllocationStatus.ACTIVE },
    include: { asset: true }
  });

  if (!activeAllocation) {
    throw conflict("Only actively allocated assets can be transferred.");
  }

  if (actor.role === Role.EMPLOYEE && activeAllocation.userId !== actor.id) {
    throw forbidden("Employees can only transfer assets assigned to them.");
  }

  if (actor.role === Role.MANAGER && activeAllocation.asset.departmentId !== actor.departmentId) {
    throw forbidden("Managers can only transfer assets in their assigned department.");
  }

  if (activeAllocation.userId === data.toUserId || activeAllocation.departmentId === data.toDepartmentId) {
    throw badRequest("Transfer destination must differ from current allocation.");
  }

  const transfer = await prisma.transfer.create({
    data: {
      assetId: data.assetId,
      requestedById: actor.id,
      fromUserId: activeAllocation.userId,
      toUserId: data.toUserId,
      fromDepartmentId: activeAllocation.departmentId,
      toDepartmentId: data.toDepartmentId,
      reason: data.reason
    }
  });

  await createAuditLog({
    actorId: actor.id,
    entityType: "Transfer",
    entityId: transfer.id,
    action: "requested",
    metadata: { assetId: data.assetId }
  });

  return transfer;
};

export const approveTransfer = async (id: string, actor: Express.User, decisionNotes?: string) => {
  return prisma.$transaction(async (tx) => {
    const transfer = await tx.transfer.findUnique({ where: { id }, include: { asset: true } });
    if (!transfer) throw notFound("Transfer not found.");
    if (transfer.status !== TransferStatus.PENDING) throw conflict("Only pending transfers can be approved.");
    if (actor.role === Role.MANAGER && transfer.asset.departmentId !== actor.departmentId) {
      throw forbidden("Managers can only approve department transfers.");
    }

    await tx.allocation.updateMany({
      where: { assetId: transfer.assetId, status: AllocationStatus.ACTIVE },
      data: { status: AllocationStatus.TRANSFERRED, returnedAt: new Date() }
    });

    await tx.allocation.create({
      data: {
        assetId: transfer.assetId,
        userId: transfer.toUserId,
        departmentId: transfer.toDepartmentId,
        assignedById: actor.id,
        notes: `Transfer approved: ${transfer.reason}`
      }
    });

    const updated = await tx.transfer.update({
      where: { id },
      data: {
        status: TransferStatus.APPROVED,
        approvedById: actor.id,
        decidedAt: new Date(),
        decisionNotes
      },
      include: { asset: true }
    });

    await tx.asset.update({
      where: { id: transfer.assetId },
      data: {
        status: AssetStatus.ALLOCATED,
        departmentId: transfer.toDepartmentId ?? transfer.asset.departmentId
      }
    });

    await createAuditLog(
      {
        actorId: actor.id,
        entityType: "Transfer",
        entityId: id,
        action: "approved",
        metadata: { decisionNotes }
      },
      tx
    );

    await createNotification(
      {
        userId: transfer.requestedById,
        type: "TRANSFER_APPROVED",
        title: "Transfer approved",
        message: `Transfer request for ${updated.asset.name} was approved.`,
        relatedEntityType: "Transfer",
        relatedEntityId: id
      },
      tx
    );

    return updated;
  });
};

export const rejectTransfer = async (id: string, actor: Express.User, decisionNotes?: string) => {
  const current = await prisma.transfer.findUnique({ where: { id }, include: { asset: true } });
  if (!current) throw notFound("Transfer not found.");
  if (current.status !== TransferStatus.PENDING) throw conflict("Only pending transfers can be rejected.");
  if (actor.role === Role.MANAGER && current.asset.departmentId !== actor.departmentId) {
    throw forbidden("Managers can only reject department transfers.");
  }

  const transfer = await prisma.transfer.update({
    where: { id },
    data: { status: TransferStatus.REJECTED, approvedById: actor.id, decidedAt: new Date(), decisionNotes }
  });

  await createAuditLog({
    actorId: actor.id,
    entityType: "Transfer",
    entityId: id,
    action: "rejected",
    metadata: { decisionNotes }
  });

  await createNotification({
    userId: transfer.requestedById,
    type: "TRANSFER_REJECTED",
    title: "Transfer rejected",
    message: "Your transfer request was rejected.",
    relatedEntityType: "Transfer",
    relatedEntityId: id
  });

  return transfer;
};

export const cancelTransfer = async (id: string, actor: Express.User) => {
  const transfer = await prisma.transfer.findUnique({ where: { id } });
  if (!transfer) throw notFound("Transfer not found.");
  if (transfer.status !== TransferStatus.PENDING) throw conflict("Only pending transfers can be cancelled.");
  if (actor.role !== Role.ADMIN && transfer.requestedById !== actor.id) {
    throw forbidden("Only the requester or admin can cancel this transfer.");
  }

  const updated = await prisma.transfer.update({
    where: { id },
    data: { status: TransferStatus.CANCELLED }
  });

  await createAuditLog({
    actorId: actor.id,
    entityType: "Transfer",
    entityId: id,
    action: "cancelled"
  });

  return updated;
};

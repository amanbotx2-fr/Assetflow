import { AllocationStatus, AssetStatus, Prisma, RecordStatus, Role, TransferStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { createAuditLog } from "../repositories/auditLogRepository.js";
import { createNotification } from "../repositories/notificationRepository.js";
import { badRequest, conflict, forbidden, notFound } from "../utils/httpError.js";
import { getPagination, paginated } from "../utils/pagination.js";

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
  departmentId: true,
  department: { select: departmentSummarySelect }
} satisfies Prisma.AssetSelect;

const transferInclude = {
  asset: { select: assetSummarySelect },
  requestedBy: { select: userSummarySelect },
  approvedBy: { select: userSummarySelect },
  fromUser: { select: userSummarySelect },
  toUser: { select: userSummarySelect },
  fromDepartment: { select: departmentSummarySelect },
  toDepartment: { select: departmentSummarySelect },
  createdAllocation: {
    select: {
      id: true,
      status: true,
      assignedAt: true,
      returnedAt: true,
      returnCondition: true,
      returnReason: true
    }
  }
} satisfies Prisma.TransferInclude;

type TransferPayload = Prisma.TransferGetPayload<{ include: typeof transferInclude }>;

const transferBlockedAssetStatuses: AssetStatus[] = [
  AssetStatus.MAINTENANCE,
  AssetStatus.RETIRED,
  AssetStatus.LOST
];

const hasWhere = (where: Prisma.TransferWhereInput) => Object.keys(where).length > 0;

const andWhere = (...clauses: Prisma.TransferWhereInput[]): Prisma.TransferWhereInput => {
  const activeClauses = clauses.filter(hasWhere);
  if (activeClauses.length === 0) return {};
  if (activeClauses.length === 1) return activeClauses[0];
  return { AND: activeClauses };
};

const textContains = (value: string) => ({
  contains: value,
  mode: Prisma.QueryMode.insensitive
});

const formatTransfer = (transfer: TransferPayload) => ({
  ...transfer,
  asset: transfer.asset
    ? {
        ...transfer.asset,
        assetTag: transfer.asset.assetCode
      }
    : transfer.asset
});

const assertActorCanReadTransfer = (transfer: TransferPayload, actor: Express.User) => {
  if (actor.role === Role.EMPLOYEE) {
    const related =
      transfer.requestedById === actor.id ||
      transfer.fromUserId === actor.id ||
      transfer.toUserId === actor.id;
    if (!related) throw forbidden("Employees can only access transfers related to them.");
  }

  if (actor.role === Role.MANAGER) {
    const scoped =
      transfer.asset.departmentId === actor.departmentId ||
      transfer.fromDepartmentId === actor.departmentId ||
      transfer.toDepartmentId === actor.departmentId ||
      transfer.fromUser?.departmentId === actor.departmentId ||
      transfer.toUser?.departmentId === actor.departmentId;
    if (!scoped) throw forbidden("Managers can only access department transfers.");
  }
};

const assertActorCanApproveTransfer = (transfer: TransferPayload, actor: Express.User) => {
  if (actor.role !== Role.MANAGER) return;

  const scoped =
    transfer.asset.departmentId === actor.departmentId ||
    transfer.fromDepartmentId === actor.departmentId ||
    transfer.fromUser?.departmentId === actor.departmentId;

  if (!scoped) throw forbidden("Managers can only approve transfers from their assigned department.");
};

const assertActiveUser = async (userId?: string) => {
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSummarySelect
  });

  if (!user) throw notFound("Destination employee not found.");
  if (user.status !== RecordStatus.ACTIVE) throw badRequest("Destination employee is inactive.");
  return user;
};

const assertActiveDepartment = async (departmentId?: string) => {
  if (!departmentId) return null;

  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    select: departmentSummarySelect
  });

  if (!department) throw notFound("Destination department not found.");
  if (department.status !== RecordStatus.ACTIVE) throw badRequest("Destination department is inactive.");
  return department;
};

const buildTransferListWhere = (query: Record<string, unknown>, actor: Express.User) => {
  const clauses: Prisma.TransferWhereInput[] = [];

  if (query.status) clauses.push({ status: query.status as TransferStatus });
  if (query.assetId) clauses.push({ assetId: String(query.assetId) });
  if (query.userId || query.employeeId) {
    const userId = String(query.userId ?? query.employeeId);
    clauses.push({
      OR: [
        { requestedById: userId },
        { fromUserId: userId },
        { toUserId: userId }
      ]
    });
  }
  if (query.departmentId) {
    const departmentId = String(query.departmentId);
    clauses.push({
      OR: [
        { fromDepartmentId: departmentId },
        { toDepartmentId: departmentId },
        { asset: { departmentId } },
        { fromUser: { departmentId } },
        { toUser: { departmentId } }
      ]
    });
  }
  if (query.from || query.to) {
    clauses.push({
      requestedAt: {
        gte: query.from ? new Date(String(query.from)) : undefined,
        lte: query.to ? new Date(String(query.to)) : undefined
      }
    });
  }
  if (query.search) {
    const search = String(query.search);
    clauses.push({
      OR: [
        { reason: textContains(search) },
        { asset: { name: textContains(search) } },
        { asset: { assetCode: textContains(search) } },
        { asset: { serialNumber: textContains(search) } },
        { requestedBy: { name: textContains(search) } },
        { fromUser: { name: textContains(search) } },
        { toUser: { name: textContains(search) } },
        { fromDepartment: { name: textContains(search) } },
        { toDepartment: { name: textContains(search) } }
      ]
    });
  }

  const scopedWhere =
    actor.role === Role.EMPLOYEE
      ? {
          OR: [
            { requestedById: actor.id },
            { fromUserId: actor.id },
            { toUserId: actor.id }
          ]
        }
      : actor.role === Role.MANAGER
        ? {
            OR: [
              { fromDepartmentId: actor.departmentId },
              { toDepartmentId: actor.departmentId },
              { asset: { departmentId: actor.departmentId } },
              { fromUser: { departmentId: actor.departmentId } },
              { toUser: { departmentId: actor.departmentId } }
            ]
          }
        : {};

  return andWhere(...clauses, scopedWhere);
};

const buildOrderBy = (query: Record<string, unknown>): Prisma.TransferOrderByWithRelationInput => {
  const sortBy = String(query.sortBy ?? "createdAt");
  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";
  return { [sortBy]: sortOrder };
};

export const listTransfers = async (query: Record<string, unknown>, actor: Express.User) => {
  const { page, limit, skip } = getPagination(query);
  const where = buildTransferListWhere(query, actor);

  const [items, total] = await Promise.all([
    prisma.transfer.findMany({
      where,
      include: transferInclude,
      orderBy: buildOrderBy(query),
      skip,
      take: limit
    }),
    prisma.transfer.count({ where })
  ]);

  return paginated(items.map(formatTransfer), total, page, limit);
};

export const getTransfer = async (id: string, actor: Express.User) => {
  const transfer = await prisma.transfer.findUnique({
    where: { id },
    include: transferInclude
  });
  if (!transfer) throw notFound("Transfer not found.");
  assertActorCanReadTransfer(transfer, actor);
  return formatTransfer(transfer);
};

export const createTransfer = async (
  data: { assetId: string; toUserId?: string; toDepartmentId?: string; reason: string },
  actor: Express.User
) => {
  if (!data.toUserId && !data.toDepartmentId) {
    throw badRequest("Transfer destination is required.");
  }

  const [activeAllocation, destinationUser, destinationDepartment, pendingTransfer] = await Promise.all([
    prisma.allocation.findFirst({
      where: { assetId: data.assetId, status: AllocationStatus.ACTIVE },
      include: {
        asset: { select: assetSummarySelect },
        user: { select: userSummarySelect },
        department: { select: departmentSummarySelect }
      }
    }),
    assertActiveUser(data.toUserId),
    assertActiveDepartment(data.toDepartmentId),
    prisma.transfer.findFirst({
      where: { assetId: data.assetId, status: TransferStatus.PENDING },
      select: { id: true }
    })
  ]);

  if (!activeAllocation) {
    throw conflict("Only actively allocated assets can be transferred.");
  }
  if (transferBlockedAssetStatuses.includes(activeAllocation.asset.status)) {
    throw conflict(`Asset cannot be transferred while status is ${activeAllocation.asset.status}.`);
  }
  if (pendingTransfer) {
    throw conflict("Asset already has a pending transfer.");
  }

  if (actor.role === Role.EMPLOYEE && activeAllocation.userId !== actor.id) {
    throw forbidden("Employees can only transfer assets assigned to them.");
  }

  if (actor.role === Role.MANAGER && activeAllocation.asset.departmentId !== actor.departmentId) {
    throw forbidden("Managers can only transfer assets in their assigned department.");
  }

  const destinationDepartmentId = destinationDepartment?.id ?? destinationUser?.departmentId ?? null;
  if (
    (data.toUserId && activeAllocation.userId === data.toUserId) ||
    (!data.toUserId && activeAllocation.departmentId === destinationDepartmentId)
  ) {
    throw badRequest("Transfer destination must differ from current allocation.");
  }

  const transfer = await prisma.transfer.create({
    data: {
      assetId: data.assetId,
      requestedById: actor.id,
      fromUserId: activeAllocation.userId,
      toUserId: data.toUserId,
      fromDepartmentId: activeAllocation.departmentId ?? activeAllocation.asset.departmentId,
      toDepartmentId: destinationDepartmentId,
      reason: data.reason
    },
    include: transferInclude
  });

  await createAuditLog({
    actorId: actor.id,
    entityType: "Transfer",
    entityId: transfer.id,
    action: "requested",
    metadata: { assetId: data.assetId, toUserId: data.toUserId, toDepartmentId: destinationDepartmentId }
  });

  return formatTransfer(transfer);
};

export const approveTransfer = async (id: string, actor: Express.User, decisionNotes?: string) => {
  return prisma.$transaction(async (tx) => {
    const transfer = await tx.transfer.findUnique({ where: { id }, include: transferInclude });
    if (!transfer) throw notFound("Transfer not found.");
    if (transfer.status !== TransferStatus.PENDING) throw conflict("Only pending transfers can be approved.");
    assertActorCanApproveTransfer(transfer, actor);

    const activeAllocations = await tx.allocation.findMany({
      where: { assetId: transfer.assetId, status: AllocationStatus.ACTIVE },
      include: {
        asset: { select: assetSummarySelect },
        user: { select: userSummarySelect },
        department: { select: departmentSummarySelect }
      }
    });
    if (activeAllocations.length === 0) throw conflict("Transfer has no active source allocation.");
    if (activeAllocations.length > 1) throw conflict("Transfer source asset has more than one active allocation.");

    const activeAllocation = activeAllocations[0];
    const destinationDepartmentId = transfer.toDepartmentId ?? transfer.toUser?.departmentId ?? transfer.asset.departmentId;

    if (
      (transfer.toUserId && activeAllocation.userId === transfer.toUserId) ||
      (!transfer.toUserId && activeAllocation.departmentId === destinationDepartmentId)
    ) {
      throw badRequest("Transfer destination must differ from current allocation.");
    }

    await tx.allocation.update({
      where: { id: activeAllocation.id },
      data: {
        status: AllocationStatus.TRANSFERRED,
        returnedAt: new Date(),
        returnReason: `Transferred through request ${transfer.id}`
      }
    });

    const newAllocation = await tx.allocation.create({
      data: {
        assetId: transfer.assetId,
        userId: transfer.toUserId,
        departmentId: destinationDepartmentId,
        assignedById: actor.id,
        sourceTransferId: transfer.id,
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
      include: transferInclude
    });

    await tx.asset.update({
      where: { id: transfer.assetId },
      data: {
        status: AssetStatus.ALLOCATED,
        departmentId: destinationDepartmentId,
        updatedById: actor.id
      }
    });

    await createAuditLog(
      {
        actorId: actor.id,
        entityType: "Transfer",
        entityId: id,
        action: "approved",
        metadata: { decisionNotes, newAllocationId: newAllocation.id }
      },
      tx
    );

    await createNotification(
      {
        userId: transfer.requestedById,
        type: "TRANSFER_APPROVED",
        title: "Transfer approved",
        message: `Transfer request for ${transfer.asset.name} was approved.`,
        relatedEntityType: "Transfer",
        relatedEntityId: id
      },
      tx
    );

    if (transfer.toUserId && transfer.toUserId !== transfer.requestedById) {
      await createNotification(
        {
          userId: transfer.toUserId,
          type: "ASSET_TRANSFERRED",
          title: "Asset transferred",
          message: `${transfer.asset.name} has been transferred to you.`,
          relatedEntityType: "Transfer",
          relatedEntityId: id
        },
        tx
      );
    }

    return formatTransfer(updated);
  });
};

export const rejectTransfer = async (id: string, actor: Express.User, decisionNotes?: string) => {
  const current = await prisma.transfer.findUnique({ where: { id }, include: transferInclude });
  if (!current) throw notFound("Transfer not found.");
  if (current.status !== TransferStatus.PENDING) throw conflict("Only pending transfers can be rejected.");
  assertActorCanApproveTransfer(current, actor);

  const transfer = await prisma.transfer.update({
    where: { id },
    data: { status: TransferStatus.REJECTED, approvedById: actor.id, decidedAt: new Date(), decisionNotes },
    include: transferInclude
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

  return formatTransfer(transfer);
};

export const cancelTransfer = async (id: string, actor: Express.User) => {
  const transfer = await prisma.transfer.findUnique({ where: { id }, include: transferInclude });
  if (!transfer) throw notFound("Transfer not found.");
  if (transfer.status !== TransferStatus.PENDING) throw conflict("Only pending transfers can be cancelled.");
  if (actor.role !== Role.ADMIN && transfer.requestedById !== actor.id) {
    throw forbidden("Only the requester or admin can cancel this transfer.");
  }

  const updated = await prisma.transfer.update({
    where: { id },
    data: { status: TransferStatus.CANCELLED },
    include: transferInclude
  });

  await createAuditLog({
    actorId: actor.id,
    entityType: "Transfer",
    entityId: id,
    action: "cancelled"
  });

  return formatTransfer(updated);
};

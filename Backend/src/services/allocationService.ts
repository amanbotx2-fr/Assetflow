import {
  AllocationStatus,
  AssetCondition,
  AssetStatus,
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

const allocationBlockedAssetStatuses: AssetStatus[] = [
  AssetStatus.ALLOCATED,
  AssetStatus.MAINTENANCE,
  AssetStatus.RETIRED,
  AssetStatus.LOST
];

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
  category: {
    select: {
      id: true,
      name: true,
      code: true,
      status: true
    }
  },
  department: { select: departmentSummarySelect }
} satisfies Prisma.AssetSelect;

const transferSummarySelect = {
  id: true,
  status: true,
  reason: true,
  requestedAt: true,
  decidedAt: true,
  fromUserId: true,
  toUserId: true,
  fromDepartmentId: true,
  toDepartmentId: true,
  requestedBy: { select: userSummarySelect },
  approvedBy: { select: userSummarySelect },
  fromUser: { select: userSummarySelect },
  toUser: { select: userSummarySelect },
  fromDepartment: { select: departmentSummarySelect },
  toDepartment: { select: departmentSummarySelect }
} satisfies Prisma.TransferSelect;

const allocationInclude = {
  asset: { select: assetSummarySelect },
  user: { select: userSummarySelect },
  department: { select: departmentSummarySelect },
  assignedBy: { select: userSummarySelect },
  sourceTransfer: { select: transferSummarySelect }
} satisfies Prisma.AllocationInclude;

type AllocationPayload = Prisma.AllocationGetPayload<{ include: typeof allocationInclude }>;

const hasWhere = (where: Prisma.AllocationWhereInput) => Object.keys(where).length > 0;

const andWhere = (...clauses: Prisma.AllocationWhereInput[]): Prisma.AllocationWhereInput => {
  const activeClauses = clauses.filter(hasWhere);
  if (activeClauses.length === 0) return {};
  if (activeClauses.length === 1) return activeClauses[0];
  return { AND: activeClauses };
};

const textContains = (value: string) => ({
  contains: value,
  mode: Prisma.QueryMode.insensitive
});

const formatAllocation = (allocation: AllocationPayload) => ({
  ...allocation,
  allocatedBy: allocation.assignedBy,
  allocatedTo: allocation.user,
  startDate: allocation.assignedAt,
  returnDate: allocation.returnedAt,
  transferSource: allocation.sourceTransfer,
  asset: allocation.asset
    ? {
        ...allocation.asset,
        assetTag: allocation.asset.assetCode
      }
    : allocation.asset
});

const assertActorCanReadAllocation = (allocation: AllocationPayload, actor: Express.User) => {
  if (actor.role === Role.MANAGER) {
    const scoped =
      allocation.asset.departmentId === actor.departmentId ||
      allocation.departmentId === actor.departmentId ||
      allocation.user?.departmentId === actor.departmentId;
    if (!scoped) throw forbidden("Managers can only access department allocations.");
  }

  if (actor.role === Role.EMPLOYEE && allocation.userId !== actor.id) {
    throw forbidden("Employees can only access their own allocations.");
  }
};

const assertActorCanWriteAllocation = (allocation: AllocationPayload, actor: Express.User) => {
  if (actor.role === Role.MANAGER) {
    const scoped =
      allocation.asset.departmentId === actor.departmentId ||
      allocation.departmentId === actor.departmentId ||
      allocation.user?.departmentId === actor.departmentId;
    if (!scoped) throw forbidden("Managers can only manage department allocations.");
  }

  if (actor.role === Role.EMPLOYEE && allocation.userId !== actor.id) {
    throw forbidden("Employees can only return their own allocations.");
  }
};

const assertActiveDepartment = async (departmentId?: string | null) => {
  if (departmentId === undefined || departmentId === null) return null;

  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    select: departmentSummarySelect
  });

  if (!department) throw notFound("Department not found.");
  if (department.status !== RecordStatus.ACTIVE) throw badRequest("Department is inactive.");
  return department;
};

const assertActiveUser = async (userId?: string | null) => {
  if (userId === undefined || userId === null) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSummarySelect
  });

  if (!user) throw notFound("Employee not found.");
  if (user.status !== RecordStatus.ACTIVE) throw badRequest("Employee is inactive.");
  return user;
};

const assertManagerDestinationScope = (
  actor: Express.User,
  user?: { departmentId: string | null } | null,
  departmentId?: string | null
) => {
  if (actor.role !== Role.MANAGER) return;
  if (!actor.departmentId) throw forbidden("Managers must belong to a department to manage allocations.");
  if (departmentId && departmentId !== actor.departmentId) {
    throw forbidden("Managers can only allocate assets within their assigned department.");
  }
  if (user?.departmentId && user.departmentId !== actor.departmentId) {
    throw forbidden("Managers can only allocate assets to employees in their assigned department.");
  }
};

const getNextAssetStatusAfterReturn = async (assetId: string) => {
  const openMaintenance = await prisma.maintenanceTicket.findFirst({
    where: { assetId, status: { not: MaintenanceStatus.CLOSED } },
    select: { id: true }
  });

  return openMaintenance ? AssetStatus.MAINTENANCE : AssetStatus.AVAILABLE;
};

const buildAllocationListWhere = (query: Record<string, unknown>, actor: Express.User) => {
  const clauses: Prisma.AllocationWhereInput[] = [];

  if (query.status) clauses.push({ status: query.status as AllocationStatus });
  if (query.assetId) clauses.push({ assetId: String(query.assetId) });
  if (query.userId || query.employeeId) clauses.push({ userId: String(query.userId ?? query.employeeId) });
  if (query.departmentId) clauses.push({ departmentId: String(query.departmentId) });
  if (query.from || query.to) {
    clauses.push({
      assignedAt: {
        gte: query.from ? new Date(String(query.from)) : undefined,
        lte: query.to ? new Date(String(query.to)) : undefined
      }
    });
  }
  if (query.search) {
    const search = String(query.search);
    clauses.push({
      OR: [
        { asset: { name: textContains(search) } },
        { asset: { assetCode: textContains(search) } },
        { asset: { serialNumber: textContains(search) } },
        { user: { name: textContains(search) } },
        { user: { email: textContains(search) } },
        { department: { name: textContains(search) } },
        { department: { code: textContains(search) } }
      ]
    });
  }

  const scopedWhere =
    actor.role === Role.MANAGER
      ? {
          OR: [
            { departmentId: actor.departmentId },
            { asset: { departmentId: actor.departmentId } },
            { user: { departmentId: actor.departmentId } }
          ]
        }
      : actor.role === Role.EMPLOYEE
        ? { userId: actor.id }
        : {};

  return andWhere(...clauses, scopedWhere);
};

const buildOrderBy = (query: Record<string, unknown>): Prisma.AllocationOrderByWithRelationInput => {
  const sortBy = String(query.sortBy ?? "assignedAt");
  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";
  return { [sortBy]: sortOrder };
};

export const listAllocations = async (query: Record<string, unknown>, actor: Express.User) => {
  const { page, limit, skip } = getPagination(query);
  const where = buildAllocationListWhere(query, actor);

  const [items, total] = await Promise.all([
    prisma.allocation.findMany({
      where,
      include: allocationInclude,
      orderBy: buildOrderBy(query),
      skip,
      take: limit
    }),
    prisma.allocation.count({ where })
  ]);

  return paginated(items.map(formatAllocation), total, page, limit);
};

export const getAllocation = async (id: string, actor: Express.User) => {
  const allocation = await prisma.allocation.findUnique({
    where: { id },
    include: allocationInclude
  });

  if (!allocation) throw notFound("Allocation not found.");
  assertActorCanReadAllocation(allocation, actor);
  return formatAllocation(allocation);
};

export const createAllocation = async (
  data: { assetId: string; userId?: string; departmentId?: string; notes?: string },
  actor: Express.User
) => {
  if (!data.userId && !data.departmentId) {
    throw badRequest("Either userId or departmentId is required.");
  }

  return prisma.$transaction(async (tx) => {
    const asset = await tx.asset.findUnique({
      where: { id: data.assetId },
      select: {
        id: true,
        name: true,
        status: true,
        departmentId: true
      }
    });
    if (!asset) throw notFound("Asset not found.");

    if (allocationBlockedAssetStatuses.includes(asset.status)) {
      throw conflict(`Asset cannot be allocated while status is ${asset.status}.`);
    }

    if (actor.role === Role.MANAGER && asset.departmentId !== actor.departmentId) {
      throw forbidden("Managers can only allocate assets in their assigned department.");
    }

    const [targetUser, targetDepartment] = await Promise.all([
      assertActiveUser(data.userId),
      assertActiveDepartment(data.departmentId)
    ]);
    const destinationDepartmentId = targetDepartment?.id ?? targetUser?.departmentId ?? asset.departmentId;
    assertManagerDestinationScope(actor, targetUser, destinationDepartmentId);

    const activeAllocation = await tx.allocation.findFirst({
      where: { assetId: data.assetId, status: AllocationStatus.ACTIVE },
      select: { id: true }
    });
    if (activeAllocation) throw conflict("Asset already has an active allocation.");

    const allocation = await tx.allocation.create({
      data: {
        assetId: data.assetId,
        userId: data.userId,
        departmentId: destinationDepartmentId,
        assignedById: actor.id,
        notes: data.notes
      },
      include: allocationInclude
    });

    const updatedAsset = await tx.asset.update({
      where: { id: data.assetId },
      data: {
        status: AssetStatus.ALLOCATED,
        departmentId: destinationDepartmentId ?? asset.departmentId,
        updatedById: actor.id
      },
      select: assetSummarySelect
    });

    await createAuditLog(
      {
        actorId: actor.id,
        entityType: "Allocation",
        entityId: allocation.id,
        action: "created",
        metadata: { assetId: data.assetId, userId: data.userId, departmentId: destinationDepartmentId }
      },
      tx
    );

    if (data.userId) {
      await createNotification(
        {
          userId: data.userId,
          type: "ASSET_ALLOCATED",
          title: "Asset allocated",
          message: `${asset.name} has been allocated to you.`,
          relatedEntityType: "Allocation",
          relatedEntityId: allocation.id
        },
        tx
      );
    }

    return {
      allocation: formatAllocation(allocation),
      asset: {
        ...updatedAsset,
        assetTag: updatedAsset.assetCode
      }
    };
  });
};

export const updateAllocation = async (
  id: string,
  data: { userId?: string | null; departmentId?: string | null; notes?: string | null },
  actor: Express.User
) => {
  const current = await prisma.allocation.findUnique({ where: { id }, include: allocationInclude });
  if (!current) throw notFound("Allocation not found.");
  if (current.status !== AllocationStatus.ACTIVE) throw conflict("Only active allocations can be updated.");
  assertActorCanWriteAllocation(current, actor);

  const [targetUser, targetDepartment] = await Promise.all([
    data.userId !== undefined ? assertActiveUser(data.userId) : Promise.resolve(current.user),
    data.departmentId !== undefined ? assertActiveDepartment(data.departmentId) : Promise.resolve(current.department)
  ]);
  const destinationDepartmentId =
    data.departmentId !== undefined ? targetDepartment?.id ?? null : targetUser?.departmentId ?? current.departmentId;

  if (data.userId === null && destinationDepartmentId === null) {
    throw badRequest("Allocation must have a user or department.");
  }

  assertManagerDestinationScope(actor, targetUser, destinationDepartmentId);

  const updated = await prisma.allocation.update({
    where: { id },
    data: {
      userId: data.userId === undefined ? undefined : data.userId,
      departmentId: data.departmentId === undefined ? destinationDepartmentId : data.departmentId,
      notes: data.notes === undefined ? undefined : data.notes
    },
    include: allocationInclude
  });

  await prisma.asset.update({
    where: { id: current.assetId },
    data: {
      departmentId: destinationDepartmentId ?? current.asset.departmentId,
      updatedById: actor.id
    }
  });

  await createAuditLog({
    actorId: actor.id,
    entityType: "Allocation",
    entityId: id,
    action: "updated",
    metadata: data
  });

  return formatAllocation(updated);
};

export const returnAllocation = async (
  id: string,
  data: { returnCondition: AssetCondition; reason: string; notes?: string },
  actor: Express.User
) => {
  return prisma.$transaction(async (tx) => {
    const current = await tx.allocation.findUnique({ where: { id }, include: allocationInclude });
    if (!current) throw notFound("Allocation not found.");
    if (current.status !== AllocationStatus.ACTIVE) throw conflict("Only active allocations can be returned.");
    assertActorCanWriteAllocation(current, actor);

    const nextAssetStatus = await getNextAssetStatusAfterReturn(current.assetId);
    const updated = await tx.allocation.update({
      where: { id },
      data: {
        status: AllocationStatus.RETURNED,
        returnedAt: new Date(),
        returnCondition: data.returnCondition,
        returnReason: data.reason,
        notes: data.notes ?? current.notes
      },
      include: allocationInclude
    });

    await tx.asset.update({
      where: { id: current.assetId },
      data: {
        status: nextAssetStatus,
        condition: data.returnCondition,
        updatedById: actor.id
      }
    });

    await createAuditLog(
      {
        actorId: actor.id,
        entityType: "Allocation",
        entityId: id,
        action: "returned",
        metadata: { reason: data.reason, returnCondition: data.returnCondition }
      },
      tx
    );

    if (current.assignedById !== actor.id) {
      await createNotification(
        {
          userId: current.assignedById,
          type: "ASSET_RETURNED",
          title: "Asset returned",
          message: `${current.asset.name} was returned.`,
          relatedEntityType: "Allocation",
          relatedEntityId: id
        },
        tx
      );
    }

    return formatAllocation(updated);
  });
};

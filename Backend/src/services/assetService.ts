import { AllocationStatus, AssetStatus, MaintenanceStatus, Prisma, RecordStatus, Role } from "@prisma/client";
import QRCode from "qrcode";
import { prisma } from "../config/prisma.js";
import { createAuditLog } from "../repositories/auditLogRepository.js";
import { createAllocation } from "./allocationService.js";
import { badRequest, conflict, forbidden, notFound } from "../utils/httpError.js";
import { getPagination, paginated } from "../utils/pagination.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const userSummarySelect = {
  id: true,
  name: true,
  email: true,
  role: true
} satisfies Prisma.UserSelect;

const referenceSelect = {
  id: true,
  name: true,
  code: true,
  status: true
} satisfies Prisma.DepartmentSelect;

const categorySelect = {
  id: true,
  name: true,
  code: true,
  description: true,
  status: true
} satisfies Prisma.CategorySelect;

const currentAllocationInclude = {
  user: { select: userSummarySelect },
  department: { select: referenceSelect },
  assignedBy: { select: userSummarySelect },
  sourceTransfer: true
} satisfies Prisma.AllocationInclude;

const maintenanceInclude = {
  reportedBy: { select: userSummarySelect },
  assignedTo: { select: userSummarySelect }
} satisfies Prisma.MaintenanceTicketInclude;

const assetInclude = {
  category: { select: categorySelect },
  department: { select: referenceSelect },
  createdBy: { select: userSummarySelect },
  updatedBy: { select: userSummarySelect },
  allocations: {
    where: { status: AllocationStatus.ACTIVE },
    include: currentAllocationInclude,
    orderBy: { createdAt: "desc" },
    take: 1
  },
  maintenanceTickets: {
    where: { status: { not: MaintenanceStatus.CLOSED } },
    include: maintenanceInclude,
    orderBy: { createdAt: "desc" },
    take: 1
  },
  _count: {
    select: {
      allocations: true,
      transfers: true,
      bookings: true,
      maintenanceTickets: true,
      auditRecords: true
    }
  }
} satisfies Prisma.AssetInclude;

const assetDetailInclude = {
  ...assetInclude,
  allocations: {
    include: currentAllocationInclude,
    orderBy: { assignedAt: "desc" }
  },
  transfers: {
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      requestedBy: { select: userSummarySelect },
      approvedBy: { select: userSummarySelect },
      fromUser: { select: userSummarySelect },
      toUser: { select: userSummarySelect },
      fromDepartment: { select: referenceSelect },
      toDepartment: { select: referenceSelect }
    }
  },
  bookings: {
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      requestedBy: { select: userSummarySelect },
      approvedBy: { select: userSummarySelect }
    }
  },
  maintenanceTickets: {
    orderBy: { createdAt: "desc" },
    take: 10,
    include: maintenanceInclude
  },
  auditRecords: {
    orderBy: { auditedAt: "desc" },
    take: 10,
    include: {
      auditor: { select: userSummarySelect }
    }
  }
} satisfies Prisma.AssetInclude;

type AssetSummaryPayload = Prisma.AssetGetPayload<{ include: typeof assetInclude }>;
type AssetDetailPayload = Prisma.AssetGetPayload<{ include: typeof assetDetailInclude }>;

const hasWhere = (where: Prisma.AssetWhereInput) => Object.keys(where).length > 0;

const andWhere = (...clauses: Prisma.AssetWhereInput[]): Prisma.AssetWhereInput => {
  const activeClauses = clauses.filter(hasWhere);
  if (activeClauses.length === 0) return {};
  if (activeClauses.length === 1) return activeClauses[0];
  return { AND: activeClauses };
};

const buildAssetQrValue = (asset: { id: string; assetCode: string }) =>
  `assetflow:asset:${asset.id}:${asset.assetCode}`;

const formatAsset = (asset: AssetSummaryPayload | AssetDetailPayload) => {
  const allocationHistory = asset.allocations.map((allocation) => ({
    ...allocation,
    allocatedBy: allocation.assignedBy,
    allocatedTo: allocation.user,
    startDate: allocation.assignedAt,
    returnDate: allocation.returnedAt,
    transferSource: allocation.sourceTransfer
  }));
  const currentAllocation = allocationHistory.find((allocation) => allocation.status === AllocationStatus.ACTIVE) ?? null;
  const currentMaintenance = asset.maintenanceTickets[0] ?? null;

  return {
    ...asset,
    assetTag: asset.assetCode,
    qrCode: buildAssetQrValue(asset),
    currentAllocation,
    allocationHistory,
    maintenanceStatus: currentMaintenance?.status ?? null,
    currentMaintenance,
    lifecycleCounts: asset._count
  };
};

const normalizeAssetCode = (value: string) => value.trim().toUpperCase();

const normalizeSerialNumber = (value: string) => value.trim().toUpperCase();

const getAssetCodeFromData = (data: Record<string, unknown>) => {
  const assetCode = typeof data.assetCode === "string" ? normalizeAssetCode(data.assetCode) : undefined;
  const assetTag = typeof data.assetTag === "string" ? normalizeAssetCode(data.assetTag) : undefined;

  if (assetCode && assetTag && assetCode !== assetTag) {
    throw badRequest("assetCode and assetTag must match when both are provided.");
  }

  return assetCode ?? assetTag;
};

const getSerialNumberFromData = (data: Record<string, unknown>) => {
  if (data.serialNumber === undefined) return undefined;
  if (data.serialNumber === null) return null;
  return normalizeSerialNumber(String(data.serialNumber));
};

const parseQrCode = (qrCode: string) => {
  const parts = qrCode.trim().split(":");
  if (parts.length >= 4 && parts[0] === "assetflow" && parts[1] === "asset") {
    const id = parts[2];
    const assetCode = parts.slice(3).join(":");
    return {
      id: uuidPattern.test(id) ? id : undefined,
      assetCode: assetCode ? normalizeAssetCode(assetCode) : undefined
    };
  }

  return {};
};

const textContains = (value: string) => ({
  contains: value,
  mode: Prisma.QueryMode.insensitive
});

const buildSearchWhere = (value: string): Prisma.AssetWhereInput => ({
  OR: [
    { name: textContains(value) },
    { assetCode: textContains(value) },
    { serialNumber: textContains(value) },
    { location: textContains(value) },
    { description: textContains(value) }
  ]
});

const buildQrWhere = (qrCode: string): Prisma.AssetWhereInput => {
  const parsed = parseQrCode(qrCode);
  const clauses: Prisma.AssetWhereInput[] = [];

  if (parsed.id) clauses.push({ id: parsed.id });
  if (parsed.assetCode) clauses.push({ assetCode: parsed.assetCode });
  if (clauses.length === 0) {
    clauses.push({ assetCode: textContains(qrCode) }, { serialNumber: textContains(qrCode) });
  }

  return { OR: clauses };
};

const applyActorReadScope = (
  actor: Express.User,
  where: Prisma.AssetWhereInput,
  requestedDepartmentId?: unknown
): Prisma.AssetWhereInput => {
  if (actor.role === Role.MANAGER) {
    if (!actor.departmentId) throw forbidden("Managers must belong to a department to access assets.");
    if (requestedDepartmentId && requestedDepartmentId !== actor.departmentId) {
      throw forbidden("Managers can only access assets in their assigned department.");
    }
    return andWhere(where, { departmentId: actor.departmentId });
  }

  if (actor.role === Role.EMPLOYEE) {
    return andWhere(where, {
      OR: [
        { isBookable: true },
        { allocations: { some: { userId: actor.id, status: AllocationStatus.ACTIVE } } }
      ]
    });
  }

  return where;
};

const assertAssetReadable = (asset: AssetSummaryPayload | AssetDetailPayload, actor: Express.User) => {
  if (actor.role === Role.MANAGER && asset.departmentId !== actor.departmentId) {
    throw forbidden("Managers can only access their assigned department assets.");
  }

  if (
    actor.role === Role.EMPLOYEE &&
    !asset.isBookable &&
    !asset.allocations.some((allocation) => allocation.userId === actor.id && allocation.status === AllocationStatus.ACTIVE)
  ) {
    throw forbidden("Employees can only access assigned or bookable assets.");
  }
};

const assertManagerWriteScope = (actor: Express.User, departmentId?: string | null) => {
  if (actor.role !== Role.MANAGER) return;
  if (!actor.departmentId) throw forbidden("Managers must belong to a department to manage assets.");
  if (departmentId !== actor.departmentId) {
    throw forbidden("Managers can only manage assets in their assigned department.");
  }
};

const assertCategoryIsActive = async (categoryId: string) => {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, status: true }
  });

  if (!category) throw notFound("Category not found.");
  if (category.status !== RecordStatus.ACTIVE) throw badRequest("Category is inactive.");
};

const assertDepartmentIsActive = async (departmentId?: string | null) => {
  if (departmentId === undefined || departmentId === null) return;

  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { id: true, status: true }
  });

  if (!department) throw notFound("Department not found.");
  if (department.status !== RecordStatus.ACTIVE) throw badRequest("Department is inactive.");
};

const assertUniqueAssetIdentifiers = async (assetCode?: string, serialNumber?: string | null, excludeId?: string) => {
  const clauses: Prisma.AssetWhereInput[] = [];
  if (assetCode) clauses.push({ assetCode });
  if (serialNumber) clauses.push({ serialNumber });
  if (clauses.length === 0) return;

  const existing = await prisma.asset.findFirst({
    where: {
      OR: clauses,
      id: excludeId ? { not: excludeId } : undefined
    },
    select: { assetCode: true, serialNumber: true }
  });

  if (!existing) return;
  if (assetCode && existing.assetCode === assetCode) throw conflict("Asset tag already exists.");
  if (serialNumber && existing.serialNumber === serialNumber) throw conflict("Serial number already exists.");
  throw conflict("Asset identifier already exists.");
};

const assertStatusUpdateAllowed = async (assetId: string, nextStatus?: AssetStatus) => {
  if (!nextStatus) return;

  const activeAllocation = await prisma.allocation.findFirst({
    where: { assetId, status: AllocationStatus.ACTIVE },
    select: { id: true }
  });

  if (nextStatus === AssetStatus.ALLOCATED && !activeAllocation) {
    throw conflict("Asset cannot be marked ALLOCATED without an active allocation.");
  }

  if ((nextStatus === AssetStatus.AVAILABLE || nextStatus === AssetStatus.RETIRED) && activeAllocation) {
    throw conflict("Return or transfer the active allocation before changing this asset status.");
  }
};

const buildAssetListWhere = (query: Record<string, unknown>, actor: Express.User) => {
  const clauses: Prisma.AssetWhereInput[] = [];

  if (query.search) clauses.push(buildSearchWhere(String(query.search)));
  if (query.categoryId) clauses.push({ categoryId: String(query.categoryId) });
  if (query.category) {
    clauses.push({
      category: {
        is: {
          OR: [
            { name: textContains(String(query.category)) },
            { code: textContains(String(query.category)) }
          ]
        }
      }
    });
  }
  if (query.departmentId) clauses.push({ departmentId: String(query.departmentId) });
  if (query.department) {
    clauses.push({
      department: {
        is: {
          OR: [
            { name: textContains(String(query.department)) },
            { code: textContains(String(query.department)) }
          ]
        }
      }
    });
  }
  if (query.status) clauses.push({ status: query.status as AssetStatus });
  if (query.serialNumber) clauses.push({ serialNumber: textContains(String(query.serialNumber)) });
  if (query.assetCode) clauses.push({ assetCode: textContains(String(query.assetCode)) });
  if (query.assetTag) clauses.push({ assetCode: textContains(String(query.assetTag)) });
  if (query.qrCode) clauses.push(buildQrWhere(String(query.qrCode)));
  if (query.location) clauses.push({ location: textContains(String(query.location)) });

  return applyActorReadScope(actor, andWhere(...clauses), query.departmentId);
};

const buildLookupWhere = (query: Record<string, unknown>, actor: Express.User) => {
  const clauses: Prisma.AssetWhereInput[] = [];

  if (query.q) clauses.push(buildSearchWhere(String(query.q)));
  if (query.assetCode) clauses.push({ assetCode: normalizeAssetCode(String(query.assetCode)) });
  if (query.assetTag) clauses.push({ assetCode: normalizeAssetCode(String(query.assetTag)) });
  if (query.serialNumber) clauses.push({ serialNumber: normalizeSerialNumber(String(query.serialNumber)) });
  if (query.qrCode) clauses.push(buildQrWhere(String(query.qrCode)));

  return applyActorReadScope(actor, { OR: clauses }, undefined);
};

const buildOrderBy = (query: Record<string, unknown>): Prisma.AssetOrderByWithRelationInput => {
  const sortBy = String(query.sortBy ?? "createdAt");
  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

  return { [sortBy]: sortOrder };
};

const resolveCreateDepartmentId = (data: Record<string, unknown>, actor: Express.User) => {
  const requestedDepartmentId = data.departmentId as string | undefined;
  if (actor.role === Role.MANAGER) {
    if (!actor.departmentId) throw forbidden("Managers must belong to a department to create assets.");
    if (requestedDepartmentId && requestedDepartmentId !== actor.departmentId) {
      throw forbidden("Managers can only create assets in their assigned department.");
    }
    return actor.departmentId;
  }

  return requestedDepartmentId;
};

export const listAssets = async (query: Record<string, unknown>, actor: Express.User) => {
  const { page, limit, skip } = getPagination(query);
  const where = buildAssetListWhere(query, actor);

  const [items, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      include: assetInclude,
      orderBy: buildOrderBy(query),
      skip,
      take: limit
    }),
    prisma.asset.count({ where })
  ]);

  return paginated(items.map(formatAsset), total, page, limit);
};

export const lookupAsset = async (query: Record<string, unknown>, actor: Express.User) => {
  const asset = await prisma.asset.findFirst({
    where: buildLookupWhere(query, actor),
    include: assetInclude,
    orderBy: { createdAt: "desc" }
  });

  if (!asset) throw notFound("Asset not found.");
  assertAssetReadable(asset, actor);

  return formatAsset(asset);
};

export const createAsset = async (data: Record<string, unknown>, actor: Express.User) => {
  const assetCode = getAssetCodeFromData(data);
  if (!assetCode) throw badRequest("Asset tag is required.");

  const serialNumber = getSerialNumberFromData(data);
  const departmentId = resolveCreateDepartmentId(data, actor);

  await Promise.all([
    assertCategoryIsActive(String(data.categoryId)),
    assertDepartmentIsActive(departmentId),
    assertUniqueAssetIdentifiers(assetCode, serialNumber)
  ]);

  const created = await prisma.asset.create({
    data: {
      assetCode,
      serialNumber,
      name: String(data.name),
      description: data.description as string | undefined,
      categoryId: data.categoryId as string,
      departmentId,
      createdById: actor.id,
      updatedById: actor.id,
      condition: data.condition as never,
      location: data.location as string | undefined,
      purchaseValue: data.purchaseValue as number | undefined,
      purchaseDate: data.purchaseDate ? new Date(String(data.purchaseDate)) : undefined,
      warrantyExpiry: data.warrantyExpiry ? new Date(String(data.warrantyExpiry)) : undefined,
      isBookable: Boolean(data.isBookable)
    },
    include: assetInclude
  });

  await createAuditLog({
    actorId: actor.id,
    entityType: "Asset",
    entityId: created.id,
    action: "created",
    metadata: { assetCode: created.assetCode, serialNumber: created.serialNumber }
  });

  return formatAsset(created);
};

export const getAsset = async (id: string, actor: Express.User) => {
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: assetDetailInclude
  });

  if (!asset) throw notFound("Asset not found.");
  assertAssetReadable(asset, actor);

  return formatAsset(asset);
};

export const updateAsset = async (id: string, data: Record<string, unknown>, actor: Express.User) => {
  const current = await prisma.asset.findUnique({ where: { id } });
  if (!current) throw notFound("Asset not found.");

  assertManagerWriteScope(actor, current.departmentId);

  const assetCode = getAssetCodeFromData(data);
  const serialNumber = getSerialNumberFromData(data);
  const nextDepartmentId = data.departmentId === undefined ? undefined : (data.departmentId as string | null);

  if (actor.role === Role.MANAGER && nextDepartmentId !== undefined && nextDepartmentId !== actor.departmentId) {
    throw forbidden("Managers can only keep assets in their assigned department.");
  }

  await Promise.all([
    data.categoryId ? assertCategoryIsActive(String(data.categoryId)) : Promise.resolve(),
    nextDepartmentId !== undefined ? assertDepartmentIsActive(nextDepartmentId) : Promise.resolve(),
    assertUniqueAssetIdentifiers(assetCode, serialNumber, id),
    assertStatusUpdateAllowed(id, data.status as AssetStatus | undefined)
  ]);

  const updateData: Prisma.AssetUncheckedUpdateInput = {
    updatedById: actor.id
  };

  if (assetCode) updateData.assetCode = assetCode;
  if (serialNumber !== undefined) updateData.serialNumber = serialNumber;
  if (data.name !== undefined) updateData.name = String(data.name);
  if (data.description !== undefined) updateData.description = data.description as string | null;
  if (data.categoryId !== undefined) updateData.categoryId = String(data.categoryId);
  if (nextDepartmentId !== undefined) updateData.departmentId = nextDepartmentId;
  if (data.status !== undefined) updateData.status = data.status as AssetStatus;
  if (data.condition !== undefined) updateData.condition = data.condition as never;
  if (data.location !== undefined) updateData.location = data.location as string | null;
  if (data.purchaseValue !== undefined) updateData.purchaseValue = data.purchaseValue as number | null;
  if (data.purchaseDate !== undefined) {
    updateData.purchaseDate = data.purchaseDate === null ? null : new Date(String(data.purchaseDate));
  }
  if (data.warrantyExpiry !== undefined) {
    updateData.warrantyExpiry = data.warrantyExpiry === null ? null : new Date(String(data.warrantyExpiry));
  }
  if (data.isBookable !== undefined) updateData.isBookable = Boolean(data.isBookable);

  const updated = await prisma.asset.update({
    where: { id },
    data: updateData,
    include: assetInclude
  });

  await createAuditLog({
    actorId: actor.id,
    entityType: "Asset",
    entityId: updated.id,
    action: "updated",
    metadata: data
  });

  return formatAsset(updated);
};

export const deleteAsset = async (id: string, actor: Express.User) => {
  return prisma.$transaction(async (tx) => {
    const current = await tx.asset.findUnique({ where: { id } });
    if (!current) throw notFound("Asset not found.");

    assertManagerWriteScope(actor, current.departmentId);

    const activeAllocation = await tx.allocation.findFirst({
      where: { assetId: id, status: AllocationStatus.ACTIVE },
      select: { id: true }
    });
    if (activeAllocation) throw conflict("Return or transfer the asset before deleting it.");

    const updated = await tx.asset.update({
      where: { id },
      data: { status: AssetStatus.RETIRED, updatedById: actor.id },
      include: assetInclude
    });

    await createAuditLog(
      {
        actorId: actor.id,
        entityType: "Asset",
        entityId: id,
        action: "deleted",
        metadata: { strategy: "soft-delete", status: AssetStatus.RETIRED }
      },
      tx
    );

    return formatAsset(updated);
  });
};

export const allocateAsset = async (
  id: string,
  data: { userId?: string; departmentId?: string; notes?: string },
  actor: Express.User
) => {
  return createAllocation({ assetId: id, ...data }, actor);
};

export const retireAsset = async (id: string, reason: string, actor: Express.User) => {
  return prisma.$transaction(async (tx) => {
    const activeAllocation = await tx.allocation.findFirst({
      where: { assetId: id, status: AllocationStatus.ACTIVE }
    });

    if (activeAllocation) {
      throw conflict("Return or transfer the asset before retirement.");
    }

    const asset = await tx.asset.update({
      where: { id },
      data: { status: AssetStatus.RETIRED, updatedById: actor.id },
      include: assetInclude
    });

    await createAuditLog(
      {
        actorId: actor.id,
        entityType: "Asset",
        entityId: id,
        action: "retired",
        metadata: { reason }
      },
      tx
    );

    return formatAsset(asset);
  });
};

export const getAssetQr = async (id: string, actor: Express.User) => {
  const asset = await getAsset(id, actor);
  const qrValue = buildAssetQrValue(asset);
  const imageDataUrl = await QRCode.toDataURL(qrValue);

  return {
    qrValue,
    qrCode: qrValue,
    imageDataUrl,
    assetId: asset.id,
    assetCode: asset.assetCode,
    assetTag: asset.assetTag,
    serialNumber: asset.serialNumber
  };
};

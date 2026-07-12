import { AllocationStatus, AssetStatus, Role } from "@prisma/client";
import QRCode from "qrcode";
import { prisma } from "../config/prisma.js";
import { createAuditLog } from "../repositories/auditLogRepository.js";
import { createNotification } from "../repositories/notificationRepository.js";
import { badRequest, conflict, forbidden, notFound } from "../utils/httpError.js";
import { getPagination, paginated } from "../utils/pagination.js";

const blockedAllocationStatuses: AssetStatus[] = [
  AssetStatus.RETIRED,
  AssetStatus.LOST,
  AssetStatus.MAINTENANCE
];

const assetInclude = {
  category: true,
  department: true,
  allocations: {
    where: { status: AllocationStatus.ACTIVE },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      department: true
    }
  }
};

const buildAssetScope = (actor: Express.User, query: Record<string, unknown>) => {
  const where: Record<string, unknown> = {};

  if (query.status) where.status = query.status;
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.departmentId) where.departmentId = query.departmentId;
  if (query.search) {
    where.OR = [
      { name: { contains: String(query.search), mode: "insensitive" } },
      { assetCode: { contains: String(query.search), mode: "insensitive" } }
    ];
  }

  if (actor.role === Role.MANAGER) {
    where.departmentId = actor.departmentId;
  }

  if (actor.role === Role.EMPLOYEE) {
    where.OR = [
      { isBookable: true },
      { allocations: { some: { userId: actor.id, status: AllocationStatus.ACTIVE } } }
    ];
  }

  return where;
};

export const listAssets = async (query: Record<string, unknown>, actor: Express.User) => {
  const { page, limit, skip } = getPagination(query);
  const where = buildAssetScope(actor, query);

  const [items, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      include: assetInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    }),
    prisma.asset.count({ where })
  ]);

  return paginated(items, total, page, limit);
};

export const createAsset = async (data: Record<string, unknown>, actor: Express.User) => {
  if (actor.role === Role.MANAGER && data.departmentId && data.departmentId !== actor.departmentId) {
    throw forbidden("Managers can only create assets in their assigned department.");
  }

  const created = await prisma.asset.create({
    data: {
      assetCode: String(data.assetCode).toUpperCase(),
      name: String(data.name),
      description: data.description as string | undefined,
      categoryId: data.categoryId as string,
      departmentId: data.departmentId as string | undefined,
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
    metadata: { assetCode: created.assetCode }
  });

  return created;
};

export const getAsset = async (id: string, actor: Express.User) => {
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      ...assetInclude,
      transfers: { orderBy: { createdAt: "desc" }, take: 10 },
      bookings: { orderBy: { createdAt: "desc" }, take: 10 },
      maintenanceTickets: { orderBy: { createdAt: "desc" }, take: 10 },
      auditRecords: { orderBy: { auditedAt: "desc" }, take: 10 }
    }
  });

  if (!asset) throw notFound("Asset not found.");
  if (actor.role === Role.MANAGER && asset.departmentId !== actor.departmentId) {
    throw forbidden("Managers can only access their assigned department assets.");
  }
  if (
    actor.role === Role.EMPLOYEE &&
    !asset.isBookable &&
    !asset.allocations.some((allocation) => allocation.userId === actor.id)
  ) {
    throw forbidden("Employees can only access assigned or bookable assets.");
  }

  return asset;
};

export const updateAsset = async (id: string, data: Record<string, unknown>, actor: Express.User) => {
  const current = await prisma.asset.findUnique({ where: { id } });
  if (!current) throw notFound("Asset not found.");

  if (actor.role === Role.MANAGER && current.departmentId !== actor.departmentId) {
    throw forbidden("Managers can only update their assigned department assets.");
  }

  const updated = await prisma.asset.update({
    where: { id },
    data: {
      ...data,
      assetCode: undefined,
      purchaseDate: data.purchaseDate === null ? null : data.purchaseDate ? new Date(String(data.purchaseDate)) : undefined,
      warrantyExpiry:
        data.warrantyExpiry === null ? null : data.warrantyExpiry ? new Date(String(data.warrantyExpiry)) : undefined
    },
    include: assetInclude
  });

  await createAuditLog({
    actorId: actor.id,
    entityType: "Asset",
    entityId: updated.id,
    action: "updated",
    metadata: data
  });

  return updated;
};

export const allocateAsset = async (
  id: string,
  data: { userId?: string; departmentId?: string; notes?: string },
  actor: Express.User
) => {
  if (!data.userId && !data.departmentId) {
    throw badRequest("Either userId or departmentId is required.");
  }

  return prisma.$transaction(async (tx) => {
    const asset = await tx.asset.findUnique({ where: { id } });
    if (!asset) throw notFound("Asset not found.");

    if (blockedAllocationStatuses.includes(asset.status)) {
      throw conflict(`Asset cannot be allocated while status is ${asset.status}.`);
    }

    if (actor.role === Role.MANAGER && asset.departmentId !== actor.departmentId) {
      throw forbidden("Managers can only allocate assets in their assigned department.");
    }

    const activeAllocation = await tx.allocation.findFirst({
      where: { assetId: id, status: AllocationStatus.ACTIVE }
    });

    if (activeAllocation) {
      throw conflict("Asset already has an active allocation.");
    }

    const allocation = await tx.allocation.create({
      data: {
        assetId: id,
        userId: data.userId,
        departmentId: data.departmentId,
        assignedById: actor.id,
        notes: data.notes
      }
    });

    const updatedAsset = await tx.asset.update({
      where: { id },
      data: { status: AssetStatus.ALLOCATED },
      include: assetInclude
    });

    await createAuditLog(
      {
        actorId: actor.id,
        entityType: "Asset",
        entityId: id,
        action: "allocated",
        metadata: { allocationId: allocation.id, userId: data.userId, departmentId: data.departmentId }
      },
      tx
    );

    if (data.userId) {
      await createNotification(
        {
          userId: data.userId,
          type: "ASSET_ALLOCATED",
          title: "Asset allocated",
          message: `${updatedAsset.name} has been allocated to you.`,
          relatedEntityType: "Asset",
          relatedEntityId: id
        },
        tx
      );
    }

    return { allocation, asset: updatedAsset };
  });
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
      data: { status: AssetStatus.RETIRED },
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

    return asset;
  });
};

export const getAssetQr = async (id: string, actor: Express.User) => {
  const asset = await getAsset(id, actor);
  const qrValue = `assetflow:asset:${asset.id}:${asset.assetCode}`;
  const imageDataUrl = await QRCode.toDataURL(qrValue);

  return { qrValue, imageDataUrl, assetId: asset.id, assetCode: asset.assetCode };
};

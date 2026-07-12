import { AssetCondition, AssetStatus, AuditResult, Role } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { createAuditLog } from "../repositories/auditLogRepository.js";
import { forbidden, notFound } from "../utils/httpError.js";
import { getPagination, paginated } from "../utils/pagination.js";

export const listAuditRecords = async (query: Record<string, unknown>) => {
  const { page, limit, skip } = getPagination(query);
  const where: Record<string, unknown> = {};
  if (query.assetId) where.assetId = query.assetId;
  if (query.result || query.status) where.result = query.result ?? query.status;

  const [items, total] = await Promise.all([
    prisma.auditRecord.findMany({
      where,
      include: { asset: true, auditor: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { auditedAt: "desc" },
      skip,
      take: limit
    }),
    prisma.auditRecord.count({ where })
  ]);

  return paginated(items, total, page, limit);
};

export const createAuditRecord = async (
  data: { assetId: string; result: AuditResult; remarks?: string },
  actor: Express.User
) => {
  return prisma.$transaction(async (tx) => {
    const asset = await tx.asset.findUnique({ where: { id: data.assetId } });
    if (!asset) throw notFound("Asset not found.");
    if (actor.role === Role.AUDITOR && asset.status === AssetStatus.RETIRED) {
      throw forbidden("Retired assets cannot be audited by auditor role.");
    }

    const record = await tx.auditRecord.create({
      data: { assetId: data.assetId, auditorId: actor.id, result: data.result, remarks: data.remarks }
    });

    if (data.result === AuditResult.MISSING) {
      await tx.asset.update({ where: { id: data.assetId }, data: { status: AssetStatus.LOST } });
    }

    if (data.result === AuditResult.DAMAGED) {
      await tx.asset.update({ where: { id: data.assetId }, data: { condition: AssetCondition.DAMAGED } });
    }

    await createAuditLog(
      {
        actorId: actor.id,
        entityType: "AuditRecord",
        entityId: record.id,
        action: "created",
        metadata: { assetId: data.assetId, result: data.result }
      },
      tx
    );

    return record;
  });
};

export const listAuditLogs = async (query: Record<string, unknown>) => {
  const { page, limit, skip } = getPagination(query);
  const where: Record<string, unknown> = {};
  if (query.entityType) where.entityType = query.entityType;
  if (query.entityId) where.entityId = query.entityId;

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    }),
    prisma.auditLog.count({ where })
  ]);

  return paginated(items, total, page, limit);
};

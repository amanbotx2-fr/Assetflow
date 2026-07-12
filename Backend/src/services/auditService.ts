import {
  AllocationStatus,
  AssetCondition,
  AssetStatus,
  AuditDiscrepancyType,
  AuditResult,
  AuditStatus,
  Prisma,
  RecordStatus,
  Role
} from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { createAuditLog } from "../repositories/auditLogRepository.js";
import { createNotification } from "../repositories/notificationRepository.js";
import { badRequest, conflict, forbidden, notFound } from "../utils/httpError.js";
import { getPagination, paginated } from "../utils/pagination.js";

const activeAuditStatuses: AuditStatus[] = [AuditStatus.ACTIVE, AuditStatus.IN_PROGRESS];
const closedAuditStatuses: AuditStatus[] = [AuditStatus.COMPLETED, AuditStatus.CLOSED];
const assignableAuditRoles: Role[] = [Role.ADMIN, Role.MANAGER, Role.AUDITOR];
const flaggedAuditResults: AuditResult[] = [AuditResult.MISSING, AuditResult.DAMAGED];
const discrepancyResults: AuditResult[] = [
  AuditResult.MISSING,
  AuditResult.DAMAGED,
  AuditResult.RETIRED,
  AuditResult.UNREACHABLE,
  AuditResult.MISPLACED,
  AuditResult.NEEDS_REVIEW
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
  department: { select: departmentSummarySelect },
  allocations: {
    where: { status: AllocationStatus.ACTIVE },
    select: { id: true, userId: true, departmentId: true },
    take: 1
  }
} satisfies Prisma.AssetSelect;

const auditRecordInclude = {
  asset: { select: assetSummarySelect },
  auditor: { select: userSummarySelect },
  expectedDepartment: { select: departmentSummarySelect },
  departmentVerified: { select: departmentSummarySelect },
  discrepancies: true
} satisfies Prisma.AuditRecordInclude;

const auditInclude = {
  department: { select: departmentSummarySelect },
  createdBy: { select: userSummarySelect },
  assignedAuditor: { select: userSummarySelect },
  records: {
    include: auditRecordInclude,
    orderBy: { createdAt: "asc" }
  },
  discrepancies: {
    include: { asset: { select: assetSummarySelect } },
    orderBy: { createdAt: "desc" }
  }
} satisfies Prisma.AuditInclude;

type AuditPayload = Prisma.AuditGetPayload<{ include: typeof auditInclude }>;
type AuditRecordPayload = Prisma.AuditRecordGetPayload<{ include: typeof auditRecordInclude }>;
type DbClient = Prisma.TransactionClient | typeof prisma;

const hasWhere = (where: Prisma.AuditWhereInput) => Object.keys(where).length > 0;

const andWhere = (...clauses: Prisma.AuditWhereInput[]): Prisma.AuditWhereInput => {
  const activeClauses = clauses.filter(hasWhere);
  if (activeClauses.length === 0) return {};
  if (activeClauses.length === 1) return activeClauses[0];
  return { AND: activeClauses };
};

const textContains = (value: string) => ({
  contains: value,
  mode: Prisma.QueryMode.insensitive
});

const formatAsset = (asset: AuditRecordPayload["asset"]) => ({
  ...asset,
  assetTag: asset.assetCode
});

const formatAuditRecord = (record: AuditRecordPayload) => ({
  ...record,
  asset: formatAsset(record.asset),
  verifiedBy: record.auditor,
  verifiedById: record.auditorId,
  verifiedAt: record.verifiedAt ?? (record.result ? record.auditedAt : null)
});

const formatAudit = (audit: AuditPayload) => {
  const totalAssets = audit.records.length;
  const verifiedAssets = audit.records.filter((record) => record.result).length;
  const pendingVerification = Math.max(0, totalAssets - verifiedAssets);

  return {
    ...audit,
    records: audit.records.map(formatAuditRecord),
    totalAssets,
    verifiedAssets,
    pendingVerification,
    discrepanciesFound: audit.discrepancies.length,
    completionPercentage: totalAssets === 0 ? 0 : Math.round((verifiedAssets / totalAssets) * 100)
  };
};

const notify = (
  data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    auditId: string;
  },
  client: DbClient
) =>
  createNotification(
    {
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      relatedEntityType: "Audit",
      relatedEntityId: data.auditId
    },
    client
  );

const assertAuditReadable = (audit: AuditPayload, actor: Express.User) => {
  if (actor.role === Role.ADMIN || actor.role === Role.AUDITOR) return;

  if (actor.role === Role.MANAGER) {
    const scoped =
      audit.departmentId === actor.departmentId ||
      audit.records.some((record) => record.asset.departmentId === actor.departmentId);
    if (!scoped) throw forbidden("Managers can only access department audits.");
    return;
  }

  const assigned = audit.records.some((record) =>
    record.asset.allocations.some((allocation) => allocation.userId === actor.id)
  );
  if (!assigned) throw forbidden("Employees can only access assigned audits.");
};

const assertAuditManageable = (audit: AuditPayload, actor: Express.User) => {
  if (actor.role === Role.ADMIN || actor.role === Role.AUDITOR) return;

  if (actor.role === Role.MANAGER) {
    const scoped =
      audit.departmentId === actor.departmentId ||
      audit.records.every((record) => record.asset.departmentId === actor.departmentId);
    if (!scoped) throw forbidden("Managers can only manage department audits.");
    return;
  }

  throw forbidden("You do not have permission to manage audits.");
};

const assertCanVerifyRecord = (audit: AuditPayload, record: AuditRecordPayload, actor: Express.User) => {
  if (actor.role === Role.ADMIN || actor.role === Role.AUDITOR) return;

  if (actor.role === Role.MANAGER) {
    if (record.asset.departmentId !== actor.departmentId) {
      throw forbidden("Managers can only verify department audit assets.");
    }
    return;
  }

  const assigned = record.asset.allocations.some((allocation) => allocation.userId === actor.id);
  if (!assigned) throw forbidden("Employees can only verify assets assigned to them.");
};

const assertActiveUser = async (userId?: string | null, client: DbClient = prisma) => {
  if (!userId) return null;
  const user = await client.user.findUnique({ where: { id: userId }, select: userSummarySelect });
  if (!user) throw notFound("Assigned auditor not found.");
  if (user.status !== RecordStatus.ACTIVE) throw badRequest("Assigned auditor is inactive.");
  if (!assignableAuditRoles.includes(user.role)) {
    throw badRequest("Assigned auditor must be an admin, manager, or auditor.");
  }
  return user;
};

const getAuditOrThrow = async (id: string, actor: Express.User, client: DbClient = prisma) => {
  const audit = await client.audit.findUnique({ where: { id }, include: auditInclude });
  if (!audit) throw notFound("Audit not found.");
  assertAuditReadable(audit, actor);
  return audit;
};

const buildAuditWhere = (query: Record<string, unknown>, actor: Express.User): Prisma.AuditWhereInput => {
  const clauses: Prisma.AuditWhereInput[] = [];
  if (query.status) clauses.push({ status: query.status as AuditStatus });
  if (query.departmentId) clauses.push({ departmentId: String(query.departmentId) });
  if (query.assignedAuditorId) clauses.push({ assignedAuditorId: String(query.assignedAuditorId) });
  if (query.assetId) clauses.push({ records: { some: { assetId: String(query.assetId) } } });
  if (query.result) clauses.push({ records: { some: { result: query.result as AuditResult } } });
  if (query.from || query.to) {
    clauses.push({
      createdAt: {
        gte: query.from ? new Date(String(query.from)) : undefined,
        lte: query.to ? new Date(String(query.to)) : undefined
      }
    });
  }
  if (query.search) {
    const search = String(query.search);
    clauses.push({
      OR: [
        { title: textContains(search) },
        { description: textContains(search) },
        { department: { name: textContains(search) } },
        { records: { some: { asset: { name: textContains(search) } } } },
        { records: { some: { asset: { assetCode: textContains(search) } } } }
      ]
    });
  }

  const scopedWhere =
    actor.role === Role.MANAGER
      ? {
          OR: [{ departmentId: actor.departmentId }, { records: { some: { asset: { departmentId: actor.departmentId } } } }]
        }
      : actor.role === Role.EMPLOYEE
        ? { records: { some: { asset: { allocations: { some: { userId: actor.id, status: AllocationStatus.ACTIVE } } } } } }
        : {};

  return andWhere(...clauses, scopedWhere);
};

const buildOrderBy = (query: Record<string, unknown>): Prisma.AuditOrderByWithRelationInput => {
  const sortBy = String(query.sortBy ?? "createdAt");
  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";
  return { [sortBy]: sortOrder };
};

const resolveScopedAssets = async (
  data: { assetIds?: string[]; departmentId?: string | null },
  actor: Express.User,
  client: DbClient
) => {
  const managerDepartmentId = actor.role === Role.MANAGER ? actor.departmentId : undefined;
  const departmentId = managerDepartmentId ?? data.departmentId ?? undefined;

  if (actor.role === Role.MANAGER && data.departmentId && data.departmentId !== actor.departmentId) {
    throw forbidden("Managers can only create audits for their assigned department.");
  }

  const where: Prisma.AssetWhereInput = data.assetIds?.length
    ? { id: { in: data.assetIds } }
    : departmentId
      ? { departmentId }
      : {};

  const assets = await client.asset.findMany({ where, select: assetSummarySelect, orderBy: { createdAt: "desc" } });
  if (data.assetIds?.length && assets.length !== new Set(data.assetIds).size) {
    throw notFound("One or more audit assets were not found.");
  }
  if (actor.role === Role.MANAGER && assets.some((asset) => asset.departmentId !== actor.departmentId)) {
    throw forbidden("Managers can only audit assets in their assigned department.");
  }
  if (assets.length === 0) throw badRequest("Audit scope must include at least one asset.");

  return assets;
};

const createAuditRecordsForAssets = async (
  auditId: string,
  assets: Array<Prisma.AssetGetPayload<{ select: typeof assetSummarySelect }>>,
  client: DbClient
) => {
  await Promise.all(
    assets.map((asset) =>
      client.auditRecord.create({
        data: {
          auditId,
          assetId: asset.id,
          expectedLocation: asset.location,
          expectedDepartmentId: asset.departmentId,
          expectedCondition: asset.condition,
          expectedAllocationUserId: asset.allocations[0]?.userId
        }
      })
    )
  );
};

const createDiscrepancies = async (
  audit: AuditPayload,
  record: AuditRecordPayload,
  data: {
    result: AuditResult;
    locationVerified?: string;
    departmentVerifiedId?: string;
    conditionVerified?: AssetCondition;
    allocationUserVerifiedId?: string | null;
  },
  client: DbClient
) => {
  const discrepancies: Array<{ type: AuditDiscrepancyType; message: string; severity?: string }> = [];
  const assetLabel = `${record.asset.assetCode} ${record.asset.name}`;

  if (data.result === AuditResult.MISSING) {
    discrepancies.push({ type: AuditDiscrepancyType.MISSING_ASSET, message: `${assetLabel} was marked missing.`, severity: "critical" });
  }
  if (data.result === AuditResult.DAMAGED || data.conditionVerified === AssetCondition.DAMAGED) {
    discrepancies.push({ type: AuditDiscrepancyType.DAMAGED_ASSET, message: `${assetLabel} was marked damaged.`, severity: "critical" });
  }
  if (data.result === AuditResult.MISPLACED) {
    discrepancies.push({ type: AuditDiscrepancyType.WRONG_LOCATION, message: `${assetLabel} was marked misplaced.` });
  }
  if (data.locationVerified && record.expectedLocation && data.locationVerified !== record.expectedLocation) {
    discrepancies.push({
      type: AuditDiscrepancyType.WRONG_LOCATION,
      message: `${assetLabel} expected location ${record.expectedLocation}, found at ${data.locationVerified}.`
    });
  }
  if (data.departmentVerifiedId && record.expectedDepartmentId && data.departmentVerifiedId !== record.expectedDepartmentId) {
    discrepancies.push({
      type: AuditDiscrepancyType.UNEXPECTED_DEPARTMENT,
      message: `${assetLabel} was found in an unexpected department.`
    });
  }
  if (
    data.allocationUserVerifiedId !== undefined &&
    (data.allocationUserVerifiedId ?? null) !== (record.expectedAllocationUserId ?? null)
  ) {
    discrepancies.push({
      type: AuditDiscrepancyType.UNEXPECTED_ALLOCATION,
      message: `${assetLabel} allocation did not match the audit snapshot.`
    });
  }
  if (!data.conditionVerified && data.result !== AuditResult.VERIFIED) {
    discrepancies.push({
      type: AuditDiscrepancyType.UNKNOWN_ASSET_CONDITION,
      message: `${assetLabel} condition could not be confirmed.`
    });
  }

  const created = await Promise.all(
    discrepancies.map((discrepancy) =>
      client.auditDiscrepancy.create({
        data: {
          auditId: audit.id,
          auditRecordId: record.id,
          assetId: record.assetId,
          type: discrepancy.type,
          message: discrepancy.message,
          severity: discrepancy.severity ?? "warning"
        }
      })
    )
  );

  if (created.length > 0) {
    await createAuditLog(
      {
        actorId: null,
        entityType: "Audit",
        entityId: audit.id,
        action: "discrepancy_generation",
        metadata: { auditRecordId: record.id, assetId: record.assetId, count: created.length }
      },
      client
    );
  }

  return created;
};

const notifyAuditParticipants = async (
  audit: Pick<AuditPayload, "id" | "title" | "createdById" | "assignedAuditorId">,
  type: string,
  title: string,
  message: string,
  client: DbClient
) => {
  const userIds = new Set([audit.createdById, audit.assignedAuditorId].filter(Boolean) as string[]);
  await Promise.all(
    [...userIds].map((userId) =>
      notify(
        {
          userId,
          type,
          title,
          message,
          auditId: audit.id
        },
        client
      )
    )
  );
};

export const listAudits = async (query: Record<string, unknown>, actor: Express.User) => {
  const { page, limit, skip } = getPagination(query);
  const where = buildAuditWhere(query, actor);

  const [items, total] = await Promise.all([
    prisma.audit.findMany({
      where,
      include: auditInclude,
      orderBy: buildOrderBy(query),
      skip,
      take: limit
    }),
    prisma.audit.count({ where })
  ]);

  return paginated(items.map(formatAudit), total, page, limit);
};

export const getAudit = async (id: string, actor: Express.User) => {
  const audit = await getAuditOrThrow(id, actor);
  return formatAudit(audit);
};

export const createLegacyAuditRecord = async (
  data: { assetId: string; result: AuditResult; remarks?: string },
  actor: Express.User
) => {
  return prisma.$transaction(async (tx) => {
    const asset = await tx.asset.findUnique({ where: { id: data.assetId } });
    if (!asset) throw notFound("Asset not found.");
    if (actor.role === Role.AUDITOR && asset.status === AssetStatus.RETIRED) {
      throw forbidden("Retired assets cannot be audited by auditor role.");
    }

    const now = new Date();
    const record = await tx.auditRecord.create({
      data: {
        assetId: data.assetId,
        auditorId: actor.id,
        result: data.result,
        remarks: data.remarks,
        verifiedAt: now,
        auditedAt: now,
        expectedLocation: asset.location,
        expectedDepartmentId: asset.departmentId,
        expectedCondition: asset.condition
      },
      include: auditRecordInclude
    });

    if (data.result === AuditResult.MISSING) {
      await tx.asset.update({ where: { id: data.assetId }, data: { status: AssetStatus.LOST } });
    }
    if (data.result === AuditResult.DAMAGED) {
      await tx.asset.update({ where: { id: data.assetId }, data: { condition: AssetCondition.DAMAGED } });
    }
    if (data.result === AuditResult.RETIRED) {
      await tx.asset.update({ where: { id: data.assetId }, data: { status: AssetStatus.RETIRED } });
    }

    await createAuditLog(
      {
        actorId: actor.id,
        entityType: "AuditRecord",
        entityId: record.id,
        action: "created",
        metadata: { assetId: data.assetId, result: data.result, legacy: true }
      },
      tx
    );

    return formatAuditRecord(record);
  });
};

export const createAudit = async (
  data: {
    assetId?: string;
    result?: AuditResult;
    remarks?: string;
    title?: string;
    name?: string;
    description?: string;
    departmentId?: string;
    assignedAuditorId?: string;
    assetIds?: string[];
    plannedStart?: string;
    plannedEnd?: string;
  },
  actor: Express.User
) => {
  if (data.assetId && data.result) {
    return createLegacyAuditRecord({ assetId: data.assetId, result: data.result, remarks: data.remarks }, actor);
  }

  if (actor.role === Role.EMPLOYEE) throw forbidden("Employees cannot create audits.");
  if (data.plannedStart && data.plannedEnd && new Date(data.plannedEnd) <= new Date(data.plannedStart)) {
    throw badRequest("plannedEnd must be after plannedStart.");
  }

  return prisma.$transaction(async (tx) => {
    const assignedAuditor = await assertActiveUser(data.assignedAuditorId, tx);
    const assets = await resolveScopedAssets({ assetIds: data.assetIds, departmentId: data.departmentId }, actor, tx);
    const auditDepartmentId =
      actor.role === Role.MANAGER ? actor.departmentId : data.departmentId ?? assets[0]?.departmentId ?? null;

    const audit = await tx.audit.create({
      data: {
        title: data.title ?? data.name ?? "Asset Audit",
        description: data.description,
        departmentId: auditDepartmentId,
        assignedAuditorId: assignedAuditor?.id,
        createdById: actor.id,
        plannedStart: data.plannedStart ? new Date(data.plannedStart) : undefined,
        plannedEnd: data.plannedEnd ? new Date(data.plannedEnd) : undefined
      }
    });

    await createAuditRecordsForAssets(audit.id, assets, tx);

    const created = await tx.audit.findUnique({ where: { id: audit.id }, include: auditInclude });
    if (!created) throw notFound("Audit not found after creation.");

    await createAuditLog(
      {
        actorId: actor.id,
        entityType: "Audit",
        entityId: audit.id,
        action: "created",
        metadata: { assetCount: assets.length, departmentId: auditDepartmentId }
      },
      tx
    );

    await notifyAuditParticipants(
      created,
      "AUDIT_CREATED",
      "Audit created",
      `${created.title} was created with ${assets.length} assets.`,
      tx
    );

    return formatAudit(created);
  });
};

export const updateAudit = async (
  id: string,
  data: {
    title?: string;
    name?: string;
    description?: string | null;
    departmentId?: string | null;
    assignedAuditorId?: string | null;
    assetIds?: string[];
    plannedStart?: string | null;
    plannedEnd?: string | null;
  },
  actor: Express.User
) => {
  return prisma.$transaction(async (tx) => {
    const audit = await getAuditOrThrow(id, actor, tx);
    assertAuditManageable(audit, actor);
    if (audit.status !== AuditStatus.PLANNED) throw conflict("Only planned audits can be updated.");

    const assignedAuditor =
      data.assignedAuditorId === undefined ? undefined : await assertActiveUser(data.assignedAuditorId, tx);
    const assets = data.assetIds ? await resolveScopedAssets({ assetIds: data.assetIds, departmentId: data.departmentId }, actor, tx) : null;

    if (assets) {
      await tx.auditDiscrepancy.deleteMany({ where: { auditId: id } });
      await tx.auditRecord.deleteMany({ where: { auditId: id } });
      await createAuditRecordsForAssets(id, assets, tx);
    }

    const updated = await tx.audit.update({
      where: { id },
      data: {
        title: data.title ?? data.name,
        description: data.description === undefined ? undefined : data.description,
        departmentId: data.departmentId === undefined ? undefined : data.departmentId,
        assignedAuditorId: data.assignedAuditorId === undefined ? undefined : assignedAuditor?.id ?? null,
        plannedStart:
          data.plannedStart === undefined ? undefined : data.plannedStart === null ? null : new Date(data.plannedStart),
        plannedEnd:
          data.plannedEnd === undefined ? undefined : data.plannedEnd === null ? null : new Date(data.plannedEnd)
      },
      include: auditInclude
    });

    await createAuditLog({
      actorId: actor.id,
      entityType: "Audit",
      entityId: id,
      action: "updated",
      metadata: { ...data, assetCount: assets?.length }
    }, tx);

    return formatAudit(updated);
  });
};

export const deleteAudit = async (id: string, actor: Express.User) => {
  return prisma.$transaction(async (tx) => {
    const audit = await getAuditOrThrow(id, actor, tx);
    assertAuditManageable(audit, actor);
    if (audit.status !== AuditStatus.PLANNED) throw conflict("Only planned audits can be deleted.");

    await tx.audit.delete({ where: { id } });
    await createAuditLog(
      {
        actorId: actor.id,
        entityType: "Audit",
        entityId: id,
        action: "deleted",
        metadata: { title: audit.title }
      },
      tx
    );

    return formatAudit(audit);
  });
};

export const startAudit = async (id: string, actor: Express.User) => {
  return prisma.$transaction(async (tx) => {
    const audit = await getAuditOrThrow(id, actor, tx);
    assertAuditManageable(audit, actor);
    if (audit.status !== AuditStatus.PLANNED) throw conflict("Only planned audits can be started.");

    const updated = await tx.audit.update({
      where: { id },
      data: { status: AuditStatus.ACTIVE, startedAt: new Date() },
      include: auditInclude
    });

    await createAuditLog(
      { actorId: actor.id, entityType: "Audit", entityId: id, action: "started", metadata: { status: AuditStatus.ACTIVE } },
      tx
    );
    await notifyAuditParticipants(updated, "AUDIT_STARTED", "Audit started", `${updated.title} has started.`, tx);

    return formatAudit(updated);
  });
};

export const verifyAuditAsset = async (
  id: string,
  data: {
    assetId: string;
    result: AuditResult;
    remarks?: string;
    locationVerified?: string;
    conditionVerified?: AssetCondition;
    departmentVerifiedId?: string;
    allocationUserVerifiedId?: string | null;
  },
  actor: Express.User
) => {
  return prisma.$transaction(async (tx) => {
    const audit = await getAuditOrThrow(id, actor, tx);
    if (audit.status === AuditStatus.CLOSED) throw conflict("Closed audits cannot be modified.");
    if (audit.status === AuditStatus.COMPLETED) throw conflict("Completed audits cannot be verified.");
    if (!activeAuditStatuses.includes(audit.status)) throw conflict("Audit must be active before assets can be verified.");

    const record = audit.records.find((item) => item.assetId === data.assetId);
    if (!record) throw conflict("Asset is outside this audit scope.");
    assertCanVerifyRecord(audit, record, actor);
    if (record.result) throw conflict("Asset has already been verified in this audit.");

    if (data.departmentVerifiedId) {
      const department = await tx.department.findUnique({ where: { id: data.departmentVerifiedId }, select: { id: true } });
      if (!department) throw notFound("Verified department not found.");
    }
    if (data.allocationUserVerifiedId) {
      const user = await tx.user.findUnique({ where: { id: data.allocationUserVerifiedId }, select: { id: true } });
      if (!user) throw notFound("Verified allocation user not found.");
    }

    const now = new Date();
    const updatedRecord = await tx.auditRecord.update({
      where: { id: record.id },
      data: {
        auditorId: actor.id,
        result: data.result,
        remarks: data.remarks,
        locationVerified: data.locationVerified,
        conditionVerified: data.conditionVerified,
        departmentVerifiedId: data.departmentVerifiedId,
        allocationUserVerifiedId: data.allocationUserVerifiedId,
        verifiedAt: now,
        auditedAt: now
      },
      include: auditRecordInclude
    });

    if (audit.status === AuditStatus.ACTIVE) {
      await tx.audit.update({ where: { id }, data: { status: AuditStatus.IN_PROGRESS } });
    }

    if (data.result === AuditResult.MISSING) {
      await tx.asset.update({ where: { id: data.assetId }, data: { status: AssetStatus.LOST } });
    }
    if (data.result === AuditResult.DAMAGED || data.conditionVerified === AssetCondition.DAMAGED) {
      await tx.asset.update({ where: { id: data.assetId }, data: { condition: AssetCondition.DAMAGED } });
    }
    if (data.result === AuditResult.RETIRED) {
      await tx.asset.update({ where: { id: data.assetId }, data: { status: AssetStatus.RETIRED } });
    }

    const discrepancies = await createDiscrepancies(audit, record, data, tx);

    await createAuditLog(
      {
        actorId: actor.id,
        entityType: "Audit",
        entityId: id,
        action: "verified",
        metadata: { auditRecordId: record.id, assetId: data.assetId, result: data.result, discrepancies: discrepancies.length }
      },
      tx
    );

    if (flaggedAuditResults.includes(data.result)) {
      await notifyAuditParticipants(
        audit,
        data.result === AuditResult.MISSING ? "AUDIT_ASSET_MISSING" : "AUDIT_ASSET_DAMAGED",
        data.result === AuditResult.MISSING ? "Asset flagged missing" : "Asset flagged damaged",
        `${record.asset.name} was flagged as ${data.result.toLowerCase()} during ${audit.title}.`,
        tx
      );
    }

    return formatAuditRecord(updatedRecord);
  });
};

export const completeAudit = async (id: string, actor: Express.User) => {
  return prisma.$transaction(async (tx) => {
    const audit = await getAuditOrThrow(id, actor, tx);
    assertAuditManageable(audit, actor);
    if (!activeAuditStatuses.includes(audit.status)) {
      throw conflict("Only active audits can be completed.");
    }
    const pending = audit.records.filter((record) => !record.result);
    if (pending.length > 0) throw conflict("Audit cannot be completed until every assigned asset is reviewed.");

    const updated = await tx.audit.update({
      where: { id },
      data: { status: AuditStatus.COMPLETED, completedAt: new Date() },
      include: auditInclude
    });

    await createAuditLog(
      { actorId: actor.id, entityType: "Audit", entityId: id, action: "completed", metadata: { assets: audit.records.length } },
      tx
    );
    await notifyAuditParticipants(updated, "AUDIT_COMPLETED", "Audit completed", `${updated.title} has been completed.`, tx);

    return formatAudit(updated);
  });
};

export const closeAudit = async (id: string, actor: Express.User) => {
  return prisma.$transaction(async (tx) => {
    const audit = await getAuditOrThrow(id, actor, tx);
    assertAuditManageable(audit, actor);
    if (audit.status !== AuditStatus.COMPLETED) throw conflict("Only completed audits can be closed.");

    const updated = await tx.audit.update({
      where: { id },
      data: { status: AuditStatus.CLOSED, closedAt: new Date() },
      include: auditInclude
    });

    await createAuditLog({ actorId: actor.id, entityType: "Audit", entityId: id, action: "closed" }, tx);
    await notifyAuditParticipants(updated, "AUDIT_CLOSED", "Audit closed", `${updated.title} has been closed.`, tx);

    return formatAudit(updated);
  });
};

export const listAuditDiscrepancies = async (id: string, query: Record<string, unknown>, actor: Express.User) => {
  const audit = await getAuditOrThrow(id, actor);
  const { page, limit, skip } = getPagination(query);

  const [items, total] = await Promise.all([
    prisma.auditDiscrepancy.findMany({
      where: { auditId: audit.id },
      include: {
        asset: { select: assetSummarySelect },
        auditRecord: { include: auditRecordInclude }
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    }),
    prisma.auditDiscrepancy.count({ where: { auditId: audit.id } })
  ]);

  return paginated(
    items.map((item) => ({
      ...item,
      asset: formatAsset(item.asset),
      auditRecord: item.auditRecord ? formatAuditRecord(item.auditRecord) : null
    })),
    total,
    page,
    limit
  );
};

export const listAuditRecords = async (query: Record<string, unknown>, actor?: Express.User) => {
  const { page, limit, skip } = getPagination(query);
  const where: Prisma.AuditRecordWhereInput = {};
  if (query.assetId) where.assetId = String(query.assetId);
  if (query.result || query.status) where.result = (query.result ?? query.status) as AuditResult;
  if (query.auditId) where.auditId = String(query.auditId);

  if (actor?.role === Role.MANAGER) where.asset = { departmentId: actor.departmentId };
  if (actor?.role === Role.EMPLOYEE) {
    where.asset = { allocations: { some: { userId: actor.id, status: AllocationStatus.ACTIVE } } };
  }

  const [items, total] = await Promise.all([
    prisma.auditRecord.findMany({
      where,
      include: auditRecordInclude,
      orderBy: { auditedAt: "desc" },
      skip,
      take: limit
    }),
    prisma.auditRecord.count({ where })
  ]);

  return paginated(items.map(formatAuditRecord), total, page, limit);
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

export const getAuditReport = async (query: Record<string, unknown>, actor: Express.User) => {
  const where = buildAuditWhere(query, actor);

  const audits = await prisma.audit.findMany({
    where,
    include: auditInclude,
    orderBy: { createdAt: "desc" },
    take: 500
  });
  const records = audits.flatMap((audit) => audit.records);
  const discrepancies = audits.flatMap((audit) => audit.discrepancies);
  const verified = records.filter((record) => record.result);
  const completionPercentage = records.length === 0 ? 0 : Math.round((verified.length / records.length) * 100);

  const verificationStatistics = Object.values(AuditResult).map((result) => ({
    result,
    count: records.filter((record) => record.result === result).length
  }));

  const damageStatistics = {
    damagedAssets: records.filter((record) => record.result === AuditResult.DAMAGED).length,
    missingAssets: records.filter((record) => record.result === AuditResult.MISSING).length,
    unreachableAssets: records.filter((record) => record.result === AuditResult.UNREACHABLE).length
  };

  const departmentMap = new Map<string, { department: unknown; total: number; verified: number; discrepancies: number }>();
  for (const record of records) {
    const key = record.asset.departmentId ?? "unassigned";
    const current = departmentMap.get(key) ?? {
      department: record.asset.department ?? null,
      total: 0,
      verified: 0,
      discrepancies: 0
    };
    current.total += 1;
    if (record.result) current.verified += 1;
    current.discrepancies += record.discrepancies.length;
    departmentMap.set(key, current);
  }

  const departmentCompliance = [...departmentMap.values()].map((entry) => ({
    ...entry,
    completionPercentage: entry.total === 0 ? 0 : Math.round((entry.verified / entry.total) * 100)
  }));

  const discrepancySummary = Object.values(AuditDiscrepancyType).map((type) => ({
    type,
    count: discrepancies.filter((item) => item.type === type).length
  }));

  return {
    auditCount: audits.length,
    activeAudits: audits.filter((audit) => activeAuditStatuses.includes(audit.status)).length,
    completedAudits: audits.filter((audit) => closedAuditStatuses.includes(audit.status)).length,
    assignedAssets: records.length,
    assetsVerified: verified.length,
    pendingVerification: Math.max(0, records.length - verified.length),
    completionPercentage,
    departmentCompliance,
    verificationStatistics,
    damageStatistics,
    missingAssets: records
      .filter((record) => record.result === AuditResult.MISSING)
      .map((record) => ({ auditRecordId: record.id, asset: formatAsset(record.asset), remarks: record.remarks })),
    discrepancySummary,
    discrepanciesFound: discrepancies.length
  };
};

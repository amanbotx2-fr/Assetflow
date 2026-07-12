import {
  AllocationStatus,
  AssetCondition,
  AssetStatus,
  AuditResult,
  BookingStatus,
  MaintenancePriority,
  MaintenanceStatus,
  Prisma,
  Role
} from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { getAuditReport } from "./auditService.js";
import { getBookingStatistics } from "./bookingService.js";
import { getMaintenanceStatistics } from "./maintenanceService.js";
import { forbidden } from "../utils/httpError.js";
import { getPagination, paginated } from "../utils/pagination.js";

type Query = Record<string, unknown>;
type CountEntry = { label: string; count: number };

const activeBookingStatuses: BookingStatus[] = [BookingStatus.APPROVED, BookingStatus.ACTIVE];
const activeMaintenanceStatuses: MaintenanceStatus[] = [
  MaintenanceStatus.REQUESTED,
  MaintenanceStatus.OPEN,
  MaintenanceStatus.APPROVED,
  MaintenanceStatus.ASSIGNED,
  MaintenanceStatus.IN_PROGRESS,
  MaintenanceStatus.RESOLVED
];
const upcomingMaintenanceStatuses: MaintenanceStatus[] = [MaintenanceStatus.APPROVED, MaintenanceStatus.ASSIGNED];
const terminalAssetStatuses: AssetStatus[] = [AssetStatus.RETIRED, AssetStatus.LOST];

const userSummarySelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  departmentId: true
} satisfies Prisma.UserSelect;

const departmentSummarySelect = {
  id: true,
  name: true,
  code: true,
  status: true
} satisfies Prisma.DepartmentSelect;

const categorySummarySelect = {
  id: true,
  name: true,
  code: true
} satisfies Prisma.CategorySelect;

const assetReportSelect = {
  id: true,
  assetCode: true,
  serialNumber: true,
  name: true,
  status: true,
  condition: true,
  location: true,
  purchaseDate: true,
  purchaseValue: true,
  warrantyExpiry: true,
  isBookable: true,
  categoryId: true,
  departmentId: true,
  createdAt: true,
  updatedAt: true,
  category: { select: categorySummarySelect },
  department: { select: departmentSummarySelect },
  allocations: {
    where: { status: AllocationStatus.ACTIVE },
    include: { user: { select: userSummarySelect }, department: { select: departmentSummarySelect } },
    take: 1
  }
} satisfies Prisma.AssetSelect;

const hasWhere = (where: object) => Object.keys(where).length > 0;

const andAssetWhere = (...clauses: Prisma.AssetWhereInput[]): Prisma.AssetWhereInput => {
  const activeClauses = clauses.filter(hasWhere);
  if (activeClauses.length === 0) return {};
  if (activeClauses.length === 1) return activeClauses[0];
  return { AND: activeClauses };
};

const andBookingWhere = (...clauses: Prisma.BookingWhereInput[]): Prisma.BookingWhereInput => {
  const activeClauses = clauses.filter(hasWhere);
  if (activeClauses.length === 0) return {};
  if (activeClauses.length === 1) return activeClauses[0];
  return { AND: activeClauses };
};

const andMaintenanceWhere = (...clauses: Prisma.MaintenanceTicketWhereInput[]): Prisma.MaintenanceTicketWhereInput => {
  const activeClauses = clauses.filter(hasWhere);
  if (activeClauses.length === 0) return {};
  if (activeClauses.length === 1) return activeClauses[0];
  return { AND: activeClauses };
};

const andAllocationWhere = (...clauses: Prisma.AllocationWhereInput[]): Prisma.AllocationWhereInput => {
  const activeClauses = clauses.filter(hasWhere);
  if (activeClauses.length === 0) return {};
  if (activeClauses.length === 1) return activeClauses[0];
  return { AND: activeClauses };
};

const getScopedDepartmentId = (actor: Express.User, query: Query) => {
  const requestedDepartmentId = query.departmentId as string | undefined;

  if (actor.role === Role.MANAGER) {
    if (!actor.departmentId) throw forbidden("Managers must be assigned to a department to view reports.");
    if (requestedDepartmentId && requestedDepartmentId !== actor.departmentId) {
      throw forbidden("Managers can only access reports for their assigned department.");
    }
    return actor.departmentId;
  }

  if (actor.role === Role.EMPLOYEE && requestedDepartmentId) {
    throw forbidden("Employees cannot filter reports by department.");
  }

  return requestedDepartmentId;
};

const getDateRange = (query: Query, fallbackDays = 30) => {
  const to = query.to ? new Date(String(query.to)) : new Date();
  const from = query.from ? new Date(String(query.from)) : new Date(to);
  if (!query.from) from.setUTCDate(from.getUTCDate() - (fallbackDays - 1));
  from.setUTCHours(0, 0, 0, 0);
  to.setUTCHours(23, 59, 59, 999);
  return { from, to };
};

const dayKey = (date: Date) => date.toISOString().slice(0, 10);

const dateLabels = (from: Date, to: Date) => {
  const labels: string[] = [];
  const cursor = new Date(from);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setUTCHours(0, 0, 0, 0);

  while (cursor <= end) {
    labels.push(dayKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return labels;
};

const round = (value: number, precision = 2) => Number(value.toFixed(precision));

const chartFromCounts = (datasetLabel: string, counts: CountEntry[], fixedLabels?: string[]) => {
  const labels = fixedLabels ?? counts.map((entry) => entry.label);
  const countMap = new Map(counts.map((entry) => [entry.label, entry.count]));
  const data = labels.map((label) => countMap.get(label) ?? 0);
  const total = data.reduce((sum, value) => sum + value, 0);

  return {
    labels,
    datasets: [{ label: datasetLabel, data }],
    totals: { [datasetLabel]: total },
    percentages: Object.fromEntries(labels.map((label, index) => [label, total === 0 ? 0 : round((data[index] / total) * 100)]))
  };
};

const trendChart = <T>(label: string, labels: string[], items: T[], getDate: (item: T) => Date) => {
  const counts = new Map(labels.map((item) => [item, 0]));
  for (const item of items) {
    const key = dayKey(getDate(item));
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const data = labels.map((item) => counts.get(item) ?? 0);
  return {
    labels,
    datasets: [{ label, data }],
    totals: { [label]: data.reduce((sum, value) => sum + value, 0) }
  };
};

const assetOwnershipWhere = (actor: Express.User): Prisma.AssetWhereInput =>
  actor.role === Role.EMPLOYEE
    ? {
        OR: [
          { allocations: { some: { userId: actor.id } } },
          { bookings: { some: { requestedById: actor.id } } },
          { maintenanceTickets: { some: { OR: [{ reportedById: actor.id }, { assignedToId: actor.id }] } } }
        ]
      }
    : {};

const buildAssetWhere = (query: Query, actor: Express.User): Prisma.AssetWhereInput => {
  const departmentId = getScopedDepartmentId(actor, query);
  const clauses: Prisma.AssetWhereInput[] = [];

  if (departmentId) clauses.push({ departmentId });
  if (query.status) clauses.push({ status: query.status as AssetStatus });
  if (query.categoryId) clauses.push({ categoryId: String(query.categoryId) });
  clauses.push(assetOwnershipWhere(actor));

  return andAssetWhere(...clauses);
};

const buildBookingWhere = (query: Query, actor: Express.User): Prisma.BookingWhereInput => {
  const departmentId = getScopedDepartmentId(actor, query);
  const { from, to } = getDateRange(query);
  const clauses: Prisma.BookingWhereInput[] = [{ startTime: { gte: from, lte: to } }];

  if (departmentId) clauses.push({ asset: { departmentId } });
  if (query.assetId) clauses.push({ assetId: String(query.assetId) });
  if (query.status) clauses.push({ status: query.status as BookingStatus });
  if (actor.role === Role.EMPLOYEE) clauses.push({ requestedById: actor.id });

  return andBookingWhere(...clauses);
};

const buildMaintenanceWhere = (query: Query, actor: Express.User): Prisma.MaintenanceTicketWhereInput => {
  const departmentId = getScopedDepartmentId(actor, query);
  const { from, to } = getDateRange(query);
  const clauses: Prisma.MaintenanceTicketWhereInput[] = [{ reportedAt: { gte: from, lte: to } }];

  if (departmentId) clauses.push({ asset: { departmentId } });
  if (query.assetId) clauses.push({ assetId: String(query.assetId) });
  if (query.status) clauses.push({ status: query.status as MaintenanceStatus });
  if (query.priority) clauses.push({ priority: query.priority as MaintenancePriority });
  if (actor.role === Role.EMPLOYEE) clauses.push({ OR: [{ reportedById: actor.id }, { assignedToId: actor.id }] });

  return andMaintenanceWhere(...clauses);
};

const buildAllocationWhere = (query: Query, actor: Express.User): Prisma.AllocationWhereInput => {
  const departmentId = getScopedDepartmentId(actor, query);
  const { from, to } = getDateRange(query);
  const clauses: Prisma.AllocationWhereInput[] = [{ assignedAt: { gte: from, lte: to } }];

  if (departmentId) clauses.push({ OR: [{ departmentId }, { asset: { departmentId } }] });
  if (query.assetId) clauses.push({ assetId: String(query.assetId) });
  if (actor.role === Role.EMPLOYEE) clauses.push({ userId: actor.id });

  return andAllocationWhere(...clauses);
};

const buildAuditRecordWhere = (query: Query, actor: Express.User): Prisma.AuditRecordWhereInput => {
  const departmentId = getScopedDepartmentId(actor, query);
  const { from, to } = getDateRange(query);
  const clauses: Prisma.AuditRecordWhereInput[] = [{ auditedAt: { gte: from, lte: to } }];

  if (departmentId) clauses.push({ asset: { departmentId } });
  if (actor.role === Role.EMPLOYEE) {
    clauses.push({ asset: { allocations: { some: { userId: actor.id, status: AllocationStatus.ACTIVE } } } });
  }

  const activeClauses = clauses.filter(hasWhere);
  if (activeClauses.length === 0) return {};
  if (activeClauses.length === 1) return activeClauses[0];
  return { AND: activeClauses };
};

const formatAsset = (asset: Prisma.AssetGetPayload<{ select: typeof assetReportSelect }>) => ({
  ...asset,
  assetTag: asset.assetCode,
  currentAllocation: asset.allocations[0] ?? null
});

const statusCounts = async (where: Prisma.AssetWhereInput) => {
  const grouped = await prisma.asset.groupBy({ by: ["status"], where, _count: { status: true } });
  return grouped.map((entry) => ({ label: entry.status, count: entry._count.status }));
};

const conditionCounts = async (where: Prisma.AssetWhereInput) => {
  const grouped = await prisma.asset.groupBy({ by: ["condition"], where, _count: { condition: true } });
  return grouped.map((entry) => ({ label: entry.condition, count: entry._count.condition }));
};

const upcomingMaintenance = async (query: Query, actor: Express.User, take = 5) => {
  const where = andMaintenanceWhere(buildMaintenanceWhere(query, actor), { status: { in: upcomingMaintenanceStatuses } });
  const tickets = await prisma.maintenanceTicket.findMany({
    where,
    include: {
      asset: { select: assetReportSelect },
      reportedBy: { select: userSummarySelect },
      assignedTo: { select: userSummarySelect }
    },
    orderBy: [{ assignedAt: "asc" }, { reportedAt: "asc" }],
    take
  });

  return tickets.map((ticket) => ({
    id: ticket.id,
    status: ticket.status,
    priority: ticket.priority,
    issueSummary: ticket.issueSummary,
    reportedAt: ticket.reportedAt,
    assignedAt: ticket.assignedAt,
    asset: formatAsset(ticket.asset),
    reportedBy: ticket.reportedBy,
    assignedTechnician: ticket.assignedTo
  }));
};

export const getSummaryReport = async (query: Query, actor: Express.User) => {
  const assetWhere = buildAssetWhere(query, actor);
  const bookingWhere = buildBookingWhere(query, actor);
  const maintenanceWhere = buildMaintenanceWhere(query, actor);
  const allocationWhere = buildAllocationWhere(query, actor);

  const [totalAssets, available, allocated, maintenance, lost, activeAllocations, pendingTransfers, pendingBookings, openMaintenance] =
    await Promise.all([
      prisma.asset.count({ where: assetWhere }),
      prisma.asset.count({ where: andAssetWhere(assetWhere, { status: AssetStatus.AVAILABLE }) }),
      prisma.asset.count({ where: andAssetWhere(assetWhere, { status: AssetStatus.ALLOCATED }) }),
      prisma.asset.count({ where: andAssetWhere(assetWhere, { status: AssetStatus.MAINTENANCE }) }),
      prisma.asset.count({ where: andAssetWhere(assetWhere, { status: AssetStatus.LOST }) }),
      prisma.allocation.count({ where: andAllocationWhere(allocationWhere, { status: AllocationStatus.ACTIVE }) }),
      prisma.transfer.count({
        where:
          actor.role === Role.EMPLOYEE
            ? { status: "PENDING", OR: [{ requestedById: actor.id }, { fromUserId: actor.id }, { toUserId: actor.id }] }
            : { status: "PENDING", asset: assetWhere }
      }),
      prisma.booking.count({ where: andBookingWhere(bookingWhere, { status: { in: [BookingStatus.REQUESTED, BookingStatus.PENDING] } }) }),
      prisma.maintenanceTicket.count({ where: andMaintenanceWhere(maintenanceWhere, { status: { in: activeMaintenanceStatuses } }) })
    ]);

  const byStatus = chartFromCounts("assets", await statusCounts(assetWhere), Object.values(AssetStatus));
  const byCondition = chartFromCounts("assets", await conditionCounts(assetWhere), Object.values(AssetCondition));

  return {
    totalAssets,
    available,
    allocated,
    maintenance,
    lost,
    activeAllocations,
    pendingTransfers,
    pendingBookings,
    openMaintenance,
    charts: {
      byStatus,
      byCondition
    }
  };
};

export const getAssetReport = async (query: Query, actor: Express.User) => {
  const { page, limit, skip } = getPagination(query);
  const where = buildAssetWhere(query, actor);

  const [items, total, statusChart, conditionChart, categoryGroups, categories] = await Promise.all([
    prisma.asset.findMany({
      where,
      select: assetReportSelect,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    }),
    prisma.asset.count({ where }),
    statusCounts(where),
    conditionCounts(where),
    prisma.asset.groupBy({ by: ["categoryId"], where, _count: { categoryId: true } }),
    prisma.category.findMany({ select: categorySummarySelect })
  ]);

  const categoryMap = new Map(categories.map((category) => [category.id, category.name]));
  const categoryCounts = categoryGroups.map((entry) => ({
    label: categoryMap.get(entry.categoryId) ?? "Uncategorized",
    count: entry._count.categoryId
  }));

  return {
    ...paginated(items.map(formatAsset), total, page, limit),
    totals: { totalAssets: total },
    charts: {
      status: chartFromCounts("assets", statusChart, Object.values(AssetStatus)),
      condition: chartFromCounts("assets", conditionChart, Object.values(AssetCondition)),
      category: chartFromCounts("assets", categoryCounts)
    }
  };
};

export const getBookingReport = async (query: Query, actor: Express.User) => {
  getScopedDepartmentId(actor, query);
  const { from, to } = getDateRange(query);
  const labels = dateLabels(from, to);
  const where = buildBookingWhere(query, actor);

  const [statistics, bookings, statusGroups] = await Promise.all([
    getBookingStatistics({ ...query, from: from.toISOString(), to: to.toISOString() }, actor),
    prisma.booking.findMany({
      where,
      select: {
        id: true,
        status: true,
        startTime: true,
        endTime: true,
        asset: { select: { id: true, assetCode: true, name: true, department: { select: departmentSummarySelect } } }
      },
      take: 500
    }),
    prisma.booking.groupBy({ by: ["status"], where, _count: { status: true } })
  ]);

  const bookingHours = bookings.reduce((sum, booking) => sum + Math.max(0, booking.endTime.getTime() - booking.startTime.getTime()), 0) / 36e5;

  return {
    ...statistics,
    dateRange: { from: from.toISOString(), to: to.toISOString() },
    totals: {
      bookingCount: statistics.bookingCount,
      utilizationHours: round(bookingHours)
    },
    charts: {
      trend: trendChart("bookings", labels, bookings, (booking) => booking.startTime),
      status: chartFromCounts(
        "bookings",
        statusGroups.map((entry) => ({ label: entry.status, count: entry._count.status })),
        Object.values(BookingStatus)
      )
    }
  };
};

export const getMaintenanceReport = async (query: Query, actor: Express.User) => {
  getScopedDepartmentId(actor, query);
  const { from, to } = getDateRange(query);
  const labels = dateLabels(from, to);
  const where = buildMaintenanceWhere(query, actor);

  const [statistics, tickets, statusGroups, priorityGroups] = await Promise.all([
    getMaintenanceStatistics({ ...query, from: from.toISOString(), to: to.toISOString() }, actor),
    prisma.maintenanceTicket.findMany({ where, select: { id: true, reportedAt: true, status: true, priority: true }, take: 500 }),
    prisma.maintenanceTicket.groupBy({ by: ["status"], where, _count: { status: true } }),
    prisma.maintenanceTicket.groupBy({ by: ["priority"], where, _count: { priority: true } })
  ]);

  return {
    ...statistics,
    dateRange: { from: from.toISOString(), to: to.toISOString() },
    charts: {
      trend: trendChart("maintenance", labels, tickets, (ticket) => ticket.reportedAt),
      status: chartFromCounts(
        "tickets",
        statusGroups.map((entry) => ({ label: entry.status, count: entry._count.status })),
        Object.values(MaintenanceStatus)
      ),
      priority: chartFromCounts(
        "tickets",
        priorityGroups.map((entry) => ({ label: entry.priority, count: entry._count.priority })),
        Object.values(MaintenancePriority)
      )
    }
  };
};

export const getAuditAnalyticsReport = async (query: Query, actor: Express.User) => {
  const report = await getAuditReport(query, actor);
  return {
    ...report,
    charts: {
      verification: chartFromCounts(
        "assets",
        report.verificationStatistics.map((entry) => ({ label: entry.result, count: entry.count })),
        Object.values(AuditResult)
      ),
      discrepancies: chartFromCounts("discrepancies", report.discrepancySummary.map((entry) => ({ label: entry.type, count: entry.count })))
    }
  };
};

export const getDepartmentUtilizationReport = async (query: Query, actor: Express.User) => {
  const departmentId = getScopedDepartmentId(actor, query);
  const assetWhere = buildAssetWhere(query, actor);
  const bookingWhere = buildBookingWhere(query, actor);

  const [assets, bookings] = await Promise.all([
    prisma.asset.findMany({ where: assetWhere, select: { id: true, status: true, departmentId: true } }),
    prisma.booking.findMany({ where: bookingWhere, select: { id: true, assetId: true, startTime: true, endTime: true, asset: { select: { departmentId: true } } } })
  ]);
  const employeeDepartmentIds =
    actor.role === Role.EMPLOYEE
      ? [
          ...new Set(
            [...assets.map((asset) => asset.departmentId), ...bookings.map((booking) => booking.asset.departmentId)].filter(
              (id): id is string => Boolean(id)
            )
          )
        ]
      : undefined;
  const departments = await prisma.department.findMany({
    where: departmentId ? { id: departmentId } : employeeDepartmentIds ? { id: { in: employeeDepartmentIds } } : {},
    select: departmentSummarySelect,
    orderBy: { name: "asc" }
  });

  const departmentRows = departments.map((department) => {
    const departmentAssets = assets.filter((asset) => asset.departmentId === department.id);
    const departmentBookings = bookings.filter((booking) => booking.asset.departmentId === department.id);
    const allocatedAssets = departmentAssets.filter((asset) => asset.status === AssetStatus.ALLOCATED).length;
    const maintenanceAssets = departmentAssets.filter((asset) => asset.status === AssetStatus.MAINTENANCE).length;
    const bookingHours = departmentBookings.reduce(
      (sum, booking) => sum + Math.max(0, booking.endTime.getTime() - booking.startTime.getTime()),
      0
    );
    const utilizationPercentage =
      departmentAssets.length === 0 ? 0 : round(((allocatedAssets + departmentBookings.length) / departmentAssets.length) * 100);

    return {
      department,
      totalAssets: departmentAssets.length,
      allocatedAssets,
      maintenanceAssets,
      bookingCount: departmentBookings.length,
      bookingHours: round(bookingHours / 36e5),
      utilizationPercentage
    };
  });

  return {
    departmentUtilization: departmentRows,
    charts: {
      utilizationByDepartment: {
        labels: departmentRows.map((row) => row.department.name),
        datasets: [
          { label: "Total Assets", data: departmentRows.map((row) => row.totalAssets) },
          { label: "Allocated Assets", data: departmentRows.map((row) => row.allocatedAssets) },
          { label: "Bookings", data: departmentRows.map((row) => row.bookingCount) }
        ],
        totals: {
          totalAssets: departmentRows.reduce((sum, row) => sum + row.totalAssets, 0),
          allocatedAssets: departmentRows.reduce((sum, row) => sum + row.allocatedAssets, 0),
          bookings: departmentRows.reduce((sum, row) => sum + row.bookingCount, 0)
        },
        percentages: Object.fromEntries(departmentRows.map((row) => [row.department.code, row.utilizationPercentage]))
      }
    }
  };
};

export const getUtilizationReport = async (query: Query, actor: Express.User) => {
  const assetWhere = buildAssetWhere(query, actor);
  const bookingWhere = buildBookingWhere(query, actor);
  const allocationWhere = buildAllocationWhere(query, actor);

  const [totalAssets, allocatedAssets, bookableAssets, activeAllocations, bookingCount, departmentUtilization] = await Promise.all([
    prisma.asset.count({ where: assetWhere }),
    prisma.asset.count({ where: andAssetWhere(assetWhere, { status: AssetStatus.ALLOCATED }) }),
    prisma.asset.count({ where: andAssetWhere(assetWhere, { isBookable: true }) }),
    prisma.allocation.count({ where: andAllocationWhere(allocationWhere, { status: AllocationStatus.ACTIVE }) }),
    prisma.booking.count({ where: bookingWhere }),
    getDepartmentUtilizationReport(query, actor)
  ]);

  return {
    totals: {
      totalAssets,
      allocatedAssets,
      bookableAssets,
      activeAllocations,
      bookingCount,
      assetUtilizationPercentage: totalAssets === 0 ? 0 : round((allocatedAssets / totalAssets) * 100),
      bookingUtilizationPercentage: bookableAssets === 0 ? 0 : round((bookingCount / bookableAssets) * 100)
    },
    charts: {
      utilizationSummary: {
        labels: ["Allocated", "Bookable", "Booked"],
        datasets: [{ label: "resources", data: [allocatedAssets, bookableAssets, bookingCount] }],
        totals: { totalAssets }
      },
      utilizationByDepartment: departmentUtilization.charts.utilizationByDepartment
    }
  };
};

export const getIdleAssetsReport = async (query: Query, actor: Express.User) => {
  const { page, limit, skip } = getPagination(query);
  const where = andAssetWhere(buildAssetWhere(query, actor), {
    status: AssetStatus.AVAILABLE,
    allocations: { none: { status: AllocationStatus.ACTIVE } },
    bookings: { none: { status: { in: activeBookingStatuses } } },
    maintenanceTickets: { none: { status: { in: activeMaintenanceStatuses } } }
  });

  const [assets, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      select: {
        ...assetReportSelect,
        _count: { select: { allocations: true, bookings: true, maintenanceTickets: true, auditRecords: true } }
      },
      orderBy: { updatedAt: "asc" },
      skip,
      take: limit
    }),
    prisma.asset.count({ where })
  ]);

  const now = Date.now();
  const items = assets.map((asset) => ({
    ...formatAsset(asset),
    idleDays: Math.max(0, Math.floor((now - asset.updatedAt.getTime()) / 86400000)),
    activityCounts: asset._count
  }));

  return {
    ...paginated(items, total, page, limit),
    totals: { idleAssets: total }
  };
};

export const getMostUsedAssetsReport = async (query: Query, actor: Express.User) => {
  const { page, limit, skip } = getPagination(query);
  const where = buildAssetWhere(query, actor);

  const assets = await prisma.asset.findMany({
    where,
    select: {
      ...assetReportSelect,
      _count: { select: { allocations: true, bookings: true, maintenanceTickets: true } }
    },
    take: 500
  });

  const ranked = assets
    .map((asset) => ({
      ...formatAsset(asset),
      usage: {
        allocationCount: asset._count.allocations,
        bookingCount: asset._count.bookings,
        maintenanceCount: asset._count.maintenanceTickets,
        totalUsage: asset._count.allocations + asset._count.bookings
      }
    }))
    .sort((first, second) => second.usage.totalUsage - first.usage.totalUsage);

  const items = ranked.slice(skip, skip + limit);

  return {
    ...paginated(items, ranked.length, page, limit),
    charts: {
      mostUsedAssets: {
        labels: items.map((asset) => asset.name),
        datasets: [{ label: "usage", data: items.map((asset) => asset.usage.totalUsage) }],
        totals: { usage: ranked.reduce((sum, asset) => sum + asset.usage.totalUsage, 0) }
      }
    }
  };
};

export const getNearRetirementReport = async (query: Query, actor: Express.User) => {
  const { page, limit, skip } = getPagination(query);
  const now = new Date();
  const warrantyCutoff = new Date(now);
  warrantyCutoff.setUTCDate(warrantyCutoff.getUTCDate() + 90);
  const oldPurchaseCutoff = new Date(now);
  oldPurchaseCutoff.setUTCFullYear(oldPurchaseCutoff.getUTCFullYear() - 4);

  const where = andAssetWhere(buildAssetWhere(query, actor), {
    status: { notIn: terminalAssetStatuses },
    OR: [
      { condition: { in: [AssetCondition.FAIR, AssetCondition.DAMAGED, AssetCondition.UNUSABLE] } },
      { warrantyExpiry: { lte: warrantyCutoff } },
      { purchaseDate: { lte: oldPurchaseCutoff } }
    ]
  });

  const assets = await prisma.asset.findMany({ where, select: assetReportSelect, take: 500 });

  const assessed = assets
    .map((asset) => {
      const reasons: string[] = [];
      let riskScore = 0;

      if (asset.condition === AssetCondition.UNUSABLE) {
        reasons.push("Condition is unusable.");
        riskScore = Math.max(riskScore, 95);
      } else if (asset.condition === AssetCondition.DAMAGED) {
        reasons.push("Condition is damaged.");
        riskScore = Math.max(riskScore, 85);
      } else if (asset.condition === AssetCondition.FAIR) {
        reasons.push("Condition is fair.");
        riskScore = Math.max(riskScore, 55);
      }

      if (asset.warrantyExpiry) {
        const daysUntilWarrantyExpiry = Math.ceil((asset.warrantyExpiry.getTime() - now.getTime()) / 86400000);
        if (daysUntilWarrantyExpiry < 0) {
          reasons.push("Warranty has expired.");
          riskScore = Math.max(riskScore, 75);
        } else if (daysUntilWarrantyExpiry <= 90) {
          reasons.push("Warranty expires within 90 days.");
          riskScore = Math.max(riskScore, 45);
        }
      }

      if (asset.purchaseDate && asset.purchaseDate <= oldPurchaseCutoff) {
        reasons.push("Asset age is over four years.");
        riskScore = Math.max(riskScore, 60);
      }

      return {
        ...formatAsset(asset),
        riskScore,
        reasons
      };
    })
    .sort((first, second) => second.riskScore - first.riskScore);

  const items = assessed.slice(skip, skip + limit);

  return {
    ...paginated(items, assessed.length, page, limit),
    totals: { nearRetirementAssets: assessed.length },
    charts: {
      retirementRisk: {
        labels: items.map((asset) => asset.name),
        datasets: [{ label: "riskScore", data: items.map((asset) => asset.riskScore) }],
        totals: { nearRetirementAssets: assessed.length }
      }
    }
  };
};

export const getDashboardReport = async (query: Query, actor: Express.User) => {
  const { from, to } = getDateRange(query);
  const labels = dateLabels(from, to);
  const bookingWhere = buildBookingWhere(query, actor);
  const maintenanceWhere = buildMaintenanceWhere(query, actor);
  const auditReport = await getAuditAnalyticsReport(query, actor);

  const [summary, utilization, bookings, maintenance, idleAssets, mostUsedAssets, nearRetirement, maintenanceQueue, auditRecords] =
    await Promise.all([
      getSummaryReport(query, actor),
      getDepartmentUtilizationReport(query, actor),
      prisma.booking.findMany({ where: bookingWhere, select: { startTime: true }, take: 500 }),
      prisma.maintenanceTicket.findMany({ where: maintenanceWhere, select: { reportedAt: true }, take: 500 }),
      getIdleAssetsReport({ ...query, limit: 5 }, actor),
      getMostUsedAssetsReport({ ...query, limit: 5 }, actor),
      getNearRetirementReport({ ...query, limit: 5 }, actor),
      upcomingMaintenance(query, actor, 5),
      prisma.auditRecord.findMany({
        where: buildAuditRecordWhere(query, actor),
        select: { auditedAt: true },
        take: 500
      })
    ]);

  return {
    dateRange: { from: from.toISOString(), to: to.toISOString() },
    summary,
    charts: {
      utilizationByDepartment: utilization.charts.utilizationByDepartment,
      bookingTrend: trendChart("bookings", labels, bookings, (booking) => booking.startTime),
      maintenanceTrend: trendChart("maintenance", labels, maintenance, (ticket) => ticket.reportedAt),
      auditTrend: trendChart("auditRecords", labels, auditRecords, (record) => record.auditedAt),
      assetStatus: summary.charts.byStatus,
      auditVerification: auditReport.charts.verification
    },
    idleAssets: idleAssets.items,
    frequentlyUsedAssets: mostUsedAssets.items,
    upcomingMaintenance: maintenanceQueue,
    nearRetirement: nearRetirement.items,
    auditSummary: {
      auditCount: auditReport.auditCount,
      completionPercentage: auditReport.completionPercentage,
      discrepanciesFound: auditReport.discrepanciesFound
    }
  };
};

const flattenObject = (value: unknown, prefix = "", output: Record<string, string | number | boolean | null> = {}) => {
  if (value instanceof Date) {
    output[prefix] = value.toISOString();
    return output;
  }

  if (value === null || value === undefined || typeof value !== "object") {
    output[prefix] = value as string | number | boolean | null;
    return output;
  }

  if (Array.isArray(value)) {
    output[prefix] = JSON.stringify(value);
    return output;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    flattenObject(nestedValue, nextPrefix, output);
  }

  return output;
};

const csvEscape = (value: unknown) => {
  const raw = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(raw) ? `"${raw.replaceAll("\"", "\"\"")}"` : raw;
};

const toCsv = (rows: unknown[]) => {
  if (rows.length === 0) return "message\nNo data\n";
  const flattened = rows.map((row) => flattenObject(row));
  const headers = [...new Set(flattened.flatMap((row) => Object.keys(row)))];
  return `${headers.join(",")}\n${flattened.map((row) => headers.map((header) => csvEscape(row[header])).join(",")).join("\n")}\n`;
};

const exportRows = (data: unknown): unknown[] => {
  if (data && typeof data === "object" && "items" in data && Array.isArray((data as { items: unknown[] }).items)) {
    return (data as { items: unknown[] }).items;
  }

  if (data && typeof data === "object" && "departmentUtilization" in data) {
    return (data as { departmentUtilization: unknown[] }).departmentUtilization;
  }

  if (data && typeof data === "object" && "totals" in data) {
    return [(data as { totals: unknown }).totals];
  }

  return [data];
};

const reportByType = async (type: string, query: Query, actor: Express.User) => {
  if (type === "dashboard" || type === "summary") return getDashboardReport(query, actor);
  if (type === "assets") return getAssetReport(query, actor);
  if (type === "bookings") return getBookingReport(query, actor);
  if (type === "maintenance") return getMaintenanceReport(query, actor);
  if (type === "audits") return getAuditAnalyticsReport(query, actor);
  if (type === "utilization") return getUtilizationReport(query, actor);
  if (type === "department-utilization") return getDepartmentUtilizationReport(query, actor);
  if (type === "idle-assets") return getIdleAssetsReport(query, actor);
  if (type === "most-used-assets") return getMostUsedAssetsReport(query, actor);
  if (type === "near-retirement") return getNearRetirementReport(query, actor);
  return getDashboardReport(query, actor);
};

export const getExportReport = async (query: Query, actor: Express.User) => {
  const type = String(query.type ?? "dashboard");
  const format = String(query.format ?? "json");

  if (format === "pdf") {
    return {
      format,
      type,
      fileName: `assetflow-${type}.pdf`,
      contentType: "application/json",
      data: {
        status: "PDF_INTERFACE_READY",
        message: "PDF export is reserved for a future renderer. Use CSV or JSON exports for the current hackathon backend."
      }
    };
  }

  const data = await reportByType(type, query, actor);

  if (format === "csv") {
    return {
      format,
      type,
      fileName: `assetflow-${type}.csv`,
      contentType: "text/csv; charset=utf-8",
      body: toCsv(exportRows(data))
    };
  }

  return {
    format: "json",
    type,
    fileName: `assetflow-${type}.json`,
    contentType: "application/json",
    data
  };
};

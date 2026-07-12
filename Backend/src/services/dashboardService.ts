import {
  AllocationStatus,
  AssetStatus,
  AuditResult,
  AuditStatus,
  BookingStatus,
  MaintenancePriority,
  MaintenanceStatus,
  Role,
  TransferStatus
} from "@prisma/client";
import { prisma } from "../config/prisma.js";
import type {
  DashboardAlert,
  DashboardOverviewResponse,
  DashboardQuickAction,
  DashboardRecentActivity
} from "../types/dashboard.js";
import { getNotificationDashboardSummary } from "./notificationService.js";
import { forbidden } from "../utils/httpError.js";

const userSelect = { id: true, name: true, email: true };
const assetSelect = { id: true, assetCode: true, name: true };

const openMaintenanceStatuses = [
  MaintenanceStatus.REQUESTED,
  MaintenanceStatus.OPEN,
  MaintenanceStatus.APPROVED,
  MaintenanceStatus.ASSIGNED,
  MaintenanceStatus.IN_PROGRESS,
  MaintenanceStatus.RESOLVED
];

const waitingMaintenanceStatuses = [
  MaintenanceStatus.REQUESTED,
  MaintenanceStatus.OPEN,
  MaintenanceStatus.APPROVED,
  MaintenanceStatus.ASSIGNED
];

const auditWarningResults = [
  AuditResult.MISSING,
  AuditResult.DAMAGED,
  AuditResult.MISPLACED,
  AuditResult.NEEDS_REVIEW
];

const requestedBookingStatuses = [BookingStatus.REQUESTED, BookingStatus.PENDING];
const activeBookingStatuses = [BookingStatus.APPROVED, BookingStatus.ACTIVE];

const getScopedDepartmentId = (actor: Express.User, requestedDepartmentId?: string) => {
  if (actor.role === Role.MANAGER) {
    if (requestedDepartmentId && requestedDepartmentId !== actor.departmentId) {
      throw forbidden("Managers can only access their assigned department dashboard.");
    }
    return actor.departmentId ?? undefined;
  }

  if (actor.role === Role.EMPLOYEE && requestedDepartmentId) {
    throw forbidden("Employees cannot filter dashboard by department.");
  }

  return requestedDepartmentId;
};

const buildAssetWhere = (actor: Express.User, departmentId?: string) => {
  const where: Record<string, unknown> = {};

  if (departmentId) {
    where.departmentId = departmentId;
  }

  if (actor.role === Role.EMPLOYEE) {
    where.OR = [
      { isBookable: true },
      { allocations: { some: { userId: actor.id, status: AllocationStatus.ACTIVE } } }
    ];
  }

  return where;
};

const buildAllocationWhere = (actor: Express.User, departmentId?: string) => {
  if (actor.role === Role.EMPLOYEE) return { userId: actor.id };
  if (!departmentId) return {};
  return { OR: [{ departmentId }, { asset: { departmentId } }] };
};

const buildTransferWhere = (actor: Express.User, departmentId?: string) => {
  if (actor.role === Role.EMPLOYEE) {
    return {
      OR: [{ requestedById: actor.id }, { fromUserId: actor.id }, { toUserId: actor.id }]
    };
  }

  if (!departmentId) return {};
  return {
    OR: [{ asset: { departmentId } }, { fromDepartmentId: departmentId }, { toDepartmentId: departmentId }]
  };
};

const buildBookingWhere = (actor: Express.User, departmentId?: string) => {
  if (actor.role === Role.EMPLOYEE) return { requestedById: actor.id };
  if (!departmentId) return {};
  return { asset: { departmentId } };
};

const buildMaintenanceWhere = (actor: Express.User, departmentId?: string) => {
  if (actor.role === Role.EMPLOYEE) {
    return { OR: [{ reportedById: actor.id }, { assignedToId: actor.id }] };
  }

  if (!departmentId) return {};
  return { asset: { departmentId } };
};

const buildAuditRecordWhere = (actor: Express.User, departmentId?: string) => {
  if (actor.role === Role.EMPLOYEE) {
    return { asset: { allocations: { some: { userId: actor.id, status: AllocationStatus.ACTIVE } } } };
  }

  if (!departmentId) return {};
  return { asset: { departmentId } };
};

const buildAuditWhere = (actor: Express.User, departmentId?: string) => {
  if (actor.role === Role.EMPLOYEE) {
    return { records: { some: { asset: { allocations: { some: { userId: actor.id, status: AllocationStatus.ACTIVE } } } } } };
  }

  if (!departmentId) return {};
  return { OR: [{ departmentId }, { records: { some: { asset: { departmentId } } } }] };
};

const alert = (
  id: DashboardAlert["id"],
  type: DashboardAlert["type"],
  severity: DashboardAlert["severity"],
  title: string,
  message: string,
  count: number,
  entityType: string
): DashboardAlert => ({ id, type, severity, title, message, count, entityType });

const plural = (count: number, singular: string, pluralValue: string) => (count === 1 ? singular : pluralValue);

const buildAlerts = (counts: {
  overdueReturns: number;
  pendingTransfers: number;
  pendingBookings: number;
  maintenanceWaiting: number;
  criticalMaintenance: number;
  auditWarnings: number;
}) => {
  const alerts: DashboardAlert[] = [];

  if (counts.overdueReturns > 0) {
    alerts.push(
      alert(
        "overdue-returns",
        "OVERDUE_RETURN",
        "critical",
        "Overdue returns",
        `${counts.overdueReturns} approved ${plural(counts.overdueReturns, "booking is", "bookings are")} past the scheduled return time.`,
        counts.overdueReturns,
        "Booking"
      )
    );
  }

  if (counts.pendingTransfers > 0) {
    alerts.push(
      alert(
        "pending-transfer-approvals",
        "PENDING_TRANSFER_APPROVAL",
        "warning",
        "Transfer approvals pending",
        `${counts.pendingTransfers} transfer ${plural(counts.pendingTransfers, "request needs", "requests need")} approval.`,
        counts.pendingTransfers,
        "Transfer"
      )
    );
  }

  if (counts.pendingBookings > 0) {
    alerts.push(
      alert(
        "pending-booking-approvals",
        "PENDING_BOOKING_APPROVAL",
        "warning",
        "Booking approvals pending",
        `${counts.pendingBookings} booking ${plural(counts.pendingBookings, "request needs", "requests need")} approval.`,
        counts.pendingBookings,
        "Booking"
      )
    );
  }

  if (counts.maintenanceWaiting > 0) {
    alerts.push(
      alert(
        "maintenance-waiting",
        "MAINTENANCE_WAITING",
        "warning",
        "Maintenance waiting",
        `${counts.maintenanceWaiting} maintenance ${plural(counts.maintenanceWaiting, "ticket is", "tickets are")} open or assigned.`,
        counts.maintenanceWaiting,
        "MaintenanceTicket"
      )
    );
  }

  if (counts.criticalMaintenance > 0) {
    alerts.push(
      alert(
        "critical-maintenance",
        "CRITICAL_MAINTENANCE",
        "critical",
        "Critical maintenance",
        `${counts.criticalMaintenance} critical maintenance ${plural(counts.criticalMaintenance, "ticket is", "tickets are")} still active.`,
        counts.criticalMaintenance,
        "MaintenanceTicket"
      )
    );
  }

  if (counts.auditWarnings > 0) {
    alerts.push(
      alert(
        "audit-warnings",
        "AUDIT_WARNING",
        "warning",
        "Audit warnings",
        `${counts.auditWarnings} audit ${plural(counts.auditWarnings, "record needs", "records need")} follow-up.`,
        counts.auditWarnings,
        "AuditRecord"
      )
    );
  }

  return alerts;
};

const quickActionsByRole = (role: Role): DashboardQuickAction[] => {
  const actions: DashboardQuickAction[] = [];

  if (role === Role.ADMIN || role === Role.MANAGER) {
    actions.push(
      {
        id: "register-asset",
        label: "Register Asset",
        action: "CREATE_ASSET",
        resource: "Asset",
        allowedRoles: [Role.ADMIN, Role.MANAGER]
      },
      {
        id: "allocate-asset",
        label: "Allocate Asset",
        action: "ALLOCATE_ASSET",
        resource: "Asset",
        allowedRoles: [Role.ADMIN, Role.MANAGER]
      },
      {
        id: "review-approvals",
        label: "Review Approvals",
        action: "REVIEW_APPROVALS",
        resource: "Workflow",
        allowedRoles: [Role.ADMIN, Role.MANAGER]
      }
    );
  }

  if (role === Role.EMPLOYEE) {
    actions.push(
      {
        id: "request-booking",
        label: "Request Booking",
        action: "CREATE_BOOKING",
        resource: "Booking",
        allowedRoles: [Role.EMPLOYEE]
      },
      {
        id: "request-transfer",
        label: "Request Transfer",
        action: "CREATE_TRANSFER",
        resource: "Transfer",
        allowedRoles: [Role.EMPLOYEE]
      },
      {
        id: "report-maintenance",
        label: "Report Maintenance",
        action: "CREATE_MAINTENANCE",
        resource: "MaintenanceTicket",
        allowedRoles: [Role.EMPLOYEE]
      }
    );
  }

  if (role === Role.AUDITOR) {
    actions.push(
      {
        id: "create-audit",
        label: "Create Audit",
        action: "CREATE_AUDIT",
        resource: "AuditRecord",
        allowedRoles: [Role.AUDITOR]
      },
      {
        id: "review-audit-logs",
        label: "Review Audit Logs",
        action: "VIEW_AUDIT_LOGS",
        resource: "AuditLog",
        allowedRoles: [Role.AUDITOR]
      }
    );
  }

  return actions;
};

export const getDashboardOverview = async (
  actor: Express.User,
  query: { departmentId?: string }
): Promise<DashboardOverviewResponse> => {
  const departmentId = getScopedDepartmentId(actor, query.departmentId);
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);
  const assetWhere = buildAssetWhere(actor, departmentId);
  const allocationWhere = buildAllocationWhere(actor, departmentId);
  const transferWhere = buildTransferWhere(actor, departmentId);
  const bookingWhere = buildBookingWhere(actor, departmentId);
  const maintenanceWhere = buildMaintenanceWhere(actor, departmentId);
  const auditRecordWhere = buildAuditRecordWhere(actor, departmentId);
  const auditWhere = buildAuditWhere(actor, departmentId);

  const [
    totalAssets,
    availableAssets,
    allocatedAssets,
    maintenanceAssets,
    activeBookings,
    pendingBookings,
    upcomingBookings,
    pendingTransfers,
    upcomingReturns,
    overdueReturns,
    maintenanceWaiting,
    pendingMaintenance,
    approvedMaintenance,
    assignedMaintenance,
    inProgressMaintenance,
    resolvedTodayMaintenance,
    criticalMaintenance,
    auditWarnings,
    activeAudits,
    auditsCompleted,
    assetsVerified,
    pendingVerification,
    discrepanciesFound,
    allocations,
    transfers,
    bookings,
    maintenanceTickets,
    audits,
    notificationSummary
  ] = await Promise.all([
    prisma.asset.count({ where: assetWhere }),
    prisma.asset.count({ where: { ...assetWhere, status: AssetStatus.AVAILABLE } }),
    prisma.asset.count({ where: { ...assetWhere, status: AssetStatus.ALLOCATED } }),
    prisma.asset.count({ where: { ...assetWhere, status: AssetStatus.MAINTENANCE } }),
    prisma.booking.count({
      where: { ...bookingWhere, status: { in: activeBookingStatuses }, startTime: { lte: now }, endTime: { gte: now } }
    }),
    prisma.booking.count({ where: { ...bookingWhere, status: { in: requestedBookingStatuses } } }),
    prisma.booking.count({ where: { ...bookingWhere, status: { in: activeBookingStatuses }, startTime: { gt: now } } }),
    prisma.transfer.count({ where: { ...transferWhere, status: TransferStatus.PENDING } }),
    prisma.booking.count({ where: { ...bookingWhere, status: { in: activeBookingStatuses }, endTime: { gte: now } } }),
    prisma.booking.count({ where: { ...bookingWhere, status: { in: activeBookingStatuses }, endTime: { lt: now } } }),
    prisma.maintenanceTicket.count({
      where: { ...maintenanceWhere, status: { in: waitingMaintenanceStatuses } }
    }),
    prisma.maintenanceTicket.count({
      where: { ...maintenanceWhere, status: { in: [MaintenanceStatus.REQUESTED, MaintenanceStatus.OPEN] } }
    }),
    prisma.maintenanceTicket.count({ where: { ...maintenanceWhere, status: MaintenanceStatus.APPROVED } }),
    prisma.maintenanceTicket.count({ where: { ...maintenanceWhere, status: MaintenanceStatus.ASSIGNED } }),
    prisma.maintenanceTicket.count({ where: { ...maintenanceWhere, status: MaintenanceStatus.IN_PROGRESS } }),
    prisma.maintenanceTicket.count({
      where: {
        ...maintenanceWhere,
        status: MaintenanceStatus.RESOLVED,
        resolvedAt: { gte: todayStart, lt: todayEnd }
      }
    }),
    prisma.maintenanceTicket.count({
      where: {
        ...maintenanceWhere,
        priority: MaintenancePriority.CRITICAL,
        status: { in: openMaintenanceStatuses }
      }
    }),
    prisma.auditRecord.count({ where: { ...auditRecordWhere, result: { in: auditWarningResults } } }),
    prisma.audit.count({ where: { ...auditWhere, status: { in: [AuditStatus.ACTIVE, AuditStatus.IN_PROGRESS] } } }),
    prisma.audit.count({ where: { ...auditWhere, status: { in: [AuditStatus.COMPLETED, AuditStatus.CLOSED] } } }),
    prisma.auditRecord.count({ where: { ...auditRecordWhere, result: { not: null } } }),
    prisma.auditRecord.count({
      where: {
        AND: [
          auditRecordWhere,
          { result: null, audit: { status: { in: [AuditStatus.ACTIVE, AuditStatus.IN_PROGRESS] } } }
        ]
      }
    }),
    prisma.auditDiscrepancy.count({ where: { audit: auditWhere } }),
    prisma.allocation.findMany({
      where: allocationWhere,
      include: { asset: { select: assetSelect }, user: { select: userSelect }, department: true, assignedBy: { select: userSelect } },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.transfer.findMany({
      where: transferWhere,
      include: { asset: { select: assetSelect }, requestedBy: { select: userSelect } },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.booking.findMany({
      where: bookingWhere,
      include: { asset: { select: assetSelect }, requestedBy: { select: userSelect } },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.maintenanceTicket.findMany({
      where: maintenanceWhere,
      include: { asset: { select: assetSelect }, reportedBy: { select: userSelect } },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.audit.findMany({
      where: auditWhere,
      include: { createdBy: { select: userSelect } },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    getNotificationDashboardSummary(actor)
  ]);

  const recentActivity: DashboardRecentActivity[] = [
    ...allocations.map((allocation) => ({
      id: `allocation:${allocation.id}`,
      type: "ALLOCATION" as const,
      title: "Asset allocated",
      description: `${allocation.asset.name} allocated to ${allocation.user?.name ?? allocation.department?.name ?? "department"}.`,
      status: allocation.status,
      timestamp: allocation.createdAt,
      asset: allocation.asset,
      actor: allocation.assignedBy
    })),
    ...transfers.map((transfer) => ({
      id: `transfer:${transfer.id}`,
      type: "TRANSFER" as const,
      title: "Transfer requested",
      description: `${transfer.requestedBy.name} requested transfer for ${transfer.asset.name}.`,
      status: transfer.status,
      timestamp: transfer.createdAt,
      asset: transfer.asset,
      actor: transfer.requestedBy
    })),
    ...bookings.map((booking) => ({
      id: `booking:${booking.id}`,
      type: "BOOKING" as const,
      title: "Booking requested",
      description: `${booking.requestedBy.name} requested ${booking.asset.name}.`,
      status: booking.status,
      timestamp: booking.createdAt,
      asset: booking.asset,
      actor: booking.requestedBy
    })),
    ...maintenanceTickets.map((ticket) => ({
      id: `maintenance:${ticket.id}`,
      type: "MAINTENANCE" as const,
      title: "Maintenance reported",
      description: `${ticket.reportedBy.name} reported ${ticket.issueSummary} for ${ticket.asset.name}.`,
      status: ticket.status,
      timestamp: ticket.createdAt,
      asset: ticket.asset,
      actor: ticket.reportedBy
    })),
    ...audits.map((audit) => ({
      id: `audit:${audit.id}`,
      type: "AUDIT" as const,
      title: "Audit created",
      description: `${audit.createdBy.name} created ${audit.title}.`,
      status: audit.status,
      timestamp: audit.createdAt,
      asset: {
        id: audit.id,
        assetCode: "AUDIT",
        name: audit.title
      },
      actor: audit.createdBy
    }))
  ]
    .sort((first, second) => second.timestamp.getTime() - first.timestamp.getTime())
    .slice(0, 10);

  return {
    overview: {
      totalAssets,
      availableAssets,
      allocatedAssets,
      maintenanceAssets,
      activeBookings,
      pendingBookings,
      upcomingBookings,
      pendingTransfers,
      upcomingReturns,
      pendingMaintenance,
      approvedMaintenance,
      assignedMaintenance,
      inProgressMaintenance,
      resolvedTodayMaintenance,
      upcomingMaintenance: approvedMaintenance + assignedMaintenance,
      activeAudits,
      auditsCompleted,
      assetsVerified,
      pendingVerification,
      discrepanciesFound,
      unreadNotifications: notificationSummary.unreadCount,
      notificationBadgeCount: notificationSummary.notificationBadgeCount
    },
    alerts: buildAlerts({
      overdueReturns,
      pendingTransfers,
      pendingBookings,
      maintenanceWaiting,
      criticalMaintenance,
      auditWarnings: auditWarnings + discrepanciesFound
    }),
    quickActions: quickActionsByRole(actor.role),
    recentActivity,
    latestActivity: recentActivity,
    notifications: notificationSummary
  };
};

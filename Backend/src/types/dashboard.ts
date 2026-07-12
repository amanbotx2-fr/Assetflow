import type { Role } from "@prisma/client";

export type DashboardOverview = {
  totalAssets: number;
  availableAssets: number;
  allocatedAssets: number;
  maintenanceAssets: number;
  activeBookings: number;
  pendingBookings: number;
  upcomingBookings: number;
  pendingTransfers: number;
  upcomingReturns: number;
  pendingMaintenance: number;
  approvedMaintenance: number;
  assignedMaintenance: number;
  inProgressMaintenance: number;
  resolvedTodayMaintenance: number;
  upcomingMaintenance: number;
  activeAudits: number;
  auditsCompleted: number;
  assetsVerified: number;
  pendingVerification: number;
  discrepanciesFound: number;
  unreadNotifications: number;
  notificationBadgeCount: number;
};

export type DashboardAlert = {
  id: string;
  type:
    | "OVERDUE_RETURN"
    | "PENDING_TRANSFER_APPROVAL"
    | "PENDING_BOOKING_APPROVAL"
    | "MAINTENANCE_WAITING"
    | "CRITICAL_MAINTENANCE"
    | "AUDIT_WARNING";
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  count: number;
  entityType: string;
};

export type DashboardQuickAction = {
  id: string;
  label: string;
  action: string;
  resource: string;
  allowedRoles: Role[];
};

export type DashboardRecentActivity = {
  id: string;
  type: "ALLOCATION" | "TRANSFER" | "BOOKING" | "MAINTENANCE" | "AUDIT";
  title: string;
  description: string;
  status: string;
  timestamp: Date;
  asset: {
    id: string;
    assetCode: string;
    name: string;
  };
  actor?: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export type DashboardOverviewResponse = {
  overview: DashboardOverview;
  alerts: DashboardAlert[];
  quickActions: DashboardQuickAction[];
  recentActivity: DashboardRecentActivity[];
  latestActivity: DashboardRecentActivity[];
  notifications: {
    unreadCount: number;
    notificationBadgeCount: number;
    recent: unknown[];
    criticalAlerts: unknown[];
  };
};

import AssetsPage from "../pages/AssetsPage";
import AllocationTransferPage from "../pages/AllocationTransferPage";
import BookingPage from "../pages/BookingPage";
import MaintenancePage from "../pages/MaintenancePage";
import AuditPage from "../pages/AuditPage";
import ReportsPage from "../pages/ReportsPage";
import NotificationsPage from "../pages/NotificationsPage";

export const developerBRoutes = [
  { path: "/assets", label: "Assets", Component: AssetsPage },
  { path: "/allocation-transfer", label: "Allocation & Transfer", Component: AllocationTransferPage },
  { path: "/bookings", label: "Resource Booking", Component: BookingPage },
  { path: "/maintenance", label: "Maintenance", Component: MaintenancePage },
  { path: "/audit", label: "Audit", Component: AuditPage },
  { path: "/reports", label: "Reports", Component: ReportsPage },
  { path: "/notifications", label: "Notifications", Component: NotificationsPage }
] as const;

import { Router } from "express";
import { assetRoutes } from "./assetRoutes.js";
import { auditLogRoutes, auditRoutes } from "./auditRoutes.js";
import { authRoutes } from "./authRoutes.js";
import { bookingRoutes } from "./bookingRoutes.js";
import { categoryRoutes, departmentRoutes, userRoutes } from "./referenceRoutes.js";
import { maintenanceRoutes } from "./maintenanceRoutes.js";
import { notificationRoutes } from "./notificationRoutes.js";
import { reportRoutes } from "./reportRoutes.js";
import { transferRoutes } from "./transferRoutes.js";

export const apiRoutes = Router();

apiRoutes.use("/auth", authRoutes);
apiRoutes.use("/users", userRoutes);
apiRoutes.use("/departments", departmentRoutes);
apiRoutes.use("/categories", categoryRoutes);
apiRoutes.use("/assets", assetRoutes);
apiRoutes.use("/transfers", transferRoutes);
apiRoutes.use("/bookings", bookingRoutes);
apiRoutes.use("/maintenance", maintenanceRoutes);
apiRoutes.use("/audits", auditRoutes);
apiRoutes.use("/audit-logs", auditLogRoutes);
apiRoutes.use("/reports", reportRoutes);
apiRoutes.use("/notifications", notificationRoutes);

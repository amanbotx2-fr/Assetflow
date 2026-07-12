import { Router } from "express";
import { Role } from "@prisma/client";
import * as reportController from "../controllers/reportController.js";
import { authenticate } from "../middleware/auth.js";
import { requireRoles } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { reportQuerySchema } from "../validators/commonValidators.js";

export const reportRoutes = Router();

reportRoutes.use(authenticate);
reportRoutes.get("/summary", requireRoles(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.AUDITOR), validate({ query: reportQuerySchema }), reportController.summary);
reportRoutes.get("/dashboard", requireRoles(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.AUDITOR), validate({ query: reportQuerySchema }), reportController.dashboard);
reportRoutes.get("/assets", requireRoles(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.AUDITOR), validate({ query: reportQuerySchema }), reportController.assets);
reportRoutes.get("/bookings", requireRoles(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.AUDITOR), validate({ query: reportQuerySchema }), reportController.bookings);
reportRoutes.get("/maintenance", requireRoles(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.AUDITOR), validate({ query: reportQuerySchema }), reportController.maintenance);
reportRoutes.get("/audits", requireRoles(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.AUDITOR), validate({ query: reportQuerySchema }), reportController.audits);
reportRoutes.get("/utilization", requireRoles(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.AUDITOR), validate({ query: reportQuerySchema }), reportController.utilization);
reportRoutes.get("/department-utilization", requireRoles(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.AUDITOR), validate({ query: reportQuerySchema }), reportController.departmentUtilization);
reportRoutes.get("/idle-assets", requireRoles(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.AUDITOR), validate({ query: reportQuerySchema }), reportController.idleAssets);
reportRoutes.get("/most-used-assets", requireRoles(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.AUDITOR), validate({ query: reportQuerySchema }), reportController.mostUsedAssets);
reportRoutes.get("/near-retirement", requireRoles(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.AUDITOR), validate({ query: reportQuerySchema }), reportController.nearRetirement);
reportRoutes.get("/export", requireRoles(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.AUDITOR), validate({ query: reportQuerySchema }), reportController.exportReport);

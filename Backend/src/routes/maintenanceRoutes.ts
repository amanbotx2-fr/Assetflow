import { Router } from "express";
import { Role } from "@prisma/client";
import * as maintenanceController from "../controllers/maintenanceController.js";
import { authenticate } from "../middleware/auth.js";
import { requireRoles } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { decisionSchema, idParams } from "../validators/commonValidators.js";
import {
  assignMaintenanceSchema,
  closeMaintenanceSchema,
  createMaintenanceSchema,
  maintenanceListQuerySchema,
  resolveMaintenanceSchema,
  startMaintenanceSchema,
  updateMaintenanceSchema
} from "../validators/workflowValidators.js";

export const maintenanceRoutes = Router();

maintenanceRoutes.use(authenticate);
maintenanceRoutes.get("/", requireRoles(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.AUDITOR), validate({ query: maintenanceListQuerySchema }), maintenanceController.listMaintenanceTickets);
maintenanceRoutes.post("/", requireRoles(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE), validate({ body: createMaintenanceSchema }), maintenanceController.createMaintenanceTicket);
maintenanceRoutes.get("/:id", requireRoles(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.AUDITOR), validate({ params: idParams }), maintenanceController.getMaintenanceTicket);
maintenanceRoutes.patch("/:id", requireRoles(Role.ADMIN, Role.MANAGER), validate({ params: idParams, body: updateMaintenanceSchema }), maintenanceController.updateMaintenanceTicket);
maintenanceRoutes.delete("/:id", requireRoles(Role.ADMIN, Role.MANAGER), validate({ params: idParams }), maintenanceController.deleteMaintenanceTicket);
maintenanceRoutes.patch("/:id/approve", requireRoles(Role.ADMIN, Role.MANAGER), validate({ params: idParams, body: decisionSchema }), maintenanceController.approveMaintenanceTicket);
maintenanceRoutes.patch("/:id/reject", requireRoles(Role.ADMIN, Role.MANAGER), validate({ params: idParams, body: decisionSchema }), maintenanceController.rejectMaintenanceTicket);
maintenanceRoutes.patch("/:id/assign", requireRoles(Role.ADMIN, Role.MANAGER), validate({ params: idParams, body: assignMaintenanceSchema }), maintenanceController.assignMaintenanceTicket);
maintenanceRoutes.patch("/:id/start", requireRoles(Role.ADMIN, Role.MANAGER), validate({ params: idParams, body: startMaintenanceSchema }), maintenanceController.startMaintenanceTicket);
maintenanceRoutes.patch("/:id/resolve", requireRoles(Role.ADMIN, Role.MANAGER), validate({ params: idParams, body: resolveMaintenanceSchema }), maintenanceController.resolveMaintenanceTicket);
maintenanceRoutes.patch("/:id/close", requireRoles(Role.ADMIN, Role.MANAGER), validate({ params: idParams, body: closeMaintenanceSchema }), maintenanceController.closeMaintenanceTicket);

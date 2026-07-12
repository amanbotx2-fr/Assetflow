import { Router } from "express";
import { Role } from "@prisma/client";
import * as maintenanceController from "../controllers/maintenanceController.js";
import { authenticate } from "../middleware/auth.js";
import { requireRoles } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { idParams, paginationQuery } from "../validators/commonValidators.js";
import {
  closeMaintenanceSchema,
  createMaintenanceSchema,
  updateMaintenanceSchema
} from "../validators/workflowValidators.js";

export const maintenanceRoutes = Router();

maintenanceRoutes.use(authenticate);
maintenanceRoutes.get("/", validate({ query: paginationQuery }), maintenanceController.listMaintenanceTickets);
maintenanceRoutes.post("/", requireRoles(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE), validate({ body: createMaintenanceSchema }), maintenanceController.createMaintenanceTicket);
maintenanceRoutes.get("/:id", validate({ params: idParams }), maintenanceController.getMaintenanceTicket);
maintenanceRoutes.patch("/:id", requireRoles(Role.ADMIN, Role.MANAGER), validate({ params: idParams, body: updateMaintenanceSchema }), maintenanceController.updateMaintenanceTicket);
maintenanceRoutes.patch("/:id/close", requireRoles(Role.ADMIN, Role.MANAGER), validate({ params: idParams, body: closeMaintenanceSchema }), maintenanceController.closeMaintenanceTicket);

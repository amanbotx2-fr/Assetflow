import { Router } from "express";
import { Role } from "@prisma/client";
import * as transferController from "../controllers/transferController.js";
import { authenticate } from "../middleware/auth.js";
import { requireRoles } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { decisionSchema, idParams } from "../validators/commonValidators.js";
import { cancelSchema, createTransferSchema, transferListQuerySchema } from "../validators/workflowValidators.js";

export const transferRoutes = Router();

transferRoutes.use(authenticate);
transferRoutes.get("/", requireRoles(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.AUDITOR), validate({ query: transferListQuerySchema }), transferController.listTransfers);
transferRoutes.post("/", requireRoles(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE), validate({ body: createTransferSchema }), transferController.createTransfer);
transferRoutes.get("/:id", requireRoles(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.AUDITOR), validate({ params: idParams }), transferController.getTransfer);
transferRoutes.patch("/:id/approve", requireRoles(Role.ADMIN, Role.MANAGER), validate({ params: idParams, body: decisionSchema }), transferController.approveTransfer);
transferRoutes.patch("/:id/reject", requireRoles(Role.ADMIN, Role.MANAGER), validate({ params: idParams, body: decisionSchema }), transferController.rejectTransfer);
transferRoutes.patch("/:id/cancel", requireRoles(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE), validate({ params: idParams, body: cancelSchema }), transferController.cancelTransfer);

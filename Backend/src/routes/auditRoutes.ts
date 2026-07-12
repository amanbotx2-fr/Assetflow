import { Router } from "express";
import { Role } from "@prisma/client";
import * as auditController from "../controllers/auditController.js";
import { authenticate } from "../middleware/auth.js";
import { requireRoles } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { idParams, paginationQuery } from "../validators/commonValidators.js";
import {
  auditListQuerySchema,
  createAuditSchema,
  updateAuditSchema,
  verifyAuditSchema
} from "../validators/workflowValidators.js";

export const auditRoutes = Router();
export const auditLogRoutes = Router();

auditRoutes.use(authenticate);
auditRoutes.get("/", requireRoles(Role.ADMIN, Role.AUDITOR, Role.MANAGER, Role.EMPLOYEE), validate({ query: auditListQuerySchema }), auditController.listAuditRecords);
auditRoutes.post("/", requireRoles(Role.ADMIN, Role.AUDITOR, Role.MANAGER), validate({ body: createAuditSchema }), auditController.createAuditRecord);
auditRoutes.get("/:id/discrepancies", requireRoles(Role.ADMIN, Role.AUDITOR, Role.MANAGER, Role.EMPLOYEE), validate({ params: idParams, query: paginationQuery }), auditController.listAuditDiscrepancies);
auditRoutes.get("/:id", requireRoles(Role.ADMIN, Role.AUDITOR, Role.MANAGER, Role.EMPLOYEE), validate({ params: idParams }), auditController.getAudit);
auditRoutes.patch("/:id", requireRoles(Role.ADMIN, Role.AUDITOR, Role.MANAGER), validate({ params: idParams, body: updateAuditSchema }), auditController.updateAudit);
auditRoutes.delete("/:id", requireRoles(Role.ADMIN, Role.AUDITOR, Role.MANAGER), validate({ params: idParams }), auditController.deleteAudit);
auditRoutes.post("/:id/start", requireRoles(Role.ADMIN, Role.AUDITOR, Role.MANAGER), validate({ params: idParams }), auditController.startAudit);
auditRoutes.post("/:id/verify", requireRoles(Role.ADMIN, Role.AUDITOR, Role.MANAGER, Role.EMPLOYEE), validate({ params: idParams, body: verifyAuditSchema }), auditController.verifyAuditAsset);
auditRoutes.post("/:id/complete", requireRoles(Role.ADMIN, Role.AUDITOR, Role.MANAGER), validate({ params: idParams }), auditController.completeAudit);
auditRoutes.post("/:id/close", requireRoles(Role.ADMIN, Role.AUDITOR, Role.MANAGER), validate({ params: idParams }), auditController.closeAudit);

auditLogRoutes.use(authenticate);
auditLogRoutes.get("/", requireRoles(Role.ADMIN, Role.AUDITOR), validate({ query: paginationQuery }), auditController.listAuditLogs);

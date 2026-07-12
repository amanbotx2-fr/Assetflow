import { Router } from "express";
import { Role } from "@prisma/client";
import * as auditController from "../controllers/auditController.js";
import { authenticate } from "../middleware/auth.js";
import { requireRoles } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { paginationQuery } from "../validators/commonValidators.js";
import { createAuditSchema } from "../validators/workflowValidators.js";

export const auditRoutes = Router();
export const auditLogRoutes = Router();

auditRoutes.use(authenticate);
auditRoutes.get("/", requireRoles(Role.ADMIN, Role.AUDITOR, Role.MANAGER), validate({ query: paginationQuery }), auditController.listAuditRecords);
auditRoutes.post("/", requireRoles(Role.ADMIN, Role.AUDITOR), validate({ body: createAuditSchema }), auditController.createAuditRecord);

auditLogRoutes.use(authenticate);
auditLogRoutes.get("/", requireRoles(Role.ADMIN, Role.AUDITOR), validate({ query: paginationQuery }), auditController.listAuditLogs);

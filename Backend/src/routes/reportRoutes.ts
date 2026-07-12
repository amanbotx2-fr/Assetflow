import { Router } from "express";
import { Role } from "@prisma/client";
import * as reportController from "../controllers/reportController.js";
import { authenticate } from "../middleware/auth.js";
import { requireRoles } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { paginationQuery } from "../validators/commonValidators.js";

export const reportRoutes = Router();

reportRoutes.use(authenticate);
reportRoutes.get("/summary", requireRoles(Role.ADMIN, Role.MANAGER), validate({ query: paginationQuery }), reportController.summary);
reportRoutes.get("/assets", requireRoles(Role.ADMIN, Role.MANAGER, Role.AUDITOR), validate({ query: paginationQuery }), reportController.assets);

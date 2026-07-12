import { Router } from "express";
import { Role } from "@prisma/client";
import * as organizationController from "../controllers/organizationController.js";
import { authenticate } from "../middleware/auth.js";
import { requireRoles } from "../middleware/rbac.js";

export const organizationRoutes = Router();

organizationRoutes.use(authenticate);
organizationRoutes.get("/overview", requireRoles(Role.ADMIN, Role.MANAGER, Role.AUDITOR), organizationController.overview);

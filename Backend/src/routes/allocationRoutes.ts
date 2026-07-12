import { Router } from "express";
import { Role } from "@prisma/client";
import * as allocationController from "../controllers/allocationController.js";
import { authenticate } from "../middleware/auth.js";
import { requireRoles } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { idParams } from "../validators/commonValidators.js";
import {
  allocationListQuerySchema,
  createAllocationSchema,
  returnAllocationSchema,
  updateAllocationSchema
} from "../validators/workflowValidators.js";

export const allocationRoutes = Router();

allocationRoutes.use(authenticate);
allocationRoutes.get("/", requireRoles(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.AUDITOR), validate({ query: allocationListQuerySchema }), allocationController.listAllocations);
allocationRoutes.post("/", requireRoles(Role.ADMIN, Role.MANAGER), validate({ body: createAllocationSchema }), allocationController.createAllocation);
allocationRoutes.get("/:id", requireRoles(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.AUDITOR), validate({ params: idParams }), allocationController.getAllocation);
allocationRoutes.patch("/:id", requireRoles(Role.ADMIN, Role.MANAGER), validate({ params: idParams, body: updateAllocationSchema }), allocationController.updateAllocation);
allocationRoutes.post("/:id/return", requireRoles(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE), validate({ params: idParams, body: returnAllocationSchema }), allocationController.returnAllocation);

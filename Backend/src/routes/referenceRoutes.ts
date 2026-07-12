import { Router } from "express";
import { Role } from "@prisma/client";
import * as referenceController from "../controllers/referenceController.js";
import { authenticate } from "../middleware/auth.js";
import { requireRoles } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { idParams, paginationQuery } from "../validators/commonValidators.js";
import {
  createCategorySchema,
  createDepartmentSchema,
  createUserSchema,
  updateCategorySchema,
  updateDepartmentSchema,
  updateUserSchema
} from "../validators/referenceValidators.js";

export const userRoutes = Router();
export const departmentRoutes = Router();
export const categoryRoutes = Router();

userRoutes.use(authenticate);
userRoutes.get("/", validate({ query: paginationQuery }), requireRoles(Role.ADMIN, Role.MANAGER, Role.AUDITOR), referenceController.listUsers);
userRoutes.post("/", requireRoles(Role.ADMIN), validate({ body: createUserSchema }), referenceController.createUser);
userRoutes.patch("/:id", requireRoles(Role.ADMIN), validate({ params: idParams, body: updateUserSchema }), referenceController.updateUser);

departmentRoutes.use(authenticate);
departmentRoutes.get("/", requireRoles(Role.ADMIN, Role.MANAGER, Role.AUDITOR), validate({ query: paginationQuery }), referenceController.listDepartments);
departmentRoutes.post("/", requireRoles(Role.ADMIN), validate({ body: createDepartmentSchema }), referenceController.createDepartment);
departmentRoutes.patch("/:id", requireRoles(Role.ADMIN), validate({ params: idParams, body: updateDepartmentSchema }), referenceController.updateDepartment);
departmentRoutes.delete("/:id", requireRoles(Role.ADMIN), validate({ params: idParams }), referenceController.deleteDepartment);

categoryRoutes.use(authenticate);
categoryRoutes.get("/", requireRoles(Role.ADMIN, Role.MANAGER, Role.AUDITOR), validate({ query: paginationQuery }), referenceController.listCategories);
categoryRoutes.post("/", requireRoles(Role.ADMIN), validate({ body: createCategorySchema }), referenceController.createCategory);
categoryRoutes.patch("/:id", requireRoles(Role.ADMIN), validate({ params: idParams, body: updateCategorySchema }), referenceController.updateCategory);
categoryRoutes.delete("/:id", requireRoles(Role.ADMIN), validate({ params: idParams }), referenceController.deleteCategory);

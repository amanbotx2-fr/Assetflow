import { Router } from "express";
import { Role } from "@prisma/client";
import * as settingsController from "../controllers/settingsController.js";
import { authenticate } from "../middleware/auth.js";
import { requireRoles } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import {
  updateAssetConfigurationSchema,
  updateBookingPoliciesSchema,
  updateCompanySettingsSchema,
  updateMaintenancePoliciesSchema,
  updateProfileSettingsSchema
} from "../validators/settingsValidators.js";

export const settingsRoutes = Router();

settingsRoutes.use(authenticate);

settingsRoutes.get("/company", requireRoles(Role.ADMIN, Role.MANAGER, Role.AUDITOR), settingsController.getCompany);
settingsRoutes.patch(
  "/company",
  requireRoles(Role.ADMIN),
  validate({ body: updateCompanySettingsSchema }),
  settingsController.updateCompany
);

settingsRoutes.get("/profile", settingsController.getProfile);
settingsRoutes.patch("/profile", validate({ body: updateProfileSettingsSchema }), settingsController.updateProfile);

settingsRoutes.get("/roles", requireRoles(Role.ADMIN, Role.MANAGER, Role.AUDITOR), settingsController.getRoles);
settingsRoutes.get("/permissions", requireRoles(Role.ADMIN, Role.MANAGER, Role.AUDITOR), settingsController.getPermissions);

settingsRoutes.get(
  "/asset-configuration",
  requireRoles(Role.ADMIN, Role.MANAGER, Role.AUDITOR),
  settingsController.getAssetConfiguration
);
settingsRoutes.patch(
  "/asset-configuration",
  requireRoles(Role.ADMIN),
  validate({ body: updateAssetConfigurationSchema }),
  settingsController.updateAssetConfiguration
);

settingsRoutes.get(
  "/booking-policies",
  requireRoles(Role.ADMIN, Role.MANAGER, Role.AUDITOR),
  settingsController.getBookingPolicies
);
settingsRoutes.patch(
  "/booking-policies",
  requireRoles(Role.ADMIN),
  validate({ body: updateBookingPoliciesSchema }),
  settingsController.updateBookingPolicies
);

settingsRoutes.get(
  "/maintenance-policies",
  requireRoles(Role.ADMIN, Role.MANAGER, Role.AUDITOR),
  settingsController.getMaintenancePolicies
);
settingsRoutes.patch(
  "/maintenance-policies",
  requireRoles(Role.ADMIN),
  validate({ body: updateMaintenancePoliciesSchema }),
  settingsController.updateMaintenancePolicies
);

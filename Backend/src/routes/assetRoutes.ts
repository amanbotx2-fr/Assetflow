import { Router } from "express";
import { Role } from "@prisma/client";
import * as assetController from "../controllers/assetController.js";
import { authenticate } from "../middleware/auth.js";
import { requireRoles } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { allocateAssetSchema, createAssetSchema, retireAssetSchema, updateAssetSchema } from "../validators/assetValidators.js";
import { idParams, paginationQuery } from "../validators/commonValidators.js";

export const assetRoutes = Router();

assetRoutes.use(authenticate);
assetRoutes.get("/", validate({ query: paginationQuery }), assetController.listAssets);
assetRoutes.post("/", requireRoles(Role.ADMIN, Role.MANAGER), validate({ body: createAssetSchema }), assetController.createAsset);
assetRoutes.get("/:id", validate({ params: idParams }), assetController.getAsset);
assetRoutes.patch("/:id", requireRoles(Role.ADMIN, Role.MANAGER), validate({ params: idParams, body: updateAssetSchema }), assetController.updateAsset);
assetRoutes.post("/:id/allocate", requireRoles(Role.ADMIN, Role.MANAGER), validate({ params: idParams, body: allocateAssetSchema }), assetController.allocateAsset);
assetRoutes.post("/:id/retire", requireRoles(Role.ADMIN), validate({ params: idParams, body: retireAssetSchema }), assetController.retireAsset);
assetRoutes.get("/:id/qr", requireRoles(Role.ADMIN, Role.MANAGER, Role.AUDITOR), validate({ params: idParams }), assetController.getAssetQr);

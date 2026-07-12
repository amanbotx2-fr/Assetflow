import { Router } from "express";
import * as notificationController from "../controllers/notificationController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { idParams, paginationQuery } from "../validators/commonValidators.js";

export const notificationRoutes = Router();

notificationRoutes.use(authenticate);
notificationRoutes.get("/", validate({ query: paginationQuery }), notificationController.listNotifications);
notificationRoutes.patch("/read-all", notificationController.markAllRead);
notificationRoutes.patch("/:id/read", validate({ params: idParams }), notificationController.markRead);

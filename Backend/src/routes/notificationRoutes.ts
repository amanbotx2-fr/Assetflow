import { Router } from "express";
import * as notificationController from "../controllers/notificationController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { idParams, notificationQuerySchema } from "../validators/commonValidators.js";

export const notificationRoutes = Router();

notificationRoutes.use(authenticate);
notificationRoutes.get("/", validate({ query: notificationQuerySchema }), notificationController.listNotifications);
notificationRoutes.get("/unread-count", notificationController.unreadCount);
notificationRoutes.patch("/read-all", notificationController.markAllRead);
notificationRoutes.get("/:id", validate({ params: idParams }), notificationController.getNotification);
notificationRoutes.patch("/:id/read", validate({ params: idParams }), notificationController.markRead);
notificationRoutes.delete("/:id", validate({ params: idParams }), notificationController.deleteNotification);

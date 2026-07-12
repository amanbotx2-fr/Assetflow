import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import * as notificationService from "../services/notificationService.js";

export const listNotifications = asyncHandler(async (req, res) => {
  sendSuccess(res, await notificationService.listNotifications(req.query, req.user!));
});

export const markRead = asyncHandler(async (req, res) => {
  sendSuccess(res, await notificationService.markNotificationRead(String(req.params.id), req.user!));
});

export const markAllRead = asyncHandler(async (req, res) => {
  sendSuccess(res, await notificationService.markAllNotificationsRead(req.user!));
});

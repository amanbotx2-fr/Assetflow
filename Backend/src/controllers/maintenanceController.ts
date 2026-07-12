import { asyncHandler } from "../utils/asyncHandler.js";
import { sendCreated, sendSuccess } from "../utils/response.js";
import * as maintenanceService from "../services/maintenanceService.js";

export const listMaintenanceTickets = asyncHandler(async (req, res) => {
  sendSuccess(res, await maintenanceService.listMaintenanceTickets(req.query, req.user!));
});

export const getMaintenanceTicket = asyncHandler(async (req, res) => {
  sendSuccess(res, await maintenanceService.getMaintenanceTicket(String(req.params.id), req.user!));
});

export const createMaintenanceTicket = asyncHandler(async (req, res) => {
  sendCreated(res, await maintenanceService.createMaintenanceTicket(req.body, req.user!));
});

export const updateMaintenanceTicket = asyncHandler(async (req, res) => {
  sendSuccess(res, await maintenanceService.updateMaintenanceTicket(String(req.params.id), req.body, req.user!));
});

export const closeMaintenanceTicket = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await maintenanceService.closeMaintenanceTicket(String(req.params.id), req.body.resolutionNotes, req.user!)
  );
});

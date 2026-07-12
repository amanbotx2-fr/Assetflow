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

export const deleteMaintenanceTicket = asyncHandler(async (req, res) => {
  sendSuccess(res, await maintenanceService.deleteMaintenanceTicket(String(req.params.id), req.user!));
});

export const approveMaintenanceTicket = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await maintenanceService.approveMaintenanceTicket(String(req.params.id), req.user!, req.body.decisionNotes)
  );
});

export const rejectMaintenanceTicket = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await maintenanceService.rejectMaintenanceTicket(String(req.params.id), req.user!, req.body.decisionNotes)
  );
});

export const assignMaintenanceTicket = asyncHandler(async (req, res) => {
  sendSuccess(res, await maintenanceService.assignMaintenanceTicket(String(req.params.id), req.body, req.user!));
});

export const startMaintenanceTicket = asyncHandler(async (req, res) => {
  sendSuccess(res, await maintenanceService.startMaintenanceTicket(String(req.params.id), req.user!));
});

export const resolveMaintenanceTicket = asyncHandler(async (req, res) => {
  sendSuccess(res, await maintenanceService.resolveMaintenanceTicket(String(req.params.id), req.body, req.user!));
});

export const closeMaintenanceTicket = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await maintenanceService.closeMaintenanceTicket(String(req.params.id), req.body, req.user!)
  );
});

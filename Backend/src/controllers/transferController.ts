import { asyncHandler } from "../utils/asyncHandler.js";
import { sendCreated, sendSuccess } from "../utils/response.js";
import * as transferService from "../services/transferService.js";

export const listTransfers = asyncHandler(async (req, res) => {
  sendSuccess(res, await transferService.listTransfers(req.query, req.user!));
});

export const getTransfer = asyncHandler(async (req, res) => {
  sendSuccess(res, await transferService.getTransfer(String(req.params.id), req.user!));
});

export const createTransfer = asyncHandler(async (req, res) => {
  sendCreated(res, await transferService.createTransfer(req.body, req.user!));
});

export const approveTransfer = asyncHandler(async (req, res) => {
  sendSuccess(res, await transferService.approveTransfer(String(req.params.id), req.user!, req.body.decisionNotes));
});

export const rejectTransfer = asyncHandler(async (req, res) => {
  sendSuccess(res, await transferService.rejectTransfer(String(req.params.id), req.user!, req.body.decisionNotes));
});

export const cancelTransfer = asyncHandler(async (req, res) => {
  sendSuccess(res, await transferService.cancelTransfer(String(req.params.id), req.user!));
});

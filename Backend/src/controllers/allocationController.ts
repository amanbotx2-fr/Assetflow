import { asyncHandler } from "../utils/asyncHandler.js";
import { sendCreated, sendSuccess } from "../utils/response.js";
import * as allocationService from "../services/allocationService.js";

export const listAllocations = asyncHandler(async (req, res) => {
  sendSuccess(res, await allocationService.listAllocations(req.query, req.user!));
});

export const getAllocation = asyncHandler(async (req, res) => {
  sendSuccess(res, await allocationService.getAllocation(String(req.params.id), req.user!));
});

export const createAllocation = asyncHandler(async (req, res) => {
  sendCreated(res, await allocationService.createAllocation(req.body, req.user!));
});

export const updateAllocation = asyncHandler(async (req, res) => {
  sendSuccess(res, await allocationService.updateAllocation(String(req.params.id), req.body, req.user!));
});

export const returnAllocation = asyncHandler(async (req, res) => {
  sendSuccess(res, await allocationService.returnAllocation(String(req.params.id), req.body, req.user!), "Asset returned.");
});

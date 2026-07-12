import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import * as reportService from "../services/reportService.js";

export const summary = asyncHandler(async (req, res) => {
  sendSuccess(res, await reportService.getSummaryReport(req.query, req.user!));
});

export const assets = asyncHandler(async (req, res) => {
  sendSuccess(res, await reportService.getAssetReport(req.query, req.user!));
});

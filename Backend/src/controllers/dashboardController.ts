import * as dashboardService from "../services/dashboardService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";

export const overview = asyncHandler(async (req, res) => {
  sendSuccess(res, await dashboardService.getDashboardOverview(req.user!, req.query));
});

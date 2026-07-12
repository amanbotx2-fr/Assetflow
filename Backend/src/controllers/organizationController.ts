import * as organizationService from "../services/organizationService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";

export const overview = asyncHandler(async (req, res) => {
  sendSuccess(res, await organizationService.getOrganizationOverview(req.user!));
});

import * as settingsService from "../services/settingsService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";

export const getCompany = asyncHandler(async (_req, res) => {
  sendSuccess(res, await settingsService.getCompanySettings());
});

export const updateCompany = asyncHandler(async (req, res) => {
  sendSuccess(res, await settingsService.updateCompanySettings(req.body, req.user!));
});

export const getProfile = asyncHandler(async (req, res) => {
  sendSuccess(res, await settingsService.getProfileSettings(req.user!));
});

export const updateProfile = asyncHandler(async (req, res) => {
  sendSuccess(res, await settingsService.updateProfileSettings(req.body, req.user!));
});

export const getRoles = asyncHandler(async (_req, res) => {
  sendSuccess(res, settingsService.getRoles());
});

export const getPermissions = asyncHandler(async (_req, res) => {
  sendSuccess(res, settingsService.getPermissions());
});

export const getAssetConfiguration = asyncHandler(async (_req, res) => {
  sendSuccess(res, await settingsService.getAssetConfiguration());
});

export const updateAssetConfiguration = asyncHandler(async (req, res) => {
  sendSuccess(res, await settingsService.updateAssetConfiguration(req.body, req.user!));
});

export const getBookingPolicies = asyncHandler(async (_req, res) => {
  sendSuccess(res, await settingsService.getBookingPolicies());
});

export const updateBookingPolicies = asyncHandler(async (req, res) => {
  sendSuccess(res, await settingsService.updateBookingPolicies(req.body, req.user!));
});

export const getMaintenancePolicies = asyncHandler(async (_req, res) => {
  sendSuccess(res, await settingsService.getMaintenancePolicies());
});

export const updateMaintenancePolicies = asyncHandler(async (req, res) => {
  sendSuccess(res, await settingsService.updateMaintenancePolicies(req.body, req.user!));
});

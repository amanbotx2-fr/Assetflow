import { asyncHandler } from "../utils/asyncHandler.js";
import { sendCreated, sendSuccess } from "../utils/response.js";
import * as assetService from "../services/assetService.js";

export const listAssets = asyncHandler(async (req, res) => {
  sendSuccess(res, await assetService.listAssets(req.query, req.user!));
});

export const createAsset = asyncHandler(async (req, res) => {
  sendCreated(res, await assetService.createAsset(req.body, req.user!));
});

export const lookupAsset = asyncHandler(async (req, res) => {
  sendSuccess(res, await assetService.lookupAsset(req.query, req.user!));
});

export const getAsset = asyncHandler(async (req, res) => {
  sendSuccess(res, await assetService.getAsset(String(req.params.id), req.user!));
});

export const updateAsset = asyncHandler(async (req, res) => {
  sendSuccess(res, await assetService.updateAsset(String(req.params.id), req.body, req.user!));
});

export const deleteAsset = asyncHandler(async (req, res) => {
  sendSuccess(res, await assetService.deleteAsset(String(req.params.id), req.user!), "Asset soft deleted.");
});

export const allocateAsset = asyncHandler(async (req, res) => {
  sendCreated(res, await assetService.allocateAsset(String(req.params.id), req.body, req.user!), "Asset allocated.");
});

export const retireAsset = asyncHandler(async (req, res) => {
  sendSuccess(res, await assetService.retireAsset(String(req.params.id), req.body.reason, req.user!), "Asset retired.");
});

export const getAssetQr = asyncHandler(async (req, res) => {
  sendSuccess(res, await assetService.getAssetQr(String(req.params.id), req.user!));
});

import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import * as reportService from "../services/reportService.js";

export const summary = asyncHandler(async (req, res) => {
  sendSuccess(res, await reportService.getSummaryReport(req.query, req.user!));
});

export const dashboard = asyncHandler(async (req, res) => {
  sendSuccess(res, await reportService.getDashboardReport(req.query, req.user!));
});

export const assets = asyncHandler(async (req, res) => {
  sendSuccess(res, await reportService.getAssetReport(req.query, req.user!));
});

export const bookings = asyncHandler(async (req, res) => {
  sendSuccess(res, await reportService.getBookingReport(req.query, req.user!));
});

export const maintenance = asyncHandler(async (req, res) => {
  sendSuccess(res, await reportService.getMaintenanceReport(req.query, req.user!));
});

export const audits = asyncHandler(async (req, res) => {
  sendSuccess(res, await reportService.getAuditAnalyticsReport(req.query, req.user!));
});

export const utilization = asyncHandler(async (req, res) => {
  sendSuccess(res, await reportService.getUtilizationReport(req.query, req.user!));
});

export const departmentUtilization = asyncHandler(async (req, res) => {
  sendSuccess(res, await reportService.getDepartmentUtilizationReport(req.query, req.user!));
});

export const idleAssets = asyncHandler(async (req, res) => {
  sendSuccess(res, await reportService.getIdleAssetsReport(req.query, req.user!));
});

export const mostUsedAssets = asyncHandler(async (req, res) => {
  sendSuccess(res, await reportService.getMostUsedAssetsReport(req.query, req.user!));
});

export const nearRetirement = asyncHandler(async (req, res) => {
  sendSuccess(res, await reportService.getNearRetirementReport(req.query, req.user!));
});

export const exportReport = asyncHandler(async (req, res) => {
  const exportResult = await reportService.getExportReport(req.query, req.user!);

  if ("body" in exportResult) {
    res.setHeader("Content-Type", exportResult.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${exportResult.fileName}"`);
    return res.status(200).send(exportResult.body);
  }

  sendSuccess(res, exportResult);
});

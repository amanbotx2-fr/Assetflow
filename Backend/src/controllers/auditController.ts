import { asyncHandler } from "../utils/asyncHandler.js";
import { sendCreated, sendSuccess } from "../utils/response.js";
import * as auditService from "../services/auditService.js";

export const listAuditRecords = asyncHandler(async (req, res) => {
  sendSuccess(res, await auditService.listAuditRecords(req.query));
});

export const createAuditRecord = asyncHandler(async (req, res) => {
  sendCreated(res, await auditService.createAuditRecord(req.body, req.user!));
});

export const listAuditLogs = asyncHandler(async (req, res) => {
  sendSuccess(res, await auditService.listAuditLogs(req.query));
});

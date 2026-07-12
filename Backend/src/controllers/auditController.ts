import { asyncHandler } from "../utils/asyncHandler.js";
import { sendCreated, sendSuccess } from "../utils/response.js";
import * as auditService from "../services/auditService.js";

export const listAuditRecords = asyncHandler(async (req, res) => {
  sendSuccess(res, await auditService.listAudits(req.query, req.user!));
});

export const createAuditRecord = asyncHandler(async (req, res) => {
  sendCreated(res, await auditService.createAudit(req.body, req.user!));
});

export const getAudit = asyncHandler(async (req, res) => {
  sendSuccess(res, await auditService.getAudit(String(req.params.id), req.user!));
});

export const updateAudit = asyncHandler(async (req, res) => {
  sendSuccess(res, await auditService.updateAudit(String(req.params.id), req.body, req.user!));
});

export const deleteAudit = asyncHandler(async (req, res) => {
  sendSuccess(res, await auditService.deleteAudit(String(req.params.id), req.user!));
});

export const startAudit = asyncHandler(async (req, res) => {
  sendSuccess(res, await auditService.startAudit(String(req.params.id), req.user!));
});

export const verifyAuditAsset = asyncHandler(async (req, res) => {
  sendSuccess(res, await auditService.verifyAuditAsset(String(req.params.id), req.body, req.user!));
});

export const completeAudit = asyncHandler(async (req, res) => {
  sendSuccess(res, await auditService.completeAudit(String(req.params.id), req.user!));
});

export const closeAudit = asyncHandler(async (req, res) => {
  sendSuccess(res, await auditService.closeAudit(String(req.params.id), req.user!));
});

export const listAuditDiscrepancies = asyncHandler(async (req, res) => {
  sendSuccess(res, await auditService.listAuditDiscrepancies(String(req.params.id), req.query, req.user!));
});

export const listAuditLogs = asyncHandler(async (req, res) => {
  sendSuccess(res, await auditService.listAuditLogs(req.query));
});

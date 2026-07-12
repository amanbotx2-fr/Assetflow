import { asyncHandler } from "../utils/asyncHandler.js";
import { sendCreated, sendSuccess } from "../utils/response.js";
import * as referenceService from "../services/referenceService.js";

export const listUsers = asyncHandler(async (req, res) => {
  sendSuccess(res, await referenceService.listUsers(req.query, req.user!));
});

export const createUser = asyncHandler(async (req, res) => {
  sendCreated(res, await referenceService.createUser(req.body, req.user!.id));
});

export const updateUser = asyncHandler(async (req, res) => {
  sendSuccess(res, await referenceService.updateUser(String(req.params.id), req.body, req.user!.id));
});

export const listDepartments = asyncHandler(async (req, res) => {
  sendSuccess(res, await referenceService.listDepartments(req.query));
});

export const createDepartment = asyncHandler(async (req, res) => {
  sendCreated(res, await referenceService.createDepartment(req.body, req.user!.id));
});

export const updateDepartment = asyncHandler(async (req, res) => {
  sendSuccess(res, await referenceService.updateDepartment(String(req.params.id), req.body, req.user!.id));
});

export const deleteDepartment = asyncHandler(async (req, res) => {
  sendSuccess(res, await referenceService.deleteDepartment(String(req.params.id), req.user!.id));
});

export const listCategories = asyncHandler(async (req, res) => {
  sendSuccess(res, await referenceService.listCategories(req.query));
});

export const createCategory = asyncHandler(async (req, res) => {
  sendCreated(res, await referenceService.createCategory(req.body, req.user!.id));
});

export const updateCategory = asyncHandler(async (req, res) => {
  sendSuccess(res, await referenceService.updateCategory(String(req.params.id), req.body, req.user!.id));
});

export const deleteCategory = asyncHandler(async (req, res) => {
  sendSuccess(res, await referenceService.deleteCategory(String(req.params.id), req.user!.id));
});

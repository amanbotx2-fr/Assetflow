import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import * as authService from "../services/authService.js";

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body.email, req.body.password);
  sendSuccess(res, result, "Login successful.");
});

export const me = asyncHandler(async (req, res) => {
  const result = await authService.getCurrentUser(req.user!.id);
  sendSuccess(res, result);
});

export const logout = asyncHandler(async (_req, res) => {
  sendSuccess(res, { loggedOut: true }, "Logged out.");
});

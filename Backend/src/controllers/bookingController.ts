import { asyncHandler } from "../utils/asyncHandler.js";
import { sendCreated, sendSuccess } from "../utils/response.js";
import * as bookingService from "../services/bookingService.js";

export const listBookings = asyncHandler(async (req, res) => {
  sendSuccess(res, await bookingService.listBookings(req.query, req.user!));
});

export const createBooking = asyncHandler(async (req, res) => {
  sendCreated(res, await bookingService.createBooking(req.body, req.user!));
});

export const approveBooking = asyncHandler(async (req, res) => {
  sendSuccess(res, await bookingService.approveBooking(String(req.params.id), req.user!, req.body.decisionNotes));
});

export const rejectBooking = asyncHandler(async (req, res) => {
  sendSuccess(res, await bookingService.rejectBooking(String(req.params.id), req.user!, req.body.decisionNotes));
});

export const cancelBooking = asyncHandler(async (req, res) => {
  sendSuccess(res, await bookingService.cancelBooking(String(req.params.id), req.user!));
});

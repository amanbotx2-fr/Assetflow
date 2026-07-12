import { asyncHandler } from "../utils/asyncHandler.js";
import { sendCreated, sendSuccess } from "../utils/response.js";
import * as bookingService from "../services/bookingService.js";

export const listBookings = asyncHandler(async (req, res) => {
  sendSuccess(res, await bookingService.listBookings(req.query, req.user!));
});

export const getCalendar = asyncHandler(async (req, res) => {
  sendSuccess(res, await bookingService.getCalendar(req.query, req.user!));
});

export const getAvailability = asyncHandler(async (req, res) => {
  sendSuccess(res, await bookingService.getAvailability(req.query as { resourceId: string; date: string }, req.user!));
});

export const getBooking = asyncHandler(async (req, res) => {
  sendSuccess(res, await bookingService.getBooking(String(req.params.id), req.user!));
});

export const createBooking = asyncHandler(async (req, res) => {
  sendCreated(res, await bookingService.createBooking(req.body, req.user!));
});

export const updateBooking = asyncHandler(async (req, res) => {
  sendSuccess(res, await bookingService.updateBooking(String(req.params.id), req.body, req.user!));
});

export const deleteBooking = asyncHandler(async (req, res) => {
  sendSuccess(res, await bookingService.deleteBooking(String(req.params.id), req.user!), "Booking cancelled.");
});

export const approveBooking = asyncHandler(async (req, res) => {
  sendSuccess(res, await bookingService.approveBooking(String(req.params.id), req.user!, req.body.decisionNotes));
});

export const rejectBooking = asyncHandler(async (req, res) => {
  sendSuccess(res, await bookingService.rejectBooking(String(req.params.id), req.user!, req.body.decisionNotes));
});

export const cancelBooking = asyncHandler(async (req, res) => {
  sendSuccess(res, await bookingService.cancelBooking(String(req.params.id), req.user!, req.body.reason));
});

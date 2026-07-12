import { Router } from "express";
import { Role } from "@prisma/client";
import * as bookingController from "../controllers/bookingController.js";
import { authenticate } from "../middleware/auth.js";
import { requireRoles } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { decisionSchema, idParams } from "../validators/commonValidators.js";
import {
  bookingAvailabilityQuerySchema,
  bookingCalendarQuerySchema,
  bookingListQuerySchema,
  cancelSchema,
  createBookingSchema,
  updateBookingSchema
} from "../validators/workflowValidators.js";

export const bookingRoutes = Router();

bookingRoutes.use(authenticate);
bookingRoutes.get("/", requireRoles(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.AUDITOR), validate({ query: bookingListQuerySchema }), bookingController.listBookings);
bookingRoutes.get("/calendar", requireRoles(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.AUDITOR), validate({ query: bookingCalendarQuerySchema }), bookingController.getCalendar);
bookingRoutes.get("/availability", requireRoles(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.AUDITOR), validate({ query: bookingAvailabilityQuerySchema }), bookingController.getAvailability);
bookingRoutes.post("/", requireRoles(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE), validate({ body: createBookingSchema }), bookingController.createBooking);
bookingRoutes.get("/:id", requireRoles(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.AUDITOR), validate({ params: idParams }), bookingController.getBooking);
bookingRoutes.patch("/:id", requireRoles(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE), validate({ params: idParams, body: updateBookingSchema }), bookingController.updateBooking);
bookingRoutes.delete("/:id", requireRoles(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE), validate({ params: idParams }), bookingController.deleteBooking);
bookingRoutes.patch("/:id/approve", requireRoles(Role.ADMIN, Role.MANAGER), validate({ params: idParams, body: decisionSchema }), bookingController.approveBooking);
bookingRoutes.patch("/:id/reject", requireRoles(Role.ADMIN, Role.MANAGER), validate({ params: idParams, body: decisionSchema }), bookingController.rejectBooking);
bookingRoutes.patch("/:id/cancel", requireRoles(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE), validate({ params: idParams, body: cancelSchema }), bookingController.cancelBooking);

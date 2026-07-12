import { Router } from "express";
import { Role } from "@prisma/client";
import * as bookingController from "../controllers/bookingController.js";
import { authenticate } from "../middleware/auth.js";
import { requireRoles } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { decisionSchema, idParams, paginationQuery } from "../validators/commonValidators.js";
import { cancelSchema, createBookingSchema } from "../validators/workflowValidators.js";

export const bookingRoutes = Router();

bookingRoutes.use(authenticate);
bookingRoutes.get("/", validate({ query: paginationQuery }), bookingController.listBookings);
bookingRoutes.post("/", requireRoles(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE), validate({ body: createBookingSchema }), bookingController.createBooking);
bookingRoutes.patch("/:id/approve", requireRoles(Role.ADMIN, Role.MANAGER), validate({ params: idParams, body: decisionSchema }), bookingController.approveBooking);
bookingRoutes.patch("/:id/reject", requireRoles(Role.ADMIN, Role.MANAGER), validate({ params: idParams, body: decisionSchema }), bookingController.rejectBooking);
bookingRoutes.patch("/:id/cancel", validate({ params: idParams, body: cancelSchema }), bookingController.cancelBooking);

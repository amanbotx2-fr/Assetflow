import { Router } from "express";
import * as dashboardController from "../controllers/dashboardController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { dashboardOverviewQuerySchema } from "../validators/dashboardValidators.js";

export const dashboardRoutes = Router();

dashboardRoutes.use(authenticate);
dashboardRoutes.get("/overview", validate({ query: dashboardOverviewQuerySchema }), dashboardController.overview);

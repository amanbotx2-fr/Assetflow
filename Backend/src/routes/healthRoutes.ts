import { Router } from "express";
import * as healthController from "../controllers/healthController.js";

export const healthRoutes = Router();

healthRoutes.get("/health", healthController.health);
healthRoutes.get("/health/db", healthController.databaseHealth);

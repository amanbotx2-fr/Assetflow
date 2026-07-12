import { Router } from "express";
import * as authController from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { loginSchema } from "../validators/authValidators.js";

export const authRoutes = Router();

authRoutes.post("/login", validate({ body: loginSchema }), authController.login);
authRoutes.get("/me", authenticate, authController.me);
authRoutes.post("/logout", authenticate, authController.logout);

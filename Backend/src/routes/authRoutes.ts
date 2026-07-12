import { Router } from "express";
import * as authController from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { loginSchema, registerSchema } from "../validators/authValidators.js";

export const authRoutes = Router();

authRoutes.post("/login", validate({ body: loginSchema }), authController.login);
authRoutes.get("/registration-options", authController.registrationOptions);
authRoutes.post("/register", validate({ body: registerSchema }), authController.register);
authRoutes.get("/me", authenticate, authController.me);
authRoutes.post("/logout", authenticate, authController.logout);

import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { API_PREFIX } from "./constants/api.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { healthRoutes } from "./routes/healthRoutes.js";
import { apiRoutes } from "./routes/index.js";

export const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN,
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(healthRoutes);
app.use(API_PREFIX, apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

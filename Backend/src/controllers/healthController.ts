import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";

export const health = asyncHandler(async (_req, res) => {
  sendSuccess(res, { service: "assetflow-backend", status: "ok" });
});

export const databaseHealth = asyncHandler(async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  sendSuccess(res, { service: "assetflow-backend", database: "connected" });
});

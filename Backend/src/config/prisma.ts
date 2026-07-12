import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";

const logLevels = env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"];

export const prisma = new PrismaClient({
  log: logLevels as ("query" | "error" | "warn")[]
});

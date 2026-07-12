import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../config/prisma.js";

type DbClient = PrismaClient | Prisma.TransactionClient;

export const createAuditLog = (
  data: {
    actorId?: string | null;
    entityType: string;
    entityId: string;
    action: string;
    metadata?: unknown;
  },
  client: DbClient = prisma
) => {
  return client.auditLog.create({
    data: {
      ...data,
      metadata: data.metadata as Prisma.InputJsonValue | undefined
    }
  });
};

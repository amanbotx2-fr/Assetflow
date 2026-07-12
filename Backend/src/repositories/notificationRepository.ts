import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../config/prisma.js";

type DbClient = PrismaClient | Prisma.TransactionClient;

export const createNotification = (
  data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
  },
  client: DbClient = prisma
) => {
  return client.notification.create({ data });
};

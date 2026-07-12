import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../config/prisma.js";

type DbClient = PrismaClient | Prisma.TransactionClient;

type NotificationCategory =
  | "BOOKING"
  | "ALLOCATION"
  | "TRANSFER"
  | "MAINTENANCE"
  | "AUDIT"
  | "SYSTEM"
  | "APPROVAL"
  | "ASSET";

type NotificationPriority = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

const approvalTypes = new Set([
  "BOOKING_APPROVAL_REQUIRED",
  "MAINTENANCE_APPROVAL_REQUIRED",
  "TRANSFER_APPROVAL_REQUIRED"
]);

const criticalTypes = new Set(["AUDIT_ASSET_MISSING", "AUDIT_ASSET_DAMAGED", "CRITICAL_MAINTENANCE", "SYSTEM_ALERT"]);

const deriveCategory = (type: string): NotificationCategory => {
  if (approvalTypes.has(type) || type.includes("APPROVAL")) return "APPROVAL";
  if (type.startsWith("BOOKING")) return "BOOKING";
  if (type.startsWith("TRANSFER") || type === "ASSET_TRANSFERRED") return "TRANSFER";
  if (type === "ASSET_ALLOCATED" || type === "ASSET_RETURNED") return "ALLOCATION";
  if (type.startsWith("MAINTENANCE")) return "MAINTENANCE";
  if (type.startsWith("AUDIT")) return "AUDIT";
  if (type.startsWith("ASSET")) return "ASSET";
  return "SYSTEM";
};

const derivePriority = (type: string, category: NotificationCategory): NotificationPriority => {
  if (criticalTypes.has(type)) return "CRITICAL";
  if (type.endsWith("_REJECTED") || type.endsWith("_APPROVAL_REQUIRED") || category === "APPROVAL") return "HIGH";
  if (
    type.endsWith("_APPROVED") ||
    type.endsWith("_ASSIGNED") ||
    type.endsWith("_STARTED") ||
    type.endsWith("_RESOLVED") ||
    type.endsWith("_RETURNED") ||
    type.endsWith("_ALLOCATED") ||
    type === "ASSET_ALLOCATED"
  ) {
    return "MEDIUM";
  }
  return "INFO";
};

export const createNotification = async (
  data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    priority?: NotificationPriority;
    category?: NotificationCategory;
    relatedEntityType?: string;
    relatedEntityId?: string;
  },
  client: DbClient = prisma
) => {
  if (data.relatedEntityType && data.relatedEntityId) {
    const existing = await client.notification.findFirst({
      where: {
        userId: data.userId,
        type: data.type,
        relatedEntityType: data.relatedEntityType,
        relatedEntityId: data.relatedEntityId,
        isRead: false
      },
      orderBy: { createdAt: "desc" }
    });

    if (existing) return existing;
  }

  const category = data.category ?? deriveCategory(data.type);
  const priority = data.priority ?? derivePriority(data.type, category);

  return client.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      category,
      priority,
      title: data.title,
      message: data.message,
      relatedEntityType: data.relatedEntityType,
      relatedEntityId: data.relatedEntityId
    }
  });
};

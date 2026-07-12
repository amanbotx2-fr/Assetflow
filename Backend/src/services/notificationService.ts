import { prisma } from "../config/prisma.js";
import { forbidden, notFound } from "../utils/httpError.js";
import { getPagination, paginated } from "../utils/pagination.js";

export const listNotifications = async (query: Record<string, unknown>, actor: Express.User) => {
  const { page, limit, skip } = getPagination(query);
  const where: Record<string, unknown> = { userId: actor.id };
  if (typeof query.isRead === "boolean") where.isRead = query.isRead;

  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: actor.id, isRead: false } })
  ]);

  return { ...paginated(items, total, page, limit), unreadCount };
};

export const markNotificationRead = async (id: string, actor: Express.User) => {
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) throw notFound("Notification not found.");
  if (notification.userId !== actor.id) throw forbidden("You can only update your own notifications.");

  return prisma.notification.update({ where: { id }, data: { isRead: true } });
};

export const markAllNotificationsRead = async (actor: Express.User) => {
  const result = await prisma.notification.updateMany({
    where: { userId: actor.id, isRead: false },
    data: { isRead: true }
  });

  return { updated: result.count };
};

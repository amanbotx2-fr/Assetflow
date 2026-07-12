import { Prisma, Role } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { forbidden, notFound } from "../utils/httpError.js";
import { getPagination, paginated } from "../utils/pagination.js";

const notificationCategories = new Set([
  "BOOKING",
  "ALLOCATION",
  "TRANSFER",
  "MAINTENANCE",
  "AUDIT",
  "SYSTEM",
  "APPROVAL",
  "ASSET"
]);

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  departmentId: true
} satisfies Prisma.UserSelect;

const hasWhere = (where: Prisma.NotificationWhereInput) => Object.keys(where).length > 0;

const andWhere = (...clauses: Prisma.NotificationWhereInput[]): Prisma.NotificationWhereInput => {
  const activeClauses = clauses.filter(hasWhere);
  if (activeClauses.length === 0) return {};
  if (activeClauses.length === 1) return activeClauses[0];
  return { AND: activeClauses };
};

const textContains = (value: string) => ({
  contains: value,
  mode: Prisma.QueryMode.insensitive
});

export const buildNotificationScopeWhere = (actor: Express.User): Prisma.NotificationWhereInput => {
  if (actor.role === Role.ADMIN || actor.role === Role.AUDITOR) return {};

  if (actor.role === Role.MANAGER) {
    if (!actor.departmentId) return { userId: actor.id };
    return { OR: [{ userId: actor.id }, { user: { departmentId: actor.departmentId } }] };
  }

  return { userId: actor.id };
};

const buildNotificationFilterWhere = (query: Record<string, unknown>): Prisma.NotificationWhereInput => {
  const clauses: Prisma.NotificationWhereInput[] = [];

  if (typeof query.isRead === "boolean") clauses.push({ isRead: query.isRead });
  if (query.status === "read") clauses.push({ isRead: true });
  if (query.status === "unread") clauses.push({ isRead: false });
  if (query.type) {
    const type = String(query.type).toUpperCase();
    clauses.push(notificationCategories.has(type) ? { category: type } : { type });
  }
  if (query.priority) clauses.push({ priority: String(query.priority).toUpperCase() });
  if (query.from || query.to) {
    clauses.push({
      createdAt: {
        gte: query.from ? new Date(String(query.from)) : undefined,
        lte: query.to ? new Date(String(query.to)) : undefined
      }
    });
  }
  if (query.search) {
    const search = String(query.search);
    clauses.push({
      OR: [
        { title: textContains(search) },
        { message: textContains(search) },
        { type: textContains(search) },
        { category: textContains(search) },
        { relatedEntityType: textContains(search) }
      ]
    });
  }

  return andWhere(...clauses);
};

const buildNotificationWhere = (query: Record<string, unknown>, actor: Express.User) =>
  andWhere(buildNotificationScopeWhere(actor), buildNotificationFilterWhere(query));

const buildOrderBy = (query: Record<string, unknown>): Prisma.NotificationOrderByWithRelationInput => {
  const sortBy = String(query.sortBy ?? "createdAt");
  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

  if (sortBy === "title") return { title: sortOrder };
  if (sortBy === "type") return { type: sortOrder };
  if (sortBy === "priority") return { priority: sortOrder };
  if (sortBy === "updatedAt") return { updatedAt: sortOrder };
  return { createdAt: sortOrder };
};

const formatNotification = (
  notification: Prisma.NotificationGetPayload<{ include: { user: { select: typeof userSelect } } }>
) => ({
  ...notification,
  status: notification.isRead ? "read" : "unread",
  recipient: notification.user
});

const getNotificationOrThrow = async (id: string, actor: Express.User) => {
  const notification = await prisma.notification.findFirst({
    where: andWhere({ id }, buildNotificationScopeWhere(actor)),
    include: { user: { select: userSelect } }
  });

  if (!notification) throw notFound("Notification not found.");
  return notification;
};

const assertCanMutateNotification = (notification: { userId: string }, actor: Express.User) => {
  if (actor.role === Role.AUDITOR) throw forbidden("Auditors have read-only notification access.");
  if (actor.role === Role.ADMIN) return;
  if (actor.role === Role.MANAGER) return;
  if (notification.userId !== actor.id) throw forbidden("You can only update your own notifications.");
};

export const listNotifications = async (query: Record<string, unknown>, actor: Express.User) => {
  const { page, limit, skip } = getPagination(query);
  const where = buildNotificationWhere(query, actor);
  const unreadWhere = andWhere(buildNotificationScopeWhere(actor), { isRead: false });

  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      include: { user: { select: userSelect } },
      orderBy: buildOrderBy(query),
      skip,
      take: limit
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: unreadWhere })
  ]);

  return { ...paginated(items.map(formatNotification), total, page, limit), unreadCount };
};

export const getNotification = async (id: string, actor: Express.User) => {
  const notification = await getNotificationOrThrow(id, actor);
  return formatNotification(notification);
};

export const markNotificationRead = async (id: string, actor: Express.User) => {
  const notification = await getNotificationOrThrow(id, actor);
  assertCanMutateNotification(notification, actor);

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true, readAt: notification.readAt ?? new Date() },
    include: { user: { select: userSelect } }
  });

  return formatNotification(updated);
};

export const markAllNotificationsRead = async (actor: Express.User) => {
  if (actor.role === Role.AUDITOR) throw forbidden("Auditors have read-only notification access.");

  const result = await prisma.$transaction(async (tx) => {
    const where = andWhere(buildNotificationScopeWhere(actor), { isRead: false });
    return tx.notification.updateMany({
      where,
      data: { isRead: true, readAt: new Date() }
    });
  });

  return { updated: result.count };
};

export const deleteNotification = async (id: string, actor: Express.User) => {
  const notification = await getNotificationOrThrow(id, actor);
  assertCanMutateNotification(notification, actor);

  await prisma.notification.delete({ where: { id } });
  return formatNotification(notification);
};

export const getUnreadNotificationCount = async (actor: Express.User) => {
  const unreadCount = await prisma.notification.count({
    where: andWhere(buildNotificationScopeWhere(actor), { isRead: false })
  });

  return { unreadCount, notificationBadgeCount: unreadCount };
};

export const getNotificationDashboardSummary = async (actor: Express.User) => {
  const scopeWhere = buildNotificationScopeWhere(actor);
  const [unreadCount, recent, criticalAlerts] = await Promise.all([
    prisma.notification.count({ where: andWhere(scopeWhere, { isRead: false }) }),
    prisma.notification.findMany({
      where: scopeWhere,
      include: { user: { select: userSelect } },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.notification.findMany({
      where: andWhere(scopeWhere, { isRead: false, priority: "CRITICAL" }),
      include: { user: { select: userSelect } },
      orderBy: { createdAt: "desc" },
      take: 5
    })
  ]);

  return {
    unreadCount,
    notificationBadgeCount: unreadCount,
    recent: recent.map(formatNotification),
    criticalAlerts: criticalAlerts.map(formatNotification)
  };
};

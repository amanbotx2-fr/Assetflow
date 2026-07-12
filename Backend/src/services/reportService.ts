import { BookingStatus, Role } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { getBookingStatistics } from "./bookingService.js";
import { getPagination, paginated } from "../utils/pagination.js";

const departmentFilter = (actor: Express.User, query: Record<string, unknown>) => {
  if (actor.role === Role.MANAGER) return actor.departmentId ?? undefined;
  return (query.departmentId as string | undefined) ?? undefined;
};

export const getSummaryReport = async (query: Record<string, unknown>, actor: Express.User) => {
  const departmentId = departmentFilter(actor, query);
  const assetWhere = departmentId ? { departmentId } : {};

  const [totalAssets, available, allocated, maintenance, lost, pendingTransfers, pendingBookings, openMaintenance] =
    await Promise.all([
      prisma.asset.count({ where: assetWhere }),
      prisma.asset.count({ where: { ...assetWhere, status: "AVAILABLE" } }),
      prisma.asset.count({ where: { ...assetWhere, status: "ALLOCATED" } }),
      prisma.asset.count({ where: { ...assetWhere, status: "MAINTENANCE" } }),
      prisma.asset.count({ where: { ...assetWhere, status: "LOST" } }),
      prisma.transfer.count({ where: { status: "PENDING" } }),
      prisma.booking.count({ where: { status: { in: [BookingStatus.REQUESTED, BookingStatus.PENDING] } } }),
      prisma.maintenanceTicket.count({ where: { status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] } } })
    ]);

  const byStatus = await prisma.asset.groupBy({
    by: ["status"],
    where: assetWhere,
    _count: { status: true }
  });

  const byCategory = await prisma.asset.groupBy({
    by: ["categoryId"],
    where: assetWhere,
    _count: { categoryId: true }
  });

  return {
    totalAssets,
    available,
    allocated,
    maintenance,
    lost,
    pendingTransfers,
    pendingBookings,
    openMaintenance,
    byStatus,
    byCategory
  };
};

export const getAssetReport = async (query: Record<string, unknown>, actor: Express.User) => {
  const { page, limit, skip } = getPagination(query);
  const where: Record<string, unknown> = {};
  const departmentId = departmentFilter(actor, query);
  if (departmentId) where.departmentId = departmentId;
  if (query.status) where.status = query.status;
  if (query.categoryId) where.categoryId = query.categoryId;

  const [items, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      include: {
        category: true,
        department: true,
        allocations: {
          where: { status: "ACTIVE" },
          include: { user: { select: { id: true, name: true, email: true } }, department: true }
        }
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    }),
    prisma.asset.count({ where })
  ]);

  return paginated(items, total, page, limit);
};

export const getBookingReport = async (query: Record<string, unknown>, actor: Express.User) => {
  return getBookingStatistics(query, actor);
};

import { Role } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { getPagination, paginated } from "../utils/pagination.js";
import { hashPassword } from "../utils/password.js";
import { forbidden } from "../utils/httpError.js";
import { createAuditLog } from "../repositories/auditLogRepository.js";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  departmentId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  department: { select: { id: true, name: true, code: true } }
};

export const listUsers = async (query: Record<string, unknown>, actor: Express.User) => {
  const { page, limit, skip } = getPagination(query);
  const where: Record<string, unknown> = {};

  if (query.status) where.status = query.status;
  if (query.role) where.role = query.role;
  if (query.departmentId) where.departmentId = query.departmentId;
  if (query.search) {
    where.OR = [
      { name: { contains: String(query.search), mode: "insensitive" } },
      { email: { contains: String(query.search), mode: "insensitive" } }
    ];
  }

  if (actor.role === Role.MANAGER) {
    where.departmentId = actor.departmentId;
  }

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    }),
    prisma.user.count({ where })
  ]);

  return paginated(items, total, page, limit);
};

export const createUser = async (data: {
  name: string;
  email: string;
  password: string;
  role: Role;
  departmentId?: string;
}, actorId: string) => {
  const passwordHash = await hashPassword(data.password);
  const created = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      departmentId: data.departmentId
    },
    select: userSelect
  });

  await createAuditLog({
    actorId,
    entityType: "User",
    entityId: created.id,
    action: "created",
    metadata: { email: created.email, role: created.role }
  });

  return created;
};

export const updateUser = async (id: string, data: Record<string, unknown>, actorId: string) => {
  const updated = await prisma.user.update({
    where: { id },
    data,
    select: userSelect
  });

  await createAuditLog({
    actorId,
    entityType: "User",
    entityId: updated.id,
    action: "updated",
    metadata: data
  });

  return updated;
};

export const listDepartments = async (query: Record<string, unknown>) => {
  const where: Record<string, unknown> = {};
  if (query.status) where.status = query.status;
  if (query.search) where.name = { contains: String(query.search), mode: "insensitive" };

  return prisma.department.findMany({
    where,
    include: { manager: { select: userSelect } },
    orderBy: { name: "asc" }
  });
};

export const createDepartment = async (data: {
  name: string;
  code: string;
  managerId?: string;
}, actorId: string) => {
  const created = await prisma.department.create({
    data: { ...data, code: data.code.toUpperCase() }
  });

  await createAuditLog({
    actorId,
    entityType: "Department",
    entityId: created.id,
    action: "created",
    metadata: { code: created.code }
  });

  return created;
};

export const updateDepartment = async (id: string, data: Record<string, unknown>, actorId: string) => {
  const updateData = { ...data };
  if (typeof updateData.code === "string") updateData.code = updateData.code.toUpperCase();

  const updated = await prisma.department.update({ where: { id }, data: updateData });
  await createAuditLog({
    actorId,
    entityType: "Department",
    entityId: updated.id,
    action: "updated",
    metadata: updateData
  });
  return updated;
};

export const listCategories = async (query: Record<string, unknown>) => {
  const where: Record<string, unknown> = {};
  if (query.status) where.status = query.status;
  if (query.search) where.name = { contains: String(query.search), mode: "insensitive" };

  return prisma.category.findMany({ where, orderBy: { name: "asc" } });
};

export const createCategory = async (data: {
  name: string;
  code: string;
  description?: string;
}, actorId: string) => {
  const created = await prisma.category.create({
    data: { ...data, code: data.code.toUpperCase() }
  });

  await createAuditLog({
    actorId,
    entityType: "Category",
    entityId: created.id,
    action: "created",
    metadata: { code: created.code }
  });

  return created;
};

export const updateCategory = async (id: string, data: Record<string, unknown>, actorId: string) => {
  const updateData = { ...data };
  if (typeof updateData.code === "string") updateData.code = updateData.code.toUpperCase();

  const updated = await prisma.category.update({ where: { id }, data: updateData });
  await createAuditLog({
    actorId,
    entityType: "Category",
    entityId: updated.id,
    action: "updated",
    metadata: updateData
  });
  return updated;
};

export const assertManagerCanAccessDepartment = (actor: Express.User, departmentId?: string | null) => {
  if (actor.role === Role.MANAGER && departmentId && actor.departmentId !== departmentId) {
    throw forbidden("Managers can only access their assigned department.");
  }
};

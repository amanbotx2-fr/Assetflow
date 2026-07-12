import { Prisma, RecordStatus, Role } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { getPagination, paginated } from "../utils/pagination.js";
import { hashPassword } from "../utils/password.js";
import { badRequest, forbidden, notFound } from "../utils/httpError.js";
import { createAuditLog } from "../repositories/auditLogRepository.js";

const basicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true
} satisfies Prisma.UserSelect;

const departmentSummarySelect = {
  id: true,
  name: true,
  code: true,
  managerId: true,
  parentDepartmentId: true,
  status: true
} satisfies Prisma.DepartmentSelect;

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  departmentId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  department: {
    select: {
      id: true,
      name: true,
      code: true,
      manager: { select: basicUserSelect }
    }
  }
} satisfies Prisma.UserSelect;

const departmentInclude = {
  manager: { select: basicUserSelect },
  parentDepartment: { select: departmentSummarySelect },
  _count: { select: { users: true, assets: true, childDepartments: true } }
} satisfies Prisma.DepartmentInclude;

const categoryInclude = {
  _count: { select: { assets: true } }
} satisfies Prisma.CategoryInclude;

type DepartmentWithSummary = Prisma.DepartmentGetPayload<{ include: typeof departmentInclude }>;
type CategoryWithSummary = Prisma.CategoryGetPayload<{ include: typeof categoryInclude }>;

const formatDepartment = (department: DepartmentWithSummary) => ({
  ...department,
  departmentHead: department.manager,
  employeeCount: department._count.users,
  assetCount: department._count.assets,
  childDepartmentCount: department._count.childDepartments
});

const formatCategory = (category: CategoryWithSummary) => ({
  ...category,
  assetCount: category._count.assets
});

const assertDepartmentExists = async (departmentId?: string | null) => {
  if (departmentId === undefined || departmentId === null) return;

  const department = await prisma.department.findUnique({ where: { id: departmentId }, select: { id: true } });
  if (!department) throw notFound("Department not found.");
};

const assertDepartmentHead = async (managerId?: string | null) => {
  if (managerId === undefined || managerId === null) return;

  const manager = await prisma.user.findUnique({
    where: { id: managerId },
    select: { id: true, role: true, status: true }
  });

  if (!manager) throw notFound("Department head not found.");
  const allowedHeadRoles: Role[] = [Role.ADMIN, Role.MANAGER];
  if (manager.status !== RecordStatus.ACTIVE || !allowedHeadRoles.includes(manager.role)) {
    throw badRequest("Department head must be an active admin or manager.");
  }
};

const assertParentDepartment = async (parentDepartmentId?: string | null, currentDepartmentId?: string) => {
  if (parentDepartmentId === undefined || parentDepartmentId === null) return;
  if (parentDepartmentId === currentDepartmentId) {
    throw badRequest("Department cannot be its own parent.");
  }

  let parent = await prisma.department.findUnique({
    where: { id: parentDepartmentId },
    select: { id: true, parentDepartmentId: true }
  });
  if (!parent) throw notFound("Parent department not found.");

  const visited = new Set<string>();
  while (parent?.parentDepartmentId) {
    if (parent.parentDepartmentId === currentDepartmentId || visited.has(parent.parentDepartmentId)) {
      throw badRequest("Circular parent department assignment is not allowed.");
    }
    visited.add(parent.parentDepartmentId);
    parent = await prisma.department.findUnique({
      where: { id: parent.parentDepartmentId },
      select: { id: true, parentDepartmentId: true }
    });
  }
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
  await assertDepartmentExists(data.departmentId);

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
  await assertDepartmentExists(data.departmentId as string | null | undefined);

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
  const { page, limit, skip } = getPagination(query);
  const where: Record<string, unknown> = {};
  if (query.status) where.status = query.status;
  if (query.parentDepartmentId) where.parentDepartmentId = query.parentDepartmentId;
  if (query.search) {
    where.OR = [
      { name: { contains: String(query.search), mode: "insensitive" } },
      { code: { contains: String(query.search), mode: "insensitive" } }
    ];
  }

  const [items, total] = await Promise.all([
    prisma.department.findMany({
      where,
      include: departmentInclude,
      orderBy: { name: "asc" },
      skip,
      take: limit
    }),
    prisma.department.count({ where })
  ]);

  return paginated(items.map(formatDepartment), total, page, limit);
};

export const createDepartment = async (data: {
  name: string;
  code: string;
  managerId?: string;
  parentDepartmentId?: string;
}, actorId: string) => {
  await assertDepartmentHead(data.managerId);
  await assertParentDepartment(data.parentDepartmentId);

  const created = await prisma.department.create({
    data: { ...data, code: data.code.toUpperCase() },
    include: departmentInclude
  });

  await createAuditLog({
    actorId,
    entityType: "Department",
    entityId: created.id,
    action: "created",
    metadata: { code: created.code }
  });

  return formatDepartment(created);
};

export const updateDepartment = async (id: string, data: Record<string, unknown>, actorId: string) => {
  const updateData = { ...data };
  if (typeof updateData.code === "string") updateData.code = updateData.code.toUpperCase();

  await assertDepartmentHead(updateData.managerId as string | null | undefined);
  await assertParentDepartment(updateData.parentDepartmentId as string | null | undefined, id);

  const updated = await prisma.department.update({ where: { id }, data: updateData, include: departmentInclude });
  await createAuditLog({
    actorId,
    entityType: "Department",
    entityId: updated.id,
    action: "updated",
    metadata: updateData
  });
  return formatDepartment(updated);
};

export const deleteDepartment = async (id: string, actorId: string) => {
  const updated = await prisma.department.update({
    where: { id },
    data: { status: RecordStatus.INACTIVE },
    include: departmentInclude
  });

  await createAuditLog({
    actorId,
    entityType: "Department",
    entityId: updated.id,
    action: "soft_deleted",
    metadata: { status: RecordStatus.INACTIVE }
  });

  return formatDepartment(updated);
};

export const listCategories = async (query: Record<string, unknown>) => {
  const { page, limit, skip } = getPagination(query);
  const where: Record<string, unknown> = {};
  if (query.status) where.status = query.status;
  if (query.search) {
    where.OR = [
      { name: { contains: String(query.search), mode: "insensitive" } },
      { code: { contains: String(query.search), mode: "insensitive" } },
      { description: { contains: String(query.search), mode: "insensitive" } }
    ];
  }

  const [items, total] = await Promise.all([
    prisma.category.findMany({ where, include: categoryInclude, orderBy: { name: "asc" }, skip, take: limit }),
    prisma.category.count({ where })
  ]);

  return paginated(items.map(formatCategory), total, page, limit);
};

export const createCategory = async (data: {
  name: string;
  code: string;
  description?: string;
}, actorId: string) => {
  const created = await prisma.category.create({
    data: { ...data, code: data.code.toUpperCase() },
    include: categoryInclude
  });

  await createAuditLog({
    actorId,
    entityType: "Category",
    entityId: created.id,
    action: "created",
    metadata: { code: created.code }
  });

  return formatCategory(created);
};

export const updateCategory = async (id: string, data: Record<string, unknown>, actorId: string) => {
  const updateData = { ...data };
  if (typeof updateData.code === "string") updateData.code = updateData.code.toUpperCase();

  const updated = await prisma.category.update({ where: { id }, data: updateData, include: categoryInclude });
  await createAuditLog({
    actorId,
    entityType: "Category",
    entityId: updated.id,
    action: "updated",
    metadata: updateData
  });
  return formatCategory(updated);
};

export const deleteCategory = async (id: string, actorId: string) => {
  const updated = await prisma.category.update({
    where: { id },
    data: { status: RecordStatus.INACTIVE },
    include: categoryInclude
  });

  await createAuditLog({
    actorId,
    entityType: "Category",
    entityId: updated.id,
    action: "soft_deleted",
    metadata: { status: RecordStatus.INACTIVE }
  });

  return formatCategory(updated);
};

export const assertManagerCanAccessDepartment = (actor: Express.User, departmentId?: string | null) => {
  if (actor.role === Role.MANAGER && departmentId && actor.departmentId !== departmentId) {
    throw forbidden("Managers can only access their assigned department.");
  }
};

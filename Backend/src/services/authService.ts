import { prisma } from "../config/prisma.js";
import { badRequest, notFound, unauthorized } from "../utils/httpError.js";
import { signToken } from "../utils/jwt.js";
import { hashPassword } from "../utils/password.js";
import { verifyPassword } from "../utils/password.js";
import { Role, RecordStatus } from "@prisma/client";
import { createAuditLog } from "../repositories/auditLogRepository.js";

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  departmentId: true,
  status: true,
  createdAt: true,
  updatedAt: true
};

export const login = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.status !== "ACTIVE") {
    throw unauthorized("Invalid email or password.");
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    throw unauthorized("Invalid email or password.");
  }

  const token = signToken({ userId: user.id });
  const safeUser = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: safeUserSelect
  });

  return { token, user: safeUser };
};

export const getCurrentUser = async (userId: string) => {
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      ...safeUserSelect,
      department: { select: { id: true, name: true, code: true } }
    }
  });
};

export const registrationOptions = async () => {
  const departments = await prisma.department.findMany({
    where: { status: RecordStatus.ACTIVE },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" }
  });

  return {
    departments,
    roles: [Role.EMPLOYEE],
    phoneSupported: false
  };
};

export const register = async (data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  departmentId?: string;
  role?: Role;
  phone?: string;
}) => {
  if (data.role && data.role !== Role.EMPLOYEE) {
    throw badRequest("Public registration is limited to employee accounts.");
  }

  if (data.departmentId) {
    const department = await prisma.department.findFirst({
      where: { id: data.departmentId, status: RecordStatus.ACTIVE },
      select: { id: true }
    });
    if (!department) throw notFound("Department not found.");
  }

  const passwordHash = await hashPassword(data.password);
  const name = `${data.firstName.trim()} ${data.lastName.trim()}`.trim();

  const created = await prisma.user.create({
    data: {
      name,
      email: data.email,
      passwordHash,
      role: Role.EMPLOYEE,
      departmentId: data.departmentId
    },
    select: safeUserSelect
  });

  await createAuditLog({
    actorId: null,
    entityType: "User",
    entityId: created.id,
    action: "self_registered",
    metadata: { email: created.email, role: created.role, phoneProvided: Boolean(data.phone) }
  });

  return created;
};

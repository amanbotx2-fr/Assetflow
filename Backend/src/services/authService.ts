import { prisma } from "../config/prisma.js";
import { unauthorized } from "../utils/httpError.js";
import { signToken } from "../utils/jwt.js";
import { verifyPassword } from "../utils/password.js";

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

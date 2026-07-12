import { Role, RecordStatus } from "@prisma/client";
import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.nativeEnum(Role).default(Role.EMPLOYEE),
  departmentId: z.string().uuid().optional()
});

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.nativeEnum(Role).optional(),
  departmentId: z.string().uuid().nullable().optional(),
  status: z.nativeEnum(RecordStatus).optional()
});

export const createDepartmentSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(20),
  managerId: z.string().uuid().optional(),
  parentDepartmentId: z.string().uuid().optional()
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().min(2).max(20).optional(),
  managerId: z.string().uuid().nullable().optional(),
  parentDepartmentId: z.string().uuid().nullable().optional(),
  status: z.nativeEnum(RecordStatus).optional()
});

export const createCategorySchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(20),
  description: z.string().optional()
});

export const updateCategorySchema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().min(2).max(20).optional(),
  description: z.string().nullable().optional(),
  status: z.nativeEnum(RecordStatus).optional()
});

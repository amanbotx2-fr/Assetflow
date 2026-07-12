import { z } from "zod";
import { Role } from "@prisma/client";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    confirmPassword: z.string().min(6),
    departmentId: z.string().uuid().optional(),
    role: z.nativeEnum(Role).default(Role.EMPLOYEE),
    phone: z.string().trim().min(3).max(30).optional()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"]
  })
  .refine((data) => data.role === Role.EMPLOYEE, {
    message: "Public registration is limited to employee accounts.",
    path: ["role"]
  });

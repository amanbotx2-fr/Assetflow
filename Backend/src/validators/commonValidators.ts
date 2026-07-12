import { AuditResult, MaintenancePriority, Role } from "@prisma/client";
import { z } from "zod";

export const idParams = z.object({
  id: z.string().uuid()
});

export const paginationQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  status: z.string().optional(),
  role: z.nativeEnum(Role).optional(),
  result: z.nativeEnum(AuditResult).optional(),
  priority: z.nativeEnum(MaintenancePriority).optional(),
  departmentId: z.string().uuid().optional(),
  parentDepartmentId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  assetId: z.string().uuid().optional(),
  entityId: z.string().uuid().optional(),
  entityType: z.string().min(1).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  isRead: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true"))
});

export const decisionSchema = z.object({
  decisionNotes: z.string().min(1).optional()
});

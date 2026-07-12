import {
  AllocationStatus,
  AssetCondition,
  AuditResult,
  BookingStatus,
  MaintenancePriority,
  MaintenanceStatus,
  TransferStatus
} from "@prisma/client";
import { z } from "zod";

const workflowSortOrderSchema = z.enum(["asc", "desc"]).optional();

export const allocationListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  userId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  status: z.nativeEnum(AllocationStatus).optional(),
  assetId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  sortBy: z.enum(["assignedAt", "returnedAt", "createdAt", "updatedAt", "status"]).optional(),
  sortOrder: workflowSortOrderSchema
});

export const createAllocationSchema = z
  .object({
    assetId: z.string().uuid(),
    userId: z.string().uuid().optional(),
    departmentId: z.string().uuid().optional(),
    notes: z.string().optional()
  })
  .refine((data) => Boolean(data.userId || data.departmentId), {
    message: "Either userId or departmentId is required."
  });

export const updateAllocationSchema = z.object({
  userId: z.string().uuid().nullable().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional()
});

export const returnAllocationSchema = z.object({
  returnCondition: z.nativeEnum(AssetCondition).default(AssetCondition.GOOD),
  reason: z.string().min(1),
  notes: z.string().optional()
});

export const transferListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  userId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  status: z.nativeEnum(TransferStatus).optional(),
  assetId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  sortBy: z.enum(["requestedAt", "decidedAt", "createdAt", "updatedAt", "status"]).optional(),
  sortOrder: workflowSortOrderSchema
});

export const createTransferSchema = z
  .object({
    assetId: z.string().uuid(),
    toUserId: z.string().uuid().optional(),
    toDepartmentId: z.string().uuid().optional(),
    reason: z.string().min(1)
  })
  .refine((data) => Boolean(data.toUserId || data.toDepartmentId), {
    message: "Transfer destination is required."
  });

export const cancelSchema = z.object({
  reason: z.string().min(1).optional()
});

export const createBookingSchema = z
  .object({
    assetId: z.string().uuid().optional(),
    resourceId: z.string().uuid().optional(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    purpose: z.string().min(1)
  })
  .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: "endTime must be after startTime."
  })
  .refine((data) => Boolean(data.assetId || data.resourceId), {
    message: "resourceId or assetId is required."
  });

export const bookingListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  resourceId: z.string().uuid().optional(),
  assetId: z.string().uuid().optional(),
  requestedById: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  status: z.nativeEnum(BookingStatus).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  sortBy: z.enum(["startTime", "endTime", "createdAt", "updatedAt", "status"]).optional(),
  sortOrder: workflowSortOrderSchema
});

export const updateBookingSchema = z
  .object({
    assetId: z.string().uuid().optional(),
    resourceId: z.string().uuid().optional(),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    purpose: z.string().min(1).optional(),
    status: z.nativeEnum(BookingStatus).optional(),
    decisionNotes: z.string().nullable().optional()
  })
  .refine((data) => !(data.startTime && data.endTime) || new Date(data.endTime) > new Date(data.startTime), {
    message: "endTime must be after startTime."
  });

export const bookingCalendarQuerySchema = z
  .object({
    resourceId: z.string().uuid().optional(),
    assetId: z.string().uuid().optional(),
    date: z.string().date().optional(),
    week: z.string().regex(/^\d{4}-W\d{2}$/).optional(),
    month: z.string().regex(/^\d{4}-\d{2}$/).optional()
  })
  .refine((data) => Boolean(data.date || data.week || data.month), {
    message: "date, week, or month is required."
  });

export const bookingAvailabilityQuerySchema = z.object({
  resourceId: z.string().uuid(),
  date: z.string().date()
});

export const maintenanceListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  status: z.nativeEnum(MaintenanceStatus).optional(),
  priority: z.nativeEnum(MaintenancePriority).optional(),
  assetId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  reportedById: z.string().uuid().optional(),
  assignedToId: z.string().uuid().optional(),
  assignedTechnicianId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  sortBy: z.enum(["reportedAt", "assignedAt", "startedAt", "resolvedAt", "closedAt", "createdAt", "updatedAt", "status", "priority"]).optional(),
  sortOrder: workflowSortOrderSchema
});

export const createMaintenanceSchema = z.object({
  assetId: z.string().uuid(),
  priority: z.nativeEnum(MaintenancePriority).default(MaintenancePriority.MEDIUM),
  issueSummary: z.string().min(2),
  issueDescription: z.string().optional(),
  assignedToId: z.string().uuid().optional(),
  assignedTechnicianId: z.string().uuid().optional()
});

export const updateMaintenanceSchema = z.object({
  priority: z.nativeEnum(MaintenancePriority).optional(),
  status: z.nativeEnum(MaintenanceStatus).optional(),
  assignedToId: z.string().uuid().nullable().optional(),
  assignedTechnicianId: z.string().uuid().nullable().optional(),
  issueSummary: z.string().min(2).optional(),
  issueDescription: z.string().nullable().optional(),
  resolutionNotes: z.string().min(1).nullable().optional(),
  resolutionCost: z.coerce.number().nonnegative().nullable().optional()
});

export const assignMaintenanceSchema = z
  .object({
    assignedToId: z.string().uuid().optional(),
    assignedTechnicianId: z.string().uuid().optional()
  })
  .refine((data) => Boolean(data.assignedToId || data.assignedTechnicianId), {
    message: "assignedTechnicianId is required."
  });

export const startMaintenanceSchema = z.object({
  notes: z.string().optional()
});

export const resolveMaintenanceSchema = z.object({
  resolutionNotes: z.string().min(1),
  resolutionCost: z.coerce.number().nonnegative().optional()
});

export const closeMaintenanceSchema = z.object({
  resolutionNotes: z.string().min(1).optional(),
  resolutionCost: z.coerce.number().nonnegative().optional()
});

export const createAuditSchema = z.object({
  assetId: z.string().uuid(),
  result: z.nativeEnum(AuditResult),
  remarks: z.string().optional()
});

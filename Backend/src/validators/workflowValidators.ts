import {
  AuditResult,
  BookingStatus,
  MaintenancePriority,
  MaintenanceStatus
} from "@prisma/client";
import { z } from "zod";

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
    assetId: z.string().uuid(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    purpose: z.string().min(1)
  })
  .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: "endTime must be after startTime."
  });

export const updateBookingStatusSchema = z.object({
  status: z.nativeEnum(BookingStatus),
  decisionNotes: z.string().optional()
});

export const createMaintenanceSchema = z.object({
  assetId: z.string().uuid(),
  priority: z.nativeEnum(MaintenancePriority).default(MaintenancePriority.MEDIUM),
  issueSummary: z.string().min(2),
  issueDescription: z.string().optional(),
  assignedToId: z.string().uuid().optional()
});

export const updateMaintenanceSchema = z.object({
  priority: z.nativeEnum(MaintenancePriority).optional(),
  status: z.nativeEnum(MaintenanceStatus).optional(),
  assignedToId: z.string().uuid().nullable().optional(),
  issueSummary: z.string().min(2).optional(),
  issueDescription: z.string().nullable().optional()
});

export const closeMaintenanceSchema = z.object({
  resolutionNotes: z.string().min(1)
});

export const createAuditSchema = z.object({
  assetId: z.string().uuid(),
  result: z.nativeEnum(AuditResult),
  remarks: z.string().optional()
});

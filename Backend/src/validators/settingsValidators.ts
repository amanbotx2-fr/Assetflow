import { z } from "zod";

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must use HH:mm format.");
const daySchema = z.enum(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]);
const notificationCategorySchema = z.enum([
  "BOOKING",
  "ALLOCATION",
  "TRANSFER",
  "MAINTENANCE",
  "AUDIT",
  "SYSTEM",
  "APPROVAL",
  "ASSET"
]);

const workingHoursSchema = z
  .object({
    start: timeSchema.optional(),
    end: timeSchema.optional(),
    days: z.array(daySchema).min(1).optional()
  })
  .refine((data) => !(data.start && data.end) || data.start < data.end, {
    message: "Working hours start must be before end."
  });

const contactDetailsSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(3).max(30).optional(),
  website: z.string().url().optional()
});

export const updateCompanySettingsSchema = z.object({
  companyName: z.string().min(2).max(120).optional(),
  logoUrl: z.string().url().nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  timezone: z.string().min(2).max(80).optional(),
  currency: z.string().length(3).transform((value) => value.toUpperCase()).optional(),
  language: z.string().min(2).max(12).optional(),
  workingHours: workingHoursSchema.optional(),
  contactDetails: contactDetailsSchema.partial().optional()
});

export const notificationPreferencesSchema = z.object({
  email: z.boolean().optional(),
  inApp: z.boolean().optional(),
  criticalOnly: z.boolean().optional(),
  muteCategories: z.array(notificationCategorySchema).optional()
});

export const updateProfileSettingsSchema = z.object({
  avatarUrl: z.string().url().nullable().optional(),
  displayName: z.string().min(2).max(80).nullable().optional(),
  theme: z.enum(["LIGHT", "DARK", "SYSTEM"]).optional(),
  timezone: z.string().min(2).max(80).optional(),
  language: z.string().min(2).max(12).optional(),
  notificationPreferences: notificationPreferencesSchema.optional()
});

export const updateAssetConfigurationSchema = z.object({
  assetTagPrefix: z.string().min(2).max(12).regex(/^[A-Z0-9-]+$/).optional(),
  autoNumbering: z.boolean().optional(),
  qrDefaults: z
    .object({
      enabled: z.boolean().optional(),
      includeAssetTag: z.boolean().optional(),
      includeSerialNumber: z.boolean().optional(),
      includeCompanyName: z.boolean().optional()
    })
    .optional(),
  defaultDepreciationYears: z.coerce.number().int().min(1).max(30).optional(),
  retirementThresholdPercent: z.coerce.number().int().min(1).max(100).optional()
});

export const updateBookingPoliciesSchema = z
  .object({
    maxBookingDurationHours: z.coerce.number().int().min(1).max(720).optional(),
    requireApproval: z.boolean().optional(),
    advanceBookingLimitDays: z.coerce.number().int().min(1).max(365).optional(),
    businessHours: workingHoursSchema.optional(),
    allowWeekendBookings: z.boolean().optional()
  })
  .refine(
    (data) =>
      !(data.maxBookingDurationHours && data.advanceBookingLimitDays) ||
      data.maxBookingDurationHours <= data.advanceBookingLimitDays * 24,
    {
      message: "Maximum booking duration cannot exceed the advance booking window."
    }
  );

export const updateMaintenancePoliciesSchema = z.object({
  defaultTechnicianId: z.string().uuid().nullable().optional(),
  autoAssignmentEnabled: z.boolean().optional(),
  allowedPriorities: z.array(z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])).min(1).optional(),
  escalationDays: z.coerce.number().int().min(1).max(365).optional()
});

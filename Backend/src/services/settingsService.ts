import { Prisma, RecordStatus, Role, type UserPreference } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { createAuditLog } from "../repositories/auditLogRepository.js";
import { conflict, notFound } from "../utils/httpError.js";

type JsonRecord = Record<string, unknown>;

const COMPANY_KEY = "company";
const ASSET_CONFIGURATION_KEY = "asset_configuration";
const BOOKING_POLICIES_KEY = "booking_policies";
const MAINTENANCE_POLICIES_KEY = "maintenance_policies";

const defaultCompanySettings = {
  companyName: "AssetFlow",
  logoUrl: null,
  address: "Demo Organization",
  timezone: "Asia/Kolkata",
  currency: "INR",
  language: "en",
  workingHours: {
    start: "09:00",
    end: "18:00",
    days: ["MON", "TUE", "WED", "THU", "FRI"]
  },
  contactDetails: {
    email: "admin@assetflow.local",
    phone: "+91-0000000000",
    website: "https://assetflow.local"
  }
} satisfies JsonRecord;

const defaultAssetConfiguration = {
  assetTagPrefix: "AST",
  autoNumbering: true,
  qrDefaults: {
    enabled: true,
    includeAssetTag: true,
    includeSerialNumber: true,
    includeCompanyName: false
  },
  defaultDepreciationYears: 5,
  retirementThresholdPercent: 80
} satisfies JsonRecord;

const defaultBookingPolicies = {
  maxBookingDurationHours: 8,
  requireApproval: true,
  advanceBookingLimitDays: 30,
  businessHours: {
    start: "09:00",
    end: "18:00",
    days: ["MON", "TUE", "WED", "THU", "FRI"]
  },
  allowWeekendBookings: false
} satisfies JsonRecord;

const defaultMaintenancePolicies = {
  defaultTechnicianId: null,
  autoAssignmentEnabled: false,
  allowedPriorities: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
  escalationDays: 3
} satisfies JsonRecord;

const defaultNotificationPreferences = {
  email: true,
  inApp: true,
  criticalOnly: false,
  muteCategories: []
} satisfies JsonRecord;

const roleMetadata = [
  {
    role: Role.ADMIN,
    label: "Admin",
    description: "Full backend access across organization setup, assets, workflows, analytics, notifications, and settings.",
    accessLevel: "GLOBAL",
    editable: false
  },
  {
    role: Role.MANAGER,
    label: "Manager",
    description: "Department-scoped operational access with approval and read access to organization settings.",
    accessLevel: "DEPARTMENT",
    editable: false
  },
  {
    role: Role.EMPLOYEE,
    label: "Employee",
    description: "Self-service access to own allocations, bookings, maintenance requests, notifications, and profile preferences.",
    accessLevel: "OWN",
    editable: false
  },
  {
    role: Role.AUDITOR,
    label: "Auditor",
    description: "Read-only system access with full audit workflow privileges.",
    accessLevel: "READ_ONLY_WITH_AUDIT",
    editable: false
  }
];

const permissionMatrix = [
  { module: "Authentication", admin: "FULL", manager: "SELF", employee: "SELF", auditor: "SELF" },
  { module: "Dashboard", admin: "GLOBAL_READ", manager: "DEPARTMENT_READ", employee: "OWN_READ", auditor: "GLOBAL_READ" },
  { module: "Organization", admin: "FULL", manager: "DEPARTMENT_READ", employee: "NONE", auditor: "READ" },
  { module: "Assets", admin: "FULL", manager: "DEPARTMENT_CRUD", employee: "READ", auditor: "READ" },
  { module: "Allocations", admin: "FULL", manager: "DEPARTMENT_CRUD", employee: "OWN_READ_RETURN", auditor: "READ" },
  { module: "Transfers", admin: "FULL", manager: "DEPARTMENT_APPROVE", employee: "OWN_REQUESTS", auditor: "READ" },
  { module: "Bookings", admin: "FULL", manager: "DEPARTMENT_APPROVE", employee: "OWN_REQUESTS", auditor: "READ" },
  { module: "Maintenance", admin: "FULL", manager: "DEPARTMENT_APPROVE_ASSIGN", employee: "OWN_REQUESTS", auditor: "READ" },
  { module: "Audit", admin: "FULL", manager: "DEPARTMENT_CREATE_VERIFY", employee: "ASSIGNED_VERIFY", auditor: "FULL" },
  { module: "Reports", admin: "GLOBAL_READ", manager: "DEPARTMENT_READ", employee: "OWN_READ", auditor: "GLOBAL_READ" },
  { module: "Notifications", admin: "GLOBAL_MANAGE", manager: "DEPARTMENT_MANAGE", employee: "OWN_MANAGE", auditor: "READ" },
  { module: "Settings", admin: "FULL", manager: "READ_ORG", employee: "OWN_PROFILE", auditor: "READ" }
];

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  departmentId: true,
  status: true,
  department: { select: { id: true, name: true, code: true } }
} satisfies Prisma.UserSelect;

const isPlainObject = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const mergeJson = (base: JsonRecord, patch: unknown): JsonRecord => {
  if (!isPlainObject(patch)) return { ...base };

  const result: JsonRecord = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const existing = result[key];
    result[key] = isPlainObject(existing) && isPlainObject(value) ? mergeJson(existing, value) : value;
  }
  return result;
};

const toInputJson = (value: JsonRecord) => value as Prisma.InputJsonValue;

type SettingResponse = JsonRecord & {
  key: string;
  category: string;
  updatedAt: Date | null;
  updatedById: string | null;
};

const getSetting = async (key: string, category: string, defaults: JsonRecord): Promise<SettingResponse> => {
  const setting = await prisma.systemSetting.findUnique({ where: { key } });
  const value = mergeJson(defaults, setting?.value);

  return {
    key,
    category,
    ...value,
    updatedAt: setting?.updatedAt ?? null,
    updatedById: setting?.updatedById ?? null
  };
};

const updateSetting = async (
  key: string,
  category: string,
  defaults: JsonRecord,
  patch: JsonRecord,
  actor: Express.User
): Promise<SettingResponse> => {
  const existing = await prisma.systemSetting.findUnique({ where: { key } });
  const value = mergeJson(mergeJson(defaults, existing?.value), patch);

  const updated = await prisma.systemSetting.upsert({
    where: { key },
    update: {
      category,
      value: toInputJson(value),
      updatedById: actor.id
    },
    create: {
      key,
      category,
      value: toInputJson(value),
      updatedById: actor.id
    }
  });

  await createAuditLog({
    actorId: actor.id,
    entityType: "SystemSetting",
    entityId: key,
    action: "updated",
    metadata: { key, category, patch }
  });

  return {
    key,
    category,
    ...mergeJson(defaults, updated.value),
    updatedAt: updated.updatedAt,
    updatedById: updated.updatedById
  };
};

const assertDefaultTechnician = async (technicianId?: unknown) => {
  if (technicianId === undefined || technicianId === null) return;

  const technician = await prisma.user.findUnique({
    where: { id: String(technicianId) },
    select: { id: true, role: true, status: true }
  });

  if (!technician) throw notFound("Default technician not found.");
  if (technician.status !== RecordStatus.ACTIVE || technician.role === Role.AUDITOR) {
    throw conflict("Default technician must be an active admin, manager, or employee.");
  }
};

const formatPreference = (
  user: Prisma.UserGetPayload<{ select: typeof userSelect }>,
  preference?: UserPreference | null
) => {
  const notificationPreferences = mergeJson(defaultNotificationPreferences, preference?.notificationPreferences);

  return {
    user,
    userId: user.id,
    avatarUrl: preference?.avatarUrl ?? null,
    displayName: preference?.displayName ?? null,
    effectiveDisplayName: preference?.displayName ?? user.name,
    theme: preference?.theme ?? "SYSTEM",
    timezone: preference?.timezone ?? defaultCompanySettings.timezone,
    language: preference?.language ?? defaultCompanySettings.language,
    notificationPreferences,
    updatedAt: preference?.updatedAt ?? null
  };
};

export const getCompanySettings = () => getSetting(COMPANY_KEY, "ORGANIZATION", defaultCompanySettings);

export const updateCompanySettings = (data: JsonRecord, actor: Express.User) =>
  updateSetting(COMPANY_KEY, "ORGANIZATION", defaultCompanySettings, data, actor);

export const getAssetConfiguration = () =>
  getSetting(ASSET_CONFIGURATION_KEY, "ASSET", defaultAssetConfiguration);

export const updateAssetConfiguration = (data: JsonRecord, actor: Express.User) =>
  updateSetting(ASSET_CONFIGURATION_KEY, "ASSET", defaultAssetConfiguration, data, actor);

export const getBookingPolicies = () => getSetting(BOOKING_POLICIES_KEY, "BOOKING", defaultBookingPolicies);

export const updateBookingPolicies = (data: JsonRecord, actor: Express.User) =>
  updateSetting(BOOKING_POLICIES_KEY, "BOOKING", defaultBookingPolicies, data, actor);

export const getMaintenancePolicies = () =>
  getSetting(MAINTENANCE_POLICIES_KEY, "MAINTENANCE", defaultMaintenancePolicies);

export const updateMaintenancePolicies = async (data: JsonRecord, actor: Express.User) => {
  await assertDefaultTechnician(data.defaultTechnicianId);
  return updateSetting(MAINTENANCE_POLICIES_KEY, "MAINTENANCE", defaultMaintenancePolicies, data, actor);
};

export const getProfileSettings = async (actor: Express.User) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: actor.id },
    select: userSelect
  });
  const preference = await prisma.userPreference.findUnique({ where: { userId: actor.id } });
  return formatPreference(user, preference);
};

export const updateProfileSettings = async (data: JsonRecord, actor: Express.User) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: actor.id },
    select: userSelect
  });
  const existing = await prisma.userPreference.findUnique({ where: { userId: actor.id } });
  const notificationPreferences = mergeJson(
    mergeJson(defaultNotificationPreferences, existing?.notificationPreferences),
    data.notificationPreferences
  );

  const preference = await prisma.userPreference.upsert({
    where: { userId: actor.id },
    update: {
      avatarUrl: data.avatarUrl as string | null | undefined,
      displayName: data.displayName as string | null | undefined,
      theme: data.theme as string | undefined,
      timezone: data.timezone as string | undefined,
      language: data.language as string | undefined,
      notificationPreferences: toInputJson(notificationPreferences)
    },
    create: {
      userId: actor.id,
      avatarUrl: data.avatarUrl as string | null | undefined,
      displayName: data.displayName as string | null | undefined,
      theme: (data.theme as string | undefined) ?? "SYSTEM",
      timezone: (data.timezone as string | undefined) ?? String(defaultCompanySettings.timezone),
      language: (data.language as string | undefined) ?? String(defaultCompanySettings.language),
      notificationPreferences: toInputJson(notificationPreferences)
    }
  });

  await createAuditLog({
    actorId: actor.id,
    entityType: "UserPreference",
    entityId: actor.id,
    action: "updated",
    metadata: data
  });

  return formatPreference(user, preference);
};

export const getRoles = () => ({
  roles: roleMetadata,
  editable: false,
  source: "Prisma Role enum"
});

export const getPermissions = () => ({
  roles: roleMetadata.map((role) => role.role),
  matrix: permissionMatrix,
  readOnly: true
});

export const getDashboardSettingsSummary = async (actor: Express.User) => {
  const [company, profile] = await Promise.all([getCompanySettings(), getProfileSettings(actor)]);

  return {
    company: {
      companyName: company.companyName,
      logoUrl: company.logoUrl,
      timezone: company.timezone,
      currency: company.currency,
      language: company.language
    },
    profile: {
      displayName: profile.displayName,
      effectiveDisplayName: profile.effectiveDisplayName,
      avatarUrl: profile.avatarUrl,
      theme: profile.theme,
      timezone: profile.timezone,
      language: profile.language,
      notificationPreferences: profile.notificationPreferences
    }
  };
};

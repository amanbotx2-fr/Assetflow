import { AssetCondition, AssetStatus } from "@prisma/client";
import { z } from "zod";

const assetSortFields = [
  "createdAt",
  "updatedAt",
  "name",
  "assetCode",
  "serialNumber",
  "status",
  "location",
  "purchaseDate"
] as const;

export const assetListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  categoryId: z.string().uuid().optional(),
  category: z.string().trim().optional(),
  departmentId: z.string().uuid().optional(),
  department: z.string().trim().optional(),
  status: z.nativeEnum(AssetStatus).optional(),
  serialNumber: z.string().trim().optional(),
  assetCode: z.string().trim().optional(),
  assetTag: z.string().trim().optional(),
  qrCode: z.string().trim().optional(),
  location: z.string().trim().optional(),
  sortBy: z.enum(assetSortFields).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional()
});

export const assetLookupQuerySchema = z
  .object({
    q: z.string().trim().optional(),
    assetCode: z.string().trim().optional(),
    assetTag: z.string().trim().optional(),
    serialNumber: z.string().trim().optional(),
    qrCode: z.string().trim().optional()
  })
  .refine((data) => Boolean(data.q || data.assetCode || data.assetTag || data.serialNumber || data.qrCode), {
    message: "Provide q, assetCode, assetTag, serialNumber, or qrCode."
  });

export const createAssetSchema = z.object({
  assetCode: z.string().trim().min(2).optional(),
  assetTag: z.string().trim().min(2).optional(),
  serialNumber: z.string().trim().min(2).optional(),
  name: z.string().min(2),
  description: z.string().optional(),
  categoryId: z.string().uuid(),
  departmentId: z.string().uuid().optional(),
  condition: z.nativeEnum(AssetCondition).default(AssetCondition.GOOD),
  location: z.string().optional(),
  purchaseValue: z.coerce.number().nonnegative().optional(),
  purchaseDate: z.string().datetime().optional(),
  warrantyExpiry: z.string().datetime().optional(),
  isBookable: z.boolean().default(false)
}).refine((data) => Boolean(data.assetCode || data.assetTag), {
  message: "Asset tag is required."
});

export const updateAssetSchema = z.object({
  assetCode: z.string().trim().min(2).optional(),
  assetTag: z.string().trim().min(2).optional(),
  serialNumber: z.string().trim().min(2).nullable().optional(),
  name: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  categoryId: z.string().uuid().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  status: z.nativeEnum(AssetStatus).optional(),
  condition: z.nativeEnum(AssetCondition).optional(),
  location: z.string().nullable().optional(),
  purchaseValue: z.coerce.number().nonnegative().nullable().optional(),
  purchaseDate: z.string().datetime().nullable().optional(),
  warrantyExpiry: z.string().datetime().nullable().optional(),
  isBookable: z.boolean().optional()
});

export const allocateAssetSchema = z
  .object({
    userId: z.string().uuid().optional(),
    departmentId: z.string().uuid().optional(),
    notes: z.string().optional()
  })
  .refine((data) => Boolean(data.userId || data.departmentId), {
    message: "Either userId or departmentId is required."
  });

export const retireAssetSchema = z.object({
  reason: z.string().min(1)
});

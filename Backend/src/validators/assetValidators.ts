import { AssetCondition, AssetStatus } from "@prisma/client";
import { z } from "zod";

export const createAssetSchema = z.object({
  assetCode: z.string().min(2),
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
});

export const updateAssetSchema = z.object({
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

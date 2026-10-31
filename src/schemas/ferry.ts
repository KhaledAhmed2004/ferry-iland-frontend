import { z } from "zod";

/**
 * Ferry Enums
 */
export const vesselTypeEnum = z.enum(["CATAMARAN", "SPEEDBOAT", "TRADITIONAL_FERRY"]);
export const vesselStatusEnum = z.enum(["IN_SERVICE", "MAINTENANCE", "OUT_OF_SERVICE"]);

/**
 * Ferry Schemas
 */
export const createFerrySchema = z.object({
  name: z.string().min(2, "Ferry name must be at least 2 characters"),
  registration: z.string().min(2, "Registration number is required"),
  capacity: z.coerce.number().int().positive("Capacity must be at least 1 passenger"),
  type: vesselTypeEnum.default("CATAMARAN"),
  status: vesselStatusEnum.default("IN_SERVICE"),
  imageUrl: z.string().optional(),
  amenities: z.array(z.string()).optional()
});

export const updateFerrySchema = createFerrySchema.partial();

export const ferryFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  status: vesselStatusEnum.optional(),
  type: vesselTypeEnum.optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});

/**
 * Inferred Types
 */
export type CreateFerryInput = z.infer<typeof createFerrySchema>;
export type UpdateFerryInput = z.infer<typeof updateFerrySchema>;
export type FerryFilterInput = z.infer<typeof ferryFilterSchema>;

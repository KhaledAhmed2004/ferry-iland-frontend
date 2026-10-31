import { z } from "zod";

/**
 * Route Enums
 */
export const routeStatusEnum = z.enum(["ACTIVE", "INACTIVE"]);

/**
 * Route Schemas
 */
export const createRouteSchema = z
  .object({
    departurePortId: z.string().min(1, "Departure port is required"),
    destinationPortId: z.string().min(1, "Destination port is required"),
    durationMinutes: z.coerce
      .number({ invalid_type_error: "durationMinutes must be a number" })
      .int("durationMinutes must be an integer")
      .min(1, "Duration must be at least 1 minute")
      .max(1440, "Duration cannot exceed 1440 minutes (24 hours)"),
    description: z.string().trim().min(1, "Route description is required").max(1000),
    imageUrl: z.string().trim().min(1, "Route image is required"),
    isBorderCrossing: z.boolean().optional().default(false),
    status: routeStatusEnum.optional().default("ACTIVE")
  })
  .superRefine((data, ctx) => {
    if (data.departurePortId === data.destinationPortId) {
      ctx.addIssue({
        code: "custom",
        message: "Departure port and destination port cannot be the same",
        path: ["destinationPortId"]
      });
    }
  });

export const updateRouteSchema = z.object({
  durationMinutes: z.coerce
    .number()
    .int()
    .min(1, "Duration must be at least 1 minute")
    .max(1440, "Duration cannot exceed 1440 minutes (24 hours)")
    .optional(),
  description: z.string().trim().min(1, "Route description cannot be empty").max(1000).optional(),
  imageUrl: z.string().trim().min(1, "Route image cannot be empty").optional(),
  isBorderCrossing: z.boolean().optional(),
  status: routeStatusEnum.optional()
});

export const routeFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: routeStatusEnum.optional()
});

/**
 * Inferred Types
 */
export type CreateRouteInput = z.infer<typeof createRouteSchema>;
export type UpdateRouteInput = z.infer<typeof updateRouteSchema>;
export type RouteFilterInput = z.infer<typeof routeFilterSchema>;

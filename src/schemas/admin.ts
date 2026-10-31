import { z } from "zod";

/**
 * Provider validation schemas for Admin Dashboard
 */
export const providerFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  searchTerm: z.string().optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "ALL"]).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});

export const updateProviderStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]),
  reason: z.string().optional()
});

/**
 * Pagination query schema
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});

/**
 * Inferred Types
 */
export type ProviderFilterInput = z.infer<typeof providerFilterSchema>;
export type UpdateProviderStatusInput = z.infer<typeof updateProviderStatusSchema>;
export type PaginationQueryInput = z.infer<typeof paginationQuerySchema>;

/**
 * Spec 0001 (AC-9): payment settings form. Mirrors the backend
 * `updateCommissionZodSchema` in backend/src/app/modules/admin/admin.validation.ts.
 */
export const paymentSettingsSchema = z.object({
  commissionRate: z
    .number({ invalid_type_error: "Enter a commission rate" })
    .min(0, "Commission cannot be below 0%")
    .max(100, "Commission cannot exceed 100%"),
  payoutSchedule: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
  seatHoldMinutes: z
    .number({ invalid_type_error: "Enter the seat hold in minutes" })
    .int("Seat hold must be a whole number of minutes")
    .min(1, "Seat hold must be at least 1 minute")
    .max(60, "Seat hold cannot exceed 60 minutes")
});

export type PaymentSettingsInput = z.infer<typeof paymentSettingsSchema>;

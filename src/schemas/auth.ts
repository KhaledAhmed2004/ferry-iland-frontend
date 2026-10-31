import { z } from "zod";

/**
 * Common regex patterns
 */
export const phoneRegex = /^\+?[0-9]{7,15}$/;
export const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={}\[\]|;:'",.<>/?]).{8,}$/;

/**
 * Basic Authentication Schemas
 */
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

/**
 * Backend Registration Payload Schema
 */
export const registerUserSchema = z
  .object({
    role: z.enum(["USER", "OPERATOR"]).default("USER"),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .regex(
        passwordRegex,
        "Password must contain uppercase, lowercase, number, and special character"
      ),
    phoneNumber: z
      .string()
      .regex(phoneRegex, "Phone must be 7-15 digits (e.g. +8801712345678)"),
    phone: z.string().optional(),
    name: z.string().optional(),
    companyName: z.string().optional(),
    contactPersonName: z.string().optional()
  })
  .superRefine((data, ctx) => {
    if (data.role === "OPERATOR") {
      if (!data.companyName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Company name is required for ferry operators",
          path: ["companyName"]
        });
      }
      if (!data.contactPersonName?.trim() && !data.name?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Contact person name is required for operators",
          path: ["contactPersonName"]
        });
      }
    } else {
      if (!data.name?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Full name is required",
          path: ["name"]
        });
      }
    }
  });

/**
 * Multi-Step Signup Sub-Schemas
 */
export const passengerPersonalSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters")
});

export const operatorCompanySchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  name: z.string().min(2, "Contact person name is required")
});

export const authContactSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  phone: z
    .string()
    .min(7, "Phone number must be at least 7 digits")
    .regex(phoneRegex, "Phone must be valid digits (e.g. +8801712345678 or 01712345678)")
});

export const authSecurityStepSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .regex(
        passwordRegex,
        "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special symbol"
      ),
    confirmPassword: z.string().min(8, "Confirm password is required")
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

/**
 * Unified Frontend Multi-Step Signup Form Schema
 */
export const signupMultiStepSchema = z
  .object({
    role: z.enum(["passenger", "operator"]),
    companyName: z.string().optional(),
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    phone: z
      .string()
      .min(7, "Phone number must be at least 7 digits")
      .regex(phoneRegex, "Phone must be valid digits (e.g. +8801712345678 or 01712345678)"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .regex(
        passwordRegex,
        "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special symbol"
      ),
    confirmPassword: z.string().min(8, "Confirm password is required")
  })
  .superRefine((data, ctx) => {
    if (data.role === "operator" && (!data.companyName || data.companyName.trim().length < 2)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Company name is required for ferry operators",
        path: ["companyName"]
      });
    }
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["confirmPassword"]
      });
    }
  });

/**
 * Email Verification Schemas
 */
export const verifyEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().min(4, "Please enter verification code").max(10, "Invalid code length")
});

export const resendVerificationSchema = z.object({
  email: z.string().email("Invalid email address")
});

/**
 * Inferred Types
 */
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type SignupMultiStepInput = z.infer<typeof signupMultiStepSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;

import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const setupAccountSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const setupCompanySchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  legalName: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
});

export const setupConfigSchema = z.object({
  financialYearStart: z.coerce.number().min(1).max(12).default(4),
  currency: z.string().default("INR"),
  timezone: z.string().default("Asia/Kolkata"),
});

export const setupFullSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  companyName: z.string().min(1, "Company name is required"),
  legalName: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  phone: z.string().optional(),
  companyEmail: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  financialYearStart: z.coerce.number().min(1).max(12).default(4),
  currency: z.string().default("INR"),
  timezone: z.string().default("Asia/Kolkata"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SetupFullInput = z.infer<typeof setupFullSchema>;

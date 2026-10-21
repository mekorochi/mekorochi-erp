import { z } from "zod/v4";

export const customerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  company: z.string().optional(),
  type: z.enum(["INDIVIDUAL", "CORPORATE", "WHOLESALE", "RETAIL_PARTNER"]).default("INDIVIDUAL"),
  email: z.string().optional(),
  phone: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  channel: z.string().optional(),
  segment: z.string().optional(),
  creditLimit: z.coerce.number().min(0).optional(),
  creditDays: z.coerce.number().int().min(0).default(0),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const customerAddressSchema = z.object({
  label: z.string().default("Primary"),
  addressLine1: z.string().min(1, "Address is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  pincode: z.string().min(1, "Pincode is required"),
  country: z.string().default("India"),
  isDefault: z.boolean().default(false),
  isBilling: z.boolean().default(true),
  isShipping: z.boolean().default(true),
});

export const customerContactSchema = z.object({
  name: z.string().min(1, "Contact name is required"),
  role: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

export type CustomerInput = z.infer<typeof customerSchema>;
export type CustomerAddressInput = z.infer<typeof customerAddressSchema>;

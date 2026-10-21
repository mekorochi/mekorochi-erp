import { z } from "zod/v4";

export const warehouseSchema = z.object({
  name: z.string().min(1, "Warehouse name is required"),
  code: z.string().min(1, "Code is required").max(10),
  type: z.enum(["RAW_MATERIALS", "PACKAGING", "FINISHED_GOODS", "DISPATCH", "QUARANTINE", "GENERAL"]).default("GENERAL"),
  address: z.string().optional(),
  isDefault: z.boolean().default(false),
});

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  quantity: z.coerce.number().refine(v => v !== 0, "Quantity cannot be zero"),
  reason: z.string().min(1, "Reason is required"),
  lotNumber: z.string().optional(),
  expiryDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export const stockTransferSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  fromWarehouseId: z.string().min(1, "Source warehouse is required"),
  toWarehouseId: z.string().min(1, "Destination warehouse is required"),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  lotId: z.string().optional(),
  notes: z.string().optional(),
});

export type WarehouseInput = z.infer<typeof warehouseSchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
export type StockTransferInput = z.infer<typeof stockTransferSchema>;

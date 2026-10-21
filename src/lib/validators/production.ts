import { z } from "zod/v4";

export const bomItemSchema = z.object({
  productId: z.string().min(1, "Material is required"),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  unit: z.enum(["PIECE", "BOX", "GRAM", "KILOGRAM", "LITER", "MILLILITER", "METER", "SET"]).default("GRAM"),
  wastagePercent: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

export const bomSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  name: z.string().min(1, "Recipe name is required"),
  batchSize: z.coerce.number().positive("Batch size must be positive"),
  batchUnit: z.enum(["PIECE", "BOX", "GRAM", "KILOGRAM", "LITER", "MILLILITER", "METER", "SET"]).default("PIECE"),
  expectedYield: z.coerce.number().min(0).max(100).optional(),
  wastagePercent: z.coerce.number().min(0).max(100).optional(),
  processStages: z.array(z.string()).optional(),
  notes: z.string().optional(),
  items: z.array(bomItemSchema).min(1, "At least one ingredient is required"),
});

export const productionOrderSchema = z.object({
  bomId: z.string().min(1, "Recipe is required"),
  plannedQty: z.coerce.number().positive("Quantity must be positive"),
  plannedDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export const productionCompletionSchema = z.object({
  actualQty: z.coerce.number().positive("Actual quantity must be positive"),
  wastageQty: z.coerce.number().min(0).default(0),
  wastageNotes: z.string().optional(),
  outputLotNumber: z.string().optional(),
  expiryDate: z.coerce.date().optional(),
  warehouseId: z.string().min(1, "Output warehouse is required"),
  consumptions: z.array(z.object({
    productId: z.string().min(1),
    lotId: z.string().optional(),
    actualQty: z.coerce.number().positive(),
  })),
});

export type BOMInput = z.infer<typeof bomSchema>;
export type ProductionOrderInput = z.infer<typeof productionOrderSchema>;
export type ProductionCompletionInput = z.infer<typeof productionCompletionSchema>;

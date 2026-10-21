import { z } from "zod/v4";

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  barcode: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  type: z.enum(["RAW_MATERIAL", "PACKAGING", "FINISHED_GOOD", "BUNDLE", "SERVICE"]).default("FINISHED_GOOD"),
  unitOfMeasure: z.enum(["PIECE", "BOX", "GRAM", "KILOGRAM", "LITER", "MILLILITER", "METER", "SET"]).default("PIECE"),
  sellingPrice: z.coerce.number().min(0).optional(),
  costPrice: z.coerce.number().min(0).optional(),
  wholesalePrice: z.coerce.number().min(0).optional(),
  corporatePrice: z.coerce.number().min(0).optional(),
  hsnCode: z.string().optional(),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  weight: z.coerce.number().min(0).optional(),
  weightUnit: z.string().default("g"),
  shelfLifeDays: z.coerce.number().int().min(0).optional(),
  allergens: z.string().optional(),
  ingredients: z.string().optional(),
  reorderLevel: z.coerce.number().min(0).optional(),
  minOrderQty: z.coerce.number().min(0).optional(),
  isBundle: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  parentId: z.string().optional(),
  sortOrder: z.coerce.number().int().default(0),
});

export const bundleItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.coerce.number().min(0.001, "Quantity must be positive"),
});

export type ProductInput = z.infer<typeof productSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;

import { z } from "zod/v4";

export const supplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  contactPerson: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  country: z.string().default("India"),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  paymentTerms: z.string().optional(),
  creditDays: z.coerce.number().int().min(0).default(30),
  notes: z.string().optional(),
});

export const purchaseOrderItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  unitPrice: z.coerce.number().min(0, "Unit price must be non-negative"),
  taxRate: z.coerce.number().min(0).max(100).default(0),
});

export const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  expectedDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  items: z.array(purchaseOrderItemSchema).min(1, "At least one item is required"),
});

export const goodsReceiptItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  lotNumber: z.string().optional(),
  expiryDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export const goodsReceiptSchema = z.object({
  purchaseOrderId: z.string().min(1),
  warehouseId: z.string().min(1),
  notes: z.string().optional(),
  items: z.array(goodsReceiptItemSchema).min(1),
});

export type SupplierInput = z.infer<typeof supplierSchema>;
export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>;
export type GoodsReceiptInput = z.infer<typeof goodsReceiptSchema>;

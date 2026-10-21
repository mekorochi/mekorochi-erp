import { z } from "zod/v4";

export const orderItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  description: z.string().optional(),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  unitPrice: z.coerce.number().min(0, "Price must be non-negative"),
  discount: z.coerce.number().min(0).default(0),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  hsnCode: z.string().optional(),
});

export const salesOrderSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  channel: z.string().default("Manual"),
  shippingAddress: z.any().optional(),
  billingAddress: z.any().optional(),
  giftNote: z.string().optional(),
  notes: z.string().optional(),
  discountAmount: z.coerce.number().min(0).default(0),
  shippingAmount: z.coerce.number().min(0).default(0),
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
});

export const orderRecipientSchema = z.object({
  name: z.string().min(1, "Recipient name is required"),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  giftNote: z.string().optional(),
  deliveryDate: z.coerce.date().optional(),
  customization: z.string().optional(),
});

export const fulfillmentSchema = z.object({
  orderId: z.string().min(1),
  trackingNumber: z.string().optional(),
  courierName: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.coerce.number().positive(),
    lotId: z.string().optional(),
  })).min(1),
});

export type SalesOrderInput = z.infer<typeof salesOrderSchema>;
export type FulfillmentInput = z.infer<typeof fulfillmentSchema>;

import { z } from "zod/v4";

export const invoiceItemSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  hsnCode: z.string().optional(),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  unitPrice: z.coerce.number().min(0, "Price must be non-negative"),
  discount: z.coerce.number().min(0).default(0),
  taxRate: z.coerce.number().min(0).max(100).default(0),
});

export const invoiceSchema = z.object({
  type: z.enum(["PROFORMA", "TAX_INVOICE", "CREDIT_NOTE", "DEBIT_NOTE"]).default("TAX_INVOICE"),
  customerId: z.string().min(1, "Customer is required"),
  orderId: z.string().optional(),
  dueDate: z.coerce.date(),
  placeOfSupply: z.string().optional(),
  isInterState: z.boolean().default(false),
  shippingAmount: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
  termsConditions: z.string().optional(),
  billingAddress: z.any().optional(),
  shippingAddress: z.any().optional(),
  parentInvoiceId: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
});

export const paymentSchema = z.object({
  type: z.enum(["PAYMENT", "ADVANCE", "REFUND", "DEPOSIT"]).default("PAYMENT"),
  direction: z.enum(["INBOUND", "OUTBOUND"]),
  customerId: z.string().optional(),
  orderId: z.string().optional(),
  supplierId: z.string().optional(),
  amount: z.coerce.number().positive("Amount must be positive"),
  method: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CARD", "CHEQUE", "OTHER"]),
  referenceNumber: z.string().optional(),
  paymentDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  invoiceAllocations: z.array(z.object({
    invoiceId: z.string().min(1),
    amount: z.coerce.number().positive(),
  })).optional(),
});

export const expenseSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  taxAmount: z.coerce.number().min(0).default(0),
  description: z.string().min(1, "Description is required"),
  vendor: z.string().optional(),
  department: z.string().optional(),
  project: z.string().optional(),
  paymentMethod: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CARD", "CHEQUE", "OTHER"]).default("CASH"),
  paymentRef: z.string().optional(),
  paidBy: z.string().optional(),
  expenseDate: z.coerce.date().optional(),
  gstApplicable: z.boolean().default(false),
  gstRate: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurringPeriod: z.string().optional(),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;

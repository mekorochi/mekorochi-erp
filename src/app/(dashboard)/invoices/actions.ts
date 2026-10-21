"use server";

import { requirePermission, getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { createAuditEvent } from "@/lib/auth/audit";
import { createInvoice as createInvoiceService, postInvoice as postInvoiceService } from "@/lib/services/invoicing";
import { invoiceSchema } from "@/lib/validators/invoices";
import { revalidatePath } from "next/cache";
import Decimal from "decimal.js";

export async function createInvoiceAction(_prev: unknown, formData: FormData) {
  try {
    const user = await requirePermission("invoices:create");
    const raw = JSON.parse(formData.get("data") as string);
    const parsed = invoiceSchema.parse(raw);

    const invoice = await createInvoiceService({
      type: parsed.type,
      customerId: parsed.customerId,
      orderId: parsed.orderId,
      dueDate: new Date(parsed.dueDate),
      placeOfSupply: parsed.placeOfSupply,
      isInterState: parsed.isInterState,
      items: parsed.items.map((item) => ({
        description: item.description,
        productId: item.productId,
        hsnCode: item.hsnCode,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        taxRate: item.taxRate || 0,
      })),
      shippingAmount: parsed.shippingAmount,
      notes: parsed.notes,
      termsConditions: parsed.termsConditions,
      billingAddress: parsed.billingAddress,
      shippingAddress: parsed.shippingAddress,
      parentInvoiceId: parsed.parentInvoiceId,
      createdBy: user.id,
    });

    await createAuditEvent({
      userId: user.id,
      action: "CREATE",
      entityType: "Invoice",
      entityId: invoice.id,
      after: { invoiceNumber: invoice.invoiceNumber, type: invoice.type, total: invoice.totalAmount.toString() },
    });

    revalidatePath("/invoices");
    return { success: true, invoiceId: invoice.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to create invoice" };
  }
}

export async function postInvoiceAction(invoiceId: string) {
  try {
    const user = await requirePermission("invoices:create");
    const invoice = await postInvoiceService(invoiceId);

    await createAuditEvent({
      userId: user.id,
      action: "POST",
      entityType: "Invoice",
      entityId: invoiceId,
      after: { invoiceNumber: invoice.invoiceNumber, status: "POSTED" },
    });

    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath("/invoices");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to post invoice" };
  }
}

export async function voidInvoiceAction(invoiceId: string) {
  try {
    const user = await requirePermission("invoices:void");
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return { error: "Invoice not found" };
    if (invoice.status === "VOID" || invoice.status === "CANCELLED") {
      return { error: "Invoice is already voided" };
    }
    const paid = new Decimal(invoice.paidAmount.toString());
    if (paid.gt(0)) {
      return { error: "Cannot void an invoice with payments. Create a credit note instead." };
    }

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "VOID" },
    });

    await createAuditEvent({
      userId: user.id,
      action: "VOID",
      entityType: "Invoice",
      entityId: invoiceId,
      before: { status: invoice.status },
      after: { status: "VOID" },
    });

    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath("/invoices");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to void invoice" };
  }
}

export async function createCreditNoteAction(parentInvoiceId: string, formData: FormData) {
  try {
    const user = await requirePermission("invoices:create");
    const parentInvoice = await prisma.invoice.findUnique({
      where: { id: parentInvoiceId },
      include: { items: true, customer: true },
    });
    if (!parentInvoice) return { error: "Parent invoice not found" };
    if (parentInvoice.status === "DRAFT") return { error: "Cannot create credit note for draft invoice" };

    const raw = JSON.parse(formData.get("data") as string);

    const creditNote = await createInvoiceService({
      type: "CREDIT_NOTE",
      customerId: parentInvoice.customerId,
      orderId: parentInvoice.orderId || undefined,
      dueDate: new Date(),
      placeOfSupply: parentInvoice.placeOfSupply || undefined,
      isInterState: parentInvoice.isInterState,
      items: raw.items || parentInvoice.items.map((item) => ({
        description: item.description,
        productId: item.productId || undefined,
        hsnCode: item.hsnCode || undefined,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        discount: item.discount.toString(),
        taxRate: new Decimal(item.cgstRate.toString()).plus(new Decimal(item.sgstRate.toString())).plus(new Decimal(item.igstRate.toString())).toString(),
      })),
      parentInvoiceId,
      createdBy: user.id,
    });

    await createAuditEvent({
      userId: user.id,
      action: "CREATE",
      entityType: "Invoice",
      entityId: creditNote.id,
      after: { invoiceNumber: creditNote.invoiceNumber, type: "CREDIT_NOTE", parentInvoice: parentInvoice.invoiceNumber },
    });

    revalidatePath("/invoices");
    return { success: true, invoiceId: creditNote.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to create credit note" };
  }
}

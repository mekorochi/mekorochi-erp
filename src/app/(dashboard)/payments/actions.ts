"use server";

import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { createAuditEvent } from "@/lib/auth/audit";
import { paymentSchema } from "@/lib/validators/invoices";
import { getNextSequence, getCurrentFiscalYear } from "@/lib/services/sequence";
import { updateOrderPaymentStatus } from "@/lib/services/orders";
import { revalidatePath } from "next/cache";
import Decimal from "decimal.js";

export async function recordPaymentAction(_prev: unknown, formData: FormData) {
  try {
    const user = await requirePermission("payments:create");
    const raw = JSON.parse(formData.get("data") as string);
    const parsed = paymentSchema.parse(raw);

    const settings = await prisma.companySettings.findFirst();
    const fy = getCurrentFiscalYear(settings?.financialYearStart || 4);
    const paymentNumber = await getNextSequence("payment", "PAY", fy);

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          paymentNumber,
          type: parsed.type,
          direction: parsed.direction,
          customerId: parsed.customerId,
          orderId: parsed.orderId,
          supplierId: parsed.supplierId,
          amount: new Decimal(parsed.amount).toFixed(2),
          method: parsed.method,
          referenceNumber: parsed.referenceNumber,
          paymentDate: parsed.paymentDate ? new Date(parsed.paymentDate) : new Date(),
          notes: parsed.notes,
          status: "CONFIRMED",
          createdBy: user.id,
        },
      });

      if (parsed.invoiceAllocations && parsed.invoiceAllocations.length > 0) {
        for (const alloc of parsed.invoiceAllocations) {
          const allocAmount = new Decimal(alloc.amount);
          if (allocAmount.lte(0)) continue;

          await tx.paymentAllocation.create({
            data: {
              paymentId: payment.id,
              invoiceId: alloc.invoiceId,
              amount: allocAmount.toFixed(2),
            },
          });

          const invoice = await tx.invoice.findUnique({ where: { id: alloc.invoiceId } });
          if (invoice) {
            const newPaid = new Decimal(invoice.paidAmount.toString()).plus(allocAmount);
            const total = new Decimal(invoice.totalAmount.toString());
            const newStatus = newPaid.gte(total) ? "PAID" : newPaid.gt(0) ? "PARTIALLY_PAID" : invoice.status;

            await tx.invoice.update({
              where: { id: alloc.invoiceId },
              data: {
                paidAmount: newPaid.toFixed(2),
                status: newStatus,
              },
            });
          }
        }
      }

      if (parsed.orderId) {
        await updateOrderPaymentStatus(parsed.orderId, tx);
      }

      return payment;
    });

    await createAuditEvent({
      userId: user.id,
      action: "CREATE",
      entityType: "Payment",
      entityId: result.id,
      after: { paymentNumber: result.paymentNumber, amount: result.amount.toString(), method: result.method },
    });

    revalidatePath("/payments");
    revalidatePath("/invoices");
    if (parsed.orderId) revalidatePath(`/orders/${parsed.orderId}`);
    return { success: true, paymentId: result.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to record payment" };
  }
}

export async function reversePaymentAction(paymentId: string) {
  try {
    const user = await requirePermission("payments:refund");

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { allocations: true },
      });
      if (!payment) throw new Error("Payment not found");
      if (payment.status !== "CONFIRMED") throw new Error("Only confirmed payments can be reversed");

      for (const alloc of payment.allocations) {
        const invoice = await tx.invoice.findUnique({ where: { id: alloc.invoiceId } });
        if (invoice) {
          const newPaid = new Decimal(invoice.paidAmount.toString()).minus(new Decimal(alloc.amount.toString()));
          const newStatus = newPaid.lte(0) ? "POSTED" : "PARTIALLY_PAID";
          await tx.invoice.update({
            where: { id: alloc.invoiceId },
            data: { paidAmount: Decimal.max(newPaid, 0).toFixed(2), status: newStatus },
          });
        }
      }

      await tx.paymentAllocation.deleteMany({ where: { paymentId } });

      const reversed = await tx.payment.update({
        where: { id: paymentId },
        data: { status: "REVERSED" },
      });

      if (payment.orderId) {
        await updateOrderPaymentStatus(payment.orderId, tx);
      }

      return reversed;
    });

    await createAuditEvent({
      userId: user.id,
      action: "REVERSE",
      entityType: "Payment",
      entityId: paymentId,
      after: { paymentNumber: result.paymentNumber, status: "REVERSED" },
    });

    revalidatePath("/payments");
    revalidatePath("/invoices");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to reverse payment" };
  }
}

import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import PaymentForm from "@/components/shared/payment-form";
import Decimal from "decimal.js";

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ invoiceId?: string; orderId?: string; customerId?: string }>;
}) {
  const user = await requirePermission("payments:create");
  const params = await searchParams;

  const [customers, suppliers] = await Promise.all([
    prisma.customer.findMany({
      where: { isActive: true },
      select: { id: true, name: true, company: true },
      orderBy: { name: "asc" },
    }),
    prisma.supplier.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  let outstandingInvoices: Array<{
    id: string;
    invoiceNumber: string;
    totalAmount: string;
    paidAmount: string;
    outstanding: string;
    dueDate: string;
  }> = [];

  if (params.customerId || params.invoiceId) {
    const invoiceWhere: Record<string, unknown> = {
      status: { in: ["POSTED", "PARTIALLY_PAID", "OVERDUE"] },
    };
    if (params.customerId) invoiceWhere.customerId = params.customerId;
    if (params.invoiceId) invoiceWhere.id = params.invoiceId;

    const invoices = await prisma.invoice.findMany({
      where: invoiceWhere as any,
      select: { id: true, invoiceNumber: true, totalAmount: true, paidAmount: true, dueDate: true, customerId: true },
      orderBy: { dueDate: "asc" },
    });

    outstandingInvoices = invoices
      .map((inv) => {
        const total = new Decimal(inv.totalAmount.toString());
        const paid = new Decimal(inv.paidAmount.toString());
        const outstanding = total.minus(paid);
        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          totalAmount: total.toFixed(2),
          paidAmount: paid.toFixed(2),
          outstanding: outstanding.toFixed(2),
          dueDate: inv.dueDate.toISOString().split("T")[0],
        };
      })
      .filter((inv) => new Decimal(inv.outstanding).gt(0));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-playfair)]">Record Payment</h1>
        <p className="text-sm text-muted-foreground mt-1">Record an incoming or outgoing payment</p>
      </div>
      <PaymentForm
        customers={customers}
        suppliers={suppliers}
        outstandingInvoices={outstandingInvoices}
        defaultCustomerId={params.customerId}
        defaultInvoiceId={params.invoiceId}
        defaultOrderId={params.orderId}
      />
    </div>
  );
}

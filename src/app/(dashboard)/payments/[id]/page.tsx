import { requirePermission, checkPermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import PaymentActions from "./payment-actions";

const methodBadge: Record<string, string> = {
  UPI: "bg-emerald-100 text-emerald-800",
  CASH: "bg-muted text-muted-foreground",
  BANK_TRANSFER: "bg-blue-100 text-blue-800",
  CARD: "bg-purple-100 text-purple-800",
  CHEQUE: "bg-amber-100 text-amber-800",
  OTHER: "bg-gray-100 text-gray-600",
};

const statusBadge: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-amber-100 text-amber-800" },
  CONFIRMED: { label: "Confirmed", className: "bg-emerald-100 text-emerald-800" },
  FAILED: { label: "Failed", className: "bg-red-100 text-red-800" },
  REVERSED: { label: "Reversed", className: "bg-gray-100 text-gray-500 line-through" },
};

export default async function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("payments:view");
  const { id } = await params;

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      customer: true,
      order: { select: { id: true, orderNumber: true } },
      allocations: {
        include: { invoice: { select: { id: true, invoiceNumber: true, totalAmount: true } } },
      },
    },
  });

  if (!payment) notFound();

  const canRefund = await checkPermission("payments:refund");

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-[family-name:var(--font-playfair)]">{payment.paymentNumber}</h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[payment.status]?.className || ""}`}>
              {statusBadge[payment.status]?.label || payment.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {payment.direction === "INBOUND" ? "Payment Received" : "Payment Made"} • {formatDate(payment.paymentDate)}
          </p>
        </div>
        {canRefund && payment.status === "CONFIRMED" && (
          <PaymentActions paymentId={payment.id} />
        )}
      </div>

      {/* Payment Info */}
      <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Amount</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(payment.amount)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Method</p>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium mt-1 ${methodBadge[payment.method] || ""}`}>
              {payment.method.replace(/_/g, " ")}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-sm text-muted-foreground">Type</p>
            <p className="font-medium">{payment.type}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Direction</p>
            <p className={`font-medium ${payment.direction === "INBOUND" ? "text-emerald-700" : "text-amber-700"}`}>
              {payment.direction === "INBOUND" ? "Received" : "Paid Out"}
            </p>
          </div>
          {payment.customer && (
            <div>
              <p className="text-sm text-muted-foreground">Customer</p>
              <Link href={`/customers/${payment.customer.id}`} className="font-medium text-primary hover:underline">
                {payment.customer.name}
              </Link>
            </div>
          )}
          {payment.referenceNumber && (
            <div>
              <p className="text-sm text-muted-foreground">Reference</p>
              <p className="font-mono text-sm">{payment.referenceNumber}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Payment Date</p>
            <p>{formatDate(payment.paymentDate)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Recorded</p>
            <p>{formatDateTime(payment.createdAt)}</p>
          </div>
        </div>

        {payment.order && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">Linked Order</p>
            <Link href={`/orders/${payment.order.id}`} className="font-medium text-primary hover:underline">
              {payment.order.orderNumber}
            </Link>
          </div>
        )}

        {payment.notes && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">Notes</p>
            <p className="text-sm mt-1">{payment.notes}</p>
          </div>
        )}
      </div>

      {/* Invoice Allocations */}
      {payment.allocations.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Invoice Allocations</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">Invoice</th>
                  <th className="text-right px-4 py-3 font-medium">Invoice Total</th>
                  <th className="text-right px-4 py-3 font-medium">Allocated</th>
                </tr>
              </thead>
              <tbody>
                {payment.allocations.map((alloc) => (
                  <tr key={alloc.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/invoices/${alloc.invoice.id}`} className="text-primary hover:underline">
                        {alloc.invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(alloc.invoice.totalAmount)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(alloc.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

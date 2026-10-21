import { requirePermission, checkPermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import Decimal from "decimal.js";
import InvoiceActions from "./invoice-actions";

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground" },
  POSTED: { label: "Posted", className: "bg-blue-100 text-blue-800" },
  PARTIALLY_PAID: { label: "Partially Paid", className: "bg-amber-100 text-amber-800" },
  PAID: { label: "Paid", className: "bg-emerald-100 text-emerald-800" },
  OVERDUE: { label: "Overdue", className: "bg-red-100 text-red-800" },
  VOID: { label: "Void", className: "bg-gray-100 text-gray-500" },
  CANCELLED: { label: "Cancelled", className: "bg-gray-100 text-gray-500" },
};

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("invoices:view");
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { orderBy: { sortOrder: "asc" }, include: { product: true } },
      payments: { include: { payment: true } },
      order: { select: { id: true, orderNumber: true } },
    },
  });

  if (!invoice) notFound();

  const canPost = invoice.status === "DRAFT";
  const canVoid = await checkPermission("invoices:void");
  const outstanding = new Decimal(invoice.totalAmount.toString()).minus(new Decimal(invoice.paidAmount.toString()));
  const billing = invoice.billingAddress as Record<string, string> | null;
  const shipping = invoice.shippingAddress as Record<string, string> | null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-[family-name:var(--font-playfair)]">{invoice.invoiceNumber}</h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig[invoice.status]?.className || ""}`}>
              {statusConfig[invoice.status]?.label || invoice.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {invoice.type.replace(/_/g, " ")} • Issued {formatDate(invoice.issueDate)} • Due {formatDate(invoice.dueDate)}
          </p>
        </div>
        <InvoiceActions
          invoiceId={invoice.id}
          status={invoice.status}
          canPost={canPost}
          canVoid={canVoid}
          outstanding={outstanding.toNumber()}
        />
      </div>

      {/* Customer & Addresses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Customer</h3>
          <p className="font-semibold">{invoice.customer.name}</p>
          {invoice.customer.company && <p className="text-sm">{invoice.customer.company}</p>}
          {invoice.customer.gstin && <p className="text-sm font-mono mt-1">GSTIN: {invoice.customer.gstin}</p>}
          {invoice.customer.email && <p className="text-sm text-muted-foreground">{invoice.customer.email}</p>}
        </div>

        {billing && (
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Billing Address</h3>
            <p className="text-sm">{billing.line1}</p>
            {billing.line2 && <p className="text-sm">{billing.line2}</p>}
            <p className="text-sm">{billing.city}, {billing.state} {billing.pincode}</p>
          </div>
        )}

        {shipping && (
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Shipping Address</h3>
            <p className="text-sm">{shipping.line1}</p>
            {shipping.line2 && <p className="text-sm">{shipping.line2}</p>}
            <p className="text-sm">{shipping.city}, {shipping.state} {shipping.pincode}</p>
          </div>
        )}
      </div>

      {/* Place of Supply */}
      {invoice.placeOfSupply && (
        <div className="text-sm">
          <span className="text-muted-foreground">Place of Supply:</span> {invoice.placeOfSupply}
          {invoice.isInterState && <span className="ml-2 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Inter-State (IGST)</span>}
        </div>
      )}

      {/* Items Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium">#</th>
                <th className="text-left px-4 py-3 font-medium">Description</th>
                <th className="text-left px-4 py-3 font-medium">HSN</th>
                <th className="text-right px-4 py-3 font-medium">Qty</th>
                <th className="text-right px-4 py-3 font-medium">Rate</th>
                <th className="text-right px-4 py-3 font-medium">Discount</th>
                <th className="text-right px-4 py-3 font-medium">Taxable</th>
                {!invoice.isInterState ? (
                  <>
                    <th className="text-right px-4 py-3 font-medium">CGST</th>
                    <th className="text-right px-4 py-3 font-medium">SGST</th>
                  </>
                ) : (
                  <th className="text-right px-4 py-3 font-medium">IGST</th>
                )}
                <th className="text-right px-4 py-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{item.description}</p>
                    {item.product && <p className="text-xs text-muted-foreground">{item.product.sku}</p>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{item.hsnCode || "—"}</td>
                  <td className="px-4 py-3 text-right">{new Decimal(item.quantity.toString()).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(item.discount)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(item.taxableAmount)}</td>
                  {!invoice.isInterState ? (
                    <>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-muted-foreground">{new Decimal(item.cgstRate.toString()).toFixed(1)}%</span>{" "}
                        {formatCurrency(item.cgstAmount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-muted-foreground">{new Decimal(item.sgstRate.toString()).toFixed(1)}%</span>{" "}
                        {formatCurrency(item.sgstAmount)}
                      </td>
                    </>
                  ) : (
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs text-muted-foreground">{new Decimal(item.igstRate.toString()).toFixed(1)}%</span>{" "}
                      {formatCurrency(item.igstAmount)}
                    </td>
                  )}
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals & Payment Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notes */}
        <div className="space-y-4">
          {invoice.notes && (
            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Notes</h3>
              <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}
          {invoice.termsConditions && (
            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Terms & Conditions</h3>
              <p className="text-sm whitespace-pre-wrap">{invoice.termsConditions}</p>
            </div>
          )}
          {invoice.order && (
            <div className="text-sm">
              <span className="text-muted-foreground">Linked Order:</span>{" "}
              <Link href={`/orders/${invoice.order.id}`} className="text-primary hover:underline">
                {invoice.order.orderNumber}
              </Link>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          {new Decimal(invoice.discountAmount.toString()).gt(0) && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Discount</span>
              <span className="text-destructive">-{formatCurrency(invoice.discountAmount)}</span>
            </div>
          )}
          {!invoice.isInterState ? (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">CGST</span>
                <span>{formatCurrency(invoice.cgstAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">SGST</span>
                <span>{formatCurrency(invoice.sgstAmount)}</span>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">IGST</span>
              <span>{formatCurrency(invoice.igstAmount)}</span>
            </div>
          )}
          {new Decimal(invoice.shippingAmount.toString()).gt(0) && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span>{formatCurrency(invoice.shippingAmount)}</span>
            </div>
          )}
          {!new Decimal(invoice.roundOff.toString()).isZero() && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Round Off</span>
              <span>{new Decimal(invoice.roundOff.toString()).gt(0) ? "+" : ""}{new Decimal(invoice.roundOff.toString()).toFixed(2)}</span>
            </div>
          )}
          <div className="border-t pt-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Total Amount</span>
              <span className="text-xl font-bold">{formatCurrency(invoice.totalAmount)}</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Paid</span>
            <span className="text-emerald-700 font-medium">{formatCurrency(invoice.paidAmount)}</span>
          </div>
          {outstanding.gt(0) && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Outstanding</span>
              <span className="text-amber-700 font-semibold">{formatCurrency(outstanding)}</span>
            </div>
          )}
          {invoice.amountInWords && (
            <p className="text-xs text-muted-foreground italic pt-2 border-t">{invoice.amountInWords}</p>
          )}
        </div>
      </div>

      {/* Payment History */}
      {invoice.payments.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Payment History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">Payment #</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Method</th>
                  <th className="text-right px-4 py-3 font-medium">Allocated</th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((alloc) => (
                  <tr key={alloc.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/payments/${alloc.payment.id}`} className="text-primary hover:underline">
                        {alloc.payment.paymentNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(alloc.payment.paymentDate)}</td>
                    <td className="px-4 py-3">{alloc.payment.method.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(alloc.amount)}</td>
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

import { requirePermission, checkPermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { formatCurrency, formatDate, formatDateTime, getUnitLabel } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, MapPin, Gift,
  CreditCard, Clock, FileText, Truck, Printer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderActions } from "./order-actions";
import Decimal from "decimal.js";

const ORDER_STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PREPARING: "bg-yellow-100 text-yellow-800",
  PACKED: "bg-teal-100 text-teal-700",
  SHIPPED: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  PARTIALLY_RETURNED: "bg-orange-100 text-orange-700",
  RETURNED: "bg-red-100 text-red-700",
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  UNPAID: "bg-red-50 text-red-600",
  PARTIALLY_PAID: "bg-yellow-50 text-yellow-700",
  PAID: "bg-green-50 text-green-600",
  REFUNDED: "bg-gray-100 text-gray-600",
  PARTIALLY_REFUNDED: "bg-orange-50 text-orange-600",
};

const STEPS = ["DRAFT", "CONFIRMED", "PREPARING", "PACKED", "SHIPPED", "DELIVERED"];

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("orders:view");
  const { id } = await params;

  const order = await prisma.salesOrder.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { include: { product: true }, orderBy: { sortOrder: "asc" } },
      fulfillments: { include: { items: true }, orderBy: { createdAt: "desc" } },
      payments: { orderBy: { paymentDate: "desc" } },
      orderRecipients: true,
      quotation: true,
    },
  });

  if (!order) notFound();

  const canEdit = await checkPermission("orders:edit");
  const canCancel = await checkPermission("orders:cancel");
  const canFulfill = await checkPermission("orders:fulfill");

  const currentStep = STEPS.indexOf(order.status);
  const isCancelled = order.status === "CANCELLED";
  const paidAmount = new Decimal(order.paidAmount?.toString() || "0");
  const totalAmount = new Decimal(order.totalAmount.toString());
  const outstanding = isCancelled ? new Decimal(0) : totalAmount.minus(paidAmount);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <Link href="/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Orders
        </Link>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold font-[family-name:var(--font-playfair)]">{order.orderNumber}</h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${ORDER_STATUS_STYLES[order.status]}`}>
              {order.status.replace(/_/g, " ")}
            </span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${PAYMENT_STATUS_STYLES[order.paymentStatus]}`}>
              {order.paymentStatus.replace(/_/g, " ")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/api/orders/${id}/pdf`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </a>
          {!isCancelled && (
            <OrderActions orderId={id} status={order.status} canEdit={canEdit} canCancel={canCancel} />
          )}
        </div>
      </div>

      {/* Progress Steps */}
      {!isCancelled && (
        <div className="bg-card rounded-xl border shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between overflow-x-auto gap-1">
            {STEPS.map((step, idx) => (
              <div key={step} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                    idx <= currentStep ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {idx < currentStep ? "✓" : idx + 1}
                  </div>
                  <span className="text-[10px] sm:text-xs mt-1 text-center whitespace-nowrap">
                    {step.replace(/_/g, " ")}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 ${idx < currentStep ? "bg-primary" : "bg-muted"}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Order Info */}
          <div className="bg-card rounded-xl border shadow-sm p-4 sm:p-6">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Order Info
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Customer</div>
                <div className="font-medium">{order.customer.name}</div>
                {order.customer.company && <div className="text-xs text-muted-foreground">{order.customer.company}</div>}
              </div>
              <div>
                <div className="text-muted-foreground">Channel</div>
                <div className="font-medium">{order.channel}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Order Date</div>
                <div className="font-medium">{formatDate(order.orderDate)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Items</div>
                <div className="font-medium">{order.items.length}</div>
              </div>
            </div>
            {order.quotation && (
              <div className="mt-3 text-sm">
                <span className="text-muted-foreground">From Quote: </span>
                <Link href={`/quotations/${order.quotation.id}`} className="text-primary hover:underline font-medium">
                  {order.quotation.quoteNumber}
                </Link>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b">
              <h2 className="font-semibold">Line Items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-2.5 font-medium">Product</th>
                    <th className="text-right px-4 py-2.5 font-medium">Qty</th>
                    <th className="text-right px-4 py-2.5 font-medium">Fulfilled</th>
                    <th className="text-right px-4 py-2.5 font-medium">Price</th>
                    <th className="text-right px-4 py-2.5 font-medium">Tax</th>
                    <th className="text-right px-4 py-2.5 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{item.product.name}</div>
                        <div className="text-xs text-muted-foreground">{item.product.sku}</div>
                      </td>
                      <td className="px-4 py-2.5 text-right">{parseFloat(item.quantity.toString())} {getUnitLabel(item.product.unitOfMeasure)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={parseFloat(item.fulfilledQty.toString()) >= parseFloat(item.quantity.toString()) ? "text-green-600" : ""}>
                          {parseFloat(item.fulfilledQty.toString())}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{parseFloat(item.taxRate.toString())}%</td>
                      <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(item.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recipients */}
          {order.orderRecipients.length > 0 && (
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b">
                <h2 className="font-semibold flex items-center gap-2">
                  <Gift className="h-4 w-4 text-gold-deep" />
                  Gift Recipients ({order.orderRecipients.length})
                </h2>
              </div>
              <div className="divide-y">
                {order.orderRecipients.map((r, idx) => (
                  <div key={r.id} className="px-4 sm:px-6 py-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2">
                          {idx + 1}. {r.name}
                          <span className={`px-1.5 py-0.5 rounded text-xs ${
                            r.status === "Delivered" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                          }`}>{r.status}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {[r.address, r.city, r.state, r.pincode].filter(Boolean).join(", ")}
                        </div>
                      </div>
                      {r.deliveryDate && (
                        <div className="text-xs text-muted-foreground">{formatDate(r.deliveryDate)}</div>
                      )}
                    </div>
                    {r.giftNote && <div className="mt-1 text-xs italic text-muted-foreground">&ldquo;{r.giftNote}&rdquo;</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fulfillments */}
          {order.fulfillments.length > 0 && (
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b">
                <h2 className="font-semibold flex items-center gap-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  Fulfillments
                </h2>
              </div>
              <div className="divide-y">
                {order.fulfillments.map((f) => (
                  <div key={f.id} className="px-4 sm:px-6 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium text-sm">{f.fulfillmentNumber}</div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        f.status === "DELIVERED" ? "bg-green-100 text-green-700"
                        : f.status === "SHIPPED" ? "bg-indigo-100 text-indigo-700"
                        : "bg-gray-100 text-gray-700"
                      }`}>{f.status}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {f.items.length} item{f.items.length !== 1 ? "s" : ""}
                      {f.trackingNumber && <span> · Tracking: {f.trackingNumber}</span>}
                      {f.courierName && <span> · {f.courierName}</span>}
                      <span> · {formatDateTime(f.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Totals */}
          <div className="bg-card rounded-xl border shadow-sm p-4 sm:p-6">
            <h2 className="font-semibold mb-4">Amount Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {parseFloat(order.discountAmount.toString()) > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Discount</span>
                  <span>- {formatCurrency(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(order.taxAmount)}</span>
              </div>
              {parseFloat(order.shippingAmount.toString()) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{formatCurrency(order.shippingAmount)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="bg-card rounded-xl border shadow-sm p-4 sm:p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              Payments
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span>{formatCurrency(order.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paid</span>
                <span className="text-green-600">{formatCurrency(paidAmount.toNumber())}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Outstanding</span>
                <span className={outstanding.gt(0) ? "text-red-600" : "text-green-600"}>
                  {formatCurrency(outstanding.toNumber())}
                </span>
              </div>
            </div>
            {order.payments.length > 0 && (
              <div className="mt-4 space-y-2">
                {order.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span>{formatDate(p.paymentDate)}</span>
                      <span className="px-1.5 py-0.5 rounded bg-muted">{p.method}</span>
                    </div>
                    <span className="font-medium">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
            <Link
              href={`/payments/new?orderId=${order.id}&customerId=${order.customerId}`}
              className="inline-flex items-center gap-1.5 mt-4 text-sm text-primary hover:underline font-medium"
            >
              Record Payment
            </Link>
          </div>

          {/* Shipping Address */}
          {order.shippingAddress && (
            <div className="bg-card rounded-xl border shadow-sm p-4 sm:p-6">
              <h3 className="font-semibold mb-2 text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Shipping Address
              </h3>
              <div className="text-sm text-muted-foreground">
                {Object.values(order.shippingAddress as Record<string, string>).filter(Boolean).join(", ")}
              </div>
            </div>
          )}

          {order.notes && (
            <div className="bg-card rounded-xl border shadow-sm p-4 sm:p-6">
              <h3 className="font-semibold mb-2 text-sm">Notes</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}

          {order.giftNote && (
            <div className="bg-card rounded-xl border shadow-sm p-4 sm:p-6">
              <h3 className="font-semibold mb-2 text-sm flex items-center gap-2">
                <Gift className="h-4 w-4 text-gold-deep" />
                Gift Note
              </h3>
              <p className="text-sm text-muted-foreground italic">&ldquo;{order.giftNote}&rdquo;</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

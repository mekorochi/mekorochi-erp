import { requirePermission, checkPermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, CheckCircle, XCircle, ShoppingCart, FileText, Gift, MapPin, Printer, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateQuoteStatus, convertToOrder } from "../actions";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  EXPIRED: "bg-yellow-100 text-yellow-700",
  CONVERTED: "bg-purple-100 text-purple-700",
};

export default async function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("quotations:view");
  const { id } = await params;

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { include: { product: true }, orderBy: { sortOrder: "asc" } },
      recipients: true,
      salesOrder: true,
    },
  });

  if (!quotation) notFound();

  const canEdit = await checkPermission("quotations:edit");
  const canCreateOrder = await checkPermission("orders:create");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Link href="/quotations" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Quotations
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-[family-name:var(--font-playfair)]">{quotation.quoteNumber}</h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[quotation.status]}`}>
              {quotation.status.replace("_", " ")}
            </span>
            {quotation.isGifting && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gold/20 text-gold-deep flex items-center gap-1">
                <Gift className="h-3 w-3" />
                Gifting
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <a href={`/api/quotations/${id}/pdf`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </a>
        {canEdit && quotation.status !== "CONVERTED" && (
          <>
            <Link href={`/quotations/${id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            </Link>
            {quotation.status === "DRAFT" && (
              <form action={async () => { "use server"; await updateQuoteStatus(quotation.id, "SENT"); }}>
                <button className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                  <Send className="h-4 w-4" />
                  Mark Sent
                </button>
              </form>
            )}
            {quotation.status === "SENT" && (
              <>
                <form action={async () => { "use server"; await updateQuoteStatus(quotation.id, "ACCEPTED"); }}>
                  <button className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                    <CheckCircle className="h-4 w-4" />
                    Accepted
                  </button>
                </form>
                <form action={async () => { "use server"; await updateQuoteStatus(quotation.id, "REJECTED"); }}>
                  <button className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
                    <XCircle className="h-4 w-4" />
                    Rejected
                  </button>
                </form>
              </>
            )}
            {quotation.status === "ACCEPTED" && canCreateOrder && !quotation.salesOrder && (
              <form action={async () => { "use server"; await convertToOrder(quotation.id); }}>
                <button className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                  <ShoppingCart className="h-4 w-4" />
                  Convert to Order
                </button>
              </form>
            )}
          </>
        )}
        </div>
      </div>

      {quotation.salesOrder && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 text-sm">
          Converted to order{" "}
          <Link href={`/orders/${quotation.salesOrder.id}`} className="font-medium text-purple-700 underline">
            {quotation.salesOrder.orderNumber}
          </Link>
        </div>
      )}

      {/* Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <div className="bg-card rounded-xl border shadow-sm p-4 sm:p-6">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Quote Details
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Customer</div>
                <div className="font-medium">{quotation.customer.name}</div>
                {quotation.customer.company && <div className="text-xs text-muted-foreground">{quotation.customer.company}</div>}
              </div>
              <div>
                <div className="text-muted-foreground">Issue Date</div>
                <div className="font-medium">{formatDate(quotation.issueDate)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Valid Until</div>
                <div className="font-medium">{formatDate(quotation.validUntil)}</div>
              </div>
              {quotation.deliveryDate && (
                <div>
                  <div className="text-muted-foreground">Delivery Date</div>
                  <div className="font-medium">{formatDate(quotation.deliveryDate)}</div>
                </div>
              )}
              <div>
                <div className="text-muted-foreground">Items</div>
                <div className="font-medium">{quotation.items.length} item{quotation.items.length !== 1 ? "s" : ""}</div>
              </div>
            </div>
            {quotation.customization && (
              <div className="mt-4 text-sm">
                <div className="text-muted-foreground">Customization</div>
                <div>{quotation.customization}</div>
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
                    <th className="text-left px-4 py-2.5 font-medium">#</th>
                    <th className="text-left px-4 py-2.5 font-medium">Product</th>
                    <th className="text-right px-4 py-2.5 font-medium">Qty</th>
                    <th className="text-right px-4 py-2.5 font-medium">Price</th>
                    <th className="text-right px-4 py-2.5 font-medium">Discount</th>
                    <th className="text-right px-4 py-2.5 font-medium">Tax %</th>
                    <th className="text-right px-4 py-2.5 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.items.map((item, idx) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-4 py-2.5 text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{item.product.name}</div>
                        <div className="text-xs text-muted-foreground">{item.product.sku}</div>
                      </td>
                      <td className="px-4 py-2.5 text-right">{parseFloat(item.quantity.toString())}</td>
                      <td className="px-4 py-2.5 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-2.5 text-right">{formatCurrency(item.discount)}</td>
                      <td className="px-4 py-2.5 text-right">{parseFloat(item.taxRate.toString())}%</td>
                      <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(item.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recipients */}
          {quotation.isGifting && quotation.recipients.length > 0 && (
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b">
                <h2 className="font-semibold flex items-center gap-2">
                  <Gift className="h-4 w-4 text-gold-deep" />
                  Gift Recipients ({quotation.recipients.length})
                </h2>
              </div>
              <div className="divide-y">
                {quotation.recipients.map((r, idx) => (
                  <div key={r.id} className="px-4 sm:px-6 py-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-sm">{idx + 1}. {r.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {[r.address, r.city, r.state, r.pincode].filter(Boolean).join(", ")}
                        </div>
                        {r.phone && <div className="text-xs text-muted-foreground">{r.phone}</div>}
                      </div>
                      {r.deliveryDate && (
                        <div className="text-xs text-muted-foreground">Deliver by {formatDate(r.deliveryDate)}</div>
                      )}
                    </div>
                    {r.giftNote && (
                      <div className="mt-1 text-xs italic text-muted-foreground">&ldquo;{r.giftNote}&rdquo;</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Totals */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border shadow-sm p-4 sm:p-6">
            <h2 className="font-semibold mb-4">Amount Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(quotation.subtotal)}</span>
              </div>
              {parseFloat(quotation.discountAmount.toString()) > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Discount</span>
                  <span>- {formatCurrency(quotation.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(quotation.taxAmount)}</span>
              </div>
              {parseFloat(quotation.shippingAmount.toString()) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{formatCurrency(quotation.shippingAmount)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>{formatCurrency(quotation.totalAmount)}</span>
              </div>
            </div>
          </div>

          {quotation.notes && (
            <div className="bg-card rounded-xl border shadow-sm p-4 sm:p-6">
              <h3 className="font-semibold mb-2 text-sm">Notes</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quotation.notes}</p>
            </div>
          )}

          {quotation.termsConditions && (
            <div className="bg-card rounded-xl border shadow-sm p-4 sm:p-6">
              <h3 className="font-semibold mb-2 text-sm">Terms & Conditions</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quotation.termsConditions}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import Decimal from "decimal.js";
import { POActions } from "./po-actions";
import { ReceiveGoodsForm } from "./receive-form";

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "success" | "destructive" | "warning" | "outline" | "info" }> = {
  DRAFT: { label: "Draft", variant: "outline" },
  PENDING_APPROVAL: { label: "Pending Approval", variant: "warning" },
  APPROVED: { label: "Approved", variant: "info" },
  PARTIALLY_RECEIVED: { label: "Partially Received", variant: "warning" },
  RECEIVED: { label: "Fully Received", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
};

export default async function PODetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("purchasing:view");
  const { id } = await params;

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      items: { include: { product: true } },
      receipts: { include: { items: true }, orderBy: { createdAt: "desc" } },
      approver: true,
    },
  });

  if (!po) notFound();

  const warehouses = await prisma.warehouse.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true },
  });

  const statusConfig = STATUS_BADGES[po.status] || { label: po.status, variant: "outline" as const };
  const canApprove = po.status === "DRAFT" || po.status === "PENDING_APPROVAL";
  const canReceive = po.status === "APPROVED" || po.status === "PARTIALLY_RECEIVED";

  return (
    <div>
      <PageHeader title={po.poNumber} description={`Purchase order from ${po.supplier.name}`}>
        <Link href="/purchasing">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status & Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={statusConfig.variant as never} className="text-sm px-3 py-1">{statusConfig.label}</Badge>
                <POActions poId={po.id} canApprove={canApprove} />
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-3 py-2 font-medium">Product</th>
                      <th className="text-right px-3 py-2 font-medium">Qty</th>
                      <th className="text-right px-3 py-2 font-medium">Received</th>
                      <th className="text-right px-3 py-2 font-medium">Price</th>
                      <th className="text-right px-3 py-2 font-medium">Tax %</th>
                      <th className="text-right px-3 py-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {po.items.map((item) => {
                      const received = new Decimal(item.receivedQty.toString());
                      const ordered = new Decimal(item.quantity.toString());
                      const isComplete = received.gte(ordered);

                      return (
                        <tr key={item.id} className="border-b">
                          <td className="px-3 py-2">
                            <p className="font-medium">{item.product.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{item.product.sku}</p>
                          </td>
                          <td className="px-3 py-2 text-right font-mono">{formatNumber(ordered.toNumber(), 1)}</td>
                          <td className="px-3 py-2 text-right">
                            <span className={`font-mono ${isComplete ? "text-sage-deep" : received.gt(0) ? "text-gold-deep" : "text-muted-foreground"}`}>
                              {formatNumber(received.toNumber(), 1)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice.toString())}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground">{item.taxRate.toString()}%</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.totalAmount.toString())}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <Separator className="my-4" />

              <div className="flex justify-end">
                <div className="w-64 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(po.subtotal.toString())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatCurrency(po.taxAmount.toString())}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Total</span>
                    <span>{formatCurrency(po.totalAmount.toString())}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Receiving */}
          {canReceive && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Receive Goods</CardTitle>
              </CardHeader>
              <CardContent>
                <ReceiveGoodsForm
                  poId={po.id}
                  items={po.items.map((item) => ({
                    productId: item.productId,
                    productName: item.product.name,
                    productSku: item.product.sku,
                    ordered: parseFloat(item.quantity.toString()),
                    received: parseFloat(item.receivedQty.toString()),
                    remaining: parseFloat(new Decimal(item.quantity.toString()).minus(new Decimal(item.receivedQty.toString())).toFixed(3)),
                  }))}
                  warehouses={warehouses}
                />
              </CardContent>
            </Card>
          )}

          {/* Receipt History */}
          {po.receipts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Receipt History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {po.receipts.map((receipt) => (
                    <div key={receipt.id} className="p-3 rounded-lg bg-muted/30 border text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="font-mono font-medium">{receipt.receiptNumber}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(receipt.receivedDate)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {receipt.items.length} item(s) received
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Supplier</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{po.supplier.name}</p>
              {po.supplier.contactPerson && <p className="text-muted-foreground">{po.supplier.contactPerson}</p>}
              {po.supplier.phone && <p className="text-muted-foreground">{po.supplier.phone}</p>}
              {po.supplier.email && <p className="text-muted-foreground">{po.supplier.email}</p>}
              {po.supplier.gstin && (
                <p className="text-xs font-mono text-muted-foreground">GSTIN: {po.supplier.gstin}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Date</span>
                <span>{formatDate(po.orderDate)}</span>
              </div>
              {po.expectedDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expected</span>
                  <span>{formatDate(po.expectedDate)}</span>
                </div>
              )}
              {po.approver && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Approved by</span>
                  <span>{po.approver.name}</span>
                </div>
              )}
              {po.notes && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">{po.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

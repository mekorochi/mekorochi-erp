import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ShoppingCart, Plus, Users } from "lucide-react";
import Link from "next/link";

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "success" | "destructive" | "warning" | "outline" | "info" }> = {
  DRAFT: { label: "Draft", variant: "outline" },
  PENDING_APPROVAL: { label: "Pending Approval", variant: "warning" },
  APPROVED: { label: "Approved", variant: "info" },
  PARTIALLY_RECEIVED: { label: "Partial", variant: "warning" },
  RECEIVED: { label: "Received", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
};

export default async function PurchasingPage() {
  await requirePermission("purchasing:view");

  const purchaseOrders = await prisma.purchaseOrder.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { supplier: true, _count: { select: { items: true } } },
  });

  return (
    <div>
      <PageHeader title="Purchase Orders" description="Manage supplier orders and receiving">
        <Link href="/purchasing/suppliers">
          <Button variant="outline" size="sm">
            <Users className="h-4 w-4 mr-2" />
            Suppliers
          </Button>
        </Link>
        <Link href="/purchasing/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New PO
          </Button>
        </Link>
      </PageHeader>

      {purchaseOrders.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No purchase orders yet"
          description="Create a purchase order to start buying ingredients and packaging from suppliers."
          actionLabel="New Purchase Order"
          actionHref="/purchasing/new"
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium">PO Number</th>
                    <th className="text-left px-4 py-3 font-medium">Supplier</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Order Date</th>
                    <th className="text-left px-4 py-3 font-medium">Expected</th>
                    <th className="text-right px-4 py-3 font-medium">Items</th>
                    <th className="text-right px-4 py-3 font-medium">Total</th>
                    <th className="text-right px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.map((po) => {
                    const status = STATUS_BADGES[po.status] || { label: po.status, variant: "outline" as const };
                    return (
                      <tr key={po.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-sm">
                          <Link href={`/purchasing/${po.id}`} className="hover:underline text-primary">
                            {po.poNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{po.supplier.name}</td>
                        <td className="px-4 py-3">
                          <Badge variant={status.variant as never}>{status.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(po.orderDate)}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {po.expectedDate ? formatDate(po.expectedDate) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">{po._count.items}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(po.totalAmount.toString())}</td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/purchasing/${po.id}`}>
                            <Button variant="ghost" size="sm">View</Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {purchaseOrders.map((po) => {
              const status = STATUS_BADGES[po.status] || { label: po.status, variant: "outline" as const };
              return (
                <Link key={po.id} href={`/purchasing/${po.id}`}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-mono font-medium text-sm text-primary">{po.poNumber}</p>
                          <p className="text-sm">{po.supplier.name}</p>
                        </div>
                        <Badge variant={status.variant as never}>{status.label}</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{formatDate(po.orderDate)}</span>
                        <span className="font-medium">{formatCurrency(po.totalAmount.toString())}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

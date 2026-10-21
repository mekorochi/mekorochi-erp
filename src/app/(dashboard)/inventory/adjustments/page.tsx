import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { formatNumber, formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ClipboardList, Plus } from "lucide-react";
import { StockAdjustmentDialog } from "./adjustment-dialog";
import Decimal from "decimal.js";

const MOVEMENT_LABELS: Record<string, { label: string; variant: "default" | "success" | "destructive" | "warning" | "outline" }> = {
  PURCHASE_RECEIPT: { label: "Purchase Receipt", variant: "success" },
  PRODUCTION_CONSUME: { label: "Production Consumed", variant: "destructive" },
  PRODUCTION_OUTPUT: { label: "Production Output", variant: "success" },
  SALE_DISPATCH: { label: "Sale Dispatch", variant: "destructive" },
  SALE_RETURN: { label: "Sale Return", variant: "warning" },
  TRANSFER_IN: { label: "Transfer In", variant: "success" },
  TRANSFER_OUT: { label: "Transfer Out", variant: "destructive" },
  ADJUSTMENT_IN: { label: "Adjustment In", variant: "success" },
  ADJUSTMENT_OUT: { label: "Adjustment Out", variant: "destructive" },
  OPENING_BALANCE: { label: "Opening Balance", variant: "default" },
  DAMAGE: { label: "Damage", variant: "destructive" },
  RECALL_HOLD: { label: "Recall Hold", variant: "warning" },
  RECALL_RELEASE: { label: "Recall Release", variant: "success" },
};

export default async function AdjustmentsPage() {
  await requirePermission("inventory:view");

  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true, sku: true },
    orderBy: { name: "asc" },
  });

  const warehouses = await prisma.warehouse.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  const movements = await prisma.stockMovement.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { warehouse: true, lot: true },
  });

  const productIds = [...new Set(movements.map((m) => m.productId))];
  const productsMap = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, sku: true },
  });
  const pMap = new Map(productsMap.map((p) => [p.id, p]));

  return (
    <div>
      <PageHeader title="Stock Movements" description="Track all stock adjustments and movements">
        <StockAdjustmentDialog products={products} warehouses={warehouses} />
      </PageHeader>

      {movements.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No movements yet"
          description="Stock movements will appear here as you receive purchases, adjust inventory, or dispatch orders."
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium">Date</th>
                    <th className="text-left px-4 py-3 font-medium">Type</th>
                    <th className="text-left px-4 py-3 font-medium">Product</th>
                    <th className="text-left px-4 py-3 font-medium">Warehouse</th>
                    <th className="text-left px-4 py-3 font-medium">Lot</th>
                    <th className="text-right px-4 py-3 font-medium">Qty</th>
                    <th className="text-left px-4 py-3 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => {
                    const product = pMap.get(m.productId);
                    const qty = new Decimal(m.quantity.toString());
                    const config = MOVEMENT_LABELS[m.movementType] || { label: m.movementType, variant: "outline" as const };

                    return (
                      <tr key={m.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                          {formatDateTime(m.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={config.variant}>{config.label}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium">{product?.name || "—"}</span>
                          <span className="block text-xs text-muted-foreground font-mono">{product?.sku}</span>
                        </td>
                        <td className="px-4 py-3">{m.warehouse.name}</td>
                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                          {m.lot?.lotNumber || "—"}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono font-medium ${qty.gt(0) ? "text-sage-deep" : "text-destructive"}`}>
                          {qty.gt(0) ? "+" : ""}{formatNumber(qty.toNumber(), 1)}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">
                          {m.reason || m.notes || "—"}
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
            {movements.map((m) => {
              const product = pMap.get(m.productId);
              const qty = new Decimal(m.quantity.toString());
              const config = MOVEMENT_LABELS[m.movementType] || { label: m.movementType, variant: "outline" as const };

              return (
                <Card key={m.id}>
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-start justify-between mb-1">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate text-sm">{product?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{m.warehouse.name} · {formatDateTime(m.createdAt)}</p>
                      </div>
                      <span className={`font-mono font-bold text-sm ${qty.gt(0) ? "text-sage-deep" : "text-destructive"}`}>
                        {qty.gt(0) ? "+" : ""}{formatNumber(qty.toNumber(), 1)}
                      </span>
                    </div>
                    <Badge variant={config.variant} className="text-xs">{config.label}</Badge>
                    {(m.reason || m.notes) && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{m.reason || m.notes}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

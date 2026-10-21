import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Layers, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Decimal from "decimal.js";

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "success" | "destructive" | "warning" | "outline" }> = {
  AVAILABLE: { label: "Available", variant: "success" },
  RESERVED: { label: "Reserved", variant: "warning" },
  QUARANTINE: { label: "Quarantine", variant: "destructive" },
  EXPIRED: { label: "Expired", variant: "destructive" },
  CONSUMED: { label: "Consumed", variant: "outline" },
  RECALLED: { label: "Recalled", variant: "destructive" },
};

export default async function LotsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; expiring?: string }>;
}) {
  await requirePermission("inventory:view");
  const params = await searchParams;

  const where: Record<string, unknown> = {};
  if (params.status) where.status = params.status;
  if (params.expiring) {
    const days = parseInt(params.expiring, 10) || 30;
    const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    where.expiryDate = { lte: cutoff, gte: new Date() };
    where.status = "AVAILABLE";
  }

  const lots = await prisma.stockLot.findMany({
    where: where as never,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const productIds = [...new Set(lots.map((l) => l.productId))];
  const warehouseIds = [...new Set(lots.map((l) => l.warehouseId))];

  const [products, warehouses] = await Promise.all([
    prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, sku: true } }),
    prisma.warehouse.findMany({ where: { id: { in: warehouseIds } }, select: { id: true, name: true } }),
  ]);

  const pMap = new Map(products.map((p) => [p.id, p]));
  const wMap = new Map(warehouses.map((w) => [w.id, w]));
  const now = new Date();

  return (
    <div>
      <PageHeader title="Lot / Batch Tracking" description="Track lots, batches, and expiry dates">
        <Link href="/inventory">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inventory
          </Button>
        </Link>
      </PageHeader>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link href="/inventory/lots">
          <Badge variant={!params.status && !params.expiring ? "default" : "outline"} className="cursor-pointer px-3 py-1">All</Badge>
        </Link>
        <Link href="/inventory/lots?status=AVAILABLE">
          <Badge variant={params.status === "AVAILABLE" ? "success" : "outline"} className="cursor-pointer px-3 py-1">Available</Badge>
        </Link>
        <Link href="/inventory/lots?status=QUARANTINE">
          <Badge variant={params.status === "QUARANTINE" ? "warning" : "outline"} className="cursor-pointer px-3 py-1">Quarantine</Badge>
        </Link>
        <Link href="/inventory/lots?status=RECALLED">
          <Badge variant={params.status === "RECALLED" ? "destructive" : "outline"} className="cursor-pointer px-3 py-1">Recalled</Badge>
        </Link>
        <Link href="/inventory/lots?expiring=30">
          <Badge variant={params.expiring ? "warning" : "outline"} className="cursor-pointer px-3 py-1">Expiring 30d</Badge>
        </Link>
      </div>

      {lots.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No lots found"
          description="Stock lots are created when goods are received, produced, or adjusted with a lot number."
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium">Lot Number</th>
                    <th className="text-left px-4 py-3 font-medium">Product</th>
                    <th className="text-left px-4 py-3 font-medium">Warehouse</th>
                    <th className="text-right px-4 py-3 font-medium">Qty</th>
                    <th className="text-right px-4 py-3 font-medium">Cost/Unit</th>
                    <th className="text-left px-4 py-3 font-medium">Manufacture</th>
                    <th className="text-left px-4 py-3 font-medium">Expiry</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lots.map((lot) => {
                    const product = pMap.get(lot.productId);
                    const warehouse = wMap.get(lot.warehouseId);
                    const qty = new Decimal(lot.quantity.toString());
                    const cost = new Decimal(lot.costPerUnit.toString());
                    const statusConfig = STATUS_BADGES[lot.status] || { label: lot.status, variant: "outline" as const };
                    const isExpiring = lot.expiryDate && lot.expiryDate <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) && lot.expiryDate > now;
                    const isExpired = lot.expiryDate && lot.expiryDate <= now;

                    return (
                      <tr key={lot.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs font-medium">{lot.lotNumber}</td>
                        <td className="px-4 py-3">
                          <span className="font-medium">{product?.name || "—"}</span>
                          <span className="block text-xs text-muted-foreground font-mono">{product?.sku}</span>
                        </td>
                        <td className="px-4 py-3">{warehouse?.name || "—"}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatNumber(qty.toNumber(), 1)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(cost.toNumber())}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {lot.manufactureDate ? formatDate(lot.manufactureDate) : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {lot.expiryDate ? (
                            <span className={isExpired ? "text-destructive font-medium" : isExpiring ? "text-gold-deep font-medium" : "text-muted-foreground"}>
                              {formatDate(lot.expiryDate)}
                              {isExpired && " (Expired)"}
                              {isExpiring && " (Expiring)"}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
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
            {lots.map((lot) => {
              const product = pMap.get(lot.productId);
              const qty = new Decimal(lot.quantity.toString());
              const statusConfig = STATUS_BADGES[lot.status] || { label: lot.status, variant: "outline" as const };
              const isExpiring = lot.expiryDate && lot.expiryDate <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) && lot.expiryDate > now;
              const isExpired = lot.expiryDate && lot.expiryDate <= now;

              return (
                <Card key={lot.id}>
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-start justify-between mb-1">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs font-semibold">{lot.lotNumber}</p>
                        <p className="font-medium text-sm truncate">{product?.name}</p>
                      </div>
                      <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Qty: </span>
                        <span className="font-mono font-medium">{formatNumber(qty.toNumber(), 1)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Expiry: </span>
                        <span className={isExpired ? "text-destructive" : isExpiring ? "text-gold-deep" : ""}>
                          {lot.expiryDate ? formatDate(lot.expiryDate) : "N/A"}
                        </span>
                      </div>
                    </div>
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

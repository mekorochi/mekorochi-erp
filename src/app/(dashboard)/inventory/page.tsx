import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Package, AlertTriangle, Clock, DollarSign, Plus, Warehouse } from "lucide-react";
import Link from "next/link";
import Decimal from "decimal.js";
import { InventoryFilters } from "./inventory-filters";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ warehouse?: string; q?: string }>;
}) {
  await requirePermission("inventory:view");
  const params = await searchParams;

  const warehouses = await prisma.warehouse.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });

  const stockWhere: Record<string, unknown> = {};
  if (params.warehouse) stockWhere.warehouseId = params.warehouse;
  if (params.q) {
    stockWhere.itemName = { contains: params.q, mode: "insensitive" };
  }

  const stockItems = await prisma.stockItem.findMany({
    where: stockWhere as never,
    include: { warehouse: true },
    orderBy: { itemName: "asc" },
    take: 200,
  });

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const expiringLots = await prisma.stockLot.findMany({
    where: {
      status: "AVAILABLE",
      quantity: { gt: 0 },
      expiryDate: { lte: thirtyDaysFromNow, gte: now },
    },
  });

  const totalValue = stockItems.reduce((sum, si) => {
    return sum.plus(new Decimal(si.quantity.toString()).mul(new Decimal(si.avgCost.toString())));
  }, new Decimal(0));

  const uniqueItems = new Set(stockItems.map((si) => si.itemName));

  return (
    <div>
      <PageHeader title="Inventory" description="Track raw material stock across warehouses">
        <Link href="/inventory/warehouses">
          <Button variant="outline" size="sm">
            <Warehouse className="h-4 w-4 mr-2" />
            Warehouses
          </Button>
        </Link>
        <Link href="/inventory/lots">
          <Button variant="outline" size="sm">
            <Clock className="h-4 w-4 mr-2" />
            Lots
          </Button>
        </Link>
        <Link href="/inventory/adjustments">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Adjust Stock
          </Button>
        </Link>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{uniqueItems.size}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Out of Stock</p>
                <p className="text-2xl font-bold">{stockItems.filter(si => new Decimal(si.quantity.toString()).lte(0)).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gold/10">
                <Clock className="h-5 w-5 text-gold-deep" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expiring (30d)</p>
                <p className="text-2xl font-bold">{expiringLots.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sage/10">
                <DollarSign className="h-5 w-5 text-sage-deep" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Stock Value</p>
                <p className="text-2xl font-bold truncate">{formatCurrency(totalValue.toNumber())}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <InventoryFilters warehouses={warehouses} />

      {/* Stock Table */}
      {stockItems.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No stock items found"
          description="Stock will appear here as you receive purchases or make adjustments."
          actionLabel="Adjust Stock"
          actionHref="/inventory/adjustments"
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-4 py-3 font-medium">Item</th>
                      <th className="text-left px-4 py-3 font-medium">Unit</th>
                      <th className="text-left px-4 py-3 font-medium">Warehouse</th>
                      <th className="text-right px-4 py-3 font-medium">Qty</th>
                      <th className="text-right px-4 py-3 font-medium">Reserved</th>
                      <th className="text-right px-4 py-3 font-medium">Available</th>
                      <th className="text-right px-4 py-3 font-medium">Avg Cost</th>
                      <th className="text-right px-4 py-3 font-medium">Value</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockItems.map((si) => {
                      const qty = new Decimal(si.quantity.toString());
                      const reserved = new Decimal(si.reservedQty.toString());
                      const available = qty.minus(reserved);
                      const cost = new Decimal(si.avgCost.toString());
                      const value = qty.mul(cost);

                      return (
                        <tr key={si.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium">{si.itemName}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{si.unit}</td>
                          <td className="px-4 py-3">{si.warehouse.name}</td>
                          <td className="px-4 py-3 text-right font-mono">{formatNumber(qty.toNumber(), 1)} <span className="text-muted-foreground text-xs">{si.unit}</span></td>
                          <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                            {reserved.gt(0) ? `${formatNumber(reserved.toNumber(), 1)} ${si.unit}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-mono">{formatNumber(available.toNumber(), 1)} <span className="text-muted-foreground text-xs">{si.unit}</span></td>
                          <td className="px-4 py-3 text-right">{formatCurrency(cost.toNumber())}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(value.toNumber())}</td>
                          <td className="px-4 py-3">
                            {qty.lte(0) ? (
                              <Badge variant="destructive">Out</Badge>
                            ) : available.lte(0) ? (
                              <Badge variant="outline">Reserved</Badge>
                            ) : (
                              <Badge variant="success">OK</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {stockItems.map((si) => {
              const qty = new Decimal(si.quantity.toString());
              const reserved = new Decimal(si.reservedQty.toString());
              const available = qty.minus(reserved);
              const cost = new Decimal(si.avgCost.toString());

              return (
                <Card key={si.id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{si.itemName}</p>
                        <p className="text-xs text-muted-foreground">{si.warehouse.name} · {si.unit}</p>
                      </div>
                      {qty.lte(0) ? (
                        <Badge variant="destructive">Out</Badge>
                      ) : (
                        <Badge variant="success">OK</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Qty</p>
                        <p className="font-mono font-medium">{formatNumber(qty.toNumber(), 1)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Available</p>
                        <p className="font-mono font-medium">{formatNumber(available.toNumber(), 1)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Value</p>
                        <p className="font-mono font-medium">{formatCurrency(qty.mul(cost).toNumber())}</p>
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

import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package, AlertTriangle, Clock, IndianRupee } from "lucide-react";
import Decimal from "decimal.js";

export default async function InventoryReportPage() {
  await requirePermission("reports:view");

  const stockItems = await prisma.stockItem.findMany({
    include: { product: true, warehouse: true },
    orderBy: { product: { name: "asc" } },
  });

  const totalSKUs = new Set(stockItems.map((s) => s.productId)).size;
  const totalValue = stockItems.reduce(
    (sum, s) =>
      sum.plus(
        new Decimal(s.quantity.toString()).mul(new Decimal(s.avgCost.toString()))
      ),
    new Decimal(0)
  );

  // Low stock: available < product reorder level
  const lowStock = stockItems.filter((s) => {
    if (!s.product.reorderLevel) return false;
    const available = new Decimal(s.quantity.toString()).minus(
      new Decimal(s.reservedQty.toString())
    );
    return available.lt(new Decimal(s.product.reorderLevel.toString()));
  });

  // Expiring within 30 days
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const in60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const in90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const expiringLots = await prisma.stockLot.findMany({
    where: {
      expiryDate: { lte: in90, gte: now },
      status: "AVAILABLE",
      quantity: { gt: 0 },
    },
    orderBy: { expiryDate: "asc" },
    take: 50,
  });

  const expiring30 = expiringLots.filter(
    (l) => l.expiryDate && l.expiryDate <= in30
  ).length;
  const expiring60 = expiringLots.filter(
    (l) => l.expiryDate && l.expiryDate > in30 && l.expiryDate <= in60
  ).length;
  const expiring90 = expiringLots.filter(
    (l) => l.expiryDate && l.expiryDate > in60 && l.expiryDate <= in90
  ).length;

  // Recent movements
  const recentMovements = await prisma.stockMovement.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold font-[family-name:var(--font-playfair)]">
          Inventory Reports
        </h1>
        <p className="text-muted-foreground mt-1">
          Stock levels, expiry tracking, and valuation.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/5 p-2.5">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total SKUs</p>
              <p className="text-xl font-semibold">{totalSKUs}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-destructive/10 p-2.5">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Low Stock</p>
              <p className="text-xl font-semibold">{lowStock.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2.5">
              <Clock className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Expiring (30d)</p>
              <p className="text-xl font-semibold">{expiring30}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-accent/10 p-2.5">
              <IndianRupee className="h-5 w-5 text-gold-deep" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Stock Value</p>
              <p className="text-xl font-semibold">{formatCurrency(totalValue)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Low Stock Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lowStock.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              All items are above reorder levels.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Reorder Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStock.map((s) => {
                    const available = new Decimal(s.quantity.toString()).minus(
                      new Decimal(s.reservedQty.toString())
                    );
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">
                          {s.product.name}
                        </TableCell>
                        <TableCell>{s.warehouse.name}</TableCell>
                        <TableCell className="text-right text-destructive font-medium">
                          {formatNumber(available, 1)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(s.product.reorderLevel!, 1)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expiring Stock */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" />
            Expiring Stock
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-4">
            <Badge variant="destructive">30 days: {expiring30}</Badge>
            <Badge variant="warning">60 days: {expiring60}</Badge>
            <Badge variant="outline">90 days: {expiring90}</Badge>
          </div>
          {expiringLots.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              No lots expiring within 90 days.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lot</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Expiry</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expiringLots.slice(0, 20).map((lot) => (
                    <TableRow key={lot.id}>
                      <TableCell className="font-mono text-sm">
                        {lot.lotNumber}
                      </TableCell>
                      <TableCell>{lot.productId}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(lot.quantity, 1)}
                      </TableCell>
                      <TableCell>
                        {lot.expiryDate && (
                          <Badge
                            variant={
                              lot.expiryDate <= in30 ? "destructive" : "warning"
                            }
                          >
                            {formatDate(lot.expiryDate)}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Valuation Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stock on Hand</CardTitle>
        </CardHeader>
        <CardContent>
          {stockItems.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              No stock items found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Reserved</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Avg Cost</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockItems.slice(0, 50).map((s) => {
                    const qty = new Decimal(s.quantity.toString());
                    const reserved = new Decimal(s.reservedQty.toString());
                    const cost = new Decimal(s.avgCost.toString());
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">
                          {s.product.name}
                        </TableCell>
                        <TableCell>{s.warehouse.name}</TableCell>
                        <TableCell className="text-right">
                          {formatNumber(qty, 1)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatNumber(reserved, 1)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatNumber(qty.minus(reserved), 1)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(cost)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(qty.mul(cost))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Movements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Stock Movements</CardTitle>
        </CardHeader>
        <CardContent>
          {recentMovements.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              No stock movements recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentMovements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm">
                        {formatDate(m.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {m.movementType.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{m.productId}</TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          Number(m.quantity) > 0
                            ? "text-green-700"
                            : "text-red-700"
                        }`}
                      >
                        {Number(m.quantity) > 0 ? "+" : ""}
                        {formatNumber(m.quantity, 1)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {m.reason || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

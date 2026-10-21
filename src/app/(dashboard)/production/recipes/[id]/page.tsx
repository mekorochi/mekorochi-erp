import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatNumber, formatCurrency } from "@/lib/utils";
import { ChevronLeft, Edit, Copy } from "lucide-react";
import Decimal from "decimal.js";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("production:view");
  const { id } = await params;

  const bom = await prisma.bOM.findUnique({
    where: { id },
    include: {
      product: true,
      items: {
        include: { product: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!bom) notFound();

  const totalCost = bom.items.reduce((sum, item) => {
    const qty = new Decimal(item.quantity.toString());
    const cost = item.product.costPrice
      ? new Decimal(item.product.costPrice.toString())
      : new Decimal(0);
    const wastage = item.wastagePercent
      ? qty.mul(new Decimal(item.wastagePercent.toString())).div(100)
      : new Decimal(0);
    return sum.plus(qty.plus(wastage).mul(cost));
  }, new Decimal(0));

  const costPerUnit = new Decimal(bom.batchSize.toString()).gt(0)
    ? totalCost.div(new Decimal(bom.batchSize.toString()))
    : new Decimal(0);

  const processStages = (bom.processStages as string[]) || [];
  const productionCount = await prisma.productionOrder.count({
    where: { bomId: bom.id },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/production/recipes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Recipes
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-playfair)]">
              {bom.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {bom.product.name} &middot; Version {bom.version} &middot;{" "}
              {bom.isActive ? (
                <span className="text-green-600">Active</span>
              ) : (
                <span className="text-gray-500">Inactive</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/production/new?bomId=${bom.id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Start Production
            </Link>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Batch Size</p>
          <p className="text-lg font-bold mt-1">
            {formatNumber(bom.batchSize.toString(), 0)}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {bom.batchUnit.toLowerCase()}
            </span>
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Ingredients</p>
          <p className="text-lg font-bold mt-1">{bom.items.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Est. Batch Cost</p>
          <p className="text-lg font-bold mt-1">
            {formatCurrency(totalCost.toNumber())}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Cost / Unit</p>
          <p className="text-lg font-bold mt-1">
            {formatCurrency(costPerUnit.toNumber())}
          </p>
        </div>
      </div>

      {/* Yield & Wastage */}
      {(bom.expectedYield || bom.wastagePercent) && (
        <div className="flex flex-wrap gap-4 text-sm">
          {bom.expectedYield && (
            <span className="rounded-full bg-green-50 text-green-700 px-3 py-1">
              Expected Yield: {formatNumber(bom.expectedYield.toString())}%
            </span>
          )}
          {bom.wastagePercent && (
            <span className="rounded-full bg-amber-50 text-amber-700 px-3 py-1">
              Wastage: {formatNumber(bom.wastagePercent.toString())}%
            </span>
          )}
          <span className="rounded-full bg-blue-50 text-blue-700 px-3 py-1">
            {productionCount} production orders
          </span>
        </div>
      )}

      {/* Ingredients Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Ingredients</h2>
        </div>

        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  #
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Material
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  SKU
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Quantity
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Unit
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Wastage %
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Unit Cost
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Line Cost
                </th>
              </tr>
            </thead>
            <tbody>
              {bom.items.map((item, idx) => {
                const qty = new Decimal(item.quantity.toString());
                const cost = item.product.costPrice
                  ? new Decimal(item.product.costPrice.toString())
                  : new Decimal(0);
                const wastage = item.wastagePercent
                  ? qty
                      .mul(new Decimal(item.wastagePercent.toString()))
                      .div(100)
                  : new Decimal(0);
                const lineCost = qty.plus(wastage).mul(cost);

                return (
                  <tr
                    key={item.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {item.product.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.product.sku}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatNumber(item.quantity.toString(), 3)}
                    </td>
                    <td className="px-4 py-3">{item.unit.toLowerCase()}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {item.wastagePercent
                        ? `${formatNumber(item.wastagePercent.toString())}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatCurrency(cost.toNumber())}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {formatCurrency(lineCost.toNumber())}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-muted/30 font-semibold">
                <td colSpan={7} className="px-4 py-3 text-right">
                  Total Batch Cost
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatCurrency(totalCost.toNumber())}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y">
          {bom.items.map((item, idx) => {
            const qty = new Decimal(item.quantity.toString());
            const cost = item.product.costPrice
              ? new Decimal(item.product.costPrice.toString())
              : new Decimal(0);
            const lineCost = qty.mul(cost);

            return (
              <div key={item.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.product.sku}
                    </p>
                  </div>
                  <p className="font-medium text-sm tabular-nums">
                    {formatCurrency(lineCost.toNumber())}
                  </p>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span>
                    {formatNumber(item.quantity.toString(), 3)}{" "}
                    {item.unit.toLowerCase()}
                  </span>
                  {item.wastagePercent && (
                    <span>
                      +{formatNumber(item.wastagePercent.toString())}% waste
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          <div className="p-4 font-semibold flex justify-between bg-muted/30">
            <span>Total Batch Cost</span>
            <span className="tabular-nums">
              {formatCurrency(totalCost.toNumber())}
            </span>
          </div>
        </div>
      </div>

      {/* Process Stages */}
      {processStages.length > 0 && (
        <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-3">
          <h2 className="text-lg font-semibold">Process Stages</h2>
          <ol className="space-y-2">
            {processStages.map((stage, idx) => (
              <li key={idx} className="flex items-center gap-3">
                <span className="w-7 h-7 flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                  {idx + 1}
                </span>
                <span className="text-sm">{stage}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Notes */}
      {bom.notes && (
        <div className="rounded-xl border bg-card p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-2">Notes</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {bom.notes}
          </p>
        </div>
      )}
    </div>
  );
}

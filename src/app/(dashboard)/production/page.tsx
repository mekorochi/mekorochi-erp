import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import Link from "next/link";
import { formatDate, formatNumber } from "@/lib/utils";
import { Plus, Factory, BookOpen } from "lucide-react";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PLANNED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-teal-100 text-teal-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  QC_HOLD: "bg-red-100 text-red-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; tab?: string }>;
}) {
  await requirePermission("production:view");
  const params = await searchParams;
  const tab = params.tab || "orders";
  const statusFilter = params.status;

  const where: any = {};
  if (statusFilter && statusFilter !== "ALL") {
    where.status = statusFilter;
  }

  const orders = await prisma.productionOrder.findMany({
    where,
    include: {
      bom: { include: { product: true } },
      creator: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const bomCount = await prisma.bOM.count({ where: { isActive: true } });

  const statuses = [
    "ALL",
    "DRAFT",
    "PLANNED",
    "IN_PROGRESS",
    "QC_HOLD",
    "COMPLETED",
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-playfair)]">
            Production
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage recipes, production orders, and quality control
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/production/recipes"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Recipes</span>
            <span className="ml-1 text-xs bg-muted rounded-full px-2 py-0.5">
              {bomCount}
            </span>
          </Link>
          <Link
            href="/production/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Order
          </Link>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
        {statuses.map((s) => (
          <Link
            key={s}
            href={`/production?status=${s === "ALL" ? "" : s}`}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              (statusFilter || "ALL") === s || (!statusFilter && s === "ALL")
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {s.replace("_", " ")}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Factory className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold">No production orders</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Create a recipe first, then start a production order to manufacture
            your chocolate products.
          </p>
          <Link
            href="/production/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            New Production Order
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Order #
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Recipe
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      Planned Qty
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      Actual Qty
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Created By
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/production/${order.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{order.bom.product.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {order.bom.name} v{order.bom.version}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            statusColors[order.status] || statusColors.DRAFT
                          }`}
                        >
                          {order.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatNumber(order.plannedQty.toString(), 0)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {order.actualQty
                          ? formatNumber(order.actualQty.toString(), 0)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {order.plannedDate
                          ? formatDate(order.plannedDate)
                          : formatDate(order.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {order.creator.name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/production/${order.id}`}
                className="block rounded-xl border bg-card p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-primary">
                      {order.orderNumber}
                    </p>
                    <p className="text-sm mt-0.5">{order.bom.product.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {order.bom.name} v{order.bom.version}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      statusColors[order.status] || statusColors.DRAFT
                    }`}
                  >
                    {order.status.replace("_", " ")}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span>
                    Planned: {formatNumber(order.plannedQty.toString(), 0)}
                  </span>
                  {order.actualQty && (
                    <span>
                      Actual: {formatNumber(order.actualQty.toString(), 0)}
                    </span>
                  )}
                  <span className="ml-auto">
                    {order.plannedDate
                      ? formatDate(order.plannedDate)
                      : formatDate(order.createdAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
        <Link
          href="/production/recipes"
          className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:shadow-md transition-shadow"
        >
          <div className="rounded-lg bg-secondary/10 p-2.5">
            <BookOpen className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <p className="font-medium text-sm">Recipes / BOMs</p>
            <p className="text-xs text-muted-foreground">
              {bomCount} active recipes
            </p>
          </div>
        </Link>
        <Link
          href="/production/traceability"
          className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:shadow-md transition-shadow"
        >
          <div className="rounded-lg bg-gold/10 p-2.5">
            <Factory className="h-5 w-5 text-gold-deep" />
          </div>
          <div>
            <p className="font-medium text-sm">Lot Traceability</p>
            <p className="text-xs text-muted-foreground">
              Track batches from source to customer
            </p>
          </div>
        </Link>
        <Link
          href="/inventory"
          className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:shadow-md transition-shadow"
        >
          <div className="rounded-lg bg-primary/10 p-2.5">
            <Factory className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">Inventory</p>
            <p className="text-xs text-muted-foreground">
              View stock levels and lots
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}

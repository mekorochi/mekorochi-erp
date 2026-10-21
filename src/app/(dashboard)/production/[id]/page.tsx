import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDate, formatDateTime, formatNumber } from "@/lib/utils";
import { ChevronLeft, AlertTriangle, CheckCircle2, Clock, Play, Pause, Package } from "lucide-react";
import ProductionActions from "./actions-client";

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  DRAFT: { color: "bg-gray-100 text-gray-700", icon: Clock, label: "Draft" },
  PLANNED: { color: "bg-blue-100 text-blue-700", icon: Clock, label: "Planned" },
  APPROVED: { color: "bg-teal-100 text-teal-700", icon: CheckCircle2, label: "Approved" },
  IN_PROGRESS: { color: "bg-amber-100 text-amber-700", icon: Play, label: "In Progress" },
  QC_HOLD: { color: "bg-red-100 text-red-700", icon: Pause, label: "QC Hold" },
  COMPLETED: { color: "bg-green-100 text-green-700", icon: CheckCircle2, label: "Completed" },
  CANCELLED: { color: "bg-gray-100 text-gray-500", icon: AlertTriangle, label: "Cancelled" },
};

export default async function ProductionOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("production:view");
  const { id } = await params;

  const order = await prisma.productionOrder.findUnique({
    where: { id },
    include: {
      bom: {
        include: {
          product: true,
          items: { include: { product: true }, orderBy: { sortOrder: "asc" } },
        },
      },
      consumptions: {
        include: { productionOrder: false },
      },
      creator: { select: { name: true } },
    },
  });

  if (!order) notFound();

  const warehouses = await prisma.warehouse.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const sc = statusConfig[order.status] || statusConfig.DRAFT;
  const StatusIcon = sc.icon;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/production"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Production
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-[family-name:var(--font-playfair)]">
                {order.orderNumber}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${sc.color}`}
              >
                <StatusIcon className="h-3.5 w-3.5" />
                {sc.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {order.bom.product.name} &middot; {order.bom.name} v
              {order.bom.version}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Planned Qty</p>
          <p className="text-lg font-bold mt-1 tabular-nums">
            {formatNumber(order.plannedQty.toString(), 0)}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Actual Qty</p>
          <p className="text-lg font-bold mt-1 tabular-nums">
            {order.actualQty
              ? formatNumber(order.actualQty.toString(), 0)
              : "—"}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Wastage</p>
          <p className="text-lg font-bold mt-1 tabular-nums">
            {order.wastageQty
              ? formatNumber(order.wastageQty.toString(), 0)
              : "—"}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Output Lot</p>
          <p className="text-lg font-bold mt-1 truncate">
            {order.outputLotNumber || "—"}
          </p>
        </div>
      </div>

      {/* Timeline Info */}
      <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-3">
        <h2 className="text-lg font-semibold">Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between sm:block">
            <span className="text-muted-foreground">Created</span>
            <span className="sm:ml-2 font-medium">
              {formatDateTime(order.createdAt)} by {order.creator.name}
            </span>
          </div>
          {order.plannedDate && (
            <div className="flex justify-between sm:block">
              <span className="text-muted-foreground">Planned Date</span>
              <span className="sm:ml-2 font-medium">
                {formatDate(order.plannedDate)}
              </span>
            </div>
          )}
          {order.startedAt && (
            <div className="flex justify-between sm:block">
              <span className="text-muted-foreground">Started</span>
              <span className="sm:ml-2 font-medium">
                {formatDateTime(order.startedAt)}
              </span>
            </div>
          )}
          {order.completedAt && (
            <div className="flex justify-between sm:block">
              <span className="text-muted-foreground">Completed</span>
              <span className="sm:ml-2 font-medium">
                {formatDateTime(order.completedAt)}
              </span>
            </div>
          )}
          {order.qcStatus && (
            <div className="flex justify-between sm:block">
              <span className="text-muted-foreground">QC Status</span>
              <span
                className={`sm:ml-2 font-medium ${
                  order.qcStatus === "PASSED"
                    ? "text-green-600"
                    : order.qcStatus === "FAILED"
                    ? "text-red-600"
                    : "text-amber-600"
                }`}
              >
                {order.qcStatus}
              </span>
            </div>
          )}
          {order.qcNotes && (
            <div className="sm:col-span-2 flex justify-between sm:block">
              <span className="text-muted-foreground">QC Notes</span>
              <span className="sm:ml-2">{order.qcNotes}</span>
            </div>
          )}
        </div>
        {order.notes && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">{order.notes}</p>
          </div>
        )}
      </div>

      {/* Ingredient Consumptions */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Ingredient Consumption</h2>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Material
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Planned Qty
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Actual Qty
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Unit
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Lot
                </th>
              </tr>
            </thead>
            <tbody>
              {order.consumptions.map((c) => {
                const bomItem = order.bom.items.find(
                  (i) => i.productId === c.productId
                );
                return (
                  <tr
                    key={c.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium">
                      {bomItem?.product.name || c.productId}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatNumber(c.plannedQty.toString(), 3)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {c.actualQty
                        ? formatNumber(c.actualQty.toString(), 3)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">{c.unit.toLowerCase()}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.lotId || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y">
          {order.consumptions.map((c) => {
            const bomItem = order.bom.items.find(
              (i) => i.productId === c.productId
            );
            return (
              <div key={c.id} className="p-4">
                <p className="font-medium text-sm">
                  {bomItem?.product.name || c.productId}
                </p>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <span>
                    Planned: {formatNumber(c.plannedQty.toString(), 3)}{" "}
                    {c.unit.toLowerCase()}
                  </span>
                  <span>
                    Actual:{" "}
                    {c.actualQty
                      ? formatNumber(c.actualQty.toString(), 3)
                      : "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <ProductionActions
        orderId={order.id}
        status={order.status}
        consumptions={order.consumptions.map((c) => ({
          productId: c.productId,
          plannedQty: c.plannedQty.toString(),
          productName:
            order.bom.items.find((i) => i.productId === c.productId)?.product
              .name || "",
        }))}
        warehouses={warehouses.map((w) => ({
          id: w.id,
          name: w.name,
          type: w.type,
        }))}
      />

      {/* Traceability Link */}
      {order.outputLotNumber && (
        <div className="rounded-xl border bg-card p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Lot Traceability</p>
              <p className="text-sm text-muted-foreground">
                Track this production lot through the supply chain
              </p>
            </div>
            <Link
              href={`/production/traceability?lot=${order.outputLotNumber}`}
              className="ml-auto rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              View Chain
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

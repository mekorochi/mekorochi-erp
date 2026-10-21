import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { formatDate, formatDateTime, formatNumber } from "@/lib/utils";
import { Search, Package, Factory, ShoppingCart, Users, AlertTriangle } from "lucide-react";
import TraceabilitySearch from "./search";
import Link from "next/link";

async function getTraceabilityData(lotNumber: string) {
  const lot = await prisma.stockLot.findUnique({
    where: { lotNumber },
  });
  if (!lot) return null;

  const product = await prisma.product.findUnique({
    where: { id: lot.productId },
    select: { name: true, sku: true, type: true },
  });

  const movements = await prisma.stockMovement.findMany({
    where: { lotId: lot.id },
    orderBy: { createdAt: "asc" },
  });

  // Find production orders that created this lot
  const productionOrders = await prisma.productionOrder.findMany({
    where: { outputLotNumber: lot.lotNumber },
    include: {
      bom: { include: { product: { select: { name: true } } } },
      consumptions: true,
    },
  });

  // Find orders where this lot was dispatched
  const dispatchMovements = movements.filter(
    (m) => m.movementType === "SALE_DISPATCH" && m.referenceId
  );
  const orderIds = dispatchMovements
    .map((m) => m.referenceId!)
    .filter(Boolean);

  const affectedOrders =
    orderIds.length > 0
      ? await prisma.salesOrder.findMany({
          where: { id: { in: orderIds } },
          include: {
            customer: { select: { name: true, company: true, phone: true } },
          },
        })
      : [];

  // Find source lots (raw material lots consumed in production)
  const sourceLots: Array<{
    lotNumber: string;
    productName: string;
    quantity: string;
  }> = [];

  for (const po of productionOrders) {
    const consumeMovements = await prisma.stockMovement.findMany({
      where: {
        referenceType: "ProductionOrder",
        referenceId: po.id,
        movementType: "PRODUCTION_CONSUME",
        lotId: { not: null },
      },
    });

    for (const cm of consumeMovements) {
      const sourceLot = await prisma.stockLot.findUnique({
        where: { id: cm.lotId! },
      });
      const sourceProduct = await prisma.product.findUnique({
        where: { id: cm.productId },
        select: { name: true },
      });
      if (sourceLot) {
        sourceLots.push({
          lotNumber: sourceLot.lotNumber,
          productName: sourceProduct?.name || "",
          quantity: Math.abs(parseFloat(cm.quantity.toString())).toString(),
        });
      }
    }
  }

  return {
    lot,
    product,
    movements,
    productionOrders,
    affectedOrders,
    sourceLots,
  };
}

export default async function TraceabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ lot?: string }>;
}) {
  await requirePermission("production:view");
  const params = await searchParams;
  const lotNumber = params.lot;

  const data = lotNumber ? await getTraceabilityData(lotNumber) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-playfair)]">
          Lot Traceability
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track any lot from raw materials through production to customer
          delivery
        </p>
      </div>

      <TraceabilitySearch initialLot={lotNumber} />

      {lotNumber && !data && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold">Lot not found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            No lot with number &quot;{lotNumber}&quot; exists.
          </p>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Lot Info */}
          <div className="rounded-xl border bg-card p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">{data.lot.lotNumber}</h2>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      data.lot.status === "AVAILABLE"
                        ? "bg-green-100 text-green-700"
                        : data.lot.status === "RECALLED"
                        ? "bg-red-100 text-red-700"
                        : data.lot.status === "CONSUMED"
                        ? "bg-gray-100 text-gray-600"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {data.lot.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {data.product?.name} ({data.product?.sku})
                </p>
              </div>
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Qty:</span>{" "}
                  <span className="font-medium tabular-nums">
                    {formatNumber(data.lot.quantity.toString(), 3)}
                  </span>
                </p>
                {data.lot.expiryDate && (
                  <p>
                    <span className="text-muted-foreground">Expires:</span>{" "}
                    <span className="font-medium">
                      {formatDate(data.lot.expiryDate)}
                    </span>
                  </p>
                )}
                {data.lot.manufactureDate && (
                  <p>
                    <span className="text-muted-foreground">Manufactured:</span>{" "}
                    <span className="font-medium">
                      {formatDate(data.lot.manufactureDate)}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Recall Warning */}
          {data.lot.status === "RECALLED" && (
            <div className="rounded-xl border border-red-300 bg-red-50 p-4 sm:p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-800">
                    This lot has been RECALLED
                  </h3>
                  <p className="text-sm text-red-700 mt-1">
                    {data.affectedOrders.length > 0
                      ? `${data.affectedOrders.length} customer order(s) are affected.`
                      : "No customer orders were dispatched with this lot."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Traceability Chain */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Traceability Chain</h2>

            {/* Source Materials */}
            {data.sourceLots.length > 0 && (
              <div className="rounded-xl border bg-card p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="rounded-full bg-amber-100 p-2">
                    <Package className="h-4 w-4 text-amber-700" />
                  </div>
                  <h3 className="font-semibold">Source Raw Materials</h3>
                </div>
                <div className="space-y-2">
                  {data.sourceLots.map((sl, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <div>
                        <Link
                          href={`/production/traceability?lot=${sl.lotNumber}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {sl.lotNumber}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {sl.productName}
                        </p>
                      </div>
                      <span className="text-sm tabular-nums">
                        {formatNumber(sl.quantity, 3)} consumed
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Production */}
            {data.productionOrders.length > 0 && (
              <div className="rounded-xl border bg-card p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="rounded-full bg-blue-100 p-2">
                    <Factory className="h-4 w-4 text-blue-700" />
                  </div>
                  <h3 className="font-semibold">Production</h3>
                </div>
                <div className="space-y-2">
                  {data.productionOrders.map((po) => (
                    <div
                      key={po.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <div>
                        <Link
                          href={`/production/${po.id}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {po.orderNumber}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {po.bom.product.name} — {po.bom.name}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                          po.status === "COMPLETED"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {po.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Affected Orders */}
            {data.affectedOrders.length > 0 && (
              <div className="rounded-xl border bg-card p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="rounded-full bg-green-100 p-2">
                    <ShoppingCart className="h-4 w-4 text-green-700" />
                  </div>
                  <h3 className="font-semibold">
                    Customer Orders ({data.affectedOrders.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {data.affectedOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <div>
                        <Link
                          href={`/orders/${order.id}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {order.customer.name}
                          {order.customer.company &&
                            ` — ${order.customer.company}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                            order.status === "DELIVERED"
                              ? "bg-green-100 text-green-700"
                              : order.status === "SHIPPED"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {order.status}
                        </span>
                        {order.customer.phone && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {order.customer.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Movement History */}
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b">
                <h3 className="font-semibold">
                  Movement History ({data.movements.length})
                </h3>
              </div>
              <div className="divide-y max-h-96 overflow-y-auto scrollbar-thin">
                {data.movements.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-4 sm:px-6 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {m.movementType.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(m.createdAt)}
                        {m.reason && ` — ${m.reason}`}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-medium tabular-nums ${
                        parseFloat(m.quantity.toString()) > 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {parseFloat(m.quantity.toString()) > 0 ? "+" : ""}
                      {formatNumber(m.quantity.toString(), 3)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {!lotNumber && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold">Search for a Lot</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Enter a lot number above to trace its journey from raw materials
            through production to customer delivery.
          </p>
        </div>
      )}
    </div>
  );
}

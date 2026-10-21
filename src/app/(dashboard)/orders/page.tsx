import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { ShoppingCart, Plus, Search } from "lucide-react";

const ORDER_STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PREPARING: "bg-yellow-100 text-yellow-800",
  PACKED: "bg-teal-100 text-teal-700",
  SHIPPED: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  PARTIALLY_RETURNED: "bg-orange-100 text-orange-700",
  RETURNED: "bg-red-100 text-red-700",
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  UNPAID: "bg-red-50 text-red-600",
  PARTIALLY_PAID: "bg-yellow-50 text-yellow-700",
  PAID: "bg-green-50 text-green-600",
  REFUNDED: "bg-gray-100 text-gray-600",
  PARTIALLY_REFUNDED: "bg-orange-50 text-orange-600",
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; payment?: string; search?: string; page?: string }>;
}) {
  await requirePermission("orders:view");
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const perPage = 20;

  const where: Record<string, unknown> = {};
  if (params.status) where.status = params.status;
  if (params.payment) where.paymentStatus = params.payment;
  if (params.search) {
    where.OR = [
      { orderNumber: { contains: params.search, mode: "insensitive" } },
      { customer: { name: { contains: params.search, mode: "insensitive" } } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.salesOrder.findMany({
      where,
      include: { customer: true, _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.salesOrder.count({ where }),
  ]);

  const totalPages = Math.ceil(total / perPage);

  const statusTabs = ["All", "DRAFT", "CONFIRMED", "PREPARING", "PACKED", "SHIPPED", "DELIVERED"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-playfair)]">Orders</h1>
          <p className="text-muted-foreground text-sm mt-1">{total} order{total !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/orders/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          New Order
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            name="search"
            defaultValue={params.search}
            placeholder="Search by order number or customer..."
            className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </form>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {statusTabs.map((s) => (
          <Link
            key={s}
            href={s === "All" ? "/orders" : `/orders?status=${s}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              (s === "All" && !params.status) || params.status === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {s === "All" ? "All" : s.charAt(0) + s.slice(1).toLowerCase().replace("_", " ")}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShoppingCart className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-1">No orders found</h3>
          <p className="text-muted-foreground text-sm mb-4">Create your first order to get started.</p>
          <Link
            href="/orders/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
          >
            <Plus className="h-4 w-4" />
            New Order
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium">Order #</th>
                    <th className="text-left px-4 py-3 font-medium">Customer</th>
                    <th className="text-left px-4 py-3 font-medium">Channel</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Payment</th>
                    <th className="text-left px-4 py-3 font-medium">Date</th>
                    <th className="text-right px-4 py-3 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/orders/${o.id}`} className="font-medium text-primary hover:underline">
                          {o.orderNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div>{o.customer.name}</div>
                        {o.customer.company && (
                          <div className="text-xs text-muted-foreground">{o.customer.company}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted">
                          {o.channel}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ORDER_STATUS_STYLES[o.status]}`}>
                          {o.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_STATUS_STYLES[o.paymentStatus]}`}>
                          {o.paymentStatus.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(o.orderDate)}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(o.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {orders.map((o) => (
              <Link
                key={o.id}
                href={`/orders/${o.id}`}
                className="block bg-card rounded-xl border shadow-sm p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-primary">{o.orderNumber}</div>
                    <div className="text-sm">{o.customer.name}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ORDER_STATUS_STYLES[o.status]}`}>
                    {o.status.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{formatDate(o.orderDate)}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs ${PAYMENT_STATUS_STYLES[o.paymentStatus]}`}>
                      {o.paymentStatus.replace(/_/g, " ")}
                    </span>
                  </div>
                  <span className="font-semibold">{formatCurrency(o.totalAmount)}</span>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/orders?page=${p}${params.status ? `&status=${params.status}` : ""}${params.search ? `&search=${params.search}` : ""}`}
                  className={`px-3 py-1.5 rounded-lg text-sm ${
                    p === page ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { Plus, CreditCard } from "lucide-react";
import Decimal from "decimal.js";

const methodBadge: Record<string, string> = {
  UPI: "bg-emerald-100 text-emerald-800",
  CASH: "bg-muted text-muted-foreground",
  BANK_TRANSFER: "bg-blue-100 text-blue-800",
  CARD: "bg-purple-100 text-purple-800",
  CHEQUE: "bg-amber-100 text-amber-800",
  OTHER: "bg-gray-100 text-gray-600",
};

const statusBadge: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-amber-100 text-amber-800" },
  CONFIRMED: { label: "Confirmed", className: "bg-emerald-100 text-emerald-800" },
  FAILED: { label: "Failed", className: "bg-red-100 text-red-800" },
  REVERSED: { label: "Reversed", className: "bg-gray-100 text-gray-500" },
};

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string; method?: string; search?: string }>;
}) {
  const user = await requirePermission("payments:view");
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const perPage = 20;
  const tab = params.tab || "all";

  const where: Record<string, unknown> = {};
  if (tab === "received") where.direction = "INBOUND";
  if (tab === "made") where.direction = "OUTBOUND";
  if (params.method) where.method = params.method;
  if (params.search) {
    where.OR = [
      { paymentNumber: { contains: params.search, mode: "insensitive" } },
      { customer: { name: { contains: params.search, mode: "insensitive" } } },
    ];
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where: where as any,
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.payment.count({ where: where as any }),
  ]);

  const [totalReceived, totalPaid] = await Promise.all([
    prisma.payment.aggregate({ where: { direction: "INBOUND", status: "CONFIRMED" }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { direction: "OUTBOUND", status: "CONFIRMED" }, _sum: { amount: true } }),
  ]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-playfair)]">Payments</h1>
          <p className="text-sm text-muted-foreground mt-1">Track payments received and payments made</p>
        </div>
        <Link
          href="/payments/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Record Payment
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Received</p>
          <p className="text-2xl font-semibold mt-1 text-emerald-700">
            {formatCurrency(totalReceived._sum.amount || 0)}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Paid Out</p>
          <p className="text-2xl font-semibold mt-1 text-amber-700">
            {formatCurrency(totalPaid._sum.amount || 0)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {[
          { key: "all", label: "All" },
          { key: "received", label: "Received" },
          { key: "made", label: "Made" },
        ].map((t) => (
          <Link
            key={t.key}
            href={`/payments?tab=${t.key}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-2" method="GET">
        <input type="hidden" name="tab" value={tab} />
        <input
          type="text"
          name="search"
          placeholder="Search payments..."
          defaultValue={params.search || ""}
          className="rounded-lg border bg-card px-3 py-2 text-sm w-full sm:w-64"
        />
        <select name="method" defaultValue={params.method || ""} className="rounded-lg border bg-card px-3 py-2 text-sm">
          <option value="">All Methods</option>
          <option value="UPI">UPI</option>
          <option value="CASH">Cash</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
          <option value="CARD">Card</option>
          <option value="CHEQUE">Cheque</option>
        </select>
        <button type="submit" className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/90">
          Filter
        </button>
      </form>

      {payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CreditCard className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold">No payments found</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Record your first payment to get started</p>
          <Link href="/payments/new" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
            <Plus className="h-4 w-4" />
            Record Payment
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium">Payment #</th>
                    <th className="text-left px-4 py-3 font-medium">Type</th>
                    <th className="text-left px-4 py-3 font-medium">Customer / Supplier</th>
                    <th className="text-left px-4 py-3 font-medium">Method</th>
                    <th className="text-left px-4 py-3 font-medium">Date</th>
                    <th className="text-right px-4 py-3 font-medium">Amount</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/payments/${payment.id}`} className="font-medium text-primary hover:underline">
                          {payment.paymentNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs ${payment.direction === "INBOUND" ? "text-emerald-700" : "text-amber-700"}`}>
                          {payment.direction === "INBOUND" ? "↓ Received" : "↑ Paid"}
                        </span>
                      </td>
                      <td className="px-4 py-3">{payment.customer?.name || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${methodBadge[payment.method] || ""}`}>
                          {payment.method.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(payment.paymentDate)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(payment.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[payment.status]?.className || ""}`}>
                          {statusBadge[payment.status]?.label || payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {payments.map((payment) => (
              <Link key={payment.id} href={`/payments/${payment.id}`} className="block rounded-xl border bg-card p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-primary">{payment.paymentNumber}</p>
                    <p className="text-sm text-muted-foreground">{payment.customer?.name || "—"}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[payment.status]?.className || ""}`}>
                    {statusBadge[payment.status]?.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${payment.direction === "INBOUND" ? "text-emerald-700" : "text-amber-700"}`}>
                      {payment.direction === "INBOUND" ? "Received" : "Paid"}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${methodBadge[payment.method] || ""}`}>
                      {payment.method.replace(/_/g, " ")}
                    </span>
                  </div>
                  <span className="font-semibold">{formatCurrency(payment.amount)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{formatDate(payment.paymentDate)}</p>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}</p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={`/payments?page=${page - 1}&tab=${tab}`} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">Previous</Link>
                )}
                {page < totalPages && (
                  <Link href={`/payments?page=${page + 1}&tab=${tab}`} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">Next</Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

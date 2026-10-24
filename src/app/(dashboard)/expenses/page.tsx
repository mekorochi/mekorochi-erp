import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { Plus, Wallet } from "lucide-react";
import Decimal from "decimal.js";

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-amber-100 text-amber-800" },
  APPROVED: { label: "Approved", className: "bg-emerald-100 text-emerald-800" },
  REJECTED: { label: "Rejected", className: "bg-red-100 text-red-800" },
  REIMBURSED: { label: "Reimbursed", className: "bg-blue-100 text-blue-800" },
};

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; categoryId?: string; search?: string; paidBy?: string }>;
}) {
  await requirePermission("expenses:view");
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const perPage = 50;

  const where: Record<string, unknown> = {};
  if (params.status) where.status = params.status;
  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.paidBy) where.paidBy = params.paidBy;
  if (params.search) {
    where.OR = [
      { expenseNumber: { contains: params.search, mode: "insensitive" } },
      { description: { contains: params.search, mode: "insensitive" } },
      { vendor: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const [expenses, total, categories, monthTotal, pendingCount, paidByValues] = await Promise.all([
    prisma.expense.findMany({
      where: where as any,
      include: { category: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.expense.count({ where: where as any }),
    prisma.expenseCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.expense.aggregate({
      where: {
        expenseDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        status: { in: ["APPROVED", "PENDING"] },
      },
      _sum: { totalAmount: true },
    }),
    prisma.expense.count({ where: { status: "PENDING" } }),
    prisma.expense.findMany({
      where: { paidBy: { not: null } },
      select: { paidBy: true },
      distinct: ["paidBy"],
      orderBy: { paidBy: "asc" },
    }),
  ]);
  const distinctPaidBy = paidByValues.map((v) => v.paidBy).filter(Boolean) as string[];

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-playfair)]">Expenses</h1>
          <p className="text-sm text-muted-foreground mt-1">Track and manage business expenses</p>
        </div>
        <Link
          href="/expenses/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Expense
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">This Month</p>
          <p className="text-2xl font-semibold mt-1">{formatCurrency(monthTotal._sum.totalAmount || 0)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Pending Approval</p>
          <p className="text-2xl font-semibold mt-1 text-amber-700">{pendingCount}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Records</p>
          <p className="text-2xl font-semibold mt-1">{total}</p>
        </div>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-2" method="GET">
        <input
          type="text"
          name="search"
          placeholder="Search expenses..."
          defaultValue={params.search || ""}
          className="rounded-lg border bg-card px-3 py-2 text-sm w-full sm:w-64"
        />
        <select name="categoryId" defaultValue={params.categoryId || ""} className="rounded-lg border bg-card px-3 py-2 text-sm">
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select name="paidBy" defaultValue={params.paidBy || ""} className="rounded-lg border bg-card px-3 py-2 text-sm">
          <option value="">All - Paid By</option>
          {distinctPaidBy.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <select name="status" defaultValue={params.status || ""} className="rounded-lg border bg-card px-3 py-2 text-sm">
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="REIMBURSED">Reimbursed</option>
        </select>
        <button type="submit" className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/90">
          Filter
        </button>
      </form>

      {expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Wallet className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold">No expenses found</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Record your first expense to start tracking</p>
          <Link href="/expenses/new" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
            <Plus className="h-4 w-4" />
            Add Expense
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
                    <th className="text-left px-4 py-3 font-medium">Expense #</th>
                    <th className="text-left px-4 py-3 font-medium">Category</th>
                    <th className="text-left px-4 py-3 font-medium">Description</th>
                    <th className="text-left px-4 py-3 font-medium">Vendor</th>
                    <th className="text-left px-4 py-3 font-medium">Date</th>
                    <th className="text-right px-4 py-3 font-medium">Amount</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/expenses/${expense.id}`} className="font-medium text-primary hover:underline">
                          {expense.expenseNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">
                          {expense.category.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate">{expense.description}</td>
                      <td className="px-4 py-3 text-muted-foreground">{expense.vendor || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(expense.expenseDate)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(expense.totalAmount)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig[expense.status]?.className || ""}`}>
                          {statusConfig[expense.status]?.label || expense.status}
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
            {expenses.map((expense) => (
              <Link key={expense.id} href={`/expenses/${expense.id}`} className="block rounded-xl border bg-card p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{expense.expenseNumber}</p>
                    <p className="text-sm text-muted-foreground line-clamp-1">{expense.description}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig[expense.status]?.className || ""}`}>
                    {statusConfig[expense.status]?.label}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">{expense.category.name}</span>
                  <span className="font-semibold">{formatCurrency(expense.totalAmount)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{formatDate(expense.expenseDate)}{expense.paidBy ? ` • ${expense.paidBy}` : ""}{expense.vendor ? ` • ${expense.vendor}` : ""}</p>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}</p>
              <div className="flex gap-2">
                {page > 1 && <Link href={`/expenses?${new URLSearchParams({ ...params, page: String(page - 1) }).toString()}`} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">Previous</Link>}
                {page < totalPages && <Link href={`/expenses?${new URLSearchParams({ ...params, page: String(page + 1) }).toString()}`} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">Next</Link>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

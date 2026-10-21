import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { Plus, FileText, AlertCircle } from "lucide-react";
import Decimal from "decimal.js";

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground" },
  POSTED: { label: "Posted", className: "bg-blue-100 text-blue-800" },
  PARTIALLY_PAID: { label: "Partial", className: "bg-amber-100 text-amber-800" },
  PAID: { label: "Paid", className: "bg-emerald-100 text-emerald-800" },
  OVERDUE: { label: "Overdue", className: "bg-red-100 text-red-800" },
  VOID: { label: "Void", className: "bg-gray-100 text-gray-500" },
  CANCELLED: { label: "Cancelled", className: "bg-gray-100 text-gray-500" },
};

const typeConfig: Record<string, { label: string; className: string }> = {
  PROFORMA: { label: "Proforma", className: "bg-purple-100 text-purple-800" },
  TAX_INVOICE: { label: "Tax Invoice", className: "bg-primary/10 text-primary" },
  CREDIT_NOTE: { label: "Credit Note", className: "bg-orange-100 text-orange-800" },
  DEBIT_NOTE: { label: "Debit Note", className: "bg-teal-100 text-teal-800" },
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; type?: string; search?: string }>;
}) {
  const user = await requirePermission("invoices:view");
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const perPage = 20;

  const where: Record<string, unknown> = {};
  if (params.status) where.status = params.status;
  if (params.type) where.type = params.type;
  if (params.search) {
    where.OR = [
      { invoiceNumber: { contains: params.search, mode: "insensitive" } },
      { customer: { name: { contains: params.search, mode: "insensitive" } } },
    ];
  }

  const [invoices, total, summaryData] = await Promise.all([
    prisma.invoice.findMany({
      where: where as any,
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.invoice.count({ where: where as any }),
    prisma.invoice.findMany({
      where: { status: { notIn: ["VOID", "CANCELLED", "DRAFT"] } },
      select: { totalAmount: true, paidAmount: true },
    }),
  ]);

  const totalInvoiced = summaryData.reduce((s, i) => s.plus(new Decimal(i.totalAmount.toString())), new Decimal(0));
  const totalCollected = summaryData.reduce((s, i) => s.plus(new Decimal(i.paidAmount.toString())), new Decimal(0));
  const outstanding = totalInvoiced.minus(totalCollected);
  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-playfair)]">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage tax invoices, proformas, and credit notes</p>
        </div>
        <Link
          href="/invoices/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Invoice
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Invoiced</p>
          <p className="text-2xl font-semibold mt-1">{formatCurrency(totalInvoiced)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Collected</p>
          <p className="text-2xl font-semibold mt-1 text-emerald-700">{formatCurrency(totalCollected)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Outstanding</p>
          <p className="text-2xl font-semibold mt-1 text-amber-700">{formatCurrency(outstanding)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <form className="flex flex-wrap gap-2" method="GET">
          <input
            type="text"
            name="search"
            placeholder="Search invoices..."
            defaultValue={params.search || ""}
            className="rounded-lg border bg-card px-3 py-2 text-sm w-full sm:w-64"
          />
          <select name="type" defaultValue={params.type || ""} className="rounded-lg border bg-card px-3 py-2 text-sm">
            <option value="">All Types</option>
            <option value="TAX_INVOICE">Tax Invoice</option>
            <option value="PROFORMA">Proforma</option>
            <option value="CREDIT_NOTE">Credit Note</option>
            <option value="DEBIT_NOTE">Debit Note</option>
          </select>
          <select name="status" defaultValue={params.status || ""} className="rounded-lg border bg-card px-3 py-2 text-sm">
            <option value="">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="POSTED">Posted</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="VOID">Void</option>
          </select>
          <button type="submit" className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/90">
            Filter
          </button>
        </form>
      </div>

      {invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold">No invoices found</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Create your first invoice to get started</p>
          <Link
            href="/invoices/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            New Invoice
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
                    <th className="text-left px-4 py-3 font-medium">Invoice #</th>
                    <th className="text-left px-4 py-3 font-medium">Type</th>
                    <th className="text-left px-4 py-3 font-medium">Customer</th>
                    <th className="text-left px-4 py-3 font-medium">Date</th>
                    <th className="text-left px-4 py-3 font-medium">Due Date</th>
                    <th className="text-right px-4 py-3 font-medium">Total</th>
                    <th className="text-right px-4 py-3 font-medium">Paid</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => {
                    const outstandingAmt = new Decimal(invoice.totalAmount.toString()).minus(new Decimal(invoice.paidAmount.toString()));
                    return (
                      <tr key={invoice.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/invoices/${invoice.id}`} className="font-medium text-primary hover:underline">
                            {invoice.invoiceNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeConfig[invoice.type]?.className || ""}`}>
                            {typeConfig[invoice.type]?.label || invoice.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">{invoice.customer.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(invoice.issueDate)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(invoice.dueDate)}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(invoice.totalAmount)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(invoice.paidAmount)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig[invoice.status]?.className || ""}`}>
                            {statusConfig[invoice.status]?.label || invoice.status}
                          </span>
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
            {invoices.map((invoice) => {
              const outstandingAmt = new Decimal(invoice.totalAmount.toString()).minus(new Decimal(invoice.paidAmount.toString()));
              return (
                <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="block rounded-xl border bg-card p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-primary">{invoice.invoiceNumber}</p>
                      <p className="text-sm text-muted-foreground">{invoice.customer.name}</p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig[invoice.status]?.className || ""}`}>
                      {statusConfig[invoice.status]?.label || invoice.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeConfig[invoice.type]?.className || ""}`}>
                      {typeConfig[invoice.type]?.label}
                    </span>
                    <span className="font-semibold">{formatCurrency(invoice.totalAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                    <span>Due: {formatDate(invoice.dueDate)}</span>
                    {outstandingAmt.gt(0) && (
                      <span className="text-amber-700">Due: {formatCurrency(outstandingAmt)}</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/invoices?page=${page - 1}${params.status ? `&status=${params.status}` : ""}${params.type ? `&type=${params.type}` : ""}${params.search ? `&search=${params.search}` : ""}`}
                    className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/invoices?page=${page + 1}${params.status ? `&status=${params.status}` : ""}${params.type ? `&type=${params.type}` : ""}${params.search ? `&search=${params.search}` : ""}`}
                    className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

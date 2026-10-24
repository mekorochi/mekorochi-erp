import { requirePermission, checkPermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import ExpenseApproval from "./expense-approval";

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending Approval", className: "bg-amber-100 text-amber-800" },
  APPROVED: { label: "Approved", className: "bg-emerald-100 text-emerald-800" },
  REJECTED: { label: "Rejected", className: "bg-red-100 text-red-800" },
  REIMBURSED: { label: "Reimbursed", className: "bg-blue-100 text-blue-800" },
};

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("expenses:view");
  const { id } = await params;

  const expense = await prisma.expense.findUnique({
    where: { id },
    include: {
      category: true,
      approver: { select: { name: true } },
    },
  });

  if (!expense) notFound();

  const canApprove = await checkPermission("expenses:approve");
  const canEdit = await checkPermission("expenses:edit");

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-[family-name:var(--font-playfair)]">{expense.expenseNumber}</h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig[expense.status]?.className || ""}`}>
              {statusConfig[expense.status]?.label || expense.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {expense.category.name} • {formatDate(expense.expenseDate)}
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Link href={`/expenses/${expense.id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            </Link>
          )}
          {canApprove && expense.status === "PENDING" && (
            <ExpenseApproval expenseId={expense.id} />
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Amount</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(expense.totalAmount)}</p>
          </div>
          {expense.gstApplicable && (
            <>
              <div>
                <p className="text-sm text-muted-foreground">Base Amount</p>
                <p className="text-lg font-semibold mt-1">{formatCurrency(expense.amount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tax ({expense.gstRate?.toString() || 0}%)</p>
                <p className="text-lg font-semibold mt-1">{formatCurrency(expense.taxAmount)}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
        <h3 className="font-semibold">Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Description</p>
            <p className="mt-1">{expense.description}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Category</p>
            <p className="mt-1">{expense.category.name}</p>
          </div>
          {expense.vendor && (
            <div>
              <p className="text-sm text-muted-foreground">Vendor</p>
              <p className="mt-1">{expense.vendor}</p>
            </div>
          )}
          {expense.department && (
            <div>
              <p className="text-sm text-muted-foreground">Department</p>
              <p className="mt-1">{expense.department}</p>
            </div>
          )}
          {expense.project && (
            <div>
              <p className="text-sm text-muted-foreground">Project / Campaign</p>
              <p className="mt-1">{expense.project}</p>
            </div>
          )}
          {expense.paidBy && (
            <div>
              <p className="text-sm text-muted-foreground">Expense Done By</p>
              <p className="mt-1">{expense.paidBy}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Payment Method</p>
            <p className="mt-1">{expense.paymentMethod.replace(/_/g, " ")}</p>
          </div>
          {expense.paymentRef && (
            <div>
              <p className="text-sm text-muted-foreground">Payment Reference</p>
              <p className="mt-1 font-mono text-sm">{expense.paymentRef}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Expense Date</p>
            <p className="mt-1">{formatDate(expense.expenseDate)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Recorded</p>
            <p className="mt-1">{formatDateTime(expense.createdAt)}</p>
          </div>
          {expense.isRecurring && (
            <div>
              <p className="text-sm text-muted-foreground">Recurring</p>
              <p className="mt-1 capitalize">{expense.recurringPeriod || "Yes"}</p>
            </div>
          )}
        </div>

        {expense.notes && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">Notes</p>
            <p className="mt-1 text-sm whitespace-pre-wrap">{expense.notes}</p>
          </div>
        )}
      </div>

      {/* Approval Info */}
      {expense.approver && (
        <div className="rounded-xl border bg-card p-4 sm:p-6">
          <h3 className="font-semibold mb-2">Approval</h3>
          <p className="text-sm">
            <span className={expense.status === "APPROVED" ? "text-emerald-700" : "text-red-700"}>
              {expense.status === "APPROVED" ? "Approved" : "Rejected"}
            </span>{" "}
            by <span className="font-medium">{expense.approver.name}</span>
            {expense.approvedAt && <span className="text-muted-foreground"> on {formatDateTime(expense.approvedAt)}</span>}
          </p>
        </div>
      )}

      {/* Receipt placeholder */}
      {expense.receiptUrl && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold mb-2">Receipt</h3>
          <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
            View Receipt →
          </a>
        </div>
      )}
    </div>
  );
}

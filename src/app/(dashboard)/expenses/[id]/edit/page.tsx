import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { notFound, redirect } from "next/navigation";
import ExpenseForm from "@/components/shared/expense-form";
import { updateExpenseAction } from "../../actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("expenses:edit");
  const { id } = await params;

  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!expense) notFound();
  if (expense.status !== "PENDING") redirect(`/expenses/${id}`);

  const categories = await prisma.expenseCategory.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const initialData: Record<string, unknown> = {
    categoryId: expense.categoryId,
    amount: parseFloat(expense.amount.toString()),
    taxAmount: parseFloat(expense.taxAmount.toString()),
    description: expense.description,
    vendor: expense.vendor || "",
    department: expense.department || "",
    project: expense.project || "",
    paymentMethod: expense.paymentMethod,
    paymentRef: expense.paymentRef || "",
    paidBy: expense.paidBy || "",
    expenseDate: expense.expenseDate.toISOString().split("T")[0],
    gstApplicable: expense.gstApplicable,
    gstRate: expense.gstRate ? parseFloat(expense.gstRate.toString()) : "",
    isRecurring: expense.isRecurring,
    recurringPeriod: expense.recurringPeriod || "",
    notes: expense.notes || "",
  };

  async function handleUpdate(data: Record<string, unknown>) {
    "use server";
    return updateExpenseAction(id, data);
  }

  return (
    <div className="space-y-6">
      <Link href={`/expenses/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to {expense.expenseNumber}
      </Link>
      <div>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-playfair)]">Edit {expense.expenseNumber}</h1>
        <p className="text-muted-foreground text-sm mt-1">Update expense details.</p>
      </div>
      <ExpenseForm
        categories={categories}
        initialData={initialData}
        onSubmit={handleUpdate}
        submitLabel="Save Changes"
      />
    </div>
  );
}

import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import ExpenseForm from "@/components/shared/expense-form";
import { createExpenseAction } from "../actions";

export default async function NewExpensePage() {
  await requirePermission("expenses:create");

  const categories = await prisma.expenseCategory.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  async function handleCreate(data: Record<string, unknown>) {
    "use server";
    const fd = new FormData();
    fd.set("data", JSON.stringify(data));
    return createExpenseAction(null, fd);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-playfair)]">Add Expense</h1>
        <p className="text-sm text-muted-foreground mt-1">Record a new business expense</p>
      </div>
      <ExpenseForm categories={categories} onSubmit={handleCreate} />
    </div>
  );
}

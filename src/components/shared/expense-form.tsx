"use client";

import { useState, useActionState } from "react";
import { useRouter } from "next/navigation";

interface ExpenseFormProps {
  categories: Array<{ id: string; name: string }>;
  initialData?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => Promise<{ success?: boolean; error?: string; expenseId?: string }>;
  submitLabel?: string;
}

export default function ExpenseForm({ categories, initialData, onSubmit, submitLabel = "Save Expense" }: ExpenseFormProps) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState((initialData?.categoryId as string) || "");
  const [amount, setAmount] = useState(initialData?.amount?.toString() || "");
  const [taxAmount, setTaxAmount] = useState(initialData?.taxAmount?.toString() || "0");
  const [description, setDescription] = useState((initialData?.description as string) || "");
  const [vendor, setVendor] = useState((initialData?.vendor as string) || "");
  const [department, setDepartment] = useState((initialData?.department as string) || "");
  const [project, setProject] = useState((initialData?.project as string) || "");
  const [paymentMethod, setPaymentMethod] = useState((initialData?.paymentMethod as string) || "CASH");
  const [paymentRef, setPaymentRef] = useState((initialData?.paymentRef as string) || "");
  const [paidBy, setPaidBy] = useState((initialData?.paidBy as string) || "");
  const [paidByCustom, setPaidByCustom] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    (initialData?.expenseDate as string) || new Date().toISOString().split("T")[0]
  );
  const [gstApplicable, setGstApplicable] = useState((initialData?.gstApplicable as boolean) || false);
  const [gstRate, setGstRate] = useState(initialData?.gstRate?.toString() || "");
  const [isRecurring, setIsRecurring] = useState((initialData?.isRecurring as boolean) || false);
  const [recurringPeriod, setRecurringPeriod] = useState((initialData?.recurringPeriod as string) || "");
  const [notes, setNotes] = useState((initialData?.notes as string) || "");

  const handleSubmit = async (_prev: unknown, _formData: FormData) => {
    const data = {
      categoryId,
      amount: parseFloat(amount),
      taxAmount: parseFloat(taxAmount || "0"),
      description,
      vendor: vendor || undefined,
      department: department || undefined,
      project: project || undefined,
      paymentMethod,
      paymentRef: paymentRef || undefined,
      paidBy: (paidBy === "__other__" ? paidByCustom : paidBy) || undefined,
      expenseDate,
      gstApplicable,
      gstRate: gstApplicable && gstRate ? parseFloat(gstRate) : undefined,
      notes: notes || undefined,
      isRecurring,
      recurringPeriod: isRecurring ? recurringPeriod : undefined,
    };

    const result = await onSubmit(data);
    if (result.success && result.expenseId) {
      router.push(`/expenses/${result.expenseId}`);
    }
    return result;
  };

  const [state, formAction, isPending] = useActionState(handleSubmit, null);

  const knownPaidByValues = ["", "Company Account", "Cash", "Meet", "Komal", "Ronit", "__other__"];
  const isCustomPaidBy = paidBy && !knownPaidByValues.includes(paidBy);

  return (
    <form action={formAction} className="space-y-6 max-w-3xl">
      {state?.error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
        <h3 className="font-semibold">Expense Details</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category *</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Expense Date</label>
            <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Description *</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="What was this expense for?" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Amount (₹) *</label>
            <input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="0.00" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Vendor</label>
            <input type="text" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Vendor name" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Department</label>
            <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Marketing, Operations" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Project / Campaign</label>
            <input type="text" value={project} onChange={(e) => setProject(e.target.value)} placeholder="Optional project reference" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Expense Done By</label>
            <div className="flex gap-3">
              <select value={isCustomPaidBy ? "__other__" : paidBy} onChange={(e) => { setPaidBy(e.target.value); if (e.target.value !== "__other__") setPaidByCustom(""); }} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                <option value="">Select who paid</option>
                <option value="Company Account">Company Account</option>
                <option value="Cash">Cash (Personal)</option>
                <option value="Meet">Meet</option>
                <option value="Komal">Komal</option>
                <option value="Ronit">Ronit</option>
                <option value="__other__">Other...</option>
              </select>
              {(paidBy === "__other__" || isCustomPaidBy) && (
                <input type="text" value={isCustomPaidBy ? paidBy : paidByCustom} onChange={(e) => isCustomPaidBy ? setPaidBy(e.target.value) : setPaidByCustom(e.target.value)} placeholder="Enter name" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
        <h3 className="font-semibold">Payment & Tax</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Payment Method</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CARD">Card</option>
              <option value="CHEQUE">Cheque</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Payment Reference</label>
            <input type="text" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="Transaction ID, receipt #" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input type="checkbox" id="gstApplicable" checked={gstApplicable} onChange={(e) => setGstApplicable(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
            <label htmlFor="gstApplicable" className="text-sm">GST Applicable</label>
          </div>
        </div>

        {gstApplicable && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">GST Rate (%)</label>
              <input type="number" step="0.01" min="0" max="100" value={gstRate} onChange={(e) => setGstRate(e.target.value)} placeholder="18" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tax Amount (₹)</label>
              <input type="number" step="0.01" min="0" value={taxAmount} onChange={(e) => setTaxAmount(e.target.value)} placeholder="0.00" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isRecurring" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
            <label htmlFor="isRecurring" className="text-sm">Recurring Expense</label>
          </div>
        </div>

        {isRecurring && (
          <div>
            <label className="block text-sm font-medium mb-1">Recurring Period</label>
            <select value={recurringPeriod} onChange={(e) => setRecurringPeriod(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm sm:w-48">
              <option value="">Select period</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <label className="block text-sm font-medium mb-1">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Additional notes..." />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
        <button type="button" onClick={() => router.back()} className="rounded-lg border px-6 py-2.5 text-sm font-medium hover:bg-muted">
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || !categoryId || !amount || !description}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

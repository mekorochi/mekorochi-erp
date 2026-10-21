"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveExpenseAction, rejectExpenseAction } from "../actions";
import { CheckCircle, XCircle } from "lucide-react";

export default function ExpenseApproval({ expenseId }: { expenseId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleApprove = async () => {
    setLoading("approve");
    const result = await approveExpenseAction(expenseId);
    setLoading(null);
    if (result.error) alert(result.error);
    else router.refresh();
  };

  const handleReject = async () => {
    if (!confirm("Reject this expense?")) return;
    setLoading("reject");
    const result = await rejectExpenseAction(expenseId);
    setLoading(null);
    if (result.error) alert(result.error);
    else router.refresh();
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleApprove}
        disabled={loading !== null}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
      >
        <CheckCircle className="h-4 w-4" />
        {loading === "approve" ? "Approving..." : "Approve"}
      </button>
      <button
        onClick={handleReject}
        disabled={loading !== null}
        className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
      >
        <XCircle className="h-4 w-4" />
        {loading === "reject" ? "Rejecting..." : "Reject"}
      </button>
    </div>
  );
}

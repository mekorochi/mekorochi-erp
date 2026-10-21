"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reversePaymentAction } from "../actions";
import { RotateCcw } from "lucide-react";

export default function PaymentActions({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleReverse = async () => {
    if (!confirm("Reverse this payment? This will undo invoice allocations and update outstanding amounts.")) return;
    setLoading(true);
    const result = await reversePaymentAction(paymentId);
    setLoading(false);
    if (result.error) alert(result.error);
    else router.refresh();
  };

  return (
    <button
      onClick={handleReverse}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
    >
      <RotateCcw className="h-4 w-4" />
      {loading ? "Reversing..." : "Reverse Payment"}
    </button>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Package, Truck, XCircle, Loader2 } from "lucide-react";
import { confirmOrder, updateOrderStatus, cancelOrder } from "../actions";

interface OrderActionsProps {
  orderId: string;
  status: string;
  canEdit: boolean;
  canCancel: boolean;
}

export function OrderActions({ orderId, status, canEdit, canCancel }: OrderActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(action: () => Promise<{ success?: boolean; error?: string }>) {
    setLoading(true);
    setError(null);
    try {
      const result = await action();
      if (result?.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setLoading(false);
    }
  }

  const btnClass = "inline-flex items-center gap-1.5 px-3 py-2 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status === "DRAFT" && canEdit && (
          <button
            disabled={loading}
            onClick={() => handleAction(() => confirmOrder(orderId))}
            className={`${btnClass} bg-blue-600 hover:bg-blue-700`}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Confirm Order
          </button>
        )}
        {status === "CONFIRMED" && canEdit && (
          <button
            disabled={loading}
            onClick={() => handleAction(() => updateOrderStatus(orderId, "PREPARING"))}
            className={`${btnClass} bg-yellow-600 hover:bg-yellow-700`}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
            Start Preparing
          </button>
        )}
        {status === "PREPARING" && canEdit && (
          <button
            disabled={loading}
            onClick={() => handleAction(() => updateOrderStatus(orderId, "PACKED"))}
            className={`${btnClass} bg-teal-600 hover:bg-teal-700`}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
            Mark Packed
          </button>
        )}
        {status === "PACKED" && canEdit && (
          <button
            disabled={loading}
            onClick={() => handleAction(() => updateOrderStatus(orderId, "SHIPPED"))}
            className={`${btnClass} bg-indigo-600 hover:bg-indigo-700`}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
            Mark Shipped
          </button>
        )}
        {status === "SHIPPED" && canEdit && (
          <button
            disabled={loading}
            onClick={() => handleAction(() => updateOrderStatus(orderId, "DELIVERED"))}
            className={`${btnClass} bg-green-600 hover:bg-green-700`}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Mark Delivered
          </button>
        )}
        {["DRAFT", "CONFIRMED", "PREPARING", "PACKED"].includes(status) && canCancel && (
          <button
            disabled={loading}
            onClick={() => handleAction(() => cancelOrder(orderId))}
            className={`${btnClass} bg-red-600 hover:bg-red-700`}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            Cancel
          </button>
        )}
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
}

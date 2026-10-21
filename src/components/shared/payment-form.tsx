"use client";

import { useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { recordPaymentAction } from "@/app/(dashboard)/payments/actions";
import { formatCurrency } from "@/lib/utils";
import Decimal from "decimal.js";

interface PaymentFormProps {
  customers: Array<{ id: string; name: string; company?: string | null }>;
  suppliers: Array<{ id: string; name: string }>;
  outstandingInvoices: Array<{
    id: string;
    invoiceNumber: string;
    totalAmount: string;
    paidAmount: string;
    outstanding: string;
    dueDate: string;
  }>;
  defaultCustomerId?: string;
  defaultInvoiceId?: string;
  defaultOrderId?: string;
}

export default function PaymentForm({
  customers,
  suppliers,
  outstandingInvoices: initialInvoices,
  defaultCustomerId,
  defaultInvoiceId,
  defaultOrderId,
}: PaymentFormProps) {
  const router = useRouter();
  const [direction, setDirection] = useState<"INBOUND" | "OUTBOUND">("INBOUND");
  const [type, setType] = useState("PAYMENT");
  const [method, setMethod] = useState("UPI");
  const [customerId, setCustomerId] = useState(defaultCustomerId || "");
  const [supplierId, setSupplierId] = useState("");
  const [amount, setAmount] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [allocations, setAllocations] = useState<Record<string, string>>(
    defaultInvoiceId
      ? { [defaultInvoiceId]: initialInvoices.find((i) => i.id === defaultInvoiceId)?.outstanding || "" }
      : {}
  );

  const handleSubmit = async (_prev: unknown, formData: FormData) => {
    const invoiceAllocations = Object.entries(allocations)
      .filter(([, amt]) => new Decimal(amt || 0).gt(0))
      .map(([invoiceId, amt]) => ({ invoiceId, amount: parseFloat(amt) }));

    const data = {
      type,
      direction,
      customerId: direction === "INBOUND" ? customerId : undefined,
      supplierId: direction === "OUTBOUND" ? supplierId : undefined,
      orderId: defaultOrderId || undefined,
      amount: parseFloat(amount),
      method,
      referenceNumber: referenceNumber || undefined,
      paymentDate,
      notes: notes || undefined,
      invoiceAllocations: invoiceAllocations.length > 0 ? invoiceAllocations : undefined,
    };

    const fd = new FormData();
    fd.set("data", JSON.stringify(data));
    const result = await recordPaymentAction(null, fd);
    if (result.success && result.paymentId) {
      router.push(`/payments/${result.paymentId}`);
    }
    return result;
  };

  const [state, formAction, isPending] = useActionState(handleSubmit, null);

  return (
    <form action={formAction} className="space-y-6 max-w-3xl">
      {state?.error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
        <h3 className="font-semibold">Payment Details</h3>

        {/* Direction Toggle */}
        <div className="flex rounded-lg border overflow-hidden w-fit">
          <button
            type="button"
            onClick={() => setDirection("INBOUND")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${direction === "INBOUND" ? "bg-emerald-600 text-white" : "bg-card hover:bg-muted"}`}
          >
            ↓ Payment Received
          </button>
          <button
            type="button"
            onClick={() => setDirection("OUTBOUND")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${direction === "OUTBOUND" ? "bg-amber-600 text-white" : "bg-card hover:bg-muted"}`}
          >
            ↑ Payment Made
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
              <option value="PAYMENT">Payment</option>
              <option value="ADVANCE">Advance</option>
              <option value="REFUND">Refund</option>
              <option value="DEPOSIT">Deposit</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Method *</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
              <option value="UPI">UPI</option>
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CARD">Card</option>
              <option value="CHEQUE">Cheque</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          {direction === "INBOUND" ? (
            <div>
              <label className="block text-sm font-medium mb-1">Customer *</label>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                <option value="">Select customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ""}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1">Supplier *</label>
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                <option value="">Select supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Amount (₹) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              placeholder="0.00"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Payment Date</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reference Number</label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Transaction ID, cheque number, etc."
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            placeholder="Optional notes..."
          />
        </div>
      </div>

      {/* Invoice Allocation */}
      {direction === "INBOUND" && initialInvoices.length > 0 && (
        <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
          <h3 className="font-semibold">Allocate to Invoices</h3>
          <p className="text-sm text-muted-foreground">Optionally allocate this payment to outstanding invoices</p>

          <div className="space-y-3">
            {initialInvoices.map((inv) => (
              <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg border">
                <div className="flex-1">
                  <p className="font-medium text-sm">{inv.invoiceNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    Total: {formatCurrency(inv.totalAmount)} • Paid: {formatCurrency(inv.paidAmount)} • Due: {inv.dueDate}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-amber-700 font-medium whitespace-nowrap">
                    Outstanding: {formatCurrency(inv.outstanding)}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={inv.outstanding}
                    value={allocations[inv.id] || ""}
                    onChange={(e) => setAllocations((prev) => ({ ...prev, [inv.id]: e.target.value }))}
                    placeholder="0.00"
                    className="w-28 rounded-lg border bg-background px-2 py-1.5 text-sm text-right"
                  />
                </div>
              </div>
            ))}
          </div>

          {Object.values(allocations).some((v) => new Decimal(v || 0).gt(0)) && (
            <p className="text-sm text-muted-foreground">
              Total allocated:{" "}
              <span className="font-medium text-foreground">
                {formatCurrency(
                  Object.values(allocations).reduce((s, v) => s.plus(new Decimal(v || 0)), new Decimal(0))
                )}
              </span>
            </p>
          )}
        </div>
      )}

      {/* Submit */}
      <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
        <button type="button" onClick={() => router.back()} className="rounded-lg border px-6 py-2.5 text-sm font-medium hover:bg-muted">
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || !amount || (direction === "INBOUND" && !customerId) || (direction === "OUTBOUND" && !supplierId)}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Recording..." : "Record Payment"}
        </button>
      </div>
    </form>
  );
}

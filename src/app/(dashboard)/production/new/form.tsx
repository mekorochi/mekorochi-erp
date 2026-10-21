"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createProductionOrderAction } from "@/app/(dashboard)/production/actions";
import Decimal from "decimal.js";

interface BOMOption {
  id: string;
  name: string;
  version: number;
  productName: string;
  productSku: string;
  batchSize: string;
  batchUnit: string;
  items: Array<{
    productName: string;
    productSku: string;
    quantity: string;
    unit: string;
  }>;
}

export default function NewProductionOrderForm({
  boms,
  preselectedBomId,
}: {
  boms: BOMOption[];
  preselectedBomId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [bomId, setBomId] = useState(preselectedBomId || "");
  const [plannedQty, setPlannedQty] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [notes, setNotes] = useState("");

  const selectedBom = boms.find((b) => b.id === bomId);

  const multiplier = useMemo(() => {
    if (!selectedBom || !plannedQty) return new Decimal(0);
    const bs = new Decimal(selectedBom.batchSize);
    return bs.gt(0) ? new Decimal(plannedQty).div(bs) : new Decimal(0);
  }, [selectedBom, plannedQty]);

  const ingredientRequirements = useMemo(() => {
    if (!selectedBom) return [];
    return selectedBom.items.map((item) => ({
      ...item,
      required: multiplier.mul(new Decimal(item.quantity)).toFixed(3),
    }));
  }, [selectedBom, multiplier]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.set("bomId", bomId);
    formData.set("plannedQty", plannedQty);
    if (plannedDate) formData.set("plannedDate", plannedDate);
    if (notes) formData.set("notes", notes);

    const result = await createProductionOrderAction(formData);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      router.push("/production");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
        <h2 className="text-lg font-semibold">Production Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1.5">
              Recipe <span className="text-destructive">*</span>
            </label>
            <select
              value={bomId}
              onChange={(e) => setBomId(e.target.value)}
              required
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select recipe...</option>
              {boms.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} v{b.version} — {b.productName} (batch:{" "}
                  {b.batchSize} {b.batchUnit.toLowerCase()})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Planned Quantity <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              value={plannedQty}
              onChange={(e) => setPlannedQty(e.target.value)}
              placeholder={
                selectedBom
                  ? `Batch size: ${selectedBom.batchSize}`
                  : "Enter quantity"
              }
              step="any"
              min="0.001"
              required
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {selectedBom && plannedQty && (
              <p className="text-xs text-muted-foreground mt-1">
                {multiplier.toFixed(2)}× batch size
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Planned Date
            </label>
            <input
              type="date"
              value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
        </div>
      </div>

      {/* Ingredient Requirements */}
      {selectedBom && ingredientRequirements.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">
              Ingredient Requirements
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Based on {multiplier.toFixed(2)}× batch multiplier
            </p>
          </div>
          <div className="divide-y">
            {ingredientRequirements.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-4 sm:px-6 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.productSku}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium tabular-nums">
                    {item.required} {item.unit.toLowerCase()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    per batch: {item.quantity}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !bomId || !plannedQty}
          className="rounded-lg bg-primary text-primary-foreground px-6 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Production Order"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateProductionStatusAction,
  startProductionAction,
  completeProductionAction,
  qcCheckAction,
} from "@/app/(dashboard)/production/actions";
import { Play, CheckCircle2, Pause, X, ClipboardCheck } from "lucide-react";

interface ProductionActionsProps {
  orderId: string;
  status: string;
  consumptions: Array<{
    productId: string;
    plannedQty: string;
    productName: string;
  }>;
  warehouses: Array<{ id: string; name: string; type: string }>;
}

export default function ProductionActions({
  orderId,
  status,
  consumptions,
  warehouses,
}: ProductionActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showComplete, setShowComplete] = useState(false);
  const [showQC, setShowQC] = useState(false);

  // Completion form state
  const [actualQty, setActualQty] = useState("");
  const [wastageQty, setWastageQty] = useState("");
  const [wastageNotes, setWastageNotes] = useState("");
  const [outputLotNumber, setOutputLotNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [warehouseId, setWarehouseId] = useState(
    warehouses.find((w) => w.type === "FINISHED_GOODS")?.id ||
      warehouses[0]?.id ||
      ""
  );
  const [actualConsumptions, setActualConsumptions] = useState(
    consumptions.map((c) => ({
      productId: c.productId,
      actualQty: c.plannedQty,
      lotId: "",
    }))
  );

  // QC form state
  const [qcStatus, setQcStatus] = useState<"PASSED" | "FAILED" | "CONDITIONAL">("PASSED");
  const [qcNotes, setQcNotes] = useState("");

  async function handleStatusChange(newStatus: string) {
    setLoading(true);
    setError("");
    const result =
      newStatus === "IN_PROGRESS"
        ? await startProductionAction(orderId)
        : await updateProductionStatusAction(orderId, newStatus);
    setLoading(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.set("actualQty", actualQty);
    formData.set("wastageQty", wastageQty);
    formData.set("wastageNotes", wastageNotes);
    formData.set("outputLotNumber", outputLotNumber);
    formData.set("expiryDate", expiryDate);
    formData.set("warehouseId", warehouseId);
    formData.set("consumptions", JSON.stringify(actualConsumptions));

    const result = await completeProductionAction(orderId, formData);
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      setShowComplete(false);
      router.refresh();
    }
  }

  async function handleQC(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await qcCheckAction(orderId, qcStatus, qcNotes);
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      setShowQC(false);
      router.refresh();
    }
  }

  if (["COMPLETED", "CANCELLED"].includes(status)) return null;

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Status Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {status === "DRAFT" && (
          <button
            onClick={() => handleStatusChange("PLANNED")}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <ClipboardCheck className="h-4 w-4" />
            Plan Order
          </button>
        )}
        {status === "PLANNED" && (
          <button
            onClick={() => handleStatusChange("APPROVED")}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            Approve
          </button>
        )}
        {(status === "PLANNED" || status === "APPROVED") && (
          <button
            onClick={() => handleStatusChange("IN_PROGRESS")}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            Start Production
          </button>
        )}
        {status === "IN_PROGRESS" && (
          <>
            <button
              onClick={() => setShowComplete(true)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Complete
            </button>
            <button
              onClick={() => handleStatusChange("QC_HOLD")}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <Pause className="h-4 w-4" />
              QC Hold
            </button>
          </>
        )}
        {status === "QC_HOLD" && (
          <>
            <button
              onClick={() => setShowQC(true)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <ClipboardCheck className="h-4 w-4" />
              Record QC Result
            </button>
            <button
              onClick={() => handleStatusChange("IN_PROGRESS")}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              Resume Production
            </button>
          </>
        )}
        {!["COMPLETED", "CANCELLED"].includes(status) && (
          <button
            onClick={() => handleStatusChange("CANCELLED")}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 text-destructive px-4 py-2.5 text-sm font-medium hover:bg-destructive/5 transition-colors disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
        )}
      </div>

      {/* Completion Form */}
      {showComplete && (
        <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
          <h3 className="text-lg font-semibold">Complete Production</h3>
          <form onSubmit={handleComplete} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Actual Quantity Produced <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  value={actualQty}
                  onChange={(e) => setActualQty(e.target.value)}
                  step="any"
                  min="0.001"
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Wastage Quantity
                </label>
                <input
                  type="number"
                  value={wastageQty}
                  onChange={(e) => setWastageQty(e.target.value)}
                  step="any"
                  min="0"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Output Lot Number
                </label>
                <input
                  type="text"
                  value={outputLotNumber}
                  onChange={(e) => setOutputLotNumber(e.target.value)}
                  placeholder="Auto-generated if empty"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Output Warehouse <span className="text-destructive">*</span>
                </label>
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.type.replace("_", " ")})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Wastage Notes
                </label>
                <input
                  type="text"
                  value={wastageNotes}
                  onChange={(e) => setWastageNotes(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Actual Consumptions */}
            <div>
              <h4 className="text-sm font-semibold mb-2">
                Actual Ingredient Consumption
              </h4>
              <div className="space-y-2">
                {actualConsumptions.map((c, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 rounded-lg bg-muted/30 border"
                  >
                    <span className="text-sm font-medium flex-1 min-w-0">
                      {consumptions[idx]?.productName}
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={c.actualQty}
                        onChange={(e) => {
                          const updated = [...actualConsumptions];
                          updated[idx] = {
                            ...updated[idx],
                            actualQty: e.target.value,
                          };
                          setActualConsumptions(updated);
                        }}
                        step="any"
                        min="0"
                        className="w-28 rounded-md border border-input bg-background px-2.5 py-2 text-sm"
                      />
                      <span className="text-xs text-muted-foreground">
                        planned: {consumptions[idx]?.plannedQty}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowComplete(false)}
                className="rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !actualQty || !warehouseId}
                className="rounded-lg bg-green-600 text-white px-6 py-2.5 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? "Completing..." : "Complete Production"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* QC Form */}
      {showQC && (
        <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
          <h3 className="text-lg font-semibold">Quality Control Check</h3>
          <form onSubmit={handleQC} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                QC Result
              </label>
              <div className="flex flex-wrap gap-2">
                {(["PASSED", "CONDITIONAL", "FAILED"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setQcStatus(s)}
                    className={`rounded-lg px-4 py-2.5 text-sm font-medium border transition-colors ${
                      qcStatus === s
                        ? s === "PASSED"
                          ? "bg-green-600 text-white border-green-600"
                          : s === "FAILED"
                          ? "bg-red-600 text-white border-red-600"
                          : "bg-amber-600 text-white border-amber-600"
                        : "hover:bg-muted"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                QC Notes <span className="text-destructive">*</span>
              </label>
              <textarea
                value={qcNotes}
                onChange={(e) => setQcNotes(e.target.value)}
                rows={3}
                required
                placeholder="Describe the quality check findings..."
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowQC(false)}
                className="rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !qcNotes}
                className="rounded-lg bg-primary text-primary-foreground px-6 py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? "Saving..." : "Submit QC Result"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

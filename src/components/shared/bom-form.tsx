"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { createBOMAction } from "@/app/(dashboard)/production/actions";

interface Product {
  id: string;
  name: string;
  sku: string;
  type: string;
  unitOfMeasure: string;
}

interface BOMFormProps {
  finishedProducts: Product[];
  rawMaterials: Product[];
  initialData?: any;
}

const UNITS = [
  { value: "GRAM", label: "Grams (g)" },
  { value: "KILOGRAM", label: "Kilograms (kg)" },
  { value: "PIECE", label: "Pieces" },
  { value: "LITER", label: "Litres (L)" },
  { value: "MILLILITER", label: "Millilitres (mL)" },
  { value: "BOX", label: "Boxes" },
  { value: "METER", label: "Metres" },
  { value: "SET", label: "Sets" },
];

interface IngredientRow {
  productId: string;
  quantity: string;
  unit: string;
  wastagePercent: string;
  notes: string;
}

export default function BOMForm({
  finishedProducts,
  rawMaterials,
  initialData,
}: BOMFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [productId, setProductId] = useState(initialData?.productId || "");
  const [name, setName] = useState(initialData?.name || "");
  const [batchSize, setBatchSize] = useState(initialData?.batchSize || "");
  const [batchUnit, setBatchUnit] = useState(initialData?.batchUnit || "PIECE");
  const [expectedYield, setExpectedYield] = useState(
    initialData?.expectedYield || ""
  );
  const [wastagePercent, setWastagePercent] = useState(
    initialData?.wastagePercent || ""
  );
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [stages, setStages] = useState<string[]>(
    initialData?.processStages || []
  );
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    initialData?.items || [
      { productId: "", quantity: "", unit: "GRAM", wastagePercent: "", notes: "" },
    ]
  );

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      { productId: "", quantity: "", unit: "GRAM", wastagePercent: "", notes: "" },
    ]);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length <= 1) return;
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (
    index: number,
    field: keyof IngredientRow,
    value: string
  ) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const addStage = () => setStages([...stages, ""]);
  const removeStage = (index: number) =>
    setStages(stages.filter((_, i) => i !== index));
  const updateStage = (index: number, value: string) => {
    const updated = [...stages];
    updated[index] = value;
    setStages(updated);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.set("productId", productId);
    formData.set("name", name);
    formData.set("batchSize", batchSize);
    formData.set("batchUnit", batchUnit);
    formData.set("expectedYield", expectedYield);
    formData.set("wastagePercent", wastagePercent);
    formData.set("notes", notes);
    formData.set("processStages", JSON.stringify(stages.filter(Boolean)));
    formData.set(
      "items",
      JSON.stringify(
        ingredients.filter((i) => i.productId && i.quantity)
      )
    );

    const result = await createBOMAction(formData);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      router.push("/production/recipes");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
        <h2 className="text-lg font-semibold">Recipe Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Output Product <span className="text-destructive">*</span>
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              required
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select finished product...</option>
              {finishedProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Recipe Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dark Chocolate 72% Standard"
              required
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Batch Size <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              value={batchSize}
              onChange={(e) => setBatchSize(e.target.value)}
              placeholder="e.g. 100"
              step="any"
              min="0.001"
              required
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Batch Unit
            </label>
            <select
              value={batchUnit}
              onChange={(e) => setBatchUnit(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Expected Yield %
            </label>
            <input
              type="number"
              value={expectedYield}
              onChange={(e) => setExpectedYield(e.target.value)}
              placeholder="e.g. 95"
              step="0.01"
              min="0"
              max="100"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Overall Wastage %
            </label>
            <input
              type="number"
              value={wastagePercent}
              onChange={(e) => setWastagePercent(e.target.value)}
              placeholder="e.g. 5"
              step="0.01"
              min="0"
              max="100"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>
      </div>

      {/* Ingredients */}
      <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Ingredients</h2>
          <button
            type="button"
            onClick={addIngredient}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
        <div className="space-y-3">
          {ingredients.map((ing, idx) => (
            <div
              key={idx}
              className="flex flex-col sm:flex-row gap-2 sm:gap-3 p-3 rounded-lg bg-muted/30 border"
            >
              <div className="hidden sm:flex items-center text-muted-foreground">
                <GripVertical className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-medium text-muted-foreground mb-1 sm:hidden">
                  Material
                </label>
                <select
                  value={ing.productId}
                  onChange={(e) =>
                    updateIngredient(idx, "productId", e.target.value)
                  }
                  required
                  className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm"
                >
                  <option value="">Select material...</option>
                  {rawMaterials.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-28">
                <label className="block text-xs font-medium text-muted-foreground mb-1 sm:hidden">
                  Quantity
                </label>
                <input
                  type="number"
                  value={ing.quantity}
                  onChange={(e) =>
                    updateIngredient(idx, "quantity", e.target.value)
                  }
                  placeholder="Qty"
                  step="any"
                  min="0.001"
                  required
                  className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm"
                />
              </div>
              <div className="w-full sm:w-32">
                <label className="block text-xs font-medium text-muted-foreground mb-1 sm:hidden">
                  Unit
                </label>
                <select
                  value={ing.unit}
                  onChange={(e) =>
                    updateIngredient(idx, "unit", e.target.value)
                  }
                  className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm"
                >
                  {UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-24">
                <label className="block text-xs font-medium text-muted-foreground mb-1 sm:hidden">
                  Wastage %
                </label>
                <input
                  type="number"
                  value={ing.wastagePercent}
                  onChange={(e) =>
                    updateIngredient(idx, "wastagePercent", e.target.value)
                  }
                  placeholder="Waste %"
                  step="0.01"
                  min="0"
                  max="100"
                  className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => removeIngredient(idx)}
                disabled={ingredients.length <= 1}
                className="self-end sm:self-center p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Process Stages */}
      <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Process Stages</h2>
          <button
            type="button"
            onClick={addStage}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Stage
          </button>
        </div>
        {stages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No process stages defined. Add stages to document your production
            workflow.
          </p>
        ) : (
          <div className="space-y-2">
            {stages.map((stage, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={stage}
                  onChange={(e) => updateStage(idx, e.target.value)}
                  placeholder={`Stage ${idx + 1} (e.g. Roasting, Grinding...)`}
                  className="flex-1 rounded-md border border-input bg-background px-2.5 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeStage(idx)}
                  className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

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
          disabled={loading}
          className="rounded-lg bg-primary text-primary-foreground px-6 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Recipe"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { adjustStock } from "../actions";

import { getUnitLabel, isWeightUnit } from "@/lib/utils";

interface Props {
  products: Array<{ id: string; name: string; sku: string; unitOfMeasure: string }>;
  warehouses: Array<{ id: string; name: string; code: string }>;
}

export function StockAdjustmentDialog({ products, warehouses }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const unitLabel = selectedProduct ? getUnitLabel(selectedProduct.unitOfMeasure) : "";
  const step = selectedProduct && isWeightUnit(selectedProduct.unitOfMeasure) ? "0.001" : "1";
  const [state, formAction, isPending] = useActionState(async (_prev: unknown, formData: FormData) => {
    const result = await adjustStock(_prev, formData);
    if (result.success) setOpen(false);
    return result;
  }, null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Adjustment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Stock Adjustment</DialogTitle>
          <DialogDescription>
            Add or remove stock. Use positive quantity to add, negative to remove.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="productId">Product</Label>
            <Select name="productId" required onValueChange={setSelectedProductId}>
              <SelectTrigger id="productId">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="warehouseId">Warehouse</Label>
            <Select name="warehouseId" required>
              <SelectTrigger id="warehouseId">
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity (+/-){unitLabel ? ` (${unitLabel})` : ""}</Label>
              <Input id="quantity" name="quantity" type="number" step={step} required placeholder="e.g. 100 or -50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lotNumber">Lot Number (optional)</Label>
              <Input id="lotNumber" name="lotNumber" placeholder="e.g. LOT-001" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiryDate">Expiry Date (optional)</Label>
            <Input id="expiryDate" name="expiryDate" type="date" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Input id="reason" name="reason" required placeholder="e.g. Opening balance, Count correction" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" name="notes" rows={2} placeholder="Additional notes..." />
          </div>

          {state && "error" in state && state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Adjustment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

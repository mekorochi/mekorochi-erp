"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { receiveGoods } from "../actions";
import { PackageCheck } from "lucide-react";

interface ReceiveItem {
  productId: string;
  productName: string;
  productSku: string;
  ordered: number;
  received: number;
  remaining: number;
}

interface Props {
  poId: string;
  items: ReceiveItem[];
  warehouses: Array<{ id: string; name: string; code: string }>;
}

interface ReceiveLineState {
  quantity: number;
  lotNumber: string;
  expiryDate: string;
}

export function ReceiveGoodsForm({ poId, items, warehouses }: Props) {
  const router = useRouter();
  const [warehouseId, setWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Record<string, ReceiveLineState>>(
    Object.fromEntries(
      items
        .filter((i) => i.remaining > 0)
        .map((i) => [i.productId, { quantity: i.remaining, lotNumber: "", expiryDate: "" }])
    )
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const receivableItems = items.filter((i) => i.remaining > 0);
  if (receivableItems.length === 0) {
    return <p className="text-sm text-muted-foreground">All items have been fully received.</p>;
  }

  const updateLine = (productId: string, field: keyof ReceiveLineState, value: string | number) => {
    setLines((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: value },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!warehouseId) { setError("Select a warehouse"); return; }

    const receiveItems = receivableItems
      .filter((i) => {
        const line = lines[i.productId];
        return line && line.quantity > 0;
      })
      .map((i) => {
        const line = lines[i.productId];
        return {
          productId: i.productId,
          quantity: line.quantity,
          lotNumber: line.lotNumber || undefined,
          expiryDate: line.expiryDate || undefined,
        };
      });

    if (receiveItems.length === 0) { setError("No items to receive"); return; }

    setLoading(true);
    try {
      const result = await receiveGoods({
        purchaseOrderId: poId,
        warehouseId,
        notes: notes || undefined,
        items: receiveItems,
      });

      if ("error" in result) {
        setError(result.error);
      } else {
        router.refresh();
      }
    } catch {
      setError("Failed to receive goods");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Receive into Warehouse</Label>
        <Select value={warehouseId} onValueChange={setWarehouseId}>
          <SelectTrigger>
            <SelectValue placeholder="Select warehouse" />
          </SelectTrigger>
          <SelectContent>
            {warehouses.map((w) => (
              <SelectItem key={w.id} value={w.id}>{w.name} ({w.code})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {receivableItems.map((item) => {
          const line = lines[item.productId];
          if (!line) return null;

          return (
            <div key={item.productId} className="p-3 rounded-lg bg-muted/30 border">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-sm">{item.productName}</p>
                  <p className="text-xs text-muted-foreground font-mono">{item.productSku}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Remaining: <span className="font-mono font-medium">{item.remaining}</span>
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Quantity</Label>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    max={item.remaining}
                    value={line.quantity}
                    onChange={(e) => updateLine(item.productId, "quantity", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Lot Number</Label>
                  <Input
                    placeholder="Auto-generated"
                    value={line.lotNumber}
                    onChange={(e) => updateLine(item.productId, "lotNumber", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Expiry Date</Label>
                  <Input
                    type="date"
                    value={line.expiryDate}
                    onChange={(e) => updateLine(item.productId, "expiryDate", e.target.value)}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Receipt notes..." />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading}>
        <PackageCheck className="h-4 w-4 mr-2" />
        {loading ? "Receiving..." : "Receive Goods"}
      </Button>
    </form>
  );
}

"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { createPurchaseOrder } from "@/app/(dashboard)/purchasing/actions";
import Decimal from "decimal.js";

interface POItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

interface Props {
  suppliers: Array<{ id: string; name: string }>;
  products: Array<{ id: string; name: string; sku: string; costPrice?: string | null }>;
}

export function PurchaseOrderForm({ suppliers, products }: Props) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<POItem[]>([{ productId: "", quantity: 1, unitPrice: 0, taxRate: 0 }]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addItem = () => setItems([...items, { productId: "", quantity: 1, unitPrice: 0, taxRate: 0 }]);

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof POItem, value: string | number) => {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleProductSelect = (idx: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    setItems(items.map((item, i) =>
      i === idx
        ? { ...item, productId, unitPrice: product?.costPrice ? parseFloat(product.costPrice) : 0 }
        : item
    ));
  };

  const subtotal = items.reduce((sum, item) => {
    return sum.plus(new Decimal(item.quantity || 0).mul(new Decimal(item.unitPrice || 0)));
  }, new Decimal(0));

  const totalTax = items.reduce((sum, item) => {
    const line = new Decimal(item.quantity || 0).mul(new Decimal(item.unitPrice || 0));
    return sum.plus(line.mul(new Decimal(item.taxRate || 0)).div(100));
  }, new Decimal(0));

  const total = subtotal.plus(totalTax);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!supplierId) { setError("Select a supplier"); return; }
    if (items.some((i) => !i.productId)) { setError("Select a product for each line"); return; }
    if (items.some((i) => i.quantity <= 0)) { setError("Quantity must be positive"); return; }

    setIsSubmitting(true);
    try {
      const result = await createPurchaseOrder({
        supplierId,
        expectedDate: expectedDate || undefined,
        notes: notes || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          taxRate: i.taxRate,
        })),
      });

      if (result.error) {
        setError(result.error);
      } else if (result.success && result.id) {
        router.push(`/purchasing/${result.id}`);
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Order Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Expected Delivery</Label>
              <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Order notes..." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Line Items</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 rounded-lg bg-muted/30 border">
                <div className="sm:col-span-4 space-y-1">
                  <Label className="text-xs">Product</Label>
                  <Select value={item.productId} onValueChange={(v) => handleProductSelect(idx, v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs">Quantity</Label>
                  <Input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs">Unit Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs">Tax %</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={item.taxRate}
                    onChange={(e) => updateItem(idx, "taxRate", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="sm:col-span-1 space-y-1">
                  <Label className="text-xs">Amount</Label>
                  <p className="h-11 flex items-center text-sm font-medium">
                    {formatCurrency(new Decimal(item.quantity || 0).mul(new Decimal(item.unitPrice || 0)).toNumber())}
                  </p>
                </div>
                <div className="sm:col-span-1 flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(idx)}
                    disabled={items.length <= 1}
                    className="h-11 w-11 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <div className="w-full sm:w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal.toNumber())}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(totalTax.toNumber())}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Total</span>
                <span>{formatCurrency(total.toNumber())}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Purchase Order"}
        </Button>
      </div>
    </form>
  );
}

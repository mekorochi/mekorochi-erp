"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Save, Loader2, Package, Search } from "lucide-react";
import { updateBundleItems } from "../actions";

interface AvailableProduct {
  id: string;
  name: string;
  sku: string;
  type: string;
}

interface BundleItem {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
}

interface Props {
  productId: string;
  availableProducts: AvailableProduct[];
  initialItems: BundleItem[];
}

export function BundleItemsEditor({ productId, availableProducts, initialItems }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<BundleItem[]>(initialItems);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const filteredProducts = availableProducts.filter(
    (p) =>
      p.id !== productId &&
      p.type !== "BUNDLE" &&
      !items.some((i) => i.productId === p.id) &&
      (search === "" ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  function addItem(product: AvailableProduct) {
    setItems([...items, { productId: product.id, name: product.name, sku: product.sku, quantity: 1 }]);
    setSearch("");
    setShowDropdown(false);
    setSuccess(false);
  }

  function removeItem(id: string) {
    setItems(items.filter((i) => i.productId !== id));
    setSuccess(false);
  }

  function updateQuantity(id: string, quantity: number) {
    setItems(items.map((i) => (i.productId === id ? { ...i, quantity: Math.max(0.001, quantity) } : i)));
    setSuccess(false);
  }

  async function handleSave() {
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      const result = await updateBundleItems(
        productId,
        items.map((i) => ({ productId: i.productId, quantity: i.quantity }))
      );
      if ("error" in result && result.error) {
        setError(result.error as string);
      } else {
        setSuccess(true);
        router.refresh();
      }
    } catch {
      setError("Failed to save bundle items");
    }
    setLoading(false);
  }

  const serialized = (arr: BundleItem[]) => arr.map(i => `${i.productId}:${i.quantity}`).join(",");
  const hasChanges = serialized(items) !== serialized(initialItems);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-4 w-4" />
            Bundle Contents
          </CardTitle>
          {hasChanges && (
            <Button size="sm" onClick={handleSave} disabled={loading}>
              {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
              Save Changes
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 text-destructive px-3 py-2 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-green-50 border border-green-200 text-green-700 px-3 py-2 text-sm">
            Bundle items saved.
          </div>
        )}

        {items.length > 0 ? (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.productId} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.productId, parseFloat(e.target.value) || 0.001)}
                    className="w-20 h-8 text-center text-sm"
                    min="0.001"
                    step="1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.productId)}
                    className="text-destructive hover:text-destructive h-8 w-8 p-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No items in this bundle yet. Search and add products below.
          </p>
        )}

        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products to add..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              className="pl-9"
            />
          </div>
          {showDropdown && search.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filteredProducts.length > 0 ? (
                filteredProducts.slice(0, 10).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addItem(p)}
                    className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center justify-between"
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="text-xs text-muted-foreground font-mono ml-2 shrink-0">{p.sku}</span>
                  </button>
                ))
              ) : (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  No matching products found
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOrder } from "@/app/(dashboard)/orders/actions";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2, Truck, Building2 } from "lucide-react";
import Decimal from "decimal.js";

interface Address {
  id: string;
  label: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  isBilling: boolean;
  isShipping: boolean;
}

interface Customer {
  id: string;
  name: string;
  company: string | null;
  type: string;
  addresses: Address[];
}

interface Product {
  id: string;
  name: string;
  sku: string;
  sellingPrice: string;
  taxRate: string;
  hsnCode: string | null;
}

interface OrderItem {
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  hsnCode: string;
}

const CHANNELS = ["Manual", "Shopify", "Instagram", "WhatsApp", "Amazon", "Corporate", "Retail"];

export default function OrderForm({
  customers,
  products,
}: {
  customers: Customer[];
  products: Product[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [customerId, setCustomerId] = useState("");
  const [channel, setChannel] = useState("Manual");
  const [notes, setNotes] = useState("");
  const [giftNote, setGiftNote] = useState("");
  const [deliveryTerms, setDeliveryTerms] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [shippingAmount, setShippingAmount] = useState(0);
  const [shipTo, setShipTo] = useState({ line1: "", line2: "", city: "", state: "", pincode: "" });

  const [items, setItems] = useState<OrderItem[]>([
    { productId: "", description: "", quantity: 1, unitPrice: 0, discount: 0, taxRate: 0, hsnCode: "" },
  ]);

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const customerBillingAddress = selectedCustomer?.addresses.find((a) => a.isBilling) || selectedCustomer?.addresses.find((a) => a.isDefault);

  function addItem() {
    setItems([...items, { productId: "", description: "", quantity: 1, unitPrice: 0, discount: 0, taxRate: 0, hsnCode: "" }]);
  }

  function removeItem(idx: number) {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof OrderItem, value: string | number) {
    const updated = [...items];
    (updated[idx] as unknown as Record<string, unknown>)[field] = value;
    if (field === "productId") {
      const product = products.find((p) => p.id === value);
      if (product) {
        updated[idx].unitPrice = parseFloat(product.sellingPrice) || 0;
        updated[idx].taxRate = parseFloat(product.taxRate) || 0;
        updated[idx].description = product.name;
        updated[idx].hsnCode = product.hsnCode || "";
      }
    }
    setItems(updated);
  }

  const subtotal = items.reduce((sum, item) => {
    return sum.plus(new Decimal(item.quantity || 0).mul(new Decimal(item.unitPrice || 0)).minus(new Decimal(item.discount || 0)));
  }, new Decimal(0));

  const totalTax = items.reduce((sum, item) => {
    const lineTotal = new Decimal(item.quantity || 0).mul(new Decimal(item.unitPrice || 0)).minus(new Decimal(item.discount || 0));
    return sum.plus(lineTotal.mul(new Decimal(item.taxRate || 0)).div(100));
  }, new Decimal(0));

  const grandTotal = subtotal.minus(new Decimal(discountAmount || 0)).plus(totalTax).plus(new Decimal(shippingAmount || 0));

  function handleSubmit() {
    if (!customerId) { setError("Please select a customer"); return; }
    if (items.some((i) => !i.productId || i.quantity <= 0)) {
      setError("All items must have a product and valid quantity");
      return;
    }

    setError("");

    const billingAddr = customerBillingAddress ? {
      line1: customerBillingAddress.addressLine1,
      line2: customerBillingAddress.addressLine2 || "",
      city: customerBillingAddress.city,
      state: customerBillingAddress.state,
      pincode: customerBillingAddress.pincode,
    } : undefined;

    const shippingAddr = deliveryTerms === "DELIVERY" && shipTo.line1
      ? { line1: shipTo.line1, line2: shipTo.line2, city: shipTo.city, state: shipTo.state, pincode: shipTo.pincode }
      : undefined;

    startTransition(async () => {
      const result = await createOrder({
        customerId,
        channel,
        notes: notes || undefined,
        giftNote: giftNote || undefined,
        deliveryTerms,
        discountAmount: deliveryTerms === "PICKUP" ? discountAmount : discountAmount,
        shippingAmount: deliveryTerms === "DELIVERY" ? shippingAmount : 0,
        shippingAddress: shippingAddr,
        billingAddress: billingAddr,
        items: items.map((i) => ({
          productId: i.productId,
          description: i.description || undefined,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount,
          taxRate: i.taxRate,
          hsnCode: i.hsnCode || undefined,
        })),
      });

      if ("error" in result && result.error) {
        setError(typeof result.error === "string" ? result.error : "Failed to create order");
      } else if (result.success) {
        router.push(`/orders/${result.id}`);
      }
    });
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {/* Customer & Channel */}
      <div className="bg-card rounded-xl border shadow-sm p-4 sm:p-6 space-y-4">
        <h2 className="font-semibold">Order Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Customer *</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.company ? ` (${c.company})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Channel</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {CHANNELS.map((ch) => (
                <option key={ch} value={ch}>{ch}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Delivery Terms */}
      <div className="bg-card rounded-xl border shadow-sm p-4 sm:p-6 space-y-4">
        <h2 className="font-semibold">Delivery Terms</h2>
        <div className="flex gap-4">
          <label
            className={`flex-1 flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              deliveryTerms === "PICKUP" ? "border-primary bg-primary/5" : "border-input hover:border-primary/30"
            }`}
          >
            <input
              type="radio"
              name="deliveryTerms"
              value="PICKUP"
              checked={deliveryTerms === "PICKUP"}
              onChange={() => { setDeliveryTerms("PICKUP"); setShippingAmount(0); }}
              className="sr-only"
            />
            <Building2 className={`h-5 w-5 ${deliveryTerms === "PICKUP" ? "text-primary" : "text-muted-foreground"}`} />
            <div>
              <p className="font-medium text-sm">Pickup from Facility</p>
              <p className="text-xs text-muted-foreground">Customer picks up from our location</p>
            </div>
          </label>
          <label
            className={`flex-1 flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              deliveryTerms === "DELIVERY" ? "border-primary bg-primary/5" : "border-input hover:border-primary/30"
            }`}
          >
            <input
              type="radio"
              name="deliveryTerms"
              value="DELIVERY"
              checked={deliveryTerms === "DELIVERY"}
              onChange={() => setDeliveryTerms("DELIVERY")}
              className="sr-only"
            />
            <Truck className={`h-5 w-5 ${deliveryTerms === "DELIVERY" ? "text-primary" : "text-muted-foreground"}`} />
            <div>
              <p className="font-medium text-sm">Delivery at Client Location</p>
              <p className="text-xs text-muted-foreground">We deliver to the customer</p>
            </div>
          </label>
        </div>

        {customerBillingAddress && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs font-medium text-muted-foreground mb-1">Billing Address (from customer profile)</p>
            <p className="text-sm">
              {customerBillingAddress.addressLine1}
              {customerBillingAddress.addressLine2 ? `, ${customerBillingAddress.addressLine2}` : ""}
              {customerBillingAddress.city ? `, ${customerBillingAddress.city}` : ""}
              {customerBillingAddress.state ? `, ${customerBillingAddress.state}` : ""}
              {customerBillingAddress.pincode ? ` - ${customerBillingAddress.pincode}` : ""}
            </p>
          </div>
        )}

        {deliveryTerms === "DELIVERY" && (
          <div className="space-y-3 pt-2 border-t">
            <h3 className="text-sm font-medium">Ship-to Address</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1 text-muted-foreground">Address Line 1 *</label>
                <input
                  type="text"
                  value={shipTo.line1}
                  onChange={(e) => setShipTo({ ...shipTo, line1: e.target.value })}
                  placeholder="Street address, building"
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1 text-muted-foreground">Address Line 2</label>
                <input
                  type="text"
                  value={shipTo.line2}
                  onChange={(e) => setShipTo({ ...shipTo, line2: e.target.value })}
                  placeholder="Area, landmark"
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">City</label>
                <input
                  type="text"
                  value={shipTo.city}
                  onChange={(e) => setShipTo({ ...shipTo, city: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">State</label>
                <input
                  type="text"
                  value={shipTo.state}
                  onChange={(e) => setShipTo({ ...shipTo, state: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">Pincode</label>
                <input
                  type="text"
                  value={shipTo.pincode}
                  onChange={(e) => setShipTo({ ...shipTo, pincode: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">Logistics Cost (&#x20B9;)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shippingAmount}
                  onChange={(e) => setShippingAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="bg-card rounded-xl border shadow-sm p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Line Items</h2>
          <button type="button" onClick={addItem} className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium">
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="border rounded-lg p-3 sm:p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">Product</label>
                  <select
                    value={item.productId}
                    onChange={(e) => updateItem(idx, "productId", e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-medium mb-1 text-muted-foreground">Tax %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={item.taxRate}
                      onChange={(e) => updateItem(idx, "taxRate", parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)} className="ml-2 p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div>
                  <label className="text-xs text-muted-foreground">Discount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.discount}
                    onChange={(e) => updateItem(idx, "discount", parseFloat(e.target.value) || 0)}
                    className="w-24 px-2 py-1 border border-input rounded bg-background text-sm ml-1"
                  />
                </div>
                <div className="font-medium">
                  {formatCurrency(
                    new Decimal(item.quantity || 0)
                      .mul(new Decimal(item.unitPrice || 0))
                      .minus(new Decimal(item.discount || 0))
                      .mul(new Decimal(1).plus(new Decimal(item.taxRate || 0).div(100)))
                      .toNumber()
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes & Totals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border shadow-sm p-4 sm:p-6 space-y-4">
          <h2 className="font-semibold">Additional Details</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Gift Note</label>
            <textarea
              value={giftNote}
              onChange={(e) => setGiftNote(e.target.value)}
              rows={2}
              placeholder="Gift message..."
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Internal Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Notes..."
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="bg-card rounded-xl border shadow-sm p-4 sm:p-6 space-y-4">
          <h2 className="font-semibold">Totals</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal.toNumber())}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Discount</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                className="w-28 px-2 py-1 border border-input rounded bg-background text-sm text-right"
              />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatCurrency(totalTax.toNumber())}</span>
            </div>
            {deliveryTerms === "DELIVERY" && shippingAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Logistics Cost</span>
                <span>{formatCurrency(shippingAmount)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between font-semibold text-base">
              <span>Grand Total</span>
              <span>{formatCurrency(grandTotal.toNumber())}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Creating..." : "Create Order"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2, Gift, X } from "lucide-react";
import Decimal from "decimal.js";

interface Customer {
  id: string;
  name: string;
  company: string | null;
  type: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  sellingPrice: string;
  taxRate: string;
  hsnCode: string | null;
}

interface QuoteItem {
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
}

interface Recipient {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  giftNote: string;
  deliveryDate: string;
  customization: string;
}

interface InitialData {
  id: string;
  customerId: string;
  validUntil: string;
  deliveryDate?: string;
  isGifting: boolean;
  customization?: string;
  notes?: string;
  termsConditions?: string;
  discountAmount: number;
  shippingAmount: number;
  items: QuoteItem[];
  recipients: Recipient[];
}

export default function QuotationForm({
  customers,
  products,
  initialData,
  onSubmit,
  submitLabel,
}: {
  customers: Customer[];
  products: Product[];
  initialData?: InitialData;
  onSubmit: (data: Record<string, unknown>) => Promise<{ error?: string; success?: boolean; id?: string }>;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [customerId, setCustomerId] = useState(initialData?.customerId || "");
  const [validUntil, setValidUntil] = useState(
    initialData?.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [deliveryDate, setDeliveryDate] = useState(initialData?.deliveryDate || "");
  const [isGifting, setIsGifting] = useState(initialData?.isGifting || false);
  const [customization, setCustomization] = useState(initialData?.customization || "");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [termsConditions, setTermsConditions] = useState(initialData?.termsConditions || "");
  const [discountAmount, setDiscountAmount] = useState(initialData?.discountAmount || 0);
  const [shippingAmount, setShippingAmount] = useState(initialData?.shippingAmount || 0);

  const [items, setItems] = useState<QuoteItem[]>(
    initialData?.items?.length
      ? initialData.items
      : [{ productId: "", description: "", quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 }]
  );

  const [recipients, setRecipients] = useState<Recipient[]>(initialData?.recipients || []);

  function addItem() {
    setItems([...items, { productId: "", description: "", quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 }]);
  }

  function removeItem(idx: number) {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof QuoteItem, value: string | number) {
    const updated = [...items];
    (updated[idx] as unknown as Record<string, unknown>)[field] = value;
    if (field === "productId") {
      const product = products.find((p) => p.id === value);
      if (product) {
        updated[idx].unitPrice = parseFloat(product.sellingPrice) || 0;
        updated[idx].taxRate = parseFloat(product.taxRate) || 0;
        updated[idx].description = product.name;
      }
    }
    setItems(updated);
  }

  function addRecipient() {
    setRecipients([
      ...recipients,
      { name: "", phone: "", email: "", address: "", city: "", state: "", pincode: "", giftNote: "", deliveryDate: "", customization: "" },
    ]);
  }

  function removeRecipient(idx: number) {
    setRecipients(recipients.filter((_, i) => i !== idx));
  }

  function updateRecipient(idx: number, field: keyof Recipient, value: string) {
    const updated = [...recipients];
    updated[idx] = { ...updated[idx], [field]: value };
    setRecipients(updated);
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
    if (!validUntil) { setError("Please set a validity date"); return; }
    if (items.some((i) => !i.productId || i.quantity <= 0)) {
      setError("All items must have a product and valid quantity");
      return;
    }

    setError("");
    startTransition(async () => {
      const result = await onSubmit({
        customerId,
        validUntil,
        deliveryDate: deliveryDate || undefined,
        isGifting,
        customization: customization || undefined,
        notes: notes || undefined,
        termsConditions: termsConditions || undefined,
        discountAmount,
        shippingAmount,
        items: items.map((i) => ({
          productId: i.productId,
          description: i.description || undefined,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount,
          taxRate: i.taxRate,
        })),
        recipients: isGifting ? recipients.filter((r) => r.name && r.address) : undefined,
      });

      if (result.error) {
        setError(String(result.error));
      } else if (result.success) {
        router.push(`/quotations/${result.id || initialData?.id}`);
      }
    });
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {/* Customer & Dates */}
      <div className="bg-card rounded-xl border shadow-sm p-4 sm:p-6 space-y-4">
        <h2 className="font-semibold">Quote Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <label className="block text-sm font-medium mb-1">Valid Until *</label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Delivery Date</label>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setIsGifting(!isGifting);
              if (!isGifting && recipients.length === 0) addRecipient();
            }}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isGifting ? "bg-gold/20 text-gold-deep border border-gold" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <Gift className="h-4 w-4" />
            Corporate Gifting Order
          </button>
        </div>
      </div>

      {/* Items */}
      <div className="bg-card rounded-xl border shadow-sm p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Line Items</h2>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium"
          >
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
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
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
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">Unit Price</label>
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
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="ml-2 p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
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
                <div className="ml-auto font-medium">
                  Line Total:{" "}
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

      {/* Recipients (Gifting) */}
      {isGifting && (
        <div className="bg-card rounded-xl border shadow-sm p-4 sm:p-6 space-y-4 border-gold/30">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Gift className="h-5 w-5 text-gold-deep" />
              Gift Recipients
            </h2>
            <button
              type="button"
              onClick={addRecipient}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium"
            >
              <Plus className="h-4 w-4" />
              Add Recipient
            </button>
          </div>

          {recipients.map((r, idx) => (
            <div key={idx} className="border rounded-lg p-3 sm:p-4 space-y-3 relative">
              <button
                type="button"
                onClick={() => removeRecipient(idx)}
                className="absolute top-2 right-2 p-1 text-red-400 hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="text-xs font-medium text-muted-foreground mb-1">Recipient {idx + 1}</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  placeholder="Name *"
                  value={r.name}
                  onChange={(e) => updateRecipient(idx, "name", e.target.value)}
                  className="px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  placeholder="Phone"
                  value={r.phone}
                  onChange={(e) => updateRecipient(idx, "phone", e.target.value)}
                  className="px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  placeholder="Email"
                  value={r.email}
                  onChange={(e) => updateRecipient(idx, "email", e.target.value)}
                  className="px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <input
                placeholder="Address *"
                value={r.address}
                onChange={(e) => updateRecipient(idx, "address", e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <input
                  placeholder="City"
                  value={r.city}
                  onChange={(e) => updateRecipient(idx, "city", e.target.value)}
                  className="px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  placeholder="State"
                  value={r.state}
                  onChange={(e) => updateRecipient(idx, "state", e.target.value)}
                  className="px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  placeholder="Pincode"
                  value={r.pincode}
                  onChange={(e) => updateRecipient(idx, "pincode", e.target.value)}
                  className="px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  type="date"
                  value={r.deliveryDate}
                  onChange={(e) => updateRecipient(idx, "deliveryDate", e.target.value)}
                  className="px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  title="Delivery date"
                />
              </div>
              <textarea
                placeholder="Gift note for this recipient..."
                value={r.giftNote}
                onChange={(e) => updateRecipient(idx, "giftNote", e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          ))}
        </div>
      )}

      {/* Additional Details & Totals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border shadow-sm p-4 sm:p-6 space-y-4">
          <h2 className="font-semibold">Additional Details</h2>
          {isGifting && (
            <div>
              <label className="block text-sm font-medium mb-1">Customization Details</label>
              <textarea
                value={customization}
                onChange={(e) => setCustomization(e.target.value)}
                rows={2}
                placeholder="Branding, packaging preferences, personalized messages..."
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Internal notes..."
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Terms & Conditions</label>
            <textarea
              value={termsConditions}
              onChange={(e) => setTermsConditions(e.target.value)}
              rows={3}
              placeholder="Payment terms, delivery conditions..."
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
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Shipping</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={shippingAmount}
                onChange={(e) => setShippingAmount(parseFloat(e.target.value) || 0)}
                className="w-28 px-2 py-1 border border-input rounded bg-background text-sm text-right"
              />
            </div>
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
            {isPending ? "Saving..." : (submitLabel || "Create Quotation")}
          </button>
        </div>
      </div>
    </div>
  );
}

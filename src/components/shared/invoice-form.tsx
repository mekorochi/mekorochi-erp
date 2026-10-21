"use client";

import { useState, useCallback, useActionState } from "react";
import { useRouter } from "next/navigation";
import { createInvoiceAction } from "@/app/(dashboard)/invoices/actions";
import { formatCurrency, numberToWords } from "@/lib/utils";
import { Plus, Trash2, Calculator } from "lucide-react";
import Decimal from "decimal.js";

interface Customer {
  id: string;
  name: string;
  company?: string | null;
  gstin?: string | null;
  addresses: Array<{
    id: string;
    label: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    pincode: string;
    isBilling: boolean;
    isShipping: boolean;
  }>;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  sellingPrice: { toString(): string } | null;
  hsnCode: string | null;
  taxRate: { toString(): string } | null;
}

interface InvoiceLineItem {
  productId: string;
  description: string;
  hsnCode: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  taxRate: string;
  taxableAmount: string;
  cgst: string;
  sgst: string;
  igst: string;
  total: string;
}

const emptyItem: InvoiceLineItem = {
  productId: "",
  description: "",
  hsnCode: "",
  quantity: "1",
  unitPrice: "0",
  discount: "0",
  taxRate: "0",
  taxableAmount: "0",
  cgst: "0",
  sgst: "0",
  igst: "0",
  total: "0",
};

export default function InvoiceForm({
  customers,
  products,
  companyState,
  initialData,
}: {
  customers: Customer[];
  products: Product[];
  companyState: string;
  initialData?: any;
}) {
  const router = useRouter();
  const [type, setType] = useState(initialData?.type || "TAX_INVOICE");
  const [customerId, setCustomerId] = useState(initialData?.customerId || "");
  const [dueDate, setDueDate] = useState(initialData?.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]);
  const [placeOfSupply, setPlaceOfSupply] = useState(initialData?.placeOfSupply || "");
  const [isInterState, setIsInterState] = useState(initialData?.isInterState || false);
  const [items, setItems] = useState<InvoiceLineItem[]>(initialData?.items || [{ ...emptyItem }]);
  const [shippingAmount, setShippingAmount] = useState(initialData?.shippingAmount || "0");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [terms, setTerms] = useState(initialData?.termsConditions || "");

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const billingAddress = selectedCustomer?.addresses.find((a) => a.isBilling);
  const shippingAddress = selectedCustomer?.addresses.find((a) => a.isShipping);

  const recalculateItem = useCallback(
    (item: InvoiceLineItem): InvoiceLineItem => {
      const qty = new Decimal(item.quantity || 0);
      const price = new Decimal(item.unitPrice || 0);
      const disc = new Decimal(item.discount || 0);
      const rate = new Decimal(item.taxRate || 0);

      const lineTotal = qty.mul(price);
      const taxableAmount = lineTotal.minus(disc);
      const taxAmt = taxableAmount.mul(rate).div(100);

      let cgst = "0.00";
      let sgst = "0.00";
      let igst = "0.00";

      if (isInterState) {
        igst = taxAmt.toDecimalPlaces(2).toFixed(2);
      } else {
        const half = taxAmt.div(2).toDecimalPlaces(2);
        cgst = half.toFixed(2);
        sgst = taxAmt.minus(half).toDecimalPlaces(2).toFixed(2);
      }

      const total = taxableAmount.plus(taxAmt).toDecimalPlaces(2);

      return {
        ...item,
        taxableAmount: taxableAmount.toDecimalPlaces(2).toFixed(2),
        cgst,
        sgst,
        igst,
        total: total.toFixed(2),
      };
    },
    [isInterState]
  );

  const updateItem = (index: number, field: string, value: string) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      if (field === "productId" && value) {
        const prod = products.find((p) => p.id === value);
        if (prod) {
          updated[index].description = prod.name;
          updated[index].hsnCode = prod.hsnCode || "";
          updated[index].unitPrice = prod.sellingPrice?.toString() || "0";
          updated[index].taxRate = prod.taxRate?.toString() || "0";
        }
      }

      updated[index] = recalculateItem(updated[index]);
      return updated;
    });
  };

  const addItem = () => setItems((prev) => [...prev, { ...emptyItem }]);
  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const recalcItems = items.map(recalculateItem);

  const subtotal = recalcItems.reduce((s, i) => s.plus(new Decimal(i.taxableAmount || 0)), new Decimal(0));
  const totalCgst = recalcItems.reduce((s, i) => s.plus(new Decimal(i.cgst || 0)), new Decimal(0));
  const totalSgst = recalcItems.reduce((s, i) => s.plus(new Decimal(i.sgst || 0)), new Decimal(0));
  const totalIgst = recalcItems.reduce((s, i) => s.plus(new Decimal(i.igst || 0)), new Decimal(0));
  const shipping = new Decimal(shippingAmount || 0);
  const totalTax = totalCgst.plus(totalSgst).plus(totalIgst);
  const grandTotal = subtotal.plus(totalTax).plus(shipping);
  const roundOff = grandTotal.round().minus(grandTotal);
  const finalTotal = grandTotal.plus(roundOff);

  const handleSubmit = async (_prev: unknown, formData: FormData) => {
    const data = {
      type,
      customerId,
      dueDate,
      placeOfSupply: placeOfSupply || billingAddress?.state || "",
      isInterState,
      shippingAmount: parseFloat(shippingAmount || "0"),
      notes,
      termsConditions: terms,
      billingAddress: billingAddress
        ? { line1: billingAddress.addressLine1, line2: billingAddress.addressLine2, city: billingAddress.city, state: billingAddress.state, pincode: billingAddress.pincode }
        : undefined,
      shippingAddress: shippingAddress
        ? { line1: shippingAddress.addressLine1, line2: shippingAddress.addressLine2, city: shippingAddress.city, state: shippingAddress.state, pincode: shippingAddress.pincode }
        : undefined,
      items: items.map((item) => ({
        productId: item.productId || undefined,
        description: item.description,
        hsnCode: item.hsnCode || undefined,
        quantity: parseFloat(item.quantity || "0"),
        unitPrice: parseFloat(item.unitPrice || "0"),
        discount: parseFloat(item.discount || "0"),
        taxRate: parseFloat(item.taxRate || "0"),
      })),
    };

    const fd = new FormData();
    fd.set("data", JSON.stringify(data));
    const result = await createInvoiceAction(null, fd);
    if (result.success && result.invoiceId) {
      router.push(`/invoices/${result.invoiceId}`);
    }
    return result;
  };

  const [state, formAction, isPending] = useActionState(handleSubmit, null);

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      {/* Header Fields */}
      <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
              <option value="TAX_INVOICE">Tax Invoice</option>
              <option value="PROFORMA">Proforma Invoice</option>
              <option value="CREDIT_NOTE">Credit Note</option>
              <option value="DEBIT_NOTE">Debit Note</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Customer *</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.company ? ` (${c.company})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Due Date *</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Place of Supply</label>
            <input
              type="text"
              value={placeOfSupply || billingAddress?.state || ""}
              onChange={(e) => setPlaceOfSupply(e.target.value)}
              placeholder="e.g. Gujarat"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="interState"
            checked={isInterState}
            onChange={(e) => setIsInterState(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="interState" className="text-sm">Inter-state supply (IGST instead of CGST+SGST)</label>
        </div>

        {selectedCustomer?.gstin && (
          <p className="text-sm text-muted-foreground">Customer GSTIN: <span className="font-mono">{selectedCustomer.gstin}</span></p>
        )}
      </div>

      {/* Line Items */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="p-4 sm:p-6 border-b">
          <h3 className="font-semibold">Invoice Items</h3>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {items.map((item, idx) => (
            <div key={idx} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start justify-between">
                <span className="text-xs font-medium text-muted-foreground">Item {idx + 1}</span>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(idx)} className="text-destructive hover:text-destructive/80 p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">Product</label>
                  <select
                    value={item.productId}
                    onChange={(e) => updateItem(idx, "productId", e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select or type description</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">Description *</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(idx, "description", e.target.value)}
                    required
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">HSN</label>
                  <input type="text" value={item.hsnCode} onChange={(e) => updateItem(idx, "hsnCode", e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Qty *</label>
                  <input type="number" step="0.001" min="0.001" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} required className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Price *</label>
                  <input type="number" step="0.01" min="0" value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", e.target.value)} required className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Discount</label>
                  <input type="number" step="0.01" min="0" value={item.discount} onChange={(e) => updateItem(idx, "discount", e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Tax %</label>
                  <input type="number" step="0.01" min="0" max="100" value={item.taxRate} onChange={(e) => updateItem(idx, "taxRate", e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Total</label>
                  <p className="px-3 py-2 text-sm font-medium">{formatCurrency(recalcItems[idx]?.total || "0")}</p>
                </div>
              </div>

              {/* Tax breakdown for this item */}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>Taxable: {formatCurrency(recalcItems[idx]?.taxableAmount || "0")}</span>
                {!isInterState ? (
                  <>
                    <span>CGST: {formatCurrency(recalcItems[idx]?.cgst || "0")}</span>
                    <span>SGST: {formatCurrency(recalcItems[idx]?.sgst || "0")}</span>
                  </>
                ) : (
                  <span>IGST: {formatCurrency(recalcItems[idx]?.igst || "0")}</span>
                )}
              </div>
            </div>
          ))}

          <button type="button" onClick={addItem} className="inline-flex items-center gap-2 rounded-lg border border-dashed px-4 py-2.5 text-sm hover:bg-muted transition-colors">
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Additional notes..." />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Terms & Conditions</label>
            <textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={3} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Payment terms, late fees, etc." />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          {!isInterState ? (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">CGST</span>
                <span>{formatCurrency(totalCgst)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">SGST</span>
                <span>{formatCurrency(totalSgst)}</span>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">IGST</span>
              <span>{formatCurrency(totalIgst)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={shippingAmount}
              onChange={(e) => setShippingAmount(e.target.value)}
              className="w-24 text-right rounded-lg border bg-background px-2 py-1 text-sm"
            />
          </div>
          {!roundOff.isZero() && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Round Off</span>
              <span>{roundOff.gt(0) ? "+" : ""}{roundOff.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t pt-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold">{formatCurrency(finalTotal)}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground italic pt-1">
            {numberToWords(finalTotal.toNumber())}
          </p>
        </div>
      </div>

      {/* Submit */}
      <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
        <button type="button" onClick={() => router.back()} className="rounded-lg border px-6 py-2.5 text-sm font-medium hover:bg-muted">
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || !customerId || items.every((i) => !i.description)}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Creating..." : "Create Invoice"}
        </button>
      </div>
    </form>
  );
}

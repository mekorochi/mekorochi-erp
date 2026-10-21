"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCustomer, updateCustomer } from "@/app/(dashboard)/customers/actions";
import { Loader2 } from "lucide-react";

interface CustomerFormProps {
  customer?: {
    id: string;
    name: string;
    company?: string | null;
    type: string;
    email?: string | null;
    phone?: string | null;
    gstin?: string | null;
    pan?: string | null;
    channel?: string | null;
    segment?: string | null;
    creditLimit?: string | number | null;
    creditDays?: number | null;
    notes?: string | null;
  };
}

const CUSTOMER_TYPES = [
  { value: "INDIVIDUAL", label: "Individual" },
  { value: "CORPORATE", label: "Corporate" },
  { value: "WHOLESALE", label: "Wholesale" },
  { value: "RETAIL_PARTNER", label: "Retail Partner" },
];

const CHANNELS = ["Direct", "Website", "Instagram", "WhatsApp", "Amazon", "Shopify", "Referral", "Other"];
const SEGMENTS = ["Regular", "Premium", "VIP", "Corporate", "Wholesale", "One-time"];

export function CustomerForm({ customer }: CustomerFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {
      name: formData.get("name"),
      company: formData.get("company") || undefined,
      type: formData.get("type"),
      email: formData.get("email") || undefined,
      phone: formData.get("phone") || undefined,
      gstin: formData.get("gstin") || undefined,
      pan: formData.get("pan") || undefined,
      channel: formData.get("channel") || undefined,
      segment: formData.get("segment") || undefined,
      creditLimit: formData.get("creditLimit") ? Number(formData.get("creditLimit")) : undefined,
      creditDays: formData.get("creditDays") ? Number(formData.get("creditDays")) : 0,
      notes: formData.get("notes") || undefined,
    };

    const result = customer
      ? await updateCustomer(customer.id, data)
      : await createCustomer(data);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/customers");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Customer Name *</Label>
            <Input id="name" name="name" defaultValue={customer?.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input id="company" name="company" defaultValue={customer?.company || ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Customer Type</Label>
            <select
              id="type"
              name="type"
              defaultValue={customer?.type || "INDIVIDUAL"}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {CUSTOMER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={customer?.email || ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" type="tel" defaultValue={customer?.phone || ""} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tax & Business Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="gstin">GSTIN</Label>
            <Input id="gstin" name="gstin" placeholder="e.g. 24XXXXX1234X1Z5" defaultValue={customer?.gstin || ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pan">PAN</Label>
            <Input id="pan" name="pan" defaultValue={customer?.pan || ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="channel">Channel</Label>
            <select
              id="channel"
              name="channel"
              defaultValue={customer?.channel || ""}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select channel</option>
              {CHANNELS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="segment">Segment</Label>
            <select
              id="segment"
              name="segment"
              defaultValue={customer?.segment || ""}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select segment</option>
              {SEGMENTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="creditLimit">Credit Limit (₹)</Label>
            <Input
              id="creditLimit"
              name="creditLimit"
              type="number"
              step="0.01"
              min="0"
              defaultValue={customer?.creditLimit ? String(customer.creditLimit) : ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="creditDays">Credit Days</Label>
            <Input
              id="creditDays"
              name="creditDays"
              type="number"
              min="0"
              defaultValue={customer?.creditDays ?? 0}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={customer?.notes || ""}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {customer ? "Update Customer" : "Create Customer"}
        </Button>
      </div>
    </form>
  );
}

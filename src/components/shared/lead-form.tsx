"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { createLead, updateLead } from "@/app/(dashboard)/leads/actions";
import { Loader2 } from "lucide-react";

interface LeadFormProps {
  lead?: {
    id: string;
    name: string;
    company?: string | null;
    role?: string | null;
    email?: string | null;
    phone?: string | null;
    source: string;
    sourceDetail?: string | null;
    interest?: string | null;
    estimatedValue?: string | number | null;
    giftingOccasion?: string | null;
    estimatedQty?: number | null;
    desiredDate?: string | null;
    assignedToId?: string | null;
    consent: boolean;
    notes?: string | null;
  };
  users: Array<{ id: string; name: string }>;
}

const LEAD_SOURCES = [
  { value: "MANUAL", label: "Manual" },
  { value: "WEBSITE", label: "Website" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "META_ADS", label: "Meta Ads" },
  { value: "REFERRAL", label: "Referral" },
  { value: "CORPORATE", label: "Corporate" },
  { value: "NETWORKING", label: "Networking" },
  { value: "AMAZON", label: "Amazon" },
  { value: "OTHER", label: "Other" },
];

export function LeadForm({ lead, users }: LeadFormProps) {
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
      role: formData.get("role") || undefined,
      email: formData.get("email") || undefined,
      phone: formData.get("phone") || undefined,
      source: formData.get("source"),
      sourceDetail: formData.get("sourceDetail") || undefined,
      interest: formData.get("interest") || undefined,
      estimatedValue: formData.get("estimatedValue") ? Number(formData.get("estimatedValue")) : undefined,
      giftingOccasion: formData.get("giftingOccasion") || undefined,
      estimatedQty: formData.get("estimatedQty") ? Number(formData.get("estimatedQty")) : undefined,
      desiredDate: formData.get("desiredDate") || undefined,
      assignedToId: formData.get("assignedToId") || undefined,
      consent: formData.get("consent") === "on",
      notes: formData.get("notes") || undefined,
    };

    const result = lead
      ? await updateLead(lead.id, data)
      : await createLead(data);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/leads");
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
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" defaultValue={lead?.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input id="company" name="company" defaultValue={lead?.company || ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role / Designation</Label>
            <Input id="role" name="role" defaultValue={lead?.role || ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={lead?.email || ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" type="tel" defaultValue={lead?.phone || ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="source">Source *</Label>
            <select
              id="source"
              name="source"
              defaultValue={lead?.source || "MANUAL"}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              {LEAD_SOURCES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="sourceDetail">Source Detail</Label>
            <Input
              id="sourceDetail"
              name="sourceDetail"
              placeholder="e.g. campaign name, referral contact"
              defaultValue={lead?.sourceDetail || ""}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Interest & Requirements</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="interest">Interest / Product Interest</Label>
            <Input
              id="interest"
              name="interest"
              placeholder="e.g. Corporate gifting, bonbons, bulk order"
              defaultValue={lead?.interest || ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="estimatedValue">Estimated Value (₹)</Label>
            <Input
              id="estimatedValue"
              name="estimatedValue"
              type="number"
              step="0.01"
              min="0"
              defaultValue={lead?.estimatedValue ? String(lead.estimatedValue) : ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="giftingOccasion">Gifting Occasion</Label>
            <Input
              id="giftingOccasion"
              name="giftingOccasion"
              placeholder="e.g. Diwali, Christmas, Wedding"
              defaultValue={lead?.giftingOccasion || ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="estimatedQty">Estimated Quantity</Label>
            <Input
              id="estimatedQty"
              name="estimatedQty"
              type="number"
              min="0"
              defaultValue={lead?.estimatedQty ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desiredDate">Desired Delivery Date</Label>
            <Input
              id="desiredDate"
              name="desiredDate"
              type="date"
              defaultValue={lead?.desiredDate ? new Date(lead.desiredDate).toISOString().split("T")[0] : ""}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assignment & Notes</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="assignedToId">Assign To</Label>
            <select
              id="assignedToId"
              name="assignedToId"
              defaultValue={lead?.assignedToId || ""}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2 flex items-end pb-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="consent"
                name="consent"
                defaultChecked={lead?.consent ?? false}
              />
              <Label htmlFor="consent" className="text-sm font-normal">
                Contact consent given
              </Label>
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Any additional notes..."
              defaultValue={lead?.notes || ""}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {lead ? "Update Lead" : "Create Lead"}
        </Button>
      </div>
    </form>
  );
}

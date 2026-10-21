"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Receipt } from "lucide-react";
import Link from "next/link";
import { updateTaxSettings } from "../actions";

const months = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export default function TaxSettingsPage() {
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings/company")
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setSaved(false);
    const formData = new FormData(e.currentTarget);
    const result = await updateTaxSettings(formData);
    setPending(false);
    if (result?.success) setSaved(true);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold font-[family-name:var(--font-playfair)]">
            Tax &amp; Invoicing
          </h1>
          <p className="text-muted-foreground mt-1">
            Tax rates, numbering prefixes, and default terms.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {saved && (
          <div className="bg-green-50 text-green-800 text-sm p-3 rounded-lg">
            Settings saved successfully.
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Financial Year &amp; Tax
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="financialYearStart">Financial Year Start Month</Label>
                <select
                  id="financialYearStart"
                  name="financialYearStart"
                  defaultValue={String(settings.financialYearStart || 4)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultTaxRate">Default GST Rate (%)</Label>
                <Input
                  id="defaultTaxRate"
                  name="defaultTaxRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  defaultValue={String(settings.defaultTaxRate || "")}
                  placeholder="e.g. 18"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Document Numbering Prefixes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                ["invoicePrefix", "Invoice", "INV"],
                ["orderPrefix", "Order", "ORD"],
                ["quotePrefix", "Quotation", "QUO"],
                ["poPrefix", "Purchase Order", "PO"],
                ["creditNotePrefix", "Credit Note", "CN"],
                ["debitNotePrefix", "Debit Note", "DN"],
              ].map(([name, label, placeholder]) => (
                <div key={name} className="space-y-2">
                  <Label htmlFor={name}>{label}</Label>
                  <Input
                    id={name}
                    name={name}
                    defaultValue={String(settings[name] || "")}
                    placeholder={placeholder}
                    maxLength={10}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Default Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="termsAndConditions">Terms &amp; Conditions</Label>
              <Textarea
                id="termsAndConditions"
                name="termsAndConditions"
                defaultValue={String(settings.termsAndConditions || "")}
                rows={4}
                placeholder="Default terms printed on invoices and quotations..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceNotes">Invoice Footer Notes</Label>
              <Textarea
                id="invoiceNotes"
                name="invoiceNotes"
                defaultValue={String(settings.invoiceNotes || "")}
                rows={3}
                placeholder="Additional notes to appear on invoices..."
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={pending}>
          <Save className="h-4 w-4 mr-2" />
          {pending ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}

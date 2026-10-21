"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, Building2, Landmark, CreditCard, Factory, PenTool, Upload, X } from "lucide-react";
import Link from "next/link";
import { updateCompanySettings } from "../actions";

export default function CompanySettingsPage() {
  const [settings, setSettings] = useState<Record<string, string | null>>({});
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/settings/company")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
        if (data.signatureUrl) setSignatureUrl(data.signatureUrl);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setSaved(false);
    const formData = new FormData(e.currentTarget);
    formData.set("signatureUrl", signatureUrl || "");
    const result = await updateCompanySettings(formData);
    setPending(false);
    if (result?.success) setSaved(true);
  };

  const field = (name: string, label: string, placeholder?: string) => (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        defaultValue={settings[name] || ""}
        placeholder={placeholder}
      />
    </div>
  );

  if (!loaded) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center text-muted-foreground">
        Loading settings...
      </div>
    );
  }

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
            Company Profile
          </h1>
          <p className="text-muted-foreground mt-1">
            Business details, address, and banking information.
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
              <Building2 className="h-4 w-4" /> Business Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field("companyName", "Company Name *", "MEKOROCHI")}
              {field("legalName", "Legal Entity Name", "Jay Veer Alliance Pvt Ltd")}
            </div>
            {field("tagline", "Tagline", "Healthy Bean to Bar")}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field("email", "Email")}
              {field("phone", "Phone")}
            </div>
            {field("website", "Website")}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Landmark className="h-4 w-4" /> Registered Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {field("addressLine1", "Address Line 1")}
            {field("addressLine2", "Address Line 2")}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {field("city", "City", "Ahmedabad")}
              {field("state", "State", "Gujarat")}
              {field("pincode", "Pincode")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Factory className="h-4 w-4" /> Manufacturing Unit Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {field("mfgAddressLine1", "Address Line 1")}
            {field("mfgAddressLine2", "Address Line 2")}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {field("mfgCity", "City")}
              {field("mfgState", "State")}
              {field("mfgPincode", "Pincode")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Legal / Tax Identifiers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field("gstin", "GSTIN")}
              {field("pan", "PAN")}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field("fssaiNumber", "FSSAI License Number")}
              {field("cin", "CIN")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Bank Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field("bankName", "Bank Name")}
              {field("bankBranch", "Branch")}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field("bankAccountName", "Account Name")}
              {field("bankAccountNumber", "Account Number")}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field("bankIfsc", "IFSC Code")}
              {field("upiId", "UPI ID")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PenTool className="h-4 w-4" /> Authorized Signature
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a signature image to display on invoices. Recommended: transparent PNG, max 2MB.
            </p>
            <input type="hidden" name="signatureUrl" value={signatureUrl || ""} />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploading(true);
                try {
                  const fd = new FormData();
                  fd.append("file", file);
                  const res = await fetch("/api/upload", { method: "POST", body: fd });
                  const json = await res.json();
                  if (json.url) {
                    setSignatureUrl(json.url);
                    fetch("/api/settings/signature", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: json.url }) });
                  } else {
                    alert(json.error || "Upload failed");
                  }
                } catch {
                  alert("Upload failed");
                } finally {
                  setUploading(false);
                }
              }}
            />
            {signatureUrl ? (
              <div className="flex items-start gap-4">
                <div className="border rounded-lg p-3 bg-white">
                  <Image src={signatureUrl} alt="Signature" width={200} height={80} className="object-contain max-h-20" />
                </div>
                <div className="flex flex-col gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    Replace
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => { setSignatureUrl(null); fetch("/api/settings/signature", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: null }) }); }}>
                    <X className="h-3.5 w-3.5 mr-1.5" />
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? "Uploading..." : "Upload Signature Image"}
              </Button>
            )}
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

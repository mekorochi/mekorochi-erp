"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, ShoppingBag, MessageCircle, Mail, FileSpreadsheet, Save, ExternalLink } from "lucide-react";
import Link from "next/link";
import { updateSmtpSettings, updateIntegration } from "../actions";

interface IntegrationState {
  shopify: { isActive: boolean; storeUrl: string; apiKey: string };
  smtp: { host: string; port: string; user: string; password: string; fromEmail: string; fromName: string };
}

export default function IntegrationsPage() {
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/company")
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => {});
  }, []);

  const handleSmtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving("smtp");
    setSaved(null);
    const formData = new FormData(e.currentTarget);
    const result = await updateSmtpSettings(formData);
    setSaving(null);
    if (result?.success) setSaved("smtp");
  };

  const handleShopify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving("shopify");
    setSaved(null);
    const formData = new FormData(e.currentTarget);
    formData.set("name", "shopify");
    formData.set("type", "ecommerce");
    const config = JSON.stringify({
      storeUrl: formData.get("storeUrl"),
      apiKey: formData.get("apiKey"),
    });
    formData.set("config", config);
    formData.set("isActive", formData.get("shopifyActive") === "on" ? "true" : "false");
    const result = await updateIntegration(formData);
    setSaving(null);
    if (result?.success) setSaved("shopify");
  };

  const smtpConfigured = !!(settings.smtpHost && settings.smtpUser);

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
            Integrations
          </h1>
          <p className="text-muted-foreground mt-1">
            Connect external services. All integrations are optional.
          </p>
        </div>
      </div>

      {/* SMTP / Email */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2.5">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base">Email (SMTP)</CardTitle>
                <CardDescription className="text-sm">
                  Send invoices and notifications via email.
                </CardDescription>
              </div>
            </div>
            <Badge variant={smtpConfigured ? "success" : "outline"}>
              {smtpConfigured ? "Configured" : "Not Configured"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {saved === "smtp" && (
            <div className="bg-green-50 text-green-800 text-sm p-2 rounded mb-4">
              SMTP settings saved.
            </div>
          )}
          <form onSubmit={handleSmtp} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtpHost">SMTP Host</Label>
                <Input
                  id="smtpHost"
                  name="smtpHost"
                  defaultValue={String(settings.smtpHost || "")}
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPort">Port</Label>
                <Input
                  id="smtpPort"
                  name="smtpPort"
                  type="number"
                  defaultValue={String(settings.smtpPort || "587")}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtpUser">Username</Label>
                <Input
                  id="smtpUser"
                  name="smtpUser"
                  defaultValue={String(settings.smtpUser || "")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPassword">Password</Label>
                <Input
                  id="smtpPassword"
                  name="smtpPassword"
                  type="password"
                  defaultValue={String(settings.smtpPassword || "")}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtpFromEmail">From Email</Label>
                <Input
                  id="smtpFromEmail"
                  name="smtpFromEmail"
                  defaultValue={String(settings.smtpFromEmail || "")}
                  placeholder="hello@mekorochi.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpFromName">From Name</Label>
                <Input
                  id="smtpFromName"
                  name="smtpFromName"
                  defaultValue={String(settings.smtpFromName || "MEKOROCHI")}
                />
              </div>
            </div>
            <Button type="submit" size="sm" disabled={saving === "smtp"}>
              <Save className="h-4 w-4 mr-2" />
              {saving === "smtp" ? "Saving..." : "Save SMTP Settings"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Shopify */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-50 p-2.5">
                <ShoppingBag className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-base">Shopify</CardTitle>
                <CardDescription className="text-sm">
                  Sync orders, products, and customers.
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline">Not Configured</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {saved === "shopify" && (
            <div className="bg-green-50 text-green-800 text-sm p-2 rounded mb-4">
              Shopify settings saved.
            </div>
          )}
          <form onSubmit={handleShopify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="storeUrl">Store URL</Label>
              <Input
                id="storeUrl"
                name="storeUrl"
                placeholder="your-store.myshopify.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key / Access Token</Label>
              <Input
                id="apiKey"
                name="apiKey"
                type="password"
                placeholder="Shopify Admin API access token"
              />
            </div>
            <Button type="submit" size="sm" disabled={saving === "shopify"}>
              <Save className="h-4 w-4 mr-2" />
              {saving === "shopify" ? "Saving..." : "Save Shopify Settings"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* WhatsApp */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 p-2.5">
              <MessageCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base">WhatsApp Business</CardTitle>
              <CardDescription className="text-sm">
                Currently manual click-to-chat only. Official API can be
                configured when credentials are available.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            WhatsApp links are generated automatically from customer phone
            numbers throughout the app. To use the official WhatsApp Business
            API for automated messages, provide API credentials here when
            available.
          </p>
        </CardContent>
      </Card>

      {/* Amazon CSV */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-50 p-2.5">
              <FileSpreadsheet className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-base">Amazon (CSV Import)</CardTitle>
              <CardDescription className="text-sm">
                Import Amazon orders and settlement reports via CSV.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Use the Import/Export section to upload Amazon CSV files. Direct API
            integration can be added when SP-API credentials are available.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

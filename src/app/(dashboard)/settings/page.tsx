import { requirePermission } from "@/lib/auth";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Building2,
  Receipt,
  Plug,
  Warehouse,
} from "lucide-react";

const settingsSections = [
  {
    title: "Company Profile",
    description: "Business name, address, legal details, bank info, and branding.",
    href: "/settings/company",
    icon: Building2,
  },
  {
    title: "Tax & Invoicing",
    description: "Tax rates, financial year, invoice numbering, terms.",
    href: "/settings/tax",
    icon: Receipt,
  },
  {
    title: "Integrations",
    description: "Shopify, WhatsApp Business, SMTP email, Amazon CSV.",
    href: "/settings/integrations",
    icon: Plug,
  },
];

export default async function SettingsPage() {
  await requirePermission("settings:view");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold font-[family-name:var(--font-playfair)]">
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure company details, tax, integrations, and preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {settingsSections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader className="flex flex-row items-start gap-4">
                <div className="rounded-lg bg-primary/5 p-3">
                  <section.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-base">{section.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {section.description}
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

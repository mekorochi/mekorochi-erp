"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { UserPlus, ArrowLeft, Shield } from "lucide-react";
import Link from "next/link";
import { createUser } from "../actions";
import { getRolePermissions } from "@/lib/auth/permissions";
import type { UserRole } from "@prisma/client";

const roles = [
  { value: "ADMIN", label: "Admin", desc: "Full access except owner-level settings" },
  { value: "SALES", label: "Sales / CRM", desc: "Leads, customers, orders, quotations" },
  { value: "INVENTORY", label: "Inventory", desc: "Products, stock, purchasing" },
  { value: "PRODUCTION", label: "Production", desc: "Manufacturing, recipes, QC" },
  { value: "FINANCE", label: "Finance", desc: "Invoices, payments, expenses, reports" },
  { value: "VIEWER", label: "Viewer", desc: "Read-only access to all modules" },
];

export default function InvitePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState("SALES");
  const [pending, setPending] = useState(false);

  const permissions = getRolePermissions(selectedRole as UserRole);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("role", selectedRole);

    try {
      const result = await createUser(formData);
      if (result?.error) {
        setError(result.error);
        setPending(false);
      }
    } catch {
      // redirect throws, which is expected
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/team">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold font-[family-name:var(--font-playfair)]">
            Add Team Member
          </h1>
          <p className="text-muted-foreground mt-1">
            Create credentials for a new user.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" name="email" type="email" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                name="password"
                type="password"
                minLength={8}
                required
                placeholder="Minimum 8 characters"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Role</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {roles.map((role) => (
              <label
                key={role.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedRole === role.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <input
                  type="radio"
                  name="role_select"
                  value={role.value}
                  checked={selectedRole === role.value}
                  onChange={() => setSelectedRole(role.value)}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-sm">{role.label}</p>
                  <p className="text-xs text-muted-foreground">{role.desc}</p>
                </div>
              </label>
            ))}
          </CardContent>
        </Card>

        {/* Permissions preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Permissions Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {permissions.map((p) => (
                <Badge key={p} variant="outline" className="text-xs">
                  {p}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={pending} className="flex-1 sm:flex-none">
            <UserPlus className="h-4 w-4 mr-2" />
            {pending ? "Creating..." : "Create User"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/team">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}

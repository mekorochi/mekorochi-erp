"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupplier, updateSupplier } from "../actions";

interface SupplierData {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  gstin: string;
  pan: string;
  paymentTerms: string;
  creditDays: number;
  notes: string;
}

interface Props {
  supplier?: SupplierData;
}

export function SupplierForm({ supplier }: Props) {
  const router = useRouter();
  const isEdit = !!supplier;
  const action = isEdit ? updateSupplier : createSupplier;

  const [state, formAction, isPending] = useActionState(async (_prev: unknown, formData: FormData) => {
    if (isEdit) formData.set("id", supplier.id);
    return action(_prev, formData);
  }, null);

  useEffect(() => {
    if (state && "success" in state && state.success) {
      router.push("/purchasing/suppliers");
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Supplier Name *</Label>
              <Input id="name" name="name" required defaultValue={supplier?.name} placeholder="Company name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPerson">Contact Person</Label>
              <Input id="contactPerson" name="contactPerson" defaultValue={supplier?.contactPerson} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={supplier?.email} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={supplier?.phone} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="addressLine1">Address Line 1</Label>
            <Input id="addressLine1" name="addressLine1" defaultValue={supplier?.addressLine1} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="addressLine2">Address Line 2</Label>
            <Input id="addressLine2" name="addressLine2" defaultValue={supplier?.addressLine2} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" defaultValue={supplier?.city} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" name="state" defaultValue={supplier?.state} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode</Label>
              <Input id="pincode" name="pincode" defaultValue={supplier?.pincode} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" name="country" defaultValue={supplier?.country || "India"} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tax & Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gstin">GSTIN</Label>
              <Input id="gstin" name="gstin" defaultValue={supplier?.gstin} placeholder="e.g. 24AABCS1234C1Z5" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pan">PAN</Label>
              <Input id="pan" name="pan" defaultValue={supplier?.pan} placeholder="e.g. AABCS1234C" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Input id="paymentTerms" name="paymentTerms" defaultValue={supplier?.paymentTerms} placeholder="e.g. Net 30" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditDays">Credit Days</Label>
              <Input id="creditDays" name="creditDays" type="number" min="0" defaultValue={supplier?.creditDays ?? 30} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea name="notes" rows={3} defaultValue={supplier?.notes} placeholder="Any additional notes..." />
        </CardContent>
      </Card>

      {state && "error" in state && state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : isEdit ? "Update Supplier" : "Create Supplier"}
        </Button>
      </div>
    </form>
  );
}

import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SupplierForm } from "../supplier-form";

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("purchasing:create");
  const { id } = await params;

  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) notFound();

  return (
    <div>
      <PageHeader title={`Edit: ${supplier.name}`} description="Update supplier details">
        <Link href="/purchasing/suppliers">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </PageHeader>
      <SupplierForm supplier={{
        id: supplier.id,
        name: supplier.name,
        contactPerson: supplier.contactPerson || "",
        email: supplier.email || "",
        phone: supplier.phone || "",
        addressLine1: supplier.addressLine1 || "",
        addressLine2: supplier.addressLine2 || "",
        city: supplier.city || "",
        state: supplier.state || "",
        pincode: supplier.pincode || "",
        country: supplier.country,
        gstin: supplier.gstin || "",
        pan: supplier.pan || "",
        paymentTerms: supplier.paymentTerms || "",
        creditDays: supplier.creditDays || 30,
        notes: supplier.notes || "",
      }} />
    </div>
  );
}

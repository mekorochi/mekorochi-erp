import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import { CustomerForm } from "@/components/shared/customer-form";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("customers:edit");
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      company: true,
      type: true,
      email: true,
      phone: true,
      gstin: true,
      pan: true,
      channel: true,
      segment: true,
      creditLimit: true,
      creditDays: true,
      notes: true,
      addresses: {
        where: { isBilling: true },
        take: 1,
        select: { addressLine1: true, addressLine2: true, city: true, state: true, pincode: true },
      },
    },
  });

  if (!customer) notFound();

  const serialized = {
    ...JSON.parse(JSON.stringify(customer)),
    billingAddress: customer.addresses[0] || null,
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display">Edit Customer</h1>
        <p className="text-sm text-muted-foreground">
          Update details for {customer.name}
        </p>
      </div>
      <CustomerForm customer={serialized} />
    </div>
  );
}

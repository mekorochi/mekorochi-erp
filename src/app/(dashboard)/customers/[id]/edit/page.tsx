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
    },
  });

  if (!customer) notFound();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display">Edit Customer</h1>
        <p className="text-sm text-muted-foreground">
          Update details for {customer.name}
        </p>
      </div>
      <CustomerForm customer={JSON.parse(JSON.stringify(customer))} />
    </div>
  );
}

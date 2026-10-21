import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import { CustomerDetailClient } from "./customer-detail-client";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("customers:view");
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      addresses: true,
      contacts: true,
      orders: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          totalAmount: true,
          orderDate: true,
        },
      },
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          invoiceNumber: true,
          type: true,
          status: true,
          totalAmount: true,
          paidAmount: true,
          issueDate: true,
          dueDate: true,
        },
      },
      payments: {
        orderBy: { paymentDate: "desc" },
        take: 20,
        select: {
          id: true,
          paymentNumber: true,
          amount: true,
          method: true,
          paymentDate: true,
          status: true,
        },
      },
      lead: {
        select: { id: true, name: true, source: true, status: true },
      },
    },
  });

  if (!customer) notFound();

  return (
    <CustomerDetailClient customer={JSON.parse(JSON.stringify(customer))} />
  );
}

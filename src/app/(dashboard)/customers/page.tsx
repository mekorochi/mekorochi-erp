import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { CustomersPageClient } from "./customers-client";

export default async function CustomersPage() {
  await requirePermission("customers:view");

  const customers = await prisma.customer.findMany({
    include: {
      _count: { select: { orders: true, invoices: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <CustomersPageClient
      customers={JSON.parse(JSON.stringify(customers))}
    />
  );
}

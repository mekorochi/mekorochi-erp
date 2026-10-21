import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import OrderForm from "@/components/shared/order-form";

export default async function NewOrderPage() {
  await requirePermission("orders:create");

  const [customers, products] = await Promise.all([
    prisma.customer.findMany({
      where: { isActive: true },
      select: { id: true, name: true, company: true, type: true, addresses: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { isActive: true, type: { in: ["FINISHED_GOOD", "BUNDLE"] } },
      select: { id: true, name: true, sku: true, sellingPrice: true, taxRate: true, hsnCode: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serializedProducts = products.map((p) => ({
    ...p,
    sellingPrice: p.sellingPrice?.toString() || "0",
    taxRate: p.taxRate?.toString() || "0",
  }));

  const serializedCustomers = customers.map((c) => ({
    id: c.id,
    name: c.name,
    company: c.company,
    type: c.type,
    addresses: c.addresses.map((a) => ({
      id: a.id,
      label: a.label,
      addressLine1: a.addressLine1,
      city: a.city,
      state: a.state,
      pincode: a.pincode,
      isDefault: a.isDefault,
      isBilling: a.isBilling,
      isShipping: a.isShipping,
    })),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-playfair)]">New Order</h1>
        <p className="text-muted-foreground text-sm mt-1">Create a sales order for a customer.</p>
      </div>
      <OrderForm customers={serializedCustomers} products={serializedProducts} />
    </div>
  );
}

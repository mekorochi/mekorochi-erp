import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import QuotationForm from "@/components/shared/quotation-form";
import { createQuotation } from "../actions";

export default async function NewQuotationPage() {
  await requirePermission("quotations:create");

  const [customers, products] = await Promise.all([
    prisma.customer.findMany({
      where: { isActive: true },
      select: { id: true, name: true, company: true, type: true },
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

  async function handleCreate(data: Record<string, unknown>) {
    "use server";
    return createQuotation(data as Parameters<typeof createQuotation>[0]);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-playfair)]">New Quotation</h1>
        <p className="text-muted-foreground text-sm mt-1">Create a quotation for a customer or corporate gifting order.</p>
      </div>
      <QuotationForm customers={customers} products={serializedProducts} onSubmit={handleCreate} />
    </div>
  );
}

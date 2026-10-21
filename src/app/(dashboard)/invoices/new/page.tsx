import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import InvoiceForm from "@/components/shared/invoice-form";

export default async function NewInvoicePage() {
  const user = await requirePermission("invoices:create");

  const [customers, products, settings] = await Promise.all([
    prisma.customer.findMany({
      where: { isActive: true },
      select: { id: true, name: true, company: true, gstin: true, addresses: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { isActive: true, type: { in: ["FINISHED_GOOD", "BUNDLE", "SERVICE"] } },
      select: { id: true, name: true, sku: true, sellingPrice: true, hsnCode: true, taxRate: true },
      orderBy: { name: "asc" },
    }),
    prisma.companySettings.findFirst(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-playfair)]">New Invoice</h1>
        <p className="text-sm text-muted-foreground mt-1">Create a new tax invoice, proforma, or credit note</p>
      </div>
      <InvoiceForm
        customers={customers as any}
        products={products as any}
        companyState={settings?.state || ""}
      />
    </div>
  );
}

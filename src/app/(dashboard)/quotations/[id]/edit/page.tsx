import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { notFound, redirect } from "next/navigation";
import QuotationForm from "@/components/shared/quotation-form";
import { updateQuotation } from "../../actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function EditQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("quotations:edit");
  const { id } = await params;

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      items: { include: { product: true }, orderBy: { sortOrder: "asc" } },
      recipients: true,
    },
  });

  if (!quotation) notFound();
  if (quotation.status === "CONVERTED") redirect(`/quotations/${id}`);

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

  const initialData = {
    id: quotation.id,
    customerId: quotation.customerId,
    validUntil: quotation.validUntil.toISOString().split("T")[0],
    deliveryDate: quotation.deliveryDate?.toISOString().split("T")[0] || "",
    isGifting: quotation.isGifting,
    customization: quotation.customization || "",
    notes: quotation.notes || "",
    termsConditions: quotation.termsConditions || "",
    discountAmount: parseFloat(quotation.discountAmount.toString()),
    shippingAmount: parseFloat(quotation.shippingAmount.toString()),
    items: quotation.items.map((item) => ({
      productId: item.productId,
      description: item.description || item.product.name,
      quantity: parseFloat(item.quantity.toString()),
      unitPrice: parseFloat(item.unitPrice.toString()),
      discount: parseFloat(item.discount.toString()),
      taxRate: parseFloat(item.taxRate.toString()),
    })),
    recipients: quotation.recipients.map((r) => ({
      name: r.name,
      phone: r.phone || "",
      email: r.email || "",
      address: r.address,
      city: r.city || "",
      state: r.state || "",
      pincode: r.pincode || "",
      giftNote: r.giftNote || "",
      deliveryDate: r.deliveryDate?.toISOString().split("T")[0] || "",
      customization: r.customization || "",
    })),
  };

  async function handleUpdate(data: Record<string, unknown>) {
    "use server";
    return updateQuotation(id, data as Parameters<typeof updateQuotation>[1]);
  }

  return (
    <div className="space-y-6">
      <Link href={`/quotations/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to {quotation.quoteNumber}
      </Link>
      <div>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-playfair)]">Edit {quotation.quoteNumber}</h1>
        <p className="text-muted-foreground text-sm mt-1">Update quotation details, items, and recipients.</p>
      </div>
      <QuotationForm
        customers={customers}
        products={serializedProducts}
        initialData={initialData}
        onSubmit={handleUpdate}
        submitLabel="Save Changes"
      />
    </div>
  );
}

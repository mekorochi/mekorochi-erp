import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import InvoiceForm from "@/components/shared/invoice-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function InvoiceFromOrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  await requirePermission("invoices:create");
  const { orderId } = await params;

  const order = await prisma.salesOrder.findUnique({
    where: { id: orderId },
    include: {
      customer: {
        include: { addresses: true },
      },
      items: {
        include: { product: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!order) notFound();

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

  const billingAddr = order.billingAddress as Record<string, string> | null;
  const customerState = billingAddr?.state ||
    order.customer.addresses.find((a) => a.isBilling)?.state || "";
  const companyState = settings?.state || "";
  const isInterState = !!(customerState && companyState && customerState.toLowerCase() !== companyState.toLowerCase());

  const initialData = {
    orderId: order.id,
    customerId: order.customerId,
    type: "TAX_INVOICE",
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    placeOfSupply: customerState,
    isInterState,
    shippingAmount: order.shippingAmount.toString(),
    notes: order.notes || "",
    items: order.items.map((item) => ({
      productId: item.productId,
      description: item.product.name,
      hsnCode: item.hsnCode || item.product.hsnCode || "",
      quantity: parseFloat(item.quantity.toString()).toString(),
      unitPrice: parseFloat(item.unitPrice.toString()).toString(),
      discount: parseFloat(item.discount.toString()).toString(),
      taxRate: parseFloat(item.taxRate.toString()).toString(),
      taxableAmount: "0",
      cgst: "0",
      sgst: "0",
      igst: "0",
      total: "0",
    })),
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/orders/${orderId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {order.orderNumber}
        </Link>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-playfair)]">
          Invoice from Order
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Creating invoice for order {order.orderNumber} &middot; {order.customer.name}
        </p>
      </div>
      <InvoiceForm
        customers={customers as any}
        products={products as any}
        companyState={companyState}
        initialData={initialData}
      />
    </div>
  );
}

import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import NewProductionOrderForm from "./form";

export default async function NewProductionOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ bomId?: string }>;
}) {
  await requirePermission("production:create");
  const params = await searchParams;

  const boms = await prisma.bOM.findMany({
    where: { isActive: true },
    include: {
      product: { select: { name: true, sku: true } },
      items: {
        include: {
          product: {
            select: { name: true, sku: true, costPrice: true },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/production"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Production
        </Link>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-playfair)]">
          New Production Order
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create a production order from a recipe
        </p>
      </div>
      <NewProductionOrderForm
        boms={boms.map((b) => ({
          id: b.id,
          name: b.name,
          version: b.version,
          productName: b.product.name,
          productSku: b.product.sku,
          batchSize: b.batchSize.toString(),
          batchUnit: b.batchUnit,
          items: b.items.map((i) => ({
            productName: i.product.name,
            productSku: i.product.sku,
            quantity: i.quantity.toString(),
            unit: i.unit,
          })),
        }))}
        preselectedBomId={params.bomId}
      />
    </div>
  );
}

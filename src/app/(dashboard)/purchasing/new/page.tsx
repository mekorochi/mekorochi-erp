import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PurchaseOrderForm } from "@/components/shared/purchase-order-form";

export default async function NewPurchaseOrderPage() {
  await requirePermission("purchasing:create");

  const [suppliers, products] = await Promise.all([
    prisma.supplier.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { isActive: true, type: { in: ["RAW_MATERIAL", "PACKAGING"] } },
      select: { id: true, name: true, sku: true, costPrice: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader title="New Purchase Order" description="Create a purchase order for a supplier">
        <Link href="/purchasing">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </PageHeader>

      <PurchaseOrderForm
        suppliers={suppliers}
        products={products.map((p) => ({
          ...p,
          costPrice: p.costPrice?.toString() || null,
        }))}
      />
    </div>
  );
}

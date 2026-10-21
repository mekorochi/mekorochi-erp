import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import BOMForm from "@/components/shared/bom-form";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function NewRecipePage() {
  await requirePermission("production:create");

  const finishedProducts = await prisma.product.findMany({
    where: { type: { in: ["FINISHED_GOOD", "BUNDLE"] }, isActive: true },
    select: { id: true, name: true, sku: true, type: true, unitOfMeasure: true },
    orderBy: { name: "asc" },
  });

  const rawMaterials = await prisma.product.findMany({
    where: { type: { in: ["RAW_MATERIAL", "PACKAGING"] }, isActive: true },
    select: { id: true, name: true, sku: true, type: true, unitOfMeasure: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/production/recipes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Recipes
        </Link>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-playfair)]">
          Create Recipe
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Define a Bill of Materials for a finished product
        </p>
      </div>
      <BOMForm finishedProducts={finishedProducts} rawMaterials={rawMaterials} />
    </div>
  );
}

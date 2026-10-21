import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import prisma from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ProductForm } from "@/components/shared/product-form";
import { updateProduct } from "../../actions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: Props) {
  await requirePermission("products:edit");
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!product) notFound();

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const initialData = {
    id: product.id,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode || "",
    description: product.description || "",
    categoryId: product.categoryId || "",
    type: product.type,
    unitOfMeasure: product.unitOfMeasure,
    sellingPrice: product.sellingPrice ? parseFloat(product.sellingPrice.toString()) : undefined,
    costPrice: product.costPrice ? parseFloat(product.costPrice.toString()) : undefined,
    wholesalePrice: product.wholesalePrice ? parseFloat(product.wholesalePrice.toString()) : undefined,
    corporatePrice: product.corporatePrice ? parseFloat(product.corporatePrice.toString()) : undefined,
    hsnCode: product.hsnCode || "",
    taxRate: product.taxRate ? parseFloat(product.taxRate.toString()) : undefined,
    weight: product.weight ? parseFloat(product.weight.toString()) : undefined,
    weightUnit: product.weightUnit || "g",
    shelfLifeDays: product.shelfLifeDays || undefined,
    allergens: product.allergens || "",
    ingredients: product.ingredients || "",
    reorderLevel: product.reorderLevel ? parseFloat(product.reorderLevel.toString()) : undefined,
    minOrderQty: product.minOrderQty ? parseFloat(product.minOrderQty.toString()) : undefined,
    isBundle: product.isBundle,
    isActive: product.isActive,
  };

  const handleUpdate = async (formData: Record<string, unknown>) => {
    "use server";
    return updateProduct(id, formData);
  };

  return (
    <div>
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/products/${id}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to Product
          </Link>
        </Button>
      </div>

      <PageHeader
        title={`Edit: ${product.name}`}
        description={`SKU: ${product.sku}`}
      />

      <ProductForm
        initialData={initialData}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        onSubmit={handleUpdate}
      />
    </div>
  );
}

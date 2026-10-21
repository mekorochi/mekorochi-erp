import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { ProductForm } from "@/components/shared/product-form";
import { createProduct } from "../actions";

export default async function NewProductPage() {
  await requirePermission("products:create");

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="New Product"
        description="Add a new product to your catalog"
      />
      <ProductForm
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        onSubmit={createProduct}
      />
    </div>
  );
}

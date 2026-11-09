import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { ProductForm } from "@/components/shared/product-form";
import { createProduct } from "../actions";

export default async function NewProductPage() {
  await requirePermission("products:create");

  const [categories, warehouses] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.warehouse.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="New Product"
        description="Add a new product to your catalog"
      />
      <ProductForm
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        warehouses={warehouses}
        onSubmit={createProduct}
      />
    </div>
  );
}

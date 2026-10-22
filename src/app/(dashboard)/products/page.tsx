import Link from "next/link";
import { Plus, Package, Search, Tags } from "lucide-react";
import prisma from "@/lib/db/prisma";
import { requirePermission, checkPermission } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { ProductFilters } from "./product-filters";

interface Props {
  searchParams: Promise<{
    search?: string;
    type?: string;
    category?: string;
    page?: string;
  }>;
}

const typeLabels: Record<string, string> = {
  RAW_MATERIAL: "Raw Material",
  PACKAGING: "Packaging",
  FINISHED_GOOD: "Finished Good",
  BUNDLE: "Bundle",
  SERVICE: "Service",
};

const typeBadgeVariant: Record<string, "default" | "secondary" | "warning" | "info" | "success"> = {
  RAW_MATERIAL: "secondary",
  PACKAGING: "info",
  FINISHED_GOOD: "default",
  BUNDLE: "warning",
  SERVICE: "success",
};

export default async function ProductsPage({ searchParams }: Props) {
  await requirePermission("products:view");
  const canCreate = await checkPermission("products:create");

  const params = await searchParams;
  const search = params.search || "";
  const typeFilter = params.type || "";
  const categoryFilter = params.category || "";
  const page = Math.max(1, parseInt(params.page || "1"));
  const perPage = 20;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
      { barcode: { contains: search, mode: "insensitive" } },
    ];
  }
  if (typeFilter) where.type = typeFilter;
  if (categoryFilter) where.categoryId = categoryFilter;

  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({
      where: where as any,
      include: {
        category: true,
        stockItems: { select: { quantity: true, reservedQty: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.product.count({ where: where as any }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div>
      <PageHeader title="Products" description={`${total} product${total !== 1 ? "s" : ""}`}>
        <Button variant="outline" asChild>
          <Link href="/products/categories">
            <Tags className="h-4 w-4" />
            Categories
          </Link>
        </Button>
        {canCreate && (
          <Button asChild>
            <Link href="/products/new">
              <Plus className="h-4 w-4" />
              Add Product
            </Link>
          </Button>
        )}
      </PageHeader>

      <ProductFilters
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        currentSearch={search}
        currentType={typeFilter}
        currentCategory={categoryFilter}
      />

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Add your first product to start managing your catalog."
          actionLabel={canCreate ? "Add Product" : undefined}
          actionHref={canCreate ? "/products/new" : undefined}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => {
                      const totalStock = product.stockItems.reduce(
                        (sum, si) => sum + parseFloat(si.quantity.toString()),
                        0
                      );
                      return (
                        <TableRow key={product.id}>
                          <TableCell className="font-mono text-xs">
                            {product.sku}
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/products/${product.id}`}
                              className="font-medium hover:text-primary hover:underline"
                            >
                              {product.name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge variant={typeBadgeVariant[product.type] || "secondary"}>
                              {typeLabels[product.type] || product.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {product.category?.name || "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {product.sellingPrice
                              ? formatCurrency(product.sellingPrice.toString())
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {totalStock > 0 ? (
                              <span className={totalStock < parseFloat(product.reorderLevel?.toString() || "0") ? "text-destructive font-medium" : ""}>
                                {totalStock.toFixed(product.unitOfMeasure === "PIECE" || product.unitOfMeasure === "BOX" ? 0 : 2)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={product.isActive ? "success" : "secondary"}>
                              {product.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/products/${product.id}`}>View</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-3">
            {products.map((product) => {
              const totalStock = product.stockItems.reduce(
                (sum, si) => sum + parseFloat(si.quantity.toString()),
                0
              );
              return (
                <Link key={product.id} href={`/products/${product.id}`}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            {product.sku}
                          </p>
                        </div>
                        <Badge variant={product.isActive ? "success" : "secondary"} className="shrink-0">
                          {product.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-center gap-4 text-sm">
                        <Badge variant={typeBadgeVariant[product.type] || "secondary"} className="text-xs">
                          {typeLabels[product.type] || product.type}
                        </Badge>
                        {product.sellingPrice && (
                          <span className="font-medium tabular-nums">
                            {formatCurrency(product.sellingPrice.toString())}
                          </span>
                        )}
                        <span className="text-muted-foreground ml-auto">
                          Stock: {totalStock.toFixed(0)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={{
                        pathname: "/products",
                        query: { ...params, page: (page - 1).toString() },
                      }}
                    >
                      Previous
                    </Link>
                  </Button>
                )}
                {page < totalPages && (
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={{
                        pathname: "/products",
                        query: { ...params, page: (page + 1).toString() },
                      }}
                    >
                      Next
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

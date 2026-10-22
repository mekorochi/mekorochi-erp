import Link from "next/link";
import { notFound } from "next/navigation";
import { Edit, Archive, Package, ArrowLeft, Tag, Scale, Clock, AlertTriangle } from "lucide-react";
import prisma from "@/lib/db/prisma";
import { requirePermission, checkPermission } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ProductStatusToggle } from "./product-status-toggle";
import { BundleItemsEditor } from "./bundle-items-editor";

interface Props {
  params: Promise<{ id: string }>;
}

const typeLabels: Record<string, string> = {
  RAW_MATERIAL: "Raw Material",
  PACKAGING: "Packaging",
  FINISHED_GOOD: "Finished Good",
  BUNDLE: "Bundle",
  SERVICE: "Service",
};

export default async function ProductDetailPage({ params }: Props) {
  await requirePermission("products:view");
  const canEdit = await checkPermission("products:edit");
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      stockItems: { include: { warehouse: true } },
      bundleItems: { include: { product: true } },
      bundledIn: { include: { bundle: true } },
    },
  });

  if (!product) notFound();

  const [recentMovements, availableProducts] = await Promise.all([
    prisma.stockMovement.findMany({
      where: { productId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { warehouse: true, lot: true },
    }),
    product.isBundle
      ? prisma.product.findMany({
          where: { isActive: true, type: { not: "BUNDLE" }, id: { not: id } },
          select: { id: true, name: true, sku: true, type: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const totalStock = product.stockItems.reduce(
    (sum, si) => sum + parseFloat(si.quantity.toString()),
    0
  );
  const totalReserved = product.stockItems.reduce(
    (sum, si) => sum + parseFloat(si.reservedQty.toString()),
    0
  );

  return (
    <div>
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/products">
            <ArrowLeft className="h-4 w-4" />
            Back to Products
          </Link>
        </Button>
      </div>

      <PageHeader title={product.name} description={`SKU: ${product.sku}`}>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/products/${id}/edit`}>
                <Edit className="h-4 w-4" />
                Edit
              </Link>
            </Button>
            <ProductStatusToggle productId={id} isActive={product.isActive} />
          </div>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Product Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Type</dt>
                  <dd className="font-medium">{typeLabels[product.type] || product.type}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Category</dt>
                  <dd className="font-medium">{product.category?.name || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Unit</dt>
                  <dd className="font-medium">{product.unitOfMeasure}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>
                    <Badge variant={product.isActive ? "success" : "secondary"}>
                      {product.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </dd>
                </div>
                {product.barcode && (
                  <div>
                    <dt className="text-muted-foreground">Barcode</dt>
                    <dd className="font-mono">{product.barcode}</dd>
                  </div>
                )}
                {product.hsnCode && (
                  <div>
                    <dt className="text-muted-foreground">HSN Code</dt>
                    <dd className="font-mono">{product.hsnCode}</dd>
                  </div>
                )}
                {product.weight && (
                  <div>
                    <dt className="text-muted-foreground">Weight</dt>
                    <dd>{product.weight.toString()} {product.weightUnit}</dd>
                  </div>
                )}
                {product.shelfLifeDays && (
                  <div>
                    <dt className="text-muted-foreground">Shelf Life</dt>
                    <dd>{product.shelfLifeDays} days</dd>
                  </div>
                )}
                {product.allergens && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Allergens</dt>
                    <dd>{product.allergens}</dd>
                  </div>
                )}
                {product.description && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Description</dt>
                    <dd>{product.description}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Bundle Items Editor */}
          {product.isBundle && canEdit && (
            <BundleItemsEditor
              productId={id}
              availableProducts={availableProducts}
              initialItems={product.bundleItems.map((bi) => ({
                productId: bi.product.id,
                name: bi.product.name,
                sku: bi.product.sku,
                quantity: parseFloat(bi.quantity.toString()),
              }))}
            />
          )}
          {product.isBundle && !canEdit && product.bundleItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bundle Contents</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.bundleItems.map((bi) => (
                      <TableRow key={bi.id}>
                        <TableCell>
                          <Link href={`/products/${bi.product.id}`} className="hover:underline text-primary">
                            {bi.product.name}
                          </Link>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{bi.product.sku}</TableCell>
                        <TableCell className="text-right tabular-nums">{bi.quantity.toString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Stock Movements */}
          {recentMovements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Stock Movements</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Lot</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentMovements.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs">{formatDate(m.createdAt)}</TableCell>
                        <TableCell>
                          <Badge variant={parseFloat(m.quantity.toString()) > 0 ? "success" : "destructive"} className="text-xs">
                            {m.movementType.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>{m.warehouse.name}</TableCell>
                        <TableCell className="font-mono text-xs">{m.lot?.lotNumber || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {parseFloat(m.quantity.toString()) > 0 ? "+" : ""}{m.quantity.toString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Selling Price</span>
                <span className="font-semibold tabular-nums">
                  {product.sellingPrice ? formatCurrency(product.sellingPrice.toString()) : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cost Price</span>
                <span className="tabular-nums">
                  {product.costPrice ? formatCurrency(product.costPrice.toString()) : "—"}
                </span>
              </div>
              {product.wholesalePrice && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Wholesale</span>
                  <span className="tabular-nums">{formatCurrency(product.wholesalePrice.toString())}</span>
                </div>
              )}
              {product.corporatePrice && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Corporate</span>
                  <span className="tabular-nums">{formatCurrency(product.corporatePrice.toString())}</span>
                </div>
              )}
              {product.taxRate && (
                <div className="flex justify-between border-t pt-3">
                  <span className="text-muted-foreground">Tax Rate</span>
                  <span>{product.taxRate.toString()}%</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Inventory — not shown for bundles since they don't carry their own stock */}
          {!product.isBundle && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Inventory
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Stock</span>
                  <span className="font-semibold tabular-nums">{totalStock.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reserved</span>
                  <span className="tabular-nums">{totalReserved.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available</span>
                  <span className="tabular-nums font-medium">{(totalStock - totalReserved).toFixed(2)}</span>
                </div>
                {product.reorderLevel && totalStock < parseFloat(product.reorderLevel.toString()) && (
                  <div className="flex items-center gap-2 text-destructive pt-2 border-t">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs font-medium">Below reorder level ({product.reorderLevel.toString()})</span>
                  </div>
                )}
                {product.stockItems.length > 0 && (
                  <div className="pt-3 border-t space-y-2">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">By Location</p>
                    {product.stockItems.map((si) => (
                      <div key={si.id} className="flex justify-between text-xs">
                        <span>{si.warehouse.name}</span>
                        <span className="tabular-nums">{si.quantity.toString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(product.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{formatDate(product.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import Link from "next/link";
import { formatNumber } from "@/lib/utils";
import { Plus, BookOpen } from "lucide-react";

export default async function RecipesPage() {
  await requirePermission("production:view");

  const boms = await prisma.bOM.findMany({
    include: {
      product: { select: { name: true, sku: true } },
      items: { select: { id: true } },
    },
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-playfair)]">
            Recipes / Bill of Materials
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define ingredient lists for your chocolate products
          </p>
        </div>
        <Link
          href="/production/recipes/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Recipe
        </Link>
      </div>

      {boms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold">No recipes yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Create your first recipe to define ingredient requirements for
            production.
          </p>
          <Link
            href="/production/recipes/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Create Recipe
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Recipe Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Product
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    Version
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Batch Size
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    Ingredients
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {boms.map((bom) => (
                  <tr
                    key={bom.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/production/recipes/${bom.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {bom.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p>{bom.product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {bom.product.sku}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">v{bom.version}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatNumber(bom.batchSize.toString(), 0)} {bom.batchUnit.toLowerCase()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {bom.items.length}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          bom.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {bom.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {boms.map((bom) => (
              <Link
                key={bom.id}
                href={`/production/recipes/${bom.id}`}
                className="block rounded-xl border bg-card p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{bom.name}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {bom.product.name}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      bom.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {bom.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>v{bom.version}</span>
                  <span>
                    Batch: {formatNumber(bom.batchSize.toString(), 0)}{" "}
                    {bom.batchUnit.toLowerCase()}
                  </span>
                  <span>{bom.items.length} ingredients</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

import { Folder, Plus, Edit2, Trash2 } from "lucide-react";
import prisma from "@/lib/db/prisma";
import { requirePermission, checkPermission } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CategoryActions } from "./category-actions";

export default async function CategoriesPage() {
  await requirePermission("products:view");
  const canCreate = await checkPermission("products:create");
  const canEdit = await checkPermission("products:edit");

  const categories = await prisma.category.findMany({
    include: {
      parent: true,
      _count: { select: { products: true, children: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <div>
      <PageHeader title="Categories" description="Manage product categories">
        {canCreate && <CategoryActions mode="create" categories={categories.map(c => ({ id: c.id, name: c.name }))} />}
      </PageHeader>

      {categories.length === 0 ? (
        <EmptyState
          icon={Folder}
          title="No categories yet"
          description="Create categories to organize your products."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead className="text-right">Products</TableHead>
                  <TableHead className="text-right">Subcategories</TableHead>
                  <TableHead>Status</TableHead>
                  {canEdit && <TableHead className="w-[100px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {cat.parent?.name || "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {cat._count.products}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {cat._count.children}
                    </TableCell>
                    <TableCell>
                      <Badge variant={cat.isActive ? "success" : "secondary"}>
                        {cat.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <CategoryActions
                          mode="edit"
                          categoryId={cat.id}
                          categoryData={{ name: cat.name, description: cat.description || "", parentId: cat.parentId || "", sortOrder: cat.sortOrder }}
                          categories={categories.filter(c => c.id !== cat.id).map(c => ({ id: c.id, name: c.name }))}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

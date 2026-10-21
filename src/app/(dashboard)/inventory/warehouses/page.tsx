import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Warehouse, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { WarehouseDialog } from "./warehouse-dialog";

const TYPE_LABELS: Record<string, string> = {
  RAW_MATERIALS: "Raw Materials",
  PACKAGING: "Packaging",
  FINISHED_GOODS: "Finished Goods",
  DISPATCH: "Dispatch",
  QUARANTINE: "Quarantine",
  GENERAL: "General",
};

export default async function WarehousesPage() {
  await requirePermission("inventory:view");

  const warehouses = await prisma.warehouse.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { stockItems: true, movements: true } },
    },
  });

  return (
    <div>
      <PageHeader title="Warehouses" description="Manage stock locations">
        <Link href="/inventory">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inventory
          </Button>
        </Link>
        <WarehouseDialog />
      </PageHeader>

      {warehouses.length === 0 ? (
        <EmptyState
          icon={Warehouse}
          title="No warehouses configured"
          description="Create your first warehouse to start tracking stock by location."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {warehouses.map((w) => (
            <Card key={w.id} className={!w.isActive ? "opacity-60" : undefined}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-base">{w.name}</h3>
                    <p className="text-xs font-mono text-muted-foreground">{w.code}</p>
                  </div>
                  <div className="flex gap-1.5">
                    {w.isDefault && <Badge variant="warning">Default</Badge>}
                    <Badge variant={w.isActive ? "success" : "outline"}>
                      {w.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Type</span>
                    <span>{TYPE_LABELS[w.type] || w.type}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Stock Items</span>
                    <span className="font-medium">{w._count.stockItems}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Movements</span>
                    <span className="font-medium">{w._count.movements}</span>
                  </div>
                  {w.address && (
                    <p className="text-xs text-muted-foreground pt-1 border-t">{w.address}</p>
                  )}
                </div>

                <div className="mt-4">
                  <WarehouseDialog
                    warehouse={{ id: w.id, name: w.name, code: w.code, type: w.type, address: w.address || "", isDefault: w.isDefault }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Users, Plus, ArrowLeft, Phone, Mail, MapPin } from "lucide-react";
import Link from "next/link";

export default async function SuppliersPage() {
  await requirePermission("purchasing:view");

  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { purchaseOrders: true } },
    },
  });

  return (
    <div>
      <PageHeader title="Suppliers" description="Manage your ingredient and packaging suppliers">
        <Link href="/purchasing">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <Link href="/purchasing/suppliers/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Supplier
          </Button>
        </Link>
      </PageHeader>

      {suppliers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No suppliers yet"
          description="Add your first supplier to start creating purchase orders."
          actionLabel="Add Supplier"
          actionHref="/purchasing/suppliers/new"
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium">Name</th>
                    <th className="text-left px-4 py-3 font-medium">Contact</th>
                    <th className="text-left px-4 py-3 font-medium">Location</th>
                    <th className="text-left px-4 py-3 font-medium">Phone</th>
                    <th className="text-left px-4 py-3 font-medium">Email</th>
                    <th className="text-right px-4 py-3 font-medium">POs</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr key={s.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.contactPerson || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{[s.city, s.state].filter(Boolean).join(", ") || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.phone || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.email || "—"}</td>
                      <td className="px-4 py-3 text-right">{s._count.purchaseOrders}</td>
                      <td className="px-4 py-3">
                        <Badge variant={s.isActive ? "success" : "outline"}>
                          {s.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/purchasing/suppliers/${s.id}`}>
                          <Button variant="ghost" size="sm">Edit</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {suppliers.map((s) => (
              <Link key={s.id} href={`/purchasing/suppliers/${s.id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{s.name}</p>
                        {s.contactPerson && <p className="text-xs text-muted-foreground">{s.contactPerson}</p>}
                      </div>
                      <Badge variant={s.isActive ? "success" : "outline"}>
                        {s.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {s.phone && (
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{s.phone}</span>
                      )}
                      {s.email && (
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{s.email}</span>
                      )}
                      {s.city && (
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.city}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

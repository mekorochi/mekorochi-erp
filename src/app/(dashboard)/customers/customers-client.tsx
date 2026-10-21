"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Building2, Phone, Mail, ShoppingCart } from "lucide-react";

interface CustomerData {
  id: string;
  name: string;
  company?: string | null;
  type: string;
  email?: string | null;
  phone?: string | null;
  gstin?: string | null;
  channel?: string | null;
  segment?: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { orders: number; invoices: number };
}

interface CustomersPageClientProps {
  customers: CustomerData[];
}

const TYPE_VARIANTS: Record<string, "default" | "secondary" | "outline" | "info" | "warning"> = {
  INDIVIDUAL: "default",
  CORPORATE: "info",
  WHOLESALE: "warning",
  RETAIL_PARTNER: "secondary",
};

export function CustomersPageClient({ customers }: CustomersPageClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("");

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.company?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (c.email?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (c.phone?.includes(search) ?? false);
    const matchesType = !filterType || c.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display">Customers</h1>
          <p className="text-sm text-muted-foreground">
            {customers.length} total customers
          </p>
        </div>
        <Button onClick={() => router.push("/customers/new")} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Customer
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All Types</option>
          <option value="INDIVIDUAL">Individual</option>
          <option value="CORPORATE">Corporate</option>
          <option value="WHOLESALE">Wholesale</option>
          <option value="RETAIL_PARTNER">Retail Partner</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Mobile Cards */}
          <div className="md:hidden divide-y">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No customers found
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="p-4 hover:bg-muted/50 cursor-pointer active:bg-muted"
                  onClick={() => router.push(`/customers/${customer.id}`)}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="font-medium">{customer.name}</div>
                    <Badge variant={TYPE_VARIANTS[customer.type] || "default"} className="text-xs shrink-0">
                      {customer.type.replace("_", " ")}
                    </Badge>
                  </div>
                  {customer.company && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                      <Building2 className="h-3 w-3" />
                      {customer.company}
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                    {customer.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {customer.phone}
                      </span>
                    )}
                    {customer._count.orders > 0 && (
                      <span className="flex items-center gap-1">
                        <ShoppingCart className="h-3 w-3" />
                        {customer._count.orders} orders
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-center">Orders</TableHead>
                  <TableHead>Channel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      No customers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/customers/${customer.id}`)}
                    >
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.company || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={TYPE_VARIANTS[customer.type] || "default"} className="text-xs">
                          {customer.type.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{customer.email || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{customer.phone || "—"}</TableCell>
                      <TableCell className="text-center">{customer._count.orders}</TableCell>
                      <TableCell className="text-muted-foreground">{customer.channel || "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

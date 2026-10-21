import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  IndianRupee,
  ShoppingCart,
  Target,
  AlertTriangle,
  Receipt,
  Warehouse,
  TrendingUp,
  Clock,
  Package,
  FileText,
  CreditCard,
} from "lucide-react";
import prisma from "@/lib/db/prisma";

async function getDashboardData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    pendingOrders,
    activeLeads,
    lowStockCount,
    monthInvoiceAgg,
    unpaidInvoices,
    recentInvoices,
    recentOrders,
    totalCustomers,
    monthExpenseAgg,
  ] = await Promise.all([
    prisma.salesOrder.count({
      where: { status: { in: ["CONFIRMED", "PREPARING", "PACKED"] } },
    }).catch(() => 0),
    prisma.lead.count({
      where: { status: { notIn: ["WON", "LOST"] } },
    }).catch(() => 0),
    prisma.$queryRaw`
      SELECT COUNT(*) as count FROM stock_items si
      JOIN products p ON p.id = si."productId"
      WHERE p."reorderLevel" IS NOT NULL
        AND si.quantity <= p."reorderLevel"
        AND p."isActive" = true
    `.then((r: any) => Number(r?.[0]?.count ?? 0)).catch(() => 0),
    prisma.invoice.aggregate({
      where: { issueDate: { gte: monthStart }, status: { in: ["POSTED", "PARTIALLY_PAID", "PAID"] } },
      _sum: { totalAmount: true },
      _count: true,
    }).catch(() => ({ _sum: { totalAmount: null }, _count: 0 })),
    prisma.invoice.findMany({
      where: { status: { in: ["POSTED", "PARTIALLY_PAID"] } },
      select: { id: true, invoiceNumber: true, totalAmount: true, paidAmount: true },
      orderBy: { dueDate: "asc" },
      take: 10,
    }).then((invs: any[]) => invs.filter(i => Number(i.totalAmount) - Number(i.paidAmount) > 0)).catch(() => []),
    prisma.invoice.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { customer: { select: { name: true } } },
    }).catch(() => []),
    prisma.salesOrder.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { customer: { select: { name: true } } },
    }).catch(() => []),
    prisma.customer.count().catch(() => 0),
    prisma.expense.aggregate({
      where: { expenseDate: { gte: monthStart }, status: { not: "REJECTED" } },
      _sum: { amount: true },
    }).catch(() => ({ _sum: { amount: null } })),
  ]);

  const monthRevenue = monthInvoiceAgg._sum?.totalAmount
    ? Number(monthInvoiceAgg._sum.totalAmount)
    : 0;
  const monthInvoiceCount = monthInvoiceAgg._count || 0;
  const totalOutstanding = unpaidInvoices.reduce(
    (sum: number, inv: any) => sum + (Number(inv.totalAmount) - Number(inv.paidAmount)), 0
  );
  const monthExpenses = monthExpenseAgg._sum?.amount
    ? Number(monthExpenseAgg._sum.amount)
    : 0;

  return {
    pendingOrders,
    activeLeads,
    lowStockCount,
    monthRevenue,
    monthInvoiceCount,
    totalOutstanding,
    outstandingCount: unpaidInvoices.length,
    recentInvoices,
    recentOrders,
    totalCustomers,
    monthExpenses,
  };
}

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const firstName = name.split(" ")[0];
  if (hour < 12) return `Good morning, ${firstName}`;
  if (hour < 17) return `Good afternoon, ${firstName}`;
  return `Good evening, ${firstName}`;
}

function fmtINR(n: number) {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData();

  const kpis = [
    {
      label: "Month Revenue",
      value: fmtINR(data.monthRevenue),
      sub: `${data.monthInvoiceCount} invoice${data.monthInvoiceCount !== 1 ? "s" : ""}`,
      icon: IndianRupee,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Outstanding",
      value: fmtINR(data.totalOutstanding),
      sub: `${data.outstandingCount} unpaid`,
      icon: CreditCard,
      color: data.totalOutstanding > 0 ? "text-amber-600" : "text-emerald-600",
      bg: data.totalOutstanding > 0 ? "bg-amber-50" : "bg-emerald-50",
    },
    {
      label: "Pending Orders",
      value: data.pendingOrders.toString(),
      sub: "to fulfill",
      icon: ShoppingCart,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Active Leads",
      value: data.activeLeads.toString(),
      sub: `${data.totalCustomers} customers`,
      icon: Target,
      color: "text-[#8F9779]",
      bg: "bg-[#8F9779]/10",
    },
  ];

  const quickActions = [
    { label: "New Invoice", href: "/invoices/new", icon: Receipt },
    { label: "New Order", href: "/orders/new", icon: ShoppingCart },
    { label: "New Lead", href: "/leads/new", icon: Target },
    { label: "Stock Check", href: "/inventory", icon: Warehouse },
  ];

  return (
    <div>
      <PageHeader title={getGreeting(user.name)} description="Here&apos;s what&apos;s happening with your business today." />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">{kpi.label}</p>
                  <p className="text-xl md:text-2xl font-bold mt-1 tracking-tight">{kpi.value}</p>
                  {kpi.sub && <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>}
                </div>
                <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${kpi.bg}`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <Button key={action.href} variant="outline" asChild className="gap-2">
              <Link href={action.href}>
                <action.icon className="h-4 w-4" />
                {action.label}
              </Link>
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Invoices</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/invoices">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentInvoices.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No invoices yet</p>
                <p className="text-xs text-muted-foreground mt-1">Create your first invoice to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.recentInvoices.map((inv: any) => (
                  <Link
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    className="flex items-center justify-between py-2 px-3 -mx-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">{inv.customer?.name ?? "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">₹{Number(inv.totalAmount).toLocaleString("en-IN")}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        inv.status === "PAID" ? "bg-emerald-100 text-emerald-700" :
                        inv.status === "POSTED" ? "bg-blue-100 text-blue-700" :
                        inv.status === "DRAFT" ? "bg-gray-100 text-gray-600" :
                        inv.status === "VOID" ? "bg-red-100 text-red-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {inv.status.replace("_", " ")}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/orders">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentOrders.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Package className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No orders yet</p>
                <p className="text-xs text-muted-foreground mt-1">Create your first order to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.recentOrders.map((order: any) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="flex items-center justify-between py-2 px-3 -mx-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">{order.customer?.name ?? "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">₹{Number(order.totalAmount).toLocaleString("en-IN")}</p>
                      <p className="text-xs text-muted-foreground capitalize">{order.status.toLowerCase().replace("_", " ")}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Month Snapshot */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="text-sm">Revenue</span>
                </div>
                <span className="text-sm font-bold text-emerald-600">{fmtINR(data.monthRevenue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                    <Receipt className="h-4 w-4 text-red-500" />
                  </div>
                  <span className="text-sm">Expenses</span>
                </div>
                <span className="text-sm font-bold text-red-500">{fmtINR(data.monthExpenses)}</span>
              </div>
              <div className="border-t pt-3 flex items-center justify-between">
                <span className="text-sm font-medium">Net</span>
                <span className={`text-sm font-bold ${data.monthRevenue - data.monthExpenses >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {fmtINR(data.monthRevenue - data.monthExpenses)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stock Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Stock Alerts</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/inventory">View inventory</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.lowStockCount === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Warehouse className="h-10 w-10 text-emerald-200 mb-3" />
                <p className="text-sm text-muted-foreground">All stock levels are healthy</p>
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 text-center">
                <AlertTriangle className="h-10 w-10 text-amber-300 mb-3" />
                <p className="text-sm font-medium">{data.lowStockCount} item{data.lowStockCount !== 1 ? "s" : ""} below reorder level</p>
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link href="/inventory?filter=low-stock">View Low Stock</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { requirePermission } from "@/lib/auth";
import Link from "next/link";
import {
  TrendingUp,
  Package,
  DollarSign,
  Target,
  Factory,
  Wallet,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const reportCards = [
  {
    title: "Sales Reports",
    description: "Revenue by product, channel, customer. Order funnel and trends.",
    href: "/reports/sales",
    icon: TrendingUp,
    color: "text-chart-1",
    bgColor: "bg-primary/5",
  },
  {
    title: "Inventory Reports",
    description: "Stock on hand, low stock alerts, expiring batches, valuations.",
    href: "/reports/inventory",
    icon: Package,
    color: "text-chart-2",
    bgColor: "bg-secondary/10",
  },
  {
    title: "Financial Reports",
    description: "Receivables, payables, GST summary, cash flow overview.",
    href: "/reports/financial",
    icon: DollarSign,
    color: "text-chart-3",
    bgColor: "bg-accent/10",
  },
  {
    title: "Lead & CRM Reports",
    description: "Pipeline summary, conversion rates, source and owner performance.",
    href: "/reports/leads",
    icon: Target,
    color: "text-chart-4",
    bgColor: "bg-primary/5",
  },
  {
    title: "Production Reports",
    description: "Output, yield, wastage, batch traceability summaries.",
    href: "/reports/production",
    icon: Factory,
    color: "text-chart-5",
    bgColor: "bg-secondary/10",
  },
  {
    title: "Expense Reports",
    description: "Spending by category, vendor, department. Budget vs actual.",
    href: "/reports/expenses",
    icon: Wallet,
    color: "text-chart-3",
    bgColor: "bg-accent/10",
  },
];

export default async function ReportsPage() {
  await requirePermission("reports:view");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold font-[family-name:var(--font-playfair)]">
          Reports
        </h1>
        <p className="text-muted-foreground mt-1">
          Analyse business performance across all operations.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportCards.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader className="flex flex-row items-start gap-4">
                <div className={`rounded-lg p-3 ${card.bgColor}`}>
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-base">{card.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {card.description}
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

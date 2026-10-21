import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IndianRupee, ArrowDownLeft, ArrowUpRight, FileText } from "lucide-react";
import Decimal from "decimal.js";

export default async function FinancialReportPage() {
  await requirePermission("reports:financial");

  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 86400000);
  const d60 = new Date(now.getTime() - 60 * 86400000);
  const d90 = new Date(now.getTime() - 90 * 86400000);

  // Invoices
  const invoices = await prisma.invoice.findMany({
    where: {
      type: "TAX_INVOICE",
      status: { notIn: ["DRAFT", "VOID", "CANCELLED"] },
    },
    include: { customer: true },
  });

  const totalInvoiced = invoices.reduce(
    (s, i) => s.plus(new Decimal(i.totalAmount.toString())),
    new Decimal(0)
  );
  const totalPaidOnInvoices = invoices.reduce(
    (s, i) => s.plus(new Decimal(i.paidAmount.toString())),
    new Decimal(0)
  );
  const totalOutstanding = totalInvoiced.minus(totalPaidOnInvoices);

  // Aging buckets
  const aging = { current: new Decimal(0), d30: new Decimal(0), d60: new Decimal(0), d90: new Decimal(0), d90plus: new Decimal(0) };
  for (const inv of invoices) {
    const outstanding = new Decimal(inv.totalAmount.toString()).minus(
      new Decimal(inv.paidAmount.toString())
    );
    if (outstanding.lte(0)) continue;
    if (inv.dueDate >= now) aging.current = aging.current.plus(outstanding);
    else if (inv.dueDate >= d30) aging.d30 = aging.d30.plus(outstanding);
    else if (inv.dueDate >= d60) aging.d60 = aging.d60.plus(outstanding);
    else if (inv.dueDate >= d90) aging.d90 = aging.d90.plus(outstanding);
    else aging.d90plus = aging.d90plus.plus(outstanding);
  }

  // Payments received
  const paymentsIn = await prisma.payment.aggregate({
    where: { direction: "INBOUND", status: "CONFIRMED" },
    _sum: { amount: true },
    _count: true,
  });

  // Payments made
  const paymentsOut = await prisma.payment.aggregate({
    where: { direction: "OUTBOUND", status: "CONFIRMED" },
    _sum: { amount: true },
    _count: true,
  });

  // Expenses
  const expenses = await prisma.expense.aggregate({
    where: { status: { not: "REJECTED" } },
    _sum: { totalAmount: true },
    _count: true,
  });

  // GST summary from invoices
  const totalCgst = invoices.reduce(
    (s, i) => s.plus(new Decimal(i.cgstAmount.toString())),
    new Decimal(0)
  );
  const totalSgst = invoices.reduce(
    (s, i) => s.plus(new Decimal(i.sgstAmount.toString())),
    new Decimal(0)
  );
  const totalIgst = invoices.reduce(
    (s, i) => s.plus(new Decimal(i.igstAmount.toString())),
    new Decimal(0)
  );
  const totalGst = totalCgst.plus(totalSgst).plus(totalIgst);

  // PO payables
  const poPayables = await prisma.purchaseOrder.findMany({
    where: { status: { in: ["APPROVED", "PARTIALLY_RECEIVED", "RECEIVED"] } },
    select: { totalAmount: true },
  });
  const totalPayables = poPayables.reduce(
    (s, p) => s.plus(new Decimal(p.totalAmount.toString())),
    new Decimal(0)
  );

  const cashIn = new Decimal(paymentsIn._sum.amount?.toString() || "0");
  const cashOut = new Decimal(paymentsOut._sum.amount?.toString() || "0").plus(
    new Decimal(expenses._sum.totalAmount?.toString() || "0")
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold font-[family-name:var(--font-playfair)]">
          Financial Reports
        </h1>
        <p className="text-muted-foreground mt-1">
          Receivables, payables, GST, and cash flow overview. For accountant review.
        </p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-green-50 p-2.5">
              <ArrowDownLeft className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cash Received</p>
              <p className="text-lg font-semibold">{formatCurrency(cashIn)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-red-50 p-2.5">
              <ArrowUpRight className="h-5 w-5 text-red-700" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cash Spent</p>
              <p className="text-lg font-semibold">{formatCurrency(cashOut)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-2.5">
              <IndianRupee className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Receivables</p>
              <p className="text-lg font-semibold">{formatCurrency(totalOutstanding)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/5 p-2.5">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Payables</p>
              <p className="text-lg font-semibold">{formatCurrency(totalPayables)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Receivables Aging */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Receivables Aging</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              ["Current", aging.current, "bg-green-50 text-green-800"],
              ["0-30 days", aging.d30, "bg-blue-50 text-blue-800"],
              ["30-60 days", aging.d60, "bg-amber-50 text-amber-800"],
              ["60-90 days", aging.d90, "bg-orange-50 text-orange-800"],
              ["90+ days", aging.d90plus, "bg-red-50 text-red-800"],
            ].map(([label, amount, cls]) => (
              <div
                key={label as string}
                className={`rounded-lg p-3 text-center ${cls as string}`}
              >
                <p className="text-lg font-bold">
                  {formatCurrency(amount as Decimal)}
                </p>
                <p className="text-xs">{label as string}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* GST Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">GST Tax Summary (Output)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tax Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>CGST</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(totalCgst)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>SGST</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(totalSgst)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>IGST</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(totalIgst)}
                  </TableCell>
                </TableRow>
                <TableRow className="border-t-2">
                  <TableCell className="font-semibold">Total GST</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(totalGst)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            This is an operational summary only. Consult a qualified accountant
            before filing GST returns.
          </p>
        </CardContent>
      </Card>

      {/* Cash flow summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cash Flow Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-green-700">
                    Payments Received ({paymentsIn._count})
                  </TableCell>
                  <TableCell className="text-right font-medium text-green-700">
                    +{formatCurrency(cashIn)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-red-700">
                    Payments Made ({paymentsOut._count})
                  </TableCell>
                  <TableCell className="text-right font-medium text-red-700">
                    -{formatCurrency(new Decimal(paymentsOut._sum.amount?.toString() || "0"))}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-red-700">
                    Expenses ({expenses._count})
                  </TableCell>
                  <TableCell className="text-right font-medium text-red-700">
                    -{formatCurrency(new Decimal(expenses._sum.totalAmount?.toString() || "0"))}
                  </TableCell>
                </TableRow>
                <TableRow className="border-t-2">
                  <TableCell className="font-semibold">Net Cash Flow</TableCell>
                  <TableCell
                    className={`text-right font-semibold ${
                      cashIn.minus(cashOut).gte(0)
                        ? "text-green-700"
                        : "text-red-700"
                    }`}
                  >
                    {formatCurrency(cashIn.minus(cashOut))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

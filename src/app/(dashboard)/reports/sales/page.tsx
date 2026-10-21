"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, TrendingUp, ShoppingCart, Users, Layers } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface SalesData {
  byProduct: Array<{ name: string; revenue: number; quantity: number }>;
  byChannel: Array<{ channel: string; count: number; revenue: number }>;
  byCustomer: Array<{ name: string; orders: number; revenue: number }>;
  funnel: { draft: number; confirmed: number; shipped: number; delivered: number };
  totals: { revenue: number; orders: number; avgOrderValue: number };
}

export default function SalesReportPage() {
  const [data, setData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/reports/sales?from=${dateFrom}&to=${dateTo}`
      );
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // leave data null
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ["Product", "Revenue", "Quantity"],
      ...data.byProduct.map((r) => [r.name, String(r.revenue), String(r.quantity)]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${dateFrom}-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold font-[family-name:var(--font-playfair)]">
            Sales Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            Revenue analysis by product, channel, and customer.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={!data}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Date Range */}
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="space-y-1">
          <label className="text-sm font-medium">From</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">To</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <Button onClick={fetchData} size="sm">
          Apply
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !data ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            No sales data available for the selected period.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="rounded-lg bg-primary/5 p-3">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-semibold">{fmt(data.totals.revenue)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="rounded-lg bg-secondary/10 p-3">
                  <ShoppingCart className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Orders</p>
                  <p className="text-2xl font-semibold">{data.totals.orders}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="rounded-lg bg-accent/10 p-3">
                  <Users className="h-5 w-5 text-gold-deep" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Order Value</p>
                  <p className="text-2xl font-semibold">
                    {fmt(data.totals.avgOrderValue)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4" /> Order Funnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                {(
                  [
                    ["Draft", data.funnel.draft, "bg-muted text-muted-foreground"],
                    ["Confirmed", data.funnel.confirmed, "bg-blue-100 text-blue-800"],
                    ["Shipped", data.funnel.shipped, "bg-amber-100 text-amber-800"],
                    ["Delivered", data.funnel.delivered, "bg-green-100 text-green-800"],
                  ] as const
                ).map(([label, count, cls]) => (
                  <div
                    key={label}
                    className={`flex-1 rounded-lg p-4 text-center ${cls}`}
                  >
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-sm">{label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sales by Product Chart */}
          {data.byProduct.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sales by Product</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.byProduct.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2DED4" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        angle={-30}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={((value: unknown) => [fmt(Number(value)), "Revenue"]) as never}
                      />
                      <Bar dataKey="revenue" fill="#3E2723" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sales by Channel */}
          {data.byChannel.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sales by Channel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Channel</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.byChannel.map((row) => (
                        <TableRow key={row.channel}>
                          <TableCell>
                            <Badge variant="outline">{row.channel}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{row.count}</TableCell>
                          <TableCell className="text-right font-medium">
                            {fmt(row.revenue)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sales by Customer */}
          {data.byCustomer.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.byCustomer.slice(0, 10).map((row) => (
                        <TableRow key={row.name}>
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell className="text-right">{row.orders}</TableCell>
                          <TableCell className="text-right font-medium">
                            {fmt(row.revenue)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

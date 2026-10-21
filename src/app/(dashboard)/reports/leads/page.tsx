import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
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
import { Target, TrendingUp, Users, BarChart3 } from "lucide-react";
import { formatNumber } from "@/lib/utils";

export default async function LeadsReportPage() {
  await requirePermission("reports:view");

  const leads = await prisma.lead.findMany({
    include: { assignedTo: true },
  });

  const total = leads.length;
  const won = leads.filter((l) => l.status === "WON").length;
  const lost = leads.filter((l) => l.status === "LOST").length;
  const active = leads.filter(
    (l) => !["WON", "LOST"].includes(l.status)
  ).length;
  const conversionRate = total > 0 ? ((won / total) * 100).toFixed(1) : "0";

  // Pipeline stages
  const stages = [
    "NEW",
    "CONTACTED",
    "QUALIFIED",
    "PROPOSAL_SENT",
    "NEGOTIATION",
    "WON",
    "LOST",
  ];
  const pipelineCounts = stages.map((stage) => ({
    stage,
    label: stage.replace(/_/g, " "),
    count: leads.filter((l) => l.status === stage).length,
  }));

  // By source
  const sourceMap = new Map<string, number>();
  for (const l of leads) {
    const src = l.source || "MANUAL";
    sourceMap.set(src, (sourceMap.get(src) || 0) + 1);
  }
  const bySource = Array.from(sourceMap.entries())
    .map(([source, count]) => ({ source: source.replace(/_/g, " "), count }))
    .sort((a, b) => b.count - a.count);

  // By owner
  const ownerMap = new Map<
    string,
    { name: string; total: number; won: number; active: number }
  >();
  for (const l of leads) {
    const ownerName = l.assignedTo?.name || "Unassigned";
    const existing = ownerMap.get(ownerName) || {
      name: ownerName,
      total: 0,
      won: 0,
      active: 0,
    };
    existing.total++;
    if (l.status === "WON") existing.won++;
    if (!["WON", "LOST"].includes(l.status)) existing.active++;
    ownerMap.set(ownerName, existing);
  }
  const byOwner = Array.from(ownerMap.values()).sort(
    (a, b) => b.total - a.total
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold font-[family-name:var(--font-playfair)]">
          Lead &amp; CRM Reports
        </h1>
        <p className="text-muted-foreground mt-1">
          Pipeline, conversion, and owner performance.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/5 p-2.5">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Leads</p>
              <p className="text-xl font-semibold">{total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-secondary/10 p-2.5">
              <BarChart3 className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="text-xl font-semibold">{active}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-green-50 p-2.5">
              <TrendingUp className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Won</p>
              <p className="text-xl font-semibold">{won}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-accent/10 p-2.5">
              <Users className="h-5 w-5 text-gold-deep" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Conversion</p>
              <p className="text-xl font-semibold">{conversionRate}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {pipelineCounts.map((p) => {
              const variant =
                p.stage === "WON"
                  ? "success"
                  : p.stage === "LOST"
                  ? "destructive"
                  : "outline";
              return (
                <div
                  key={p.stage}
                  className="flex flex-col items-center gap-1 min-w-[80px]"
                >
                  <Badge variant={variant as "default"} className="text-lg px-3 py-1">
                    {p.count}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{p.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* By Source */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leads by Source</CardTitle>
        </CardHeader>
        <CardContent>
          {bySource.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              No leads yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">% of Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bySource.map((row) => (
                    <TableRow key={row.source}>
                      <TableCell>
                        <Badge variant="outline">{row.source}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {row.count}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {total > 0
                          ? formatNumber((row.count / total) * 100, 1)
                          : "0"}
                        %
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* By Owner */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lead Owner Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {byOwner.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              No data available.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Owner</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Active</TableHead>
                    <TableHead className="text-right">Won</TableHead>
                    <TableHead className="text-right">Conversion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byOwner.map((row) => (
                    <TableRow key={row.name}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-right">{row.total}</TableCell>
                      <TableCell className="text-right">{row.active}</TableCell>
                      <TableCell className="text-right text-green-700">
                        {row.won}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.total > 0
                          ? formatNumber((row.won / row.total) * 100, 1)
                          : "0"}
                        %
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

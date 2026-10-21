"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KanbanBoard, buildKanbanColumns, DEFAULT_PIPELINE_STAGES } from "@/components/shared/kanban-board";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { Plus, LayoutGrid, List, Search, Filter, Building2, Phone, Mail } from "lucide-react";
import { updateLeadStatus } from "./actions";

interface LeadData {
  id: string;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  source: string;
  status: string;
  pipelineStage: string;
  estimatedValue?: string | number | null;
  giftingOccasion?: string | null;
  assignedTo?: { id: string; name: string } | null;
  createdAt: string;
}

interface LeadsPageClientProps {
  leads: LeadData[];
  users: Array<{ id: string; name: string }>;
  currentUserId: string;
}

const SOURCE_BADGE_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive" | "success" | "warning" | "info"> = {
  MANUAL: "default",
  WEBSITE: "info",
  INSTAGRAM: "warning",
  WHATSAPP: "success",
  META_ADS: "info",
  REFERRAL: "secondary",
  CORPORATE: "default",
  NETWORKING: "secondary",
  AMAZON: "warning",
  OTHER: "outline",
};

export function LeadsPageClient({ leads, users, currentUserId }: LeadsPageClientProps) {
  const router = useRouter();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState<string>("");

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      !search ||
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      (lead.company?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (lead.email?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesSource = !filterSource || lead.source === filterSource;
    return matchesSearch && matchesSource;
  });

  const columns = buildKanbanColumns(filteredLeads, DEFAULT_PIPELINE_STAGES);

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    await updateLeadStatus(leadId, { status: newStatus });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display">Leads</h1>
          <p className="text-sm text-muted-foreground">
            {leads.length} total leads in pipeline
          </p>
        </div>
        <Button onClick={() => router.push("/leads/new")} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Lead
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All Sources</option>
          <option value="MANUAL">Manual</option>
          <option value="WEBSITE">Website</option>
          <option value="INSTAGRAM">Instagram</option>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="META_ADS">Meta Ads</option>
          <option value="REFERRAL">Referral</option>
          <option value="CORPORATE">Corporate</option>
          <option value="NETWORKING">Networking</option>
          <option value="AMAZON">Amazon</option>
          <option value="OTHER">Other</option>
        </select>

        <div className="flex gap-1 border rounded-md p-1">
          <button
            onClick={() => setView("kanban")}
            className={cn(
              "p-1.5 rounded",
              view === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={cn(
              "p-1.5 rounded",
              view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {view === "kanban" ? (
        <KanbanBoard
          columns={columns}
          onLeadClick={(id) => router.push(`/leads/${id}`)}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            {/* Mobile Cards */}
            <div className="md:hidden divide-y">
              {filteredLeads.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No leads found
                </div>
              ) : (
                filteredLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="p-4 hover:bg-muted/50 cursor-pointer active:bg-muted"
                    onClick={() => router.push(`/leads/${lead.id}`)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="font-medium">{lead.name}</div>
                      <Badge variant={SOURCE_BADGE_VARIANT[lead.source] || "default"} className="text-xs shrink-0">
                        {lead.source.replace("_", " ")}
                      </Badge>
                    </div>
                    {lead.company && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                        <Building2 className="h-3 w-3" />
                        {lead.company}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                      {lead.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </span>
                      )}
                      {lead.estimatedValue && Number(lead.estimatedValue) > 0 && (
                        <span className="font-medium text-gold-deep">
                          {formatCurrency(Number(lead.estimatedValue))}
                        </span>
                      )}
                      <Badge variant="outline" className="text-[10px]">
                        {lead.pipelineStage}
                      </Badge>
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
                    <TableHead>Source</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        No leads found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLeads.map((lead) => (
                      <TableRow
                        key={lead.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/leads/${lead.id}`)}
                      >
                        <TableCell className="font-medium">{lead.name}</TableCell>
                        <TableCell>{lead.company || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={SOURCE_BADGE_VARIANT[lead.source] || "default"} className="text-xs">
                            {lead.source.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {lead.pipelineStage}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {lead.estimatedValue && Number(lead.estimatedValue) > 0
                            ? formatCurrency(Number(lead.estimatedValue))
                            : "—"}
                        </TableCell>
                        <TableCell>{lead.assignedTo?.name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(lead.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

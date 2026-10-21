"use client";

import { cn, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { User, Building2, IndianRupee, CalendarDays } from "lucide-react";

interface KanbanLead {
  id: string;
  name: string;
  company?: string | null;
  estimatedValue?: string | number | null;
  source: string;
  assignedTo?: { name: string } | null;
  createdAt: string | Date;
  phone?: string | null;
  email?: string | null;
}

interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  leads: KanbanLead[];
}

interface KanbanBoardProps {
  columns: KanbanColumn[];
  onLeadClick: (leadId: string) => void;
  onStatusChange: (leadId: string, newStatus: string) => void;
}

const SOURCE_COLORS: Record<string, string> = {
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

export function KanbanBoard({ columns, onLeadClick, onStatusChange }: KanbanBoardProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin -mx-4 px-4 md:mx-0 md:px-0">
      {columns.map((column) => (
        <div
          key={column.id}
          className="flex-shrink-0 w-[280px] md:w-[300px] flex flex-col max-h-[calc(100vh-220px)]"
        >
          <div className="flex items-center gap-2 mb-3 px-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: column.color }}
            />
            <h3 className="font-medium text-sm text-foreground">{column.title}</h3>
            <Badge variant="outline" className="ml-auto text-xs">
              {column.leads.length}
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin pr-1">
            {column.leads.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
                No leads
              </div>
            )}
            {column.leads.map((lead) => (
              <Card
                key={lead.id}
                className="p-3 cursor-pointer hover:shadow-md transition-shadow border-l-4 gap-1"
                style={{ borderLeftColor: column.color }}
                onClick={() => onLeadClick(lead.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium text-sm leading-tight truncate">
                    {lead.name}
                  </h4>
                  <Badge
                    variant={SOURCE_COLORS[lead.source] as "default" | "secondary" | "outline" | "destructive" | "success" | "warning" | "info" || "default"}
                    className="text-[10px] shrink-0"
                  >
                    {lead.source.replace("_", " ")}
                  </Badge>
                </div>

                {lead.company && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Building2 className="h-3 w-3" />
                    <span className="truncate">{lead.company}</span>
                  </div>
                )}

                <div className="flex items-center justify-between mt-2">
                  {lead.estimatedValue && Number(lead.estimatedValue) > 0 ? (
                    <div className="flex items-center gap-1 text-xs font-medium text-gold-deep">
                      <IndianRupee className="h-3 w-3" />
                      {formatCurrency(Number(lead.estimatedValue)).replace("₹", "")}
                    </div>
                  ) : (
                    <span />
                  )}

                  {lead.assignedTo ? (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span className="truncate max-w-[80px]">
                        {lead.assignedTo.name}
                      </span>
                    </div>
                  ) : (
                    <span />
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function buildKanbanColumns(
  leads: KanbanLead[],
  stages: Array<{ id: string; title: string; color: string }>
): KanbanColumn[] {
  return stages.map((stage) => ({
    ...stage,
    leads: leads.filter(
      (l) =>
        (l as unknown as { status: string }).status === stage.id ||
        (l as unknown as { pipelineStage: string }).pipelineStage === stage.title
    ),
  }));
}

export const DEFAULT_PIPELINE_STAGES = [
  { id: "NEW", title: "New", color: "#6366f1" },
  { id: "CONTACTED", title: "Contacted", color: "#8b5cf6" },
  { id: "QUALIFIED", title: "Qualified", color: "#0ea5e9" },
  { id: "PROPOSAL_SENT", title: "Proposal Sent", color: "#D4AF37" },
  { id: "NEGOTIATION", title: "Negotiation", color: "#f97316" },
  { id: "WON", title: "Won", color: "#22c55e" },
  { id: "LOST", title: "Lost", color: "#ef4444" },
];

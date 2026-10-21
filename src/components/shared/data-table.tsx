"use client";

import { cn } from "@/lib/utils";
import { EmptyState } from "./empty-state";
import { Package } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  emptyActionHref?: string;
  onRowClick?: (row: T) => void;
  rowKey?: (row: T) => string;
  className?: string;
}

function SkeletonRow({ colCount }: { colCount: number }) {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: colCount }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-muted rounded animate-pulse" style={{ width: `${50 + Math.random() * 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  emptyTitle = "No records found",
  emptyDescription = "There are no records to display yet.",
  emptyActionLabel,
  emptyActionHref,
  onRowClick,
  rowKey,
  className,
}: DataTableProps<T>) {
  if (!loading && data.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        actionHref={emptyActionHref}
      />
    );
  }

  return (
    <div className={cn("border rounded-xl overflow-hidden bg-card", className)}>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn("px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap", col.className)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={i} colCount={columns.length} />
                ))
              : data.map((row, idx) => (
                  <tr
                    key={rowKey ? rowKey(row) : idx}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      "border-b border-border last:border-0 transition-colors",
                      onRowClick && "cursor-pointer hover:bg-muted/50"
                    )}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={cn("px-4 py-3 whitespace-nowrap", col.className)}>
                        {col.render ? col.render(row) : (row[col.key] as React.ReactNode) ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

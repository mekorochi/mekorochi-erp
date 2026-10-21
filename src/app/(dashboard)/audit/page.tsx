import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { formatDateTime } from "@/lib/utils";
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
import { Shield } from "lucide-react";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; entityType?: string; action?: string; userId?: string }>;
}) {
  await requirePermission("audit:view");
  const params = await searchParams;

  const page = parseInt(params.page || "1");
  const perPage = 50;
  const skip = (page - 1) * perPage;

  const where: Record<string, unknown> = {};
  if (params.entityType) where.entityType = params.entityType;
  if (params.action) where.action = { contains: params.action };
  if (params.userId) where.userId = params.userId;

  const [events, total, users, entityTypes] = await Promise.all([
    prisma.auditEvent.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: perPage,
    }),
    prisma.auditEvent.count({ where }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.auditEvent.findMany({
      select: { entityType: true },
      distinct: ["entityType"],
    }),
  ]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold font-[family-name:var(--font-playfair)]">
          Audit Log
        </h1>
        <p className="text-muted-foreground mt-1">
          History of all sensitive actions and changes.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <form className="flex flex-col sm:flex-row gap-3" method="GET">
            <select
              name="entityType"
              defaultValue={params.entityType || ""}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              <option value="">All Entity Types</option>
              {entityTypes.map((et) => (
                <option key={et.entityType} value={et.entityType}>
                  {et.entityType}
                </option>
              ))}
            </select>
            <select
              name="userId"
              defaultValue={params.userId || ""}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              <option value="">All Users</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <input
              name="action"
              defaultValue={params.action || ""}
              placeholder="Filter by action..."
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium"
            >
              Filter
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {total} event{total !== 1 ? "s" : ""}
            {totalPages > 1 && (
              <span className="text-muted-foreground font-normal text-sm">
                — Page {page} of {totalPages}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No audit events found.
            </p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {formatDateTime(event.createdAt)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {event.user.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {event.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {event.entityType}
                          {event.entityId && (
                            <span className="text-muted-foreground ml-1 text-xs font-mono">
                              {event.entityId.slice(0, 8)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {event.after && (
                            <details className="text-xs">
                              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                View changes
                              </summary>
                              <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                                {JSON.stringify(event.after, null, 2)}
                              </pre>
                            </details>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {events.map((event) => (
                  <div key={event.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {event.action}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(event.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm">
                      <span className="font-medium">{event.user.name}</span>
                      {" → "}
                      <span className="text-muted-foreground">{event.entityType}</span>
                    </p>
                    {event.after && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground">
                          Details
                        </summary>
                        <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto max-h-24">
                          {JSON.stringify(event.after, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  {page > 1 && (
                    <a
                      href={`?page=${page - 1}${params.entityType ? `&entityType=${params.entityType}` : ""}${params.userId ? `&userId=${params.userId}` : ""}${params.action ? `&action=${params.action}` : ""}`}
                      className="inline-flex items-center h-9 px-3 rounded-md border text-sm hover:bg-muted"
                    >
                      Previous
                    </a>
                  )}
                  <span className="inline-flex items-center h-9 px-3 text-sm text-muted-foreground">
                    {page} / {totalPages}
                  </span>
                  {page < totalPages && (
                    <a
                      href={`?page=${page + 1}${params.entityType ? `&entityType=${params.entityType}` : ""}${params.userId ? `&userId=${params.userId}` : ""}${params.action ? `&action=${params.action}` : ""}`}
                      className="inline-flex items-center h-9 px-3 rounded-md border text-sm hover:bg-muted"
                    >
                      Next
                    </a>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

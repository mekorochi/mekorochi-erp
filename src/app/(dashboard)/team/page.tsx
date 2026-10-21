import { requirePermission, checkPermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserPlus, Users } from "lucide-react";
import { TeamActions } from "./team-actions";

const roleBadgeVariant: Record<string, string> = {
  OWNER: "default",
  ADMIN: "default",
  SALES: "info",
  INVENTORY: "secondary",
  PRODUCTION: "warning",
  FINANCE: "success",
  VIEWER: "outline",
};

export default async function TeamPage() {
  await requirePermission("team:view");
  const canManage = await checkPermission("team:manage");

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    include: { customRole: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold font-[family-name:var(--font-playfair)]">
            Team
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage users, roles, and access.
          </p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/team/invite">
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            {users.length} Team Member{users.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  {canManage && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          (roleBadgeVariant[user.role] || "outline") as "default"
                        }
                      >
                        {user.customRole?.name || user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.isActive ? "success" : "destructive"}
                        className="text-xs"
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.lastLoginAt
                        ? formatDateTime(user.lastLoginAt)
                        : "Never"}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <TeamActions
                          userId={user.id}
                          isActive={user.isActive}
                          role={user.role}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="border rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={user.isActive ? "success" : "destructive"}
                    className="text-xs"
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <Badge
                    variant={
                      (roleBadgeVariant[user.role] || "outline") as "default"
                    }
                  >
                    {user.customRole?.name || user.role}
                  </Badge>
                  {canManage && (
                    <TeamActions
                      userId={user.id}
                      isActive={user.isActive}
                      role={user.role}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

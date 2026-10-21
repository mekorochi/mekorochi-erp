import { requireUser } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { formatDateTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { MarkAllReadButton, MarkReadButton } from "./notification-actions";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const where: Record<string, unknown> = { userId: user.id };
  if (params.filter === "unread") where.isRead = false;

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, isRead: false },
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold font-[family-name:var(--font-playfair)]">
            Notifications
          </h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : "All caught up!"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={
              params.filter === "unread"
                ? "/notifications"
                : "/notifications?filter=unread"
            }
            className="inline-flex items-center h-9 px-3 rounded-md border text-sm hover:bg-muted"
          >
            {params.filter === "unread" ? "Show All" : "Unread Only"}
          </Link>
          {unreadCount > 0 && <MarkAllReadButton />}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No notifications{params.filter === "unread" ? " (unread)" : ""}.</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 flex items-start gap-3 transition-colors ${
                    !notif.isRead ? "bg-primary/[0.02]" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {!notif.isRead && (
                        <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                      <p className="font-medium text-sm truncate">
                        {notif.link ? (
                          <Link
                            href={notif.link}
                            className="hover:underline"
                          >
                            {notif.title}
                          </Link>
                        ) : (
                          notif.title
                        )}
                      </p>
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {notif.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {notif.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDateTime(notif.createdAt)}
                    </p>
                  </div>
                  {!notif.isRead && <MarkReadButton notificationId={notif.id} />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Check, CheckCheck } from "lucide-react";
import { markNotificationRead, markAllRead } from "./actions";

export function MarkReadButton({ notificationId }: { notificationId: string }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 flex-shrink-0"
      onClick={() => markNotificationRead(notificationId)}
    >
      <Check className="h-4 w-4" />
    </Button>
  );
}

export function MarkAllReadButton() {
  return (
    <Button variant="outline" size="sm" onClick={() => markAllRead()}>
      <CheckCheck className="h-4 w-4 mr-2" />
      Mark All Read
    </Button>
  );
}

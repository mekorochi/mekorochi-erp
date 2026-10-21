"use client";

import { useToast } from "@/hooks/use-toast";
import { ToastItem } from "./toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none max-sm:right-0 max-sm:px-4">
      {toasts.map((t) => (
        <ToastItem
          key={t.id}
          id={t.id}
          title={t.title}
          description={t.description}
          variant={t.variant}
          onDismiss={dismiss}
        />
      ))}
    </div>
  );
}

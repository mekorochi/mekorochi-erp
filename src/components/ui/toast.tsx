"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToastVariant } from "@/hooks/use-toast";

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border p-4 shadow-lg transition-all",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        success: "border-sage/30 bg-sage/10 text-sage-deep",
        error: "border-destructive/30 bg-destructive/10 text-destructive",
        warning: "border-gold/30 bg-gold/10 text-gold-deep",
        info: "border-blue-200 bg-blue-50 text-blue-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const iconMap: Record<ToastVariant, React.ReactNode> = {
  default: null,
  success: <CheckCircle2 className="h-5 w-5 text-sage shrink-0" />,
  error: <AlertCircle className="h-5 w-5 text-destructive shrink-0" />,
  warning: <AlertTriangle className="h-5 w-5 text-gold-deep shrink-0" />,
  info: <Info className="h-5 w-5 text-blue-600 shrink-0" />,
};

interface ToastProps extends VariantProps<typeof toastVariants> {
  id: string;
  title?: string;
  description?: string;
  onDismiss: (id: string) => void;
}

export function ToastItem({ id, title, description, variant = "default", onDismiss }: ToastProps) {
  return (
    <div className={cn(toastVariants({ variant }))}>
      {variant && iconMap[variant]}
      <div className="flex-1 space-y-1">
        {title && <p className="text-sm font-semibold">{title}</p>}
        {description && <p className="text-sm opacity-80">{description}</p>}
      </div>
      <button
        onClick={() => onDismiss(id)}
        className="shrink-0 rounded-md p-1 opacity-50 hover:opacity-100 transition-opacity"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export { toastVariants };

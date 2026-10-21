"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postInvoiceAction, voidInvoiceAction } from "../actions";
import { FileText, CheckCircle, XCircle, CreditCard, Download, FileX } from "lucide-react";
import Link from "next/link";

export default function InvoiceActions({
  invoiceId,
  status,
  canPost,
  canVoid,
  outstanding,
}: {
  invoiceId: string;
  status: string;
  canPost: boolean;
  canVoid: boolean;
  outstanding: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handlePost = async () => {
    if (!confirm("Post this invoice? Once posted, it becomes immutable.")) return;
    setLoading("post");
    const result = await postInvoiceAction(invoiceId);
    setLoading(null);
    if (result.error) alert(result.error);
    else router.refresh();
  };

  const handleVoid = async () => {
    if (!confirm("Void this invoice? This action cannot be undone.")) return;
    setLoading("void");
    const result = await voidInvoiceAction(invoiceId);
    setLoading(null);
    if (result.error) alert(result.error);
    else router.refresh();
  };

  return (
    <div className="flex flex-wrap gap-2">
      {canPost && (
        <button
          onClick={handlePost}
          disabled={loading === "post"}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          <CheckCircle className="h-4 w-4" />
          {loading === "post" ? "Posting..." : "Post Invoice"}
        </button>
      )}

      {outstanding > 0 && status !== "DRAFT" && status !== "VOID" && (
        <Link
          href={`/payments/new?invoiceId=${invoiceId}`}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <CreditCard className="h-4 w-4" />
          Record Payment
        </Link>
      )}

      {status !== "DRAFT" && status !== "VOID" && (
        <a
          href={`/api/invoices/${invoiceId}/pdf`}
          download
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </a>
      )}

      {canVoid && status !== "VOID" && status !== "CANCELLED" && outstanding > 0 && (
        <button
          onClick={handleVoid}
          disabled={loading === "void"}
          className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
        >
          <XCircle className="h-4 w-4" />
          {loading === "void" ? "Voiding..." : "Void"}
        </button>
      )}

      {status !== "DRAFT" && status !== "VOID" && (
        <Link
          href={`/invoices/new?creditNoteFor=${invoiceId}`}
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
        >
          <FileX className="h-4 w-4" />
          Credit Note
        </Link>
      )}
    </div>
  );
}

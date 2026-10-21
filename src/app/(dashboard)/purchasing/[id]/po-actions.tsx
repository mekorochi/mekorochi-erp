"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { approvePO } from "../actions";
import { CheckCircle } from "lucide-react";

interface Props {
  poId: string;
  canApprove: boolean;
}

export function POActions({ poId, canApprove }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleApprove = async () => {
    setLoading(true);
    setError("");
    const result = await approvePO(poId);
    if (result.error) setError(result.error);
    setLoading(false);
  };

  return (
    <div className="flex items-center gap-2">
      {canApprove && (
        <Button size="sm" onClick={handleApprove} disabled={loading}>
          <CheckCircle className="h-4 w-4 mr-2" />
          {loading ? "Approving..." : "Approve PO"}
        </Button>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

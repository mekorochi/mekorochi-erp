"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { deleteWarehouse } from "../actions";

interface Props {
  warehouseId: string;
  warehouseName: string;
}

export function DeleteWarehouseButton({ warehouseId, warehouseName }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm(`Delete warehouse "${warehouseName}"? This cannot be undone.`)) return;
    setLoading(true);
    setError(null);
    const result = await deleteWarehouse(warehouseId);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.refresh();
    }
  }

  return (
    <div>
      <Button variant="outline" size="sm" onClick={handleDelete} disabled={loading} className="text-destructive hover:text-destructive">
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
      </Button>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

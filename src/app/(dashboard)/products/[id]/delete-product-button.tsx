"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { deleteProduct } from "../actions";

export function DeleteProductButton({ productId, productName }: { productId: string; productName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (!confirm(`Delete "${productName}"? This cannot be undone.`)) return;
    setLoading(true);
    setError("");
    const result = await deleteProduct(productId);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/products");
    }
  }

  return (
    <div>
      <Button variant="outline" size="default" onClick={handleDelete} disabled={loading} className="text-destructive hover:text-destructive">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        Delete
      </Button>
      {error && (
        <p className="text-xs text-destructive mt-1 max-w-[200px]">{error}</p>
      )}
    </div>
  );
}

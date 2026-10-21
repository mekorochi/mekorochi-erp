"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleProductStatus } from "../../products/actions";

interface Props {
  productId: string;
  isActive: boolean;
}

export function ProductStatusToggle({ productId, isActive }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const result = await toggleProductStatus(productId);
      if (result.success) {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={isActive ? "outline" : "secondary"}
      onClick={handleToggle}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isActive ? (
        <Archive className="h-4 w-4" />
      ) : (
        <CheckCircle className="h-4 w-4" />
      )}
      {isActive ? "Deactivate" : "Activate"}
    </Button>
  );
}

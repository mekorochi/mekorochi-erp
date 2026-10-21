"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export default function TraceabilitySearch({
  initialLot,
}: {
  initialLot?: string;
}) {
  const router = useRouter();
  const [lotNumber, setLotNumber] = useState(initialLot || "");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (lotNumber.trim()) {
      router.push(`/production/traceability?lot=${encodeURIComponent(lotNumber.trim())}`);
    }
  }

  return (
    <form onSubmit={handleSearch} className="flex gap-2">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={lotNumber}
          onChange={(e) => setLotNumber(e.target.value)}
          placeholder="Enter lot number (e.g. LOT-20261022-001)"
          className="w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <button
        type="submit"
        disabled={!lotNumber.trim()}
        className="rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        Trace
      </button>
    </form>
  );
}

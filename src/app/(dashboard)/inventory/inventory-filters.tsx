"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { useCallback, useState } from "react";

interface Props {
  warehouses: Array<{ id: string; name: string; code: string }>;
}

export function InventoryFilters({ warehouses }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");

  const updateParams = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.push(`/inventory?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams("q", search || null);
  };

  const clearFilters = () => {
    setSearch("");
    router.push("/inventory");
  };

  const hasFilters = searchParams.toString().length > 0;

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <form onSubmit={handleSearch} className="flex-1 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search product name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline" size="icon" className="shrink-0">
          <Search className="h-4 w-4" />
        </Button>
      </form>

      <Select
        value={searchParams.get("warehouse") || ""}
        onValueChange={(v) => updateParams("warehouse", v === "all" ? null : v)}
      >
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="All Warehouses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Warehouses</SelectItem>
          {warehouses.map((w) => (
            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("type") || ""}
        onValueChange={(v) => updateParams("type", v === "all" ? null : v)}
      >
        <SelectTrigger className="w-full sm:w-[160px]">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="RAW_MATERIAL">Raw Material</SelectItem>
          <SelectItem value="PACKAGING">Packaging</SelectItem>
          <SelectItem value="FINISHED_GOOD">Finished Good</SelectItem>
          <SelectItem value="BUNDLE">Bundle</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant={searchParams.get("lowStock") === "true" ? "default" : "outline"}
        size="sm"
        className="shrink-0"
        onClick={() =>
          updateParams("lowStock", searchParams.get("lowStock") === "true" ? null : "true")
        }
      >
        Low Stock
      </Button>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0">
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}

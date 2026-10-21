"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useCallback } from "react";

interface ProductFiltersProps {
  categories: Array<{ id: string; name: string }>;
  currentSearch: string;
  currentType: string;
  currentCategory: string;
}

const productTypes = [
  { value: "", label: "All Types" },
  { value: "RAW_MATERIAL", label: "Raw Material" },
  { value: "PACKAGING", label: "Packaging" },
  { value: "FINISHED_GOOD", label: "Finished Good" },
  { value: "BUNDLE", label: "Bundle" },
  { value: "SERVICE", label: "Service" },
];

export function ProductFilters({ categories, currentSearch, currentType, currentCategory }: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(currentSearch);

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`/products?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleSearch = () => {
    updateParams("search", search);
  };

  const clearFilters = () => {
    setSearch("");
    router.push("/products");
  };

  const hasFilters = currentSearch || currentType || currentCategory;

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="pl-9"
        />
      </div>
      <select
        className="h-11 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        value={currentType}
        onChange={(e) => updateParams("type", e.target.value)}
      >
        {productTypes.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
      <select
        className="h-11 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        value={currentCategory}
        onChange={(e) => updateParams("category", e.target.value)}
      >
        <option value="">All Categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <Button variant="outline" onClick={handleSearch} className="sm:w-auto">
        Search
      </Button>
      {hasFilters && (
        <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear filters">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

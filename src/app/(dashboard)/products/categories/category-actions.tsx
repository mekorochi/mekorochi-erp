"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit2, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { createCategory, updateCategory, deleteCategory } from "../actions";

interface Props {
  mode: "create" | "edit";
  categoryId?: string;
  categoryData?: { name: string; description: string; parentId: string; sortOrder: number };
  categories: Array<{ id: string; name: string }>;
}

export function CategoryActions({ mode, categoryId, categoryData, categories }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState(categoryData?.name || "");
  const [description, setDescription] = useState(categoryData?.description || "");
  const [parentId, setParentId] = useState(categoryData?.parentId || "");
  const [sortOrder, setSortOrder] = useState(categoryData?.sortOrder || 0);

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const data = { name, description, parentId: parentId || undefined, sortOrder };
      const result = mode === "create"
        ? await createCategory(data)
        : await updateCategory(categoryId!, data);

      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!categoryId || !confirm("Are you sure you want to delete this category?")) return;
    setLoading(true);
    const result = await deleteCategory(categoryId);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.refresh();
    }
  };

  return (
    <div className="flex gap-1">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {mode === "create" ? (
            <Button>
              <Plus className="h-4 w-4" />
              Add Category
            </Button>
          ) : (
            <Button variant="ghost" size="icon">
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mode === "create" ? "New Category" : "Edit Category"}</DialogTitle>
          </DialogHeader>
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 text-sm">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <Label htmlFor="cat-name">Name *</Label>
              <Input
                id="cat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Category name"
              />
            </div>
            <div>
              <Label htmlFor="cat-desc">Description</Label>
              <Textarea
                id="cat-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="cat-parent">Parent Category</Label>
              <select
                id="cat-parent"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">None (Top Level)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="cat-sort">Sort Order</Label>
              <Input
                id="cat-sort"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "create" ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {mode === "edit" && (
        <Button variant="ghost" size="icon" onClick={handleDelete} disabled={loading} className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema, type ProductInput } from "@/lib/validators/products";
import { generateSlug } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Save, Loader2 } from "lucide-react";

interface ProductFormProps {
  initialData?: Partial<ProductInput> & { id?: string };
  categories: Array<{ id: string; name: string }>;
  onSubmit: (data: Record<string, unknown>) => Promise<{ error?: string; success?: boolean; productId?: string }>;
}

const productTypes = [
  { value: "RAW_MATERIAL", label: "Raw Material" },
  { value: "PACKAGING", label: "Packaging" },
  { value: "FINISHED_GOOD", label: "Finished Good" },
  { value: "BUNDLE", label: "Bundle" },
  { value: "SERVICE", label: "Service" },
];

const unitOptions = [
  { value: "PIECE", label: "Piece" },
  { value: "BOX", label: "Box" },
  { value: "GRAM", label: "Gram" },
  { value: "KILOGRAM", label: "Kilogram" },
  { value: "LITER", label: "Liter" },
  { value: "MILLILITER", label: "Milliliter" },
  { value: "METER", label: "Meter" },
  { value: "SET", label: "Set" },
];

export function ProductForm({ initialData, categories, onSubmit }: ProductFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema) as never,
    defaultValues: {
      name: initialData?.name || "",
      sku: initialData?.sku || "",
      barcode: initialData?.barcode || "",
      description: initialData?.description || "",
      categoryId: initialData?.categoryId || "",
      type: initialData?.type || "FINISHED_GOOD",
      unitOfMeasure: initialData?.unitOfMeasure || "PIECE",
      sellingPrice: initialData?.sellingPrice,
      costPrice: initialData?.costPrice,
      wholesalePrice: initialData?.wholesalePrice,
      corporatePrice: initialData?.corporatePrice,
      hsnCode: initialData?.hsnCode || "",
      taxRate: initialData?.taxRate,
      weight: initialData?.weight,
      weightUnit: initialData?.weightUnit || "g",
      shelfLifeDays: initialData?.shelfLifeDays,
      allergens: initialData?.allergens || "",
      ingredients: initialData?.ingredients || "",
      reorderLevel: initialData?.reorderLevel,
      minOrderQty: initialData?.minOrderQty,
      isBundle: initialData?.isBundle || false,
      isActive: initialData?.isActive ?? true,
    },
  });

  const name = watch("name");
  const selectedType = watch("type");
  const isBundle = selectedType === "BUNDLE";

  const autoGenerateSku = () => {
    if (name && !initialData?.id) {
      const slug = generateSlug(name).toUpperCase().replace(/-/g, "").slice(0, 8);
      const rand = Math.floor(Math.random() * 900 + 100);
      setValue("sku", `${slug}${rand}`);
    }
  };

  const doSubmit = async (data: ProductInput) => {
    setLoading(true);
    setError("");
    try {
      data.isBundle = data.type === "BUNDLE";
      const result = await onSubmit(data as Record<string, unknown>);
      if (result.error) {
        setError(result.error);
      } else if (result.productId) {
        router.push(`/products/${result.productId}`);
      } else {
        router.push("/products");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(doSubmit)} className="space-y-6 max-w-4xl">
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                {...register("name")}
                onBlur={autoGenerateSku}
                placeholder="e.g. Dark Chocolate Bar 72%"
              />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  {...register("sku")}
                  placeholder="e.g. DCB72-001"
                  className="font-mono"
                />
                {errors.sku && <p className="text-xs text-destructive mt-1">{errors.sku.message}</p>}
              </div>
              <div>
                <Label htmlFor="barcode">Barcode</Label>
                <Input id="barcode" {...register("barcode")} placeholder="Optional" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  {...register("type")}
                  className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {productTypes.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="unitOfMeasure">Unit of Measure</Label>
                <select
                  id="unitOfMeasure"
                  {...register("unitOfMeasure")}
                  className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {unitOptions.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="categoryId">Category</Label>
              <select
                id="categoryId"
                {...register("categoryId")}
                className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">No Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register("description")} rows={3} placeholder="Product description..." />
            </div>
          </CardContent>
        </Card>

        {/* Pricing & Tax */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pricing & Tax</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sellingPrice">Selling Price (₹)</Label>
                <Input id="sellingPrice" type="number" step="0.01" {...register("sellingPrice")} placeholder="0.00" />
              </div>
              <div>
                <Label htmlFor="costPrice">Cost Price (₹)</Label>
                <Input id="costPrice" type="number" step="0.01" {...register("costPrice")} placeholder="0.00" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="wholesalePrice">Wholesale Price (₹)</Label>
                <Input id="wholesalePrice" type="number" step="0.01" {...register("wholesalePrice")} placeholder="0.00" />
              </div>
              <div>
                <Label htmlFor="corporatePrice">Corporate Price (₹)</Label>
                <Input id="corporatePrice" type="number" step="0.01" {...register("corporatePrice")} placeholder="0.00" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hsnCode">HSN Code</Label>
                <Input id="hsnCode" {...register("hsnCode")} placeholder="e.g. 1806" />
              </div>
              <div>
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input id="taxRate" type="number" step="0.01" {...register("taxRate")} placeholder="e.g. 18" />
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-3">Product Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="weight">Weight</Label>
                  <div className="flex gap-2">
                    <Input id="weight" type="number" step="0.001" {...register("weight")} placeholder="0" className="flex-1" />
                    <select
                      {...register("weightUnit")}
                      className="w-16 h-11 rounded-lg border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                      <option value="ml">ml</option>
                      <option value="l">L</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="shelfLifeDays">Shelf Life (days)</Label>
                  <Input id="shelfLifeDays" type="number" {...register("shelfLifeDays")} placeholder="e.g. 180" />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="allergens">Allergens</Label>
              <Input id="allergens" {...register("allergens")} placeholder="e.g. Contains milk, soy, tree nuts" />
            </div>

            <div>
              <Label htmlFor="ingredients">Ingredients</Label>
              <Textarea id="ingredients" {...register("ingredients")} rows={2} placeholder="Ingredient list..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reorderLevel">Reorder Level</Label>
                <Input id="reorderLevel" type="number" step="0.001" {...register("reorderLevel")} placeholder="0" />
              </div>
              <div>
                <Label htmlFor="minOrderQty">Min Order Qty</Label>
                <Input id="minOrderQty" type="number" step="0.001" {...register("minOrderQty")} placeholder="0" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toggles */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Switch
              checked={watch("isActive")}
              onCheckedChange={(val) => setValue("isActive", val)}
            />
            <Label>Active</Label>
          </div>
          {isBundle && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-medium text-amber-800">Bundle Product</p>
              <p className="text-sm text-amber-700 mt-1">
                {initialData?.id
                  ? "Manage bundle components from the product detail page."
                  : "Save this product first, then add component products from the detail page."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {initialData?.id ? "Save Changes" : "Create Product"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

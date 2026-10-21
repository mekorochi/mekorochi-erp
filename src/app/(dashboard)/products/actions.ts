"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/db/prisma";
import { requirePermission, getCurrentUser } from "@/lib/auth";
import { createAuditEvent } from "@/lib/auth/audit";
import { productSchema, categorySchema } from "@/lib/validators/products";
import { generateSlug } from "@/lib/utils";

export async function createProduct(formData: Record<string, unknown>) {
  const user = await requirePermission("products:create");

  const parsed = productSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const data = parsed.data;
  const slug = generateSlug(data.name);

  const existingSku = await prisma.product.findUnique({ where: { sku: data.sku } });
  if (existingSku) {
    return { error: "A product with this SKU already exists" };
  }

  const existingSlug = await prisma.product.findUnique({ where: { slug } });
  const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

  const product = await prisma.product.create({
    data: {
      name: data.name,
      slug: finalSlug,
      sku: data.sku,
      barcode: data.barcode || null,
      description: data.description || null,
      categoryId: data.categoryId || null,
      type: data.type,
      unitOfMeasure: data.unitOfMeasure,
      sellingPrice: data.sellingPrice ?? null,
      costPrice: data.costPrice ?? null,
      wholesalePrice: data.wholesalePrice ?? null,
      corporatePrice: data.corporatePrice ?? null,
      hsnCode: data.hsnCode || null,
      taxRate: data.taxRate ?? null,
      weight: data.weight ?? null,
      weightUnit: data.weightUnit || "g",
      shelfLifeDays: data.shelfLifeDays ?? null,
      allergens: data.allergens || null,
      ingredients: data.ingredients || null,
      reorderLevel: data.reorderLevel ?? null,
      minOrderQty: data.minOrderQty ?? null,
      isBundle: data.isBundle,
      isActive: data.isActive,
    },
  });

  await createAuditEvent({
    userId: user.id,
    action: "product.create",
    entityType: "Product",
    entityId: product.id,
    after: { name: product.name, sku: product.sku, type: product.type },
  });

  revalidatePath("/products");
  return { success: true, productId: product.id };
}

export async function updateProduct(id: string, formData: Record<string, unknown>) {
  const user = await requirePermission("products:edit");

  const parsed = productSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const data = parsed.data;
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return { error: "Product not found" };

  if (data.sku !== existing.sku) {
    const dupe = await prisma.product.findFirst({ where: { sku: data.sku, id: { not: id } } });
    if (dupe) return { error: "A product with this SKU already exists" };
  }

  const before = { name: existing.name, sku: existing.sku, sellingPrice: existing.sellingPrice?.toString() };

  const product = await prisma.product.update({
    where: { id },
    data: {
      name: data.name,
      sku: data.sku,
      barcode: data.barcode || null,
      description: data.description || null,
      categoryId: data.categoryId || null,
      type: data.type,
      unitOfMeasure: data.unitOfMeasure,
      sellingPrice: data.sellingPrice ?? null,
      costPrice: data.costPrice ?? null,
      wholesalePrice: data.wholesalePrice ?? null,
      corporatePrice: data.corporatePrice ?? null,
      hsnCode: data.hsnCode || null,
      taxRate: data.taxRate ?? null,
      weight: data.weight ?? null,
      weightUnit: data.weightUnit || "g",
      shelfLifeDays: data.shelfLifeDays ?? null,
      allergens: data.allergens || null,
      ingredients: data.ingredients || null,
      reorderLevel: data.reorderLevel ?? null,
      minOrderQty: data.minOrderQty ?? null,
      isBundle: data.isBundle,
      isActive: data.isActive,
    },
  });

  await createAuditEvent({
    userId: user.id,
    action: "product.update",
    entityType: "Product",
    entityId: product.id,
    before,
    after: { name: product.name, sku: product.sku, sellingPrice: product.sellingPrice?.toString() },
  });

  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  return { success: true };
}

export async function toggleProductStatus(id: string) {
  const user = await requirePermission("products:edit");

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return { error: "Product not found" };

  await prisma.product.update({
    where: { id },
    data: { isActive: !product.isActive },
  });

  await createAuditEvent({
    userId: user.id,
    action: product.isActive ? "product.deactivate" : "product.activate",
    entityType: "Product",
    entityId: id,
  });

  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  return { success: true };
}

export async function deleteProduct(id: string) {
  const user = await requirePermission("products:delete");

  const usedInOrders = await prisma.orderItem.findFirst({ where: { productId: id } });
  if (usedInOrders) {
    return { error: "Cannot delete a product that has been used in orders. Deactivate it instead." };
  }

  const usedInInvoices = await prisma.invoiceItem.findFirst({ where: { productId: id } });
  if (usedInInvoices) {
    return { error: "Cannot delete a product that appears on invoices. Deactivate it instead." };
  }

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return { error: "Product not found" };

  await prisma.product.delete({ where: { id } });

  await createAuditEvent({
    userId: user.id,
    action: "product.delete",
    entityType: "Product",
    entityId: id,
    before: { name: product.name, sku: product.sku },
  });

  revalidatePath("/products");
  return { success: true };
}

export async function createCategory(formData: Record<string, unknown>) {
  const user = await requirePermission("products:create");

  const parsed = categorySchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const data = parsed.data;
  const slug = generateSlug(data.name);

  const existingSlug = await prisma.category.findUnique({ where: { slug } });
  const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

  const category = await prisma.category.create({
    data: {
      name: data.name,
      slug: finalSlug,
      description: data.description || null,
      parentId: data.parentId || null,
      sortOrder: data.sortOrder,
    },
  });

  revalidatePath("/products");
  revalidatePath("/products/categories");
  return { success: true, categoryId: category.id };
}

export async function updateCategory(id: string, formData: Record<string, unknown>) {
  const user = await requirePermission("products:edit");

  const parsed = categorySchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  await prisma.category.update({
    where: { id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      parentId: parsed.data.parentId || null,
      sortOrder: parsed.data.sortOrder,
    },
  });

  revalidatePath("/products");
  revalidatePath("/products/categories");
  return { success: true };
}

export async function deleteCategory(id: string) {
  const user = await requirePermission("products:delete");

  const productsCount = await prisma.product.count({ where: { categoryId: id } });
  if (productsCount > 0) {
    return { error: `Cannot delete: ${productsCount} products belong to this category` };
  }

  const childrenCount = await prisma.category.count({ where: { parentId: id } });
  if (childrenCount > 0) {
    return { error: "Cannot delete: this category has subcategories" };
  }

  await prisma.category.delete({ where: { id } });

  revalidatePath("/products/categories");
  return { success: true };
}

export async function updateBundleItems(productId: string, items: Array<{ productId: string; quantity: number }>) {
  const user = await requirePermission("products:edit");

  await prisma.$transaction(async (tx) => {
    await tx.bundleItem.deleteMany({ where: { bundleId: productId } });

    if (items.length > 0) {
      await tx.bundleItem.createMany({
        data: items.map((item, idx) => ({
          bundleId: productId,
          productId: item.productId,
          quantity: item.quantity,
          sortOrder: idx,
        })),
      });
    }
  });

  await createAuditEvent({
    userId: user.id,
    action: "product.bundle_update",
    entityType: "Product",
    entityId: productId,
    after: { items: items.length },
  });

  revalidatePath(`/products/${productId}`);
  return { success: true };
}

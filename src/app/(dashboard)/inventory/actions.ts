"use server";

import prisma from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth";
import { createAuditEvent } from "@/lib/auth/audit";
import { createStockMovement, createLotAndReceive, generateLotNumber } from "@/lib/services/inventory";
import { warehouseSchema, stockAdjustmentSchema, stockTransferSchema } from "@/lib/validators/inventory";
import { MovementType } from "@prisma/client";
import Decimal from "decimal.js";
import { revalidatePath } from "next/cache";

export async function adjustStock(_prev: unknown, formData: FormData) {
  const user = await requirePermission("inventory:adjust");

  const raw = {
    productId: formData.get("productId") as string,
    warehouseId: formData.get("warehouseId") as string,
    quantity: formData.get("quantity") as string,
    reason: formData.get("reason") as string,
    lotNumber: formData.get("lotNumber") as string || undefined,
    expiryDate: formData.get("expiryDate") as string || undefined,
    notes: formData.get("notes") as string || undefined,
  };

  const parsed = stockAdjustmentSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Validation failed" };
  }

  const data = parsed.data;
  const qty = new Decimal(data.quantity);
  const isPositive = qty.gt(0);
  const movementType = isPositive ? MovementType.ADJUSTMENT_IN : MovementType.ADJUSTMENT_OUT;

  try {
    if (data.lotNumber && isPositive) {
      await createLotAndReceive({
        productId: data.productId,
        warehouseId: data.warehouseId,
        quantity: qty.abs().toFixed(3),
        costPerUnit: "0",
        lotNumber: data.lotNumber,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
        referenceType: "Adjustment",
        referenceId: "manual",
        movementType,
        createdBy: user.id,
        notes: data.reason,
      });
    } else {
      await createStockMovement({
        movementType,
        productId: data.productId,
        warehouseId: data.warehouseId,
        quantity: qty.abs().toFixed(3),
        reason: data.reason,
        notes: data.notes,
        createdBy: user.id,
      });
    }

    await createAuditEvent({
      userId: user.id,
      action: "stock_adjustment",
      entityType: "StockItem",
      after: { ...data, adjustedBy: user.name },
    });

    revalidatePath("/inventory");
    return { success: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to adjust stock";
    return { error: message };
  }
}

export async function transferStock(_prev: unknown, formData: FormData) {
  const user = await requirePermission("inventory:transfer");

  const raw = {
    productId: formData.get("productId") as string,
    fromWarehouseId: formData.get("fromWarehouseId") as string,
    toWarehouseId: formData.get("toWarehouseId") as string,
    quantity: formData.get("quantity") as string,
    lotId: formData.get("lotId") as string || undefined,
    notes: formData.get("notes") as string || undefined,
  };

  const parsed = stockTransferSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Validation failed" };
  }

  const data = parsed.data;
  if (data.fromWarehouseId === data.toWarehouseId) {
    return { error: "Source and destination must be different" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await createStockMovement({
        movementType: MovementType.TRANSFER_OUT,
        productId: data.productId,
        warehouseId: data.fromWarehouseId,
        quantity: data.quantity.toString(),
        lotId: data.lotId,
        referenceType: "Transfer",
        referenceId: `${data.fromWarehouseId}->${data.toWarehouseId}`,
        notes: data.notes,
        createdBy: user.id,
      }, tx);

      await createStockMovement({
        movementType: MovementType.TRANSFER_IN,
        productId: data.productId,
        warehouseId: data.toWarehouseId,
        quantity: data.quantity.toString(),
        lotId: data.lotId,
        referenceType: "Transfer",
        referenceId: `${data.fromWarehouseId}->${data.toWarehouseId}`,
        notes: data.notes,
        createdBy: user.id,
      }, tx);
    });

    await createAuditEvent({
      userId: user.id,
      action: "stock_transfer",
      entityType: "StockItem",
      after: data as Record<string, unknown>,
    });

    revalidatePath("/inventory");
    return { success: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Transfer failed";
    return { error: message };
  }
}

export async function createWarehouse(_prev: unknown, formData: FormData) {
  const user = await requirePermission("settings:manage");

  const raw = {
    name: formData.get("name") as string,
    code: (formData.get("code") as string)?.toUpperCase(),
    type: formData.get("type") as string || "GENERAL",
    address: formData.get("address") as string || undefined,
    isDefault: formData.get("isDefault") === "true",
  };

  const parsed = warehouseSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Validation failed" };
  }

  try {
    const existing = await prisma.warehouse.findUnique({ where: { code: parsed.data.code } });
    if (existing) return { error: "Warehouse code already exists" };

    if (parsed.data.isDefault) {
      await prisma.warehouse.updateMany({ data: { isDefault: false } });
    }

    const warehouse = await prisma.warehouse.create({ data: parsed.data });

    await createAuditEvent({
      userId: user.id,
      action: "create_warehouse",
      entityType: "Warehouse",
      entityId: warehouse.id,
      after: parsed.data as Record<string, unknown>,
    });

    revalidatePath("/inventory/warehouses");
    return { success: true, id: warehouse.id };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to create warehouse";
    return { error: message };
  }
}

export async function updateWarehouse(_prev: unknown, formData: FormData) {
  const user = await requirePermission("settings:manage");
  const id = formData.get("id") as string;
  if (!id) return { error: "Warehouse ID required" };

  const raw = {
    name: formData.get("name") as string,
    code: (formData.get("code") as string)?.toUpperCase(),
    type: formData.get("type") as string || "GENERAL",
    address: formData.get("address") as string || undefined,
    isDefault: formData.get("isDefault") === "true",
  };

  const parsed = warehouseSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Validation failed" };
  }

  try {
    const existing = await prisma.warehouse.findFirst({
      where: { code: parsed.data.code, NOT: { id } },
    });
    if (existing) return { error: "Warehouse code already taken" };

    if (parsed.data.isDefault) {
      await prisma.warehouse.updateMany({ where: { NOT: { id } }, data: { isDefault: false } });
    }

    await prisma.warehouse.update({ where: { id }, data: parsed.data });

    await createAuditEvent({
      userId: user.id,
      action: "update_warehouse",
      entityType: "Warehouse",
      entityId: id,
      after: parsed.data as Record<string, unknown>,
    });

    revalidatePath("/inventory/warehouses");
    return { success: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to update warehouse";
    return { error: message };
  }
}

export async function recallLot(lotId: string) {
  const user = await requirePermission("inventory:approve_adjustment");

  try {
    const lot = await prisma.stockLot.findUnique({ where: { id: lotId } });
    if (!lot) return { error: "Lot not found" };
    if (lot.status === "RECALLED") return { error: "Lot is already recalled" };

    await prisma.$transaction(async (tx) => {
      await tx.stockLot.update({
        where: { id: lotId },
        data: { status: "RECALLED" },
      });

      const qty = new Decimal(lot.quantity.toString());
      if (qty.gt(0)) {
        await createStockMovement({
          movementType: MovementType.RECALL_HOLD,
          productId: lot.productId,
          warehouseId: lot.warehouseId,
          quantity: qty.toFixed(3),
          lotId: lot.id,
          reason: "Lot recalled",
          createdBy: user.id,
        }, tx);
      }
    });

    await createAuditEvent({
      userId: user.id,
      action: "recall_lot",
      entityType: "StockLot",
      entityId: lotId,
      after: { lotNumber: lot.lotNumber, status: "RECALLED" },
    });

    revalidatePath("/inventory/lots");
    return { success: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Recall failed";
    return { error: message };
  }
}

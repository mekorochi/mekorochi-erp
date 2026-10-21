"use server";

import prisma from "@/lib/db/prisma";
import { requirePermission, getCurrentUser } from "@/lib/auth";
import { createAuditEvent } from "@/lib/auth/audit";
import { bomSchema, productionOrderSchema } from "@/lib/validators/production";
import { createProductionOrder, startProduction, completeProduction } from "@/lib/services/production";
import { ProductionStatus, QCStatus, MovementType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import Decimal from "decimal.js";

export async function createBOMAction(formData: FormData) {
  const user = await requirePermission("production:create");

  const raw = {
    productId: formData.get("productId") as string,
    name: formData.get("name") as string,
    batchSize: formData.get("batchSize") as string,
    batchUnit: formData.get("batchUnit") as string,
    expectedYield: formData.get("expectedYield") as string,
    wastagePercent: formData.get("wastagePercent") as string,
    processStages: JSON.parse((formData.get("processStages") as string) || "[]"),
    notes: formData.get("notes") as string,
    items: JSON.parse((formData.get("items") as string) || "[]"),
  };

  const parsed = bomSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  try {
    const existingVersion = await prisma.bOM.findFirst({
      where: { productId: parsed.data.productId },
      orderBy: { version: "desc" },
    });

    const version = existingVersion ? existingVersion.version + 1 : 1;

    const bom = await prisma.bOM.create({
      data: {
        productId: parsed.data.productId,
        name: parsed.data.name,
        version,
        batchSize: new Decimal(parsed.data.batchSize).toFixed(3),
        batchUnit: parsed.data.batchUnit as any,
        expectedYield: parsed.data.expectedYield
          ? new Decimal(parsed.data.expectedYield).toFixed(2)
          : null,
        wastagePercent: parsed.data.wastagePercent
          ? new Decimal(parsed.data.wastagePercent).toFixed(2)
          : null,
        processStages: parsed.data.processStages,
        notes: parsed.data.notes,
        items: {
          create: parsed.data.items.map((item: any, idx: number) => ({
            productId: item.productId,
            quantity: new Decimal(item.quantity).toFixed(3),
            unit: item.unit || "GRAM",
            wastagePercent: item.wastagePercent
              ? new Decimal(item.wastagePercent).toFixed(2)
              : null,
            notes: item.notes,
            sortOrder: idx,
          })),
        },
      },
    });

    await createAuditEvent({
      userId: user.id,
      action: "CREATE",
      entityType: "BOM",
      entityId: bom.id,
      after: { name: bom.name, version },
    });

    revalidatePath("/production/recipes");
    return { success: true, id: bom.id };
  } catch (e: any) {
    return { error: e.message || "Failed to create recipe" };
  }
}

export async function createProductionOrderAction(formData: FormData) {
  const user = await requirePermission("production:create");

  const raw = {
    bomId: formData.get("bomId") as string,
    plannedQty: formData.get("plannedQty") as string,
    plannedDate: formData.get("plannedDate") as string,
    notes: formData.get("notes") as string,
  };

  const parsed = productionOrderSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  try {
    const order = await createProductionOrder({
      bomId: parsed.data.bomId,
      plannedQty: parsed.data.plannedQty,
      plannedDate: parsed.data.plannedDate,
      notes: parsed.data.notes,
      createdBy: user.id,
    });

    await createAuditEvent({
      userId: user.id,
      action: "CREATE",
      entityType: "ProductionOrder",
      entityId: order.id,
      after: { orderNumber: order.orderNumber },
    });

    revalidatePath("/production");
    return { success: true, id: order.id };
  } catch (e: any) {
    return { error: e.message || "Failed to create production order" };
  }
}

export async function updateProductionStatusAction(orderId: string, newStatus: string) {
  const user = await requirePermission("production:manage");

  const order = await prisma.productionOrder.findUnique({ where: { id: orderId } });
  if (!order) return { error: "Production order not found" };

  const validTransitions: Record<string, string[]> = {
    DRAFT: ["PLANNED", "CANCELLED"],
    PLANNED: ["APPROVED", "CANCELLED"],
    APPROVED: ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["QC_HOLD", "COMPLETED", "CANCELLED"],
    QC_HOLD: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
  };

  const allowed = validTransitions[order.status] || [];
  if (!allowed.includes(newStatus)) {
    return { error: `Cannot transition from ${order.status} to ${newStatus}` };
  }

  try {
    const updateData: any = { status: newStatus as ProductionStatus };

    if (newStatus === "IN_PROGRESS" && !order.startedAt) {
      updateData.startedAt = new Date();
    }
    if (newStatus === "CANCELLED" || newStatus === "COMPLETED") {
      updateData.completedAt = new Date();
    }

    await prisma.productionOrder.update({
      where: { id: orderId },
      data: updateData,
    });

    await createAuditEvent({
      userId: user.id,
      action: "STATUS_CHANGE",
      entityType: "ProductionOrder",
      entityId: orderId,
      before: { status: order.status },
      after: { status: newStatus },
    });

    revalidatePath(`/production/${orderId}`);
    revalidatePath("/production");
    return { success: true };
  } catch (e: any) {
    return { error: e.message || "Failed to update status" };
  }
}

export async function startProductionAction(orderId: string) {
  const user = await requirePermission("production:manage");
  try {
    await startProduction(orderId);
    await createAuditEvent({
      userId: user.id,
      action: "START_PRODUCTION",
      entityType: "ProductionOrder",
      entityId: orderId,
    });
    revalidatePath(`/production/${orderId}`);
    revalidatePath("/production");
    return { success: true };
  } catch (e: any) {
    return { error: e.message || "Failed to start production" };
  }
}

export async function completeProductionAction(orderId: string, formData: FormData) {
  const user = await requirePermission("production:manage");

  const consumptionsRaw = JSON.parse(
    (formData.get("consumptions") as string) || "[]"
  );

  try {
    await completeProduction(orderId, {
      actualQty: formData.get("actualQty") as string,
      wastageQty: (formData.get("wastageQty") as string) || undefined,
      wastageNotes: (formData.get("wastageNotes") as string) || undefined,
      outputLotNumber: (formData.get("outputLotNumber") as string) || undefined,
      expiryDate: formData.get("expiryDate")
        ? new Date(formData.get("expiryDate") as string)
        : undefined,
      warehouseId: formData.get("warehouseId") as string,
      consumptions: consumptionsRaw,
      userId: user.id,
    });

    await createAuditEvent({
      userId: user.id,
      action: "COMPLETE_PRODUCTION",
      entityType: "ProductionOrder",
      entityId: orderId,
    });

    revalidatePath(`/production/${orderId}`);
    revalidatePath("/production");
    revalidatePath("/inventory");
    return { success: true };
  } catch (e: any) {
    return { error: e.message || "Failed to complete production" };
  }
}

export async function qcCheckAction(
  orderId: string,
  status: "PASSED" | "FAILED" | "CONDITIONAL",
  notes: string
) {
  const user = await requirePermission("production:qc");

  try {
    const updateData: any = {
      qcStatus: status as QCStatus,
      qcNotes: notes,
      qcCheckedBy: user.id,
      qcCheckedAt: new Date(),
    };

    if (status === "PASSED" || status === "CONDITIONAL") {
      updateData.status = ProductionStatus.COMPLETED;
      updateData.completedAt = new Date();
    }

    await prisma.productionOrder.update({
      where: { id: orderId },
      data: updateData,
    });

    await createAuditEvent({
      userId: user.id,
      action: "QC_CHECK",
      entityType: "ProductionOrder",
      entityId: orderId,
      after: { qcStatus: status, qcNotes: notes },
    });

    revalidatePath(`/production/${orderId}`);
    revalidatePath("/production");
    return { success: true };
  } catch (e: any) {
    return { error: e.message || "Failed to record QC check" };
  }
}

export async function recallLotAction(lotId: string, reason: string) {
  const user = await requirePermission("production:manage");

  try {
    const lot = await prisma.stockLot.findUnique({ where: { id: lotId } });
    if (!lot) return { error: "Lot not found" };

    await prisma.$transaction(async (tx) => {
      await tx.stockLot.update({
        where: { id: lotId },
        data: { status: "RECALLED" },
      });

      if (new Decimal(lot.quantity.toString()).gt(0)) {
        await tx.stockMovement.create({
          data: {
            movementType: MovementType.RECALL_HOLD,
            productId: lot.productId,
            warehouseId: lot.warehouseId,
            lotId: lot.id,
            quantity: new Decimal(lot.quantity.toString()).neg().toFixed(3),
            reason,
            createdBy: user.id,
          },
        });

        await tx.stockItem.update({
          where: {
            productId_warehouseId: {
              productId: lot.productId,
              warehouseId: lot.warehouseId,
            },
          },
          data: {
            quantity: { decrement: parseFloat(lot.quantity.toString()) },
          },
        });
      }
    });

    await createAuditEvent({
      userId: user.id,
      action: "RECALL_LOT",
      entityType: "StockLot",
      entityId: lotId,
      after: { lotNumber: lot.lotNumber, reason },
    });

    revalidatePath("/production/traceability");
    revalidatePath("/inventory");
    return { success: true };
  } catch (e: any) {
    return { error: e.message || "Failed to recall lot" };
  }
}

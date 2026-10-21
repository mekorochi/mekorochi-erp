"use server";

import prisma from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth";
import { createAuditEvent } from "@/lib/auth/audit";
import { createLotAndReceive, generateLotNumber } from "@/lib/services/inventory";
import { getNextSequence, getCurrentFiscalYear } from "@/lib/services/sequence";
import { supplierSchema, purchaseOrderSchema, goodsReceiptSchema } from "@/lib/validators/purchasing";
import { MovementType, POStatus } from "@prisma/client";
import Decimal from "decimal.js";
import { revalidatePath } from "next/cache";

export async function createSupplier(_prev: unknown, formData: FormData) {
  const user = await requirePermission("purchasing:create");

  const raw = Object.fromEntries(formData.entries());
  const parsed = supplierSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Validation failed" };
  }

  try {
    const supplier = await prisma.supplier.create({ data: parsed.data });
    await createAuditEvent({
      userId: user.id,
      action: "create_supplier",
      entityType: "Supplier",
      entityId: supplier.id,
      after: parsed.data as Record<string, unknown>,
    });
    revalidatePath("/purchasing/suppliers");
    return { success: true, id: supplier.id };
  } catch {
    return { error: "Failed to create supplier" };
  }
}

export async function updateSupplier(_prev: unknown, formData: FormData) {
  const user = await requirePermission("purchasing:create");
  const id = formData.get("id") as string;
  if (!id) return { error: "Supplier ID required" };

  const raw = Object.fromEntries(formData.entries());
  delete (raw as Record<string, unknown>).id;
  const parsed = supplierSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Validation failed" };
  }

  try {
    await prisma.supplier.update({ where: { id }, data: parsed.data });
    await createAuditEvent({
      userId: user.id,
      action: "update_supplier",
      entityType: "Supplier",
      entityId: id,
      after: parsed.data as Record<string, unknown>,
    });
    revalidatePath("/purchasing/suppliers");
    return { success: true };
  } catch {
    return { error: "Failed to update supplier" };
  }
}

export async function createPurchaseOrder(data: {
  supplierId: string;
  expectedDate?: string;
  notes?: string;
  items: Array<{ productId: string; quantity: number; unitPrice: number; taxRate: number }>;
}) {
  const user = await requirePermission("purchasing:create");

  const parsed = purchaseOrderSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Validation failed" };
  }

  try {
    const settings = await prisma.companySettings.findFirst();
    const fy = getCurrentFiscalYear(settings?.financialYearStart || 4);
    const poNumber = await getNextSequence("purchase_order", settings?.poPrefix || "PO", fy);

    let subtotal = new Decimal(0);
    let totalTax = new Decimal(0);

    const items = parsed.data.items.map((item) => {
      const qty = new Decimal(item.quantity);
      const price = new Decimal(item.unitPrice);
      const rate = new Decimal(item.taxRate || 0);
      const lineTotal = qty.mul(price);
      const tax = lineTotal.mul(rate).div(100).toDecimalPlaces(2);
      subtotal = subtotal.plus(lineTotal);
      totalTax = totalTax.plus(tax);

      return {
        productId: item.productId,
        quantity: qty.toFixed(3),
        unitPrice: price.toFixed(4),
        taxRate: rate.toFixed(2),
        taxAmount: tax.toFixed(2),
        totalAmount: lineTotal.plus(tax).toDecimalPlaces(2).toFixed(2),
      };
    });

    const totalAmount = subtotal.plus(totalTax);

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: parsed.data.supplierId,
        status: POStatus.DRAFT,
        orderDate: new Date(),
        expectedDate: parsed.data.expectedDate ? new Date(parsed.data.expectedDate) : null,
        subtotal: subtotal.toFixed(2),
        taxAmount: totalTax.toFixed(2),
        totalAmount: totalAmount.toDecimalPlaces(2).toFixed(2),
        notes: parsed.data.notes,
        createdBy: user.id,
        items: { create: items },
      },
    });

    await createAuditEvent({
      userId: user.id,
      action: "create_purchase_order",
      entityType: "PurchaseOrder",
      entityId: po.id,
      after: { poNumber: po.poNumber, totalAmount: po.totalAmount.toString() },
    });

    revalidatePath("/purchasing");
    return { success: true, id: po.id };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to create purchase order";
    return { error: message };
  }
}

export async function approvePO(poId: string) {
  const user = await requirePermission("purchasing:approve");

  try {
    const po = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
    if (!po) return { error: "PO not found" };
    if (po.status !== POStatus.DRAFT && po.status !== POStatus.PENDING_APPROVAL) {
      return { error: "Only draft or pending POs can be approved" };
    }

    await prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        status: POStatus.APPROVED,
        approvedBy: user.id,
        approvedAt: new Date(),
      },
    });

    await createAuditEvent({
      userId: user.id,
      action: "approve_purchase_order",
      entityType: "PurchaseOrder",
      entityId: poId,
    });

    revalidatePath(`/purchasing/${poId}`);
    revalidatePath("/purchasing");
    return { success: true };
  } catch {
    return { error: "Failed to approve PO" };
  }
}

export async function receiveGoods(data: {
  purchaseOrderId: string;
  warehouseId: string;
  notes?: string;
  items: Array<{ productId: string; quantity: number; lotNumber?: string; expiryDate?: string }>;
}) {
  const user = await requirePermission("purchasing:receive");

  const parsed = goodsReceiptSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Validation failed" };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { id: parsed.data.purchaseOrderId },
        include: { items: true },
      });
      if (!po) throw new Error("PO not found");
      if (!([POStatus.APPROVED, POStatus.PARTIALLY_RECEIVED] as readonly POStatus[]).includes(po.status)) {
        throw new Error("PO must be approved before receiving");
      }

      const receiptNumber = await getNextSequence("goods_receipt", "GR");

      const receipt = await tx.goodsReceipt.create({
        data: {
          receiptNumber,
          purchaseOrderId: po.id,
          receivedDate: new Date(),
          notes: parsed.data.notes,
          createdBy: user.id,
          items: {
            create: parsed.data.items.map((item) => ({
              productId: item.productId,
              quantity: new Decimal(item.quantity).toFixed(3),
              lotNumber: item.lotNumber,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            })),
          },
        },
      });

      for (const item of parsed.data.items) {
        const poItem = po.items.find((pi) => pi.productId === item.productId);
        const unitCost = poItem ? new Decimal(poItem.unitPrice.toString()) : new Decimal(0);
        const lotNum = item.lotNumber || await generateLotNumber("PUR");

        await createLotAndReceive({
          productId: item.productId,
          warehouseId: parsed.data.warehouseId,
          quantity: item.quantity,
          costPerUnit: unitCost.toFixed(4),
          lotNumber: lotNum,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
          supplierId: po.supplierId,
          referenceType: "GoodsReceipt",
          referenceId: receipt.id,
          movementType: MovementType.PURCHASE_RECEIPT,
          createdBy: user.id,
        }, tx);

        if (poItem) {
          await tx.purchaseOrderItem.update({
            where: { id: poItem.id },
            data: {
              receivedQty: { increment: item.quantity },
            },
          });
        }
      }

      const updatedItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: po.id },
      });
      const allReceived = updatedItems.every(
        (item) => new Decimal(item.receivedQty.toString()).gte(new Decimal(item.quantity.toString()))
      );

      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: {
          status: allReceived ? POStatus.RECEIVED : POStatus.PARTIALLY_RECEIVED,
        },
      });

      await createAuditEvent({
        userId: user.id,
        action: "receive_goods",
        entityType: "GoodsReceipt",
        entityId: receipt.id,
        after: { poNumber: po.poNumber, receiptNumber, itemCount: parsed.data.items.length },
      });

      revalidatePath(`/purchasing/${po.id}`);
      revalidatePath("/purchasing");
      revalidatePath("/inventory");

      return { success: true, receiptId: receipt.id };
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to receive goods";
    return { error: message };
  }
}

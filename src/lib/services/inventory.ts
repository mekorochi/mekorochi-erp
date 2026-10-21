import prisma from "@/lib/db/prisma";
import { MovementType, type Prisma } from "@prisma/client";
import Decimal from "decimal.js";

export async function createStockMovement(
  params: {
    movementType: MovementType;
    productId: string;
    warehouseId: string;
    quantity: number | string;
    unitCost?: number | string;
    lotId?: string;
    referenceType?: string;
    referenceId?: string;
    reason?: string;
    notes?: string;
    createdBy: string;
  },
  tx?: Prisma.TransactionClient
) {
  const db = tx || prisma;
  const qty = new Decimal(params.quantity);
  const cost = params.unitCost ? new Decimal(params.unitCost) : null;
  const totalCost = cost ? qty.abs().mul(cost) : null;

  const isInbound = ([
    MovementType.PURCHASE_RECEIPT,
    MovementType.PRODUCTION_OUTPUT,
    MovementType.SALE_RETURN,
    MovementType.TRANSFER_IN,
    MovementType.ADJUSTMENT_IN,
    MovementType.OPENING_BALANCE,
    MovementType.RECALL_RELEASE,
  ] as readonly MovementType[]).includes(params.movementType);

  const isOutbound = ([
    MovementType.PRODUCTION_CONSUME,
    MovementType.SALE_DISPATCH,
    MovementType.TRANSFER_OUT,
    MovementType.ADJUSTMENT_OUT,
    MovementType.DAMAGE,
    MovementType.RECALL_HOLD,
  ] as readonly MovementType[]).includes(params.movementType);

  const signedQty = isOutbound ? qty.neg() : qty;

  const movement = await db.stockMovement.create({
    data: {
      movementType: params.movementType,
      productId: params.productId,
      warehouseId: params.warehouseId,
      lotId: params.lotId,
      quantity: signedQty.toFixed(3),
      unitCost: cost?.toFixed(4),
      totalCost: totalCost?.toFixed(2),
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      reason: params.reason,
      notes: params.notes,
      createdBy: params.createdBy,
    },
  });

  await db.stockItem.upsert({
    where: {
      productId_warehouseId: {
        productId: params.productId,
        warehouseId: params.warehouseId,
      },
    },
    create: {
      productId: params.productId,
      warehouseId: params.warehouseId,
      quantity: isInbound ? qty.toFixed(3) : "0",
      avgCost: cost?.toFixed(4) || "0",
    },
    update: {
      quantity: { increment: parseFloat(signedQty.toFixed(3)) },
    },
  });

  if (params.lotId) {
    await db.stockLot.update({
      where: { id: params.lotId },
      data: {
        quantity: { increment: parseFloat(signedQty.toFixed(3)) },
      },
    });
  }

  return movement;
}

export async function createLotAndReceive(
  params: {
    productId: string;
    warehouseId: string;
    quantity: number | string;
    costPerUnit: number | string;
    lotNumber: string;
    supplierLot?: string;
    expiryDate?: Date;
    manufactureDate?: Date;
    supplierId?: string;
    productionOrderId?: string;
    referenceType: string;
    referenceId: string;
    movementType: MovementType;
    createdBy: string;
    notes?: string;
  },
  tx?: Prisma.TransactionClient
) {
  const db = tx || prisma;

  const lot = await db.stockLot.create({
    data: {
      lotNumber: params.lotNumber,
      productId: params.productId,
      warehouseId: params.warehouseId,
      quantity: "0",
      costPerUnit: new Decimal(params.costPerUnit).toFixed(4),
      supplierLot: params.supplierLot,
      expiryDate: params.expiryDate,
      manufactureDate: params.manufactureDate,
      supplierId: params.supplierId,
      productionOrderId: params.productionOrderId,
      notes: params.notes,
    },
  });

  await createStockMovement({
    movementType: params.movementType,
    productId: params.productId,
    warehouseId: params.warehouseId,
    quantity: params.quantity,
    unitCost: params.costPerUnit,
    lotId: lot.id,
    referenceType: params.referenceType,
    referenceId: params.referenceId,
    createdBy: params.createdBy,
    notes: params.notes,
  }, db);

  return lot;
}

export async function reserveStock(
  productId: string,
  warehouseId: string,
  quantity: number | string,
  tx?: Prisma.TransactionClient
) {
  const db = tx || prisma;
  const qty = new Decimal(quantity);

  const stockItem = await db.stockItem.findUnique({
    where: { productId_warehouseId: { productId, warehouseId } },
  });

  if (!stockItem) throw new Error("Stock item not found");

  const available = new Decimal(stockItem.quantity.toString()).minus(new Decimal(stockItem.reservedQty.toString()));
  if (available.lt(qty)) {
    throw new Error(`Insufficient stock. Available: ${available.toFixed(3)}, Requested: ${qty.toFixed(3)}`);
  }

  await db.stockItem.update({
    where: { productId_warehouseId: { productId, warehouseId } },
    data: { reservedQty: { increment: parseFloat(qty.toFixed(3)) } },
  });
}

export async function releaseReservation(
  productId: string,
  warehouseId: string,
  quantity: number | string,
  tx?: Prisma.TransactionClient
) {
  const db = tx || prisma;
  const qty = new Decimal(quantity);

  await db.stockItem.update({
    where: { productId_warehouseId: { productId, warehouseId } },
    data: { reservedQty: { decrement: parseFloat(qty.toFixed(3)) } },
  });
}

export async function getAvailableStock(productId: string, warehouseId?: string) {
  const where: Prisma.StockItemWhereInput = { productId };
  if (warehouseId) where.warehouseId = warehouseId;

  const items = await prisma.stockItem.findMany({ where });
  return items.reduce((total, item) => {
    const available = new Decimal(item.quantity.toString()).minus(new Decimal(item.reservedQty.toString()));
    return total.plus(available);
  }, new Decimal(0));
}

export async function getLotsForPicking(
  productId: string,
  warehouseId: string,
  quantity: number | string
) {
  const lots = await prisma.stockLot.findMany({
    where: {
      productId,
      warehouseId,
      status: "AVAILABLE",
      quantity: { gt: 0 },
    },
    orderBy: [
      { expiryDate: "asc" },
      { receivedDate: "asc" },
    ],
  });

  const picks: Array<{ lotId: string; lotNumber: string; quantity: Decimal; expiryDate?: Date | null }> = [];
  let remaining = new Decimal(quantity);

  for (const lot of lots) {
    if (remaining.lte(0)) break;
    const available = new Decimal(lot.quantity.toString()).minus(new Decimal(lot.reservedQty.toString()));
    if (available.lte(0)) continue;

    const pickQty = Decimal.min(available, remaining);
    picks.push({
      lotId: lot.id,
      lotNumber: lot.lotNumber,
      quantity: pickQty,
      expiryDate: lot.expiryDate,
    });
    remaining = remaining.minus(pickQty);
  }

  return { picks, fulfilled: remaining.lte(0), shortfall: remaining.gt(0) ? remaining : new Decimal(0) };
}

export async function generateLotNumber(prefix: string = "LOT"): Promise<string> {
  const date = new Date();
  const dateStr = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, "0")}${date.getDate().toString().padStart(2, "0")}`;
  const count = await prisma.stockLot.count({
    where: { lotNumber: { startsWith: `${prefix}-${dateStr}` } },
  });
  return `${prefix}-${dateStr}-${(count + 1).toString().padStart(3, "0")}`;
}

import prisma from "@/lib/db/prisma";
import { ProductionStatus, MovementType } from "@prisma/client";
import Decimal from "decimal.js";
import { getNextSequence } from "./sequence";
import { createStockMovement, createLotAndReceive, generateLotNumber } from "./inventory";

export async function createProductionOrder(data: {
  bomId: string;
  plannedQty: number | string;
  plannedDate?: Date;
  notes?: string;
  createdBy: string;
}) {
  const orderNumber = await getNextSequence("production_order", "PRD");

  const bom = await prisma.bOM.findUnique({
    where: { id: data.bomId },
    include: { items: true },
  });
  if (!bom) throw new Error("Recipe not found");

  const multiplier = new Decimal(data.plannedQty).div(new Decimal(bom.batchSize.toString()));

  const consumptions = bom.items.map(item => {
    const plannedQty = new Decimal(item.quantity.toString()).mul(multiplier);
    const wastage = item.wastagePercent
      ? plannedQty.mul(new Decimal(item.wastagePercent.toString())).div(100)
      : new Decimal(0);
    return {
      productId: item.productId,
      plannedQty: plannedQty.plus(wastage).toDecimalPlaces(3).toFixed(3),
      unit: item.unit,
    };
  });

  return prisma.productionOrder.create({
    data: {
      orderNumber,
      bomId: data.bomId,
      status: ProductionStatus.DRAFT,
      plannedQty: new Decimal(data.plannedQty).toFixed(3),
      plannedDate: data.plannedDate,
      notes: data.notes,
      createdBy: data.createdBy,
      consumptions: { create: consumptions },
    },
    include: { bom: { include: { product: true, items: { include: { product: true } } } }, consumptions: true },
  });
}

export async function startProduction(orderId: string) {
  const order = await prisma.productionOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Production order not found");
  if (order.status !== ProductionStatus.PLANNED && order.status !== ProductionStatus.APPROVED) {
    throw new Error("Order must be planned or approved to start");
  }

  return prisma.productionOrder.update({
    where: { id: orderId },
    data: { status: ProductionStatus.IN_PROGRESS, startedAt: new Date() },
  });
}

export async function completeProduction(
  orderId: string,
  data: {
    actualQty: number | string;
    wastageQty?: number | string;
    wastageNotes?: string;
    outputLotNumber?: string;
    expiryDate?: Date;
    warehouseId: string;
    consumptions: Array<{ productId: string; lotId?: string; actualQty: number | string }>;
    userId: string;
  }
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.productionOrder.findUnique({
      where: { id: orderId },
      include: { bom: { include: { product: true } }, consumptions: true },
    });
    if (!order) throw new Error("Production order not found");
    if (order.status !== ProductionStatus.IN_PROGRESS) {
      throw new Error("Order must be in progress to complete");
    }

    const sourceWarehouse = await tx.warehouse.findFirst({
      where: { type: "RAW_MATERIALS", isActive: true },
    }) || await tx.warehouse.findFirst({ where: { isDefault: true } });

    if (!sourceWarehouse) throw new Error("No source warehouse found");

    for (const consumption of data.consumptions) {
      await createStockMovement({
        movementType: MovementType.PRODUCTION_CONSUME,
        productId: consumption.productId,
        warehouseId: sourceWarehouse.id,
        quantity: consumption.actualQty,
        lotId: consumption.lotId,
        referenceType: "ProductionOrder",
        referenceId: orderId,
        createdBy: data.userId,
      }, tx);

      await tx.productionConsumption.updateMany({
        where: { productionOrderId: orderId, productId: consumption.productId },
        data: { actualQty: new Decimal(consumption.actualQty).toFixed(3) },
      });
    }

    const lotNumber = data.outputLotNumber || await generateLotNumber("FG");
    const product = order.bom.product;
    const costPerUnit = data.consumptions.reduce((sum, c) => {
      return sum.plus(new Decimal(c.actualQty));
    }, new Decimal(0));

    const estimatedCost = product.costPrice
      ? new Decimal(product.costPrice.toString())
      : new Decimal(0);

    await createLotAndReceive({
      productId: order.bom.productId,
      warehouseId: data.warehouseId,
      quantity: data.actualQty,
      costPerUnit: estimatedCost.toFixed(4),
      lotNumber,
      expiryDate: data.expiryDate,
      manufactureDate: new Date(),
      productionOrderId: orderId,
      referenceType: "ProductionOrder",
      referenceId: orderId,
      movementType: MovementType.PRODUCTION_OUTPUT,
      createdBy: data.userId,
    }, tx);

    return tx.productionOrder.update({
      where: { id: orderId },
      data: {
        status: ProductionStatus.COMPLETED,
        actualQty: new Decimal(data.actualQty).toFixed(3),
        wastageQty: data.wastageQty ? new Decimal(data.wastageQty).toFixed(3) : null,
        wastageNotes: data.wastageNotes,
        outputLotNumber: lotNumber,
        completedAt: new Date(),
      },
    });
  });
}

export async function getTraceability(lotNumber: string) {
  const lot = await prisma.stockLot.findUnique({
    where: { lotNumber },
  });
  if (!lot) return null;

  const movements = await prisma.stockMovement.findMany({
    where: { lotId: lot.id },
    orderBy: { createdAt: "asc" },
  });

  const dispatches = movements.filter(m => m.movementType === MovementType.SALE_DISPATCH);
  const affectedOrders = dispatches.length > 0
    ? await prisma.salesOrder.findMany({
        where: { id: { in: dispatches.map(d => d.referenceId!).filter(Boolean) } },
        include: { customer: true },
      })
    : [];

  const productionInputMovements = movements.filter(m => m.movementType === MovementType.PRODUCTION_OUTPUT);
  const productionOrders = productionInputMovements.length > 0
    ? await prisma.productionOrder.findMany({
        where: { id: { in: productionInputMovements.map(m => m.referenceId!).filter(Boolean) } },
        include: { bom: { include: { product: true } } },
      })
    : [];

  return {
    lot,
    movements,
    affectedOrders,
    productionOrders,
  };
}

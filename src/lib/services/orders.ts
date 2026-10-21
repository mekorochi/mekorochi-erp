import prisma from "@/lib/db/prisma";
import { OrderStatus, PaymentState, type Prisma } from "@prisma/client";
import Decimal from "decimal.js";
import { getNextSequence, getCurrentFiscalYear } from "./sequence";
import { reserveStock, releaseReservation, createStockMovement } from "./inventory";

interface OrderItemData {
  productId: string;
  description?: string;
  quantity: number | string;
  unitPrice: number | string;
  discount?: number | string;
  taxRate?: number | string;
  hsnCode?: string;
}

function calculateOrderItem(item: OrderItemData) {
  const qty = new Decimal(item.quantity);
  const price = new Decimal(item.unitPrice);
  const discount = new Decimal(item.discount || 0);
  const taxRate = new Decimal(item.taxRate || 0);

  const lineTotal = qty.mul(price);
  const taxableAmount = lineTotal.minus(discount);
  const taxAmount = taxableAmount.mul(taxRate).div(100).toDecimalPlaces(2);
  const totalAmount = taxableAmount.plus(taxAmount);

  return {
    taxAmount: taxAmount.toFixed(2),
    totalAmount: totalAmount.toDecimalPlaces(2).toFixed(2),
  };
}

export async function createSalesOrder(data: {
  customerId: string;
  channel?: string;
  items: OrderItemData[];
  shippingAddress?: object;
  billingAddress?: object;
  giftNote?: string;
  notes?: string;
  discountAmount?: number | string;
  shippingAmount?: number | string;
  quotationId?: string;
  createdBy: string;
}) {
  const settings = await prisma.companySettings.findFirst();
  const fy = getCurrentFiscalYear(settings?.financialYearStart || 4);
  const orderNumber = await getNextSequence("sales_order", settings?.orderPrefix || "ORD", fy);

  let subtotal = new Decimal(0);
  let totalTax = new Decimal(0);

  const calculatedItems = data.items.map((item, idx) => {
    const calcs = calculateOrderItem(item);
    const qty = new Decimal(item.quantity);
    const price = new Decimal(item.unitPrice);
    const disc = new Decimal(item.discount || 0);
    const lineTotal = qty.mul(price).minus(disc);
    subtotal = subtotal.plus(lineTotal);
    totalTax = totalTax.plus(new Decimal(calcs.taxAmount));

    return {
      productId: item.productId,
      description: item.description,
      quantity: qty.toFixed(3),
      unitPrice: price.toFixed(2),
      discount: disc.toFixed(2),
      taxRate: new Decimal(item.taxRate || 0).toFixed(2),
      taxAmount: calcs.taxAmount,
      totalAmount: calcs.totalAmount,
      hsnCode: item.hsnCode,
      sortOrder: idx,
    };
  });

  const orderDiscount = new Decimal(data.discountAmount || 0);
  const shipping = new Decimal(data.shippingAmount || 0);
  const totalAmount = subtotal.minus(orderDiscount).plus(totalTax).plus(shipping);

  return prisma.salesOrder.create({
    data: {
      orderNumber,
      customerId: data.customerId,
      quotationId: data.quotationId,
      status: OrderStatus.DRAFT,
      paymentStatus: PaymentState.UNPAID,
      channel: data.channel || "Manual",
      subtotal: subtotal.toFixed(2),
      discountAmount: orderDiscount.toFixed(2),
      taxAmount: totalTax.toFixed(2),
      shippingAmount: shipping.toFixed(2),
      totalAmount: totalAmount.toDecimalPlaces(2).toFixed(2),
      shippingAddress: data.shippingAddress as Prisma.InputJsonValue,
      billingAddress: data.billingAddress as Prisma.InputJsonValue,
      giftNote: data.giftNote,
      notes: data.notes,
      createdBy: data.createdBy,
      items: { create: calculatedItems },
    },
    include: { items: true, customer: true },
  });
}

export async function confirmOrder(orderId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.salesOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new Error("Order not found");
    if (order.status !== OrderStatus.DRAFT) throw new Error("Only draft orders can be confirmed");

    const defaultWarehouse = await tx.warehouse.findFirst({ where: { isDefault: true } });
    if (!defaultWarehouse) throw new Error("No default warehouse configured");

    for (const item of order.items) {
      await reserveStock(item.productId, defaultWarehouse.id, item.quantity.toString(), tx);
    }

    return tx.salesOrder.update({
      where: { id: orderId },
      data: { status: OrderStatus.CONFIRMED },
      include: { items: true, customer: true },
    });
  });
}

export async function cancelOrder(orderId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.salesOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new Error("Order not found");
    if (([OrderStatus.DELIVERED, OrderStatus.CANCELLED] as readonly OrderStatus[]).includes(order.status)) {
      throw new Error("Cannot cancel this order");
    }

    if (([OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.PACKED] as readonly OrderStatus[]).includes(order.status)) {
      const defaultWarehouse = await tx.warehouse.findFirst({ where: { isDefault: true } });
      if (defaultWarehouse) {
        for (const item of order.items) {
          const unreservedQty = new Decimal(item.quantity.toString())
            .minus(new Decimal(item.fulfilledQty.toString()));
          if (unreservedQty.gt(0)) {
            await releaseReservation(item.productId, defaultWarehouse.id, unreservedQty.toFixed(3), tx);
          }
        }
      }
    }

    return tx.salesOrder.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
    });
  });
}

export async function updateOrderPaymentStatus(orderId: string, tx?: Prisma.TransactionClient) {
  const db = tx || prisma;
  const order = await db.salesOrder.findUnique({ where: { id: orderId } });
  if (!order) return;

  const payments = await db.payment.findMany({
    where: { orderId, status: "CONFIRMED" },
  });

  const totalPaid = payments.reduce(
    (sum, p) => sum.plus(new Decimal(p.amount.toString())),
    new Decimal(0)
  );

  const total = new Decimal(order.totalAmount.toString());
  let paymentStatus: PaymentState;

  if (totalPaid.gte(total)) paymentStatus = PaymentState.PAID;
  else if (totalPaid.gt(0)) paymentStatus = PaymentState.PARTIALLY_PAID;
  else paymentStatus = PaymentState.UNPAID;

  await db.salesOrder.update({
    where: { id: orderId },
    data: { paidAmount: totalPaid.toFixed(2), paymentStatus },
  });
}

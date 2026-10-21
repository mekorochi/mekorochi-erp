"use server";

import prisma from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth";
import { createAuditEvent } from "@/lib/auth/audit";
import { createSalesOrder, confirmOrder as confirmOrderSvc, cancelOrder as cancelOrderSvc, updateOrderPaymentStatus } from "@/lib/services/orders";
import { createStockMovement, generateLotNumber } from "@/lib/services/inventory";
import { getNextSequence } from "@/lib/services/sequence";
import { OrderStatus, MovementType } from "@prisma/client";
import Decimal from "decimal.js";
import { revalidatePath } from "next/cache";

export async function createOrder(formData: {
  customerId: string;
  channel?: string;
  notes?: string;
  giftNote?: string;
  discountAmount?: number;
  shippingAmount?: number;
  shippingAddress?: object;
  billingAddress?: object;
  items: Array<{
    productId: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    taxRate: number;
    hsnCode?: string;
  }>;
  recipients?: Array<{
    name: string;
    phone?: string;
    email?: string;
    address: string;
    city?: string;
    state?: string;
    pincode?: string;
    giftNote?: string;
    deliveryDate?: string;
    customization?: string;
  }>;
}) {
  const user = await requirePermission("orders:create");

  const order = await createSalesOrder({
    customerId: formData.customerId,
    channel: formData.channel,
    items: formData.items.map((i) => ({
      productId: i.productId,
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      discount: i.discount,
      taxRate: i.taxRate,
      hsnCode: i.hsnCode,
    })),
    shippingAddress: formData.shippingAddress,
    billingAddress: formData.billingAddress,
    giftNote: formData.giftNote,
    notes: formData.notes,
    discountAmount: formData.discountAmount,
    shippingAmount: formData.shippingAmount,
    createdBy: user.id,
  });

  if (formData.recipients && formData.recipients.length > 0) {
    await prisma.orderRecipient.createMany({
      data: formData.recipients.filter((r) => r.name && r.address).map((r) => ({
        orderId: order.id,
        name: r.name,
        phone: r.phone,
        email: r.email,
        address: r.address,
        city: r.city,
        state: r.state,
        pincode: r.pincode,
        giftNote: r.giftNote,
        deliveryDate: r.deliveryDate ? new Date(r.deliveryDate) : undefined,
        customization: r.customization,
      })),
    });
  }

  await createAuditEvent({
    userId: user.id,
    action: "CREATE",
    entityType: "SalesOrder",
    entityId: order.id,
    after: { orderNumber: order.orderNumber, customerId: formData.customerId },
  });

  revalidatePath("/orders");
  return { success: true, id: order.id, orderNumber: order.orderNumber };
}

export async function confirmOrder(orderId: string) {
  const user = await requirePermission("orders:edit");

  try {
    const order = await confirmOrderSvc(orderId, user.id);

    await createAuditEvent({
      userId: user.id,
      action: "CONFIRM",
      entityType: "SalesOrder",
      entityId: orderId,
      after: { status: "CONFIRMED" },
    });

    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/orders");
    return { success: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Failed to confirm order" };
  }
}

export async function updateOrderStatus(orderId: string, newStatus: string) {
  const user = await requirePermission("orders:edit");

  const order = await prisma.salesOrder.findUnique({ where: { id: orderId } });
  if (!order) return { error: "Order not found" };

  const validTransitions: Record<string, string[]> = {
    CONFIRMED: ["PREPARING", "CANCELLED"],
    PREPARING: ["PACKED", "CANCELLED"],
    PACKED: ["SHIPPED", "CANCELLED"],
    SHIPPED: ["DELIVERED"],
    DELIVERED: ["PARTIALLY_RETURNED", "RETURNED"],
  };

  const allowed = validTransitions[order.status] || [];
  if (!allowed.includes(newStatus)) {
    return { error: `Cannot transition from ${order.status} to ${newStatus}` };
  }

  await prisma.salesOrder.update({
    where: { id: orderId },
    data: { status: newStatus as OrderStatus },
  });

  await createAuditEvent({
    userId: user.id,
    action: "STATUS_CHANGE",
    entityType: "SalesOrder",
    entityId: orderId,
    before: { status: order.status },
    after: { status: newStatus },
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  return { success: true };
}

export async function cancelOrder(orderId: string) {
  const user = await requirePermission("orders:cancel");

  try {
    await cancelOrderSvc(orderId, user.id);

    await createAuditEvent({
      userId: user.id,
      action: "CANCEL",
      entityType: "SalesOrder",
      entityId: orderId,
      after: { status: "CANCELLED" },
    });

    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/orders");
    return { success: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Failed to cancel order" };
  }
}

export async function createFulfillment(data: {
  orderId: string;
  trackingNumber?: string;
  courierName?: string;
  notes?: string;
  items: Array<{ productId: string; quantity: number; lotId?: string }>;
}) {
  const user = await requirePermission("orders:fulfill");

  return prisma.$transaction(async (tx) => {
    const order = await tx.salesOrder.findUnique({
      where: { id: data.orderId },
      include: { items: true },
    });
    if (!order) throw new Error("Order not found");

    if (!["CONFIRMED", "PREPARING", "PACKED"].includes(order.status)) {
      throw new Error("Order is not in a fulfillable state");
    }

    const fulfillmentNumber = await getNextSequence("fulfillment", "FUL");

    const defaultWarehouse = await tx.warehouse.findFirst({ where: { isDefault: true } });
    if (!defaultWarehouse) throw new Error("No default warehouse configured");

    const fulfillment = await tx.fulfillment.create({
      data: {
        fulfillmentNumber,
        orderId: data.orderId,
        status: "PACKING",
        trackingNumber: data.trackingNumber,
        courierName: data.courierName,
        notes: data.notes,
        createdBy: user.id,
        items: {
          create: data.items.map((i) => ({
            productId: i.productId,
            quantity: new Decimal(i.quantity).toFixed(3),
            lotId: i.lotId,
          })),
        },
      },
    });

    for (const item of data.items) {
      await createStockMovement({
        movementType: MovementType.SALE_DISPATCH,
        productId: item.productId,
        warehouseId: defaultWarehouse.id,
        quantity: item.quantity,
        lotId: item.lotId,
        referenceType: "SalesOrder",
        referenceId: data.orderId,
        createdBy: user.id,
      }, tx);

      await tx.orderItem.updateMany({
        where: { orderId: data.orderId, productId: item.productId },
        data: { fulfilledQty: { increment: item.quantity } },
      });
    }

    const updatedItems = await tx.orderItem.findMany({ where: { orderId: data.orderId } });
    const allFulfilled = updatedItems.every(
      (i) => new Decimal(i.fulfilledQty.toString()).gte(new Decimal(i.quantity.toString()))
    );

    if (allFulfilled && order.status !== "SHIPPED" && order.status !== "DELIVERED") {
      await tx.salesOrder.update({
        where: { id: data.orderId },
        data: { status: OrderStatus.PACKED },
      });
    }

    await createAuditEvent({
      userId: user.id,
      action: "CREATE_FULFILLMENT",
      entityType: "Fulfillment",
      entityId: fulfillment.id,
      after: { orderId: data.orderId, fulfillmentNumber, itemCount: data.items.length },
    });

    revalidatePath(`/orders/${data.orderId}`);
    return { success: true, fulfillmentId: fulfillment.id };
  });
}

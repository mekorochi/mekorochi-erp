import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission("products:delete");

    const { productName } = await req.json();
    if (!productName) {
      return NextResponse.json({ error: "productName required" }, { status: 400 });
    }

    const product = await prisma.product.findFirst({
      where: { name: { contains: productName, mode: "insensitive" } },
      include: {
        bundleItems: true,
        _count: { select: { stockItems: true, orderItems: true, invoiceItems: true } },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const deleted: string[] = [];

      // Find all orders containing this product
      const orderItems = await tx.orderItem.findMany({
        where: { productId: product.id },
        select: { orderId: true },
      });
      const orderIds = [...new Set(orderItems.map((oi) => oi.orderId))];

      // For each order, delete all related data then the order itself
      for (const orderId of orderIds) {
        // Delete payments linked to these orders
        await tx.payment.deleteMany({ where: { orderId } });
        // Delete fulfillment items and fulfillments
        const fulfillments = await tx.fulfillment.findMany({ where: { orderId }, select: { id: true } });
        for (const f of fulfillments) {
          await tx.fulfillmentItem.deleteMany({ where: { fulfillmentId: f.id } });
        }
        await tx.fulfillment.deleteMany({ where: { orderId } });
        // Delete invoices and their items
        const invoices = await tx.invoice.findMany({ where: { orderId }, select: { id: true } });
        for (const inv of invoices) {
          await tx.invoiceItem.deleteMany({ where: { invoiceId: inv.id } });
        }
        await tx.invoice.deleteMany({ where: { orderId } });
        // Delete order items
        await tx.orderItem.deleteMany({ where: { orderId } });
        // Delete the order
        const order = await tx.salesOrder.delete({ where: { id: orderId } });
        deleted.push(`Order: ${order.orderNumber}`);
      }

      // Delete stock movements for this product
      const movementCount = await tx.stockMovement.deleteMany({ where: { productId: product.id } });
      if (movementCount.count > 0) deleted.push(`Stock movements: ${movementCount.count}`);

      // Delete stock lots
      const lotCount = await tx.stockLot.deleteMany({ where: { productId: product.id } });
      if (lotCount.count > 0) deleted.push(`Stock lots: ${lotCount.count}`);

      // Delete stock items
      const stockCount = await tx.stockItem.deleteMany({ where: { productId: product.id } });
      if (stockCount.count > 0) deleted.push(`Stock items: ${stockCount.count}`);

      // Delete bundle items (where this product is a bundle parent)
      await tx.bundleItem.deleteMany({ where: { bundleId: product.id } });
      // Delete bundle items (where this product is a child in other bundles)
      await tx.bundleItem.deleteMany({ where: { productId: product.id } });

      // Delete quote items referencing this product
      await tx.quoteItem.deleteMany({ where: { productId: product.id } });

      // Delete the product
      await tx.product.delete({ where: { id: product.id } });
      deleted.push(`Product: ${product.name} (${product.sku})`);

      return deleted;
    });

    return NextResponse.json({
      success: true,
      deletedBy: user.name,
      cleaned: result,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Cleanup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

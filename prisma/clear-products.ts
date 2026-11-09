import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Clearing products and all dependent data from production...");

  // Payment allocations reference invoices/payments
  await prisma.$executeRawUnsafe(`DELETE FROM payment_allocations`);
  await prisma.$executeRawUnsafe(`DELETE FROM payments`);

  // Invoice items reference products
  await prisma.$executeRawUnsafe(`DELETE FROM invoice_items`);
  await prisma.$executeRawUnsafe(`DELETE FROM invoices`);

  // Fulfillment items reference products
  await prisma.$executeRawUnsafe(`DELETE FROM fulfillment_items`);
  await prisma.$executeRawUnsafe(`DELETE FROM fulfillments`);

  // Order items/recipients reference products/orders
  await prisma.$executeRawUnsafe(`DELETE FROM order_recipients`);
  await prisma.$executeRawUnsafe(`DELETE FROM order_items`);
  await prisma.$executeRawUnsafe(`DELETE FROM sales_orders`);

  // Quote items reference products
  await prisma.$executeRawUnsafe(`DELETE FROM quote_recipients`);
  await prisma.$executeRawUnsafe(`DELETE FROM quote_items`);
  await prisma.$executeRawUnsafe(`DELETE FROM quotations`);

  // Purchasing
  await prisma.$executeRawUnsafe(`DELETE FROM goods_receipt_items`);
  await prisma.$executeRawUnsafe(`DELETE FROM goods_receipts`);
  await prisma.$executeRawUnsafe(`DELETE FROM purchase_order_items`);
  await prisma.$executeRawUnsafe(`DELETE FROM purchase_orders`);

  // Production
  await prisma.$executeRawUnsafe(`DELETE FROM production_consumptions`);
  await prisma.$executeRawUnsafe(`DELETE FROM production_orders`);

  // Inventory
  await prisma.$executeRawUnsafe(`DELETE FROM stock_movements`);
  await prisma.$executeRawUnsafe(`DELETE FROM stock_lots`);
  await prisma.$executeRawUnsafe(`DELETE FROM stock_items`);

  // Products and dependencies
  await prisma.$executeRawUnsafe(`DELETE FROM bundle_items`);
  await prisma.$executeRawUnsafe(`DELETE FROM product_variants`);
  await prisma.$executeRawUnsafe(`DELETE FROM bom_items`);
  await prisma.$executeRawUnsafe(`DELETE FROM boms`);
  await prisma.$executeRawUnsafe(`DELETE FROM products`);

  console.log("All products and dependent data cleared.");
}

main()
  .catch((e) => {
    console.error("Failed to clear products:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

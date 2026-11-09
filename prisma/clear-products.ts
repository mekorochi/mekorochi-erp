import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Clearing products and inventory from production...");

  // Clear in dependency order (children first)
  await prisma.$executeRawUnsafe(`DELETE FROM stock_movements`);
  await prisma.$executeRawUnsafe(`DELETE FROM stock_lots`);
  await prisma.$executeRawUnsafe(`DELETE FROM stock_items`);
  await prisma.$executeRawUnsafe(`DELETE FROM "BundleItem"`);
  await prisma.$executeRawUnsafe(`DELETE FROM "ProductVariant"`);
  await prisma.$executeRawUnsafe(`DELETE FROM "BOMItem"`);
  await prisma.$executeRawUnsafe(`DELETE FROM "ProductionConsumption"`);
  await prisma.$executeRawUnsafe(`DELETE FROM "BOM"`);
  await prisma.$executeRawUnsafe(`DELETE FROM products`);

  console.log("All products and inventory cleared.");
}

main()
  .catch((e) => {
    console.error("Failed to clear products:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

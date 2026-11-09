import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Clearing products and inventory from production...");

  await prisma.$executeRawUnsafe(`DELETE FROM stock_movements`);
  await prisma.$executeRawUnsafe(`DELETE FROM stock_lots`);
  await prisma.$executeRawUnsafe(`DELETE FROM stock_items`);
  await prisma.$executeRawUnsafe(`DELETE FROM bundle_items`);
  await prisma.$executeRawUnsafe(`DELETE FROM product_variants`);
  await prisma.$executeRawUnsafe(`DELETE FROM bom_items`);
  await prisma.$executeRawUnsafe(`DELETE FROM production_consumptions`);
  await prisma.$executeRawUnsafe(`DELETE FROM boms`);
  await prisma.$executeRawUnsafe(`DELETE FROM products`);

  console.log("All products and inventory cleared.");
}

main()
  .catch((e) => {
    console.error("Failed to clear products:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Clearing stock tables for schema migration...");
  await prisma.$executeRawUnsafe(`DELETE FROM stock_movements`);
  await prisma.$executeRawUnsafe(`DELETE FROM stock_lots`);
  await prisma.$executeRawUnsafe(`DELETE FROM stock_items`);
  console.log("Stock tables cleared.");
}

main()
  .catch((e) => {
    console.error("Failed to clear stock tables:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

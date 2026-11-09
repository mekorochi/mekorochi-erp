import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.expense.updateMany({
    where: { status: { not: "APPROVED" } },
    data: { status: "APPROVED", approvedAt: new Date() },
  });
  console.log(`Approved ${result.count} expenses`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

import prisma from "@/lib/db/prisma";

export async function getNextSequence(type: string, prefix: string, fiscalYear?: string): Promise<string> {
  const id = fiscalYear ? `${type}_${fiscalYear}` : type;

  const counter = await prisma.sequenceCounter.upsert({
    where: { id },
    create: { id, prefix, currentVal: 1, fiscalYear },
    update: { currentVal: { increment: 1 } },
  });

  const num = counter.currentVal.toString().padStart(5, "0");
  const fy = fiscalYear ? `${fiscalYear}/` : "";
  return `${prefix}-${fy}${num}`;
}

export function getCurrentFiscalYear(startMonth: number = 4): string {
  const now = new Date();
  const year = now.getMonth() + 1 >= startMonth ? now.getFullYear() : now.getFullYear() - 1;
  const nextYear = (year + 1).toString().slice(-2);
  return `${year}-${nextYear}`;
}

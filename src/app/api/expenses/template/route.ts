import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export async function GET() {
  try {
    await requirePermission("expenses:create");

    const categories = await prisma.expenseCategory.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    const categoryNames = categories.map((c) => c.name).join(", ");

    const header = "Date,Category,Description,Amount,Tax Amount,Vendor,Payment Method,Paid By,Department,Project,Payment Ref,Notes";
    const sample1 = "09/11/2026,Office Supplies,Printer paper and ink,2500,0,Krishna Stationery,UPI,Meet,Operations,,UPI-REF-001,Monthly office supplies";
    const sample2 = "09/11/2026,Travel,Ahmedabad to Mumbai flight,4500,810,IndiGo Airlines,CARD,Rahul,Sales,Client Visit,TXN-9876,Client meeting travel";
    const notes = [
      "",
      "# INSTRUCTIONS",
      "# - Date format: DD/MM/YYYY (or YYYY-MM-DD)",
      `# - Category must match exactly one of: ${categoryNames}`,
      "# - Amount: number without currency symbol",
      "# - Tax Amount: optional (default 0)",
      "# - Payment Method: CASH / UPI / BANK_TRANSFER / CARD / CHEQUE / OTHER (default CASH)",
      "# - Delete these instruction lines and sample rows before uploading",
    ];

    const csv = [header, sample1, sample2, ...notes].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="expense-upload-template.csv"',
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

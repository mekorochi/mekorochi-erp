"use server";

import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { createAuditEvent } from "@/lib/auth/audit";
import { expenseSchema } from "@/lib/validators/invoices";
import { getNextSequence, getCurrentFiscalYear } from "@/lib/services/sequence";
import { revalidatePath } from "next/cache";
import Decimal from "decimal.js";

const PAYMENT_METHODS = ["CASH", "UPI", "BANK_TRANSFER", "CARD", "CHEQUE", "OTHER"] as const;
type PaymentMethodType = typeof PAYMENT_METHODS[number];

export async function createExpenseAction(_prev: unknown, formData: FormData) {
  try {
    const user = await requirePermission("expenses:create");
    const raw = JSON.parse(formData.get("data") as string);
    const parsed = expenseSchema.parse(raw);

    const settings = await prisma.companySettings.findFirst();
    const fy = getCurrentFiscalYear(settings?.financialYearStart || 4);
    const expenseNumber = await getNextSequence("expense", "EXP", fy);

    const amount = new Decimal(parsed.amount);
    const taxAmount = new Decimal(parsed.taxAmount || 0);
    const totalAmount = amount.plus(taxAmount);

    const expense = await prisma.expense.create({
      data: {
        expenseNumber,
        categoryId: parsed.categoryId,
        amount: amount.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        description: parsed.description,
        vendor: parsed.vendor,
        department: parsed.department,
        project: parsed.project,
        paymentMethod: parsed.paymentMethod,
        paymentRef: parsed.paymentRef,
        paidBy: parsed.paidBy,
        expenseDate: parsed.expenseDate ? new Date(parsed.expenseDate) : new Date(),
        gstApplicable: parsed.gstApplicable,
        gstRate: parsed.gstRate ? new Decimal(parsed.gstRate).toFixed(2) : null,
        notes: parsed.notes,
        isRecurring: parsed.isRecurring,
        recurringPeriod: parsed.recurringPeriod,
        status: "PENDING",
        createdBy: user.id,
      },
    });

    await createAuditEvent({
      userId: user.id,
      action: "CREATE",
      entityType: "Expense",
      entityId: expense.id,
      after: { expenseNumber, amount: totalAmount.toFixed(2), category: parsed.categoryId },
    });

    revalidatePath("/expenses");
    return { success: true, expenseId: expense.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to create expense" };
  }
}

export async function updateExpenseAction(expenseId: string, data: Record<string, unknown>) {
  try {
    const user = await requirePermission("expenses:edit");
    const parsed = expenseSchema.parse(data);

    const existing = await prisma.expense.findUnique({ where: { id: expenseId } });
    if (!existing) return { error: "Expense not found" };
    // TEMPORARY: allow editing all statuses
    // if (existing.status !== "PENDING") return { error: "Only pending expenses can be edited" };

    const amount = new Decimal(parsed.amount);
    const taxAmount = new Decimal(parsed.taxAmount || 0);
    const totalAmount = amount.plus(taxAmount);

    await prisma.expense.update({
      where: { id: expenseId },
      data: {
        categoryId: parsed.categoryId,
        amount: amount.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        description: parsed.description,
        vendor: parsed.vendor || null,
        department: parsed.department || null,
        project: parsed.project || null,
        paymentMethod: parsed.paymentMethod,
        paymentRef: parsed.paymentRef || null,
        paidBy: parsed.paidBy || null,
        expenseDate: parsed.expenseDate ? new Date(parsed.expenseDate) : new Date(),
        gstApplicable: parsed.gstApplicable,
        gstRate: parsed.gstRate ? new Decimal(parsed.gstRate).toFixed(2) : null,
        notes: parsed.notes || null,
        isRecurring: parsed.isRecurring,
        recurringPeriod: parsed.recurringPeriod || null,
      },
    });

    await createAuditEvent({
      userId: user.id,
      action: "UPDATE",
      entityType: "Expense",
      entityId: expenseId,
      after: { amount: totalAmount.toFixed(2), category: parsed.categoryId },
    });

    revalidatePath("/expenses");
    revalidatePath(`/expenses/${expenseId}`);
    return { success: true, expenseId };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to update expense" };
  }
}

export async function approveExpenseAction(expenseId: string) {
  try {
    const user = await requirePermission("expenses:approve");
    const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
    if (!expense) return { error: "Expense not found" };
    if (expense.status !== "PENDING") return { error: "Only pending expenses can be approved" };

    await prisma.expense.update({
      where: { id: expenseId },
      data: { status: "APPROVED", approvedBy: user.id, approvedAt: new Date() },
    });

    await createAuditEvent({
      userId: user.id,
      action: "APPROVE",
      entityType: "Expense",
      entityId: expenseId,
      before: { status: "PENDING" },
      after: { status: "APPROVED" },
    });

    revalidatePath(`/expenses/${expenseId}`);
    revalidatePath("/expenses");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to approve expense" };
  }
}

export async function rejectExpenseAction(expenseId: string) {
  try {
    const user = await requirePermission("expenses:approve");
    const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
    if (!expense) return { error: "Expense not found" };
    if (expense.status !== "PENDING") return { error: "Only pending expenses can be rejected" };

    await prisma.expense.update({
      where: { id: expenseId },
      data: { status: "REJECTED", approvedBy: user.id, approvedAt: new Date() },
    });

    await createAuditEvent({
      userId: user.id,
      action: "REJECT",
      entityType: "Expense",
      entityId: expenseId,
      before: { status: "PENDING" },
      after: { status: "REJECTED" },
    });

    revalidatePath(`/expenses/${expenseId}`);
    revalidatePath("/expenses");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to reject expense" };
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ",") { result.push(current.trim()); current = ""; }
      else { current += ch; }
    }
  }
  result.push(current.trim());
  return result;
}

function parseDate(val: string): Date | null {
  if (!val) return null;
  const ddmmyyyy = val.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (ddmmyyyy) return new Date(parseInt(ddmmyyyy[3]), parseInt(ddmmyyyy[2]) - 1, parseInt(ddmmyyyy[1]));
  const yyyymmdd = val.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (yyyymmdd) return new Date(parseInt(yyyymmdd[1]), parseInt(yyyymmdd[2]) - 1, parseInt(yyyymmdd[3]));
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

export async function bulkUploadExpenses(csvText: string) {
  try {
    const user = await requirePermission("expenses:create");

    const categories = await prisma.expenseCategory.findMany({ where: { isActive: true } });
    const categoryMap = new Map<string, string>();
    for (const c of categories) {
      categoryMap.set(c.name.toLowerCase(), c.id);
    }

    const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return { error: "CSV must have a header row and at least one data row" };

    const header = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));

    const colIdx = (names: string[]) => {
      for (const n of names) {
        const i = header.indexOf(n);
        if (i >= 0) return i;
      }
      return -1;
    };

    const iDate = colIdx(["date", "expensedate"]);
    const iCategory = colIdx(["category", "categoryname"]);
    const iDesc = colIdx(["description"]);
    const iAmount = colIdx(["amount"]);
    const iTax = colIdx(["taxamount", "tax"]);
    const iVendor = colIdx(["vendor"]);
    const iPayMethod = colIdx(["paymentmethod", "payment"]);
    const iPaidBy = colIdx(["paidby"]);
    const iNotes = colIdx(["notes"]);
    const iDepartment = colIdx(["department"]);
    const iProject = colIdx(["project"]);
    const iPayRef = colIdx(["paymentref", "reference"]);

    if (iCategory < 0) return { error: "Missing required column: Category" };
    if (iDesc < 0) return { error: "Missing required column: Description" };
    if (iAmount < 0) return { error: "Missing required column: Amount" };

    const settings = await prisma.companySettings.findFirst();
    const fy = getCurrentFiscalYear(settings?.financialYearStart || 4);

    const errors: string[] = [];
    let created = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.every((c) => !c)) continue;

      const rowNum = i + 1;
      const catName = cols[iCategory] || "";
      const categoryId = categoryMap.get(catName.toLowerCase());
      if (!categoryId) { errors.push(`Row ${rowNum}: Unknown category "${catName}"`); continue; }

      const desc = cols[iDesc] || "";
      if (!desc) { errors.push(`Row ${rowNum}: Description is empty`); continue; }

      const amtStr = cols[iAmount]?.replace(/[^0-9.\-]/g, "") || "";
      const amt = parseFloat(amtStr);
      if (!amt || amt <= 0) { errors.push(`Row ${rowNum}: Invalid amount "${cols[iAmount]}"`); continue; }

      const taxStr = iTax >= 0 ? (cols[iTax]?.replace(/[^0-9.\-]/g, "") || "0") : "0";
      const taxAmt = parseFloat(taxStr) || 0;

      const payMethodRaw = iPayMethod >= 0 ? (cols[iPayMethod] || "").toUpperCase().replace(/\s+/g, "_") : "CASH";
      const paymentMethod = (PAYMENT_METHODS as readonly string[]).includes(payMethodRaw) ? payMethodRaw as PaymentMethodType : "CASH";

      const dateStr = iDate >= 0 ? cols[iDate] || "" : "";
      const expenseDate = parseDate(dateStr) || new Date();

      const amount = new Decimal(amt);
      const taxAmount = new Decimal(taxAmt);
      const totalAmount = amount.plus(taxAmount);

      try {
        const expenseNumber = await getNextSequence("expense", "EXP", fy);
        const expense = await prisma.expense.create({
          data: {
            expenseNumber,
            categoryId,
            amount: amount.toFixed(2),
            taxAmount: taxAmount.toFixed(2),
            totalAmount: totalAmount.toFixed(2),
            description: desc,
            vendor: iVendor >= 0 ? cols[iVendor] || null : null,
            department: iDepartment >= 0 ? cols[iDepartment] || null : null,
            project: iProject >= 0 ? cols[iProject] || null : null,
            paymentMethod,
            paymentRef: iPayRef >= 0 ? cols[iPayRef] || null : null,
            paidBy: iPaidBy >= 0 ? cols[iPaidBy] || null : null,
            expenseDate,
            status: "PENDING",
            createdBy: user.id,
          },
        });
        created++;

        await createAuditEvent({
          userId: user.id,
          action: "CREATE",
          entityType: "Expense",
          entityId: expense.id,
          after: { expenseNumber, amount: totalAmount.toFixed(2), source: "bulk_csv" },
        });
      } catch (e) {
        errors.push(`Row ${rowNum}: ${e instanceof Error ? e.message : "Failed to create"}`);
      }
    }

    revalidatePath("/expenses");
    return { success: true, created, errors: errors.length > 0 ? errors : undefined };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to process CSV" };
  }
}

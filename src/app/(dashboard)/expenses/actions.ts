"use server";

import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { createAuditEvent } from "@/lib/auth/audit";
import { expenseSchema } from "@/lib/validators/invoices";
import { getNextSequence, getCurrentFiscalYear } from "@/lib/services/sequence";
import { revalidatePath } from "next/cache";
import Decimal from "decimal.js";

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

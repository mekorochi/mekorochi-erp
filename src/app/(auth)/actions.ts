"use server";

import { redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import { authenticate, createSession } from "@/lib/auth";
import { hashPassword } from "@/lib/auth/password";
import { loginSchema, setupFullSchema } from "@/lib/validators/auth";
import { createAuditEvent } from "@/lib/auth/audit";

export type ActionResult = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

export async function loginAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: "Please check your input.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const user = await authenticate(parsed.data.email, parsed.data.password);
  if (!user) {
    return { error: "Invalid email or password." };
  }

  await createSession(user.id);
  await createAuditEvent({
    userId: user.id,
    action: "LOGIN",
    entityType: "User",
    entityId: user.id,
  });
  redirect("/dashboard");
}

export async function setupAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    return { error: "Setup has already been completed." };
  }

  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
    companyName: formData.get("companyName") as string || "MEKOROCHI",
    legalName: formData.get("legalName") as string || "",
    city: formData.get("city") as string || "",
    state: formData.get("state") as string || "",
    phone: formData.get("phone") as string || "",
    companyEmail: formData.get("companyEmail") as string || "",
    financialYearStart: Number(formData.get("financialYearStart")) || 4,
    currency: formData.get("currency") as string || "INR",
    timezone: formData.get("timezone") as string || "Asia/Kolkata",
  };

  const parsed = setupFullSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return {
      error: "Please fix the errors below.",
      fieldErrors: flat.fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;
  const passwordHash = await hashPassword(data.password);

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash,
        role: "OWNER",
      },
    });

    await tx.companySettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        companyName: data.companyName,
        legalName: data.legalName || null,
        city: data.city || null,
        state: data.state || null,
        phone: data.phone || null,
        email: data.companyEmail || null,
        financialYearStart: data.financialYearStart,
        currency: data.currency,
        timezone: data.timezone,
        isOnboarded: true,
      },
      update: {
        companyName: data.companyName,
        legalName: data.legalName || null,
        city: data.city || null,
        state: data.state || null,
        phone: data.phone || null,
        email: data.companyEmail || null,
        financialYearStart: data.financialYearStart,
        currency: data.currency,
        timezone: data.timezone,
        isOnboarded: true,
      },
    });

    // Seed default warehouses
    const defaultWarehouses = [
      { name: "Raw Materials", code: "WH-RAW", type: "RAW_MATERIALS" as const },
      { name: "Packaging", code: "WH-PKG", type: "PACKAGING" as const },
      { name: "Finished Goods", code: "WH-FG", type: "FINISHED_GOODS" as const, isDefault: true },
      { name: "Dispatch", code: "WH-DSP", type: "DISPATCH" as const },
    ];
    for (const wh of defaultWarehouses) {
      await tx.warehouse.create({ data: wh });
    }

    // Seed default expense categories
    const defaultCategories = [
      "Ingredients", "Packaging", "Logistics & Shipping", "Marketing & Ads",
      "Salaries & Wages", "Rent", "Utilities", "Software & Subscriptions",
      "Machinery & Equipment", "Travel", "Office Supplies", "Miscellaneous",
    ];
    for (const name of defaultCategories) {
      await tx.expenseCategory.create({ data: { name } });
    }

    await tx.auditEvent.create({
      data: {
        userId: newUser.id,
        action: "SETUP_COMPLETE",
        entityType: "System",
        entityId: "setup",
      },
    });

    return newUser;
  });

  await createSession(user.id);
  redirect("/dashboard");
}

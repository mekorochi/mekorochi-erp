"use server";

import { requirePermission, requireUser } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { createAuditEvent } from "@/lib/auth/audit";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { revalidatePath } from "next/cache";

export async function updateCompanySettings(formData: FormData) {
  const user = await requirePermission("settings:manage");

  const data = {
    companyName: formData.get("companyName") as string,
    legalName: formData.get("legalName") as string || null,
    tagline: formData.get("tagline") as string || null,
    email: formData.get("email") as string || null,
    phone: formData.get("phone") as string || null,
    website: formData.get("website") as string || null,
    addressLine1: formData.get("addressLine1") as string || null,
    addressLine2: formData.get("addressLine2") as string || null,
    city: formData.get("city") as string || null,
    state: formData.get("state") as string || null,
    pincode: formData.get("pincode") as string || null,
    mfgAddressLine1: formData.get("mfgAddressLine1") as string || null,
    mfgAddressLine2: formData.get("mfgAddressLine2") as string || null,
    mfgCity: formData.get("mfgCity") as string || null,
    mfgState: formData.get("mfgState") as string || null,
    mfgPincode: formData.get("mfgPincode") as string || null,
    gstin: formData.get("gstin") as string || null,
    pan: formData.get("pan") as string || null,
    fssaiNumber: formData.get("fssaiNumber") as string || null,
    cin: formData.get("cin") as string || null,
    bankName: formData.get("bankName") as string || null,
    bankAccountName: formData.get("bankAccountName") as string || null,
    bankAccountNumber: formData.get("bankAccountNumber") as string || null,
    bankIfsc: formData.get("bankIfsc") as string || null,
    bankBranch: formData.get("bankBranch") as string || null,
    upiId: formData.get("upiId") as string || null,
    signatureUrl: formData.get("signatureUrl") as string || null,
  };

  if (!data.companyName) return { error: "Company name is required" };

  await prisma.companySettings.upsert({
    where: { id: "default" },
    create: { ...data },
    update: data,
  });

  await createAuditEvent({
    userId: user.id,
    action: "UPDATE_COMPANY_SETTINGS",
    entityType: "CompanySettings",
    entityId: "default",
    after: data as Record<string, unknown>,
  });

  revalidatePath("/settings/company");
  return { success: true };
}

export async function updateTaxSettings(formData: FormData) {
  const user = await requirePermission("settings:manage");

  const data = {
    invoicePrefix: formData.get("invoicePrefix") as string || "INV",
    orderPrefix: formData.get("orderPrefix") as string || "ORD",
    quotePrefix: formData.get("quotePrefix") as string || "QUO",
    poPrefix: formData.get("poPrefix") as string || "PO",
    creditNotePrefix: formData.get("creditNotePrefix") as string || "CN",
    debitNotePrefix: formData.get("debitNotePrefix") as string || "DN",
    financialYearStart: parseInt(formData.get("financialYearStart") as string) || 4,
    defaultTaxRate: formData.get("defaultTaxRate") ? parseFloat(formData.get("defaultTaxRate") as string) : null,
    termsAndConditions: formData.get("termsAndConditions") as string || null,
    invoiceNotes: formData.get("invoiceNotes") as string || null,
  };

  await prisma.companySettings.upsert({
    where: { id: "default" },
    create: { ...data },
    update: data,
  });

  await createAuditEvent({
    userId: user.id,
    action: "UPDATE_TAX_SETTINGS",
    entityType: "CompanySettings",
    entityId: "default",
    after: data as Record<string, unknown>,
  });

  revalidatePath("/settings/tax");
  return { success: true };
}

export async function updateSmtpSettings(formData: FormData) {
  const user = await requirePermission("settings:manage");

  const data = {
    smtpHost: formData.get("smtpHost") as string || null,
    smtpPort: formData.get("smtpPort") ? parseInt(formData.get("smtpPort") as string) : null,
    smtpUser: formData.get("smtpUser") as string || null,
    smtpPassword: formData.get("smtpPassword") as string || null,
    smtpFromEmail: formData.get("smtpFromEmail") as string || null,
    smtpFromName: formData.get("smtpFromName") as string || null,
  };

  await prisma.companySettings.upsert({
    where: { id: "default" },
    create: { ...data },
    update: data,
  });

  await createAuditEvent({
    userId: user.id,
    action: "UPDATE_SMTP_SETTINGS",
    entityType: "CompanySettings",
    entityId: "default",
  });

  revalidatePath("/settings/integrations");
  return { success: true };
}

export async function updateProfileAction(formData: FormData) {
  try {
    const user = await requireUser();
    const name = (formData.get("name") as string)?.trim();
    const phone = (formData.get("phone") as string)?.trim() || null;

    if (!name) return { error: "Name is required" };

    await prisma.user.update({
      where: { id: user.id },
      data: { name, phone },
    });

    await createAuditEvent({
      userId: user.id,
      action: "UPDATE_PROFILE",
      entityType: "User",
      entityId: user.id,
      before: { name: user.name, phone: user.phone },
      after: { name, phone },
    });

    revalidatePath("/settings/profile");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to update profile" };
  }
}

export async function changePasswordAction(formData: FormData) {
  try {
    const user = await requireUser();
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;

    if (!currentPassword || !newPassword) {
      return { error: "Both current and new password are required" };
    }
    if (newPassword.length < 8) {
      return { error: "New password must be at least 8 characters" };
    }

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      return { error: "Current password is incorrect" };
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    await createAuditEvent({
      userId: user.id,
      action: "CHANGE_PASSWORD",
      entityType: "User",
      entityId: user.id,
    });

    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to change password" };
  }
}

export async function updateSignatureAction(url: string | null) {
  const user = await requirePermission("settings:manage");

  await prisma.companySettings.upsert({
    where: { id: "default" },
    create: { signatureUrl: url },
    update: { signatureUrl: url },
  });

  await createAuditEvent({
    userId: user.id,
    action: "UPDATE_SIGNATURE",
    entityType: "CompanySettings",
    entityId: "default",
    after: { signatureUrl: url } as Record<string, unknown>,
  });

  revalidatePath("/settings/company");
  return { success: true };
}

export async function updateIntegration(formData: FormData) {
  const user = await requirePermission("integrations:manage");

  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const configStr = formData.get("config") as string;
  const isActive = formData.get("isActive") === "true";

  if (!name || !type) return { error: "Name and type are required" };

  let config = {};
  try {
    config = configStr ? JSON.parse(configStr) : {};
  } catch {
    return { error: "Invalid configuration format" };
  }

  await prisma.integrationConfig.upsert({
    where: { name },
    create: { name, type, config, isActive },
    update: { config, isActive, lastError: null },
  });

  await createAuditEvent({
    userId: user.id,
    action: "UPDATE_INTEGRATION",
    entityType: "IntegrationConfig",
    after: { name, type, isActive } as Record<string, unknown>,
  });

  revalidatePath("/settings/integrations");
  return { success: true };
}

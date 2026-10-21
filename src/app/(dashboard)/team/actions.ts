"use server";

import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createAuditEvent } from "@/lib/auth/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

export async function createUser(formData: FormData) {
  const user = await requirePermission("team:manage");

  const name = formData.get("name") as string;
  const email = (formData.get("email") as string)?.toLowerCase();
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;

  if (!name || !email || !password || !role) {
    return { error: "All fields are required" };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "A user with this email already exists" };
  }

  const validRoles = ["ADMIN", "SALES", "INVENTORY", "PRODUCTION", "FINANCE", "VIEWER"];
  if (!validRoles.includes(role)) {
    return { error: "Invalid role" };
  }

  const passwordHash = await hashPassword(password);

  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: role as "ADMIN" | "SALES" | "INVENTORY" | "PRODUCTION" | "FINANCE" | "VIEWER",
    },
  });

  await createAuditEvent({
    userId: user.id,
    action: "CREATE_USER",
    entityType: "User",
    entityId: newUser.id,
    after: { name, email, role },
  });

  revalidatePath("/team");
  redirect("/team");
}

export async function toggleUserStatus(userId: string) {
  const admin = await requirePermission("team:manage");

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "User not found" };
  if (target.role === "OWNER") return { error: "Cannot deactivate owner" };

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: !target.isActive },
  });

  await createAuditEvent({
    userId: admin.id,
    action: target.isActive ? "DEACTIVATE_USER" : "ACTIVATE_USER",
    entityType: "User",
    entityId: userId,
  });

  revalidatePath("/team");
}

export async function resetUserPassword(userId: string) {
  const admin = await requirePermission("team:manage");

  const tempPassword = uuidv4().slice(0, 12);
  const passwordHash = await hashPassword(tempPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  await createAuditEvent({
    userId: admin.id,
    action: "RESET_PASSWORD",
    entityType: "User",
    entityId: userId,
  });

  revalidatePath("/team");
  return { tempPassword };
}

export async function updateUserRole(userId: string, role: string) {
  const admin = await requirePermission("team:roles");

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "User not found" };
  if (target.role === "OWNER") return { error: "Cannot change owner role" };

  const validRoles = ["ADMIN", "SALES", "INVENTORY", "PRODUCTION", "FINANCE", "VIEWER"];
  if (!validRoles.includes(role)) return { error: "Invalid role" };

  await prisma.user.update({
    where: { id: userId },
    data: { role: role as "ADMIN" | "SALES" | "INVENTORY" | "PRODUCTION" | "FINANCE" | "VIEWER" },
  });

  await createAuditEvent({
    userId: admin.id,
    action: "UPDATE_USER_ROLE",
    entityType: "User",
    entityId: userId,
    before: { role: target.role },
    after: { role },
  });

  revalidatePath("/team");
}

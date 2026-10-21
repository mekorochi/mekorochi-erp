import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import prisma from "@/lib/db/prisma";
import { verifyPassword } from "./password";
import { hasPermission, type Permission } from "./permissions";

const SESSION_COOKIE = "mekorochi_session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function createSession(userId: string, request?: { ip?: string; userAgent?: string }) {
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE);

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
      ipAddress: request?.ip || null,
      userAgent: request?.userAgent || null,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });

  return token;
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { include: { customRole: true } } },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } });
    }
    return null;
  }

  if (!session.user.isActive) return null;

  return session;
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePermission(permission: Permission) {
  const user = await requireUser();
  const customPerms = user.customRole?.permissions as Record<string, boolean> | undefined;
  if (!hasPermission(user.role, permission, customPerms)) {
    redirect("/unauthorized");
  }
  return user;
}

export async function checkPermission(permission: Permission): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const customPerms = user.customRole?.permissions as Record<string, boolean> | undefined;
  return hasPermission(user.role, permission, customPerms);
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function authenticate(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.isActive) return null;
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;
  return user;
}

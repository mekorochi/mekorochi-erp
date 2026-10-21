"use server";

import { requireUser } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";

export async function markNotificationRead(notificationId: string) {
  const user = await requireUser();

  await prisma.notification.updateMany({
    where: { id: notificationId, userId: user.id },
    data: { isRead: true },
  });

  revalidatePath("/notifications");
}

export async function markAllRead() {
  const user = await requireUser();

  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });

  revalidatePath("/notifications");
}

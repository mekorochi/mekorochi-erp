import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import prisma from "@/lib/db/prisma";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "settings:manage")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const url = body.url || null;

    await prisma.companySettings.upsert({
      where: { id: "default" },
      create: { signatureUrl: url },
      update: { signatureUrl: url },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to save signature" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import prisma from "@/lib/db/prisma";

export const config = {
  maxDuration: 30,
};

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "settings:manage")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const text = await request.text();
    if (text.length > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "Payload too large. Use a smaller image (under 500KB)." }, { status: 413 });
    }

    const body = JSON.parse(text);
    const url = body.url || null;

    await prisma.companySettings.upsert({
      where: { id: "default" },
      create: { signatureUrl: url },
      update: { signatureUrl: url },
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to save signature";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

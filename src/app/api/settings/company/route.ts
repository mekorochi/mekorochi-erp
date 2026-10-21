import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import prisma from "@/lib/db/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "settings:view")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.companySettings.findFirst();
  if (!settings) {
    return NextResponse.json({});
  }

  return NextResponse.json(settings);
}

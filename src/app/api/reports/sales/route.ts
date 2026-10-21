import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import prisma from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "reports:view")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const from = params.get("from")
    ? new Date(params.get("from")!)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = params.get("to") ? new Date(params.get("to")! + "T23:59:59") : new Date();

  const orders = await prisma.salesOrder.findMany({
    where: {
      orderDate: { gte: from, lte: to },
      status: { not: "CANCELLED" },
    },
    include: {
      items: { include: { product: true } },
      customer: true,
    },
  });

  // By product
  const productMap = new Map<string, { name: string; revenue: number; quantity: number }>();
  for (const o of orders) {
    for (const item of o.items) {
      const name = item.product?.name || item.description || "Unknown";
      const existing = productMap.get(name) || { name, revenue: 0, quantity: 0 };
      existing.revenue += Number(item.totalAmount);
      existing.quantity += Number(item.quantity);
      productMap.set(name, existing);
    }
  }
  const byProduct = Array.from(productMap.values()).sort(
    (a, b) => b.revenue - a.revenue
  );

  // By channel
  const channelMap = new Map<string, { channel: string; count: number; revenue: number }>();
  for (const o of orders) {
    const ch = o.channel || "Manual";
    const existing = channelMap.get(ch) || { channel: ch, count: 0, revenue: 0 };
    existing.count += 1;
    existing.revenue += Number(o.totalAmount);
    channelMap.set(ch, existing);
  }
  const byChannel = Array.from(channelMap.values()).sort(
    (a, b) => b.revenue - a.revenue
  );

  // By customer
  const custMap = new Map<string, { name: string; orders: number; revenue: number }>();
  for (const o of orders) {
    const name = o.customer?.name || "Unknown";
    const existing = custMap.get(name) || { name, orders: 0, revenue: 0 };
    existing.orders += 1;
    existing.revenue += Number(o.totalAmount);
    custMap.set(name, existing);
  }
  const byCustomer = Array.from(custMap.values()).sort(
    (a, b) => b.revenue - a.revenue
  );

  // Funnel
  const funnel = { draft: 0, confirmed: 0, shipped: 0, delivered: 0 };
  for (const o of orders) {
    if (o.status === "DRAFT") funnel.draft++;
    else if (o.status === "CONFIRMED" || o.status === "PREPARING" || o.status === "PACKED")
      funnel.confirmed++;
    else if (o.status === "SHIPPED") funnel.shipped++;
    else if (o.status === "DELIVERED") funnel.delivered++;
  }

  const totalRevenue = orders.reduce((s, o) => s + Number(o.totalAmount), 0);

  return NextResponse.json({
    byProduct,
    byChannel,
    byCustomer,
    funnel,
    totals: {
      revenue: totalRevenue,
      orders: orders.length,
      avgOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
    },
  });
}

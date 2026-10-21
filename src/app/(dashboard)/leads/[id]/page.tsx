import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import { LeadDetailClient } from "./lead-detail-client";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("leads:view");
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true } },
      activities: {
        include: {
          creator: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!lead) notFound();

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  return (
    <LeadDetailClient
      lead={JSON.parse(JSON.stringify(lead))}
      users={users}
      currentUserId={user.id}
    />
  );
}

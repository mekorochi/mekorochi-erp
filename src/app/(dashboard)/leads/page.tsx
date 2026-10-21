import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { LeadsPageClient } from "./leads-client";

export default async function LeadsPage() {
  const user = await requirePermission("leads:view");

  const leads = await prisma.lead.findMany({
    include: {
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  return (
    <LeadsPageClient
      leads={JSON.parse(JSON.stringify(leads))}
      users={users}
      currentUserId={user.id}
    />
  );
}

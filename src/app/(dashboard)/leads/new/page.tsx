import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { LeadForm } from "@/components/shared/lead-form";

export default async function NewLeadPage() {
  await requirePermission("leads:create");

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display">New Lead</h1>
        <p className="text-sm text-muted-foreground">
          Add a new lead to the pipeline
        </p>
      </div>
      <LeadForm users={users} />
    </div>
  );
}

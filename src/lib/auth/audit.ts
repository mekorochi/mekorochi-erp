import prisma from "@/lib/db/prisma";

export async function createAuditEvent(params: {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
}) {
  return prisma.auditEvent.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      before: params.before ? (params.before as object) : undefined,
      after: params.after ? (params.after as object) : undefined,
      ipAddress: params.ipAddress,
    },
  });
}

"use server";

import prisma from "@/lib/db/prisma";
import { requirePermission, requireUser } from "@/lib/auth";
import { createAuditEvent } from "@/lib/auth/audit";
import { leadSchema, leadActivitySchema, leadStatusUpdateSchema } from "@/lib/validators/leads";
import { revalidatePath } from "next/cache";

export async function createLead(formData: Record<string, unknown>) {
  const user = await requirePermission("leads:create");
  const parsed = leadSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  try {
    const lead = await prisma.lead.create({
      data: {
        ...parsed.data,
        tags: parsed.data.tags ? (parsed.data.tags as string[]) : undefined,
      },
    });

    await createAuditEvent({
      userId: user.id,
      action: "lead.create",
      entityType: "Lead",
      entityId: lead.id,
      after: parsed.data as Record<string, unknown>,
    });

    revalidatePath("/leads");
    return { success: true, id: lead.id };
  } catch (err: unknown) {
    return { error: (err as Error).message || "Failed to create lead" };
  }
}

export async function updateLead(id: string, formData: Record<string, unknown>) {
  const user = await requirePermission("leads:edit");
  const parsed = leadSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  try {
    const before = await prisma.lead.findUnique({ where: { id } });
    const lead = await prisma.lead.update({
      where: { id },
      data: {
        ...parsed.data,
        tags: parsed.data.tags ? (parsed.data.tags as string[]) : undefined,
      },
    });

    await createAuditEvent({
      userId: user.id,
      action: "lead.update",
      entityType: "Lead",
      entityId: lead.id,
      before: before as unknown as Record<string, unknown>,
      after: parsed.data as Record<string, unknown>,
    });

    revalidatePath(`/leads/${id}`);
    revalidatePath("/leads");
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error).message || "Failed to update lead" };
  }
}

export async function updateLeadStatus(
  id: string,
  data: { status: string; pipelineStage?: string; lostReason?: string }
) {
  const user = await requirePermission("leads:edit");
  const parsed = leadStatusUpdateSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  try {
    const before = await prisma.lead.findUnique({ where: { id } });

    const updateData: Record<string, unknown> = {
      status: parsed.data.status,
      pipelineStage: parsed.data.pipelineStage || parsed.data.status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    };

    if (parsed.data.status === "WON") {
      updateData.wonDate = new Date();
    } else if (parsed.data.status === "LOST") {
      updateData.lostDate = new Date();
      updateData.lostReason = parsed.data.lostReason;
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: updateData as Record<string, string | Date>,
    });

    await prisma.leadActivity.create({
      data: {
        leadId: id,
        type: "STATUS_CHANGE",
        subject: `Status changed to ${parsed.data.status}`,
        notes: parsed.data.lostReason
          ? `Reason: ${parsed.data.lostReason}`
          : undefined,
        createdBy: user.id,
        completedAt: new Date(),
      },
    });

    await createAuditEvent({
      userId: user.id,
      action: "lead.status_change",
      entityType: "Lead",
      entityId: id,
      before: { status: before?.status },
      after: { status: parsed.data.status },
    });

    revalidatePath(`/leads/${id}`);
    revalidatePath("/leads");
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error).message || "Failed to update lead status" };
  }
}

export async function addLeadActivity(data: Record<string, unknown>) {
  const user = await requireUser();
  const parsed = leadActivitySchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  try {
    await prisma.leadActivity.create({
      data: {
        ...parsed.data,
        createdBy: user.id,
      },
    });

    revalidatePath(`/leads/${parsed.data.leadId}`);
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error).message || "Failed to add activity" };
  }
}

export async function convertLeadToCustomer(leadId: string) {
  const user = await requirePermission("leads:edit");

  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return { error: "Lead not found" };
    if (lead.customerId) return { error: "Lead already converted to customer" };

    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          name: lead.name,
          company: lead.company,
          type: lead.company ? "CORPORATE" : "INDIVIDUAL",
          email: lead.email,
          phone: lead.phone,
          channel: lead.source,
          notes: lead.notes,
        },
      });

      await tx.lead.update({
        where: { id: leadId },
        data: {
          customerId: customer.id,
          status: "WON",
          pipelineStage: "Won",
          wonDate: new Date(),
        },
      });

      await tx.leadActivity.create({
        data: {
          leadId,
          type: "STATUS_CHANGE",
          subject: "Converted to customer",
          notes: `Customer record created: ${customer.name}`,
          createdBy: user.id,
          completedAt: new Date(),
        },
      });

      return customer;
    });

    await createAuditEvent({
      userId: user.id,
      action: "lead.convert",
      entityType: "Lead",
      entityId: leadId,
      after: { customerId: result.id },
    });

    revalidatePath(`/leads/${leadId}`);
    revalidatePath("/leads");
    revalidatePath("/customers");
    return { success: true, customerId: result.id };
  } catch (err: unknown) {
    return { error: (err as Error).message || "Failed to convert lead" };
  }
}

export async function assignLead(leadId: string, userId: string) {
  const user = await requirePermission("leads:assign");

  try {
    const before = await prisma.lead.findUnique({ where: { id: leadId } });
    await prisma.lead.update({
      where: { id: leadId },
      data: { assignedToId: userId || null },
    });

    await prisma.leadActivity.create({
      data: {
        leadId,
        type: "STATUS_CHANGE",
        subject: userId ? "Lead assigned" : "Lead unassigned",
        createdBy: user.id,
        completedAt: new Date(),
      },
    });

    await createAuditEvent({
      userId: user.id,
      action: "lead.assign",
      entityType: "Lead",
      entityId: leadId,
      before: { assignedToId: before?.assignedToId },
      after: { assignedToId: userId },
    });

    revalidatePath(`/leads/${leadId}`);
    revalidatePath("/leads");
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error).message || "Failed to assign lead" };
  }
}

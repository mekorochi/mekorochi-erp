"use server";

import prisma from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth";
import { createAuditEvent } from "@/lib/auth/audit";
import { customerSchema, customerAddressSchema, customerContactSchema } from "@/lib/validators/customers";
import { revalidatePath } from "next/cache";

export async function createCustomer(formData: Record<string, unknown>) {
  const user = await requirePermission("customers:create");
  const parsed = customerSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  try {
    const customer = await prisma.customer.create({
      data: {
        ...parsed.data,
        tags: parsed.data.tags ? (parsed.data.tags as string[]) : undefined,
      },
    });

    await createAuditEvent({
      userId: user.id,
      action: "customer.create",
      entityType: "Customer",
      entityId: customer.id,
      after: parsed.data as Record<string, unknown>,
    });

    revalidatePath("/customers");
    return { success: true, id: customer.id };
  } catch (err: unknown) {
    return { error: (err as Error).message || "Failed to create customer" };
  }
}

export async function updateCustomer(id: string, formData: Record<string, unknown>) {
  const user = await requirePermission("customers:edit");
  const parsed = customerSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  try {
    const before = await prisma.customer.findUnique({ where: { id } });
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...parsed.data,
        tags: parsed.data.tags ? (parsed.data.tags as string[]) : undefined,
      },
    });

    await createAuditEvent({
      userId: user.id,
      action: "customer.update",
      entityType: "Customer",
      entityId: customer.id,
      before: before as unknown as Record<string, unknown>,
      after: parsed.data as Record<string, unknown>,
    });

    revalidatePath(`/customers/${id}`);
    revalidatePath("/customers");
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error).message || "Failed to update customer" };
  }
}

export async function addCustomerAddress(customerId: string, formData: Record<string, unknown>) {
  const user = await requirePermission("customers:edit");
  const parsed = customerAddressSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  try {
    if (parsed.data.isDefault) {
      await prisma.customerAddress.updateMany({
        where: { customerId },
        data: { isDefault: false },
      });
    }

    await prisma.customerAddress.create({
      data: {
        customerId,
        ...parsed.data,
      },
    });

    await createAuditEvent({
      userId: user.id,
      action: "customer.add_address",
      entityType: "Customer",
      entityId: customerId,
    });

    revalidatePath(`/customers/${customerId}`);
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error).message || "Failed to add address" };
  }
}

export async function addCustomerContact(customerId: string, formData: Record<string, unknown>) {
  const user = await requirePermission("customers:edit");
  const parsed = customerContactSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  try {
    if (parsed.data.isPrimary) {
      await prisma.customerContact.updateMany({
        where: { customerId },
        data: { isPrimary: false },
      });
    }

    await prisma.customerContact.create({
      data: {
        customerId,
        ...parsed.data,
      },
    });

    await createAuditEvent({
      userId: user.id,
      action: "customer.add_contact",
      entityType: "Customer",
      entityId: customerId,
    });

    revalidatePath(`/customers/${customerId}`);
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error).message || "Failed to add contact" };
  }
}

export async function deleteCustomerAddress(addressId: string, customerId: string) {
  await requirePermission("customers:edit");

  try {
    await prisma.customerAddress.delete({ where: { id: addressId } });
    revalidatePath(`/customers/${customerId}`);
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error).message || "Failed to delete address" };
  }
}

export async function deleteCustomerContact(contactId: string, customerId: string) {
  await requirePermission("customers:edit");

  try {
    await prisma.customerContact.delete({ where: { id: contactId } });
    revalidatePath(`/customers/${customerId}`);
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error).message || "Failed to delete contact" };
  }
}

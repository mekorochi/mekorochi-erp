"use server";

import prisma from "@/lib/db/prisma";
import { requirePermission, getCurrentUser } from "@/lib/auth";
import { createAuditEvent } from "@/lib/auth/audit";
import { getNextSequence, getCurrentFiscalYear } from "@/lib/services/sequence";
import { createSalesOrder } from "@/lib/services/orders";
import Decimal from "decimal.js";
import { revalidatePath } from "next/cache";

export async function createQuotation(formData: {
  customerId: string;
  validUntil: string;
  deliveryDate?: string;
  isGifting: boolean;
  customization?: string;
  notes?: string;
  termsConditions?: string;
  discountAmount?: number;
  shippingAmount?: number;
  items: Array<{
    productId: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    taxRate: number;
  }>;
  recipients?: Array<{
    name: string;
    phone?: string;
    email?: string;
    address: string;
    city?: string;
    state?: string;
    pincode?: string;
    giftNote?: string;
    deliveryDate?: string;
    customization?: string;
  }>;
}) {
  const user = await requirePermission("quotations:create");

  const settings = await prisma.companySettings.findFirst();
  const fy = getCurrentFiscalYear(settings?.financialYearStart || 4);
  const quoteNumber = await getNextSequence("quotation", settings?.quotePrefix || "QUO", fy);

  let subtotal = new Decimal(0);
  let totalTax = new Decimal(0);

  const calculatedItems = formData.items.map((item, idx) => {
    const qty = new Decimal(item.quantity);
    const price = new Decimal(item.unitPrice);
    const disc = new Decimal(item.discount || 0);
    const taxRate = new Decimal(item.taxRate || 0);
    const netPrice = price.minus(disc);
    const taxableAmount = qty.mul(netPrice);
    const taxAmount = taxableAmount.mul(taxRate).div(100).toDecimalPlaces(2);
    const total = taxableAmount.plus(taxAmount);
    subtotal = subtotal.plus(taxableAmount);
    totalTax = totalTax.plus(taxAmount);

    return {
      productId: item.productId,
      description: item.description,
      quantity: qty.toFixed(3),
      unitPrice: price.toFixed(2),
      discount: disc.toFixed(2),
      taxRate: taxRate.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      totalAmount: total.toDecimalPlaces(2).toFixed(2),
      sortOrder: idx,
    };
  });

  const orderDiscount = new Decimal(formData.discountAmount || 0);
  const shipping = new Decimal(formData.shippingAmount || 0);
  const totalAmount = subtotal.minus(orderDiscount).plus(totalTax).plus(shipping);

  const quotation = await prisma.quotation.create({
    data: {
      quoteNumber,
      customerId: formData.customerId,
      status: "DRAFT",
      validUntil: new Date(formData.validUntil),
      deliveryDate: formData.deliveryDate ? new Date(formData.deliveryDate) : null,
      subtotal: subtotal.toFixed(2),
      discountAmount: orderDiscount.toFixed(2),
      taxAmount: totalTax.toFixed(2),
      shippingAmount: shipping.toFixed(2),
      totalAmount: totalAmount.toDecimalPlaces(2).toFixed(2),
      customization: formData.customization,
      notes: formData.notes,
      termsConditions: formData.termsConditions,
      isGifting: formData.isGifting,
      createdBy: user.id,
      items: { create: calculatedItems },
      recipients: formData.isGifting && formData.recipients
        ? {
            create: formData.recipients.map((r) => ({
              name: r.name,
              phone: r.phone,
              email: r.email,
              address: r.address,
              city: r.city,
              state: r.state,
              pincode: r.pincode,
              giftNote: r.giftNote,
              deliveryDate: r.deliveryDate ? new Date(r.deliveryDate) : undefined,
              customization: r.customization,
            })),
          }
        : undefined,
    },
    include: { items: true, recipients: true, customer: true },
  });

  await createAuditEvent({
    userId: user.id,
    action: "CREATE",
    entityType: "Quotation",
    entityId: quotation.id,
    after: { quoteNumber, customerId: formData.customerId, totalAmount: totalAmount.toFixed(2) },
  });

  revalidatePath("/quotations");
  return { success: true, id: quotation.id, quoteNumber };
}

export async function updateQuotation(quoteId: string, formData: {
  customerId: string;
  validUntil: string;
  deliveryDate?: string;
  isGifting: boolean;
  customization?: string;
  notes?: string;
  termsConditions?: string;
  discountAmount?: number;
  shippingAmount?: number;
  items: Array<{
    productId: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    taxRate: number;
  }>;
  recipients?: Array<{
    name: string;
    phone?: string;
    email?: string;
    address: string;
    city?: string;
    state?: string;
    pincode?: string;
    giftNote?: string;
    deliveryDate?: string;
    customization?: string;
  }>;
}) {
  const user = await requirePermission("quotations:edit");

  const existing = await prisma.quotation.findUnique({ where: { id: quoteId } });
  if (!existing) return { error: "Quotation not found" };
  if (existing.status === "CONVERTED") return { error: "Cannot edit a converted quotation" };

  let subtotal = new Decimal(0);
  let totalTax = new Decimal(0);

  const calculatedItems = formData.items.map((item, idx) => {
    const qty = new Decimal(item.quantity);
    const price = new Decimal(item.unitPrice);
    const disc = new Decimal(item.discount || 0);
    const taxRate = new Decimal(item.taxRate || 0);
    const netPrice = price.minus(disc);
    const taxableAmount = qty.mul(netPrice);
    const taxAmount = taxableAmount.mul(taxRate).div(100).toDecimalPlaces(2);
    const total = taxableAmount.plus(taxAmount);
    subtotal = subtotal.plus(taxableAmount);
    totalTax = totalTax.plus(taxAmount);

    return {
      productId: item.productId,
      description: item.description,
      quantity: qty.toFixed(3),
      unitPrice: price.toFixed(2),
      discount: disc.toFixed(2),
      taxRate: taxRate.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      totalAmount: total.toDecimalPlaces(2).toFixed(2),
      sortOrder: idx,
    };
  });

  const orderDiscount = new Decimal(formData.discountAmount || 0);
  const shipping = new Decimal(formData.shippingAmount || 0);
  const totalAmount = subtotal.minus(orderDiscount).plus(totalTax).plus(shipping);

  await prisma.$transaction(async (tx) => {
    await tx.quoteItem.deleteMany({ where: { quotationId: quoteId } });
    await tx.quoteRecipient.deleteMany({ where: { quotationId: quoteId } });

    await tx.quotation.update({
      where: { id: quoteId },
      data: {
        customerId: formData.customerId,
        validUntil: new Date(formData.validUntil),
        deliveryDate: formData.deliveryDate ? new Date(formData.deliveryDate) : null,
        subtotal: subtotal.toFixed(2),
        discountAmount: orderDiscount.toFixed(2),
        taxAmount: totalTax.toFixed(2),
        shippingAmount: shipping.toFixed(2),
        totalAmount: totalAmount.toDecimalPlaces(2).toFixed(2),
        customization: formData.customization,
        notes: formData.notes,
        termsConditions: formData.termsConditions,
        isGifting: formData.isGifting,
        items: { create: calculatedItems },
        recipients: formData.isGifting && formData.recipients
          ? {
              create: formData.recipients.map((r) => ({
                name: r.name,
                phone: r.phone,
                email: r.email,
                address: r.address,
                city: r.city,
                state: r.state,
                pincode: r.pincode,
                giftNote: r.giftNote,
                deliveryDate: r.deliveryDate ? new Date(r.deliveryDate) : undefined,
                customization: r.customization,
              })),
            }
          : undefined,
      },
    });
  });

  await createAuditEvent({
    userId: user.id,
    action: "UPDATE",
    entityType: "Quotation",
    entityId: quoteId,
    after: { customerId: formData.customerId, totalAmount: totalAmount.toFixed(2) },
  });

  revalidatePath("/quotations");
  revalidatePath(`/quotations/${quoteId}`);
  return { success: true, id: quoteId };
}

export async function updateQuoteStatus(quoteId: string, status: "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED") {
  const user = await requirePermission("quotations:edit");

  const quotation = await prisma.quotation.findUnique({ where: { id: quoteId } });
  if (!quotation) return { error: "Quotation not found" };

  await prisma.quotation.update({
    where: { id: quoteId },
    data: { status },
  });

  await createAuditEvent({
    userId: user.id,
    action: "STATUS_CHANGE",
    entityType: "Quotation",
    entityId: quoteId,
    before: { status: quotation.status },
    after: { status },
  });

  revalidatePath(`/quotations/${quoteId}`);
  revalidatePath("/quotations");
  return { success: true };
}

export async function convertToOrder(quoteId: string) {
  const user = await requirePermission("orders:create");

  const quotation = await prisma.quotation.findUnique({
    where: { id: quoteId },
    include: { items: { include: { product: true } }, recipients: true, customer: true },
  });
  if (!quotation) return { error: "Quotation not found" };
  if (quotation.status !== "ACCEPTED") return { error: "Only accepted quotations can be converted" };

  const billingAddr = await prisma.customerAddress.findFirst({
    where: { customerId: quotation.customerId, isBilling: true },
  });

  const order = await createSalesOrder({
    customerId: quotation.customerId,
    channel: "Quotation",
    quotationId: quotation.id,
    items: quotation.items.map((item) => ({
      productId: item.productId,
      description: item.description || item.product.name,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      discount: item.discount.toString(),
      taxRate: item.taxRate.toString(),
      hsnCode: item.product.hsnCode || undefined,
    })),
    shippingAmount: quotation.shippingAmount.toString(),
    discountAmount: quotation.discountAmount.toString(),
    billingAddress: billingAddr ? {
      line1: billingAddr.addressLine1,
      line2: billingAddr.addressLine2 || "",
      city: billingAddr.city,
      state: billingAddr.state,
      pincode: billingAddr.pincode,
    } : undefined,
    notes: quotation.notes || undefined,
    giftNote: quotation.customization || undefined,
    createdBy: user.id,
  });

  if (quotation.recipients.length > 0) {
    await prisma.orderRecipient.createMany({
      data: quotation.recipients.map((r) => ({
        orderId: order.id,
        name: r.name,
        phone: r.phone,
        email: r.email,
        address: r.address,
        city: r.city,
        state: r.state,
        pincode: r.pincode,
        giftNote: r.giftNote,
        deliveryDate: r.deliveryDate,
        customization: r.customization,
      })),
    });
  }

  await prisma.quotation.update({
    where: { id: quoteId },
    data: { status: "CONVERTED" },
  });

  await createAuditEvent({
    userId: user.id,
    action: "CONVERT_TO_ORDER",
    entityType: "Quotation",
    entityId: quoteId,
    after: { orderId: order.id, orderNumber: order.orderNumber },
  });

  revalidatePath("/quotations");
  revalidatePath("/orders");
  return { success: true, orderId: order.id, orderNumber: order.orderNumber };
}

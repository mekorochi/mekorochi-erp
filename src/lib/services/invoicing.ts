import prisma from "@/lib/db/prisma";
import { type Prisma, InvoiceStatus } from "@prisma/client";
import Decimal from "decimal.js";
import { getNextSequence, getCurrentFiscalYear } from "./sequence";
import { numberToWords } from "@/lib/utils";

interface InvoiceItemCalc {
  description: string;
  productId?: string;
  hsnCode?: string;
  quantity: number | string;
  unitPrice: number | string;
  discount: number | string;
  taxRate: number | string;
}

export function calculateInvoiceItem(item: InvoiceItemCalc, isInterState: boolean) {
  const qty = new Decimal(item.quantity);
  const price = new Decimal(item.unitPrice);
  const discount = new Decimal(item.discount || 0);
  const taxRate = new Decimal(item.taxRate || 0);

  const lineTotal = qty.mul(price);
  const taxableAmount = lineTotal.minus(discount);
  const taxAmount = taxableAmount.mul(taxRate).div(100);

  let cgstRate = new Decimal(0), sgstRate = new Decimal(0), igstRate = new Decimal(0);
  let cgstAmount = new Decimal(0), sgstAmount = new Decimal(0), igstAmount = new Decimal(0);

  if (isInterState) {
    igstRate = taxRate;
    igstAmount = taxAmount;
  } else {
    cgstRate = taxRate.div(2);
    sgstRate = taxRate.div(2);
    cgstAmount = taxAmount.div(2).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    sgstAmount = taxAmount.minus(cgstAmount);
  }

  const totalAmount = taxableAmount.plus(taxAmount);

  return {
    taxableAmount: taxableAmount.toDecimalPlaces(2).toFixed(2),
    cgstRate: cgstRate.toDecimalPlaces(2).toFixed(2),
    cgstAmount: cgstAmount.toDecimalPlaces(2).toFixed(2),
    sgstRate: sgstRate.toDecimalPlaces(2).toFixed(2),
    sgstAmount: sgstAmount.toDecimalPlaces(2).toFixed(2),
    igstRate: igstRate.toDecimalPlaces(2).toFixed(2),
    igstAmount: igstAmount.toDecimalPlaces(2).toFixed(2),
    totalAmount: totalAmount.toDecimalPlaces(2).toFixed(2),
  };
}

export function calculateInvoiceTotals(
  items: Array<ReturnType<typeof calculateInvoiceItem>>,
  shippingAmount: number | string = 0,
  discountAmount: number | string = 0
) {
  let subtotal = new Decimal(0);
  let totalCgst = new Decimal(0);
  let totalSgst = new Decimal(0);
  let totalIgst = new Decimal(0);

  for (const item of items) {
    subtotal = subtotal.plus(new Decimal(item.taxableAmount));
    totalCgst = totalCgst.plus(new Decimal(item.cgstAmount));
    totalSgst = totalSgst.plus(new Decimal(item.sgstAmount));
    totalIgst = totalIgst.plus(new Decimal(item.igstAmount));
  }

  const shipping = new Decimal(shippingAmount || 0);
  const discount = new Decimal(discountAmount || 0);
  const taxTotal = totalCgst.plus(totalSgst).plus(totalIgst);
  const grandTotal = subtotal.minus(discount).plus(taxTotal).plus(shipping);
  const roundOff = grandTotal.round().minus(grandTotal);
  const finalTotal = grandTotal.plus(roundOff);

  return {
    subtotal: subtotal.toDecimalPlaces(2).toFixed(2),
    discountAmount: discount.toDecimalPlaces(2).toFixed(2),
    cgstAmount: totalCgst.toDecimalPlaces(2).toFixed(2),
    sgstAmount: totalSgst.toDecimalPlaces(2).toFixed(2),
    igstAmount: totalIgst.toDecimalPlaces(2).toFixed(2),
    cessAmount: "0.00",
    shippingAmount: shipping.toDecimalPlaces(2).toFixed(2),
    roundOff: roundOff.toDecimalPlaces(2).toFixed(2),
    totalAmount: finalTotal.toDecimalPlaces(2).toFixed(2),
    amountInWords: numberToWords(finalTotal.toNumber()),
  };
}

export async function createInvoice(
  data: {
    type: "PROFORMA" | "TAX_INVOICE" | "CREDIT_NOTE" | "DEBIT_NOTE";
    customerId: string;
    orderId?: string;
    dueDate: Date;
    placeOfSupply?: string;
    isInterState: boolean;
    items: InvoiceItemCalc[];
    shippingAmount?: number | string;
    discountAmount?: number | string;
    notes?: string;
    termsConditions?: string;
    billingAddress?: object;
    shippingAddress?: object;
    parentInvoiceId?: string;
    createdBy: string;
  }
) {
  const settings = await prisma.companySettings.findFirst();
  const prefix = data.type === "CREDIT_NOTE"
    ? (settings?.creditNotePrefix || "CN")
    : data.type === "DEBIT_NOTE"
      ? (settings?.debitNotePrefix || "DN")
      : (settings?.invoicePrefix || "INV");

  const fy = getCurrentFiscalYear(settings?.financialYearStart || 4);
  const invoiceNumber = await getNextSequence(`invoice_${data.type}`, prefix, fy);

  const calculatedItems = data.items.map(item => ({
    ...item,
    ...calculateInvoiceItem(item, data.isInterState),
  }));

  const totals = calculateInvoiceTotals(
    calculatedItems,
    data.shippingAmount,
    data.discountAmount
  );

  return prisma.invoice.create({
    data: {
      invoiceNumber,
      type: data.type,
      customerId: data.customerId,
      orderId: data.orderId,
      status: "DRAFT",
      issueDate: new Date(),
      dueDate: data.dueDate,
      placeOfSupply: data.placeOfSupply,
      isInterState: data.isInterState,
      ...totals,
      billingAddress: data.billingAddress as Prisma.InputJsonValue,
      shippingAddress: data.shippingAddress as Prisma.InputJsonValue,
      notes: data.notes,
      termsConditions: data.termsConditions,
      parentInvoiceId: data.parentInvoiceId,
      createdBy: data.createdBy,
      items: {
        create: calculatedItems.map((item, idx) => ({
          productId: item.productId,
          description: item.description,
          hsnCode: item.hsnCode,
          quantity: new Decimal(item.quantity).toFixed(3),
          unitPrice: new Decimal(item.unitPrice).toFixed(2),
          discount: new Decimal(item.discount || 0).toFixed(2),
          taxableAmount: item.taxableAmount,
          cgstRate: item.cgstRate,
          cgstAmount: item.cgstAmount,
          sgstRate: item.sgstRate,
          sgstAmount: item.sgstAmount,
          igstRate: item.igstRate,
          igstAmount: item.igstAmount,
          totalAmount: item.totalAmount,
          sortOrder: idx,
        })),
      },
    },
    include: { items: true, customer: true },
  });
}

export async function postInvoice(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true, customer: true },
  });
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status !== "DRAFT") throw new Error("Only draft invoices can be posted");

  const snapshot = JSON.parse(JSON.stringify(invoice));

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: InvoiceStatus.POSTED,
      snapshot: snapshot as Prisma.InputJsonValue,
    },
  });
}

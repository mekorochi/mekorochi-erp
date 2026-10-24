import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import Decimal from "decimal.js";
import fs from "fs";
import path from "path";
import { getUnitLabel } from "@/lib/utils";

function fmt(amount: number | string | Decimal): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount instanceof Decimal ? amount.toNumber() : amount;
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function fmtDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(d);
}

function loadImage(relPath: string): string | null {
  try {
    if (relPath.startsWith("data:")) return relPath;
    const clean = relPath.startsWith("/") ? relPath.slice(1) : relPath;
    const full = path.join(process.cwd(), "public", clean);
    if (!fs.existsSync(full)) return null;
    const buf = fs.readFileSync(full);
    const ext = full.split(".").pop()?.toLowerCase() || "png";
    const mime = ext === "jpg" || ext === "jpeg" ? "jpeg" : ext === "svg" ? "svg+xml" : ext;
    return `data:image/${mime};base64,${buf.toString("base64")}`;
  } catch { return null; }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("orders:view");
    const { id } = await params;

    const [order, company] = await Promise.all([
      prisma.salesOrder.findUnique({
        where: { id },
        include: {
          customer: true,
          items: {
            include: {
              product: {
                include: {
                  bundleItems: { include: { product: true }, orderBy: { sortOrder: "asc" } },
                },
              },
            },
            orderBy: { sortOrder: "asc" },
          },
          payments: { where: { status: "CONFIRMED" }, orderBy: { paymentDate: "desc" } },
        },
      }),
      prisma.companySettings.findFirst(),
    ]);

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const billing = order.billingAddress as Record<string, string> | null;
    const shipping = order.shippingAddress as Record<string, string> | null;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 10;
    const CW = W - M * 2;
    const R = M + CW;
    const BK: [number, number, number] = [0, 0, 0];
    const LW = 0.3;
    const col2X = M + CW / 2;

    doc.setDrawColor(...BK);
    doc.setLineWidth(LW);
    doc.rect(M, M, CW, H - M * 2);

    let y = M;

    // ══════ COMPANY HEADER ══════
    const logo = loadImage("brand/logo-square.png");
    const compName = company?.companyName || "MEKOROCHI";

    if (logo) {
      const logoSize = 22;
      doc.addImage(logo, "PNG", W / 2 - logoSize / 2, y + 2, logoSize, logoSize);
      y += logoSize + 4;
    } else {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(compName, W / 2, y + 8, { align: "center" });
      y += 14;
    }

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    if (company?.legalName) { doc.text(company.legalName, W / 2, y, { align: "center" }); y += 3.5; }
    const addr = [company?.addressLine1, company?.addressLine2, company?.city, company?.state, company?.pincode].filter(Boolean).join(", ");
    if (addr) { doc.text(addr, W / 2, y, { align: "center" }); y += 3.5; }
    const contact = [company?.phone ? `Ph: ${company.phone}` : null, company?.email].filter(Boolean).join(" | ");
    if (contact) { doc.text(contact, W / 2, y, { align: "center" }); y += 3.5; }
    const ids = [company?.gstin ? `GSTIN: ${company.gstin}` : null, company?.pan ? `PAN: ${company.pan}` : null, company?.fssaiNumber ? `FSSAI: ${company.fssaiNumber}` : null].filter(Boolean).join("  |  ");
    if (ids) { doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); doc.text(ids, W / 2, y, { align: "center" }); y += 3; }

    doc.line(M, y, R, y);
    y += 1;

    // ══════ TITLE ══════
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Sales Order", W / 2, y + 5, { align: "center" });
    y += 7;
    doc.line(M, y, R, y);
    y += 1;

    // ══════ ORDER META ══════
    const metaY = y;
    const colonX = M + 28;
    const colonX2 = col2X + 22;

    const metaLabel = (label: string, value: string, x: number, cX: number, lineY: number) => {
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(label, x, lineY);
      doc.text(":", cX, lineY);
      doc.setFont("helvetica", "bold");
      doc.text(value, cX + 2, lineY);
    };

    metaLabel("Order No.", order.orderNumber, M + 2, colonX, metaY + 4);
    metaLabel("Status", order.status.replace(/_/g, " "), col2X + 2, colonX2, metaY + 4);
    metaLabel("Order Date", fmtDate(order.orderDate), M + 2, colonX, metaY + 8);
    metaLabel("Payment", order.paymentStatus.replace(/_/g, " "), col2X + 2, colonX2, metaY + 8);
    if (order.channel) {
      metaLabel("Channel", order.channel, M + 2, colonX, metaY + 12);
    }

    const metaEndY = metaY + (order.channel ? 14 : 10);
    doc.line(col2X, metaY, col2X, metaEndY);
    y = metaEndY;
    doc.line(M, y, R, y);
    y += 1;

    // ══════ CUSTOMER DETAILS ══════
    const custY = y;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("Customer (Bill to)", M + 2, custY + 4);
    doc.setFont("helvetica", "bold");
    doc.text(order.customer.name, M + 2, custY + 8);

    doc.setFont("helvetica", "normal");
    let bY = custY + 8;
    if (order.customer.company) { bY += 3.5; doc.text(order.customer.company, M + 2, bY); }
    if (billing) {
      const bAddr = [billing.line1, billing.line2, [billing.city, billing.state, billing.pincode].filter(Boolean).join(", ")].filter(Boolean).join(", ");
      if (bAddr) { bY += 3.5; doc.text(bAddr, M + 2, bY, { maxWidth: CW / 2 - 6 }); }
    }
    if (order.customer.gstin) { bY += 3.5; doc.setFont("helvetica", "bold"); doc.text(`GSTIN: ${order.customer.gstin}`, M + 2, bY); }
    if (order.customer.phone) { bY += 3.5; doc.setFont("helvetica", "normal"); doc.text(`Ph: ${order.customer.phone}`, M + 2, bY); }
    if (order.customer.email) { bY += 3.5; doc.text(order.customer.email, M + 2, bY); }

    if (shipping) {
      doc.line(col2X, custY, col2X, bY + 2);
      doc.setFont("helvetica", "normal");
      doc.text("Ship To", col2X + 2, custY + 4);
      doc.setFont("helvetica", "bold");
      const sName = (shipping as Record<string, string>).name;
      if (sName) { doc.text(sName, col2X + 2, custY + 8); }
      doc.setFont("helvetica", "normal");
      const sAddr = [shipping.line1, shipping.line2, [shipping.city, shipping.state, shipping.pincode].filter(Boolean).join(", ")].filter(Boolean).join(", ");
      if (sAddr) doc.text(sAddr, col2X + 2, custY + (sName ? 12 : 8), { maxWidth: CW / 2 - 6 });
    }

    y = bY + 3;
    doc.line(M, y, R, y);
    y += 0.5;

    // ══════ ITEMS TABLE ══════
    const heads = [["#", "Product", "SKU", "Qty", "Rate", "Tax %", "Amount"]];

    const rows: (string | { content: string; styles?: Record<string, unknown> })[][] = [];
    let slNo = 0;

    for (const item of order.items) {
      slNo++;
      const qty = new Decimal(item.quantity.toString());
      const isBundle = item.product.isBundle && item.product.bundleItems.length > 0;

      rows.push([
        String(slNo),
        item.product.name + (isBundle ? " (Bundle)" : ""),
        item.product.sku,
        qty.toFixed(2) + " " + getUnitLabel(item.product.unitOfMeasure),
        fmt(item.unitPrice),
        new Decimal(item.taxRate.toString()).toFixed(1) + "%",
        fmt(item.totalAmount),
      ]);

      if (isBundle) {
        for (const bi of item.product.bundleItems) {
          const compQty = new Decimal(bi.quantity.toString()).mul(qty);
          rows.push([
            "",
            { content: `  └ ${bi.product.name}`, styles: { textColor: [100, 100, 100] as [number, number, number], fontStyle: "italic" as const } },
            { content: bi.product.sku, styles: { textColor: [100, 100, 100] as [number, number, number] } },
            { content: `${bi.quantity.toString()} x ${qty.toFixed(0)} = ${compQty.toFixed(2)}`, styles: { textColor: [100, 100, 100] as [number, number, number] } },
            "",
            "",
            "",
          ]);
        }
      }
    }

    autoTable(doc, {
      startY: y,
      head: heads,
      body: rows,
      margin: { left: M, right: M },
      tableWidth: CW,
      styles: { fontSize: 7, cellPadding: 1.8, textColor: BK, lineColor: BK, lineWidth: LW, font: "helvetica" },
      headStyles: { fillColor: [245, 245, 220], textColor: BK, fontStyle: "bold", fontSize: 6.5, halign: "center", cellPadding: 2 },
      bodyStyles: { fillColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },
        1: { cellWidth: "auto" },
        2: { cellWidth: 22, halign: "center" },
        3: { cellWidth: 22, halign: "right" },
        4: { cellWidth: 22, halign: "right" },
        5: { cellWidth: 16, halign: "center" },
        6: { cellWidth: 24, halign: "right" },
      },
      theme: "grid",
      tableLineColor: BK,
      tableLineWidth: LW,
    });

    y = ((doc as unknown as Record<string, Record<string, number>>).lastAutoTable?.finalY as number) ?? y + 20;

    // ══════ TOTALS ══════
    doc.line(M, y, R, y);

    const totLabelX = R - 60;
    const totValX = R - 2;
    let tY = y + 4;

    const totRow = (label: string, value: string, bold = false) => {
      doc.setFontSize(7);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.text(label, totLabelX, tY);
      doc.text(value, totValX, tY, { align: "right" });
      tY += 4;
    };

    totRow("Subtotal", "Rs. " + fmt(order.subtotal));
    if (new Decimal(order.discountAmount.toString()).gt(0)) {
      totRow("Discount", "- Rs. " + fmt(order.discountAmount));
    }
    totRow("Tax", "Rs. " + fmt(order.taxAmount));
    if (new Decimal(order.shippingAmount.toString()).gt(0)) {
      totRow("Shipping", "Rs. " + fmt(order.shippingAmount));
    }

    doc.line(totLabelX - 3, tY - 2, R, tY - 2);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Total", totLabelX, tY + 2);
    doc.text("Rs. " + fmt(order.totalAmount), totValX, tY + 2, { align: "right" });
    tY += 6;

    // Payment summary
    const paidAmount = order.payments.reduce((sum, p) => sum.plus(new Decimal(p.amount.toString())), new Decimal(0));
    const outstanding = order.status === "CANCELLED" ? new Decimal(0) : new Decimal(order.totalAmount.toString()).minus(paidAmount);

    doc.line(totLabelX - 3, tY - 2, R, tY - 2);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("Paid", totLabelX, tY + 1);
    doc.text("Rs. " + fmt(paidAmount), totValX, tY + 1, { align: "right" });
    tY += 4;
    doc.setFont("helvetica", "bold");
    doc.text("Outstanding", totLabelX, tY + 1);
    doc.text("Rs. " + fmt(outstanding), totValX, tY + 1, { align: "right" });
    tY += 4;

    y = Math.max(tY, y + 20);
    doc.line(M, y, R, y);

    // ══════ NOTES ══════
    if (order.notes || order.giftNote) {
      y += 1;
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      if (order.notes) {
        doc.text("Notes: " + order.notes, M + 2, y + 3, { maxWidth: CW - 4 });
        y += 6;
      }
      if (order.giftNote) {
        doc.setFont("helvetica", "italic");
        doc.text("Gift Note: " + order.giftNote, M + 2, y + 3, { maxWidth: CW - 4 });
        y += 6;
      }
      doc.line(M, y, R, y);
    }

    // ══════ FOOTER ══════
    doc.setFontSize(5.5);
    doc.setTextColor(130, 130, 130);
    doc.text("This is a Computer Generated Order Document", W / 2, y + 3, { align: "center" });

    const actualBottom = y + 5;
    doc.setTextColor(...BK);
    doc.setDrawColor(...BK);
    doc.setFillColor(255, 255, 255);
    doc.rect(M - 0.5, H - M - 0.5, CW + 1, 1, "F");
    doc.setLineWidth(LW);
    doc.rect(M, M, CW, actualBottom - M);

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${order.orderNumber}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (error) {
    console.error("Order PDF generation error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}

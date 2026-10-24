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
    await requirePermission("invoices:view");
    const { id } = await params;

    const [invoice, company] = await Promise.all([
      prisma.invoice.findUnique({
        where: { id },
        include: { customer: true, items: { orderBy: { sortOrder: "asc" }, include: { product: true } }, order: { select: { id: true, orderNumber: true } } },
      }),
      prisma.companySettings.findFirst(),
    ]);

    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const isIntra = !invoice.isInterState;
    const billing = invoice.billingAddress as Record<string, string> | null;
    const shipping = invoice.shippingAddress as Record<string, string> | null;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 10;
    const CW = W - M * 2;
    const R = M + CW;
    const BK: [number, number, number] = [0, 0, 0];
    const LW = 0.3;
    const col2X = M + CW / 2;
    const colonX = M + 28; // Fixed colon position for aligned labels

    doc.setDrawColor(...BK);
    doc.setLineWidth(LW);

    // Outer border
    doc.rect(M, M, CW, H - M * 2);

    let y = M;

    // ══════ COMPANY HEADER — square logo centered ══════
    const logo = loadImage("brand/logo-square.png");
    const compName = company?.companyName || "MEKOROCHI";

    if (logo) {
      const logoSize = 22;
      doc.addImage(logo, "PNG", W / 2 - logoSize / 2, y + 2, logoSize, logoSize);
      y += logoSize + 4;
    } else {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BK);
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

    // ══════ INVOICE TITLE ══════
    const types: Record<string, string> = { TAX_INVOICE: "Tax Invoice", PROFORMA: "Proforma Invoice", CREDIT_NOTE: "Credit Note", DEBIT_NOTE: "Debit Note" };
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(types[invoice.type] || invoice.type, W / 2, y + 5, { align: "center" });
    y += 7;
    doc.line(M, y, R, y);
    y += 1;

    // ══════ INVOICE META — aligned colons ══════
    const metaY = y;
    const colonX2 = col2X + 18; // colon position for right column

    const metaLabel = (label: string, value: string, x: number, cX: number, lineY: number) => {
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(label, x, lineY);
      doc.text(":", cX, lineY);
      doc.setFont("helvetica", "bold");
      doc.text(value, cX + 2, lineY);
    };

    metaLabel("Invoice No.", invoice.invoiceNumber, M + 2, colonX, metaY + 4);
    metaLabel("Dated", fmtDate(invoice.issueDate), col2X + 2, colonX2, metaY + 4);
    metaLabel("Due Date", fmtDate(invoice.dueDate), M + 2, colonX, metaY + 8);
    if (invoice.order) metaLabel("Order Ref.", invoice.order.orderNumber, col2X + 2, colonX2, metaY + 8);

    let metaEndY = metaY + 10;
    if (invoice.placeOfSupply) {
      metaLabel("Place of Supply", invoice.placeOfSupply + (invoice.isInterState ? " (Inter-State)" : ""), M + 2, colonX, metaY + 12);
      metaEndY = metaY + 14;
    }

    doc.line(col2X, metaY, col2X, metaEndY);
    y = metaEndY;
    doc.line(M, y, R, y);
    y += 1;

    // ══════ BUYER DETAILS ══════
    const buyerY = y;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("Buyer (Bill to)", M + 2, buyerY + 4);
    doc.setFont("helvetica", "bold");
    doc.text(invoice.customer.name, M + 2, buyerY + 8);

    doc.setFont("helvetica", "normal");
    let bY = buyerY + 8;
    if (invoice.customer.company) { bY += 3.5; doc.text(invoice.customer.company, M + 2, bY); }
    if (billing) {
      const bAddr = [billing.line1, billing.line2, [billing.city, billing.state, billing.pincode].filter(Boolean).join(", ")].filter(Boolean).join(", ");
      if (bAddr) { bY += 3.5; doc.text(bAddr, M + 2, bY, { maxWidth: CW / 2 - 6 }); }
    }
    if (invoice.customer.gstin) { bY += 3.5; doc.setFont("helvetica", "bold"); doc.text(`GSTIN: ${invoice.customer.gstin}`, M + 2, bY); }
    if (invoice.customer.email) { bY += 3.5; doc.setFont("helvetica", "normal"); doc.text(invoice.customer.email, M + 2, bY); }

    if (shipping) {
      doc.line(col2X, buyerY, col2X, bY + 2);
      doc.setFont("helvetica", "normal");
      doc.text("Ship To", col2X + 2, buyerY + 4);
      const sAddr = [shipping.line1, shipping.line2, [shipping.city, shipping.state, shipping.pincode].filter(Boolean).join(", ")].filter(Boolean).join(", ");
      if (sAddr) doc.text(sAddr, col2X + 2, buyerY + 8, { maxWidth: CW / 2 - 6 });
    }

    y = bY + 3;
    doc.line(M, y, R, y);
    y += 0.5;

    // ══════ ITEMS TABLE — separate Rate & Amt columns for GST ══════
    const heads = isIntra
      ? [["Sl", "Particulars", "HSN/SAC", "Qty", "Rate", "Taxable\nAmt", "CGST\nRate", "CGST\nAmt", "SGST\nRate", "SGST\nAmt", "Amount"]]
      : [["Sl", "Particulars", "HSN/SAC", "Qty", "Rate", "Taxable\nAmt", "IGST\nRate", "IGST\nAmt", "Amount"]];

    const rows = invoice.items.map((item, idx) => {
      const base = [
        String(idx + 1),
        item.description + (item.product?.sku ? `\n${item.product.sku}` : ""),
        item.hsnCode || "",
        new Decimal(item.quantity.toString()).toFixed(2) + (item.product ? " " + getUnitLabel(item.product.unitOfMeasure) : ""),
        fmt(item.unitPrice),
        fmt(item.taxableAmount),
      ];
      if (isIntra) {
        base.push(
          new Decimal(item.cgstRate.toString()).toFixed(1) + "%",
          fmt(item.cgstAmount),
          new Decimal(item.sgstRate.toString()).toFixed(1) + "%",
          fmt(item.sgstAmount),
        );
      } else {
        base.push(
          new Decimal(item.igstRate.toString()).toFixed(1) + "%",
          fmt(item.igstAmount),
        );
      }
      base.push(fmt(item.totalAmount));
      return base;
    });

    const cs: Record<number, { halign?: "right" | "left" | "center"; cellWidth?: number | "auto" }> = isIntra
      ? { 0: { cellWidth: 7, halign: "center" }, 1: { cellWidth: "auto" }, 2: { cellWidth: 13, halign: "center" }, 3: { halign: "right", cellWidth: 11 }, 4: { halign: "right", cellWidth: 18 }, 5: { halign: "right", cellWidth: 19 }, 6: { halign: "center", cellWidth: 11 }, 7: { halign: "right", cellWidth: 17 }, 8: { halign: "center", cellWidth: 11 }, 9: { halign: "right", cellWidth: 17 }, 10: { halign: "right", cellWidth: 19 } }
      : { 0: { cellWidth: 7, halign: "center" }, 1: { cellWidth: "auto" }, 2: { cellWidth: 14, halign: "center" }, 3: { halign: "right", cellWidth: 12 }, 4: { halign: "right", cellWidth: 22 }, 5: { halign: "right", cellWidth: 24 }, 6: { halign: "center", cellWidth: 13 }, 7: { halign: "right", cellWidth: 24 }, 8: { halign: "right", cellWidth: 24 } };

    autoTable(doc, {
      startY: y,
      head: heads,
      body: rows,
      margin: { left: M, right: M },
      tableWidth: CW,
      styles: { fontSize: 6.5, cellPadding: 1.5, textColor: BK, lineColor: BK, lineWidth: LW, font: "helvetica" },
      headStyles: { fillColor: [255, 255, 255], textColor: BK, fontStyle: "bold", fontSize: 6, halign: "center", cellPadding: 1.8 },
      bodyStyles: { fillColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      columnStyles: cs,
      theme: "grid",
      tableLineColor: BK,
      tableLineWidth: LW,
    });

    y = ((doc as unknown as Record<string, Record<string, number>>).lastAutoTable?.finalY as number) ?? y + 20;

    // ══════ TOTALS ══════
    doc.line(M, y, R, y);

    const totLabelX = R - 72;
    const totValX = R - 2;
    let tY = y + 4;

    const totRow = (label: string, value: string, bold = false) => {
      doc.setFontSize(7);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.text(label, totLabelX, tY);
      doc.text(value, totValX, tY, { align: "right" });
      tY += 4;
    };

    if (invoice.amountInWords) {
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.text("Amount Chargeable (in words):", M + 2, y + 4);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text(invoice.amountInWords, M + 2, y + 8, { maxWidth: totLabelX - M - 8 });
    }

    doc.line(totLabelX - 3, y, totLabelX - 3, y + 30);

    totRow("Subtotal", fmt(invoice.subtotal));
    if (new Decimal(invoice.discountAmount.toString()).gt(0)) totRow("Less: Discount", fmt(invoice.discountAmount));
    if (isIntra) { totRow("CGST", fmt(invoice.cgstAmount)); totRow("SGST", fmt(invoice.sgstAmount)); }
    else { totRow("IGST", fmt(invoice.igstAmount)); }
    if (new Decimal(invoice.shippingAmount.toString()).gt(0)) totRow("Shipping", fmt(invoice.shippingAmount));
    if (!new Decimal(invoice.roundOff.toString()).isZero()) totRow("Round Off", (new Decimal(invoice.roundOff.toString()).gt(0) ? "+" : "") + new Decimal(invoice.roundOff.toString()).toFixed(2));

    doc.line(totLabelX - 3, tY - 2, R, tY - 2);
    // Use "Rs." instead of ₹ — jsPDF default fonts don't support ₹ symbol
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Total", totLabelX, tY + 2);
    doc.text("Rs. " + fmt(invoice.totalAmount), totValX, tY + 2, { align: "right" });
    tY += 5;

    y = Math.max(tY, y + 30);
    doc.line(M, y, R, y);

    // ══════ BANK + SIGNATURE — compact, no huge gap ══════
    const footY = y;
    // Calculate signature section height — keep it tight
    const sigSectionH = 30;
    const sigEndY = footY + sigSectionH;

    // Redraw outer border bottom to match
    // (the original rect already goes to H - M, so the content just goes inside)

    // Bank details on left
    if (company?.bankName || company?.upiId) {
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.text("Bank Details:", M + 2, footY + 4);
      doc.setFont("helvetica", "normal");
      let bkY = footY + 8;
      const bkRow = (l: string, v: string) => { doc.text(`${l}: ${v}`, M + 2, bkY); bkY += 3.2; };
      if (company?.bankName) bkRow("Bank", company.bankName + (company.bankBranch ? `, ${company.bankBranch}` : ""));
      if (company?.bankAccountName) bkRow("A/C Name", company.bankAccountName);
      if (company?.bankAccountNumber) bkRow("A/C No.", company.bankAccountNumber);
      if (company?.bankIfsc) bkRow("IFSC Code", company.bankIfsc);
      if (company?.upiId) bkRow("UPI ID", company.upiId);
    }

    if (invoice.notes || invoice.termsConditions) {
      const ny = (company?.bankName || company?.upiId) ? footY + 24 : footY + 4;
      doc.setFontSize(6);
      if (invoice.notes) doc.text("Notes: " + invoice.notes, M + 2, ny, { maxWidth: CW / 2 - 4 });
      if (invoice.termsConditions) doc.text("Terms: " + invoice.termsConditions, M + 2, ny + (invoice.notes ? 4 : 0), { maxWidth: CW / 2 - 4 });
    }

    // Vertical divider for signature
    doc.line(col2X, footY, col2X, sigEndY);

    // "For COMPANY" at top right
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BK);
    doc.text(`For ${compName}`, col2X + 2, footY + 4);

    if (company?.signatureUrl) {
      const sigImg = loadImage(company.signatureUrl);
      if (sigImg) {
        const sigExt = company.signatureUrl.split(".").pop()?.toLowerCase() || "png";
        const sigFmt = (sigExt === "jpg" || sigExt === "jpeg") ? "JPEG" : "PNG";
        const sigSize = 18;
        const imgX = col2X + (CW / 4) - sigSize / 2;
        doc.addImage(sigImg, sigFmt, imgX, footY + 6, sigSize, sigSize);
      }
    }

    // "Authorized Signatory" close below signature
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("Authorized Signatory", col2X + (CW / 4), sigEndY - 3, { align: "center" });

    // Separator before footer notice
    doc.line(M, sigEndY, R, sigEndY);

    // Computer generated notice
    doc.setFontSize(5.5);
    doc.setTextColor(130, 130, 130);
    doc.text("This is a Computer Generated Invoice", W / 2, sigEndY + 3, { align: "center" });

    // Redraw outer border to cover actual content height
    const actualBottom = sigEndY + 5;
    doc.setTextColor(...BK);
    doc.setDrawColor(...BK);
    // Clear and redraw the outer rect to the actual height
    doc.setFillColor(255, 255, 255);
    doc.rect(M - 0.5, H - M - 0.5, CW + 1, 1, "F"); // erase old bottom border
    doc.setLineWidth(LW);
    doc.rect(M, M, CW, actualBottom - M);

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}

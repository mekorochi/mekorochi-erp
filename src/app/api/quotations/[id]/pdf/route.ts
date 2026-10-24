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

function fmtWeight(product: { weight?: Decimal | null; weightUnit?: string | null }): string {
  if (!product.weight) return "";
  const w = new Decimal(product.weight.toString());
  return w.toFixed(0) + " " + (product.weightUnit || "g");
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("quotations:view");
    const { id } = await params;

    const [quotation, company] = await Promise.all([
      prisma.quotation.findUnique({
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
          recipients: { orderBy: { name: "asc" } },
        },
      }),
      prisma.companySettings.findFirst(),
    ]);

    if (!quotation) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });

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

    let y = M;
    let pageStartY = M;

    const checkPageBreak = (needed: number) => {
      if (y + needed > H - M) {
        // Draw border on current page
        doc.setDrawColor(...BK);
        doc.setLineWidth(LW);
        doc.rect(M, pageStartY, CW, y - pageStartY);
        doc.addPage();
        y = M;
        pageStartY = M;
      }
    };

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
    doc.text("Quotation", W / 2, y + 5, { align: "center" });
    y += 7;
    doc.line(M, y, R, y);
    y += 1;

    // ══════ QUOTATION META ══════
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

    metaLabel("Quote No.", quotation.quoteNumber, M + 2, colonX, metaY + 4);
    metaLabel("Status", quotation.status.replace(/_/g, " "), col2X + 2, colonX2, metaY + 4);
    metaLabel("Issue Date", fmtDate(quotation.issueDate), M + 2, colonX, metaY + 8);
    metaLabel("Valid Until", fmtDate(quotation.validUntil), col2X + 2, colonX2, metaY + 8);
    if (quotation.deliveryDate) {
      metaLabel("Delivery Date", fmtDate(quotation.deliveryDate), M + 2, colonX, metaY + 12);
    }

    const metaEndY = metaY + (quotation.deliveryDate ? 14 : 10);
    doc.line(col2X, metaY, col2X, metaEndY);
    y = metaEndY;
    doc.line(M, y, R, y);
    y += 1;

    // ══════ CUSTOMER DETAILS ══════
    const custY = y;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("Customer", M + 2, custY + 4);
    doc.setFont("helvetica", "bold");
    doc.text(quotation.customer.name, M + 2, custY + 8);

    doc.setFont("helvetica", "normal");
    let bY = custY + 8;
    if (quotation.customer.company) { bY += 3.5; doc.text(quotation.customer.company, M + 2, bY); }
    if (quotation.customer.gstin) { bY += 3.5; doc.setFont("helvetica", "bold"); doc.text(`GSTIN: ${quotation.customer.gstin}`, M + 2, bY); }
    if (quotation.customer.phone) { bY += 3.5; doc.setFont("helvetica", "normal"); doc.text(`Ph: ${quotation.customer.phone}`, M + 2, bY); }
    if (quotation.customer.email) { bY += 3.5; doc.text(quotation.customer.email, M + 2, bY); }

    if (quotation.isGifting) {
      doc.line(col2X, custY, col2X, bY + 2);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text("Gifting Order", col2X + 2, custY + 4);
      doc.setFont("helvetica", "normal");
      doc.text(`${quotation.recipients.length} recipient${quotation.recipients.length !== 1 ? "s" : ""}`, col2X + 2, custY + 8);
      if (quotation.customization) {
        doc.text("Customization: " + quotation.customization, col2X + 2, custY + 12, { maxWidth: CW / 2 - 6 });
      }
    }

    y = bY + 3;
    doc.line(M, y, R, y);
    y += 0.5;

    // ══════ ITEMS TABLE ══════
    const hasAnyDiscount = quotation.items.some(i => new Decimal(i.discount.toString()).gt(0));
    const heads = hasAnyDiscount
      ? [["#", "Product", "SKU", "Wt. (Approx.)", "Qty", "MRP", "Discount", "Rate", "Tax %", "Amount"]]
      : [["#", "Product", "SKU", "Wt. (Approx.)", "Qty", "Rate", "Tax %", "Amount"]];

    const rows: (string | { content: string; styles?: Record<string, unknown> })[][] = [];
    let slNo = 0;
    let totalWeight = new Decimal(0);

    for (const item of quotation.items) {
      slNo++;
      const qty = new Decimal(item.quantity.toString());
      const disc = new Decimal(item.discount.toString());
      const unitPrice = new Decimal(item.unitPrice.toString());
      const lineTotal = qty.mul(unitPrice);
      const effectiveRate = disc.gt(0) ? lineTotal.minus(disc).div(qty).toDecimalPlaces(2) : unitPrice;
      const isBundle = item.product.isBundle && item.product.bundleItems.length > 0;
      const itemWeight = fmtWeight(item.product);
      if (item.product.weight) {
        totalWeight = totalWeight.plus(new Decimal(item.product.weight.toString()).mul(qty));
      }

      const row: (string | { content: string; styles?: Record<string, unknown> })[] = [
        String(slNo),
        item.product.name + (isBundle ? " (Bundle)" : ""),
        item.product.sku,
        itemWeight ? `~${itemWeight}` : "-",
        qty.toFixed(2) + " " + getUnitLabel(item.product.unitOfMeasure),
      ];

      if (hasAnyDiscount) {
        row.push(fmt(unitPrice));
        row.push(disc.gt(0) ? fmt(disc) : "-");
        row.push(fmt(effectiveRate));
      } else {
        row.push(fmt(unitPrice));
      }

      row.push(new Decimal(item.taxRate.toString()).toFixed(1) + "%");
      row.push(fmt(item.totalAmount));
      rows.push(row);

      if (isBundle) {
        for (const bi of item.product.bundleItems) {
          const compQty = new Decimal(bi.quantity.toString()).mul(qty);
          const compWeight = fmtWeight(bi.product);
          if (bi.product.weight) {
            totalWeight = totalWeight.plus(new Decimal(bi.product.weight.toString()).mul(compQty));
          }
          const gray = { textColor: [100, 100, 100] as [number, number, number] };
          const grayItalic = { textColor: [100, 100, 100] as [number, number, number], fontStyle: "italic" as const };
          const bundleRow: (string | { content: string; styles?: Record<string, unknown> })[] = [
            "",
            { content: `  └ ${bi.product.name}`, styles: grayItalic },
            { content: bi.product.sku, styles: gray },
            { content: compWeight ? `~${compWeight}` : "-", styles: gray },
            { content: `${bi.quantity.toString()} x ${qty.toFixed(0)} = ${compQty.toFixed(0)}`, styles: gray },
          ];
          if (hasAnyDiscount) {
            bundleRow.push("", "", "", "", "");
          } else {
            bundleRow.push("", "", "");
          }
          rows.push(bundleRow);
        }
      }
    }

    const colStyles: Record<number, Record<string, unknown>> = hasAnyDiscount
      ? {
          0: { cellWidth: 7, halign: "center" },
          1: { cellWidth: "auto" },
          2: { cellWidth: 18, halign: "center" },
          3: { cellWidth: 20, halign: "center" },
          4: { cellWidth: 18, halign: "right" },
          5: { cellWidth: 18, halign: "right" },
          6: { cellWidth: 16, halign: "right" },
          7: { cellWidth: 18, halign: "right" },
          8: { cellWidth: 12, halign: "center" },
          9: { cellWidth: 22, halign: "right" },
        }
      : {
          0: { cellWidth: 7, halign: "center" },
          1: { cellWidth: "auto" },
          2: { cellWidth: 20, halign: "center" },
          3: { cellWidth: 22, halign: "center" },
          4: { cellWidth: 20, halign: "right" },
          5: { cellWidth: 20, halign: "right" },
          6: { cellWidth: 14, halign: "center" },
          7: { cellWidth: 22, halign: "right" },
        };

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
      columnStyles: colStyles,
      theme: "grid",
      tableLineColor: BK,
      tableLineWidth: LW,
    });

    y = ((doc as unknown as Record<string, Record<string, number>>).lastAutoTable?.finalY as number) ?? y + 20;
    if (doc.getNumberOfPages() > 1) pageStartY = M;

    // ══════ TOTALS ══════
    checkPageBreak(30);
    doc.line(M, y, R, y);

    // Total approx weight on the left
    if (totalWeight.gt(0)) {
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      const tw = totalWeight.gte(1000)
        ? `~${totalWeight.div(1000).toFixed(2)} kg`
        : `~${totalWeight.toFixed(0)} g`;
      doc.text(`Total Approx. Weight: ${tw}`, M + 2, y + 4);
    }

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

    const totalLineDiscount = quotation.items.reduce((sum, i) => sum.plus(new Decimal(i.discount.toString())), new Decimal(0));
    const grossTotal = quotation.items.reduce((sum, i) => {
      const q = new Decimal(i.quantity.toString());
      const p = new Decimal(i.unitPrice.toString());
      return sum.plus(q.mul(p));
    }, new Decimal(0));

    if (totalLineDiscount.gt(0)) {
      totRow("Gross Total", "Rs. " + fmt(grossTotal));
      totRow("Discount", "- Rs. " + fmt(totalLineDiscount));
    }
    totRow("Subtotal", "Rs. " + fmt(quotation.subtotal));
    if (new Decimal(quotation.discountAmount.toString()).gt(0)) {
      totRow("Addl. Discount", "- Rs. " + fmt(quotation.discountAmount));
    }
    totRow("Tax", "Rs. " + fmt(quotation.taxAmount));
    if (new Decimal(quotation.shippingAmount.toString()).gt(0)) {
      totRow("Shipping", "Rs. " + fmt(quotation.shippingAmount));
    }

    doc.line(totLabelX - 3, tY - 2, R, tY - 2);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Total", totLabelX, tY + 2);
    doc.text("Rs. " + fmt(quotation.totalAmount), totValX, tY + 2, { align: "right" });
    tY += 6;

    y = Math.max(tY, y + 20);
    doc.line(M, y, R, y);

    // ══════ GIFT RECIPIENTS ══════
    if (quotation.isGifting && quotation.recipients.length > 0) {
      y += 1;
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text(`Gift Recipients (${quotation.recipients.length})`, M + 2, y + 3.5);
      y += 5;

      const recipientHeads = [["#", "Name", "Phone", "City / State", "Delivery Date", "Gift Note"]];
      const recipientRows = quotation.recipients.map((r, idx) => [
        String(idx + 1),
        r.name,
        r.phone || "-",
        [r.city, r.state].filter(Boolean).join(", ") || "-",
        r.deliveryDate ? fmtDate(r.deliveryDate) : "-",
        r.giftNote || "-",
      ]);

      autoTable(doc, {
        startY: y,
        head: recipientHeads,
        body: recipientRows,
        margin: { left: M, right: M },
        tableWidth: CW,
        styles: { fontSize: 6.5, cellPadding: 1.5, textColor: BK, lineColor: BK, lineWidth: LW, font: "helvetica" },
        headStyles: { fillColor: [245, 245, 220], textColor: BK, fontStyle: "bold", fontSize: 6, halign: "center", cellPadding: 1.8 },
        bodyStyles: { fillColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [255, 255, 255] },
        columnStyles: {
          0: { cellWidth: 7, halign: "center" },
          1: { cellWidth: "auto" },
          2: { cellWidth: 22, halign: "center" },
          3: { cellWidth: 30 },
          4: { cellWidth: 22, halign: "center" },
          5: { cellWidth: 40 },
        },
        theme: "grid",
        tableLineColor: BK,
        tableLineWidth: LW,
      });

      y = ((doc as unknown as Record<string, Record<string, number>>).lastAutoTable?.finalY as number) ?? y + 20;
      if (doc.getNumberOfPages() > 1) pageStartY = M;
      doc.line(M, y, R, y);
    }

    // ══════ BANK DETAILS (full width section) ══════
    const fullW = CW - 4;
    if (company?.bankName || company?.upiId) {
      const bankLines: string[] = [];
      if (company?.bankName) bankLines.push("Bank: " + company.bankName + (company.bankBranch ? `, ${company.bankBranch}` : ""));
      if (company?.bankAccountName) bankLines.push("A/C Name: " + company.bankAccountName);
      if (company?.bankAccountNumber) bankLines.push("A/C No.: " + company.bankAccountNumber);
      if (company?.bankIfsc) bankLines.push("IFSC Code: " + company.bankIfsc);
      if (company?.upiId) bankLines.push("UPI ID: " + company.upiId);
      const bankH = 5 + bankLines.length * 3.5 + 2;
      checkPageBreak(bankH);

      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BK);
      doc.text("Bank Details", M + 2, y + 4);
      let bkY = y + 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      for (const line of bankLines) {
        doc.text(line, M + 2, bkY);
        bkY += 3.5;
      }
      y = bkY + 1;
      doc.line(M, y, R, y);
    }

    // ══════ TERMS & CONDITIONS (full width section) ══════
    if (quotation.notes || quotation.termsConditions) {
      doc.setFontSize(6.5);
      let tcText = "";
      if (quotation.notes) tcText += quotation.notes;
      if (quotation.notes && quotation.termsConditions) tcText += "\n\n";
      if (quotation.termsConditions) tcText += quotation.termsConditions;

      const tcLines = doc.splitTextToSize(tcText, fullW);
      const lineH = 3;
      const tcH = 5 + tcLines.length * lineH + 3;
      checkPageBreak(tcH);

      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BK);
      doc.text("Terms & Conditions", M + 2, y + 4);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.text(tcLines, M + 2, y + 8);
      y += 8 + tcLines.length * lineH + 2;
      doc.line(M, y, R, y);
    }

    // ══════ SIGNATURE (full width, below) ══════
    const sigH = 28;
    checkPageBreak(sigH + 8);

    const sigStartY = y;
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BK);
    doc.text(`For ${compName}`, R - 2, sigStartY + 4, { align: "right" });

    if (company?.signatureUrl) {
      const sigImg = loadImage(company.signatureUrl);
      if (sigImg) {
        const sigSize = 18;
        const imgX = R - 2 - sigSize;
        doc.addImage(sigImg, "PNG", imgX, sigStartY + 6, sigSize, sigSize);
      }
    }

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("Authorized Signatory", R - 2, sigStartY + sigH - 2, { align: "right" });

    y = sigStartY + sigH;
    doc.line(M, y, R, y);

    // ══════ FOOTER ══════
    doc.setFontSize(5.5);
    doc.setTextColor(130, 130, 130);
    doc.text("This is a Computer Generated Quotation", W / 2, y + 3, { align: "center" });
    y += 5;

    // Draw border on final page
    doc.setTextColor(...BK);
    doc.setDrawColor(...BK);
    doc.setLineWidth(LW);
    doc.rect(M, pageStartY, CW, y - pageStartY);

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${quotation.quoteNumber}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (error) {
    console.error("Quotation PDF generation error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}

import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { notFound } from "next/navigation";
import Decimal from "decimal.js";
import PrintButton from "./print-button";

const TYPE_LABELS: Record<string, string> = {
  TAX_INVOICE: "Tax Invoice",
  PROFORMA: "Proforma Invoice",
  CREDIT_NOTE: "Credit Note",
  DEBIT_NOTE: "Debit Note",
};

function fmt(amount: number | string | Decimal): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount instanceof Decimal ? amount.toNumber() : amount;
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export default async function InvoicePdfPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("invoices:view");
  const { id } = await params;

  const [invoice, company] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { orderBy: { sortOrder: "asc" }, include: { product: true } },
        order: { select: { id: true, orderNumber: true } },
      },
    }),
    prisma.companySettings.findFirst(),
  ]);

  if (!invoice) notFound();

  const billing = invoice.billingAddress as Record<string, string> | null;
  const shipping = invoice.shippingAddress as Record<string, string> | null;
  const isIntra = !invoice.isInterState;
  const addr = [company?.addressLine1, company?.addressLine2, company?.city, company?.state, company?.pincode].filter(Boolean).join(", ");
  const contact = [company?.phone ? `Ph: ${company.phone}` : null, company?.email].filter(Boolean).join(" | ");
  const taxIds = [company?.gstin ? `GSTIN: ${company.gstin}` : null, company?.pan ? `PAN: ${company.pan}` : null, company?.fssaiNumber ? `FSSAI: ${company.fssaiNumber}` : null].filter(Boolean).join("  |  ");

  return (
    <>
      {/* Actions — hidden on print */}
      <div className="print:hidden mb-6 flex items-center justify-between" data-print-hide>
        <a href={`/invoices/${invoice.id}`} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
          &larr; Back
        </a>
        <div className="flex items-center gap-3">
          <a href={`/api/invoices/${invoice.id}/pdf`} download className="inline-flex items-center gap-2 rounded-lg bg-[#3E2723] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#5D4037] transition-colors">
            Download PDF
          </a>
          <PrintButton />
        </div>
      </div>

      {/* Tally-style Invoice */}
      <div className="max-w-[210mm] mx-auto bg-white text-black print:max-w-none print:mx-0 shadow-lg print:shadow-none font-[system-ui]" style={{ fontSize: "11px" }}>
        <div className="border-2 border-black m-4 print:m-0">

          {/* ═══ Company Header — square logo + name centered ═══ */}
          <div className="text-center py-3 px-4 border-b border-black">
            <img src="/brand/logo-square.png" alt="MEKOROCHI" className="w-20 h-20 mx-auto object-contain mb-1" />
            {company?.legalName && <p className="text-[10px] text-gray-600">{company.legalName}</p>}
            {addr && <p className="text-[10px]">{addr}</p>}
            {contact && <p className="text-[10px]">{contact}</p>}
            {taxIds && <p className="text-[10px] font-semibold mt-0.5">{taxIds}</p>}
          </div>

          {/* ═══ Invoice Title ═══ */}
          <div className="text-center py-1.5 border-b border-black font-bold text-sm">
            {TYPE_LABELS[invoice.type] || invoice.type}
          </div>

          {/* ═══ Invoice Meta — aligned colons ═══ */}
          <div className="border-b border-black">
            <div className="flex">
              <div className="flex-1 px-3 py-1.5 border-r border-black">
                <table className="text-[10.5px]">
                  <tbody>
                    <tr>
                      <td className="text-gray-600 pr-1 whitespace-nowrap">Invoice No.</td>
                      <td className="text-gray-600 px-1">:</td>
                      <td className="font-bold">{invoice.invoiceNumber}</td>
                    </tr>
                    <tr>
                      <td className="text-gray-600 pr-1 whitespace-nowrap">Due Date</td>
                      <td className="text-gray-600 px-1">:</td>
                      <td className="font-semibold">{formatDate(invoice.dueDate)}</td>
                    </tr>
                    {invoice.placeOfSupply && (
                      <tr>
                        <td className="text-gray-600 pr-1 whitespace-nowrap">Place of Supply</td>
                        <td className="text-gray-600 px-1">:</td>
                        <td className="font-semibold">{invoice.placeOfSupply}{invoice.isInterState ? " (Inter-State)" : ""}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex-1 px-3 py-1.5">
                <table className="text-[10.5px]">
                  <tbody>
                    <tr>
                      <td className="text-gray-600 pr-1 whitespace-nowrap">Dated</td>
                      <td className="text-gray-600 px-1">:</td>
                      <td className="font-bold">{formatDate(invoice.issueDate)}</td>
                    </tr>
                    {invoice.order && (
                      <tr>
                        <td className="text-gray-600 pr-1 whitespace-nowrap">Order Ref.</td>
                        <td className="text-gray-600 px-1">:</td>
                        <td className="font-semibold">{invoice.order.orderNumber}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ═══ Buyer + Ship To ═══ */}
          <div className="border-b border-black">
            <div className="flex">
              <div className="flex-1 px-3 py-1.5 border-r border-black">
                <p className="text-gray-600 mb-0.5">Buyer (Bill to)</p>
                <p className="font-bold">{invoice.customer.name}</p>
                {invoice.customer.company && <p className="text-[10px]">{invoice.customer.company}</p>}
                {billing && (
                  <p className="text-[10px]">{[billing.line1, billing.line2, [billing.city, billing.state, billing.pincode].filter(Boolean).join(", ")].filter(Boolean).join(", ")}</p>
                )}
                {invoice.customer.gstin && <p className="text-[10px] font-semibold">GSTIN: {invoice.customer.gstin}</p>}
                {invoice.customer.email && <p className="text-[10px] text-gray-500">{invoice.customer.email}</p>}
              </div>
              <div className="flex-1 px-3 py-1.5">
                {shipping ? (
                  <>
                    <p className="text-gray-600 mb-0.5">Ship to</p>
                    <p className="text-[10px]">{[shipping.line1, shipping.line2, [shipping.city, shipping.state, shipping.pincode].filter(Boolean).join(", ")].filter(Boolean).join(", ")}</p>
                  </>
                ) : (
                  <p className="text-gray-400 italic text-[10px]">Same as billing</p>
                )}
              </div>
            </div>
          </div>

          {/* ═══ Items Table ═══ */}
          <div className="border-b border-black">
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr className="border-b border-black font-bold text-center">
                  <th className="border-r border-black px-1 py-1.5 w-6 text-center">Sl</th>
                  <th className="border-r border-black px-1.5 py-1.5 text-left">Particulars</th>
                  <th className="border-r border-black px-1 py-1.5 w-12">HSN</th>
                  <th className="border-r border-black px-1 py-1.5 w-9 text-right">Qty</th>
                  <th className="border-r border-black px-1 py-1.5 w-14 text-right">Rate</th>
                  <th className="border-r border-black px-1 py-1.5 w-16 text-right">Taxable Amt</th>
                  {isIntra ? (
                    <>
                      <th className="border-r border-black px-1 py-1.5 w-10 text-center">CGST<br /><span className="font-normal text-[8px]">Rate</span></th>
                      <th className="border-r border-black px-1 py-1.5 w-14 text-right">CGST<br /><span className="font-normal text-[8px]">Amt</span></th>
                      <th className="border-r border-black px-1 py-1.5 w-10 text-center">SGST<br /><span className="font-normal text-[8px]">Rate</span></th>
                      <th className="border-r border-black px-1 py-1.5 w-14 text-right">SGST<br /><span className="font-normal text-[8px]">Amt</span></th>
                    </>
                  ) : (
                    <>
                      <th className="border-r border-black px-1 py-1.5 w-10 text-center">IGST<br /><span className="font-normal text-[8px]">Rate</span></th>
                      <th className="border-r border-black px-1 py-1.5 w-16 text-right">IGST<br /><span className="font-normal text-[8px]">Amt</span></th>
                    </>
                  )}
                  <th className="px-1 py-1.5 w-16 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={item.id} className="border-b border-gray-300">
                    <td className="border-r border-black px-1 py-1 text-center">{idx + 1}</td>
                    <td className="border-r border-black px-1.5 py-1">
                      <span className="font-medium">{item.description}</span>
                      {item.product?.sku && <span className="text-gray-400 text-[9px] ml-1">({item.product.sku})</span>}
                    </td>
                    <td className="border-r border-black px-1 py-1 text-center font-mono text-[9px]">{item.hsnCode || ""}</td>
                    <td className="border-r border-black px-1 py-1 text-right">{new Decimal(item.quantity.toString()).toFixed(2)}</td>
                    <td className="border-r border-black px-1 py-1 text-right">{fmt(item.unitPrice)}</td>
                    <td className="border-r border-black px-1 py-1 text-right">{fmt(item.taxableAmount)}</td>
                    {isIntra ? (
                      <>
                        <td className="border-r border-black px-1 py-1 text-center">{new Decimal(item.cgstRate.toString()).toFixed(1)}%</td>
                        <td className="border-r border-black px-1 py-1 text-right">{fmt(item.cgstAmount)}</td>
                        <td className="border-r border-black px-1 py-1 text-center">{new Decimal(item.sgstRate.toString()).toFixed(1)}%</td>
                        <td className="border-r border-black px-1 py-1 text-right">{fmt(item.sgstAmount)}</td>
                      </>
                    ) : (
                      <>
                        <td className="border-r border-black px-1 py-1 text-center">{new Decimal(item.igstRate.toString()).toFixed(1)}%</td>
                        <td className="border-r border-black px-1 py-1 text-right">{fmt(item.igstAmount)}</td>
                      </>
                    )}
                    <td className="px-1 py-1 text-right font-semibold">{fmt(item.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ═══ Totals Row ═══ */}
          <div className="border-b border-black">
            <div className="flex">
              {/* Amount in words — left */}
              <div className="flex-1 px-3 py-2 border-r border-black">
                <p className="text-[10px] text-gray-600">Amount Chargeable (in words):</p>
                {invoice.amountInWords && <p className="font-bold text-[10px] mt-0.5">{invoice.amountInWords}</p>}
              </div>
              {/* Totals — right */}
              <div className="w-[200px] px-3 py-1.5 text-[10px]">
                <div className="flex justify-between py-0.5"><span>Subtotal</span><span>{fmt(invoice.subtotal)}</span></div>
                {new Decimal(invoice.discountAmount.toString()).gt(0) && (
                  <div className="flex justify-between py-0.5"><span>Less: Discount</span><span>{fmt(invoice.discountAmount)}</span></div>
                )}
                {isIntra ? (
                  <>
                    <div className="flex justify-between py-0.5"><span>CGST</span><span>{fmt(invoice.cgstAmount)}</span></div>
                    <div className="flex justify-between py-0.5"><span>SGST</span><span>{fmt(invoice.sgstAmount)}</span></div>
                  </>
                ) : (
                  <div className="flex justify-between py-0.5"><span>IGST</span><span>{fmt(invoice.igstAmount)}</span></div>
                )}
                {new Decimal(invoice.shippingAmount.toString()).gt(0) && (
                  <div className="flex justify-between py-0.5"><span>Shipping</span><span>{fmt(invoice.shippingAmount)}</span></div>
                )}
                {!new Decimal(invoice.roundOff.toString()).isZero() && (
                  <div className="flex justify-between py-0.5"><span>Round Off</span><span>{new Decimal(invoice.roundOff.toString()).gt(0) ? "+" : ""}{new Decimal(invoice.roundOff.toString()).toFixed(2)}</span></div>
                )}
                <div className="flex justify-between py-1 border-t border-black font-bold text-xs mt-0.5">
                  <span>Total</span>
                  <span>₹ {fmt(invoice.totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ Bank Details + Signature — compact ═══ */}
          <div className="flex" style={{ minHeight: "70px" }}>
            {/* Bank + Notes — left */}
            <div className="flex-1 px-3 py-2 border-r border-black text-[10px]">
              {(company?.bankName || company?.upiId) && (
                <div className="mb-1.5">
                  <p className="font-bold mb-0.5">Bank Details:</p>
                  {company?.bankName && <p>Bank: {company.bankName}{company.bankBranch ? `, ${company.bankBranch}` : ""}</p>}
                  {company?.bankAccountName && <p>A/C Name: {company.bankAccountName}</p>}
                  {company?.bankAccountNumber && <p>A/C No.: {company.bankAccountNumber}</p>}
                  {company?.bankIfsc && <p>IFSC: {company.bankIfsc}</p>}
                  {company?.upiId && <p>UPI: {company.upiId}</p>}
                </div>
              )}
              {invoice.notes && <p className="text-[9px] text-gray-600">Notes: {invoice.notes}</p>}
              {invoice.termsConditions && <p className="text-[9px] text-gray-600">Terms: {invoice.termsConditions}</p>}
            </div>

            {/* Signature — right, compact */}
            <div className="w-[50%] px-3 py-2 flex flex-col text-[10px]">
              <p className="font-bold">For {company?.companyName || "MEKOROCHI"}</p>
              <div className="flex items-center justify-center py-1" style={{ minHeight: "36px" }}>
                {company?.signatureUrl && (
                  <img src={company.signatureUrl} alt="Signature" className="max-h-10 object-contain" />
                )}
              </div>
              <p className="text-center text-gray-600 border-t border-gray-400 pt-0.5 mt-auto">Authorized Signatory</p>
            </div>
          </div>

          {/* ═══ Footer ═══ */}
          <div className="border-t border-black text-center py-1 text-[9px] text-gray-500">
            This is a Computer Generated Invoice
          </div>

        </div>
      </div>
    </>
  );
}

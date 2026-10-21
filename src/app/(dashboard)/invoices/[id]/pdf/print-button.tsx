"use client";

import { useEffect } from "react";

export default function PrintButton() {
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @media print {
        @page { size: A4; margin: 10mm; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        nav, aside, header, footer, [data-print-hide] { display: none !important; }
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg border border-[#3E2723] px-5 py-2.5 text-sm font-medium text-[#3E2723] hover:bg-[#3E2723]/5 transition-colors"
    >
      Print
    </button>
  );
}

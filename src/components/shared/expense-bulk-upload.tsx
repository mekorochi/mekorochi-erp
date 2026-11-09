"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, X } from "lucide-react";
import { bulkUploadExpenses } from "@/app/(dashboard)/expenses/actions";

export function ExpenseBulkUpload() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<{ created?: number; errors?: string[]; error?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      setResult({ error: "Please upload a .csv file" });
      return;
    }
    setFileName(file.name);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) { setResult({ error: "Could not read file" }); return; }

      startTransition(async () => {
        const res = await bulkUploadExpenses(text);
        setResult(res);
        if (res.success) router.refresh();
      });
    };
    reader.readAsText(file);
  }

  return (
    <div className="bg-card rounded-xl border shadow-sm p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">Bulk Upload Expenses</h2>
        </div>
        <a
          href="/api/expenses/template"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium"
        >
          <Download className="h-4 w-4" />
          Download Template
        </a>
      </div>

      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => { e.preventDefault(); setDragActive(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <Upload className={`h-8 w-8 mx-auto mb-2 ${dragActive ? "text-primary" : "text-muted-foreground"}`} />
        {isPending ? (
          <p className="text-sm text-muted-foreground">Processing {fileName}...</p>
        ) : (
          <>
            <p className="text-sm font-medium">Drop CSV file here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">
              Download the template first, fill in your expenses, then upload
            </p>
          </>
        )}
      </div>

      {result && !isPending && (
        <div className="space-y-2">
          {result.error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              {result.error}
            </div>
          )}

          {result.created !== undefined && (
            <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              Successfully created {result.created} expense{result.created !== 1 ? "s" : ""}
            </div>
          )}

          {result.errors && result.errors.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm space-y-1">
              <p className="font-medium flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" />
                {result.errors.length} row{result.errors.length !== 1 ? "s" : ""} had issues:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-xs max-h-40 overflow-y-auto">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={() => { setResult(null); setFileName(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        </div>
      )}
    </div>
  );
}

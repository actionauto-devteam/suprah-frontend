"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileUp, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/providers/AuthProvider";
import { afterSaleError, importSales, type SalesImportResult, type SalesImportRow } from "@/lib/api/afterSale";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_ROWS = 20000;
const BATCH = 300;

const COLUMNS: Record<keyof Omit<SalesImportRow, "row">, string[]> = {
  email: ["email", "customer email", "e-mail", "email address"],
  phone: ["phone", "customer phone", "phone number", "mobile", "cell", "cell phone"],
  vin: ["vin", "vin number"],
  stock: ["stock", "stock #", "stock number", "stock no", "stock no."],
  year: ["year"],
  make: ["make"],
  model: ["model"],
  trim: ["trim"],
  salePrice: ["sale price", "selling price", "sold price", "price", "amount"],
  soldAt: ["sold date", "sale date", "date sold", "deal date", "delivery date", "date"],
  salesperson: ["salesperson", "sales person", "sales rep", "rep"],
  notes: ["notes", "note"],
};

type Parsed = { fileName: string; rows: SalesImportRow[]; found: string[] };

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function cellText(value: unknown): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  return String(value ?? "").trim().slice(0, 300);
}

async function readSalesFile(file: File): Promise<Parsed> {
  if (file.size > MAX_FILE_BYTES) throw new Error("This file is too big. Split it into smaller files.");
  const isCsv = /\.csv$/i.test(file.name) || file.type === "text/csv";
  const XLSX = await import("xlsx");
  const book = isCsv ? XLSX.read(await file.text(), { type: "string", raw: true }) : XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const sheet = book.Sheets[book.SheetNames[0]];
  if (!sheet) throw new Error("This file has no data.");
  const table = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "", blankrows: false });
  const headers = (table[0] || []).map((value) => cellText(value).toLowerCase().replace(/\s+/g, " "));
  const index = Object.fromEntries(
    Object.entries(COLUMNS).map(([key, names]) => [key, headers.findIndex((header) => names.includes(header))]),
  ) as Record<keyof typeof COLUMNS, number>;
  if (index.email === -1 && index.phone === -1) throw new Error("This file needs an Email or Phone column to find the customer.");
  if (index.soldAt === -1) throw new Error("This file needs a Sale date (or Sold date) column.");
  if (index.vin === -1 && index.stock === -1 && index.model === -1) throw new Error("This file needs a VIN, Stock number or Model column.");
  const body = table.slice(1).filter((row) => Array.isArray(row) && row.some((value) => cellText(value)));
  if (!body.length) throw new Error("This file has no rows.");
  if (body.length > MAX_ROWS) throw new Error(`This file has more than ${MAX_ROWS.toLocaleString("en-US")} rows. Split it into smaller files.`);
  const rows = body.map((row, position) => {
    const entry: SalesImportRow = { row: position + 2 };
    (Object.keys(COLUMNS) as Array<keyof typeof COLUMNS>).forEach((key) => {
      if (index[key] !== -1) entry[key] = cellText(row[index[key]]);
    });
    return entry;
  });
  const found = (Object.keys(COLUMNS) as Array<keyof typeof COLUMNS>).filter((key) => index[key] !== -1);
  return { fileName: file.name, rows, found };
}

const COLUMN_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Phone",
  vin: "VIN",
  stock: "Stock number",
  year: "Year",
  make: "Make",
  model: "Model",
  trim: "Trim",
  salePrice: "Sale price",
  soldAt: "Sale date",
  salesperson: "Salesperson",
  notes: "Notes",
};

export function ImportSalesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [parsed, setParsed] = React.useState<Parsed | null>(null);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [result, setResult] = React.useState<SalesImportResult | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setParsed(null);
    setError("");
    setBusy(false);
    setProgress(0);
    setResult(null);
  }, [open]);

  const pick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setResult(null);
    try {
      setParsed(await readSalesFile(file));
    } catch (err) {
      setParsed(null);
      setError(err instanceof Error ? err.message : "Couldn't read this file.");
    }
  };

  const run = async () => {
    if (!parsed) return;
    setBusy(true);
    setError("");
    const total: SalesImportResult = { added: 0, duplicates: 0, unmatched: 0, invalid: 0, problems: [] };
    try {
      const token = await getToken();
      for (let start = 0; start < parsed.rows.length; start += BATCH) {
        const batch = await importSales(token, parsed.rows.slice(start, start + BATCH));
        total.added += batch.added;
        total.duplicates += batch.duplicates;
        total.unmatched += batch.unmatched;
        total.invalid += batch.invalid;
        total.problems = [...total.problems, ...batch.problems].slice(0, 100);
        setProgress(Math.min(parsed.rows.length, start + BATCH));
      }
      setResult(total);
      void queryClient.invalidateQueries({ queryKey: ["customer-purchases"] });
    } catch (err) {
      setError(afterSaleError(err, "The import stopped. Sales already imported are kept, so you can run the same file again."));
      if (total.added || total.duplicates || total.unmatched || total.invalid) setResult(total);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg" aria-describedby="import-sales-description">
        <DialogHeader>
          <DialogTitle>Import sales</DialogTitle>
          <DialogDescription id="import-sales-description">
            Add past sales from a spreadsheet (CSV or Excel), for example a sales export from your dealer system.
          </DialogDescription>
        </DialogHeader>
        <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          <li>Each row needs the customer&apos;s email or phone, the sale date, and the vehicle (VIN, stock number, or year, make and model).</li>
          <li>Sale price and salesperson are optional.</li>
          <li>Rows are matched to existing Customer Records by email or phone. Rows with no matching customer are skipped and listed.</li>
          <li>Importing the same file again does not add the same sale twice.</li>
        </ul>

        <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-5 text-center text-sm hover:bg-muted/50">
          <FileUp className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">{parsed ? parsed.fileName : "Choose a CSV or Excel file"}</span>
          {parsed && (
            <span className="text-xs text-muted-foreground">
              {parsed.rows.length.toLocaleString("en-US")} rows · Columns found: {parsed.found.map((key) => COLUMN_LABELS[key]).join(", ")}
            </span>
          )}
          <input type="file" accept=".csv,.xlsx,.xls,text/csv" className="sr-only" onChange={pick} disabled={busy} aria-label="Choose a CSV or Excel file" />
        </label>

        {busy && parsed && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" />
            Importing {progress.toLocaleString("en-US")} of {parsed.rows.length.toLocaleString("en-US")}…
          </p>
        )}

        {result && (
          <div className="space-y-2 rounded-lg border p-3 text-sm" role="status" data-testid="import-sales-result">
            <p className="font-medium">
              {result.added} added · {result.duplicates} already imported · {result.unmatched} with no matching customer · {result.invalid} with missing details
            </p>
            {result.problems.length > 0 && (
              <ul className="max-h-40 space-y-0.5 overflow-y-auto text-xs text-muted-foreground">
                {result.problems.map((problem) => (
                  <li key={`${problem.row}-${problem.reason}`}>
                    Row {problem.row}: {problem.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/[0.06] px-3 py-2 text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => onOpenChange(false)} disabled={busy} className="h-11 rounded-lg border px-4 text-sm font-medium hover:bg-muted disabled:opacity-45 sm:h-10">
            {result ? "Done" : "Cancel"}
          </button>
          {!result && (
            <button
              type="button"
              onClick={run}
              disabled={!parsed || busy}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-45 sm:h-10"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Import {parsed ? `${parsed.rows.length.toLocaleString("en-US")} rows` : ""}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

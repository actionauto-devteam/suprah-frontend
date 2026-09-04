import { toast } from "sonner";

export interface CsvColumn<T> {
  key: Extract<keyof T, string>;
  label: string;
}

const escapeCell = (value: unknown) => {
  if (value === null || value === undefined) return "";
  const text = value instanceof Date ? value.toISOString() : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function exportRowsToCsv<T>(
  name: string,
  rows: T[],
  columns: CsvColumn<T>[],
) {
  if (!rows.length) {
    toast.error("Nothing to export");
    return;
  }

  const header = columns.map((column) => escapeCell(column.label)).join(",");
  const body = rows
    .map((row) => columns.map((column) => escapeCell((row as Record<string, unknown>)[column.key])).join(","))
    .join("\n");

  const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast.success(`Exported ${rows.length} row${rows.length === 1 ? "" : "s"}`);
}

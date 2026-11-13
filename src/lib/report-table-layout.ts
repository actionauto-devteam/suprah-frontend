// ─── Report tables on any screen (2026-11-13) ────────────────────────────────
// A report table is as wide as its columns. Where the screen is narrower than
// that (phones, small windows), each row is shown as a card of "Column: value"
// lines instead, so nothing scrolls sideways or gets cut off.

/** The width a column asks for when it doesn't set one. */
export const DEFAULT_REPORT_COLUMN_WIDTH = 150

/** How wide the table needs to be to show these columns. */
export function reportTableMinWidth(columns: Array<{ width?: number }>): number {
  return columns.reduce((total, column) => total + (column.width ?? DEFAULT_REPORT_COLUMN_WIDTH), 0)
}

/** "table" when every column fits the available width, otherwise "cards". */
export function reportTableLayout(availableWidth: number, tableMinWidth: number): "table" | "cards" {
  if (!Number.isFinite(availableWidth) || availableWidth <= 0) return "cards"
  return availableWidth >= tableMinWidth ? "table" : "cards"
}

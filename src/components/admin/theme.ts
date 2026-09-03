export const ADMIN_HEADER_PANEL_CLASS =
  "relative overflow-hidden rounded-2xl border border-border/40 bg-card";

export const ADMIN_PANEL_CLASS =
  "relative overflow-hidden rounded-xl border border-border/40 bg-card";

export const ADMIN_EYEBROW_CLASS =
  "text-[10px] font-black uppercase tracking-[0.25em] text-primary/80";

export const PANEL = "rounded-lg border border-border bg-card";

export const PANEL_HEADER =
  "flex items-center justify-between gap-3 border-b border-border px-4 py-3";

export const PANEL_BODY = "p-4";

export const LABEL = "text-xs font-medium text-muted-foreground";

export const LABEL_UPPER =
  "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

export const NUM = "tabular-nums";

export const ROW_DENSITY = {
  compact: "h-10 text-[13px]",
  comfortable: "h-14 text-sm",
} as const;

export type RowDensity = keyof typeof ROW_DENSITY;

export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background";

export const KBD =
  "inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground";

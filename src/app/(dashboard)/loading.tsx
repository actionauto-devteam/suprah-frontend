export default function DashboardLoading() {
  return (
    <div
      className="min-h-[60vh] w-full bg-background px-4 py-8"
      role="status"
      aria-live="polite"
      aria-label="Preparing workspace"
    >
      <div className="mx-auto flex max-w-xl flex-col items-center justify-center gap-5 rounded-2xl border border-border/40 bg-card/70 px-6 py-10 text-center shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
        </div>
        <div>
          <p className="text-sm font-black text-foreground">Preparing workspace</p>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
            Loading your dashboard shell and the information needed for this workspace.
          </p>
        </div>
        <div className="grid w-full grid-cols-3 gap-2" aria-hidden="true">
          <div className="h-2 animate-pulse rounded-full bg-muted" />
          <div className="h-2 animate-pulse rounded-full bg-muted/70" />
          <div className="h-2 animate-pulse rounded-full bg-muted/50" />
        </div>
      </div>
    </div>
  );
}
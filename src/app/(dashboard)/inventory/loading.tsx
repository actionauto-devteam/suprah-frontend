import { Loader2 } from "lucide-react";

export default function InventoryLoading() {
  return (
    <div
      className="mx-auto min-h-[60vh] w-full max-w-8xl space-y-3 px-3 py-3 sm:space-y-4 sm:px-4 sm:py-6"
      role="status"
      aria-live="polite"
      aria-label="Preparing inventory"
    >
      <section className="relative overflow-hidden rounded-2xl border border-border/40 bg-card px-4 py-4 sm:px-6 sm:py-5">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-primary via-emerald-400 to-primary/0" />
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/8">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary/80">
              Dealership
            </p>
            <h1 className="mt-1 text-xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
              Preparing <span className="text-primary">Inventory</span>
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Loading the latest vehicle records and preparing the first visible results.
            </p>
          </div>
        </div>
      </section>

      {/* Mobile route transition: compact placeholders avoid a second
          full-height card-like loading screen after the global app splash. */}
      <div className="space-y-2 md:hidden" aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="flex min-h-25 overflow-hidden rounded-2xl border border-border/50 bg-card"
          >
            <div className="w-28 shrink-0 animate-pulse bg-muted/70 dark:bg-zinc-900" />
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 px-3 py-3">
              <div className="h-3.5 w-3/4 animate-pulse rounded-md bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded-md bg-muted/70" />
              <div className="flex gap-2">
                <div className="h-7 w-20 animate-pulse rounded-lg bg-muted/55" />
                <div className="h-7 w-16 animate-pulse rounded-lg bg-muted/55" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-6" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-2xl border border-border/50 bg-card"
          >
            <div className="aspect-16/10 animate-pulse bg-muted/70 dark:bg-zinc-900" />
            <div className="space-y-3 p-4">
              <div className="h-4 w-2/3 animate-pulse rounded-md bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded-md bg-muted/70" />
              <div className="grid grid-cols-3 gap-2">
                <div className="h-9 animate-pulse rounded-xl bg-muted/55" />
                <div className="h-9 animate-pulse rounded-xl bg-muted/55" />
                <div className="h-9 animate-pulse rounded-xl bg-muted/55" />
              </div>
              <div className="h-12 animate-pulse rounded-xl bg-muted/65" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
"use client";

import * as React from "react";
import { Check, Loader2, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { searchInventoryVehicles, type InventoryVehicleSummary } from "@/lib/api/leadVehiclePreview";
import { cn } from "@/lib/utils";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

type SearchState = "idle" | "loading" | "done" | "error";

function vehicleName(vehicle: InventoryVehicleSummary): string {
  return [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(" ") || "Vehicle";
}

function vehicleFacts(vehicle: InventoryVehicleSummary): string {
  return [
    vehicle.stockNumber ? `#${vehicle.stockNumber}` : "",
    vehicle.price !== null ? money.format(vehicle.price) : "",
    vehicle.status || "",
  ]
    .filter(Boolean)
    .join(" · ");
}

export function VehiclePicker({
  currentVehicleId,
  hasVehicle,
  onPick,
}: {
  currentVehicleId?: string | null;
  hasVehicle: boolean;
  onPick: (vehicleId: string) => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<InventoryVehicleSummary[]>([]);
  const [state, setState] = React.useState<SearchState>("idle");
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const needle = query.replace(/\s+/g, " ").trim();

  React.useEffect(() => {
    if (!open || needle.length < 2) {
      setResults([]);
      setState("idle");
      return;
    }
    const controller = new AbortController();
    setState("loading");
    const timer = window.setTimeout(() => {
      searchInventoryVehicles(needle, controller.signal)
        .then((rows) => {
          setResults(rows);
          setState("done");
        })
        .catch(() => {
          if (!controller.signal.aborted) setState("error");
        });
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [needle, open]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setQuery("");
  };

  const pick = async (vehicle: InventoryVehicleSummary) => {
    if (savingId) return;
    if (vehicle.id === currentVehicleId) {
      handleOpenChange(false);
      return;
    }
    setSavingId(vehicle.id);
    const saved = await onPick(vehicle.id).then(
      () => true,
      () => false,
    );
    setSavingId(null);
    if (saved) handleOpenChange(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-7 shrink-0 items-center rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-500/20 dark:text-emerald-300"
          data-testid="overview-pick-vehicle"
        >
          {hasVehicle ? "Change" : "Pick from inventory"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="z-200 w-80 max-w-[calc(100vw-2rem)] p-2" align="end">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Stock #, VIN, or year make model"
            aria-label="Search your inventory"
            autoComplete="off"
            autoFocus
            className="h-9 w-full rounded-md border border-border bg-transparent pl-7 pr-2 text-[16px] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary md:text-xs"
            data-testid="vehicle-search"
          />
        </div>

        <div className="mt-1.5 max-h-72 overflow-y-auto" aria-live="polite">
          {state === "idle" ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">Type at least 2 letters or numbers.</p>
          ) : state === "loading" ? (
            <p className="flex items-center gap-1.5 px-2 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Searching your inventory…
            </p>
          ) : state === "error" ? (
            <p className="px-2 py-2 text-xs text-red-500">Couldn&apos;t search the inventory. Please try again.</p>
          ) : results.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted-foreground" data-testid="vehicle-search-empty">
              No vehicles in your current inventory match &quot;{needle}&quot;.
            </p>
          ) : (
            results.map((vehicle) => {
              const current = vehicle.id === currentVehicleId;
              return (
                <button
                  key={vehicle.id}
                  type="button"
                  onClick={() => void pick(vehicle)}
                  disabled={Boolean(savingId)}
                  className={cn(
                    "flex w-full items-start justify-between gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted disabled:opacity-60",
                    current && "bg-muted",
                  )}
                  data-testid="vehicle-option"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold">{vehicleName(vehicle)}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{vehicleFacts(vehicle)}</span>
                    {vehicle.vin ? (
                      <span className="block truncate font-mono text-[10px] text-muted-foreground">VIN {vehicle.vin}</span>
                    ) : null}
                  </span>
                  {savingId === vehicle.id ? (
                    <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" />
                  ) : current ? (
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
        <p className="mt-1 border-t border-border px-2 pt-1.5 text-[10px] text-muted-foreground">
          Only vehicles in your current inventory are shown.
        </p>
      </PopoverContent>
    </Popover>
  );
}

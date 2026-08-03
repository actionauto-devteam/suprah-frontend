"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Car } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Panel, PanelSkeleton } from "./DashboardPanel";

interface VehicleStats {
  total: number;
  byStatus: Record<string, number>;
  averagePrice: number;
  averageDaysOnLot: number;
}

function fmtMoney(n: number): string {
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
}

export function InventorySnapshot() {
  const router = useRouter();
  const [stats, setStats] = React.useState<VehicleStats | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const controller = new AbortController();
    apiClient
      .get("/api/vehicles/stats", { signal: controller.signal })
      .then((res) => setStats(res.data?.data || null))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const readyForSale = stats?.byStatus?.["Ready for Sale"] ?? 0;
  const inRecon = stats?.byStatus?.["In Recon"] ?? 0;
  const sold = stats?.byStatus?.["Sold"] ?? 0;

  return (
    <Panel title="Inventory" icon={Car} accent="text-cyan-500" action="View More" onAction={() => router.push("/inventory")}>
      {loading ? (
        <PanelSkeleton rows={2} />
      ) : !stats ? (
        <p className="text-xs text-muted-foreground/60 text-center py-6">Inventory data unavailable.</p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-border/30 bg-background/40 p-2.5 text-center">
              <p className="text-xl font-black tabular-nums text-emerald-500">{readyForSale}</p>
              <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground/60">Ready</p>
            </div>
            <div className="rounded-2xl border border-border/30 bg-background/40 p-2.5 text-center">
              <p className="text-xl font-black tabular-nums text-amber-500">{inRecon}</p>
              <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground/60">In Recon</p>
            </div>
            <div className="rounded-2xl border border-border/30 bg-background/40 p-2.5 text-center">
              <p className="text-xl font-black tabular-nums">{sold}</p>
              <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground/60">Sold</p>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-border/30 bg-background/40 px-3.5 py-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60">Avg. price</span>
            <span className="text-sm font-black tabular-nums">{fmtMoney(stats.averagePrice)}</span>
          </div>
        </div>
      )}
    </Panel>
  );
}

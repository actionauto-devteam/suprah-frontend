"use client";

import * as React from "react";
import { ExternalLink, Loader2, RefreshCw, Route } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { userErrorMessage } from "@/lib/user-error";
import { useAuth } from "@/providers/AuthProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TripRouteMap } from "./TripRouteMap";

// GET /api/driver-tracking/loads/:id/trip-history (driverTracking.controller)
interface TripPoint {
  driverId: string;
  lat: number;
  lng: number;
  measuredAt: string;
  accuracyMeters: number | null;
  speedMetersPerSecond: number | null;
  heading: number | null;
  source: "browser" | "traccar";
  loadStatus: string;
}

interface TripHistory {
  loadId: string;
  loadNumber: string;
  status: string;
  retentionDays: number;
  totalPoints: number;
  thinned: boolean;
  drivers: Array<{ id: string; name: string }>;
  points: TripPoint[];
}

interface LoadTripHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loadId: string | null;
}

const ROWS_PER_PAGE = 100;
const SOURCE_LABELS: Record<TripPoint["source"], string> = {
  browser: "Driver Portal",
  traccar: "Traccar Client",
};

function formatWhen(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

// Google Maps URLs need no API key.
const googleMapsPointUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)}%2C${lng.toFixed(6)}`;

/**
 * The route a load's driver reported while the load was tracked (Accepted →
 * Delivered), newest first. Kept 30 days; visible to the load's responsible
 * dispatcher and organization admins (the server enforces both).
 */
export function LoadTripHistoryDialog({ open, onOpenChange, loadId }: LoadTripHistoryDialogProps) {
  const { getToken } = useAuth();
  const [attempt, setAttempt] = React.useState(0);
  const [shown, setShown] = React.useState(ROWS_PER_PAGE);
  const [result, setResult] = React.useState<{ key: string; data: TripHistory | null; error: string | null } | null>(null);
  const requestKey = open && loadId ? `${loadId}:${attempt}` : null;

  React.useEffect(() => {
    if (!requestKey || !loadId) return;
    let cancelled = false;
    void (async () => {
      try {
        const token = await getToken();
        const response = await apiClient.get(
          `/api/driver-tracking/loads/${encodeURIComponent(loadId)}/trip-history`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} },
        );
        if (!cancelled) setResult({ key: requestKey, data: (response.data?.data as TripHistory) ?? null, error: null });
      } catch (error) {
        if (!cancelled) setResult({ key: requestKey, data: null, error: userErrorMessage(error, "load the trip history") });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestKey, loadId, getToken]);

  const current = result && result.key === requestKey ? result : null;
  const loading = Boolean(requestKey) && !current;
  const history = current?.data ?? null;
  const newestFirst = React.useMemo(() => (history ? [...history.points].reverse() : []), [history]);
  const driverNames = React.useMemo(
    () => new Map((history?.drivers ?? []).map((driver) => [driver.id, driver.name])),
    [history],
  );
  const firstPoint = history?.points[0] ?? null;
  const lastPoint = history?.points[history.points.length - 1] ?? null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setShown(ROWS_PER_PAGE);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Route className="size-5" /> Trip history
          </DialogTitle>
          <DialogDescription>
            {history?.loadNumber ? `Load ${history.loadNumber} — ` : ""}where the driver&apos;s phone reported
            being while this load was tracked, from acceptance to delivery. Newest first. Positions are kept for{" "}
            {history?.retentionDays ?? 30} days after they were recorded.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : current?.error ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-destructive">{current.error}</p>
            <Button variant="outline" size="sm" onClick={() => setAttempt((value) => value + 1)}>
              <RefreshCw className="mr-2 size-3.5" /> Try again
            </Button>
          </div>
        ) : !history || history.points.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No positions recorded for this load in the last {history?.retentionDays ?? 30} days. Positions are recorded
            once the driver accepts the load and shares their location.
          </p>
        ) : (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-border/60 bg-muted/10 p-3 text-xs sm:grid-cols-4">
              <div>
                <dt className="font-semibold text-muted-foreground">First position</dt>
                <dd>{formatWhen(firstPoint?.measuredAt)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-muted-foreground">Latest position</dt>
                <dd>{formatWhen(lastPoint?.measuredAt)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-muted-foreground">Positions</dt>
                <dd>
                  {history.totalPoints.toLocaleString()}
                  {history.thinned ? ` (showing ${history.points.length.toLocaleString()}, evenly spread)` : ""}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-muted-foreground">{history.drivers.length > 1 ? "Drivers" : "Driver"}</dt>
                <dd>{history.drivers.map((driver) => driver.name).join(", ") || "—"}</dd>
              </div>
            </dl>

            <TripRouteMap points={history.points} driverNames={driverNames} />

            <ol className="divide-y divide-border/60 rounded-xl border border-border/60">
              {newestFirst.slice(0, shown).map((point) => (
                <li key={`${point.measuredAt}:${point.source}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-xs">
                  <span className="min-w-44 font-medium">{formatWhen(point.measuredAt)}</span>
                  <Badge variant="outline" className="text-[10px]">{point.loadStatus}</Badge>
                  <span className="text-muted-foreground">{SOURCE_LABELS[point.source] ?? point.source}</span>
                  {history.drivers.length > 1 && (
                    <span className="text-muted-foreground">{driverNames.get(point.driverId) ?? "Driver"}</span>
                  )}
                  {point.accuracyMeters !== null && (
                    <span className="text-muted-foreground">±{Math.round(point.accuracyMeters)} m</span>
                  )}
                  {point.speedMetersPerSecond !== null && (
                    <span className="text-muted-foreground">{Math.round(point.speedMetersPerSecond * 2.23694)} mph</span>
                  )}
                  <a
                    href={googleMapsPointUrl(point.lat, point.lng)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                    title={`${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`}
                  >
                    Open in Google Maps <ExternalLink className="size-3" />
                  </a>
                </li>
              ))}
            </ol>

            {newestFirst.length > shown && (
              <div className="flex justify-center">
                <Button variant="outline" size="sm" onClick={() => setShown((value) => value + ROWS_PER_PAGE)}>
                  Show {Math.min(ROWS_PER_PAGE, newestFirst.length - shown)} earlier positions
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

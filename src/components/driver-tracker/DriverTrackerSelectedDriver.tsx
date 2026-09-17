"use client";

import { relativeLocationTime } from "@/lib/driver-tracker-mobile";
import { Activity, ArrowRight, Crosshair, MapPin, MessageCircle, Package, Radio, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { DriverStatus, DriverTrackingItem } from "@/types/driver-tracking";
import { formatTrackingTime, trackingState, validCoordinates } from "@/lib/driver-tracking-view";

interface Props {
  driver: DriverTrackingItem;
  now: number;
  following: boolean;
  mapReady: boolean;
  activityLabels?: Record<DriverStatus, string>;
  onFollow?: () => void;
  onClear?: () => void;
  onDetails?: () => void;
  onChat?: () => void;
}

export function DriverTrackerSelectedDriver({ driver, now, following, mapReady, activityLabels, onFollow, onClear, onDetails, onChat }: Props) {
  const tracking = trackingState(driver, now);
  const fresh = tracking.kind === "live";
  const name = driver.driver?.name || "Driver";
  const load = driver.shipments[0];
  const accuracy = driver.accuracy;
  const followClass = following
    ? "border-emerald-500 bg-emerald-700 text-white hover:bg-emerald-800 hover:text-white ring-2 ring-emerald-500/25"
    : "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 disabled:border-border disabled:bg-muted disabled:text-muted-foreground";

  return (
    <>
    <section aria-label="Selected driver preview" className="rounded-xl border border-primary/25 bg-card p-3 md:hidden">
      <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><h3 className="break-words text-base font-bold">{name}</h3><p className="mt-1 text-xs text-muted-foreground">{activityLabels?.[driver.status] ?? driver.status} · {tracking.label}</p></div><Button type="button" variant="ghost" size="icon" className="size-11 shrink-0" onClick={onClear} aria-label="Clear selected driver"><X className="size-4" /></Button></div>
      <p className="mt-1 text-xs text-muted-foreground">Location: {relativeLocationTime(driver.locationRecordedAt, now)}</p>
      <p className="mt-2 break-words text-sm font-semibold">{load?.trackingNumber || load?.id || (driver.activeLoadCount ? "Load details unavailable" : "No active load")}{driver.shipments.length > 1 ? ` · +${driver.shipments.length - 1} more` : ""}</p>
      <div className="mt-3 grid grid-cols-2 gap-2"><Button type="button" variant="outline" className={"min-h-11 text-xs " + followClass} aria-pressed={following} disabled={!following && (!validCoordinates(driver.coords) || !mapReady)} onClick={onFollow}>{following ? "Stop following" : "Follow driver"}</Button><Button type="button" variant="outline" className="min-h-11 text-xs" onClick={onChat}><MessageCircle className="size-4" />Chat</Button><Button type="button" className="col-span-2 min-h-11 text-sm" onClick={onDetails}>Open driver workspace</Button></div>
      {following && <p role="status" className="mt-2 text-xs text-muted-foreground">{fresh ? "Following confirmed updates. Pan to stop." : "Waiting for a fresh confirmed location."}</p>}
      <details className="mt-2 text-xs text-muted-foreground"><summary className="flex min-h-11 cursor-pointer items-center font-semibold">Location details</summary><p>Measured: {formatTrackingTime(driver.locationRecordedAt)}</p><p className="mt-1">Confirmed: {formatTrackingTime(driver.lastSeenAt)}</p>{accuracy != null && Number.isFinite(accuracy) && <p className="mt-1">Accuracy ±{Math.round(accuracy)} m</p>}{!fresh && <p className="mt-1">This may be a last known position.</p>}</details>
    </section>
    <section aria-label="Selected driver" className="relative hidden min-w-0 md:block overflow-hidden rounded-xl border border-primary/25 bg-linear-to-br from-primary/[0.08] via-card to-card p-3 text-card-foreground shadow-sm sm:p-4">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/70 to-transparent" />
      <div className="flex min-w-0 items-start gap-3">
        <Avatar className="size-11 shrink-0 border border-primary/25 shadow-sm">
          {driver.driver?.avatar && <AvatarImage src={driver.driver.avatar} alt="" />}
          <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">{name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Suprah AI · Driver focus</p>
          <h3 className="mt-1 break-words text-base font-bold leading-tight sm:text-lg">{name}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 font-semibold ${fresh ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-muted/40 text-muted-foreground"}`}>
              <Radio className="size-3" aria-hidden="true" />{tracking.label}
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Activity className="size-3" aria-hidden="true" />Activity: {activityLabels?.[driver.status] ?? driver.status}</span>
          </div>
        </div>
        <Button type="button" size="icon" variant="ghost" className="size-11 shrink-0 rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary" onClick={onClear} aria-label="Clear selected driver"><X className="size-4" /></Button>
      </div>

      <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2">
        <div className="min-w-0 rounded-lg border border-border/60 bg-background/45 p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"><Package className="size-3.5 text-primary" />Active load</p>
          <p className="mt-1.5 break-all text-sm font-semibold">{load?.trackingNumber || load?.id || (driver.activeLoadCount ? "Load details unavailable" : "No active load")}</p>
          {load && <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground"><span className="break-words">{load.origin || "Pickup not provided"}</span><ArrowRight className="size-3 shrink-0 text-primary" /><span className="break-words">{load.destination || "Delivery not provided"}</span></p>}
          {driver.shipments.length > 1 && <p className="mt-1 text-xs text-primary">+{driver.shipments.length - 1} more · View Details & loads</p>}
        </div>
        <div className="min-w-0 rounded-lg border border-border/60 bg-background/45 p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"><MapPin className="size-3.5 text-primary" />Location updates</p>
          <dl className="mt-1.5 space-y-1 text-xs">
            <div><dt className="inline text-muted-foreground">Measured: </dt><dd className="inline font-medium">{formatTrackingTime(driver.locationRecordedAt)}</dd></div>
            <div><dt className="inline text-muted-foreground">Confirmed: </dt><dd className="inline font-medium">{formatTrackingTime(driver.lastSeenAt)}</dd></div>
          </dl>
          {accuracy != null && Number.isFinite(accuracy) && <p className="mt-1 text-xs text-muted-foreground">Accuracy ±{Math.round(accuracy)} m</p>}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 min-[400px]:grid-cols-3">
        <Button type="button" className={"min-h-11 gap-2 rounded-lg text-xs font-semibold " + followClass} variant="outline" aria-pressed={following} disabled={!following && (!validCoordinates(driver.coords) || !mapReady)} onClick={onFollow}><Crosshair className="size-4 shrink-0" />{following ? "Stop following" : "Follow driver"}</Button>
        <Button type="button" className="min-h-11 gap-2 rounded-lg border-border/60 bg-background/50 text-xs font-semibold" variant="outline" onClick={onDetails}><Package className="size-4 shrink-0" />Details & loads</Button>
        <Button type="button" className="min-h-11 gap-2 rounded-lg border-border/60 bg-background/50 text-xs font-semibold" variant="outline" onClick={onChat}><MessageCircle className="size-4 shrink-0" />Chat</Button>
      </div>
      {following && <p role="status" className="mt-2 text-xs leading-relaxed text-muted-foreground">{fresh ? "Following confirmed updates. Pan the map to stop." : "Waiting for a fresh confirmed location. Pan the map to stop."}</p>}
    </section>
    </>
  );
}
"use client";

import { AlertTriangle, Bell, ChevronRight, Crosshair, MessageSquare, Package, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { relativeLocationTime } from "@/lib/driver-tracker-mobile";
import { formatTrackingTime, trackingState, validCoordinates } from "@/lib/driver-tracking-view";
import type { PreviewTone } from "@/lib/load-status-tone";
import type { DriverOperationalStatus, DriverStatus, DriverTrackingItem } from "@/types/driver-tracking";
import type { FollowMode } from "@/components/driver-tracker/DriverTrackerSelectedDriver";
import { previewStyles, previewTone } from "@/components/mobile-preview/MobilePreviewScope";

const ACTIVITY_TONE: Record<DriverStatus, PreviewTone> = {
  "on-route": "mint",
  idle: "amber",
  waiting: "blue",
  "on-break": "grey",
  offline: "grey",
};

const AVAILABILITY_LABEL: Record<DriverOperationalStatus, string> = {
  active: "Active",
  on_leave: "On leave",
  maintenance: "Maintenance",
};

interface TrackerPreviewDriverCardProps {
  driver: DriverTrackingItem;
  now: number;
  followMode: FollowMode;
  mapReady: boolean;
  activityLabels: Record<DriverStatus, string>;
  /** Reasons from driverAttentionReasons (requests, release, location). */
  attentionReasons: string[];
  unreadCount: number;
  onFollow: () => void;
  onStopFollowing: () => void;
  onClear: () => void;
  onOpenWorkspace: () => void;
  onViewLoads: () => void;
  onMessage: () => void;
  onAlert: () => void;
}

const buttonBase =
  "flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-3 text-[15px] font-semibold transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mp-mint)]";

/**
 * Selected driver in the phone redesign (deck slide 10). Keeps everything the
 * current phone card offers (follow, chat, workspace, location details, loads)
 * and adds the Alert action from the driver list.
 */
export function TrackerPreviewDriverCard({
  driver,
  now,
  followMode,
  mapReady,
  activityLabels,
  attentionReasons,
  unreadCount,
  onFollow,
  onStopFollowing,
  onClear,
  onOpenWorkspace,
  onViewLoads,
  onMessage,
  onAlert,
}: TrackerPreviewDriverCardProps) {
  const tracking = trackingState(driver, now);
  const fresh = tracking.kind === "live";
  const name = driver.driver?.name || "Driver";
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const activityTone = previewTone(ACTIVITY_TONE[driver.status] ?? "grey");
  const availability = AVAILABILITY_LABEL[driver.equipment?.operationalStatus ?? "active"];
  const loadCount = driver.shipments.length || driver.activeLoadCount || 0;
  const accuracyMeters =
    driver.accuracy != null && Number.isFinite(driver.accuracy) ? Math.round(driver.accuracy) : null;
  // Only add the last fix when the location itself is one of the reasons.
  const locationIssue = attentionReasons.includes(tracking.label);
  const firstLoad = driver.shipments[0];

  const followLabel =
    followMode === "following" ? "Stop following" : followMode === "paused" ? "Resume following" : "Follow driver";
  const followDisabled = followMode !== "following" && (!validCoordinates(driver.coords) || !mapReady);
  const followStatus =
    followMode === "following"
      ? fresh
        ? "Following confirmed updates. Moving the map pauses it."
        : "Waiting for a fresh confirmed location. Moving the map pauses it."
      : followMode === "paused"
        ? "Following is paused because you moved the map."
        : null;

  return (
    <section aria-label="Selected driver" className="space-y-3">
      <div className="rounded-[18px] border border-[var(--mp-hairline)] bg-[var(--mp-surface)] p-4">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            {driver.driver?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={driver.driver.avatar} alt="" className="size-14 rounded-full object-cover" />
            ) : (
              <span className="flex size-14 items-center justify-center rounded-full bg-[var(--mp-surface-2)] text-xl font-semibold text-[var(--mp-ink)]">
                {initials}
              </span>
            )}
            <span
              className={cn(
                activityTone.tone,
                activityTone.fill,
                "absolute bottom-0 right-0 size-4 rounded-full border-2 border-[var(--mp-surface)]",
              )}
              aria-hidden="true"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="break-words text-xl font-semibold leading-tight text-[var(--mp-ink)]">{name}</h3>
              <button
                type="button"
                onClick={onClear}
                aria-label="Clear selected driver"
                className="-mr-2 -mt-2 flex size-11 shrink-0 items-center justify-center rounded-xl text-[var(--mp-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mp-mint)]"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-0.5 text-sm text-[var(--mp-muted)]">
              Availability:{" "}
              <span className={availability === "Active" ? "font-semibold text-[var(--mp-mint)]" : "font-semibold text-[var(--mp-amber)]"}>
                {availability}
              </span>{" "}
              · Activity: <span className="text-[var(--mp-ink)]">{activityLabels[driver.status] ?? driver.status}</span>
            </p>
            <span
              className={cn(
                previewStyles.mono,
                "mt-2 inline-flex rounded-full border border-[var(--mp-purple)]/40 bg-[var(--mp-purple)]/15 px-2.5 py-0.5 text-xs uppercase tracking-[0.1em] text-[var(--mp-purple)]",
              )}
            >
              {loadCount} load{loadCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {attentionReasons.length > 0 ? (
          <div className="mt-3 flex gap-2.5 rounded-2xl border border-[var(--mp-amber)]/40 bg-[var(--mp-amber)]/10 p-3 text-sm text-[var(--mp-amber)]">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>
              Needs attention: {attentionReasons.join(", ").toLowerCase()}
              {locationIssue ? (
                <>
                  {" "}— last fix {formatTrackingTime(driver.locationRecordedAt)}
                  {accuracyMeters != null ? ` · ±${accuracyMeters.toLocaleString()} m` : ""}
                </>
              ) : null}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--mp-muted)]">
            <span className={fresh ? "text-[var(--mp-mint)]" : undefined}>{tracking.label}</span> · Location{" "}
            {relativeLocationTime(driver.locationRecordedAt, now)}
            {accuracyMeters != null ? ` · ±${accuracyMeters.toLocaleString()} m` : ""}
          </p>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onAlert}
            className={cn(buttonBase, "border-[var(--mp-amber)]/50 bg-[var(--mp-amber)]/10 text-[var(--mp-amber)]")}
          >
            <Bell className="size-4" aria-hidden="true" />
            Alert
          </button>
          <button
            type="button"
            onClick={onMessage}
            className={cn(buttonBase, "border-[var(--mp-hairline)] bg-[var(--mp-surface-2)] text-[var(--mp-ink)]")}
          >
            <MessageSquare className="size-4" aria-hidden="true" />
            Message
            {unreadCount > 0 ? (
              <span className={cn(previewStyles.mono, "rounded-full bg-[var(--mp-mint)] px-1.5 text-xs text-[var(--mp-on-accent)]")}>
                {unreadCount}
                <span className="sr-only"> unread</span>
              </span>
            ) : null}
          </button>
          <button
            type="button"
            aria-pressed={followMode === "following"}
            disabled={followDisabled}
            onClick={onFollow}
            className={cn(
              buttonBase,
              followMode === "following"
                ? "border-transparent bg-[var(--mp-mint)] text-[var(--mp-on-accent)]"
                : followMode === "paused"
                  ? "border-[var(--mp-amber)]/50 text-[var(--mp-amber)]"
                  : "border-[var(--mp-hairline)] text-[var(--mp-ink)]",
            )}
          >
            <Crosshair className="size-4" aria-hidden="true" />
            {followLabel}
          </button>
          <button
            type="button"
            onClick={onOpenWorkspace}
            className={cn(buttonBase, "border-[var(--mp-hairline)] text-[var(--mp-ink)]")}
          >
            Open workspace
          </button>
        </div>
        {followStatus ? (
          <p role="status" className="mt-2 flex flex-wrap items-center gap-x-1 text-xs text-[var(--mp-muted)]">
            {followStatus}
            {followMode === "paused" ? (
              <button
                type="button"
                onClick={onStopFollowing}
                className="min-h-11 px-1 font-semibold text-[var(--mp-mint)] underline-offset-2 hover:underline"
              >
                Stop following
              </button>
            ) : null}
          </p>
        ) : null}

        <details className="mt-2 text-xs text-[var(--mp-muted)]">
          <summary className="flex min-h-11 cursor-pointer items-center font-semibold">Location details</summary>
          <p>Measured: {formatTrackingTime(driver.locationRecordedAt)}</p>
          <p className="mt-1">Confirmed: {formatTrackingTime(driver.lastSeenAt)}</p>
          {accuracyMeters != null ? <p className="mt-1">Accuracy ±{accuracyMeters} m</p> : null}
          {!fresh ? <p className="mt-1">This may be a last known position.</p> : null}
        </details>
      </div>

      <button
        type="button"
        onClick={onViewLoads}
        className="flex w-full items-center gap-3 rounded-[18px] border border-[var(--mp-hairline)] bg-[var(--mp-surface)] p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mp-mint)]"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] border border-[var(--mp-purple)]/40 bg-[var(--mp-purple)]/15 text-[var(--mp-purple)]">
          <Package className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn(previewStyles.mono, "block truncate text-base font-semibold text-[var(--mp-ink)]")}>
            {firstLoad?.trackingNumber || firstLoad?.id || (driver.activeLoadCount ? "Load details unavailable" : "No active load")}
          </span>
          {firstLoad ? (
            <span className="block truncate text-sm text-[var(--mp-muted)]">
              {[
                firstLoad.status,
                firstLoad.trailerType,
                firstLoad.vehicleCount != null
                  ? `${firstLoad.vehicleCount} vehicle${firstLoad.vehicleCount === 1 ? "" : "s"}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              {driver.shipments.length > 1 ? ` · +${driver.shipments.length - 1} more` : ""}
            </span>
          ) : null}
        </span>
        <span className="flex shrink-0 items-center gap-0.5 text-[15px] font-semibold text-[var(--mp-mint)]">
          View loads
          <ChevronRight className="size-4" aria-hidden="true" />
        </span>
      </button>
    </section>
  );
}

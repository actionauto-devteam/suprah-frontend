"use client";

import * as React from "react";
import { Loader2, RefreshCw, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { userErrorMessage } from "@/lib/user-error";
import { useAuth } from "@/providers/AuthProvider";
import { formatPhoneTrackingTime, phoneTrackingApi, type ReviewerPhoneTracking } from "@/lib/api/phone-tracking";

type Action = "approve" | "revoke" | "retry";

/**
 * Driver Review Center: the driver's phone (the Suprah Driver Tracker app or
 * Traccar Client). The people who
 * verify drivers approve or remove it; the server enforces who may do what.
 */
export function DriverPhoneTrackingReviewSection({ driverId, canManage }: { driverId: string; canManage: boolean }) {
  const { getToken } = useAuth();
  const [state, setState] = React.useState<ReviewerPhoneTracking | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<Action | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next = await phoneTrackingApi.forDriver(getToken, driverId);
        if (!cancelled) setState(next);
      } catch (error) {
        if (!cancelled) setLoadError(userErrorMessage(error, "load this driver's phone tracking"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [driverId, getToken]);

  const run = async (action: Action) => {
    setBusy(action);
    try {
      const next =
        action === "approve"
          ? await phoneTrackingApi.approve(getToken, driverId)
          : action === "revoke"
            ? await phoneTrackingApi.revoke(getToken, driverId)
            : await phoneTrackingApi.retry(getToken, driverId);
      setState(next);
      toast.success(action === "approve" ? "Phone approved" : action === "revoke" ? "Phone removed" : "Update retried");
    } catch (error) {
      toast.error(userErrorMessage(error, action === "approve" ? "approve the phone" : action === "revoke" ? "remove the phone" : "retry the update"));
    } finally {
      setBusy(null);
    }
  };

  const device = state?.device ?? null;
  const isApp = (device?.provider ?? state?.provider) === "app";

  return (
    <section className="rounded-2xl border border-border/70 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-base font-black">
            <Smartphone className="size-4" /> Phone tracking
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isApp
              ? "The driver's phone running the Suprah Driver Tracker app. Its locations only count after approval."
              : "The driver's phone running Traccar Client. Its locations only count after approval."}
          </p>
        </div>
        {device?.status === "active" && (
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">Approved</Badge>
        )}
        {device?.status === "pending" && (
          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">Waiting for approval</Badge>
        )}
      </div>

      <div className="mt-3 space-y-3 text-sm">
        {!state && !loadError ? (
          <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading…</p>
        ) : loadError ? (
          <p className="text-destructive">{loadError}</p>
        ) : !state?.available ? (
          <p className="text-muted-foreground">Phone tracking isn&apos;t switched on for Suprah yet.</p>
        ) : !device ? (
          <p className="text-muted-foreground">No phone linked. The driver starts setup from their Driver Portal settings.</p>
        ) : (
          <>
            <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
              {isApp ? (
                <div>
                  <dt className="font-semibold text-muted-foreground">Phone</dt>
                  <dd>
                    {device.paired
                      ? `${device.deviceName || "Paired phone"}${device.appVersion ? ` · app ${device.appVersion}` : ""}`
                      : "Not paired yet"}
                  </dd>
                </div>
              ) : (
                <div>
                  <dt className="font-semibold text-muted-foreground">Identifier ends with</dt>
                  <dd className="font-mono">…{device.identifierEndsWith}</dd>
                </div>
              )}
              <div>
                <dt className="font-semibold text-muted-foreground">Set up</dt>
                <dd>{formatPhoneTrackingTime(device.requestedAt)}</dd>
              </div>
              {device.status === "active" && (
                <>
                  <div>
                    <dt className="font-semibold text-muted-foreground">Approved</dt>
                    <dd>{formatPhoneTrackingTime(device.approvedAt)}{device.approvedByName ? ` by ${device.approvedByName}` : ""}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-muted-foreground">Last location</dt>
                    <dd>{formatPhoneTrackingTime(device.lastPositionAt)}</dd>
                  </div>
                </>
              )}
            </dl>
            {device.status === "pending" && (
              <p className="text-xs text-muted-foreground">
                {isApp
                  ? device.paired
                    ? `Confirm with the driver that "${device.deviceName || "this phone"}" is the phone they drive with, then approve.`
                    : "The driver hasn't entered their pairing code in the app yet. You can approve now or after they pair."
                  : "Ask the driver which identifier their Driver Portal shows, and approve only if it ends with the same 4 characters."}
              </p>
            )}
            {device.status === "active" && device.traccarSyncStatus === "failed" && (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                Traccar Server hasn&apos;t accepted this phone yet: {device.traccarSyncError ?? "the update failed."} Suprah retries automatically.
              </p>
            )}
            {canManage && (
              <div className="flex flex-wrap gap-2">
                {device.status === "pending" && (
                  <Button type="button" size="sm" onClick={() => void run("approve")} disabled={busy !== null}>
                    {busy === "approve" ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : null}
                    Approve phone
                  </Button>
                )}
                {device.status === "active" && device.traccarSyncStatus === "failed" && (
                  <Button type="button" size="sm" variant="outline" onClick={() => void run("retry")} disabled={busy !== null}>
                    {busy === "retry" ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <RefreshCw className="mr-2 size-3.5" />}
                    Retry now
                  </Button>
                )}
                <Button type="button" size="sm" variant="outline" className="text-destructive" onClick={() => void run("revoke")} disabled={busy !== null}>
                  {busy === "revoke" ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : null}
                  {device.status === "pending" ? "Decline" : "Remove phone"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

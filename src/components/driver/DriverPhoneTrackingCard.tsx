"use client";

import * as React from "react";
import { CheckCircle2, Clock, Copy, ExternalLink, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { userErrorMessage } from "@/lib/user-error";
import { useAuth } from "@/providers/AuthProvider";
import { formatPhoneTrackingTime, phoneTrackingApi, type DriverPhoneTracking } from "@/lib/api/phone-tracking";

const TRACCAR_CLIENT_PAGE = "https://www.traccar.org/client/";

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
        <p className="break-all font-mono text-sm">{value}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 shrink-0"
        aria-label={`Copy ${label.toLowerCase()}`}
        onClick={() => {
          void navigator.clipboard?.writeText(value).then(
            () => toast.success(`${label} copied`),
            () => toast.error("Copy didn't work. Select the text and copy it instead."),
          );
        }}
      >
        <Copy className="size-4" />
      </Button>
    </div>
  );
}

/**
 * Driver Settings: link a phone running Traccar Client, so Dispatch keeps
 * receiving your location while you use Google Maps, switch apps or lock the
 * screen. A dispatcher or admin approves the link first.
 */
export function DriverPhoneTrackingCard() {
  const { getToken } = useAuth();
  const [state, setState] = React.useState<DriverPhoneTracking | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<"start" | "remove" | null>(null);
  const [confirm, setConfirm] = React.useState<"replace" | "remove" | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next = await phoneTrackingApi.mine(getToken);
        if (!cancelled) setState(next);
      } catch (error) {
        if (!cancelled) setLoadError(userErrorMessage(error, "load phone tracking"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  const run = async (action: "start" | "remove") => {
    setBusy(action);
    try {
      setState(action === "start" ? await phoneTrackingApi.start(getToken) : await phoneTrackingApi.remove(getToken));
      toast.success(action === "start" ? "Setup started. Enter these details in Traccar Client." : "Your phone was unlinked.");
    } catch (error) {
      toast.error(userErrorMessage(error, action === "start" ? "start phone tracking setup" : "unlink your phone"));
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  };

  const device = state?.device ?? null;
  const linked = device && device.status !== "revoked" ? device : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="size-4" />
            Phone tracking
          </CardTitle>
          {linked?.status === "active" && (
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="mr-1 size-3" /> Approved
            </Badge>
          )}
          {linked?.status === "pending" && (
            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
              <Clock className="mr-1 size-3" /> Waiting for approval
            </Badge>
          )}
        </div>
        <CardDescription>
          The free Traccar Client app keeps sending your location to Dispatch while you use Google Maps, switch apps or
          lock your screen. You only need it during loads.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!state && !loadError ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </p>
        ) : loadError ? (
          <p className="text-sm text-destructive">{loadError}</p>
        ) : !state?.available ? (
          <p className="text-sm text-muted-foreground">
            Phone tracking isn&apos;t available yet. Your company is still setting it up. Until then, keep the Driver
            Portal open during loads to share your location.
          </p>
        ) : !linked ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Set it up once on the phone you drive with. You&apos;ll get a private identifier to enter in the app, and a
              dispatcher or admin approves it.
            </p>
            <Button type="button" onClick={() => void run("start")} disabled={busy !== null}>
              {busy === "start" ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Smartphone className="mr-2 size-4" />}
              Set up phone tracking
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              <li>
                Install <strong>Traccar Client</strong> from the{" "}
                <a href={TRACCAR_CLIENT_PAGE} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                  Traccar website <ExternalLink className="size-3" />
                </a>{" "}
                (Google Play or the App Store).
              </li>
              <li>In the app&apos;s settings, enter these two details exactly:</li>
            </ol>
            <div className="space-y-2">
              {linked.identifier && <CopyRow label="Device identifier" value={linked.identifier} />}
              {state.serverUrl && <CopyRow label="Server URL" value={state.serverUrl} />}
            </div>
            <ol start={3} className="list-decimal space-y-2 pl-5 text-sm">
              <li>
                Set location accuracy to <strong>High</strong>, allow location <strong>all the time</strong>, and let the app
                run in the background without battery restrictions.
              </li>
              <li>
                {linked.status === "pending"
                  ? "Wait for a dispatcher or admin to approve your phone. Until then its location isn't used."
                  : "Turn tracking on in Traccar Client when you accept a load, and off after your last delivery."}
              </li>
            </ol>
            <p className="text-xs text-muted-foreground">
              Keep your device identifier private: anyone who has it could send locations for your account.
              {linked.status === "active" && ` Last location from this phone: ${formatPhoneTrackingTime(linked.lastPositionAt)}.`}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setConfirm("replace")} disabled={busy !== null}>
                Replace phone
              </Button>
              <Button type="button" variant="outline" size="sm" className="text-destructive" onClick={() => setConfirm("remove")} disabled={busy !== null}>
                Stop using this phone
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && busy === null && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === "replace" ? "Set up a different phone?" : "Stop using this phone?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "replace"
                ? "Your current phone stops counting right away. You'll get a new identifier to enter on the new phone, and a dispatcher or admin approves it again."
                : "This phone's locations stop being used right away. You can set up phone tracking again at any time."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void run(confirm === "replace" ? "start" : "remove");
              }}
              disabled={busy !== null}
            >
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {confirm === "replace" ? "Set up new phone" : "Stop using it"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

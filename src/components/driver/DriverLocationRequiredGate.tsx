"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  LocateFixed,
  MapPin,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDriverLocationSharing } from "@/context/DriverLocationSharingContext";

export function DriverLocationRequiredGate() {
  const {
    isLoadPolicyResolved,
    isLocationRequired,
    locationRequirementReason,
    isLocationAccessBlocked,
    locationPermissionState,
    isRecoveringLocationAccess,
    isSharing,
    isStarting,
    startSharing,
  } = useDriverLocationSharing();

  const gateRef = React.useRef<HTMLDivElement | null>(null);
  const isCheckingPolicy = !isLoadPolicyResolved;
  const shouldBlock =
    isCheckingPolicy || (isLocationRequired && isLocationAccessBlocked);

  React.useEffect(() => {
    if (!shouldBlock || typeof document === "undefined") return;

    const blockOutsideGate = (event: Event) => {
      const target = event.target as Node | null;

      if (
        target &&
        gateRef.current &&
        gateRef.current.contains(target)
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const immediate = event as Event & {
        stopImmediatePropagation?: () => void;
      };
      immediate.stopImmediatePropagation?.();
    };

    const protectedEvents = [
      "pointerdown",
      "mousedown",
      "touchstart",
      "click",
      "dblclick",
      "contextmenu",
    ] as const;

    for (const eventName of protectedEvents) {
      document.addEventListener(eventName, blockOutsideGate, true);
    }

    return () => {
      for (const eventName of protectedEvents) {
        document.removeEventListener(eventName, blockOutsideGate, true);
      }
    };
  }, [shouldBlock]);

  if (!shouldBlock || typeof document === "undefined") {
    return null;
  }

  const permissionDenied = locationPermissionState === "denied";
  const unsupported = locationPermissionState === "unsupported";

  const dialog = (
    <div
      ref={gateRef}
      data-driver-location-gate="true"
      className="fixed inset-0 z-[2147483647] flex select-none items-start justify-center overflow-y-auto overscroll-contain bg-black/75 p-4 py-6 backdrop-blur-md sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="driver-location-required-title"
      aria-describedby="driver-location-required-description"
    >
      <div className="my-auto w-full max-w-lg shrink-0 overflow-hidden rounded-3xl border border-red-500/25 bg-background shadow-2xl">
        <div className="border-b border-border/60 bg-gradient-to-b from-red-500/10 to-background px-5 py-6 text-center sm:px-7">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/10">
            <ShieldAlert className="size-7 text-red-500" />
          </div>

          <h2
            id="driver-location-required-title"
            className="mt-4 text-xl font-black tracking-tight text-foreground"
          >
            {locationRequirementReason === "dispatch_retained_load"
              ? "GPS Required by Dispatch"
              : "Location Access Required"}
          </h2>

          <p
            id="driver-location-required-description"
            className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground"
          >
            {locationRequirementReason === "dispatch_retained_load"
              ? "Dispatch kept one or more active loads assigned to you and requires live location sharing while those retained loads remain active."
              : "You currently have an active load. Live location sharing must remain enabled so Dispatch can monitor the load while it is in your care."}
          </p>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-7">
          {isCheckingPolicy ? (
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-5 text-center">
              <Loader2 className="mx-auto size-7 animate-spin text-primary" />
              <p className="mt-3 text-sm font-black">
                Verifying Driver Safety Requirements
              </p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                Checking your active loads and required location status before
                unlocking the Driver Portal.
              </p>
            </div>
          ) : isRecoveringLocationAccess ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
              <Loader2 className="mx-auto size-7 animate-spin text-emerald-500" />
              <p className="mt-3 text-sm font-black">
                Location Restored
              </p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                Reconnecting GPS now. The Driver Portal will only refresh if
                your browser requires it to apply the restored permission.
              </p>
            </div>
          ) : unsupported ? (
            <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-500" />
                <div>
                  <p className="text-sm font-black">
                    Location is unavailable on this device
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {locationRequirementReason === "dispatch_retained_load"
                      ? "This browser or device does not provide geolocation. Use a supported GPS-enabled device while Dispatch requires tracking for your retained load."
                      : "This browser or device does not provide geolocation. Use a supported GPS-enabled device to continue working with active loads."}
                  </p>
                </div>
              </div>
            </div>
          ) : permissionDenied ? (
            <>
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-5 shrink-0 text-amber-500" />
                  <div>
                    <p className="text-sm font-black">
                      Turn location permission back on
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Location access is blocked in your browser or device
                      settings. Enable location for this site, then return here.
                      This message will close automatically once access is
                      restored.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                  What to do
                </p>
                <ol className="mt-2 space-y-2 text-xs leading-relaxed text-foreground">
                  <li>
                    <span className="font-black">1.</span> Open your browser site
                    permissions or device Location settings.
                  </li>
                  <li>
                    <span className="font-black">2.</span> Allow location access
                    for SUPRAH.
                  </li>
                  <li>
                    <span className="font-black">3.</span> Return to this page.
                    Access will restore automatically.
                  </li>
                </ol>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] p-4">
              <div className="flex items-start gap-3">
                {isStarting ? (
                  <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin text-emerald-500" />
                ) : (
                  <LocateFixed className="mt-0.5 size-5 shrink-0 text-emerald-500" />
                )}
                <div>
                  <p className="text-sm font-black">
                    Allow location sharing to continue
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Your browser may be waiting for permission. Choose
                    <span className="font-black text-foreground"> Allow </span>
                    when prompted. The Driver Portal will unlock automatically
                    after location access is granted.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isCheckingPolicy && !unsupported && !isRecoveringLocationAccess && (
            <Button
              type="button"
              className="h-11 w-full gap-2 font-bold"
              onClick={startSharing}
              disabled={isStarting || isSharing}
            >
              {isStarting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LocateFixed className="size-4" />
              )}
              {permissionDenied
                ? "Check Location Access Again"
                : "Enable Location"}
            </Button>
          )}

          <div className="flex items-start gap-2 rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              {locationRequirementReason === "dispatch_retained_load"
                ? "Dispatch requires GPS while retained loads stay assigned. SUPRAH reconnects location without interrupting your page whenever possible."
                : "SUPRAH first reconnects GPS without interrupting your page. A one-time automatic refresh is used only if the browser cannot activate the restored location permission without it."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
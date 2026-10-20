"use client";

import * as React from "react";
import { Navigation2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDriverLocationSharing } from "@/context/DriverLocationSharingContext";

/**
 * After a delivery, offers to keep sharing location while Suprah is open, so
 * Dispatch can offer nearby loads. Dispatch sees only a rounded distance to a
 * pickup, never the location (server: driverDispatchProximity.service).
 * "Keep Sharing" turns on the same switch as Share Location on the Driver Page.
 *
 * Offered once per delivery, only when the driver has no other load and isn't
 * already sharing. It never blocks anything.
 */
const DELIVERY_COMPLETED_EVENT = "suprah:delivery-completed";
// How long to wait for the sharing state to show the delivery. If it doesn't
// settle by then (another trip, or sharing already on), nothing is offered.
const SETTLE_TIMEOUT_MS = 2 * 60 * 1000;
const offeredKey = (loadId: string) => `suprah:keep-sharing-offered:${loadId}`;

/** Call after a delivery is completed. */
export function announceDeliveryCompleted(loadId: string) {
  if (typeof window === "undefined" || !loadId) return;
  window.dispatchEvent(new CustomEvent(DELIVERY_COMPLETED_EVENT, { detail: { loadId } }));
}

function wasOffered(loadId: string) {
  try {
    return window.localStorage.getItem(offeredKey(loadId)) === "1";
  } catch {
    return false;
  }
}

function markOffered(loadId: string) {
  try {
    window.localStorage.setItem(offeredKey(loadId), "1");
  } catch {
    // Without storage the offer could appear again for this delivery; harmless.
  }
}

export function KeepSharingAfterDelivery() {
  const {
    isLoadPolicyResolved,
    isLocationRequired,
    hasActiveLoad,
    isSharing,
    isStarting,
    locationPermissionState,
    startSharing,
  } = useDriverLocationSharing();
  const [pending, setPending] = React.useState<{ loadId: string; since: number } | null>(null);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onDelivered = (event: Event) => {
      const loadId = String((event as CustomEvent<{ loadId?: string }>).detail?.loadId ?? "");
      if (!loadId || wasOffered(loadId)) return;
      setPending({ loadId, since: Date.now() });
    };
    window.addEventListener(DELIVERY_COMPLETED_EVENT, onDelivered);
    return () => window.removeEventListener(DELIVERY_COMPLETED_EVENT, onDelivered);
  }, []);

  React.useEffect(() => {
    if (!pending) return;
    if (locationPermissionState === "denied" || locationPermissionState === "unsupported") {
      setPending(null);
      return;
    }
    // The delivered load no longer needs GPS, there's no other load, and
    // sharing has stopped (it wasn't already on).
    if (isLoadPolicyResolved && !isLocationRequired && !hasActiveLoad && !isSharing && !isStarting) {
      markOffered(pending.loadId);
      setPending(null);
      setOpen(true);
      return;
    }
    const giveUp = window.setTimeout(
      () => setPending(null),
      Math.max(0, pending.since + SETTLE_TIMEOUT_MS - Date.now()),
    );
    return () => window.clearTimeout(giveUp);
  }, [pending, isLoadPolicyResolved, isLocationRequired, hasActiveLoad, isSharing, isStarting, locationPermissionState]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Navigation2 className="size-4 text-primary" />
            Want nearby loads?
          </DialogTitle>
          <DialogDescription className="text-left">
            Keep sharing your location while Suprah is open, so Dispatch can offer you loads close to you.
            Dispatchers see only about how far you are from a pickup, never your exact location.
            You can turn this off anytime on your Driver Page.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" className="h-11" onClick={() => setOpen(false)}>
            No Thanks
          </Button>
          <Button
            className="h-11"
            onClick={() => {
              startSharing();
              setOpen(false);
            }}
          >
            Keep Sharing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

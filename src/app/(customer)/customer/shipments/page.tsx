"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CalendarClock, Car, CheckCircle2, ChevronDown, Circle, CircleDot, Loader2, MapPin, RefreshCw, ShoppingBag, Store, Truck, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/providers/AuthProvider";
import { getMyShipments, withdrawShippingRequest, type CustomerShipment } from "@/lib/api/customerQuoteRequests";
import {
  SHIPMENT_STAGE_META,
  currentShipmentStep,
  driverInitials,
  formatExpectedByDate,
  formatShipmentDate,
  formatShipmentPrice,
  shipmentSteps,
  type ShipmentStageMeta,
  type ShipmentStep,
} from "@/lib/customer-shipments";
import type { CustomerShipmentDriver } from "@/lib/api/customerQuoteRequests";
import { LIVE_MAP_STAGES, isShipmentNotification } from "@/lib/customer-shipment-tracking";
import { ShipmentLiveMap } from "@/components/customer/ShipmentLiveMap";
import { ShipmentChatButtons } from "@/components/customer/ShipmentChatButtons";
import { ShipmentReceivedSection } from "@/components/customer/ShipmentReceivedSection";
import { ShipmentChatSheet } from "@/components/shipment-chat/ShipmentChatSheet";
import { SHIPMENT_CHAT_EVENTS, type ShipmentChatKind } from "@/lib/api/shipmentChat";
import { initializeSocket } from "@/lib/socket.client";
import { userErrorMessage } from "@/lib/user-error";
import { cn, resolveImageUrl } from "@/lib/utils";

// ─── My Shipments ─────────────────────────────────────────────────────────────
// The shipping requests this customer sent from Shop, Wishlist or Compare, the
// shipments a dealership booked for them, and how each one is going: every
// step with its time, and the driver (full name, photo and truck) once they
// accept, and from pickup until delivery the live map (where the driver is,
// and the arrival time once road routes are on). Never the driver's phone or
// email: the customer messages the driver and the dispatcher in private chats.

const TONE_CLASSES: Record<ShipmentStageMeta["tone"], string> = {
  waiting: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  progress: "border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-300",
  done: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  stopped: "border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-300",
};

const STEP_BAR_CLASSES: Record<ShipmentStep["state"], string> = {
  done: "bg-emerald-500",
  current: "bg-sky-500",
  upcoming: "bg-muted-foreground/20",
};

/**
 * The progress bar, the latest step with its time, and every step on request.
 * One layout for every screen size, so seven steps never squeeze into a row.
 */
function ShipmentProgress({ id, steps }: { id: string; steps: ShipmentStep[] }) {
  const [open, setOpen] = React.useState(false);
  const current = currentShipmentStep(steps);
  if (!current) return null;
  const listId = `shipment-steps-${id}`;
  const at = formatShipmentDate(current.step.at);

  return (
    <div className="space-y-2">
      <div className="flex gap-1" aria-hidden="true">
        {steps.map((step) => (
          <span key={step.key} className={cn("h-1.5 flex-1 rounded-full", STEP_BAR_CLASSES[step.state])} />
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="min-w-0 text-sm text-foreground">
          <span className="font-bold">{current.step.label}</span>
          {at && <span className="text-muted-foreground"> · {at}</span>}
          <span className="text-muted-foreground">
            {" "}
            (step {current.position} of {current.total})
          </span>
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((value) => !value)}
          className="h-9 gap-1 rounded-xl px-2 text-xs font-semibold"
        >
          {open ? "Hide steps" : "Show all steps"}
          <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" />
        </Button>
      </div>
      {open && (
        <ol id={listId} className="space-y-2 rounded-xl border border-border/40 bg-muted/30 p-3" aria-label="Shipment steps">
          {steps.map((step) => (
            <li key={step.key} className="flex items-start gap-2">
              {step.state === "done" ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              ) : step.state === "current" ? (
                <CircleDot className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden="true" />
              ) : (
                <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <p className={cn("text-sm font-semibold", step.state === "upcoming" ? "text-muted-foreground" : "text-foreground")}>
                  {step.label}
                  <span className="sr-only">
                    {step.state === "done" ? " (done)" : step.state === "current" ? " (latest step)" : " (not yet)"}
                  </span>
                </p>
                {step.at && <p className="text-xs text-muted-foreground">{formatShipmentDate(step.at)}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** The driver carrying the car: full name, photo and truck (the chat is the way to reach them). */
function DriverCard({ driver }: { driver: CustomerShipmentDriver }) {
  const [photoFailed, setPhotoFailed] = React.useState(false);
  const photo = driver.photoUrl && !photoFailed ? resolveImageUrl(driver.photoUrl) : undefined;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-muted/30 p-3">
      <div className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-500/15 text-sm font-black text-emerald-700 dark:text-emerald-300">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- the driver's profile photo, loaded through the backend
          <img src={photo} alt="" className="h-full w-full object-cover" onError={() => setPhotoFailed(true)} />
        ) : (
          <span aria-hidden="true">{driverInitials(driver.name)}</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Your driver</p>
        <p className="break-words text-sm font-bold text-foreground">{driver.name}</p>
        {driver.truck && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Truck className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="break-words">{driver.truck}</span>
          </p>
        )}
      </div>
    </div>
  );
}

function ShipmentCard({ entry, onOpenChat }: { entry: CustomerShipment; onOpenChat: (kind: ShipmentChatKind) => void }) {
  const meta = SHIPMENT_STAGE_META[entry.stage];
  const steps = shipmentSteps(entry);
  const bookedForYou = entry.kind === "shared";
  const price = formatShipmentPrice(entry.rate);
  const eta = entry.eta && entry.eta.min > 0 ? `${entry.eta.min}–${entry.eta.max} days` : "";
  const expectedBy = formatExpectedByDate(entry.shipment?.expectedBy);
  const image = entry.vehicleImage ? resolveImageUrl(entry.vehicleImage) : "";

  return (
    <li className="overflow-hidden rounded-2xl border border-border/50 bg-card dark:bg-zinc-900/60">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
        <div className="relative h-36 w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:h-28 sm:w-40">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element -- listing photo from the dealership's feed
            <img src={image} alt={entry.vehicleName || "Vehicle"} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Car className="size-8" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="break-words text-base font-black leading-tight text-foreground sm:text-lg">
                {entry.vehicleName || "Vehicle"}
              </h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {entry.dealerName && (
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <Store className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="break-words">{entry.dealerName}</span>
                  </span>
                )}
                {entry.deliveryAddress && (
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="break-words [overflow-wrap:anywhere]">To {entry.deliveryAddress}</span>
                  </span>
                )}
              </p>
            </div>
            <span className={cn("shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold", TONE_CLASSES[meta.tone])}>
              {meta.label}
            </span>
          </div>

          <p className="text-sm text-foreground/90">{meta.description}</p>

          {expectedBy && (
            <p className="flex items-center gap-1.5 text-sm text-foreground/90">
              <CalendarClock className="size-4 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden="true" />
              <span>
                Expected by <span className="font-bold text-foreground">{expectedBy}</span>
              </span>
            </p>
          )}

          {entry.stage === "cancelled" && entry.shipment?.cancelReason && (
            <p className="text-sm text-red-800 dark:text-red-300">Reason: {entry.shipment.cancelReason}</p>
          )}

          {entry.stage === "declined" && entry.declineReason && (
            <p className="break-words text-sm text-red-800 dark:text-red-300">Reason: {entry.declineReason}</p>
          )}

          {entry.driver && <DriverCard driver={entry.driver} />}

          {LIVE_MAP_STAGES.has(entry.stage) && <ShipmentLiveMap shipmentId={entry.id} />}

          {steps && <ShipmentProgress id={entry.id} steps={steps} />}

          <ShipmentReceivedSection entry={entry} />

          <ShipmentChatButtons entry={entry} onOpen={onOpenChat} />

          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border/40 pt-2 text-xs text-muted-foreground">
            {bookedForYou && <span>Booked for you by {entry.dealerName || "the dealership"}</span>}
            {price && (
              <span>
                Estimated shipping <span className="font-bold text-foreground">{price}</span>
                {eta ? ` · ${eta}` : ""}
              </span>
            )}
            {entry.shipment?.number && (
              <span>
                Shipment <span className="font-mono font-bold text-foreground">{entry.shipment.number}</span>
              </span>
            )}
            {entry.requestedAt && <span>Requested {formatShipmentDate(entry.requestedAt)}</span>}
          </div>

          {entry.stage === "waiting" && <WithdrawRequestButton entry={entry} />}
        </div>
      </div>
    </li>
  );
}

/**
 * Withdraws a request that's still waiting for the dealership, after the
 * customer confirms. Once the dealership has answered, the server explains
 * that they need to contact the dealership instead.
 */
function WithdrawRequestButton({ entry }: { entry: CustomerShipment }) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const withdraw = async () => {
    setBusy(true);
    setError(null);
    try {
      const message = await withdrawShippingRequest(entry.id, await getToken());
      setOpen(false);
      toast.success(message);
    } catch (err) {
      setError(userErrorMessage(err, "withdraw this request"));
    } finally {
      setBusy(false);
      // Shows the latest either way, for example if the dealership just answered.
      void queryClient.invalidateQueries({ queryKey: ["customer-shipments"] });
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        setOpen(next);
        if (next) setError(null);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-9 w-full gap-1.5 rounded-xl text-xs font-semibold sm:w-auto">
          <Undo2 className="size-3.5" aria-hidden="true" />
          Withdraw request
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Withdraw this shipping request?</AlertDialogTitle>
          <AlertDialogDescription>
            Your request for the {entry.vehicleName || "vehicle"} will be closed, and {entry.dealerName || "the dealership"} will be told. You
            can ask for a new quote anytime.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-words">{error}</span>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Keep request</AlertDialogCancel>
          <Button type="button" variant="destructive" onClick={() => void withdraw()} disabled={busy} className="gap-1.5">
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Withdraw request
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Passes on "?shipment=…&chat=driver|dispatcher" each time the address changes to one. */
function ChatLinkWatcher({ onLink }: { onLink: (link: { key: string; shipmentId: string; kind: ShipmentChatKind }) => void }) {
  const searchParams = useSearchParams();
  const shipmentId = searchParams?.get("shipment") ?? "";
  const kind = searchParams?.get("chat") ?? "";
  const key = searchParams?.toString() ?? "";
  React.useEffect(() => {
    if (shipmentId && (kind === "driver" || kind === "dispatcher")) onLink({ key, shipmentId, kind });
  }, [key, kind, onLink, shipmentId]);
  return null;
}

/** Who a chat is with, as the sheet's title and subtitle. */
function chatHeading(entry: CustomerShipment, kind: ShipmentChatKind) {
  const vehicle = entry.vehicleName || "your vehicle";
  if (kind === "driver") {
    return {
      title: entry.driver?.name || "Your driver",
      subtitle: [`Your driver for the ${vehicle}`, entry.driver?.truck].filter(Boolean).join(" · "),
    };
  }
  return {
    title: entry.chats?.dispatcher.name || "Dispatcher",
    subtitle: `Dispatcher${entry.dealerName ? ` at ${entry.dealerName}` : ""} · ${vehicle}`,
  };
}

export default function MyShipmentsPage() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["customer-shipments"],
    queryFn: async () => getMyShipments(await getToken()),
    // Shipment steps happen during the day; keep the page current while it's open.
    refetchInterval: 120_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
  const shipments = React.useMemo(() => data ?? [], [data]);

  const [openChat, setOpenChat] = React.useState<{ shipmentId: string; kind: ShipmentChatKind } | null>(null);
  const chatEntry = openChat ? shipments.find((entry) => entry.id === openChat.shipmentId) : undefined;
  const refreshShipments = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["customer-shipments"] });
  }, [queryClient]);
  // A shipment step (booked, driver accepted, picked up, delivered…) also
  // refreshes the live map, which appears at pickup and goes at delivery.
  const refreshAfterStep = React.useCallback(
    (notification: { metadata?: { route?: unknown } | null } | null | undefined) => {
      if (!isShipmentNotification(notification)) return;
      refreshShipments();
      void queryClient.invalidateQueries({ queryKey: ["shipment-tracking"] });
    },
    [queryClient, refreshShipments],
  );

  // A notification link ("?shipment=…&chat=driver") opens that chat once the
  // list is in, also when it's tapped while My Shipments is already open.
  const [chatLink, setChatLink] = React.useState<{ key: string; shipmentId: string; kind: ShipmentChatKind } | null>(null);
  const handledLink = React.useRef("");
  React.useEffect(() => {
    // While the list can't load, its own message and Try again show instead.
    if (!chatLink || handledLink.current === chatLink.key || isLoading || isError) return;
    handledLink.current = chatLink.key;
    const entry = shipments.find((item) => item.id === chatLink.shipmentId);
    if (entry?.chats?.[chatLink.kind].readable) setOpenChat({ shipmentId: chatLink.shipmentId, kind: chatLink.kind });
    else if (entry) toast.info(entry.chats?.[chatLink.kind].note || "This chat isn't available yet.");
    else toast.info("We couldn't find that shipment in your account. It may have been unlinked; your shipments are below.");
  }, [chatLink, isError, isLoading, shipments]);

  // The page keeps itself current: every shipment step arrives as a
  // notification, and new messages update the counts on the chat buttons.
  // After a reconnect, the latest is fetched in case something was missed.
  React.useEffect(() => {
    let active = true;
    let socket: ReturnType<typeof initializeSocket> | null = null;
    void (async () => {
      const token = await getToken();
      if (!token || !active) return;
      socket = initializeSocket(token);
      socket.on(SHIPMENT_CHAT_EVENTS.message, refreshShipments);
      socket.on(SHIPMENT_CHAT_EVENTS.changed, refreshShipments);
      socket.on("notification:new", refreshAfterStep);
      socket.on("notification:updated", refreshAfterStep);
      socket.on("connect", refreshShipments);
    })();
    return () => {
      active = false;
      socket?.off(SHIPMENT_CHAT_EVENTS.message, refreshShipments);
      socket?.off(SHIPMENT_CHAT_EVENTS.changed, refreshShipments);
      socket?.off("notification:new", refreshAfterStep);
      socket?.off("notification:updated", refreshAfterStep);
      socket?.off("connect", refreshShipments);
    };
  }, [getToken, refreshAfterStep, refreshShipments]);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col space-y-4 sm:space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card dark:bg-zinc-900/60">
        <div className="absolute left-0 right-0 top-0 h-0.5 bg-linear-to-r from-emerald-500 via-emerald-400 to-emerald-500/0" />
        <div className="relative flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-7 sm:py-6">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <Truck className="size-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400">
                Shipping
              </span>
            </div>
            <h1 className="text-3xl font-black uppercase leading-none tracking-tight text-foreground sm:text-4xl">
              My <span className="text-emerald-500">Shipments</span>
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              The shipping quotes you asked for, the shipments a dealership booked for you, and how each one is going.
              This page updates by itself and you get a notification at every step, and you can message your driver and the dispatcher.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="h-9 shrink-0 gap-1.5 self-start rounded-xl text-xs font-semibold sm:self-auto"
          >
            {isFetching ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-3.5" aria-hidden="true" />}
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card px-4 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-emerald-500" aria-hidden="true" />
          Loading your shipments…
        </div>
      ) : isError ? (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-5 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-start gap-2 text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-words">{userErrorMessage(error, "load your shipments")}</span>
          </span>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()} className="h-9 shrink-0 rounded-xl">
            Try again
          </Button>
        </div>
      ) : shipments.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 bg-card px-6 py-10 text-center">
          <Truck className="size-8 text-emerald-500" aria-hidden="true" />
          <div>
            <p className="text-base font-bold text-foreground">No shipments yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ask for a shipping quote on any vehicle in Shop, and you can follow it here. Shipments a dealership books
              for you show up here too, under the email you signed up with.
            </p>
          </div>
          <Button asChild className="h-10 gap-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
            <Link href="/customer/shop">
              <ShoppingBag className="size-4" aria-hidden="true" />
              Shop vehicles
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3" aria-label="Your shipments">
          {shipments.map((entry) => (
            <ShipmentCard key={entry.id} entry={entry} onOpenChat={(kind) => setOpenChat({ shipmentId: entry.id, kind })} />
          ))}
        </ul>
      )}

      <React.Suspense fallback={null}>
        <ChatLinkWatcher onLink={setChatLink} />
      </React.Suspense>

      {openChat && chatEntry && (
        <ShipmentChatSheet
          open
          onOpenChange={(next) => {
            if (!next) setOpenChat(null);
          }}
          target={{ side: "customer", shipmentId: openChat.shipmentId, kind: openChat.kind }}
          {...chatHeading(chatEntry, openChat.kind)}
          onActivity={refreshShipments}
        />
      )}
    </div>
  );
}

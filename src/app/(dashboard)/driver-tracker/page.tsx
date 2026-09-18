"use client";

import contrastStyles from "./driver-tracker-contrast.module.css";

import * as React from "react";
import { useTrackerMobileNavigation } from "@/hooks/useTrackerMobileNavigation";
import { driverAttentionReasons } from "@/lib/driver-tracker-mobile";
import { createTrackerRequestOwner, requireTrackerArray } from "@/lib/tracker-request-owner";
import { createDriverFleetLayer, type DriverFleetLayer } from "@/components/driver-tracker/driver-fleet-layer";
import { trackingState, validCoordinates, mergeDirectorySnapshot, mergeLocationEvent } from "@/lib/driver-tracking-view";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Clock,
  Users,
  Radio,
  Truck,
  Package,
  ChevronRight,
  Bell,
  LayoutGrid,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { useUser } from "@/providers/AuthProvider";
import { DriverTrackingItem, DriverStatus, DriverLoadCompatibility } from "@/types/driver-tracking";
import { useOptionalDriverLocationSharing } from "@/context/DriverLocationSharingContext";

export interface AvailableItem {
  _id: string;
  __docType: "shipment" | "load";
  trackingNumber?: string;
  origin?: string;
  destination?: string;
  status: string;
  trailerTypeRequired?: string;
  vehicleCount?: number;
  carrierPayAmount?: number;
  requestedPickupDate?: string;
  pickupLocation?: {
    city?: string;
    state?: string;
    zip?: string;
    coordinates?: { lat: number; lng: number } | null;
  };
  deliveryLocation?: {
    city?: string;
    state?: string;
    zip?: string;
    coordinates?: { lat: number; lng: number } | null;
  };
  isPostedToBoard?: boolean;
}
import { DriverTrackerMap } from "@/components/driver-tracker/DriverTrackerMap";
import { DriverTrackerShareCard } from "@/components/driver-tracker/DriverTrackerShareCard";
import { DriverTrackerLoadsCard } from "@/components/driver-tracker/DriverTrackerLoadsCard";
import { DriverTrackerListCard } from "@/components/driver-tracker/DriverTrackerListCard";
import {
  DriverTrackerMobileDrawer,
  type DriverTrackerMobileDrawerTab,
} from "@/components/driver-tracker/DriverTrackerMobileDrawer";
import { DriverAssignLoadModal } from "@/components/driver-tracker/DriverAssignLoadModal";
import { DriverTrackerAvailableLoadsCard } from "@/components/driver-tracker/DriverTrackerAvailableLoadsCard";
import { DriverTrackerRequestsCard } from "@/components/driver-tracker/DriverTrackerRequestsCard";
import { DriverDispatchAlertDialog } from "@/components/driver-tracker/DriverDispatchAlertDialog";
import { DriverComplianceDocumentsDialog } from "@/components/driver-tracker/DriverComplianceDocumentsDialog";
import { DriverStatusRequestReviewDialog } from "@/components/driver-tracker/DriverStatusRequestReviewDialog";
import {
  DriverLoadCompatibilityReviewDialog,
  type DriverActiveLoadSummary,
} from "@/components/driver-tracker/DriverLoadCompatibilityReviewDialog";
import {
  PendingLoadRequestAssignmentDialog,
  type PendingLoadRequestAssignmentConflict,
} from "@/components/driver-tracker/PendingLoadRequestAssignmentDialog";
import { DispatchChatDialog } from "@/components/dispatch-chat/DispatchChatDialog";
import { extractCompatibilityFromError } from "@/lib/driver-load-compatibility";
import { toast } from "sonner";
import { useTheme } from "@/context/ThemeContext";
import { getCalendarTimeZoneAbbreviation } from "@/utils/calendar.utils";
import {
  initializeSocket,
  getSocket,
} from "@/lib/socket.client";

const statusLabel: Record<DriverStatus, string> = {
  "on-route": "On Route",
  idle: "Idle",
  "on-break": "On Break",
  waiting: "Waiting",
  offline: "Disconnected",
};

const statusStyles: Record<DriverStatus, string> = {
  "on-route": "bg-emerald-500",
  idle: "bg-amber-500",
  "on-break": "bg-slate-500",
  waiting: "bg-blue-500",
  offline: "bg-slate-400",
};

const statusText: Record<DriverStatus, string> = {
  "on-route": "text-emerald-600",
  idle: "text-amber-600",
  "on-break": "text-slate-600",
  waiting: "text-blue-600",
  offline: "text-slate-500",
};


const LOCATION_INTERVAL_MS = 10000;
const MAP_CENTER = { lat: 39.8283, lng: -98.5795 };

interface DispatcherLoadActionOptions {
  endpoint: string;
  payload: Record<string, unknown>;
  driverName: string;
  loadLabel: string;
  actionLabel: string;
  successMessage: string;
  activeLoads?: DriverActiveLoadSummary[];
}

function extractPendingLoadRequestAssignmentConflict(
  error: any,
): PendingLoadRequestAssignmentConflict | null {
  const rawErrors = error?.response?.data?.errors;
  const candidates = Array.isArray(rawErrors)
    ? rawErrors
    : rawErrors
      ? [rawErrors]
      : [];

  const conflict = candidates.find(
    (candidate: any) =>
      candidate?.type ===
      "pending_load_request_assignment_confirmation",
  );

  if (
    !conflict ||
    !String(conflict.loadId ?? "").trim() ||
    !String(conflict.fingerprint ?? "").trim() ||
    !Array.isArray(conflict.pendingRequesters)
  ) {
    return null;
  }

  return conflict as PendingLoadRequestAssignmentConflict;
}

export default function DriverTrackerPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const { theme } = useTheme();
  const driverLocationSharing = useOptionalDriverLocationSharing();
  const isDriver = user?.role === "driver";
  const [drivers, setDrivers] = React.useState<DriverTrackingItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [mapNotice, setMapNotice] = React.useState<string | null>(null);
  const [isMapReady, setIsMapReady] = React.useState(false);
  const [isMapTransitioning, setIsMapTransitioning] = React.useState(false);
  const [availableLoads, setAvailableLoads] = React.useState<AvailableItem[]>([]);
  const [loadsLoading, setLoadsLoading] = React.useState(true);
  const [availableLoadsHasMore, setAvailableLoadsHasMore] = React.useState(false);
  const [availableLoadsError, setAvailableLoadsError] = React.useState<string | null>(null);
  const [loadRequestsError, setLoadRequestsError] = React.useState<string | null>(null);
  const [selectedLoadsDriverId, setSelectedLoadsDriverId] = React.useState<string | null>(null);
  const [assignModalOpen, setAssignModalOpen] = React.useState(false);
  const [assigningTo, setAssigningTo] =
    React.useState<DriverTrackingItem | null>(null);
  const [loadRequests, setLoadRequests] = React.useState<any[]>([]);
  const [loadRequestsLoading, setLoadRequestsLoading] = React.useState(true);
  const [approvingId, setApprovingId] = React.useState<string | null>(null);
  const [rejectingId, setRejectingId] = React.useState<string | null>(null);
  const [loadsTab, setLoadsTab] = React.useState("assigned");
  const [focusedRequestKey, setFocusedRequestKey] = React.useState<string | null>(null);
  const [alertDriver, setAlertDriver] = React.useState<DriverTrackingItem | null>(null);
  const [alertDialogOpen, setAlertDialogOpen] = React.useState(false);
  const [chatDriver, setChatDriver] = React.useState<DriverTrackingItem | null>(null);
  const [chatDialogOpen, setChatDialogOpen] = React.useState(false);
  const [complianceDriver, setComplianceDriver] =
    React.useState<DriverTrackingItem | null>(null);
  const [complianceDialogOpen, setComplianceDialogOpen] =
    React.useState(false);
  const [statusRequestDriver, setStatusRequestDriver] =
    React.useState<DriverTrackingItem | null>(null);
  const [statusRequestDialogOpen, setStatusRequestDialogOpen] =
    React.useState(false);
  const [compatibilityReview, setCompatibilityReview] = React.useState<{
    endpoint: string;
    payload: Record<string, unknown>;
    compatibility: DriverLoadCompatibility;
    driverName: string;
    loadLabel: string;
    actionLabel: string;
    successMessage: string;
    activeLoads?: DriverActiveLoadSummary[];
  } | null>(null);
  const [compatibilityOverrideSubmitting, setCompatibilityOverrideSubmitting] =
    React.useState(false);
  const compatibilityReviewResolverRef = React.useRef<
    ((success: boolean) => void) | null
  >(null);
  const [pendingRequestAssignmentReview, setPendingRequestAssignmentReview] =
    React.useState<{
      options: DispatcherLoadActionOptions;
      conflict: PendingLoadRequestAssignmentConflict;
    } | null>(null);
  const [pendingRequestAssignmentSubmitting, setPendingRequestAssignmentSubmitting] =
    React.useState(false);
  const pendingRequestAssignmentResolverRef = React.useRef<
    ((success: boolean) => void) | null
  >(null);
  const [unreadMessageCounts, setUnreadMessageCounts] = React.useState<
    Record<string, number>
  >({});
  const [mapFilter, setMapFilter] = React.useState<
    "all" | "sharing" | "on-route" | "with-loads"
  >("all");
  const { mobileWorkspace, setMobileWorkspace, mobileNavigationRef } = useTrackerMobileNavigation();
  const [attentionOnly, setAttentionOnly] = React.useState(false);
  const [mobileDrawerDriverId, setMobileDrawerDriverId] = React.useState<string | null>(null);
  const [mobileDriverDrawerOpen, setMobileDriverDrawerOpen] = React.useState(false);
  const [mobileDriverDrawerTab, setMobileDriverDrawerTab] =
    React.useState<DriverTrackerMobileDrawerTab>("overview");

  const loadManagementRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = React.useRef<any>(null);
  const fleetLayerRef = React.useRef<DriverFleetLayer | null>(null);
  const cameraActionRef = React.useRef(0);
  const [selectedDriverId, setSelectedDriverId] = React.useState<string | null>(null);
  const [followingDriver, setFollowingDriver] = React.useState(false);
  const [trackingNow, setTrackingNow] = React.useState(() => Date.now());
  const mapThemeRef = React.useRef<"light" | "dark" | null>(null);

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const normalizedToken = mapboxToken?.trim();

  const gpsSharingDrivers = React.useMemo(
    () => drivers.filter((d) => trackingState(d, trackingNow).kind === "live"),
    [drivers, trackingNow],
  );

  const eligibleDrivers = React.useMemo(
    () => drivers.filter((d) => d.assignable),
    [drivers],
  );

  const dispatchActiveDrivers = React.useMemo(
    () =>
      drivers.filter(
        (d) =>
          (d.equipment?.operationalStatus ?? "active") === "active" &&
          d.status !== "offline",
      ),
    [drivers],
  );

  const openStatusRequestDrivers = React.useMemo(
    () =>
      drivers
        .filter((driver) => Boolean(driver.statusRequest))
        .sort((a, b) => {
          const rank = (driver: DriverTrackingItem) =>
            driver.statusRequest?.priority === "emergency"
              ? 0
              : driver.statusRequest?.status === "approved_awaiting_reassignment"
                ? 1
                : 2;
          return rank(a) - rank(b);
        }),
    [drivers],
  );

  const mapDrivers = React.useMemo(() => {
    if (mapFilter === "all") return drivers;
    if (mapFilter === "sharing")
      return drivers.filter((d) => trackingState(d, trackingNow).kind === "live");
    if (mapFilter === "on-route")
      return drivers.filter((d) => d.status === "on-route");
    if (mapFilter === "with-loads")
      return drivers.filter((d) => d.shipments && d.shipments.length > 0);
    return drivers;
  }, [drivers, mapFilter, trackingNow]);

  const selectedDriver = drivers.find(driver => driver.id === selectedDriverId) ?? null;
  const fleetStateRef = React.useRef({ drivers: mapDrivers, selectedId: selectedDriverId, now: trackingNow });
  fleetStateRef.current = { drivers: mapDrivers, selectedId: selectedDriverId, now: trackingNow };
  React.useEffect(() => {
    if (selectedDriverId && !drivers.some(driver => driver.id === selectedDriverId)) {
      setSelectedDriverId(null);
      setFollowingDriver(false);
      setMobileDriverDrawerOpen(false);
    }
  }, [drivers, selectedDriverId]);

  const driversWithLoads = React.useMemo(
    () => drivers.filter((d) => d.shipments && d.shipments.length > 0),
    [drivers],
  );

  const mobileDrawerDriver = React.useMemo(
    () =>
      mobileDrawerDriverId
        ? drivers.find(
            (driver) =>
              String(driver.driver?.id ?? driver.id) ===
              String(mobileDrawerDriverId),
          ) ?? null
        : null,
    [drivers, mobileDrawerDriverId],
  );

  const handledDispatchChatDeepLinkRef = React.useRef<string | null>(null);
  const chatDialogOpenRef = React.useRef(chatDialogOpen);
  const openChatDriverIdRef = React.useRef<string | null>(null);
  const mobileDriverDrawerOpenRef = React.useRef(false);
  const mobileDriverDrawerTabRef = React.useRef<DriverTrackerMobileDrawerTab>("overview");
  const openMobileDrawerDriverIdRef = React.useRef<string | null>(null);

  const handleChatUnreadChange = React.useCallback(
    (count: number) => {
      const driverId = chatDriver?.driver?.id ?? chatDriver?.id;
      if (!driverId) return;

      const nextCount = Math.max(0, Number(count) || 0);

      setUnreadMessageCounts((previous) => {
        if ((previous[driverId] ?? 0) === nextCount) {
          return previous;
        }

        return {
          ...previous,
          [driverId]: nextCount,
        };
      });
    },
    [chatDriver],
  );

  React.useEffect(() => {
    chatDialogOpenRef.current = chatDialogOpen;
    openChatDriverIdRef.current =
      chatDriver?.driver?.id ?? chatDriver?.id ?? null;
  }, [chatDialogOpen, chatDriver]);

  React.useEffect(() => {
    mobileDriverDrawerOpenRef.current = mobileDriverDrawerOpen;
    mobileDriverDrawerTabRef.current = mobileDriverDrawerTab;
    openMobileDrawerDriverIdRef.current = mobileDrawerDriverId;
  }, [mobileDriverDrawerOpen, mobileDriverDrawerTab, mobileDrawerDriverId]);

  // GPS-offline notifications deep-link to:
  // /driver-tracker?driverId=<id>&openDispatchChat=1
  //
  // Keep the parameters in the URL while the dialog is open. The previous
  // implementation removed them immediately after setChatDialogOpen(true),
  // which could cause an App Router refresh/remount before the dialog state
  // became visible.
  React.useEffect(() => {
    const targetDriverId = searchParams.get("driverId");
    const shouldOpenChat =
      searchParams.get("openDispatchChat") === "1";

    if (!shouldOpenChat || !targetDriverId) {
      handledDispatchChatDeepLinkRef.current = null;
      return;
    }

    if (isLoading) return;

    const deepLinkKey = `${targetDriverId}:dispatch-chat`;

    // A deep link is single-use for the lifetime of these query params.
    // Do NOT key this guard to chatDialogOpen: on close, React commits
    // chatDialogOpen=false before router.replace() removes the query params.
    // The old condition therefore reopened the exact same chat once.
    if (handledDispatchChatDeepLinkRef.current === deepLinkKey) {
      return;
    }

    const targetDriver = drivers.find(
      (item) =>
        String(item.driver?.id ?? item.id) ===
        String(targetDriverId),
    );

    if (!targetDriver) {
      toast.error(
        "The driver linked to this notification is not available in Driver Tracker.",
      );
      return;
    }

    handledDispatchChatDeepLinkRef.current = deepLinkKey;
    setMapFilter("all");
    setChatDriver(targetDriver);
    setChatDialogOpen(true);
  }, [
    drivers,
    isLoading,
    searchParams,
  ]);

  React.useEffect(() => {
    const requestId = searchParams.get("statusRequestId");
    const targetDriverId = searchParams.get("driverId");
    if (!requestId || isLoading) return;

    const target = drivers.find((driver) =>
      String(driver.statusRequest?.id ?? "") === String(requestId) ||
      (targetDriverId && String(driver.driver?.id ?? driver.id) === String(targetDriverId)),
    );

    if (!target) return;
    setStatusRequestDriver(target);
    setStatusRequestDialogOpen(true);
  }, [drivers, isLoading, searchParams]);

  const clearDispatchChatDeepLink = React.useCallback(() => {
    if (
      searchParams.get("openDispatchChat") !== "1" &&
      !searchParams.get("driverId")
    ) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("driverId");
    nextParams.delete("openDispatchChat");

    // Keep the handled key until the URL has actually changed. Clearing it
    // here creates a one-render race where the old query params can reopen the
    // same dialog before router.replace() completes.
    const cleanedUrl = nextParams.toString()
      ? `${pathname}?${nextParams.toString()}`
      : pathname;

    router.replace(cleanedUrl, { scroll: false });
  }, [pathname, router, searchParams]);

  const clearStatusRequestDeepLink = React.useCallback(() => {
    if (!searchParams.get("statusRequestId")) return;
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("statusRequestId");
    if (nextParams.get("openDispatchChat") !== "1") {
      nextParams.delete("driverId");
    }
    router.replace(
      nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname,
      { scroll: false },
    );
  }, [pathname, router, searchParams]);

  const initialLoadDone = React.useRef(false);
  const directoryRequests = React.useRef(createTrackerRequestOwner());
  const availableRequests = React.useRef(createTrackerRequestOwner());
  const pendingRequests = React.useRef(createTrackerRequestOwner());
  React.useEffect(() => {
    const directory = directoryRequests.current;
    const available = availableRequests.current;
    const pending = pendingRequests.current;
    directory.reset(); available.reset(); pending.reset();
    initialLoadDone.current = false;
    setIsLoading(true); setLoadsLoading(true); setLoadRequestsLoading(true);
    setError(null); setAvailableLoadsError(null); setLoadRequestsError(null);
    setDrivers([]); setAvailableLoads([]); setLoadRequests([]); setAvailableLoadsHasMore(false);
    setSelectedDriverId(null); setFollowingDriver(false); setSelectedLoadsDriverId(null);
    setMobileDriverDrawerOpen(false);
    return () => { directory.reset(); available.reset(); pending.reset(); };
  }, [isSignedIn, user?.id]);

  const fetchDrivers = React.useCallback(async () => {
    if (!isSignedIn || !user?.id) return;
    const request = directoryRequests.current.begin();
    if (!initialLoadDone.current) setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!request.isCurrent()) return;
      if (!token) throw new Error("Authentication is not ready. Please retry.");
      const response = await apiClient.get("/api/driver-tracking/org-drivers", {
        signal: request.signal,
        timeout: 15000,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!request.isCurrent()) return;
      const directory = requireTrackerArray<any>(response.data?.data?.drivers, "the driver directory");
      const snapshot: DriverTrackingItem[] = directory.map((item: any): DriverTrackingItem => ({
          id: item.id,
          status: item.presence?.status ?? "offline",
          coords: item.presence?.coords ?? null,
          lastSeenAt: item.presence?.lastSeenAt ?? null,
          locationRecordedAt: item.presence?.locationRecordedAt ?? null,
          accuracy: item.presence?.accuracy ?? null,
          isSharing: Boolean(item.presence?.isSharing),
          canViewExactGps: item.presence?.canViewExactGps === true,
          assignable: Boolean(item.assignable),
          warnings: Array.isArray(item.warnings) ? item.warnings : [],
          remainingCapacity: item.remainingCapacity ?? null,
          activeLoadCount: Number(item.activeLoadCount ?? 0),
          availability: {
            availableDays: Array.isArray(item.availability?.availableDays)
              ? item.availability.availableDays
              : [],
          },
          logistics: {
            serviceRadiusMiles:
              typeof item.logistics?.serviceRadiusMiles === "number"
                ? item.logistics.serviceRadiusMiles
                : null,
            preferredRoutes: Array.isArray(item.logistics?.preferredRoutes)
              ? item.logistics.preferredRoutes
              : [],
            homeBase: {
              city: item.logistics?.homeBase?.city ?? null,
              state: item.logistics?.homeBase?.state ?? null,
              zip: item.logistics?.homeBase?.zip ?? null,
              coordinates: item.logistics?.homeBase?.coordinates ?? null,
            },
          },
          statusRequest: item.statusRequest
            ? {
                id: String(item.statusRequest.id ?? item.statusRequest._id),
                requestedStatus: item.statusRequest.requestedStatus,
                priority: item.statusRequest.priority,
                status: item.statusRequest.status,
                reason: item.statusRequest.reason ?? null,
                message: item.statusRequest.message ?? null,
                submittedAt: item.statusRequest.submittedAt ?? null,
              }
            : null,
          driver: {
            id: item.id,
            name: item.name ?? "",
            email: item.email ?? "",
            phone: item.phone ?? "",
            avatar: item.avatar ?? null,

            // Kept for compatibility with the current DriverTrackingItem type.
            // The isolated Suprah Dispatch Chat does not rely on these fields.
            messagingAvailable: Boolean(item.messagingAvailable),
            crmUserId: item.crmUserId ?? null,
            messagingUnavailableReason:
              item.messagingUnavailableReason ??
              "Messaging account is not linked to this driver.",
          },
          equipment: item.equipment
            ? {
                ...item.equipment,
                trailerType: item.equipment.trailerType ?? undefined,
                maxVehicleCapacity: item.equipment.maxVehicleCapacity ?? undefined,
                operationalStatus: item.equipment.operationalStatus ?? undefined,
                truckMake: item.equipment.truckMake ?? undefined,
                truckModel: item.equipment.truckModel ?? undefined,
              }
            : null,
          shipments: Array.isArray(item.shipments) ? item.shipments : [],
        }));
      setDrivers(previous => mergeDirectorySnapshot(previous, snapshot));
      initialLoadDone.current = true;
    } catch (err: any) {
      if (!request.isCurrent()) return;
      if ([401, 403].includes(err.response?.status)) setDrivers([]);
      setError(
        err.response?.data?.message || err.message || "Failed to load drivers",
      );
    } finally {
      if (request.isCurrent()) { setIsLoading(false); request.finish(); }
    }
  }, [getToken, isSignedIn, user?.id]);

  const fetchAvailableLoads = React.useCallback(async () => {
    if (!isSignedIn || !user?.id) return;
    const request = availableRequests.current.begin();
    setLoadsLoading(true);
    setAvailableLoadsError(null);
    try {
      const token = await getToken();
      if (!request.isCurrent()) return;
      if (!token) throw new Error("Authentication is not ready. Please retry.");
      const loadsRes = await apiClient.get("/api/loads", {
        signal: request.signal,
        timeout: 15000,
        headers: { Authorization: `Bearer ${token}` },
        params: { status: "Posted", limit: 50 },
      });
      if (!request.isCurrent()) return;
      const allLoads = requireTrackerArray<any>(loadsRes.data?.data?.loads, "available loads");
      const mapped: AvailableItem[] = allLoads
        .filter((l) => l.status === "Posted" && !l.assignedDriverId)
        .map((l) => ({
          _id: l._id,
          __docType: "load" as const,
          trackingNumber: l.loadNumber,
          origin: `${l.pickupLocation?.city || ""}${l.pickupLocation?.state ? `, ${l.pickupLocation.state}` : ""}`,
          destination: `${l.deliveryLocation?.city || ""}${l.deliveryLocation?.state ? `, ${l.deliveryLocation.state}` : ""}`,
          status: l.status,
          trailerTypeRequired: l.trailerType,
          vehicleCount: l.vehicles?.length || 0,
          carrierPayAmount: l.pricing?.carrierPayAmount,
          requestedPickupDate: l.dates?.firstAvailable ?? l.dates?.pickupDeadline,
          pickupLocation: {
            city: l.pickupLocation?.city,
            state: l.pickupLocation?.state,
            zip: l.pickupLocation?.zip,
            coordinates: l.pickupLocation?.coordinates ?? null,
          },
          deliveryLocation: {
            city: l.deliveryLocation?.city,
            state: l.deliveryLocation?.state,
            zip: l.deliveryLocation?.zip,
            coordinates: l.deliveryLocation?.coordinates ?? null,
          },
          isPostedToBoard: false,
        }));
      setAvailableLoads(mapped);
      setAvailableLoadsHasMore(Boolean(loadsRes.data?.data?.pagination?.hasMore));
    } catch (err: any) {
      if (!request.isCurrent()) return;
      if ([401, 403].includes(err.response?.status)) { setAvailableLoads([]); setAvailableLoadsHasMore(false); }
      setAvailableLoadsError(err.response?.data?.message || err.message || "Could not refresh available loads. Previously loaded results may be out of date.");
    } finally {
      if (request.isCurrent()) { setLoadsLoading(false); request.finish(); }
    }
  }, [getToken, isSignedIn, user?.id]);

  const fetchLoadRequests = React.useCallback(async () => {
    if (!isSignedIn || !user?.id || isDriver) return;
    const request = pendingRequests.current.begin();
    setLoadRequestsLoading(true);
    setLoadRequestsError(null);
    try {
      const token = await getToken();
      if (!request.isCurrent()) return;
      if (!token) throw new Error("Authentication is not ready. Please retry.");
      const res = await apiClient.get("/api/driver-tracking/load-requests", {
        signal: request.signal,
        timeout: 15000,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!request.isCurrent()) return;
      setLoadRequests(requireTrackerArray<any>(res.data?.data, "load requests"));
    } catch (err: any) {
      if (!request.isCurrent()) return;
      if ([401, 403].includes(err.response?.status)) setLoadRequests([]);
      setLoadRequestsError(err.response?.data?.message || err.message || "Could not refresh requests. Previously loaded requests may be out of date.");
    } finally {
      if (request.isCurrent()) { setLoadRequestsLoading(false); request.finish(); }
    }
  }, [getToken, isSignedIn, isDriver, user?.id]);


  const runDispatcherLoadAction = React.useCallback(
    async (options: DispatcherLoadActionOptions): Promise<boolean> => {
      try {
        const token = await getToken();
        await apiClient.post(options.endpoint, options.payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success(options.successMessage);
        await Promise.all([
          fetchDrivers(),
          fetchAvailableLoads(),
          fetchLoadRequests(),
        ]);
        return true;
      } catch (err: any) {
        const pendingConflict =
          extractPendingLoadRequestAssignmentConflict(err);
        if (pendingConflict) {
          return await new Promise<boolean>((resolve) => {
            pendingRequestAssignmentResolverRef.current = resolve;
            setPendingRequestAssignmentReview({
              options,
              conflict: pendingConflict,
            });
          });
        }

        const compatibility = extractCompatibilityFromError(err);
        if (compatibility) {
          return await new Promise<boolean>((resolve) => {
            compatibilityReviewResolverRef.current = resolve;
            setCompatibilityReview({
              ...options,
              compatibility,
            });
          });
        }

        toast.error(
          err.response?.data?.message || "Unable to complete the load action",
        );
        return false;
      }
    },
    [
      getToken,
      fetchDrivers,
      fetchAvailableLoads,
      fetchLoadRequests,
    ],
  );

  const handlePendingRequestAssignmentOpenChange = React.useCallback(
    (open: boolean) => {
      if (open || pendingRequestAssignmentSubmitting) return;
      const resolver = pendingRequestAssignmentResolverRef.current;
      pendingRequestAssignmentResolverRef.current = null;
      setPendingRequestAssignmentReview(null);
      resolver?.(false);
    },
    [pendingRequestAssignmentSubmitting],
  );

  const confirmPendingRequestAssignment = React.useCallback(async () => {
    if (
      !pendingRequestAssignmentReview ||
      pendingRequestAssignmentSubmitting
    ) {
      return;
    }

    setPendingRequestAssignmentSubmitting(true);

    const { options, conflict } = pendingRequestAssignmentReview;
    const confirmedPayload = {
      ...options.payload,
      pendingRequestFingerprint: conflict.fingerprint,
    };

    try {
      const token = await getToken();
      await apiClient.post(options.endpoint, confirmedPayload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success(options.successMessage);
      await Promise.all([
        fetchDrivers(),
        fetchAvailableLoads(),
        fetchLoadRequests(),
      ]);

      const resolver = pendingRequestAssignmentResolverRef.current;
      pendingRequestAssignmentResolverRef.current = null;
      setPendingRequestAssignmentReview(null);
      resolver?.(true);
    } catch (err: any) {
      const refreshedConflict =
        extractPendingLoadRequestAssignmentConflict(err);
      if (refreshedConflict) {
        setPendingRequestAssignmentReview((current) =>
          current
            ? {
                ...current,
                conflict: refreshedConflict,
              }
            : null,
        );
        toast.warning(
          "The pending request list changed. Review the updated requests before confirming again.",
        );
        return;
      }

      const compatibility = extractCompatibilityFromError(err);
      if (compatibility) {
        // Keep the original assignment promise alive while moving from the
        // pending-request confirmation into the existing compatibility review.
        const resolver = pendingRequestAssignmentResolverRef.current;
        pendingRequestAssignmentResolverRef.current = null;
        compatibilityReviewResolverRef.current = resolver;
        setPendingRequestAssignmentReview(null);
        setCompatibilityReview({
          ...options,
          payload: confirmedPayload,
          compatibility,
        });
        return;
      }

      toast.error(
        err.response?.data?.message ||
          "The pending-request assignment could not be completed",
      );
    } finally {
      setPendingRequestAssignmentSubmitting(false);
    }
  }, [
    pendingRequestAssignmentReview,
    pendingRequestAssignmentSubmitting,
    getToken,
    fetchDrivers,
    fetchAvailableLoads,
    fetchLoadRequests,
  ]);

  const handleCompatibilityReviewOpenChange = React.useCallback(
    (open: boolean) => {
      if (open || compatibilityOverrideSubmitting) return;
      const resolver = compatibilityReviewResolverRef.current;
      compatibilityReviewResolverRef.current = null;
      setCompatibilityReview(null);
      resolver?.(false);
    },
    [compatibilityOverrideSubmitting],
  );

  const confirmCompatibilityOverride = React.useCallback(async () => {
    if (!compatibilityReview || compatibilityOverrideSubmitting) return;
    setCompatibilityOverrideSubmitting(true);

    const overridePayload = {
      ...compatibilityReview.payload,
      overrideAvailability:
        compatibilityReview.compatibility.requiresAvailabilityOverride,
      overrideCapacity:
        compatibilityReview.compatibility.requiresCapacityOverride,
    };

    try {
      const token = await getToken();
      await apiClient.post(
        compatibilityReview.endpoint,
        overridePayload,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      toast.success(compatibilityReview.successMessage);
      await Promise.all([
        fetchDrivers(),
        fetchAvailableLoads(),
        fetchLoadRequests(),
      ]);

      const resolver = compatibilityReviewResolverRef.current;
      compatibilityReviewResolverRef.current = null;
      setCompatibilityReview(null);
      resolver?.(true);
    } catch (err: any) {
      const pendingConflict =
        extractPendingLoadRequestAssignmentConflict(err);
      if (pendingConflict) {
        // A new request can arrive while the compatibility dialog is open.
        // Move the same unresolved action back to the request confirmation and
        // preserve the already-approved compatibility override flags.
        const resolver = compatibilityReviewResolverRef.current;
        compatibilityReviewResolverRef.current = null;
        pendingRequestAssignmentResolverRef.current = resolver;
        setCompatibilityReview(null);
        setPendingRequestAssignmentReview({
          options: {
            endpoint: compatibilityReview.endpoint,
            payload: overridePayload,
            driverName: compatibilityReview.driverName,
            loadLabel: compatibilityReview.loadLabel,
            actionLabel: compatibilityReview.actionLabel,
            successMessage: compatibilityReview.successMessage,
            activeLoads: compatibilityReview.activeLoads,
          },
          conflict: pendingConflict,
        });
        toast.warning(
          "A pending request changed while you were reviewing compatibility. Review the updated requests before assigning.",
        );
        return;
      }

      toast.error(
        err.response?.data?.message ||
          "The compatibility override could not be applied",
      );
    } finally {
      setCompatibilityOverrideSubmitting(false);
    }
  }, [
    compatibilityReview,
    compatibilityOverrideSubmitting,
    getToken,
    fetchDrivers,
    fetchAvailableLoads,
    fetchLoadRequests,
  ]);

  const handleAssignLoad = React.useCallback(
    async (item: AvailableItem): Promise<boolean> => {
      if (!assigningTo?.driver?.id || !isSignedIn) return false;
      const success = await runDispatcherLoadAction({
        endpoint: "/api/driver-tracking/assign-load",
        payload: { loadId: item._id, driverId: assigningTo.driver.id },
        driverName: assigningTo.driver.name || "Driver",
        loadLabel: item.trackingNumber || item._id,
        actionLabel: "Assign Anyway",
        successMessage: `Load assigned to ${assigningTo.driver.name || "driver"}`,
        activeLoads: assigningTo.shipments ?? [],
      });
      if (success) setAssignModalOpen(false);
      return success;
    },
    [assigningTo, isSignedIn, runDispatcherLoadAction],
  );

  const handleAssignFromAvailable = React.useCallback(
    async (item: AvailableItem, driverId: string): Promise<boolean> => {
      if (!isSignedIn) return false;
      const driver = drivers.find(
        (candidate) => String(candidate.driver?.id ?? candidate.id) === String(driverId),
      );
      return runDispatcherLoadAction({
        endpoint: "/api/driver-tracking/assign-load",
        payload: { loadId: item._id, driverId },
        driverName: driver?.driver?.name || "Driver",
        loadLabel: item.trackingNumber || item._id,
        actionLabel: "Assign Anyway",
        successMessage: "Load assigned successfully",
        activeLoads: driver?.shipments ?? [],
      });
    },
    [drivers, isSignedIn, runDispatcherLoadAction],
  );

  const handleRemoveLoad = React.useCallback(
    async (shipmentId: string) => {
      if (!isSignedIn) return;
      try {
        const token = await getToken();
        await apiClient.post(
          "/api/driver-tracking/remove-load",
          { loadId: shipmentId },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const shipment = drivers
          .flatMap((candidate) => candidate.shipments ?? [])
          .find((item) => String(item.id) === String(shipmentId));
        toast.success(
          shipment?.releaseRequest?.status === "pending"
            ? "Release approved — load returned to Available Loads"
            : "Load removed from driver",
        );
        fetchDrivers();
        fetchAvailableLoads();
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to remove load");
      }
    },
    [getToken, isSignedIn, fetchDrivers, fetchAvailableLoads, drivers],
  );

  const handleReassignLoad = React.useCallback(
    async (shipmentId: string, newDriverId: string): Promise<boolean> => {
      if (!isSignedIn) return false;
      const driver = drivers.find(
        (candidate) =>
          String(candidate.driver?.id ?? candidate.id) === String(newDriverId),
      );
      const shipment = drivers
        .flatMap((candidate) => candidate.shipments ?? [])
        .find((item) => String(item.id) === String(shipmentId));

      return runDispatcherLoadAction({
        endpoint: "/api/driver-tracking/reassign-load",
        payload: { loadId: shipmentId, driverId: newDriverId },
        driverName: driver?.driver?.name || "Driver",
        loadLabel: shipment?.trackingNumber || shipmentId,
        actionLabel: "Reassign Anyway",
        successMessage:
          shipment?.releaseRequest?.status === "pending"
            ? "Release approved — load reassigned successfully"
            : "Load reassigned successfully",
        activeLoads: driver?.shipments ?? [],
      });
    },
    [drivers, isSignedIn, runDispatcherLoadAction],
  );

  const handleKeepAssigned = React.useCallback(
    async (shipmentId: string) => {
      if (!isSignedIn) return;
      try {
        const token = await getToken();
        await apiClient.post(
          `/api/driver-tracking/loads/${encodeURIComponent(shipmentId)}/release-request/reject`,
          { decisionReason: "Dispatch reviewed the request and kept this load assigned." },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        toast.success("Release request declined — load remains assigned");
        await fetchDrivers();
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to keep load assigned");
      }
    },
    [getToken, isSignedIn, fetchDrivers],
  );

  const handleStatusRequestReassignLoad = React.useCallback(
    async (shipmentId: string, newDriverId: string): Promise<boolean> => {
      if (!isSignedIn) return false;
      const driver = drivers.find(
        (candidate) =>
          String(candidate.driver?.id ?? candidate.id) === String(newDriverId),
      );
      const shipment = drivers
        .flatMap((candidate) => candidate.shipments ?? [])
        .find((item) => String(item.id) === String(shipmentId));

      return runDispatcherLoadAction({
        endpoint: "/api/driver-tracking/reassign-load",
        payload: { loadId: shipmentId, driverId: newDriverId },
        driverName: driver?.driver?.name || "Driver",
        loadLabel: shipment?.trackingNumber || shipmentId,
        actionLabel: "Reassign Anyway",
        successMessage: "Load reassigned successfully",
        activeLoads: driver?.shipments ?? [],
      });
    },
    [drivers, isSignedIn, runDispatcherLoadAction],
  );

  const handleApproveRequest = React.useCallback(
    async (loadId: string, driverId: string): Promise<boolean> => {
      const key = `${loadId}-${driverId}`;
      setApprovingId(key);
      try {
        const request = loadRequests.find(
          (item: any) =>
            String(item.loadId ?? item.shipmentId) === String(loadId) &&
            String(item.driverId) === String(driverId),
        );
        return await runDispatcherLoadAction({
          endpoint: `/api/driver-tracking/loads/${loadId}/approve-request`,
          payload: { driverId },
          driverName: request?.driverName || "Driver",
          loadLabel: request?.trackingNumber || request?.loadNumber || loadId,
          actionLabel: "Approve Anyway",
          successMessage: "Load request approved — driver dispatched",
        });
      } finally {
        setApprovingId(null);
      }
    },
    [loadRequests, runDispatcherLoadAction],
  );

  const handleRejectRequest = React.useCallback(
    async (loadId: string, driverId: string) => {
      const key = `${loadId}-${driverId}`;
      setRejectingId(key);
      try {
        const token = await getToken();
        await apiClient.post(
          `/api/driver-tracking/loads/${loadId}/reject-request`,
          { driverId },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        toast.success("Load request rejected");
        fetchLoadRequests();
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to reject request");
      } finally {
        setRejectingId(null);
      }
    },
    [getToken, fetchLoadRequests],
  );

  const openLoadManagement = React.useCallback((tab: string, driverId: string | null = null) => {
    setLoadsTab(tab);
    setMobileWorkspace("loads");
    setMobileDriverDrawerOpen(false);
    setSelectedLoadsDriverId(driverId);
    setFocusedRequestKey(null);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      loadManagementRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      loadManagementRef.current?.focus({ preventScroll: true });
    }));
  }, [setMobileWorkspace]);

  const handleReviewLoadRequest = React.useCallback(
    (loadId: string, driverId: string) => {
      const requestKey = `${loadId}-${driverId}`;

      // Keep navigation inside Driver Tracker. The event already contains the
      // exact server-authorized load + driver pair, so no extra backend lookup
      // or thread ownership rule is introduced here.
      setLoadsTab("requests");
      setMobileWorkspace("loads");
      setMobileDriverDrawerOpen(false);
      setFocusedRequestKey(requestKey);
      setSelectedLoadsDriverId(null);
      setChatDialogOpen(false);
      setChatDriver(null);
      clearDispatchChatDeepLink();
      void fetchLoadRequests();

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          loadManagementRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      });
    },
    [clearDispatchChatDeepLink, fetchLoadRequests, setMobileWorkspace],
  );

  const handleMessageDriver = React.useCallback(
    (driver: DriverTrackingItem) => {
      const driverId = driver.driver?.id;
      if (!driverId) {
        toast.error("Dispatch Chat is unavailable for this driver");
        return;
      }

      setChatDriver(driver);
      setChatDialogOpen(true);
    },
    [],
  );

  const openMobileDriverDrawer = React.useCallback(
    (driver: DriverTrackingItem, tab: DriverTrackerMobileDrawerTab = "overview") => {
      // DriverTrackerListCard already uses "chat" as part of this callback's
      // public contract. Keep that contract intact and route only the chat
      // target to the established full DispatchChatDialog.
      if (tab === "chat") {
        handleMessageDriver(driver);
        return;
      }

      const driverId = String(driver.driver?.id ?? driver.id ?? "");
      if (!driverId) return;
      setSelectedDriverId(driver.id);
      cameraActionRef.current += 1;
      setMapFilter("all");
      setFollowingDriver(false);
      if (validCoordinates(driver.coords)) {
        mapInstanceRef.current?.easeTo({ center: [driver.coords.lng, driver.coords.lat], duration: 300 });
      }
      if (window.matchMedia("(min-width: 768px)").matches) mapRef.current?.closest("[data-driver-tracker-map-shell]")?.scrollIntoView({ block: "start" });
      setMobileDrawerDriverId(driverId);
      setMobileDriverDrawerTab(tab);
      setMobileDriverDrawerOpen(true);
    },
    [handleMessageDriver],
  );

  const refreshDriverUnread = React.useCallback(
    async (driverId: string) => {
      if (!driverId || !isSignedIn) return;
      try {
        const token = await getToken();
        if (!token) return;
        const response = await apiClient.get(
          `/api/driver-tracking/dispatch-chat/${encodeURIComponent(driverId)}/unread`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const nextCount = Math.max(
          0,
          Number(response.data?.data?.unreadCount ?? 0),
        );
        setUnreadMessageCounts((previous) => ({
          ...previous,
          [driverId]: nextCount,
        }));
      } catch {
        // Existing socket + polling reconciliation remains the fallback.
      }
    },
    [getToken, isSignedIn],
  );

  const focusDriverOnLiveMap = React.useCallback((driver: DriverTrackingItem, options?: { closeDrawer?: boolean }) => {
    cameraActionRef.current += 1;
    setSelectedDriverId(driver.id);
    setFollowingDriver(false);
    setMapFilter("all");
    setMobileWorkspace("map");
    if (options?.closeDrawer) setMobileDriverDrawerOpen(false);
    window.requestAnimationFrame(() => mapRef.current?.closest("[data-driver-tracker-map-shell]")?.scrollIntoView({ block: "start", behavior: "smooth" }));
    if (!validCoordinates(driver.coords)) return;
    const map = mapInstanceRef.current;
    map?.resize();
    map?.easeTo({ center: [driver.coords.lng, driver.coords.lat], zoom: Math.max(map.getZoom(), 14), duration: 350 });
  }, [setMobileWorkspace]);

  const selectDriverRef = React.useRef(focusDriverOnLiveMap);
  selectDriverRef.current = focusDriverOnLiveMap;

  const driverIdsKey = React.useMemo(
    () =>
      drivers
        .map((driver) => driver.driver?.id ?? driver.id)
        .filter(Boolean)
        .sort()
        .join("|"),
    [drivers],
  );

  React.useEffect(() => {
    if (!isSignedIn || !driverIdsKey) {
      if (!driverIdsKey) setUnreadMessageCounts({});
      return;
    }

    let cancelled = false;

    const fetchUnreadCounts = async () => {
      try {
        const token = await getToken();
        if (!token || cancelled) return;

        const driverIds = driverIdsKey.split("|").filter(Boolean);
        const results = await Promise.allSettled(
          driverIds.map(async (driverId) => {
            const response = await apiClient.get(
              `/api/driver-tracking/dispatch-chat/${encodeURIComponent(driverId)}/unread`,
              { headers: { Authorization: `Bearer ${token}` } },
            );

            return {
              driverId,
              unreadCount: Math.max(
                0,
                Number(response.data?.data?.unreadCount ?? 0),
              ),
            };
          }),
        );

        if (cancelled) return;

        setUnreadMessageCounts((previous) => {
          const next: Record<string, number> = {};

          for (const driverId of driverIds) {
            next[driverId] = previous[driverId] ?? 0;
          }

          for (const result of results) {
            if (result.status !== "fulfilled") continue;
            next[result.value.driverId] = result.value.unreadCount;
          }

          return next;
        });
      } catch {
        // Individual unread requests are already isolated with allSettled.
        // Keep the existing button counts if authentication temporarily fails.
      }
    };

    void fetchUnreadCounts();

    return () => {
      cancelled = true;
    };
  }, [driverIdsKey, getToken, isSignedIn]);

  React.useEffect(() => {
    fetchDrivers();
    const refreshVisible = () => { if (document.visibilityState === "visible") void fetchDrivers(); };
    const interval = setInterval(refreshVisible, LOCATION_INTERVAL_MS);
    window.addEventListener("online", refreshVisible);
    window.addEventListener("focus", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    const ageTimer = window.setInterval(() => setTrackingNow(Date.now()), 5000);
    return () => {
      clearInterval(interval); clearInterval(ageTimer);
      window.removeEventListener("online", refreshVisible); window.removeEventListener("focus", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [fetchDrivers]);

  React.useEffect(() => {
    if (!isSignedIn) return;

    const refreshVisibleLoads = () => {
      if (document.visibilityState === "visible") void fetchAvailableLoads();
    };
    void fetchAvailableLoads();
    // Socket events provide immediate updates; reconcile missed events while
    // visible and whenever the user returns from Transportation or another tab.
    const interval = window.setInterval(refreshVisibleLoads, 15000);
    window.addEventListener("focus", refreshVisibleLoads);
    document.addEventListener("visibilitychange", refreshVisibleLoads);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshVisibleLoads);
      document.removeEventListener("visibilitychange", refreshVisibleLoads);
    };
  }, [fetchAvailableLoads, isSignedIn]);

  React.useEffect(() => {
    fetchLoadRequests();
  }, [fetchLoadRequests]);

  const socketRef = React.useRef<ReturnType<typeof getSocket>>(null);

  React.useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    let cleanupLoadListeners: (() => void) | undefined;
    const driverListenerCleanups: Array<() => void> = [];
    const refreshAvailableLoads = () => {
      if (!cancelled) void fetchAvailableLoads();
    };

    const connectSocket = async () => {
      try {
        const token = await getToken();
        if (cancelled || !token) return;
        const sock = initializeSocket(token);
        socketRef.current = sock;
        const listen: typeof sock.on = ((event: any, handler: any) => {
          sock.on(event, handler);
          driverListenerCleanups.push(() => sock.off(event, handler));
          return sock;
        }) as typeof sock.on;
        listen("connect", () => { void fetchDrivers(); });

        listen(
          "driver:location",
          (data: {
            driverId: string;
            coords: { lat: number; lng: number } | null;
            status: DriverStatus;
            isSharing?: boolean;
            lastSeenAt: string;
            locationRecordedAt?: string | null;
            accuracy?: number | null;
          }) => {
            if (cancelled) return;
            setDrivers((prev) => {
              const idx = prev.findIndex((d) => d.driver?.id === data.driverId);
              if (idx === -1) return prev;
              const updated = [...prev];
              updated[idx] = mergeLocationEvent(prev[idx], data);
              return updated;
            });
          },
        );

        listen("driver:status_request_updated", () => {
          fetchDrivers();
        });

        listen("driver:operational_status_updated", () => {
          fetchDrivers();
        });

        listen("driver:loads_updated", () => {
          fetchDrivers();
          fetchAvailableLoads();
          fetchLoadRequests();
        });

        listen("driver:load_requested", () => {
          fetchLoadRequests();
          fetchAvailableLoads();
        });

        listen("driver:load_request_updated", () => {
          fetchLoadRequests();
          fetchDrivers();
          fetchAvailableLoads();
        });

        listen("load:change", refreshAvailableLoads);
        listen("connect", refreshAvailableLoads);
        cleanupLoadListeners = () => {
          sock.off("load:change", refreshAvailableLoads);
          sock.off("connect", refreshAvailableLoads);
        };

        listen(
          "dispatch-chat:message",
          (message: {
            id?: string;
            threadId?: string;
            dispatcherId?: string;
            driverId?: string;
            sender?: { id?: string };
            senderRole?: "driver" | "dispatcher";
            messageType?: "message" | "system";
            systemEvent?: {
              metadata?: {
                unreadForParticipantIds?: unknown[];
              };
            } | null;
            readBy?: string[];
          }) => {
            const driverId = String(message?.driverId ?? "");
            if (!driverId) return;

            const currentDispatcherId = String(user?.id ?? "");
            const alreadyReadByDispatcher = (message.readBy ?? []).some(
              (readerId) =>
                String(readerId) === currentDispatcherId,
            );
            if (alreadyReadByDispatcher) return;

            const explicitUnreadIds =
              message.messageType === "system" &&
              Array.isArray(
                message.systemEvent?.metadata?.unreadForParticipantIds,
              )
                ? message.systemEvent!.metadata!
                    .unreadForParticipantIds!
                : [];
            const explicitlyUnreadForDispatcher =
              explicitUnreadIds.some(
                (participantId) =>
                  String(participantId) === currentDispatcherId,
              );
            const sentByAnotherParticipant =
              String(message.sender?.id ?? "") !==
              currentDispatcherId;

            // Ordinary own messages never become unread. A lifecycle system
            // notification can opt in for the acting dispatcher as requested
            // by Test 14.
            if (
              !sentByAnotherParticipant &&
              !explicitlyUnreadForDispatcher
            ) {
              return;
            }

            // The backend already emits private chat events only to the exact
            // dispatcher↔driver pair. Keep a client-side participant check too
            // so a malformed/stale payload can never increment another
            // dispatcher's Driver Tracker unread badge.
            if (
              message.dispatcherId &&
              String(message.dispatcherId) !== String(user?.id ?? "")
            ) {
              return;
            }

            // The open chat marks incoming messages read itself, so don't flash
            // an unread badge for the conversation the dispatcher is viewing.
            if (
              (
                chatDialogOpenRef.current &&
                String(openChatDriverIdRef.current ?? "") === driverId
              ) ||
              (
                mobileDriverDrawerOpenRef.current &&
                mobileDriverDrawerTabRef.current === "chat" &&
                String(openMobileDrawerDriverIdRef.current ?? "") === driverId
              )
            ) {
              return;
            }

            setUnreadMessageCounts((previous) => ({
              ...previous,
              [driverId]: (previous[driverId] ?? 0) + 1,
            }));
          },
        );

        listen(
          "driver:dispatch_alert_acknowledged",
          (payload: { driverName?: string; response?: string; destinationName?: string }) => {
            const label = payload.response === "on_my_way"
              ? "On My Way"
              : payload.response === "unable"
                ? "Unable to Respond"
                : "Acknowledged";
            toast.success(
              `${payload.driverName || "Driver"}: ${label}${payload.destinationName ? ` — ${payload.destinationName}` : ""}`,
            );
          },
        );
      } catch { }
    };

    connectSocket();

    return () => {
      cancelled = true;
      driverListenerCleanups.forEach(cleanup => cleanup());
      cleanupLoadListeners?.();
      socketRef.current = null;
    };
  }, [
    isSignedIn,
    getToken,
    fetchDrivers,
    fetchAvailableLoads,
    fetchLoadRequests,
    user?.id,
  ]);

  React.useEffect(() => {
    if (!normalizedToken || !mapRef.current || mapInstanceRef.current) return;

    let cancelled = false;

    const initMap = async () => {
      setIsMapReady(false);
      setIsMapTransitioning(false);

      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !mapRef.current) return;

      if (!normalizedToken.startsWith("pk.")) {
        setIsMapReady(true);
        setMapNotice(
          "Invalid Mapbox token. Use a public token starting with pk.",
        );
        return;
      }

      if (!mapboxgl.supported()) {
        setIsMapReady(true);
        setMapNotice(
          "Mapbox requires WebGL. Please enable hardware acceleration.",
        );
        return;
      }

      mapboxgl.accessToken = normalizedToken;
      mapThemeRef.current = theme;
      const map = new mapboxgl.Map({
        container: mapRef.current,
        style:
          theme === "dark"
            ? "mapbox://styles/mapbox/dark-v11"
            : "mapbox://styles/mapbox/streets-v12",
        center: [MAP_CENTER.lng, MAP_CENTER.lat],
        zoom: 4,
        attributionControl: false,
        logoPosition: "bottom-right",
      });

      mapInstanceRef.current = map;
      setMapNotice("Loading map tiles...");

      const handleIdle = () => {
        setIsMapReady(true);
        setIsMapTransitioning(false);
        setMapNotice(null);
      };

      const handleError = (event: any) => {
        const status = event?.error?.status;
        const message = event?.error?.message || "Map failed to load";

        setIsMapReady(true);
        setIsMapTransitioning(false);
        setMapNotice(status ? `${message} (HTTP ${status})` : message);
      };

      const loadTimeout = window.setTimeout(() => {
        if (!map.isStyleLoaded()) {
          setIsMapReady(true);
          setIsMapTransitioning(false);
          setMapNotice("Map style not loaded. Check token or network.");
        }
      }, 8000);

      const resizeTimeout = window.setTimeout(() => map.resize(), 500);

      map.on("load", () => {
        window.clearTimeout(loadTimeout);
        map.resize();
        setIsMapReady(true);
        setIsMapTransitioning(false);
      });
      map.on("idle", handleIdle);
      map.on("error", handleError);

      map.once("remove", () => {
        window.clearTimeout(loadTimeout);
        window.clearTimeout(resizeTimeout);
      });
    };

    initMap();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      setIsMapReady(false);
      setIsMapTransitioning(false);
    };
  }, [normalizedToken]);

  React.useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || mapThemeRef.current === theme) return;

    mapThemeRef.current = theme;

    // Keep the previous map visible while Mapbox prepares the new style.
    // The child component applies a subtle blur/tint and a compact status card
    // instead of replacing the map with a blank loading screen.
    setIsMapTransitioning(true);
    setMapNotice(
      theme === "dark" ? "Switching to dark map…" : "Switching to light map…",
    );

    map.setStyle(
      theme === "dark"
        ? "mapbox://styles/mapbox/dark-v11"
        : "mapbox://styles/mapbox/streets-v12",
    );

    const handleThemeIdle = () => {
      map.resize();
      setIsMapReady(true);
      setIsMapTransitioning(false);
      setMapNotice(null);
    };

    const handleThemeError = () => {
      setIsMapReady(true);
      setIsMapTransitioning(false);
    };

    map.once("idle", handleThemeIdle);
    map.once("error", handleThemeError);

    return () => {
      map.off("idle", handleThemeIdle);
      map.off("error", handleThemeError);
    };
  }, [theme]);

  React.useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapReady) return;
    let cancelled = false;
    let layer: DriverFleetLayer | null = null;
    void import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelled || mapInstanceRef.current !== map) return;
      layer = createDriverFleetLayer(map, mapboxgl, driver => selectDriverRef.current(driver), () => { cameraActionRef.current += 1; setFollowingDriver(false); }, normalizedToken);
      fleetLayerRef.current = layer;
      layer.update(fleetStateRef.current);
    }).catch(() => { if (!cancelled) setMapNotice("Driver markers could not load. Retry by reopening the page."); });
    return () => {
      cancelled = true;
      layer?.dispose();
      if (fleetLayerRef.current === layer) fleetLayerRef.current = null;
    };
  }, [isMapReady, normalizedToken]);

  React.useEffect(() => {
    fleetLayerRef.current?.update(fleetStateRef.current);
  }, [mapDrivers, selectedDriverId, trackingNow]);

  React.useEffect(() => {
    if (!followingDriver || !selectedDriver || !isMapReady) return;
    // Follow only acknowledged, fresh GPS; an old fix remains visible without pretending to move.
    if (trackingState(selectedDriver, trackingNow).kind !== "live" || !validCoordinates(selectedDriver.coords)) return;
    mapInstanceRef.current?.easeTo({ center: [selectedDriver.coords.lng, selectedDriver.coords.lat], duration: 350 });
  }, [followingDriver, selectedDriver?.id, selectedDriver?.coords?.lat, selectedDriver?.coords?.lng, selectedDriver?.locationRecordedAt, selectedDriver?.lastSeenAt, selectedDriver?.isSharing, isMapReady]);


  const zoomMap = (delta: number) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setZoom(Math.max(2, Math.min(18, map.getZoom() + delta)));
  };

  const centerOnMe = () => {
    const cameraAction = ++cameraActionRef.current;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      if (cameraAction !== cameraActionRef.current) return;
      const map = mapInstanceRef.current;
      if (!map) return;
      map.setCenter([position.coords.longitude, position.coords.latitude]);
      map.setZoom(12);
    });
  };

  React.useEffect(() => {
    const container = mapRef.current;
    if (!container || !isMapReady) return;
    let frame = 0;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry || entry.contentRect.width === 0 || entry.contentRect.height === 0) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => mapInstanceRef.current?.resize());
    });
    observer.observe(container);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [isMapReady]);

  React.useEffect(() => {
    // The live map remains mounted in the mobile operations workspace.
    // Reconcile Mapbox dimensions after Drivers/Loads transitions so responsive
    // layout changes never leave a stale canvas size.
    const frame = window.requestAnimationFrame(() => {
      mapInstanceRef.current?.resize?.();
    });
    const timer = window.setTimeout(() => {
      mapInstanceRef.current?.resize?.();
    }, 220);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [mobileWorkspace]);

  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    const tick = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  const mountainTimeZoneLabel =
    getCalendarTimeZoneAbbreviation(currentTime);

  const totalLoads = drivers.reduce(
    (sum, d) => sum + (d.shipments?.length || 0),
    0,
  );

  const focusedRequestExists = React.useMemo(() => {
    if (!focusedRequestKey) return false;
    return loadRequests.some((request: any) =>
      `${String(request.loadId ?? request.shipmentId ?? "")}-${String(request.driverId ?? "")}` ===
      focusedRequestKey,
    );
  }, [focusedRequestKey, loadRequests]);

  const driversOnRoute = React.useMemo(
    () => drivers.filter((driver) => driver.status === "on-route").length,
    [drivers],
  );

  const pendingRequestDriverIds = React.useMemo(() => loadRequests.map((request: any) => String(request.driverId ?? "")), [loadRequests]);
  const attentionCount = drivers.filter(driver => driverAttentionReasons(driver, trackingNow, pendingRequestDriverIds).length > 0).length;

  const kpis = [
    {
      label: "Total Drivers",
      value: drivers.length,
      icon: <Users className="size-5 md:size-7 text-primary" />,
      description: "All tracked drivers",
    },
    {
      label: "Active Drivers",
      value: dispatchActiveDrivers.length,
      icon: <Radio className="size-5 md:size-7 text-emerald-600 dark:text-emerald-400" />,
      description: "Currently dispatch active",
      color: "text-emerald-500 dark:text-emerald-400",
    },
    {
      label: "On Route",
      value: driversOnRoute,
      icon: <Truck className="size-5 md:size-7 text-amber-600 dark:text-amber-400" />,
      description: "Delivering loads",
      color: "text-amber-500 dark:text-amber-400",
    },
    {
      label: "Assigned Loads",
      value: totalLoads,
      icon: <Package className="size-5 md:size-7 text-blue-600 dark:text-blue-400" />,
      description: "Currently assigned loads",
      color: "text-blue-500 dark:text-blue-400",
    },
  ];

  return (
    <div className={`${contrastStyles.scope} min-h-screen w-full min-w-0 max-w-none [&_[data-driver-tracker-map-shell]]:scroll-mt-36 md:[&_[data-driver-tracker-map-shell]]:scroll-mt-0 space-y-3 overflow-x-clip px-2 pt-3 pb-[max(1rem,calc(var(--mobile-bottom-nav-offset,0px)+env(safe-area-inset-bottom)))] md:space-y-6 md:px-6 md:py-6 lg:container lg:mx-auto lg:px-8 lg:py-8`}>
      <div ref={mobileNavigationRef} className="sticky top-0 z-30 rounded-xl border border-border/60 bg-background p-2 shadow-sm md:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2">
          <h1 className="text-base font-bold">Driver Tracker</h1>
          <button type="button" className="min-h-11 rounded-lg px-2 text-xs font-semibold text-primary focus-visible:ring-2 focus-visible:ring-ring" onClick={() => { setAttentionOnly(true); setMobileWorkspace("drivers"); }}>
            Needs attention {isLoading && !drivers.length ? "…" : attentionCount}
          </button>
        </div>
        <nav aria-label="Driver Tracker views" className="grid grid-cols-3 gap-1 rounded-lg bg-muted/30 p-1">
          {([{key:"map",label:"Map"},{key:"drivers",label:"Drivers"},{key:"loads",label:"Loads"}] as const).map(item => (
            <button key={item.key} type="button" aria-pressed={mobileWorkspace === item.key} aria-controls={"tracker-"+item.key+"-view"} onClick={() => setMobileWorkspace(item.key)} className={"min-h-11 rounded-md px-2 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring " + (mobileWorkspace === item.key ? "bg-background text-primary shadow-sm" : "text-muted-foreground")}>{item.label}</button>
          ))}
        </nav>
        {selectedDriver && mobileWorkspace !== "map" && <div className="mt-2 flex min-w-0 items-center gap-2 border-t border-border/40 pt-2">
          <button type="button" className="min-h-11 min-w-0 flex-1 rounded-lg px-2 text-left focus-visible:ring-2 focus-visible:ring-ring" onClick={() => openMobileDriverDrawer(selectedDriver)}><span className="block text-xs text-muted-foreground">Selected driver · Open workspace</span><span className="block truncate text-sm font-semibold">{selectedDriver.driver?.name || "Driver"}</span></button>
          <button type="button" className="min-h-11 rounded-lg border border-border px-3 text-xs font-semibold" onClick={() => focusDriverOnLiveMap(selectedDriver)}>View map</button>
        </div>}
      </div>

      {/* Desktop identity and fleet context share one application panel. */}
      <section
        aria-labelledby="driver-tracker-desktop-title"
        className="relative hidden overflow-hidden rounded-2xl border border-border/40 bg-card shadow-sm md:block dark:bg-zinc-900/60"
      >
        <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-primary via-emerald-400 to-cyan-400/20" />
        <div className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full bg-primary/[0.07] blur-3xl" />
        <div className="relative px-5 py-5 lg:px-6">
      <div className="flex min-w-0 flex-col justify-between gap-4 xl:flex-row xl:items-start xl:gap-6">
        <div className="min-w-0">
          <nav className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2 overflow-x-auto no-scrollbar whitespace-nowrap">
            <Link href="/" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <ChevronRight className="size-3 shrink-0" />
            <Link
              href="/transportation"
              className="hover:text-foreground transition-colors"
            >
              Transportation
            </Link>
            <ChevronRight className="size-3 shrink-0" />
            <span className="text-foreground font-bold">Driver Tracker</span>
          </nav>
          <div className="mt-3 flex items-center gap-2">
            <span className="size-2 shrink-0 rounded-full bg-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-primary/80">
              Suprah Driver Operations
            </span>
          </div>
          <h1 id="driver-tracker-desktop-title" className="mt-2 text-3xl font-black uppercase leading-none tracking-tight text-foreground lg:text-4xl">
            Driver <span className="text-primary">Tracker</span>
          </h1>
          <p className="text-sm text-muted-foreground/80 font-medium mt-1">
            Real-time driver tracking, load assignment, and fleet management
          </p>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2 xl:max-w-md xl:justify-end">
          <span className="flex w-full flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground xl:justify-end">
            <Clock className="size-3 shrink-0" />
            {currentTime.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              timeZone: "America/Denver",
            })}
            <span className="text-primary/60 font-black whitespace-nowrap">
              {currentTime.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                timeZone: "America/Denver",
              })}{" "}
              {mountainTimeZoneLabel}
            </span>
            <span className="text-muted-foreground/40 font-medium normal-case whitespace-nowrap">
              (Mountain Time)
            </span>
          </span>

          {loadRequests.length > 0 && (
            <Badge
              className="max-w-full cursor-pointer gap-1 whitespace-normal border-amber-200 bg-amber-500/10 text-xs font-bold text-amber-600 dark:border-amber-500/30 dark:text-amber-400"
              onClick={() => {
                openLoadManagement("requests");
              }}
            >
              <Bell className="size-3" />
              {loadRequests.length} request
              {loadRequests.length !== 1 ? "s" : ""}
            </Badge>
          )}

          {openStatusRequestDrivers.length > 0 && (
            <Badge
              className="max-w-full cursor-pointer gap-1 whitespace-normal border-red-200 bg-red-500/10 text-xs font-bold text-red-600 dark:border-red-500/30 dark:text-red-400"
              onClick={() => {
                const first = openStatusRequestDrivers[0];
                if (first) {
                  setStatusRequestDriver(first);
                  setStatusRequestDialogOpen(true);
                }
              }}
            >
              <Bell className="size-3" />
              {openStatusRequestDrivers.length} availability request
              {openStatusRequestDrivers.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-border/35 pt-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="flex min-w-0 items-center gap-2" title={kpi.description}>
            <span className="shrink-0 [&>svg]:size-4">{kpi.icon}</span>
            <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
            {isLoading ? (
              <Skeleton className="h-4 w-8" />
            ) : (
              <span className={"text-sm font-black tabular-nums " + (kpi.color || "text-foreground")}>
                {kpi.value}
              </span>
            )}
          </div>
        ))}
      </div>
        </div>
      </section>

      {isDriver && driverLocationSharing && (
        <DriverTrackerShareCard
          shareStatus={driverLocationSharing.shareStatus}
          onStatusChange={driverLocationSharing.setShareStatus}
          isSharing={driverLocationSharing.isSharing}
          onToggleSharing={() =>
            driverLocationSharing.isSharing
              ? void driverLocationSharing.stopSharing()
              : driverLocationSharing.startSharing()
          }
          lastShareAt={driverLocationSharing.lastShareAt}
          shareError={driverLocationSharing.shareError}
          hasActiveLoad={drivers.some(
            (d) => d.driver?.id === user?.id && (d.shipments?.length ?? 0) > 0,
          )}
        />
      )}

      <div className="grid w-full min-w-0 grid-cols-1 items-start gap-0 md:gap-4 xl:items-stretch xl:grid-cols-[minmax(0,1fr)_400px]">

        <div id="tracker-map-view" className={`${mobileWorkspace === "map" ? "block" : "hidden"} w-full min-w-0 md:block xl:col-start-1 xl:row-start-1`}>
          <DriverTrackerMap
            mapboxToken={normalizedToken}
            mapRef={mapRef}
            onZoomIn={() => zoomMap(1)}
            onZoomOut={() => zoomMap(-1)}
            onCenter={() => { setFollowingDriver(false); centerOnMe(); }}
            selectedDriver={selectedDriver}
            trackingNow={trackingNow}
            following={followingDriver}
            onFollow={() => {
              cameraActionRef.current += 1;
              if (!selectedDriver || !validCoordinates(selectedDriver.coords)) return;
              setMapFilter("all");
              setFollowingDriver(value => !value);
            }}
            onClearSelection={() => { setSelectedDriverId(null); setFollowingDriver(false); }}
            onDetails={() => { if (selectedDriver) openMobileDriverDrawer(selectedDriver); }}
            onChat={() => { if (selectedDriver) handleMessageDriver(selectedDriver); }}
            activityLabels={statusLabel}
            mapNotice={mapNotice}
            activeCount={gpsSharingDrivers.length}
            mapFilter={mapFilter}
            onMapFilterChange={filter => { setFollowingDriver(false); setSelectedDriverId(null); setMapFilter(filter); }}
            isMapReady={isMapReady}
            isMapTransitioning={isMapTransitioning}
          />
        </div>

        <div id="tracker-drivers-view" className={`${mobileWorkspace === "drivers" ? "block" : "hidden"} w-full min-w-0 md:block md:[&>div]:rounded-2xl xl:relative xl:min-h-0 xl:self-stretch xl:col-start-2 xl:row-start-1`}>
        <DriverTrackerListCard
          attentionOnly={attentionOnly}
          onAttentionOnlyChange={setAttentionOnly}
          pendingRequestDriverIds={pendingRequestDriverIds}
          drivers={drivers}
          selectedDriverId={selectedDriverId}
          trackingNow={trackingNow}
          onRetry={() => void fetchDrivers()}
          isLoading={isLoading}
          error={error}
          statusLabel={statusLabel}
          statusStyles={statusStyles}
          statusText={statusText}
          onDriverClick={(driver) => {
            focusDriverOnLiveMap(driver);
          }}
          onAssignLoad={(driver) => {
            setAssigningTo(driver);
            setAssignModalOpen(true);
          }}
          onAlertDriver={(driver) => {
            setAlertDriver(driver);
            setAlertDialogOpen(true);
          }}
          onMessageDriver={handleMessageDriver}
          onViewCompliance={(driver) => {
            setComplianceDriver(driver);
            setComplianceDialogOpen(true);
          }}
          onViewStatusRequest={(driver) => {
            setStatusRequestDriver(driver);
            setStatusRequestDialogOpen(true);
          }}
          unreadMessageCounts={unreadMessageCounts}
          onOpenDriver={openMobileDriverDrawer}
        />
        </div>
      </div>

      <div
        ref={loadManagementRef}
        tabIndex={-1}
        id="tracker-loads-view"
        aria-label="Load Management"
        className={`${mobileWorkspace === "loads" ? "block" : "hidden"} w-full min-w-0 scroll-mt-56 md:scroll-mt-4 md:block`}
      >
      <Card className="flex h-auto min-h-0 max-h-none flex-col gap-0 overflow-hidden rounded-none border-x-0 border-border/50 p-0 shadow-sm md:h-auto md:min-h-0 md:max-h-none md:rounded-2xl md:border-x">
        <CardHeader className="shrink-0 space-y-3 border-b border-border/30 px-3 py-3 sm:px-5 md:bg-muted/[0.12] md:py-4">
          <CardTitle className="text-base sm:text-lg font-black flex items-center gap-2">
            <LayoutGrid className="size-4.5 text-primary shrink-0" />
            <span>Load Management</span>
          </CardTitle>
          <div className="grid grid-cols-3 gap-2 p-1 rounded-lg bg-muted/30 border border-border/40 sm:flex sm:gap-1">
            {(
              [
                {
                  key: "assigned",
                  label: "Assigned",
                  icon: <Package className="size-3 text-emerald-500 dark:text-emerald-400 shrink-0" />,
                  count: totalLoads,
                  activeClass: "bg-emerald-500/20 border-emerald-500/40",
                  badgeClass: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
                },
                {
                  key: "available",
                  label: "Available",
                  icon: <Truck className="size-3 text-blue-500 dark:text-blue-400 shrink-0" />,
                  count: availableLoads.length,
                  activeClass: "bg-blue-500/20 border-blue-500/40",
                  badgeClass: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
                },
                {
                  key: "requests",
                  label: "Requests",
                  icon: <Bell className="size-3 text-amber-500 dark:text-amber-400 shrink-0" />,
                  count: loadRequests.length,
                  activeClass: "bg-amber-500/20 border-amber-500/40",
                  badgeClass: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setLoadsTab(tab.key);
                  if (tab.key !== "requests") setFocusedRequestKey(null);
                }}
                className={`flex min-w-0 flex-col items-center justify-center gap-1.5 px-1.5 sm:flex-row sm:px-2.5 py-2 sm:py-1.5 rounded-md flex-1 min-h-11 transition-colors ${loadsTab === tab.key
                    ? `${tab.activeClass} border shadow-sm`
                    : "border border-transparent hover:bg-muted/50"
                  }`}
              >
                {tab.icon}
                <span
                  className={`text-xs font-bold text-center whitespace-normal sm:flex-1 sm:text-left ${loadsTab === tab.key
                      ? "text-foreground"
                      : "text-muted-foreground"
                    }`}
                >
                  {tab.label}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[11px] font-bold shrink-0 ${loadsTab === tab.key
                      ? tab.badgeClass
                      : "bg-muted/50 text-muted-foreground/60"
                    }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </CardHeader>

        <div className="min-h-0 flex-1 overflow-visible">
        {loadsTab === "assigned" && selectedLoadsDriverId && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 px-4 py-3 text-sm">
            <span>Loads for <strong>{drivers.find((driver) => String(driver.driver?.id ?? driver.id) === selectedLoadsDriverId)?.driver?.name || "selected driver"}</strong></span>
            <button type="button" className="min-h-10 rounded-lg border border-border px-3 font-semibold text-primary focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setSelectedLoadsDriverId(null)}>Show all drivers</button>
          </div>
        )}
        {loadsTab === "assigned" && (
          <DriverTrackerLoadsCard
            allDrivers={drivers}
            emptyTitle={selectedLoadsDriverId ? "No assigned loads for this driver" : "No assigned loads"}
            emptyDescription={selectedLoadsDriverId ? "Choose Show all drivers to view other assignments." : "Assign loads to drivers from the Available tab."}
            onRetry={() => void fetchDrivers()}
            drivers={selectedLoadsDriverId ? driversWithLoads.filter((driver) => String(driver.driver?.id ?? driver.id) === selectedLoadsDriverId) : driversWithLoads}
            isLoading={isLoading}
            error={error}
            activeDrivers={eligibleDrivers}
            onRemoveLoad={handleRemoveLoad}
            onReassignLoad={handleReassignLoad}
            onKeepAssigned={handleKeepAssigned}
          />
        )}

        {loadsTab === "available" && (
          <>
          {availableLoadsError && (
            <div role="alert" className="m-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              <p className="min-w-0 flex-1">{availableLoadsError}</p>
              <button type="button" disabled={loadsLoading} onClick={() => void fetchAvailableLoads()} className="min-h-10 rounded-lg border border-border bg-background px-3 font-bold disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring">Retry</button>
            </div>
          )}
          {availableLoadsHasMore && (
            <p className="px-4 pt-3 text-xs text-muted-foreground">More posted loads are available. <Link href="/transportation" className="font-semibold text-primary underline">Open Transportation to search the full list.</Link></p>
          )}
          {(!availableLoadsError || availableLoads.length > 0) && <DriverTrackerAvailableLoadsCard
            loads={availableLoads}
            isLoading={loadsLoading && availableLoads.length === 0}
            activeDrivers={eligibleDrivers}
            onAssign={handleAssignFromAvailable}
          />}
          </>
        )}

        {loadsTab === "requests" && (
          <>
          {loadRequestsError && (
            <div role="alert" className="m-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              <p className="min-w-0 flex-1">{loadRequestsError}</p>
              <button type="button" disabled={loadRequestsLoading} onClick={() => void fetchLoadRequests()} className="min-h-10 rounded-lg border border-border bg-background px-3 font-bold disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring">Retry</button>
            </div>
          )}
            {focusedRequestKey && !loadRequestsLoading && !loadRequestsError && !focusedRequestExists && (
              <div className="mx-3 mt-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-3 py-2.5 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                This load request is no longer pending. It may already have been approved, rejected, or assigned to another driver.
              </div>
            )}

            {!loadRequestsError && !loadRequestsLoading && loadRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="size-14 rounded-2xl bg-muted/40 flex items-center justify-center">
                  <Bell className="size-7 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  No pending requests
                </p>
                <p className="text-xs text-muted-foreground/75">
                  Driver load requests will appear here
                </p>
              </div>
            ) : (
              (!loadRequestsError || loadRequests.length > 0) && <DriverTrackerRequestsCard
                requests={loadRequests}
                isLoading={loadRequestsLoading && loadRequests.length === 0}
                onApprove={handleApproveRequest}
                onReject={handleRejectRequest}
                approvingId={approvingId}
                rejectingId={rejectingId}
                focusedRequestKey={focusedRequestKey}
              />
            )}
          </>
        )}
        </div>
      </Card>
      </div>

      <DriverTrackerMobileDrawer
        open={mobileDriverDrawerOpen}
        onOpenChange={setMobileDriverDrawerOpen}
        driver={mobileDrawerDriver}
        activeTab={mobileDriverDrawerTab}
        onActiveTabChange={setMobileDriverDrawerTab}
        statusLabel={statusLabel}
        unreadMessageCount={
          mobileDrawerDriver
            ? Math.max(
                0,
                Number(
                  unreadMessageCounts[
                    mobileDrawerDriver.driver?.id ?? mobileDrawerDriver.id
                  ] ?? 0,
                ),
              )
            : 0
        }
        onOpenChat={handleMessageDriver}
        onUnreadRefresh={refreshDriverUnread}
        onReviewLoadRequest={handleReviewLoadRequest}
        onAlertDriver={(driver) => {
          setAlertDriver(driver);
          setAlertDialogOpen(true);
        }}
        onAssignLoad={(driver) => {
          setAssigningTo(driver);
          setAssignModalOpen(true);
        }}
        onViewCompliance={(driver) => {
          setComplianceDriver(driver);
          setComplianceDialogOpen(true);
        }}
        onViewStatusRequest={(driver) => {
          setStatusRequestDriver(driver);
          setStatusRequestDialogOpen(true);
        }}
        onLocateDriver={(driver) => {
          focusDriverOnLiveMap(driver, { closeDrawer: true });
        }}
        onOpenLoadManagement={(driver) => openLoadManagement("assigned", String(driver.driver?.id ?? driver.id))}
      />

      <DriverAssignLoadModal
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        driver={assigningTo}
        availableLoads={availableLoads}
        isLoading={loadsLoading}
        onAssign={handleAssignLoad}
      />

      <DriverDispatchAlertDialog
        open={alertDialogOpen}
        onOpenChange={setAlertDialogOpen}
        driver={alertDriver}
      />

      <DriverComplianceDocumentsDialog
        open={complianceDialogOpen}
        onOpenChange={(nextOpen) => {
          setComplianceDialogOpen(nextOpen);
          if (!nextOpen) setComplianceDriver(null);
        }}
        driver={complianceDriver}
      />

      <DriverStatusRequestReviewDialog
        open={statusRequestDialogOpen}
        onOpenChange={(nextOpen) => {
          setStatusRequestDialogOpen(nextOpen);
          if (!nextOpen) {
            setStatusRequestDriver(null);
            clearStatusRequestDeepLink();
          }
        }}
        driver={statusRequestDriver}
        requestId={statusRequestDriver?.statusRequest?.id ?? searchParams.get("statusRequestId")}
        activeDrivers={eligibleDrivers}
        onReassignLoad={handleStatusRequestReassignLoad}
        onUpdated={fetchDrivers}
      />

      <PendingLoadRequestAssignmentDialog
        open={pendingRequestAssignmentReview !== null}
        onOpenChange={handlePendingRequestAssignmentOpenChange}
        conflict={pendingRequestAssignmentReview?.conflict ?? null}
        isSubmitting={pendingRequestAssignmentSubmitting}
        onConfirm={confirmPendingRequestAssignment}
      />

      <DriverLoadCompatibilityReviewDialog
        open={compatibilityReview !== null}
        onOpenChange={handleCompatibilityReviewOpenChange}
        compatibility={compatibilityReview?.compatibility ?? null}
        driverName={compatibilityReview?.driverName || "Driver"}
        loadLabel={compatibilityReview?.loadLabel || "Load"}
        actionLabel={compatibilityReview?.actionLabel || "Continue Anyway"}
        activeLoads={compatibilityReview?.activeLoads ?? []}
        isSubmitting={compatibilityOverrideSubmitting}
        onConfirm={confirmCompatibilityOverride}
      />

      <DispatchChatDialog
        open={chatDialogOpen}
        onOpenChange={(nextOpen) => {
          setChatDialogOpen(nextOpen);

          if (!nextOpen) {
            setChatDriver(null);
            clearDispatchChatDeepLink();
          }
        }}
        driverId={chatDriver?.driver?.id ?? null}
        participantName={chatDriver?.driver?.name || "Driver"}
        onUnreadChange={handleChatUnreadChange}
        onReviewLoadRequest={handleReviewLoadRequest}
      />
    </div>
  );
}
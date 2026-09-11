"use client";

import contrastStyles from "./driver-tracker-contrast.module.css";

import * as React from "react";
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

const mapPinColor: Record<DriverStatus, string> = {
  "on-route": "#10b981",
  idle: "#f59e0b",
  "on-break": "#64748b",
  waiting: "#3b82f6",
  offline: "#94a3b8",
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
  const [loadsLoading, setLoadsLoading] = React.useState(false);
  const [availableLoadsHasMore, setAvailableLoadsHasMore] = React.useState(false);
  const [availableLoadsError, setAvailableLoadsError] = React.useState<string | null>(null);
  const [loadRequestsError, setLoadRequestsError] = React.useState<string | null>(null);
  const [selectedLoadsDriverId, setSelectedLoadsDriverId] = React.useState<string | null>(null);
  const [assignModalOpen, setAssignModalOpen] = React.useState(false);
  const [assigningTo, setAssigningTo] =
    React.useState<DriverTrackingItem | null>(null);
  const [loadRequests, setLoadRequests] = React.useState<any[]>([]);
  const [loadRequestsLoading, setLoadRequestsLoading] = React.useState(false);
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
  const [mobileWorkspace, setMobileWorkspace] = React.useState<
    "drivers" | "loads"
  >("drivers");
  const [mobileDrawerDriverId, setMobileDrawerDriverId] = React.useState<string | null>(null);
  const [mobileDriverDrawerOpen, setMobileDriverDrawerOpen] = React.useState(false);
  const [mobileDriverDrawerTab, setMobileDriverDrawerTab] =
    React.useState<DriverTrackerMobileDrawerTab>("overview");

  const loadManagementRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = React.useRef<any>(null);
  const markersRef = React.useRef<Map<string, any>>(new Map());
  const popupsRef = React.useRef<Map<string, any>>(new Map());
  const mapThemeRef = React.useRef<"light" | "dark" | null>(null);
  const locationNamesRef = React.useRef<Map<string, string>>(new Map());

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const normalizedToken = mapboxToken?.trim();

  const gpsSharingDrivers = React.useMemo(
    () => drivers.filter((d) => d.isSharing),
    [drivers],
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
      return drivers.filter((d) => d.isSharing);
    if (mapFilter === "on-route")
      return drivers.filter((d) => d.status === "on-route");
    if (mapFilter === "with-loads")
      return drivers.filter((d) => d.shipments && d.shipments.length > 0);
    return drivers;
  }, [drivers, mapFilter]);

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

  const fetchDrivers = React.useCallback(async () => {
    if (!isSignedIn) return;
    if (!initialLoadDone.current) setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const response = await apiClient.get("/api/driver-tracking/org-drivers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const directory = response.data?.data?.drivers || [];
      setDrivers(
        directory.map((item: any): DriverTrackingItem => ({
          id: item.id,
          status: item.presence?.status ?? "offline",
          coords: item.presence?.coords ?? null,
          lastSeenAt: item.presence?.lastSeenAt ?? null,
          isSharing: Boolean(item.presence?.isSharing),
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
        })),
      );
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || "Failed to load drivers",
      );
    } finally {
      initialLoadDone.current = true;
      setIsLoading(false);
    }
  }, [getToken, isSignedIn]);

  const fetchAvailableLoads = React.useCallback(async () => {
    if (!isSignedIn) return;
    setLoadsLoading(true);
    setAvailableLoadsError(null);
    try {
      const token = await getToken();
      const loadsRes = await apiClient.get("/api/loads", {
        headers: { Authorization: `Bearer ${token}` },
        params: { status: "Posted", limit: 50 },
      });
      const allLoads: any[] = loadsRes.data?.data?.loads || [];
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
    } catch {
      setAvailableLoadsError("Could not refresh available loads. Previously loaded results may be out of date.");
    } finally {
      setLoadsLoading(false);
    }
  }, [getToken, isSignedIn]);

  const fetchLoadRequests = React.useCallback(async () => {
    if (!isSignedIn || isDriver) return;
    setLoadRequestsLoading(true);
    setLoadRequestsError(null);
    try {
      const token = await getToken();
      const res = await apiClient.get("/api/driver-tracking/load-requests", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLoadRequests(res.data?.data || []);
    } catch {
      setLoadRequestsError("Could not refresh requests. Previously loaded requests may be out of date.");
    } finally {
      setLoadRequestsLoading(false);
    }
  }, [getToken, isSignedIn, isDriver]);


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
  }, []);

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
    [clearDispatchChatDeepLink, fetchLoadRequests],
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

  const focusDriverOnLiveMap = React.useCallback(
    (
      driver: DriverTrackingItem,
      options?: { closeDrawer?: boolean },
    ) => {
      const coords = driver.coords;
      if (!coords) return;

      if (options?.closeDrawer) {
        setMobileDriverDrawerOpen(false);
      }
      setMapFilter("all");

      const focusMap = () => {
        const mapElement = mapRef.current;
        const mapShell =
          (mapElement?.closest(
            "[data-driver-tracker-map-shell]",
          ) as HTMLElement | null) ?? mapElement;

        mapShell?.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });

        const map = mapInstanceRef.current;
        if (!map) return;

        map.resize?.();
        map.flyTo({
          center: [coords.lng, coords.lat],
          zoom: 15,
          essential: true,
        });

        window.setTimeout(() => {
          mapInstanceRef.current?.resize?.();
        }, 360);
      };

      if (options?.closeDrawer) {
        window.setTimeout(focusMap, 240);
      } else {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(focusMap);
        });
      }
    },
    [],
  );

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
    const interval = setInterval(fetchDrivers, LOCATION_INTERVAL_MS);
    return () => clearInterval(interval);
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
    const refreshAvailableLoads = () => {
      if (!cancelled) void fetchAvailableLoads();
    };

    const connectSocket = async () => {
      try {
        const token = await getToken();
        if (cancelled || !token) return;
        const sock = initializeSocket(token);
        socketRef.current = sock;

        sock.on(
          "driver:location",
          (data: {
            driverId: string;
            coords: { lat: number; lng: number } | null;
            status: DriverStatus;
            isSharing?: boolean;
            lastSeenAt: string;
          }) => {
            setDrivers((prev) => {
              const idx = prev.findIndex((d) => d.driver?.id === data.driverId);
              if (idx === -1) return prev;
              const updated = [...prev];
              updated[idx] = {
                ...updated[idx],
                coords: data.coords ?? updated[idx].coords,
                status: data.status,
                lastSeenAt: data.lastSeenAt,
                // GPS sharing is independent from Live Status. This matters
                // for On Leave (Live: Offline + GPS: Sharing) and In Shop
                // (Live: Waiting + GPS: Not Sharing/Sharing).
                isSharing:
                  typeof data.isSharing === "boolean"
                    ? data.isSharing
                    : data.status !== "offline",
              };
              return updated;
            });
          },
        );

        sock.on("driver:status_request_updated", () => {
          fetchDrivers();
        });

        sock.on("driver:operational_status_updated", () => {
          fetchDrivers();
        });

        sock.on("driver:loads_updated", () => {
          fetchDrivers();
          fetchAvailableLoads();
          fetchLoadRequests();
        });

        sock.on("driver:load_requested", () => {
          fetchLoadRequests();
          fetchAvailableLoads();
        });

        sock.on("driver:load_request_updated", () => {
          fetchLoadRequests();
          fetchDrivers();
          fetchAvailableLoads();
        });

        sock.on("load:change", refreshAvailableLoads);
        sock.on("connect", refreshAvailableLoads);
        cleanupLoadListeners = () => {
          sock.off("load:change", refreshAvailableLoads);
          sock.off("connect", refreshAvailableLoads);
        };

        sock.on(
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

        sock.on(
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
      socketRef.current?.off("driver:location");
      socketRef.current?.off("driver:status_request_updated");
      socketRef.current?.off("driver:operational_status_updated");
      socketRef.current?.off("driver:loads_updated");
      socketRef.current?.off("driver:load_requested");
      socketRef.current?.off("driver:load_request_updated");
      cleanupLoadListeners?.();
      socketRef.current?.off("dispatch-chat:message");
      socketRef.current?.off("driver:dispatch_alert_acknowledged");
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
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    const markers = markersRef.current;
    const popups = popupsRef.current;
    const activeIds = new Set<string>();

    const updateMarkers = async () => {
      const mapboxgl = (await import("mapbox-gl")).default;

      if (!map.isStyleLoaded()) {
        map.once("idle", () => updateMarkers());
        return;
      }

      mapDrivers.forEach((driver) => {
        // Keep a driver's last known location visible even after the heartbeat
        // becomes stale. Offline drivers use the gray map pin/status styling.
        if (!driver.coords) return;
        const position = [driver.coords.lng, driver.coords.lat] as [
          number,
          number,
        ];

        const coordKey = `${driver.coords.lat.toFixed(2)},${driver.coords.lng.toFixed(2)}`;
        const cachedLocation = locationNamesRef.current.get(coordKey);

        const buildPopupHtml = (locationName?: string) => `
          <div style="font-size:12px;line-height:1.5;padding:2px 4px;min-width:140px;color:#111827">
            <div style="font-weight:700;margin-bottom:3px;color:#111827">${driver.driver?.name || "Unknown Driver"}</div>
            <div style="color:${mapPinColor[driver.status]};margin-bottom:3px;font-weight:600">${statusLabel[driver.status]}</div>
            ${locationName ? `<div style="color:#374151;font-size:11px;margin-bottom:2px">${locationName}</div>` : ""}
            ${driver.shipments.length > 0 ? `<div style="color:#6b7280;font-size:11px">${driver.shipments.length} load${driver.shipments.length !== 1 ? "s" : ""} assigned</div>` : ""}
            ${driver.equipment?.trailerType ? `<div style="color:#7c3aed;font-size:10px;margin-top:3px;font-weight:600">${driver.equipment.trailerType.replace(/_/g, " ")}</div>` : ""}
          </div>`;

        const popupHtml = buildPopupHtml(cachedLocation);

        const buildPinSvg = (color: string) =>
          `<svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg" style="pointer-events:none">
            <path d="M14 1C7.925 1 3 5.925 3 12C3 19.5 14 34 14 34C14 34 25 19.5 25 12C25 5.925 20.075 1 14 1Z"
              fill="${color}" stroke="white" stroke-width="2"/>
            <circle cx="14" cy="12" r="4.5" fill="white"/>
          </svg>`;

        let marker = markers.get(driver.id);
        if (!marker) {
          const el = document.createElement("div");
          el.style.cursor = "pointer";
          el.style.width = "28px";
          el.style.height = "36px";
          el.innerHTML = buildPinSvg(mapPinColor[driver.status]);

          const popup = new mapboxgl.Popup({
            offset: [0, -36],
            closeButton: false,
            className: "driver-popup",
          }).setHTML(popupHtml);

          marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
            .setLngLat(position)
            .setPopup(popup)
            .addTo(map);

          markers.set(driver.id, marker);
          popups.set(driver.id, popup);
        } else {
          marker.setLngLat(position);
          const path = marker.getElement().querySelector("path");
          if (path) path.setAttribute("fill", mapPinColor[driver.status]);
          popups.get(driver.id)?.setHTML(popupHtml);
        }
        activeIds.add(driver.id);

        if (!locationNamesRef.current.has(coordKey) && normalizedToken) {
          const driverId = driver.id;
          fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${driver.coords.lng},${driver.coords.lat}.json?types=neighborhood,locality,place&limit=1&access_token=${normalizedToken}`,
          )
            .then((r) => r.json())
            .then((data) => {
              const raw: string = data.features?.[0]?.place_name ?? "";
              const locationName = raw.split(",").slice(0, 2).join(",").trim();
              if (locationName) {
                locationNamesRef.current.set(coordKey, locationName);
                popupsRef.current
                  .get(driverId)
                  ?.setHTML(buildPopupHtml(locationName));
              }
            })
            .catch(() => { });
        }
      });

      markers.forEach((marker, id) => {
        if (!activeIds.has(id)) {
          marker.remove();
          markers.delete(id);
          popups.get(id)?.remove();
          popups.delete(id);
        }
      });
    };

    updateMarkers();
  }, [mapDrivers]);

  const zoomMap = (delta: number) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setZoom(Math.max(2, Math.min(18, map.getZoom() + delta)));
  };

  const centerOnMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      const map = mapInstanceRef.current;
      if (!map) return;
      map.setCenter([position.coords.longitude, position.coords.latitude]);
      map.setZoom(12);
    });
  };

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

  const pendingActionCount =
    loadRequests.length + openStatusRequestDrivers.length;

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
    <div className={`${contrastStyles.scope} min-h-screen w-full min-w-0 max-w-none space-y-3 overflow-x-hidden px-2 py-3 md:space-y-6 md:px-6 md:py-6 lg:container lg:mx-auto lg:px-8 lg:py-8`}>
      {/* Mobile: Suprah Driver Operations identity.
          The operational summary replaces six equally-weighted KPI tiles while
          desktop presents the same fleet context in its own header panel. */}
      <section className="relative overflow-hidden rounded-2xl border border-border/45 bg-card md:hidden">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-primary via-emerald-400 to-cyan-400/20" />
        <div className="pointer-events-none absolute -right-12 -top-16 size-44 rounded-full bg-primary/[0.07] blur-3xl" />

        <div className="relative px-3 py-3">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <span className="relative flex size-2 shrink-0">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-50 motion-reduce:animate-none" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                <span className="min-w-0 break-words text-[9px] font-black uppercase tracking-[0.2em] text-primary/80 [overflow-wrap:anywhere]">
                  Suprah Driver Operations
                </span>
              </div>

              <h1 className="mt-2 text-[22px] font-black uppercase leading-none tracking-tight text-foreground">
                Driver <span className="text-primary">Tracker</span>
              </h1>
              <p className="mt-1.5 max-w-[27rem] text-[11px] font-medium leading-relaxed text-muted-foreground">
                Live driver location, availability, communication, and assignment readiness.
              </p>
            </div>

            <div
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${
                gpsSharingDrivers.length > 0
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-border/60 bg-muted/30 text-muted-foreground"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  gpsSharingDrivers.length > 0
                    ? "bg-emerald-500 animate-pulse motion-reduce:animate-none"
                    : "bg-slate-400"
                }`}
              />
              {gpsSharingDrivers.length > 0 ? "Live Fleet" : "Monitoring"}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-y border-border/35 py-2 text-[11px]">
            <span className="inline-flex items-center gap-1.5 font-bold text-foreground">
              <Users className="size-3.5 text-primary" />
              {drivers.length} Driver{drivers.length === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
              <Radio className="size-3.5" />
              {dispatchActiveDrivers.length} Active Drivers
            </span>
            <span className="inline-flex items-center gap-1.5 font-bold text-sky-600 dark:text-sky-400">
              <span className="size-1.5 rounded-full bg-sky-500" />
              {gpsSharingDrivers.length} GPS Sharing
            </span>
            <span className="inline-flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
              <Truck className="size-3.5" />
              {driversOnRoute} On Route
            </span>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                openLoadManagement("assigned");
              }}
              className="flex min-h-10 min-w-0 items-center justify-between gap-2 rounded-xl border border-blue-500/20 bg-blue-500/[0.06] px-3 py-2 text-left transition-colors hover:bg-blue-500/10"
            >
              <span className="min-w-0">
                <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                  Assigned Loads
                </span>
                <span className="mt-0.5 block text-sm font-black text-blue-600 dark:text-blue-400">
                  {totalLoads}
                </span>
              </span>
              <Package className="size-4 shrink-0 text-blue-500" />
            </button>

            <button
              type="button"
              disabled={pendingActionCount === 0}
              onClick={() => {
                if (loadRequests.length > 0) {
                  openLoadManagement("requests");
                  return;
                }
                const first = openStatusRequestDrivers[0];
                if (first) {
                  setStatusRequestDriver(first);
                  setStatusRequestDialogOpen(true);
                }
              }}
              className={`flex min-h-10 min-w-0 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${
                pendingActionCount > 0
                  ? "border-amber-500/25 bg-amber-500/[0.07] hover:bg-amber-500/12"
                  : "border-border/45 bg-muted/[0.18]"
              }`}
            >
              <span className="min-w-0">
                <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                  Pending Actions
                </span>
                <span
                  className={`mt-0.5 block text-sm font-black ${
                    pendingActionCount > 0
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-muted-foreground"
                  }`}
                >
                  {pendingActionCount}
                </span>
              </span>
              <Bell
                className={`size-4 shrink-0 ${
                  pendingActionCount > 0
                    ? "text-amber-500"
                    : "text-muted-foreground/50"
                }`}
              />
            </button>
          </div>

          <div className="mt-2 flex min-w-0 items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            <Clock className="size-3 shrink-0" />
            <span className="min-w-0 break-words">
              {currentTime.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                timeZone: "America/Denver",
              })}
              {" · "}
              <span className="text-primary">
                {currentTime.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  timeZone: "America/Denver",
                })}{" "}
                {mountainTimeZoneLabel}
              </span>
            </span>
          </div>
        </div>
      </section>

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

      <div className="grid w-full min-w-0 grid-cols-1 items-start gap-0 md:gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">

        <div className="-mx-2 min-w-0 md:mx-0 xl:col-start-1 xl:row-start-1">
          <DriverTrackerMap
            mapboxToken={normalizedToken}
            mapRef={mapRef}
            onZoomIn={() => zoomMap(1)}
            onZoomOut={() => zoomMap(-1)}
            onCenter={centerOnMe}
            mapNotice={mapNotice}
            activeCount={gpsSharingDrivers.length}
            mapFilter={mapFilter}
            onMapFilterChange={setMapFilter}
            isMapReady={isMapReady}
            isMapTransitioning={isMapTransitioning}
          />
        </div>

        <div className="-mx-2 border-y border-border/50 bg-background/95 p-1.5 backdrop-blur md:hidden">
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-border/40 bg-muted/25 p-1">
            {([
              {
                key: "drivers" as const,
                label: "Drivers",
                count: drivers.length,
                icon: Users,
              },
              {
                key: "loads" as const,
                label: "Load Management",
                count: totalLoads,
                icon: LayoutGrid,
              },
            ]).map((item) => {
              const Icon = item.icon;
              const active = mobileWorkspace === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setMobileWorkspace(item.key)}
                  className={`relative flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-black transition-colors ${
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                  }`}
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span>{item.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                      active
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {item.count}
                  </span>
                  {item.key === "loads" && loadRequests.length > 0 && (
                    <span className="absolute right-2 top-2 size-2 rounded-full bg-amber-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className={`${mobileWorkspace === "drivers" ? "block" : "hidden"} -mx-2 min-w-0 md:mx-0 md:block md:[&>div]:rounded-2xl xl:col-start-2 xl:row-start-1`}>
        <DriverTrackerListCard
          drivers={drivers}
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
        aria-label="Load Management"
        className={`${mobileWorkspace === "loads" ? "block" : "hidden"} -mx-2 scroll-mt-4 md:mx-0 md:block`}
      >
      <Card className="flex h-[calc(58dvh+6.25rem-var(--mobile-bottom-nav-offset))] min-h-[24rem] max-h-[calc(36rem+6.25rem-var(--mobile-bottom-nav-offset))] flex-col gap-0 overflow-hidden rounded-none border-x-0 border-border/50 p-0 shadow-sm md:h-auto md:min-h-0 md:max-h-none md:rounded-2xl md:border-x">
        <CardHeader className="shrink-0 space-y-3 border-b border-border/30 px-3 py-3 sm:px-5 md:bg-muted/[0.12] md:py-4">
          <CardTitle className="text-base sm:text-lg font-black flex items-center gap-2">
            <LayoutGrid className="size-4.5 text-primary shrink-0" />
            <span>Load Management</span>
          </CardTitle>
          <div className="flex gap-1 p-1 rounded-lg bg-muted/30 border border-border/40">
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
                className={`flex items-center justify-center gap-1.5 px-1.5 sm:px-2.5 py-2 sm:py-1.5 rounded-md flex-1 min-h-9 transition-all ${loadsTab === tab.key
                    ? `${tab.activeClass} border shadow-sm`
                    : "border border-transparent hover:bg-muted/50"
                  }`}
              >
                {tab.icon}
                <span
                  className={`text-xs font-bold flex-1 text-center sm:text-left truncate ${loadsTab === tab.key
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

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain md:overflow-visible">
        {loadsTab === "assigned" && selectedLoadsDriverId && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 px-4 py-3 text-sm">
            <span>Loads for <strong>{drivers.find((driver) => String(driver.driver?.id ?? driver.id) === selectedLoadsDriverId)?.driver?.name || "selected driver"}</strong></span>
            <button type="button" className="min-h-10 rounded-lg border border-border px-3 font-semibold text-primary focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setSelectedLoadsDriverId(null)}>Show all drivers</button>
          </div>
        )}
        {loadsTab === "assigned" && (
          <DriverTrackerLoadsCard
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
                isLoading={loadRequestsLoading}
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
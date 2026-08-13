"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  MapPin,
  Clock,
  Users,
  Radio,
  Truck,
  Package,
  ChevronRight,
  Bell,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { useUser } from "@/providers/AuthProvider";
import { DriverTrackingItem, DriverStatus } from "@/types/driver-tracking";
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
  isPostedToBoard?: boolean;
}
import { DriverTrackerMap } from "@/components/driver-tracker/DriverTrackerMap";
import { DriverTrackerShareCard } from "@/components/driver-tracker/DriverTrackerShareCard";
import { DriverTrackerLoadsCard } from "@/components/driver-tracker/DriverTrackerLoadsCard";
import { DriverTrackerListCard } from "@/components/driver-tracker/DriverTrackerListCard";
import { DriverAssignLoadModal } from "@/components/driver-tracker/DriverAssignLoadModal";
import { DriverTrackerAvailableLoadsCard } from "@/components/driver-tracker/DriverTrackerAvailableLoadsCard";
import { DriverTrackerRequestsCard } from "@/components/driver-tracker/DriverTrackerRequestsCard";
import { DriverDispatchAlertDialog } from "@/components/driver-tracker/DriverDispatchAlertDialog";
import { DriverComplianceDocumentsDialog } from "@/components/driver-tracker/DriverComplianceDocumentsDialog";
import { DispatchChatDialog } from "@/components/dispatch-chat/DispatchChatDialog";
import { toast } from "sonner";
import { useTheme } from "@/context/ThemeContext";
import {
  initializeSocket,
  getSocket,
} from "@/lib/socket.client";

const statusLabel: Record<DriverStatus, string> = {
  "on-route": "On Route",
  idle: "Idle",
  "on-break": "On Break",
  waiting: "Waiting",
  offline: "Offline",
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
  const [assignModalOpen, setAssignModalOpen] = React.useState(false);
  const [assigningTo, setAssigningTo] =
    React.useState<DriverTrackingItem | null>(null);
  const [loadRequests, setLoadRequests] = React.useState<any[]>([]);
  const [loadRequestsLoading, setLoadRequestsLoading] = React.useState(false);
  const [approvingId, setApprovingId] = React.useState<string | null>(null);
  const [rejectingId, setRejectingId] = React.useState<string | null>(null);
  const [loadsTab, setLoadsTab] = React.useState("assigned");
  const [alertDriver, setAlertDriver] = React.useState<DriverTrackingItem | null>(null);
  const [alertDialogOpen, setAlertDialogOpen] = React.useState(false);
  const [chatDriver, setChatDriver] = React.useState<DriverTrackingItem | null>(null);
  const [chatDialogOpen, setChatDialogOpen] = React.useState(false);
  const [complianceDriver, setComplianceDriver] =
    React.useState<DriverTrackingItem | null>(null);
  const [complianceDialogOpen, setComplianceDialogOpen] =
    React.useState(false);
  const [unreadMessageCounts, setUnreadMessageCounts] = React.useState<
    Record<string, number>
  >({});
  const [mapFilter, setMapFilter] = React.useState<
    "all" | "sharing" | "on-route" | "with-loads"
  >("all");

  const mapRef = React.useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = React.useRef<any>(null);
  const markersRef = React.useRef<Map<string, any>>(new Map());
  const popupsRef = React.useRef<Map<string, any>>(new Map());
  const mapThemeRef = React.useRef<"light" | "dark" | null>(null);
  const locationNamesRef = React.useRef<Map<string, string>>(new Map());

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const normalizedToken = mapboxToken?.trim();

  const activeDrivers = React.useMemo(
    () => drivers.filter((d) => d.isSharing),
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

  const handledDispatchChatDeepLinkRef = React.useRef<string | null>(null);
  const chatDialogOpenRef = React.useRef(chatDialogOpen);
  const openChatDriverIdRef = React.useRef<string | null>(null);

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
          requestedPickupDate: l.dates?.firstAvailable,
          isPostedToBoard: false,
        }));
      setAvailableLoads(mapped);
    } catch {
    } finally {
      setLoadsLoading(false);
    }
  }, [getToken, isSignedIn]);

  const handleAssignLoad = React.useCallback(
    async (item: AvailableItem) => {
      if (!assigningTo?.driver?.id || !isSignedIn) return;
      try {
        const token = await getToken();
        await apiClient.post(
          "/api/driver-tracking/assign-load",
          { loadId: item._id, driverId: assigningTo.driver.id },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        toast.success(
          `Load assigned to ${assigningTo.driver.name || "driver"}`,
        );
        fetchDrivers();
        fetchAvailableLoads();
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to assign load");
      }
    },
    [assigningTo, getToken, isSignedIn, fetchDrivers, fetchAvailableLoads],
  );

  const handleAssignFromAvailable = React.useCallback(
    async (item: AvailableItem, driverId: string) => {
      if (!isSignedIn) return;
      try {
        const token = await getToken();
        await apiClient.post(
          "/api/driver-tracking/assign-load",
          { loadId: item._id, driverId },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        toast.success("Load assigned successfully");
        fetchDrivers();
        fetchAvailableLoads();
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to assign load");
      }
    },
    [getToken, isSignedIn, fetchDrivers, fetchAvailableLoads],
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
        toast.success("Load removed from driver");
        fetchDrivers();
        fetchAvailableLoads();
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to remove load");
      }
    },
    [getToken, isSignedIn, fetchDrivers, fetchAvailableLoads],
  );

  const handleReassignLoad = React.useCallback(
    async (shipmentId: string, newDriverId: string) => {
      if (!isSignedIn) return;
      try {
        const token = await getToken();
        await apiClient.post(
          "/api/driver-tracking/reassign-load",
          { loadId: shipmentId, driverId: newDriverId },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        toast.success("Load reassigned successfully");
        fetchDrivers();
        fetchAvailableLoads();
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to reassign load");
      }
    },
    [getToken, isSignedIn, fetchDrivers, fetchAvailableLoads],
  );

  const fetchLoadRequests = React.useCallback(async () => {
    if (!isSignedIn || isDriver) return;
    setLoadRequestsLoading(true);
    try {
      const token = await getToken();
      const res = await apiClient.get("/api/driver-tracking/load-requests", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLoadRequests(res.data?.data || []);
    } catch {
    } finally {
      setLoadRequestsLoading(false);
    }
  }, [getToken, isSignedIn, isDriver]);

  const handleApproveRequest = React.useCallback(
    async (loadId: string, driverId: string) => {
      const key = `${loadId}-${driverId}`;
      setApprovingId(key);
      try {
        const token = await getToken();
        await apiClient.post(
          `/api/driver-tracking/loads/${loadId}/approve-request`,
          { driverId },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        toast.success("Load request approved — driver dispatched");
        fetchLoadRequests();
        fetchDrivers();
        fetchAvailableLoads();
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to approve request");
      } finally {
        setApprovingId(null);
      }
    },
    [getToken, fetchLoadRequests, fetchDrivers, fetchAvailableLoads],
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
    fetchAvailableLoads();
  }, [fetchAvailableLoads]);

  React.useEffect(() => {
    fetchLoadRequests();
  }, [fetchLoadRequests]);

  const socketRef = React.useRef<ReturnType<typeof getSocket>>(null);

  React.useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;

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
                isSharing: data.status !== "offline",
              };
              return updated;
            });
          },
        );

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

        sock.on("load:change", () => {
          fetchAvailableLoads();
        });

        sock.on(
          "dispatch-chat:message",
          (message: {
            id?: string;
            driverId?: string;
            senderRole?: "driver" | "dispatcher";
          }) => {
            const driverId = String(message?.driverId ?? "");
            if (!driverId || message?.senderRole !== "driver") return;

            // The open chat marks incoming messages read itself, so don't flash
            // an unread badge for the conversation the dispatcher is viewing.
            if (
              chatDialogOpenRef.current &&
              String(openChatDriverIdRef.current ?? "") === driverId
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
      socketRef.current?.off("driver:loads_updated");
      socketRef.current?.off("driver:load_requested");
      socketRef.current?.off("driver:load_request_updated");
      socketRef.current?.off("load:change");
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

  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    const tick = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  const totalLoads = drivers.reduce(
    (sum, d) => sum + (d.shipments?.length || 0),
    0,
  );

  const kpis = [
    {
      label: "Total Drivers",
      value: drivers.length,
      icon: <Users className="size-6 sm:size-7 text-primary" />,
      description: "All tracked drivers",
    },
    {
      label: "Active Now",
      value: activeDrivers.length,
      icon: <Radio className="size-6 sm:size-7 text-emerald-600 dark:text-emerald-400" />,
      description: "Currently sharing GPS",
      color: "text-emerald-500 dark:text-emerald-400",
    },
    {
      label: "On Route",
      value: drivers.filter((d) => d.status === "on-route").length,
      icon: <Truck className="size-6 sm:size-7 text-amber-600 dark:text-amber-400" />,
      description: "Delivering loads",
      color: "text-amber-500 dark:text-amber-400",
    },
    {
      label: "Loads Assigned",
      value: totalLoads,
      icon: <Package className="size-6 sm:size-7 text-blue-600 dark:text-blue-400" />,
      description: "Active shipments",
      color: "text-blue-500 dark:text-blue-400",
    },
  ];

  return (
    <div className="p-3 xs:p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 container mx-auto min-h-screen overflow-x-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <nav className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mb-2 overflow-x-auto no-scrollbar whitespace-nowrap">
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
          <h1 className="text-xl xs:text-2xl md:text-3xl font-black tracking-tight text-foreground">
            Driver Tracker
          </h1>
          <p className="text-xs text-muted-foreground/60 font-medium mt-1">
            Real-time driver tracking, load assignment, and fleet management
          </p>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
          <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex flex-wrap items-center gap-1.5 sm:gap-2">
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
              MST
            </span>
            <span className="hidden xs:inline text-muted-foreground/40 font-medium normal-case whitespace-nowrap">
              (
              {currentTime.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              local)
            </span>
          </span>
          {loadRequests.length > 0 && (
            <Badge
              className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30 text-[10px] font-bold gap-1 cursor-pointer shrink-0"
              onClick={() => setLoadsTab("requests")}
            >
              <Bell className="size-3" />
              {loadRequests.length} request
              {loadRequests.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {kpis.map((kpi) => (
          <Card
            key={kpi.label}
            className="p-0 border-border/50 shadow-sm hover:shadow-md transition-all duration-200 group relative overflow-hidden"
          >
            <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 p-1.5 rounded-lg bg-muted/40 dark:bg-muted/30 opacity-100 transition-opacity">
              {kpi.icon}
            </div>
            <CardContent className="p-3 sm:p-4">
              <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 pr-7">
                {kpi.label}
              </p>
              {isLoading ? (
                <Skeleton className="h-6 sm:h-7 w-14 mb-1" />
              ) : (
                <h3
                  className={`text-xl sm:text-2xl font-black tracking-tighter ${kpi.color || "text-foreground"}`}
                >
                  {kpi.value}
                </h3>
              )}
              <p className="text-[9px] sm:text-[10px] text-muted-foreground/60 font-medium mt-0.5">
                {kpi.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

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

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px] items-start gap-3 sm:gap-4">
        <DriverTrackerMap
          mapboxToken={normalizedToken}
          mapRef={mapRef}
          onZoomIn={() => zoomMap(1)}
          onZoomOut={() => zoomMap(-1)}
          onCenter={centerOnMe}
          mapNotice={mapNotice}
          activeCount={activeDrivers.length}
          mapFilter={mapFilter}
          onMapFilterChange={setMapFilter}
          isMapReady={isMapReady}
          isMapTransitioning={isMapTransitioning}
        />

        <DriverTrackerListCard
          drivers={drivers}
          isLoading={isLoading}
          error={error}
          statusLabel={statusLabel}
          statusStyles={statusStyles}
          statusText={statusText}
          onDriverClick={(driver) => {
            const map = mapInstanceRef.current;
            if (!map || !driver.coords) return;
            map.flyTo({
              center: [driver.coords.lng, driver.coords.lat],
              zoom: 15,
              essential: true,
            });
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
          unreadMessageCounts={unreadMessageCounts}
        />
      </div>

      <Card className="border-border/50 shadow-sm p-0 gap-0 overflow-hidden">
        <CardHeader className="py-3 px-3 sm:px-5 border-b border-border/30 space-y-3">
          <CardTitle className="text-sm sm:text-base font-black flex items-center gap-2">
            <LayoutGrid className="size-4.5 text-primary shrink-0" />
            Load Management
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
                onClick={() => setLoadsTab(tab.key)}
                className={`flex items-center justify-center gap-1.5 px-1.5 sm:px-2.5 py-2 sm:py-1.5 rounded-md flex-1 min-h-9 transition-all ${loadsTab === tab.key
                    ? `${tab.activeClass} border shadow-sm`
                    : "border border-transparent hover:bg-muted/50"
                  }`}
              >
                {tab.icon}
                <span
                  className={`text-[11px] font-bold flex-1 text-center sm:text-left truncate ${loadsTab === tab.key
                      ? "text-foreground"
                      : "text-muted-foreground"
                    }`}
                >
                  {tab.label}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${loadsTab === tab.key
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

        {loadsTab === "assigned" && (
          <DriverTrackerLoadsCard
            drivers={driversWithLoads}
            isLoading={isLoading}
            error={error}
            activeDrivers={activeDrivers}
            onRemoveLoad={handleRemoveLoad}
            onReassignLoad={handleReassignLoad}
          />
        )}

        {loadsTab === "available" && (
          <DriverTrackerAvailableLoadsCard
            loads={availableLoads}
            isLoading={loadsLoading}
            activeDrivers={activeDrivers}
            onAssign={handleAssignFromAvailable}
          />
        )}

        {loadsTab === "requests" &&
          (!loadRequestsLoading && loadRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="size-14 rounded-2xl bg-muted/40 flex items-center justify-center">
                <Bell className="size-7 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                No pending requests
              </p>
              <p className="text-[11px] text-muted-foreground/60">
                Driver load requests will appear here
              </p>
            </div>
          ) : (
            <DriverTrackerRequestsCard
              requests={loadRequests}
              isLoading={loadRequestsLoading}
              onApprove={handleApproveRequest}
              onReject={handleRejectRequest}
              approvingId={approvingId}
              rejectingId={rejectingId}
            />
          ))}
      </Card>

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
      />
    </div>
  );
}
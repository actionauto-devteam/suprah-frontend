"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@/providers/AuthProvider";
import { apiClient } from "@/lib/api-client";
import { initializeSocket } from "@/lib/socket.client";
import { useDriverLocationSharing } from "@/hooks/useDriverLocationSharing";
import { useTheme } from "@/context/ThemeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  MapPin,
  Truck,
  Package,
  CheckCircle2,
  Clock,
  Navigation2,
  Loader2,
  Wifi,
  WifiOff,
  Coffee,
  Hourglass,
  LocateFixed,
  Plus,
  Minus,
  ArrowRight,
  Satellite,
  XCircle,
  AlertTriangle,
  Timer,
  Wrench,
  PauseCircle,
  Route,
  Calendar,
  Save,
  Shield,

  Zap,
  DollarSign,
  MessageSquare,
  Camera,
  ImageIcon,
} from "lucide-react";
import { US_STATES, AVAILABLE_DAYS } from "@/components/driver-profile/driver-profile-constants";
import { PreferredRoutesEditor } from "@/components/driver-profile/PreferredRoutesEditor";
import { ConfirmationModal, ConfirmationVariant } from "@/components/ui/confirmation-modal";
import { DriverAcceptLoadDialog } from "@/components/driver/DriverAcceptLoadDialog";
import { DriverStatusChangeDialog } from "@/components/driver/DriverStatusChangeDialog";
import { DispatchChatDialog } from "@/components/dispatch-chat/DispatchChatDialog";
import { useDriverWorkEligibility } from "@/hooks/useDriverWorkEligibility";
import Link from "next/link";

type DriverStatus = "on-route" | "idle" | "on-break" | "waiting" | "offline";

const STATUS_CONFIG: Array<{
  key: DriverStatus;
  label: string;
  icon: React.ReactNode;
  color: string;
  activeColor: string;
  needsLoad?: boolean;
}> = [
    {
      key: "on-route",
      label: "On Route",
      icon: <Navigation2 className="size-4 sm:size-5" />,
      color: "border-border/50 text-muted-foreground hover:bg-emerald-500/5 hover:border-emerald-300 dark:hover:border-emerald-700",
      activeColor: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-400 dark:border-emerald-600 shadow-sm shadow-emerald-500/10",
      needsLoad: true,
    },
    {
      key: "idle",
      label: "Idle",
      icon: <Clock className="size-4 sm:size-5" />,
      color: "border-border/50 text-muted-foreground hover:bg-amber-500/5 hover:border-amber-300 dark:hover:border-amber-700",
      activeColor: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-400 dark:border-amber-600 shadow-sm shadow-amber-500/10",
    },
    {
      key: "waiting",
      label: "Waiting",
      icon: <Hourglass className="size-4 sm:size-5" />,
      color: "border-border/50 text-muted-foreground hover:bg-blue-500/5 hover:border-blue-300 dark:hover:blue-700",
      activeColor: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-400 dark:border-blue-600 shadow-sm shadow-blue-500/10",
    },
    {
      key: "on-break",
      label: "On Break",
      icon: <Coffee className="size-4 sm:size-5" />,
      color: "border-border/50 text-muted-foreground hover:bg-slate-500/5 hover:border-slate-300 dark:hover:border-slate-600",
      activeColor: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-400 dark:border-slate-500 shadow-sm shadow-slate-500/10",
    },
  ];

const LOAD_STATUS_COLORS: Record<string, string> = {
  "Posted": "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700",
  "Assigned": "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700",
  "Accepted": "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700",
  "Picked Up": "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700",
  "In-Transit": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700",
  "Delivered": "bg-green-500/15 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700",
  "Cancelled": "bg-red-500/15 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700",
};

const OP_STATUS_CONFIG = [
  { key: "active", label: "Active", icon: <CheckCircle2 className="size-4 sm:size-5" />, color: "border-border/50 text-muted-foreground hover:bg-emerald-500/5", activeColor: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-400 dark:border-emerald-600 shadow-sm shadow-emerald-500/10" },
  { key: "on_leave", label: "On Leave", icon: <PauseCircle className="size-4 sm:size-5" />, color: "border-border/50 text-muted-foreground hover:bg-amber-500/5", activeColor: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-400 dark:border-amber-600 shadow-sm shadow-amber-500/10" },
  { key: "maintenance", label: "In Shop", icon: <Wrench className="size-4 sm:size-5" />, color: "border-border/50 text-muted-foreground hover:bg-blue-500/5", activeColor: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-400 dark:border-blue-600 shadow-sm shadow-blue-500/10" },
];

const LIVE_STATUS_LABEL: Record<DriverStatus, string> = {
  "on-route": "On Route",
  idle: "Idle",
  waiting: "Waiting",
  "on-break": "On Break",
  offline: "Disconnected",
};

const MAP_CENTER: [number, number] = [-98.5795, 39.8283];
const MAP_STYLE_BY_THEME = {
  dark: "mapbox://styles/mapbox/navigation-night-v1",
  light: "mapbox://styles/mapbox/streets-v12",
} as const;

function formatDualTime(date: Date) {
  const mst = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "America/Denver",
  });
  const utc = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
  return { mst, utc };
}

type DriverKpiSnapshot = {
  activeLoads: number;
  completedLoads: number;
  totalEarnings: number;
  profileCompletionScore: number;
  updatedAt: number;
};

const DRIVER_KPI_CACHE_PREFIX = "driver-command-center-kpis";
const DRIVER_KPI_CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;

function readDriverKpiSnapshot(userId?: string | null): DriverKpiSnapshot | null {
  if (typeof window === "undefined" || !userId) return null;

  try {
    const raw = window.sessionStorage.getItem(
      `${DRIVER_KPI_CACHE_PREFIX}:${userId}`,
    );
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<DriverKpiSnapshot>;
    const updatedAt = Number(parsed.updatedAt ?? 0);
    if (
      !Number.isFinite(updatedAt) ||
      Date.now() - updatedAt > DRIVER_KPI_CACHE_MAX_AGE_MS
    ) {
      return null;
    }

    return {
      activeLoads: Math.max(0, Number(parsed.activeLoads ?? 0)),
      completedLoads: Math.max(0, Number(parsed.completedLoads ?? 0)),
      totalEarnings: Math.max(0, Number(parsed.totalEarnings ?? 0)),
      profileCompletionScore: Math.max(
        0,
        Math.min(100, Number(parsed.profileCompletionScore ?? 0)),
      ),
      updatedAt,
    };
  } catch {
    return null;
  }
}

function writeDriverKpiSnapshot(
  userId: string | null | undefined,
  snapshot: DriverKpiSnapshot,
) {
  if (typeof window === "undefined" || !userId) return;

  try {
    window.sessionStorage.setItem(
      `${DRIVER_KPI_CACHE_PREFIX}:${userId}`,
      JSON.stringify(snapshot),
    );
  } catch {
    // KPI caching is only a visual-speed optimization. Never block the page
    // if storage is unavailable or disabled.
  }
}

export default function DriverDashboardPage() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { theme } = useTheme();
  const [loads, setLoads] = React.useState<any[]>([]);
  const [dashStats, setDashStats] = React.useState<{
    pendingRequests: number;
    totalEarnings: number;
    profileCompletionScore: number;
    isComplianceExpired: boolean;
    completedLoads: number;
  } | null>(null);
  const [kpiSnapshot, setKpiSnapshot] = React.useState<DriverKpiSnapshot | null>(
    () => readDriverKpiSnapshot(user?.id),
  );
  const [hasFreshLoads, setHasFreshLoads] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [accepting, setAccepting] = React.useState<string | null>(null);
  const [acceptDialogLoad, setAcceptDialogLoad] = React.useState<any | null>(null);
  const [selectedActiveLoadId, setSelectedActiveLoadId] = React.useState<string | null>(null);
  const [dropping, setDropping] = React.useState<string | null>(null);
  const [pickingUp, setPickingUp] = React.useState<string | null>(null);
  const [startingRoute, setStartingRoute] = React.useState<string | null>(null);
  const [deliveryDialogLoad, setDeliveryDialogLoad] = React.useState<any | null>(null);
  const [mapReady, setMapReady] = React.useState(false);
  const [mapError, setMapError] = React.useState<string | null>(null);
  const [opStatus, setOpStatus] = React.useState("active");
  const [savingOpStatus, setSavingOpStatus] = React.useState(false);
  // Dispatch Status switches are optimistic so the selected state changes
  // immediately instead of waiting for the network round trip. If the driver
  // chooses a live status while a return-to-Active request is still saving,
  // keep that choice locally and publish it as soon as Active is confirmed.
  // This avoids racing a live-status heartbeat against the Dispatch Status PATCH.
  const [queuedLiveStatus, setQueuedLiveStatus] =
    React.useState<DriverStatus | null>(null);
  const queuedLiveStatusRef = React.useRef<DriverStatus | null>(null);
  // Remember the last live status that was confirmed while Dispatch Status was
  // Active. When the driver returns from On Leave/In Shop, the UI can restore
  // that live choice immediately while the backend PATCH is still settling,
  // instead of briefly flashing the stale off-duty presentation.
  const [lastActiveLiveStatus, setLastActiveLiveStatus] =
    React.useState<DriverStatus>("idle");
  const lastActiveLiveStatusRef = React.useRef<DriverStatus>("idle");
  const [statusRequestDialog, setStatusRequestDialog] = React.useState<{
    open: boolean;
    requestedStatus: "on_leave" | "maintenance";
    priority: "standard" | "emergency";
    updateExisting?: boolean;
  }>({ open: false, requestedStatus: "on_leave", priority: "standard" });
  const [returnToActiveLiveStatus, setReturnToActiveLiveStatus] =
    React.useState<DriverStatus | null>(null);
  const [emergencyChatOpen, setEmergencyChatOpen] = React.useState(false);
  const ignoreEmergencyChatUnread = React.useCallback((_count: number) => {}, []);
  const [logCity, setLogCity] = React.useState("");
  const [logState, setLogState] = React.useState("");
  const [logRadius, setLogRadius] = React.useState(500);
  const [logRoutes, setLogRoutes] = React.useState<string[]>([]);
  const [logDays, setLogDays] = React.useState<string[]>(["monday", "tuesday", "wednesday", "thursday", "friday"]);
  const [savingLogistics, setSavingLogistics] = React.useState(false);

  // Background dashboard refreshes (load socket events + the 15s fallback)
  // must never replace unsaved Logistics edits with the last saved profile.
  // Track each persisted Logistics group independently so a late profile GET
  // can still hydrate untouched fields without clobbering something the driver
  // has already changed.
  type LogisticsDraftKey = "homeBase" | "radius" | "routes" | "days";
  const logisticsDirtyRef = React.useRef<Record<LogisticsDraftKey, boolean>>({
    homeBase: false,
    radius: false,
    routes: false,
    days: false,
  });
  const logisticsVersionRef = React.useRef<Record<LogisticsDraftKey, number>>({
    homeBase: 0,
    radius: 0,
    routes: 0,
    days: 0,
  });

  const markLogisticsDirty = React.useCallback((key: LogisticsDraftKey) => {
    logisticsDirtyRef.current[key] = true;
    logisticsVersionRef.current[key] += 1;
  }, []);

  const setLogCityDraft = React.useCallback((value: string) => {
    markLogisticsDirty("homeBase");
    setLogCity(value);
  }, [markLogisticsDirty]);

  const setLogStateDraft = React.useCallback((value: string) => {
    markLogisticsDirty("homeBase");
    setLogState(value);
  }, [markLogisticsDirty]);

  const setLogRadiusDraft = React.useCallback((value: number) => {
    markLogisticsDirty("radius");
    setLogRadius(value);
  }, [markLogisticsDirty]);

  const setLogRoutesDraft = React.useCallback((routes: string[]) => {
    markLogisticsDirty("routes");
    setLogRoutes(routes);
  }, [markLogisticsDirty]);
  const [confirmState, setConfirmState] = React.useState<{
    isOpen: boolean;
    action: string;
    title: string;
    description: string;
    variant: ConfirmationVariant;
    load: any;
  }>({
    isOpen: false,
    action: '',
    title: '',
    description: '',
    variant: 'primary',
    load: null,
  });
  const {
    isSharing,
    isStarting,
    status,
    lastShareAt,
    error: locationError,
    startSharing,
    stopSharing,
    updateStatus,
    lastCoords,
    isLocationRequired,
    locationRequirementReason,
  } = useDriverLocationSharing();
  const workEligibility = useDriverWorkEligibility();

  // Keep a stable "last Active live status" only from the authoritative
  // operational state. The optimistic Dispatch Status switch must never
  // overwrite this memory with the temporary On Leave/In Shop presentation.
  React.useEffect(() => {
    if (
      workEligibility.operationalStatus !== "active" ||
      status === "offline"
    ) {
      return;
    }

    lastActiveLiveStatusRef.current = status;
    setLastActiveLiveStatus(status);
  }, [status, workEligibility.operationalStatus]);

  React.useEffect(() => {
    setOpStatus(workEligibility.operationalStatus);
  }, [workEligibility.operationalStatus]);

  // Dispatch Status and Live Status are separate persisted concerns, but they
  // should transition as one coordinated UI state:
  //   On Leave -> Live Offline
  //   In Shop  -> Live Waiting
  //   Active   -> queued selection, or the last confirmed Active live status
  //               while the Dispatch PATCH is in flight.
  const displayedLiveStatus: DriverStatus =
    opStatus === "on_leave"
      ? "offline"
      : opStatus === "maintenance"
        ? "waiting"
        : queuedLiveStatus ??
          (savingOpStatus ? lastActiveLiveStatus : status);

  const mapContainerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<any>(null);
  const markerRef = React.useRef<any>(null);
  const mapThemeRef = React.useRef<"light" | "dark" | null>(null);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim();
  const [mapNotice, setMapNotice] = React.useState<string | null>(null);

  const [currentTime, setCurrentTime] = React.useState(new Date());
  React.useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  React.useEffect(() => {
    if (!user?.id) return;
    const cached = readDriverKpiSnapshot(user.id);
    if (cached) setKpiSnapshot(cached);
  }, [user?.id]);

  React.useEffect(() => {
    if (!user?.id || !kpiSnapshot) return;
    writeDriverKpiSnapshot(user.id, kpiSnapshot);
  }, [kpiSnapshot, user?.id]);

  const fetchData = React.useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };
    const profileRequestVersions = { ...logisticsVersionRef.current };

    // Load the three dashboard data sources in parallel, but apply each result
    // as soon as it arrives. Previously Promise.all kept the KPI skeletons on
    // screen until the slowest request finished, which made the values feel
    // delayed even when the KPI data was already available.
    const loadsTask = apiClient
      .get("/api/driver-tracking/my-loads", { headers })
      .then((loadsRes) => {
        const loadsData = loadsRes.data?.data;
        const nextLoads =
          loadsData?.loads ?? (Array.isArray(loadsData) ? loadsData : []);

        setLoads(nextLoads);
        setHasFreshLoads(true);
        setKpiSnapshot((previous) => ({
          activeLoads: nextLoads.filter((load: any) =>
            ["Assigned", "Accepted", "Picked Up", "In-Transit"].includes(
              load.status,
            ),
          ).length,
          completedLoads:
            previous?.completedLoads ??
            nextLoads.filter((load: any) => load.status === "Delivered").length,
          totalEarnings: previous?.totalEarnings ?? 0,
          profileCompletionScore: previous?.profileCompletionScore ?? 0,
          updatedAt: Date.now(),
        }));
      })
      .catch((err: any) => {
        toast.error(err?.response?.data?.message || "Failed to load dashboard");
      })
      .finally(() => {
        // Current Load depends on this request, so it can stop showing its
        // loading state independently of the slower stats/profile requests.
        setIsLoading(false);
      });

    const statsTask = apiClient
      .get("/api/driver-tracking/dashboard-stats", { headers })
      .then((statsRes) => {
        const stats = statsRes?.data?.data;
        if (!stats) return;

        setDashStats(stats);
        setKpiSnapshot((previous) => ({
          activeLoads: previous?.activeLoads ?? 0,
          completedLoads: Math.max(0, Number(stats.completedLoads ?? 0)),
          totalEarnings: Math.max(0, Number(stats.totalEarnings ?? 0)),
          profileCompletionScore: Math.max(
            0,
            Math.min(100, Number(stats.profileCompletionScore ?? 0)),
          ),
          updatedAt: Date.now(),
        }));
      })
      .catch(() => {
        // Keep the last known KPI snapshot if dashboard stats are temporarily
        // unavailable. The normal realtime/fallback refresh will try again.
      });

    const profileTask = apiClient
      .get("/api/driver-profile", { headers })
      .then((profileRes) => {
        const profile = profileRes?.data?.data;
        if (!profile) return;

        setOpStatus(profile.operationalStatus || "active");

        // Only hydrate a Logistics group if the driver has not edited it since
        // this request started. This prevents realtime/fallback dashboard
        // refreshes from erasing unsaved Service Area, Preferred Routes, or
        // Regular Work Days changes.
        if (
          !logisticsDirtyRef.current.homeBase &&
          logisticsVersionRef.current.homeBase === profileRequestVersions.homeBase
        ) {
          setLogCity(profile.homeBase?.city || "");
          setLogState(profile.homeBase?.state || "");
        }

        if (
          !logisticsDirtyRef.current.radius &&
          logisticsVersionRef.current.radius === profileRequestVersions.radius
        ) {
          setLogRadius(profile.serviceRadius || 500);
        }

        if (
          !logisticsDirtyRef.current.routes &&
          logisticsVersionRef.current.routes === profileRequestVersions.routes
        ) {
          setLogRoutes(profile.preferredRoutes || []);
        }

        if (
          !logisticsDirtyRef.current.days &&
          logisticsVersionRef.current.days === profileRequestVersions.days
        ) {
          setLogDays(
            profile.availableDays || [
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
            ],
          );
        }
      })
      .catch(() => {
        // Profile preferences keep their current local values if this
        // secondary request is temporarily unavailable.
      });

    await Promise.allSettled([loadsTask, statsTask, profileTask]);
  }, [getToken]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Keep the Driver Command Center synchronized with dispatcher-side load
  // changes without requiring a browser refresh. The backend already emits
  // "driver:loads_updated" directly to this driver's user socket whenever a
  // load is assigned, reassigned, removed, approved, dropped, accepted, picked
  // up, or moved into route.
  React.useEffect(() => {
    let cancelled = false;
    let socket: ReturnType<typeof initializeSocket> | null = null;
    let fallbackTimer: number | null = null;

    const refreshFromRealtimeEvent = () => {
      if (cancelled) return;
      void fetchData();
    };

    const connect = async () => {
      try {
        const token = await getToken();
        if (!token || cancelled) return;

        socket = initializeSocket(token);
        socket.on("driver:loads_updated", refreshFromRealtimeEvent);

        // Fallback only. Socket.IO remains the primary update path, while this
        // protects the dashboard from becoming stale after a temporary socket
        // reconnect or a missed event.
        fallbackTimer = window.setInterval(
          refreshFromRealtimeEvent,
          15_000,
        );
      } catch {
        // If the socket cannot connect temporarily, keep the dashboard usable
        // and synchronized through the fallback until the component remounts.
        fallbackTimer = window.setInterval(
          refreshFromRealtimeEvent,
          15_000,
        );
      }
    };

    void connect();

    return () => {
      cancelled = true;

      if (fallbackTimer !== null) {
        window.clearInterval(fallbackTimer);
      }

      socket?.off(
        "driver:loads_updated",
        refreshFromRealtimeEvent,
      );
    };
  }, [fetchData, getToken]);

  const getLoadReference = React.useCallback((load: any) => {
    const value = String(load?.trackingNumber || load?.loadNumber || "").trim();
    if (value) return value;

    const id = String(load?._id || "").trim();
    return id ? `Load ${id.slice(-8)}` : "Load reference unavailable";
  }, []);

  const activeLoads = loads.filter((l) =>
    ["Assigned", "Accepted", "Picked Up", "In-Transit"].includes(l.status),
  );
  const completedCount = loads.filter((l) => l.status === "Delivered").length;
  const activeLoadIdsKey = activeLoads.map((load) => String(load._id)).join("|");
  const currentLoad =
    activeLoads.find((load) => String(load._id) === selectedActiveLoadId) ??
    activeLoads[0];
  const otherActiveLoads = activeLoads.filter(
    (load) => String(load._id) !== String(currentLoad?._id ?? ""),
  );
  const selectedActiveLoadPosition = currentLoad
    ? activeLoads.findIndex((load) => String(load._id) === String(currentLoad._id)) + 1
    : 0;
  const hasActiveLoad = activeLoads.length > 0;
  const displayedActiveLoadCount = hasFreshLoads
    ? activeLoads.length
    : (kpiSnapshot?.activeLoads ?? activeLoads.length);
  const displayedCompletedCount =
    dashStats?.completedLoads ?? kpiSnapshot?.completedLoads ?? completedCount;
  const displayedEarnings =
    dashStats?.totalEarnings ?? kpiSnapshot?.totalEarnings ?? 0;
  const profileScore =
    dashStats?.profileCompletionScore ??
    kpiSnapshot?.profileCompletionScore ??
    0;

  // Keep the selected load stable while realtime updates arrive. If the
  // selected load is delivered/removed/reassigned, fall back to the first
  // remaining active load instead of leaving the action panel stale.
  React.useEffect(() => {
    if (activeLoads.length === 0) {
      if (selectedActiveLoadId !== null) setSelectedActiveLoadId(null);
      return;
    }

    const selectionStillActive = activeLoads.some(
      (load) => String(load._id) === selectedActiveLoadId,
    );

    if (!selectionStillActive) {
      setSelectedActiveLoadId(String(activeLoads[0]._id));
    }
  }, [activeLoadIdsKey, selectedActiveLoadId]);

  React.useEffect(() => {
    if (!mapboxToken || !mapContainerRef.current || mapRef.current) return;

    let cancelled = false;

    const initMap = async () => {
      try {
        const mapboxgl = (await import("mapbox-gl")).default;
        if (cancelled || !mapContainerRef.current) return;

        if (!mapboxToken.startsWith("pk.")) {
          setMapNotice("Invalid Mapbox token");
          return;
        }

        if (!mapboxgl.supported()) {
          setMapNotice("WebGL required — enable hardware acceleration");
          return;
        }

        mapboxgl.accessToken = mapboxToken;
        setMapNotice("Loading map tiles...");

        mapThemeRef.current = theme;
        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: MAP_STYLE_BY_THEME[theme],
          center: MAP_CENTER,
          zoom: 4,
          attributionControl: false,
        });

        mapRef.current = map;


        const loadTimeout = window.setTimeout(() => {
          if (!map.isStyleLoaded()) {
            setMapNotice("Map style not loaded. Check network.");
          }
        }, 8000);

        const resizeTimeout = window.setTimeout(() => map.resize(), 500);

        map.on("load", () => {
          window.clearTimeout(loadTimeout);
          map.resize();
          setMapReady(true);
          setMapNotice(null);
        });

        map.on("idle", () => setMapNotice(null));

        map.on("error", (e: any) => {
          const status = e?.error?.status;
          const message = e?.error?.message || "Map failed to load";
          setMapNotice(status ? `${message} (HTTP ${status})` : message);
          setMapError(message);
        });

        map.once("remove", () => {
          window.clearTimeout(loadTimeout);
          window.clearTimeout(resizeTimeout);
        });
      } catch {
        setMapNotice("Failed to initialize map");
        setMapError("Failed to initialize map");
      }
    };

    initMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [mapboxToken]);

  // Keep Mapbox synchronized with the responsive dashboard card height.
  // The map and Driver Status cards share the same desktop grid row, and the
  // status card can grow when GPS requirements or status requests appear.
  // ResizeObserver lets the Mapbox canvas follow those CSS height changes
  // without changing any location/GPS behavior.
  React.useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;

    let frame: number | null = null;
    const observer = new ResizeObserver(() => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        mapRef.current?.resize();
        frame = null;
      });
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [mapReady]);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || mapThemeRef.current === theme) return;
    mapThemeRef.current = theme;
    setMapNotice("Applying theme...");
    map.setStyle(MAP_STYLE_BY_THEME[theme]);
    const handleIdle = () => setMapNotice(null);
    map.once("idle", handleIdle);
  }, [theme]);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !lastCoords) return;

    const updateMarker = async () => {
      const mapboxgl = (await import("mapbox-gl")).default;

      if (!markerRef.current) {
        const el = document.createElement("div");
        el.innerHTML = `<div style="width:22px;height:22px;border-radius:50%;background:#10b981;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.3);position:relative"><div style="position:absolute;inset:-4px;border-radius:50%;border:2px solid #10b981;opacity:0.4;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite"></div></div>`;
        markerRef.current = new mapboxgl.Marker({ element: el })
          .setLngLat([lastCoords.lng, lastCoords.lat])
          .addTo(map);
        map.flyTo({
          center: [lastCoords.lng, lastCoords.lat],
          zoom: 14,
          essential: true,
        });
      } else {
        markerRef.current.setLngLat([lastCoords.lng, lastCoords.lat]);
      }
    };

    updateMarker();
  }, [lastCoords, mapReady]);


  const centerOnMe = () => {
    const map = mapRef.current;
    if (!map) return;
    if (lastCoords) {
      map.flyTo({ center: [lastCoords.lng, lastCoords.lat], zoom: 14, essential: true });
      return;
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          map.flyTo({
            center: [pos.coords.longitude, pos.coords.latitude],
            zoom: 14,
            essential: true,
          });
        },
        () => { },
        { enableHighAccuracy: true, timeout: 5000 },
      );
    }
  };

  const acceptLoad = React.useCallback(
    async (load: any, signatureDataUrl: string, signerName: string) => {
      if (!workEligibility.canTakeNewWork) {
        toast.error(workEligibility.blockReason || "You are not eligible to accept a new load right now.");
        return;
      }
      setAccepting(load._id);
      try {
        const token = await getToken();
        await apiClient.post(
          `/api/driver-tracking/loads/${encodeURIComponent(load._id)}/accept`,
          {
            agreedToTerms: true,
            signatureDataUrl,
            signerName,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        toast.success("Load accepted");
        setAcceptDialogLoad(null);
        await fetchData();
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to accept load");
      } finally {
        setAccepting(null);
      }
    },
    [getToken, fetchData, workEligibility.canTakeNewWork, workEligibility.blockReason],
  );

  const dropLoad = React.useCallback(
    async (load: any) => {
      setDropping(load._id);
      try {
        const token = await getToken();
        await apiClient.post(
          `/api/driver-tracking/loads/${encodeURIComponent(load._id)}/drop`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        );
        toast.success("Load released and returned to Available Loads");

        // The load has already been released successfully, so clear the
        // confirmation state immediately instead of leaving the destructive
        // modal mounted while the refreshed load data removes the card.
        setConfirmState({
          isOpen: false,
          action: "",
          title: "",
          description: "",
          variant: "primary",
          load: null,
        });

        await fetchData();
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to release load");
      } finally {
        setDropping(null);
      }
    },
    [getToken, fetchData],
  );

  const markPickedUp = React.useCallback(
    async (load: any) => {
      setPickingUp(load._id);
      try {
        const token = await getToken();
        await apiClient.post(
          `/api/driver-tracking/loads/${encodeURIComponent(load._id)}/pickup`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        );
        toast.success("Pickup recorded");
        await fetchData();
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to mark load as picked up");
      } finally {
        setPickingUp(null);
      }
    },
    [getToken, fetchData],
  );

  const startRoute = React.useCallback(
    async (load: any) => {
      setStartingRoute(load._id);
      try {
        const token = await getToken();
        await apiClient.post(
          `/api/driver-tracking/loads/${encodeURIComponent(load._id)}/start-route`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        );
        toast.success("Route started");
        fetchData();
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to start route");
      } finally {
        setStartingRoute(null);
      }
    },
    [getToken, fetchData],
  );

  const handleAction = (action: string, load: any) => {
    let title = '';
    let description = '';
    let variant: ConfirmationVariant = 'primary';

    switch (action) {
      case 'mark-picked-up':
        title = 'Confirm Pickup?';
        description = 'Confirm that all vehicles on this load have been picked up. The pickup time will be recorded and Dispatch will be notified.';
        variant = 'success';
        break;
      case 'start-route':
        title = 'Start Route?';
        description = 'Are you ready to begin the delivery route? This will notify the organization that you are in transit.';
        variant = 'success';
        break;
      case 'drop-load':
        title = 'Release This Load?';
        description = 'You will no longer be responsible for this load. It will return to the Transportation Available Loads pool so Dispatch can assign it to another driver. This does not mark the delivery as completed.';
        variant = 'danger';
        break;
      default:
        return;
    }

    setConfirmState({
      isOpen: true,
      action,
      title,
      description,
      variant,
      load,
    });
  };

  const executeConfirmedAction = () => {
    const { action, load } = confirmState;
    if (action === 'mark-picked-up') markPickedUp(load);
    if (action === 'start-route') startRoute(load);
    if (action === 'drop-load') dropLoad(load);
  };

  const performOpStatusUpdate = React.useCallback(
    async (
      newStatus: "active" | "on_leave" | "maintenance",
      preferredLiveStatus: DriverStatus | null = null,
    ) => {
      const previousStatus = opStatus as
        | "active"
        | "on_leave"
        | "maintenance";

      // Optimistic UI: Dispatch and its derived Live Status presentation move
      // together immediately. The backend remains authoritative and a failed
      // PATCH rolls the Dispatch selection back.
      setOpStatus(newStatus);
      setSavingOpStatus(true);

      if (newStatus !== "active") {
        queuedLiveStatusRef.current = null;
        setQueuedLiveStatus(null);
      }

      try {
        const token = await getToken();
        await apiClient.patch(
          "/api/driver-profile/logistics",
          { operationalStatus: newStatus },
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (newStatus === "active") {
          // Resolve the live status exactly once after Active becomes
          // authoritative. Priority:
          // 1) a live button clicked while the PATCH was in flight,
          // 2) an explicit target from the "Return to Active" confirmation,
          // 3) the driver's last confirmed Active live status.
          const queued = queuedLiveStatusRef.current;
          const nextLiveStatus =
            queued ??
            preferredLiveStatus ??
            lastActiveLiveStatusRef.current;

          queuedLiveStatusRef.current = null;
          setQueuedLiveStatus(null);

          if (nextLiveStatus && nextLiveStatus !== "offline") {
            lastActiveLiveStatusRef.current = nextLiveStatus;
            setLastActiveLiveStatus(nextLiveStatus);
            updateStatus(nextLiveStatus);

            // Only announce an explicit live-status choice. Automatic
            // restoration of the previous Active status stays silent so one
            // Dispatch click does not create two success toasts.
            if (queued || preferredLiveStatus) {
              toast.success(
                `Status: ${
                  STATUS_CONFIG.find(
                    (item) => item.key === nextLiveStatus,
                  )?.label || nextLiveStatus
                }`,
              );
            }
          }
        }

        toast.success(
          `Work Availability: ${
            newStatus === "maintenance"
              ? "In Shop"
              : newStatus.replace("_", " ")
          }`,
        );

        // Reconciliation stays in the background. Socket events plus these
        // refreshes confirm the optimistic state without making the controls
        // wait or visually jump through intermediate values.
        void Promise.all([fetchData(), workEligibility.refresh()]).catch(() => {
          // The PATCH already succeeded. A background refresh failure should
          // not roll back a confirmed Dispatch Status.
        });

        return true;
      } catch (err: any) {
        setOpStatus(previousStatus);
        queuedLiveStatusRef.current = null;
        setQueuedLiveStatus(null);
        toast.error(
          err?.response?.data?.message || "Failed to update Work Availability",
        );
        return false;
      } finally {
        setSavingOpStatus(false);
      }
    },
    [
      fetchData,
      getToken,
      opStatus,
      updateStatus,
      workEligibility.refresh,
    ],
  );

  const handleOperationalStatusClick = React.useCallback(
    async (newStatus: "active" | "on_leave" | "maintenance") => {
      if (newStatus === opStatus) return;

      if (newStatus === "active") {
        await performOpStatusUpdate("active");
        return;
      }

      if (workEligibility.statusRequest) {
        toast.error("You already have an active Work Availability request.");
        return;
      }

      if (hasActiveLoad && opStatus === "active") {
        setStatusRequestDialog({
          open: true,
          requestedStatus: newStatus,
          priority: "standard",
        });
        return;
      }

      await performOpStatusUpdate(newStatus);
    },
    [hasActiveLoad, opStatus, performOpStatusUpdate, workEligibility.statusRequest],
  );

  const handleLiveStatusChoice = React.useCallback(
    (nextStatus: DriverStatus) => {
      if (workEligibility.emergencyReleaseActive) {
        toast.error(
          "Emergency Release is active. Dispatch is handling your current loads.",
        );
        return;
      }

      if (nextStatus === "on-route" && !hasActiveLoad) {
        toast.error("You need an active load to go On Route.");
        return;
      }

      if (opStatus === "on_leave") {
        toast.error(
          "Current Activity controls are unavailable while you are On Leave.",
        );
        return;
      }

      if (opStatus === "maintenance") {
        if (nextStatus === "waiting") {
          updateStatus("waiting");
          return;
        }
        setReturnToActiveLiveStatus(nextStatus);
        return;
      }

      // If the UI has already switched optimistically to Active but the PATCH
      // is still in flight, accept the click immediately and queue the server
      // live-status update. displayedLiveStatus reads this queue, so the button
      // highlights now while the heartbeat waits for Active to be authoritative.
      if (savingOpStatus) {
        queuedLiveStatusRef.current = nextStatus;
        setQueuedLiveStatus(nextStatus);
        return;
      }

      queuedLiveStatusRef.current = null;
      setQueuedLiveStatus(null);
      lastActiveLiveStatusRef.current = nextStatus;
      setLastActiveLiveStatus(nextStatus);
      updateStatus(nextStatus);
      toast.success(
        `Status: ${
          STATUS_CONFIG.find((item) => item.key === nextStatus)?.label ||
          nextStatus
        }`,
      );
    },
    [
      hasActiveLoad,
      opStatus,
      savingOpStatus,
      updateStatus,
      workEligibility.emergencyReleaseActive,
    ],
  );

  const saveLogistics = React.useCallback(async () => {
    const saveVersions = { ...logisticsVersionRef.current };
    setSavingLogistics(true);
    try {
      const token = await getToken();
      await apiClient.patch(
        "/api/driver-profile/logistics",
        {
          homeBase: { city: logCity.trim(), state: logState },
          serviceRadius: logRadius,
          preferredRoutes: logRoutes,
          availableDays: logDays,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // Mark only the exact draft that was submitted as saved. If the driver
      // changed a Logistics field while the request was in flight, keep that
      // newer edit dirty so it cannot be overwritten by a background refresh.
      (["homeBase", "radius", "routes", "days"] as LogisticsDraftKey[]).forEach(
        (key) => {
          if (logisticsVersionRef.current[key] === saveVersions[key]) {
            logisticsDirtyRef.current[key] = false;
            // Invalidate any profile GET that started before this PATCH
            // completed, so a stale response cannot restore pre-save values.
            logisticsVersionRef.current[key] += 1;
          }
        },
      );

      toast.success("Logistics saved");
    } catch {
      toast.error("Failed to save logistics");
    } finally {
      setSavingLogistics(false);
    }
  }, [getToken, logCity, logState, logRadius, logRoutes, logDays]);

  const toggleDay = (d: string) => {
    markLogisticsDirty("days");
    setLogDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  };

  const cancelPendingStatusRequest = React.useCallback(async () => {
    const requestId = workEligibility.statusRequest?.id || workEligibility.statusRequest?._id;
    if (!requestId) return;
    try {
      const token = await getToken();
      await apiClient.post(
        `/api/driver-profile/status-requests/${requestId}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success("Work Availability request cancelled");
      await Promise.all([fetchData(), workEligibility.refresh()]);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to cancel the Work Availability request");
    }
  }, [fetchData, getToken, workEligibility]);

  const kpis = [
    {
      label: "Active Loads",
      value: displayedActiveLoadCount,
      icon: <Truck className="size-6" />,
      sub:
        displayedActiveLoadCount === 1
          ? "load in transit"
          : "loads in transit",
      href: "/driver/loads",
      gradient: "from-emerald-500 to-cyan-500",
      glow: "bg-emerald-500/20",
      ring: "ring-emerald-500/20",
    },
    {
      label: "Completed",
      value: displayedCompletedCount,
      icon: <CheckCircle2 className="size-6" />,
      sub: "deliveries made",
      href: "/driver/loads?tab=completed",
      gradient: "from-teal-500 to-emerald-500",
      glow: "bg-teal-500/20",
      ring: "ring-teal-500/20",
    },
    {
      label: "Earnings",
      value: `$${displayedEarnings.toLocaleString()}`,
      icon: <DollarSign className="size-6" />,
      sub: "total revenue",
      href: "/driver/earnings",
      gradient: "from-amber-500 to-emerald-500",
      glow: "bg-amber-500/20",
      ring: "ring-amber-500/20",
    },
    {
      label: "Profile",
      value: `${profileScore}%`,
      icon: <Shield className="size-6" />,
      sub: profileScore >= 80 ? "excellent standing" : profileScore >= 50 ? "needs attention" : "critical",
      href: "/driver/profile",
      gradient: "from-violet-500 to-emerald-500",
      glow: "bg-violet-500/20",
      ring: "ring-violet-500/20",
    },
  ];

  const router = useRouter();

  const { mst, utc } = formatDualTime(currentTime);
  const displayedDispatchLabel =
    OP_STATUS_CONFIG.find((item) => item.key === opStatus)?.label ?? "Active";

  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-6 container mx-auto min-h-screen">

      {/* ── HEADER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 animate-fade-in-up">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs font-bold tracking-widest uppercase px-2.5 py-1">
              Driver Portal
            </Badge>
            <div className="size-1 rounded-full bg-border" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex flex-wrap items-center gap-2">
              <Clock className="size-3" />
              {currentTime.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "America/Denver" })}
              <span className="text-primary/60 font-black tabular-nums">
                {mst} MST
              </span>
              <span className="text-muted-foreground/40 tabular-nums">
                ({utc} UTC)
              </span>
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight">Command Center</h1>
        </div>
        <div className="flex items-center gap-2">
          {(isSharing || isStarting) && (
            <Badge
              className={cn(
                "text-xs font-bold gap-1.5 px-2.5 py-1",
                isSharing
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-200/50 animate-pulse"
                  : "bg-amber-500/10 text-amber-600 border-amber-200/50",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  isSharing ? "bg-emerald-500" : "bg-amber-500 animate-pulse",
                )}
              />
              {isSharing ? "GPS LIVE" : "GPS CONNECTING"}
            </Badge>
          )}
          <Badge variant="outline" className={cn(
            "text-xs font-bold px-2.5 py-1",
            opStatus === "active" ? "bg-emerald-500/10 text-emerald-500 border-emerald-200 dark:border-emerald-800" :
              opStatus === "on_leave" ? "bg-amber-500/10 text-amber-500 border-amber-200 dark:border-amber-800" :
                opStatus === "maintenance" ? "bg-blue-500/10 text-blue-500 border-blue-200 dark:border-blue-800" :
                  "bg-red-500/10 text-red-500 border-red-200 dark:border-red-800",
          )}>
            {`AVAILABILITY: ${displayedDispatchLabel.toUpperCase()}`}
          </Badge>
        </div>
      </div>

      {/* ── ALERTS ── */}
      {dashStats?.isComplianceExpired && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3">
          <AlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-base font-semibold text-red-700 dark:text-red-400">Compliance Expired</p>
            <p className="text-sm leading-relaxed text-red-600 dark:text-red-500">
              Update documents in your <Link href="/driver/documents" className="underline font-bold">Documents page</Link> to keep accepting loads.
            </p>
          </div>
        </div>
      )}

      {dashStats && dashStats.pendingRequests > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-4 py-2.5">
          <Timer className="size-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
            <span className="font-bold">{dashStats.pendingRequests}</span> pending request{dashStats.pendingRequests > 1 ? "s" : ""} awaiting approval
          </p>
          <Link href="/driver/loads" className="ml-auto text-sm font-semibold text-amber-700 dark:text-amber-400 hover:underline shrink-0">View &rarr;</Link>
        </div>
      )}



      {/* ── KPI CARDS (clickable) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-fade-in-up stagger-1">
        {kpis.map((kpi) => (
          <Card
            key={kpi.label}
            className="p-0 border-border/75 dark:border-white/10 shadow-sm hover:shadow-xl transition-all duration-300 group relative overflow-hidden bg-card cursor-pointer hover:-translate-y-0.5 ring-1 ring-border/10"
            onClick={() => router.push(kpi.href)}
          >
            <div
              className={cn(
                "pointer-events-none absolute -right-8 -top-10 size-32 rounded-full blur-3xl opacity-60 transition-opacity duration-300 group-hover:opacity-90",
                kpi.glow,
              )}
            />
            <CardContent className="relative p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {kpi.label}
                  </p>
                  <h3 className="text-3xl font-black tracking-tighter text-foreground tabular-nums">
                    {kpi.value}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-muted-foreground/85">
                    {kpi.sub}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <div
                    className={cn(
                      "flex size-12 items-center justify-center rounded-2xl bg-linear-to-br text-white shadow-lg ring-4 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-2",
                      kpi.gradient,
                      kpi.ring,
                    )}
                  >
                    {kpi.icon}
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground/40 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── DRIVER MAP ── */}
      <div className="animate-fade-in-up stagger-2">
        <Card className="w-full border-border/70 shadow-sm overflow-hidden bg-card p-0 gap-0">
          <CardContent className="p-0">
            <div className="relative h-[clamp(300px,38vh,360px)] sm:h-[clamp(340px,42vh,430px)] lg:h-[clamp(360px,45vh,500px)] overflow-hidden" style={{ background: "#e5e7eb" }}>
              {mapboxToken ? (
                <>
                  <div
                    ref={mapContainerRef}
                    className="h-full w-full"
                    style={{ width: "100%", height: "100%" }}
                  />
                  {mapNotice && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="rounded-xl bg-background/80 backdrop-blur-sm border border-border/50 px-6 py-3 shadow-lg text-center">
                        <Loader2 className="size-5 animate-spin text-primary mx-auto mb-2" />
                        <p className="text-sm font-medium text-muted-foreground">{mapNotice}</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="size-16 rounded-2xl bg-muted/60 flex items-center justify-center">
                    <Satellite className="size-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-base text-muted-foreground font-medium">Map unavailable</p>
                </div>
              )}

              {/* One predictable, theme-aware map-control stack. Keeping zoom and
                  recenter in the same group prevents the custom location action from
                  overlapping or visually fighting with the map controls at any viewport. */}
              <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10">
                <TooltipProvider delayDuration={250}>
                  <div className="overflow-hidden rounded-md border border-border/70 bg-background/95 text-foreground shadow-lg backdrop-blur-md divide-y divide-border/60">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label="Zoom in"
                          className="size-9 sm:size-10 rounded-none border-0 bg-transparent text-foreground shadow-none hover:bg-muted/80 hover:text-foreground focus-visible:relative focus-visible:z-10"
                          onClick={() => mapRef.current?.zoomIn({ duration: 250 })}
                        >
                          <Plus className="size-4" strokeWidth={2.25} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-xs">Zoom in</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label="Zoom out"
                          className="size-9 sm:size-10 rounded-none border-0 bg-transparent text-foreground shadow-none hover:bg-muted/80 hover:text-foreground focus-visible:relative focus-visible:z-10"
                          onClick={() => mapRef.current?.zoomOut({ duration: 250 })}
                        >
                          <Minus className="size-4" strokeWidth={2.25} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-xs">Zoom out</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label="Recenter on my location"
                          className="size-9 sm:size-10 rounded-none border-0 bg-transparent text-foreground shadow-none hover:bg-muted/80 hover:text-primary focus-visible:relative focus-visible:z-10"
                          onClick={centerOnMe}
                        >
                          <LocateFixed className="size-4" strokeWidth={2.1} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-xs">Recenter on my location</TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </div>

              {isSharing && lastCoords && (
                <div className="absolute bottom-3 left-3 z-10 rounded-xl bg-background/90 backdrop-blur-sm border border-border/50 shadow-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="relative flex size-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
                    </span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Broadcasting Live</span>
                  </div>
                </div>
              )}

              {mapError && !mapNotice && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-muted/80 backdrop-blur-sm">
                  <div className="rounded-xl bg-background border border-border/50 px-5 py-3 shadow-lg text-center">
                    <Satellite className="size-6 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground font-medium">{mapError}</p>
                  </div>
                </div>
              )}

              <div className="absolute bottom-3 right-3 z-10 rounded-xl bg-background/90 backdrop-blur-sm border border-border/50 shadow-lg px-3 py-2.5">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Legend</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-primary" />
                    <span className="text-xs text-muted-foreground font-medium">Your Location</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-amber-500" />
                    <span className="text-xs text-muted-foreground font-medium">Pickup Point</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs text-muted-foreground font-medium">Delivery Point</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── DRIVER OPERATIONS + LOGISTICS ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 xl:gap-6 items-stretch animate-fade-in-up stagger-3">
        {/* Driver state and active work share one operational column. Together
            they stretch to the same height as the Logistics workspace. */}
        <div className="xl:col-span-5 min-w-0 xl:h-full grid grid-rows-[auto_minmax(0,1fr)] gap-5">
        <Card className="shrink-0 border-border/70 shadow-sm p-0 gap-0 overflow-hidden bg-card/80 backdrop-blur-sm">
          <CardHeader className="py-3.5 px-4 sm:px-5 border-b border-border/50">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg font-extrabold tracking-tight flex items-center gap-2">
                  <Zap className="size-4 text-emerald-500" />
                  Driver Status
                </CardTitle>
                <p className="text-sm leading-relaxed text-muted-foreground/90 mt-1">Availability, activity, and location in one place</p>
              </div>
              {savingOpStatus && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground shrink-0">
                  <Loader2 className="size-3.5 animate-spin" />
                  Syncing…
                </span>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-border/50 bg-muted/20 px-2.5 py-2.5 min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Availability</p>
                <p className="mt-1 break-words text-base font-extrabold leading-tight text-foreground [overflow-wrap:anywhere]">{displayedDispatchLabel}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/20 px-2.5 py-2.5 min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Activity</p>
                <p className="mt-1 break-words text-base font-extrabold leading-tight text-foreground [overflow-wrap:anywhere]">{LIVE_STATUS_LABEL[displayedLiveStatus]}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/20 px-2.5 py-2.5 min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Location</p>
                <p className={cn(
                  "mt-1 break-words text-base font-extrabold leading-tight [overflow-wrap:anywhere]",
                  isSharing ? "text-emerald-600 dark:text-emerald-400" : isStarting ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
                )}>
                  {isSharing ? "GPS Live" : isStarting ? "Connecting" : "GPS Off"}
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Work Availability</p>
                <span className="text-xs font-medium text-muted-foreground">Can I take work?</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {OP_STATUS_CONFIG.map((item) => (
                  <Button
                    key={item.key}
                    size="sm"
                    variant="outline"
                    disabled={savingOpStatus || (Boolean(workEligibility.statusRequest) && item.key !== "active")}
                    className={cn(
                      "h-10 px-2.5 text-sm font-semibold gap-1.5 transition-all duration-200",
                      opStatus === item.key ? item.activeColor : "border-border/50 text-muted-foreground",
                    )}
                    onClick={() => void handleOperationalStatusClick(item.key as "active" | "on_leave" | "maintenance")}
                  >
                    {item.icon} <span className="truncate">{item.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {workEligibility.statusRequest && (
              <div
                className={cn(
                  "rounded-xl border p-3 space-y-3",
                  workEligibility.statusRequest.priority === "emergency"
                    ? "border-red-500/25 bg-red-500/5"
                    : "border-amber-500/25 bg-amber-500/5",
                )}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    className={cn(
                      "size-4 shrink-0 mt-0.5",
                      workEligibility.statusRequest.priority === "emergency"
                        ? "text-red-500"
                        : "text-amber-500",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black">
                      {workEligibility.statusRequest.priority === "emergency"
                        ? "Emergency Request Active"
                        : workEligibility.statusRequest.status === "approved_awaiting_reassignment"
                          ? "Approved — Awaiting Reassignment"
                          : "Work Availability Request Pending"}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground/90">
                      Requested: {workEligibility.statusRequest.requestedStatus === "maintenance" ? "In Shop" : "On Leave"}.
                      {workEligibility.statusRequest.priority === "emergency"
                        ? " Dispatch is handling your active loads."
                        : workEligibility.statusRequest.status === "approved_awaiting_reassignment"
                          ? " The change applies after active loads are cleared."
                          : " You remain Active while Dispatch reviews it."}
                    </p>
                  </div>
                </div>

                {workEligibility.statusRequest.priority === "emergency" && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-10 text-sm font-semibold"
                      onClick={() => setEmergencyChatOpen(true)}
                    >
                      <MessageSquare className="size-3.5 mr-1.5" />
                      Message
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-10 text-sm font-semibold"
                      onClick={() => setStatusRequestDialog({
                        open: true,
                        requestedStatus: workEligibility.statusRequest!.requestedStatus,
                        priority: "emergency",
                        updateExisting: true,
                      })}
                    >
                      Add Details
                    </Button>
                  </div>
                )}

                {workEligibility.statusRequest.priority === "standard" &&
                  workEligibility.statusRequest.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-10 w-full text-sm font-semibold"
                      onClick={() => void cancelPendingStatusRequest()}
                    >
                      Cancel Request
                    </Button>
                  )}
              </div>
            )}

            {opStatus === "active" && hasActiveLoad && !workEligibility.statusRequest && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full h-9 border-red-500/30 text-red-600 hover:bg-red-500/10 dark:text-red-400"
                onClick={() => setStatusRequestDialog({
                  open: true,
                  requestedStatus: "maintenance",
                  priority: "emergency",
                })}
              >
                <AlertTriangle className="size-3.5 mr-2" />
                Emergency / Unable to Continue
              </Button>
            )}

            <div className="border-t border-border/50 pt-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Current Activity</p>
                <span className="text-xs font-medium text-muted-foreground">What am I doing?</span>
              </div>
              <TooltipProvider>
                <div className="grid grid-cols-2 gap-1.5">
                  {STATUS_CONFIG.map((item) => {
                    const locked =
                      opStatus === "on_leave" ||
                      workEligibility.emergencyReleaseActive ||
                      Boolean(item.needsLoad && !hasActiveLoad);
                    const isActive = displayedLiveStatus === item.key;
                    const btn = (
                      <Button
                        key={item.key}
                        size="sm"
                        variant="outline"
                        disabled={locked}
                        className={cn(
                          "h-10 px-2.5 text-sm font-semibold gap-1.5 transition-all duration-200",
                          isActive ? item.activeColor : "border-border/50 text-muted-foreground",
                          locked && "opacity-40",
                        )}
                        onClick={() => {
                          if (!locked) handleLiveStatusChoice(item.key);
                        }}
                      >
                        {item.icon} <span className="truncate">{item.label}</span>
                      </Button>
                    );
                    return locked ? (
                      <Tooltip key={item.key}>
                        <TooltipTrigger asChild>{btn}</TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          {opStatus === "on_leave"
                            ? "Unavailable while On Leave"
                            : workEligibility.emergencyReleaseActive
                              ? "Emergency Release is active"
                              : "Need an active load"}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <React.Fragment key={item.key}>{btn}</React.Fragment>
                    );
                  })}
                </div>
              </TooltipProvider>
            </div>

            <div className="border-t border-border/50 pt-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Location Sharing</p>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  {isSharing ? (
                    <><Wifi className="size-3.5 text-emerald-500" /><span className="text-emerald-600 dark:text-emerald-400">GPS Live</span></>
                  ) : isStarting ? (
                    <><Loader2 className="size-3.5 animate-spin text-amber-500" /><span className="text-amber-600 dark:text-amber-400">Connecting</span></>
                  ) : (
                    <><WifiOff className="size-3.5 text-muted-foreground" /><span className="text-muted-foreground">GPS Off</span></>
                  )}
                </div>
              </div>

              {isLocationRequired ? (
                <div
                  className={cn(
                    "w-full rounded-lg border px-3 py-2.5",
                    isSharing
                      ? "border-emerald-500/20 bg-emerald-500/5"
                      : isStarting
                        ? "border-amber-500/20 bg-amber-500/5"
                        : "border-destructive/20 bg-destructive/5",
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <Navigation2
                      className={cn(
                        "size-4 mt-0.5 shrink-0",
                        isSharing
                          ? "text-emerald-500"
                          : isStarting
                            ? "text-amber-500 animate-pulse"
                            : "text-destructive",
                      )}
                    />
                    <div className="min-w-0">
                      <p className="break-words text-sm font-bold [overflow-wrap:anywhere]">
                        {locationRequirementReason === "dispatch_retained_load"
                          ? "GPS Required by Dispatch"
                          : "GPS Required While Loads Are Active"}
                      </p>
                      <p className="mt-1 break-words text-sm leading-relaxed text-muted-foreground/90 [overflow-wrap:anywhere]">
                        {locationRequirementReason === "dispatch_retained_load"
                          ? isSharing
                            ? "Dispatch requires GPS while retained active loads remain assigned."
                            : isStarting
                              ? "Connecting GPS for your retained load…"
                              : "Location permission is required for your retained load."
                          : isSharing
                            ? "Location sharing stays automatic until you have no active loads."
                            : isStarting
                              ? "Connecting automatically because you have an active load…"
                              : "Location permission is required while you have an active load."}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm leading-relaxed text-muted-foreground/90">
                    {workEligibility.emergencyReleaseActive
                      ? "Emergency Release is active. GPS can continue when location is available."
                      : opStatus === "on_leave"
                        ? "GPS is optional while your Work Availability is On Leave."
                        : opStatus === "maintenance"
                          ? "GPS is optional while your Work Availability is In Shop."
                          : "No active loads. Location sharing is optional."}
                  </p>
                  <Button
                    size="sm"
                    className={cn(
                      "w-full h-10 text-sm font-bold transition-all duration-300",
                      isSharing || isStarting
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800 hover:bg-rose-500/20 shadow-none"
                        : "bg-primary text-primary-foreground shadow-sm hover:shadow-md",
                    )}
                    variant={isSharing || isStarting ? "outline" : "default"}
                    disabled={savingOpStatus || workEligibility.emergencyReleaseActive}
                    onClick={() => {
                      if (savingOpStatus || workEligibility.emergencyReleaseActive) return;
                      if (isSharing || isStarting) {
                        void stopSharing();
                      } else {
                        startSharing();
                      }
                    }}
                  >
                    <Navigation2
                      className={cn(
                        "size-3.5 mr-2",
                        (isSharing || isStarting) && "animate-pulse",
                      )}
                    />
                    {isSharing
                      ? "Stop Sharing Location"
                      : isStarting
                        ? "Stop Connecting"
                        : "Share Location"}
                  </Button>
                </div>
              )}

              {(lastShareAt || locationError) && (
                <div className="space-y-2">
                  {lastShareAt && (
                    <p className="text-xs text-muted-foreground/80 text-center font-medium">Last update: {lastShareAt}</p>
                  )}
                  {locationError && (
                    <div className="rounded-lg bg-destructive/5 border border-destructive/10 px-3 py-2">
                      <p className="text-sm leading-relaxed text-destructive font-medium">
                        {workEligibility.emergencyReleaseActive
                          ? "Location is unavailable, but your emergency request is already active."
                          : locationError}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

          <Card className="min-h-0 flex flex-col border-border/70 shadow-sm p-0 gap-0 overflow-hidden bg-card/80 backdrop-blur-sm">
            <CardHeader className="shrink-0 py-3.5 px-5 border-b border-border/50">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-lg font-extrabold tracking-tight flex items-center gap-2">
                  <Package className="size-4 text-primary" />
                  Current Load
                </CardTitle>
                <div className="flex items-center gap-2">
                  {activeLoads.length > 0 && (
                    <Badge variant="secondary" className="text-xs font-bold">
                      {activeLoads.length} active
                    </Badge>
                  )}
                  {currentLoad && activeLoads.length > 1 && (
                    <Badge
                      variant="outline"
                      className="text-xs font-bold border-primary/30 bg-primary/5 text-primary"
                    >
                      Managing {selectedActiveLoadPosition} of {activeLoads.length}
                    </Badge>
                  )}
                  {currentLoad && (
                    <Badge variant="outline" className={cn("text-xs font-bold px-2.5 py-1", LOAD_STATUS_COLORS[currentLoad.status] || "")}>
                      {currentLoad.status}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 flex-1 min-h-0 overflow-hidden">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : currentLoad ? (
                <div className="flex h-full min-h-0 flex-col gap-4">
                  {/* Primary / selected load remains visible while additional active loads scroll below it. */}
                  <div className="shrink-0 space-y-3">
                    {activeLoads.length > 1 && (
                      <div
                        aria-live="polite"
                        className="flex flex-col gap-1 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-primary">
                          <CheckCircle2 className="size-3.5" />
                          Currently Managing
                        </span>
                        <span className="break-words font-mono text-sm font-bold text-foreground [overflow-wrap:anywhere]">
                          {getLoadReference(currentLoad)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          Tracking / Load #
                        </p>
                        <p className="mt-1 min-w-0 break-words text-base font-mono font-bold [overflow-wrap:anywhere]">
                          {getLoadReference(currentLoad)}
                        </p>
                      </div>
                      <span className="shrink-0 pt-4 text-base font-black text-emerald-600 dark:text-emerald-400">
                        ${(currentLoad.pricing?.carrierPayAmount || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm sm:text-base text-muted-foreground">
                      <MapPin className="size-3.5 text-primary shrink-0" />
                      <span className="min-w-0 break-words [overflow-wrap:anywhere]">{currentLoad.origin}</span>
                      <ArrowRight className="size-3 shrink-0 text-primary" />
                      <span className="min-w-0 break-words [overflow-wrap:anywhere]">{currentLoad.destination}</span>
                    </div>

                    <p className="text-sm text-muted-foreground/80 font-medium flex items-center gap-1">
                      <Clock className="size-3" />
                      Pickup: {new Date(currentLoad.dates?.pickupDeadline || currentLoad.requestedPickupDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Denver" })}
                    </p>

                    {currentLoad.status === "Assigned" && (
                      <Button
                        size="sm"
                        className="w-full h-10 text-sm font-bold shadow-sm"
                        disabled={accepting === currentLoad._id || !workEligibility.canTakeNewWork}
                        onClick={() => {
                          if (!workEligibility.canTakeNewWork) {
                            toast.error(workEligibility.blockReason || "You are not eligible to accept this load right now.");
                            return;
                          }
                          setAcceptDialogLoad(currentLoad);
                        }}
                      >
                        {accepting === currentLoad._id ? (
                          <><Loader2 className="size-3.5 mr-2 animate-spin" />Accepting...</>
                        ) : (
                          <><CheckCircle2 className="size-3.5 mr-2" />Accept Load</>
                        )}
                      </Button>
                    )}

                    {currentLoad.status === "Accepted" && (
                      <Button
                        size="sm"
                        className="w-full h-10 text-sm font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
                        disabled={pickingUp === currentLoad._id}
                        onClick={() => handleAction("mark-picked-up", currentLoad)}
                      >
                        {pickingUp === currentLoad._id ? (
                          <><Loader2 className="size-3.5 mr-2 animate-spin" />Recording Pickup...</>
                        ) : (
                          <><Package className="size-3.5 mr-2" />Mark Picked Up</>
                        )}
                      </Button>
                    )}

                    {currentLoad.status === "Picked Up" && (
                      <Button
                        size="sm"
                        className="w-full h-10 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                        disabled={startingRoute === currentLoad._id}
                        onClick={() => handleAction("start-route", currentLoad)}
                      >
                        {startingRoute === currentLoad._id ? (
                          <><Loader2 className="size-3.5 mr-2 animate-spin" />Starting...</>
                        ) : (
                          <><Navigation2 className="size-3.5 mr-2" />Start Route</>
                        )}
                      </Button>
                    )}

                    {currentLoad.status === "In-Transit" && (
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2 py-1">
                          <span className="relative flex size-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
                          </span>
                          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">
                            In Transit
                          </span>
                        </div>
                        <Button
                          size="sm"
                          className="w-full h-10 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                          onClick={() => setDeliveryDialogLoad(currentLoad)}
                        >
                          <Camera className="size-3.5 mr-2" />
                          Complete Delivery
                        </Button>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          A proof-of-delivery photo is required before this load can be marked Delivered.
                        </p>
                      </div>
                    )}

                    {["Assigned", "Accepted"].includes(currentLoad.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-10 text-sm font-semibold text-destructive border-destructive/20 hover:bg-destructive/10"
                        disabled={dropping === currentLoad._id}
                        onClick={() => handleAction("drop-load", currentLoad)}
                      >
                        {dropping === currentLoad._id ? (
                          <><Loader2 className="size-3.5 mr-2 animate-spin" />Releasing...</>
                        ) : (
                          <><XCircle className="size-3.5 mr-2" />Release Load</>
                        )}
                      </Button>
                    )}
                  </div>

                  {activeLoads.length > 1 && (
                    <div className="flex min-h-0 flex-1 flex-col gap-2.5 border-t border-border/50 pt-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
                          Other Active Loads ({activeLoads.length - 1})
                        </p>
                        <span className="text-xs font-medium text-primary/80">
                          Click a load to make it current
                        </span>
                      </div>

                      <div className="min-h-0 flex-1 max-h-[320px] xl:max-h-none overflow-y-auto overscroll-contain touch-pan-y pr-1 space-y-1 [scrollbar-gutter:stable]">
                        {otherActiveLoads.map((load) => (
                          <button
                            key={load._id}
                            type="button"
                            onClick={() => setSelectedActiveLoadId(String(load._id))}
                            aria-label={`Manage load ${getLoadReference(load)}`}
                            className="w-full flex items-center justify-between gap-3 rounded-lg px-2.5 py-2.5 text-left border border-transparent hover:border-primary/30 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors cursor-pointer"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                Tracking / Load #
                              </p>
                              <p className="mt-0.5 break-words text-sm font-mono font-bold [overflow-wrap:anywhere]">
                                {getLoadReference(load)}
                              </p>
                              <p className="mt-0.5 break-words text-sm leading-relaxed text-muted-foreground/85 [overflow-wrap:anywhere]">
                                {load.origin} &rarr; {load.destination}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <Badge
                                variant="outline"
                                className={cn("text-xs font-bold", LOAD_STATUS_COLORS[load.status] || "")}
                              >
                                {load.status}
                              </Badge>
                              <span className="hidden text-xs font-bold text-primary sm:inline">Manage</span>
                              <ArrowRight className="size-3.5 text-primary" />
                            </div>
                          </button>
                        ))}
                      </div>

                      <Link
                        href="/driver/loads"
                        className="shrink-0 flex items-center justify-center gap-1.5 pt-1 text-sm font-semibold text-primary hover:underline"
                      >
                        View all loads <ArrowRight className="size-3" />
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-7 gap-2.5 xl:h-full">
                  <div className="size-10 rounded-xl bg-muted/40 flex items-center justify-center">
                    <Package className="size-5 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">No active loads</p>
                  <Link href="/driver/available-loads" className="text-sm font-semibold text-primary hover:underline">
                    Browse Available &rarr;
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Logistics is one clearly bounded workspace: schedule + service area + preferred routes. */}
        <section className="xl:col-span-7 xl:h-full min-w-0 rounded-2xl border border-border/70 bg-card/45 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-border/60 bg-muted/15">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Truck className="size-4.5 text-emerald-500" />
                  <h2 className="text-lg font-extrabold tracking-tight">Logistics Preferences</h2>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground/90">
                  Your recurring work days, normal service area, and preferred routes used to improve load recommendations.
                </p>
              </div>
              <Button
                onClick={saveLogistics}
                disabled={savingLogistics}
                size="sm"
                className="hidden sm:inline-flex gap-2 shadow-sm hover:shadow-md transition-shadow sm:min-w-36 shrink-0"
              >
                {savingLogistics ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save Logistics
              </Button>
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-4">
            <Card className="border-border/65 shadow-none p-0 gap-0 overflow-hidden bg-card/70">
              <CardHeader className="py-3.5 px-4 sm:px-5 border-b border-border/50">
                <CardTitle className="text-base font-bold tracking-tight flex items-center gap-2">
                  <Calendar className="size-4 text-violet-500" />
                  Regular Work Days
                  <Badge variant="outline" className="ml-auto text-xs font-semibold">
                    Schedule
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <p className="break-words text-sm leading-relaxed text-muted-foreground/90 [overflow-wrap:anywhere]">
                  Your normal pickup schedule. Off-schedule loads are flagged for review, but existing assigned loads are not changed.
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {AVAILABLE_DAYS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDay(d.value)}
                      className={cn(
                        "px-2.5 py-2.5 rounded-lg text-sm font-semibold transition-all border",
                        logDays.includes(d.value)
                          ? "border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-400"
                          : "border-border/65 text-muted-foreground hover:border-border",
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/65 shadow-none p-0 gap-0 overflow-hidden bg-card/70">
              <CardHeader className="py-3.5 px-4 sm:px-5 border-b border-border/50">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base font-bold tracking-tight flex items-center gap-2">
                    <MapPin className="size-4 text-blue-500" />
                    Service Area
                    <Badge variant="outline" className="text-xs font-semibold">
                      Pickup Radius
                    </Badge>
                  </CardTitle>
                  <span className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 tabular-nums">
                    {logRadius} mi
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.8fr)] gap-4 items-end">
                  <div className="space-y-3 min-w-0">
                    <p className="text-sm leading-relaxed text-muted-foreground/90">
                      Your normal pickup radius from your home base. Dispatch uses this to prioritize better-fit loads without blocking assignments outside the area.
                    </p>
                    <Slider
                      value={[logRadius]}
                      onValueChange={([v]) => setLogRadiusDraft(v)}
                      min={25}
                      max={3000}
                      step={25}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground/85">
                      <span>25 mi</span>
                      <span>3,000 mi</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      value={logCity}
                      onChange={(e) => setLogCityDraft(e.target.value)}
                      placeholder="Home base city"
                      className="h-10 text-sm"
                    />
                    <Select value={logState || ""} onValueChange={setLogStateDraft}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="State" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map((s) => (
                          <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/65 shadow-none p-0 gap-0 overflow-hidden bg-card/70">
              <CardHeader className="py-3.5 px-4 sm:px-5 border-b border-border/50">
                <CardTitle className="text-base font-bold tracking-tight flex items-center gap-2">
                  <Route className="size-4 text-amber-500" />
                  Preferred Routes
                  <Badge variant="outline" className="text-xs font-semibold">
                    Recommendation
                  </Badge>
                  <span className="text-sm font-medium text-muted-foreground ml-auto">{logRoutes.length}/10</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <PreferredRoutesEditor
                  routes={logRoutes}
                  onChange={setLogRoutesDraft}
                  defaultFromState={logState}
                  defaultFromCity={logCity}
                />
              </CardContent>
            </Card>

            <div className="sm:hidden pt-1">
              <Button
                onClick={saveLogistics}
                disabled={savingLogistics}
                className="w-full gap-2 shadow-sm"
              >
                {savingLogistics ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save Logistics
              </Button>
            </div>
          </div>
        </section>
      </div>
      <DriverAcceptLoadDialog
        open={!!acceptDialogLoad}
        onOpenChange={(open) => {
          if (!open && !accepting) setAcceptDialogLoad(null);
        }}
        load={acceptDialogLoad}
        isSubmitting={!!accepting}
        onAccept={acceptLoad}
      />

      <DriverDeliveryProofDialog
        load={deliveryDialogLoad}
        loadReference={deliveryDialogLoad ? getLoadReference(deliveryDialogLoad) : ""}
        getToken={getToken}
        onClose={() => setDeliveryDialogLoad(null)}
        onDelivered={async () => {
          setDeliveryDialogLoad(null);
          toast.success("Load delivered successfully");
          await fetchData();
        }}
      />

      <DriverStatusChangeDialog
        open={statusRequestDialog.open}
        onOpenChange={(open) => setStatusRequestDialog((prev) => ({ ...prev, open }))}
        requestedStatus={statusRequestDialog.requestedStatus}
        priority={statusRequestDialog.priority}
        currentRequest={statusRequestDialog.updateExisting ? workEligibility.statusRequest : null}
        onSubmitted={async () => {
          await Promise.all([fetchData(), workEligibility.refresh()]);
        }}
      />

      <DispatchChatDialog
        open={emergencyChatOpen}
        onOpenChange={setEmergencyChatOpen}
        driverId={user?.id ?? null}
        participantName="Dispatch Team"
        onUnreadChange={ignoreEmergencyChatUnread}
      />

      <ConfirmationModal
        isOpen={returnToActiveLiveStatus !== null}
        onClose={() => setReturnToActiveLiveStatus(null)}
        onConfirm={async () => {
          const target = returnToActiveLiveStatus;
          if (!target) return;
          const changed = await performOpStatusUpdate("active", target);
          if (changed) {
            toast.success("Work Availability returned to Active");
            setReturnToActiveLiveStatus(null);
          }
        }}
        title="Return to Active Status?"
        description="You are currently In Shop. Returning to this activity will first change your Work Availability back to Active."
        variant="primary"
        isLoading={savingOpStatus}
      />

      <ConfirmationModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={executeConfirmedAction}
        title={confirmState.title}
        description={confirmState.description}
        confirmText={
          confirmState.action === "drop-load"
            ? "Release Load"
            : confirmState.action === "mark-picked-up"
              ? "Confirm Pickup"
              : confirmState.action === "start-route"
                ? "Start Route"
                : "Confirm"
        }
        variant={confirmState.variant}
        isLoading={!!accepting || !!dropping || !!pickingUp || !!startingRoute}
      />
    </div>
  );
}


function DriverDeliveryProofDialog({
  load,
  loadReference,
  getToken,
  onClose,
  onDelivered,
}: {
  load: any | null;
  loadReference: string;
  getToken: () => Promise<string | null>;
  onClose: () => void;
  onDelivered: () => Promise<void> | void;
}) {
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const galleryRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!load) {
      setFile(null);
      setNote("");
      setError(null);
      setPreview((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return null;
      });
    }
  }, [load]);

  React.useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;

    if (preview) URL.revokeObjectURL(preview);
    setFile(nextFile);
    setPreview(URL.createObjectURL(nextFile));
    setError(null);
    event.target.value = "";
  };

  const submitDelivery = async () => {
    if (!load || !file || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication token is unavailable");

      // Preserve the proven proof-of-delivery upload path used by My Loads.
      // Delivery is only advanced after the proof upload succeeds.
      const formData = new FormData();
      formData.append("proof", file);
      if (note.trim()) formData.append("note", note.trim());

      await apiClient.post(
        `/api/loads/${encodeURIComponent(load._id)}/submit-proof`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      await apiClient.post(
        `/api/driver-tracking/loads/${encodeURIComponent(load._id)}/deliver`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      await onDelivered();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to complete delivery",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!load) return null;

  return (
    <Dialog
      open={!!load}
      onOpenChange={(open) => {
        if (!open && !submitting) onClose();
      }}
    >
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-lg max-h-[calc(100dvh-1.5rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-extrabold">
            <Camera className="size-5 text-emerald-500" />
            Complete Delivery
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Take or choose a proof-of-delivery photo for {loadReference || "this load"}. The load will only move to Delivered after the proof is uploaded successfully.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Tracking / Load #</p>
            <p className="mt-1 break-words font-mono text-sm font-bold [overflow-wrap:anywhere]">
              {loadReference || "Load reference unavailable"}
            </p>
          </div>

          <input
            ref={cameraRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            capture="environment"
            className="hidden"
            onChange={onFileChange}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,.img"
            className="hidden"
            onChange={onFileChange}
          />

          {!preview ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="min-h-28 rounded-xl border-2 border-dashed border-primary/35 bg-primary/5 p-4 text-center transition-colors hover:border-primary/60 hover:bg-primary/10"
              >
                <Camera className="mx-auto size-7 text-primary" />
                <p className="mt-2 text-sm font-bold">Take Photo</p>
                <p className="mt-1 text-xs text-muted-foreground">Use the device camera</p>
              </button>
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                className="min-h-28 rounded-xl border-2 border-dashed border-border bg-muted/20 p-4 text-center transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <ImageIcon className="mx-auto size-7 text-muted-foreground" />
                <p className="mt-2 text-sm font-bold">Choose Photo</p>
                <p className="mt-1 text-xs text-muted-foreground">Select from the gallery</p>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
                <img
                  src={preview}
                  alt="Proof of delivery preview"
                  className="max-h-72 w-full object-contain"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => cameraRef.current?.click()}
                  disabled={submitting}
                >
                  <Camera className="mr-2 size-4" /> Retake
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => galleryRef.current?.click()}
                  disabled={submitting}
                >
                  <ImageIcon className="mr-2 size-4" /> Change
                </Button>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="driver-dashboard-delivery-note" className="text-sm font-bold">
              Delivery Note <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="driver-dashboard-delivery-note"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={2000}
              placeholder="Example: Delivered to receiving desk; keys handed to customer."
              className="mt-1.5 resize-none"
              disabled={submitting}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
            The photo is required for delivery completion. After submission, Dispatch can still review the proof in the normal proof-of-delivery workflow.
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="sm:min-w-28"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submitDelivery}
              disabled={!file || submitting}
              className="sm:min-w-44 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting ? (
                <><Loader2 className="mr-2 size-4 animate-spin" />Completing...</>
              ) : (
                <><CheckCircle2 className="mr-2 size-4" />Submit Proof & Deliver</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
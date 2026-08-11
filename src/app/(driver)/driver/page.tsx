"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { apiClient } from "@/lib/api-client";
import { initializeSocket } from "@/lib/socket.client";
import { useDriverLocationSharing } from "@/hooks/useDriverLocationSharing";
import { useTheme } from "@/context/ThemeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
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
  Plus,
  Minus,
  LocateFixed,
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
} from "lucide-react";
import { US_STATES, AVAILABLE_DAYS } from "@/components/driver-profile/driver-profile-constants";
import { ConfirmationModal, ConfirmationVariant } from "@/components/ui/confirmation-modal";
import { DriverAcceptLoadDialog } from "@/components/driver/DriverAcceptLoadDialog";
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

export default function DriverDashboardPage() {
  const { getToken } = useAuth();
  const { theme } = useTheme();
  const [loads, setLoads] = React.useState<any[]>([]);
  const [dashStats, setDashStats] = React.useState<{
    pendingRequests: number;
    totalEarnings: number;
    profileCompletionScore: number;
    isComplianceExpired: boolean;
    completedLoads: number;
  } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [accepting, setAccepting] = React.useState<string | null>(null);
  const [acceptDialogLoad, setAcceptDialogLoad] = React.useState<any | null>(null);
  const [dropping, setDropping] = React.useState<string | null>(null);
  const [startingRoute, setStartingRoute] = React.useState<string | null>(null);
  const [mapReady, setMapReady] = React.useState(false);
  const [mapError, setMapError] = React.useState<string | null>(null);
  const [opStatus, setOpStatus] = React.useState("active");
  const [savingOpStatus, setSavingOpStatus] = React.useState(false);
  const [logCity, setLogCity] = React.useState("");
  const [logState, setLogState] = React.useState("");
  const [logRadius, setLogRadius] = React.useState(500);
  const [logRoutes, setLogRoutes] = React.useState<string[]>([]);
  const [logRouteInput, setLogRouteInput] = React.useState("");
  const [logDays, setLogDays] = React.useState<string[]>(["monday", "tuesday", "wednesday", "thursday", "friday"]);
  const [savingLogistics, setSavingLogistics] = React.useState(false);
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
  } = useDriverLocationSharing();

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

  const fetchData = React.useCallback(async () => {
    try {
      const token = await getToken();
      const [loadsRes, statsRes, profileRes] = await Promise.all([
        apiClient.get("/api/driver-tracking/my-loads", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiClient.get("/api/driver-tracking/dashboard-stats", {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
        apiClient.get("/api/driver-profile", {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
      ]);
      const loadsData = loadsRes.data?.data;
      setLoads(loadsData?.loads ?? (Array.isArray(loadsData) ? loadsData : []));
      if (statsRes?.data?.data) setDashStats(statsRes.data.data);
      const profile = profileRes?.data?.data;
      if (profile) {
        setOpStatus(profile.operationalStatus || "active");
        setLogCity(profile.homeBase?.city || "");
        setLogState(profile.homeBase?.state || "");
        setLogRadius(profile.serviceRadius || 500);
        setLogRoutes(profile.preferredRoutes || []);
        setLogDays(profile.availableDays || ["monday", "tuesday", "wednesday", "thursday", "friday"]);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load dashboard");
    } finally {
      setIsLoading(false);
    }
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

  const activeLoads = loads.filter((l) =>
    ["Assigned", "Accepted", "Picked Up", "In-Transit"].includes(l.status),
  );
  const completedCount = loads.filter((l) => l.status === "Delivered").length;
  const currentLoad = activeLoads[0];
  const hasActiveLoad = activeLoads.length > 0;
  const profileScore = dashStats?.profileCompletionScore || 0;

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

        map.addControl(
          new mapboxgl.NavigationControl({ showCompass: false }),
          "top-right",
        );

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

  const zoomMap = (delta: number) => {
    const map = mapRef.current;
    if (map) map.setZoom(Math.max(2, Math.min(18, map.getZoom() + delta)));
  };

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
    [getToken, fetchData],
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
        toast.success("Load dropped");

        // The load has already been dropped successfully, so clear the
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
        toast.error(err.response?.data?.message || "Failed to drop load");
      } finally {
        setDropping(null);
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
      case 'start-route':
        title = 'Start Route?';
        description = 'Are you ready to begin the delivery route? This will notify the organization that you are in transit.';
        variant = 'success';
        break;
      case 'drop-load':
        title = 'Drop This Load?';
        description = 'Warning: You are about to drop this load. This action should only be taken if you cannot complete the delivery.';
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
    if (action === 'start-route') startRoute(load);
    if (action === 'drop-load') dropLoad(load);
  };

  const updateOpStatus = React.useCallback(
    async (newStatus: string) => {
      setSavingOpStatus(true);
      try {
        const token = await getToken();
        await apiClient.patch(
          "/api/driver-profile/logistics",
          { operationalStatus: newStatus },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setOpStatus(newStatus);
        toast.success(`Status: ${newStatus.replace("_", " ")}`);
      } catch (err: any) {
        toast.error(err?.response?.data?.message || "Failed to update status");
      } finally {
        setSavingOpStatus(false);
      }
    },
    [getToken],
  );

  const saveLogistics = React.useCallback(async () => {
    setSavingLogistics(true);
    try {
      const token = await getToken();
      await apiClient.patch(
        "/api/driver-profile/logistics",
        {
          operationalStatus: opStatus,
          homeBase: { city: logCity.trim(), state: logState },
          serviceRadius: logRadius,
          preferredRoutes: logRoutes,
          availableDays: logDays,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success("Logistics saved");
    } catch {
      toast.error("Failed to save logistics");
    } finally {
      setSavingLogistics(false);
    }
  }, [getToken, opStatus, logCity, logState, logRadius, logRoutes, logDays]);

  const toggleDay = (d: string) =>
    setLogDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const addRoute = () => {
    const trimmed = logRouteInput.trim();
    if (trimmed && !logRoutes.includes(trimmed) && logRoutes.length < 10) {
      setLogRoutes([...logRoutes, trimmed]);
      setLogRouteInput("");
    }
  };

  const kpis = [
    {
      label: "Active Loads",
      value: activeLoads.length,
      icon: <Truck className="size-32 sm:size-40" />,
      sub: activeLoads.length === 1 ? "load in transit" : "loads in transit",
      href: "/driver/loads",
    },
    {
      label: "Completed",
      value: dashStats?.completedLoads ?? completedCount,
      icon: <CheckCircle2 className="size-32 sm:size-40" />,
      sub: "deliveries made",
      href: "/driver/loads",
    },
    {
      label: "Earnings",
      value: dashStats ? `$${dashStats.totalEarnings.toLocaleString()}` : "$0",
      icon: <DollarSign className="size-32 sm:size-40" />,
      sub: "total revenue",
      href: "/driver/earnings",
    },
    {
      label: "Profile",
      value: `${profileScore}%`,
      icon: <Shield className="size-32 sm:size-40" />,
      sub: profileScore >= 80 ? "excellent standing" : profileScore >= 50 ? "needs attention" : "critical",
      href: "/driver/profile",
    },
  ];

  const router = useRouter();

  const { mst, utc } = formatDualTime(currentTime);

  return (
    <div className="p-4 sm:p-8 space-y-8 container mx-auto min-h-screen">

      {/* ── HEADER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 animate-fade-in-up">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-bold tracking-widest uppercase px-2 py-0.5">
              Driver Portal
            </Badge>
            <div className="size-1 rounded-full bg-border" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
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
                "text-[10px] font-bold gap-1.5",
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
            "text-[10px] font-bold",
            opStatus === "active" ? "bg-emerald-500/10 text-emerald-500 border-emerald-200 dark:border-emerald-800" :
              opStatus === "on_leave" ? "bg-amber-500/10 text-amber-500 border-amber-200 dark:border-amber-800" :
                opStatus === "maintenance" ? "bg-blue-500/10 text-blue-500 border-blue-200 dark:border-blue-800" :
                  "bg-red-500/10 text-red-500 border-red-200 dark:border-red-800",
          )}>
            {opStatus.replace("_", " ").toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* ── ALERTS ── */}
      {dashStats?.isComplianceExpired && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3">
          <AlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">Compliance Expired</p>
            <p className="text-xs text-red-600 dark:text-red-500">
              Update documents in your <Link href="/driver/documents" className="underline font-bold">Documents page</Link> to keep accepting loads.
            </p>
          </div>
        </div>
      )}

      {dashStats && dashStats.pendingRequests > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-4 py-2.5">
          <Timer className="size-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
            <span className="font-bold">{dashStats.pendingRequests}</span> pending request{dashStats.pendingRequests > 1 ? "s" : ""} awaiting approval
          </p>
          <Link href="/driver/loads" className="ml-auto text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline shrink-0">View &rarr;</Link>
        </div>
      )}

      {/* ── KPI CARDS (clickable) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up stagger-1">
        {kpis.map((kpi) => (
          <Card
            key={kpi.label}
            className="p-0 border-border/50 shadow-sm hover:shadow-xl transition-all duration-300 group relative overflow-hidden bg-card/80 backdrop-blur-sm border cursor-pointer hover:-translate-y-0.5"
            onClick={() => router.push(kpi.href)}
          >
            <div className="absolute top-0 left-40 p-4 opacity-10 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none">
              {kpi.icon}
            </div>
            <CardContent className="p-6 flex justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{kpi.label}</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <h3 className="text-3xl font-black tracking-tighter text-foreground">{kpi.value}</h3>
                )}
                <p className="text-[10px] text-muted-foreground/60 font-medium mt-1">{kpi.sub}</p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200 self-center" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── FULL-WIDTH MAP ── */}
      <Card className="border-border/50 shadow-sm overflow-hidden bg-card p-0 gap-0 animate-fade-in-up stagger-2">
        <CardContent className="p-0">
          <div className="relative h-96 lg:h-150 overflow-hidden" style={{ background: "#e5e7eb" }}>
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
                      <p className="text-xs font-medium text-muted-foreground">{mapNotice}</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="size-16 rounded-2xl bg-muted/60 flex items-center justify-center">
                  <Satellite className="size-8 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">Map unavailable</p>
              </div>
            )}

            {/* Map zoom controls */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5">
              {[
                { action: () => zoomMap(1), icon: <Plus className="size-4" />, label: "Zoom in" },
                { action: () => zoomMap(-1), icon: <Minus className="size-4" />, label: "Zoom out" },
                { action: centerOnMe, icon: <LocateFixed className="size-4" />, label: "My location" },
              ].map((btn) => (
                <TooltipProvider key={btn.label}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" variant="secondary" className="size-9 shadow-md bg-background/90 backdrop-blur-sm border border-border/50 hover:bg-background hover:shadow-lg transition-all duration-200" onClick={btn.action}>
                        {btn.icon}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="text-xs">{btn.label}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>

            {/* Broadcasting indicator */}
            {isSharing && lastCoords && (
              <div className="absolute bottom-4 left-4 z-10 rounded-xl bg-background/90 backdrop-blur-sm border border-border/50 shadow-lg px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="relative flex size-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Broadcasting Live</span>
                </div>
              </div>
            )}

            {/* Map error overlay */}
            {mapError && !mapNotice && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-muted/80 backdrop-blur-sm">
                <div className="rounded-xl bg-background border border-border/50 px-5 py-3 shadow-lg text-center">
                  <Satellite className="size-6 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground font-medium">{mapError}</p>
                </div>
              </div>
            )}

            {/* Map legend */}
            <div className="absolute bottom-4 right-4 z-10 rounded-xl bg-background/90 backdrop-blur-sm border border-border/50 shadow-lg px-3 py-2.5">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Legend</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-primary" />
                  <span className="text-[10px] text-muted-foreground font-medium">Your Location</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-amber-500" />
                  <span className="text-[10px] text-muted-foreground font-medium">Pickup Point</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-muted-foreground font-medium">Delivery Point</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── ACTION CARDS: GPS · LOAD · DISPATCH (3-col grid below map) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in-up stagger-3">

        {/* GPS Broadcast */}
        <Card className="lg:col-span-4 border-border/50 shadow-sm p-0 gap-0 overflow-hidden bg-card/80 backdrop-blur-sm">
          <CardHeader className="py-3.5 px-5 border-b border-border/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "size-8 rounded-lg flex items-center justify-center",
                    isSharing
                      ? "bg-emerald-500/10"
                      : isStarting
                        ? "bg-amber-500/10"
                        : "bg-muted/60",
                  )}
                >
                  {isSharing ? (
                    <Wifi className="size-4 text-emerald-500" />
                  ) : isStarting ? (
                    <Wifi className="size-4 text-amber-500 animate-pulse" />
                  ) : (
                    <WifiOff className="size-4 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">GPS Broadcast</CardTitle>
                  <p className="text-[10px] text-muted-foreground/60 font-medium">Share location with dispatch</p>
                </div>
              </div>
              {(isSharing || isStarting) && (
                <span className="relative flex size-2.5">
                  <span
                    className={cn(
                      "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                      isSharing ? "bg-emerald-400" : "bg-amber-400",
                    )}
                  />
                  <span
                    className={cn(
                      "relative inline-flex rounded-full size-2.5",
                      isSharing ? "bg-emerald-500" : "bg-amber-500",
                    )}
                  />
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <TooltipProvider>
              <div className="grid grid-cols-2 gap-1.5">
                {STATUS_CONFIG.map((item) => {
                  const locked = item.needsLoad && !hasActiveLoad;
                  const isActive = status === item.key;
                  const btn = (
                    <Button
                      key={item.key}
                      size="sm"
                      variant="outline"
                      disabled={locked}
                      className={cn(
                        "h-9 text-[11px] font-semibold gap-1.5 transition-all duration-200",
                        isActive ? item.activeColor : "border-border/50 text-muted-foreground",
                        locked && "opacity-40",
                      )}
                      onClick={() => {
                        if (!locked) {
                          updateStatus(item.key as any);
                          toast.success(`Status: ${item.label}`);
                        }
                      }}
                    >
                      {item.icon} {item.label}
                    </Button>
                  );
                  return locked ? (
                    <Tooltip key={item.key}>
                      <TooltipTrigger asChild>{btn}</TooltipTrigger>
                      <TooltipContent side="bottom" className="text-[10px]">Need an active load</TooltipContent>
                    </Tooltip>
                  ) : (
                    <React.Fragment key={item.key}>{btn}</React.Fragment>
                  );
                })}
              </div>
            </TooltipProvider>
            {hasActiveLoad ? (
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
                    <p className="text-[11px] font-bold">
                      GPS Required While Loads Are Active
                    </p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                      {isSharing
                        ? "Location sharing is automatic and cannot be turned off until you have no active loads."
                        : isStarting
                          ? "Connecting automatically because you have an active load…"
                          : "Location permission is required while you have an active load."}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                  <p className="text-[10px] leading-relaxed text-muted-foreground">
                    No active loads. You can choose whether to share your location.
                  </p>
                </div>
                <Button
                  size="sm"
                  className={cn(
                    "w-full h-10 text-xs font-bold transition-all duration-300",
                    isSharing || isStarting
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800 hover:bg-rose-500/20 shadow-none"
                      : "bg-primary text-primary-foreground shadow-sm hover:shadow-md",
                  )}
                  variant={isSharing || isStarting ? "outline" : "default"}
                  onClick={() => {
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
                    ? "Turn Off GPS"
                    : isStarting
                      ? "Stop Connecting"
                      : "Turn On GPS"}
                </Button>
              </div>
            )}
            {lastShareAt && (
              <p className="text-[10px] text-muted-foreground/60 text-center font-medium">Last: {lastShareAt}</p>
            )}
            {locationError && (
              <div className="rounded-lg bg-destructive/5 border border-destructive/10 px-3 py-2">
                <p className="text-[11px] text-destructive font-medium">{locationError}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Load */}
        <Card className="lg:col-span-4 border-border/50 shadow-sm p-0 gap-0 overflow-hidden bg-card/80 backdrop-blur-sm">
          <CardHeader className="py-3.5 px-5 border-b border-border/10">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Package className="size-4 text-primary" />
                Current Load
              </CardTitle>
              {currentLoad && (
                <Badge variant="outline" className={cn("text-[10px] font-bold", LOAD_STATUS_COLORS[currentLoad.status] || "")}>
                  {currentLoad.status}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : currentLoad ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-mono font-bold">{currentLoad.trackingNumber || "No tracking #"}</p>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    ${(currentLoad.pricing?.carrierPayAmount || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="size-3.5 text-primary shrink-0" />
                  <span className="truncate">{currentLoad.origin}</span>
                  <ArrowRight className="size-3 shrink-0 text-primary" />
                  <span className="truncate">{currentLoad.destination}</span>
                </div>
                <p className="text-[10px] text-muted-foreground/60 font-medium flex items-center gap-1">
                  <Clock className="size-3" />
                  Pickup: {new Date(currentLoad.dates?.pickupDeadline || currentLoad.requestedPickupDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Denver" })}
                </p>
                {currentLoad.status === "Assigned" && (
                  <Button
                    size="sm"
                    className="w-full h-9 text-xs font-bold shadow-sm"
                    disabled={accepting === currentLoad._id}
                    onClick={() => setAcceptDialogLoad(currentLoad)}
                  >
                    {accepting === currentLoad._id ? <><Loader2 className="size-3.5 mr-2 animate-spin" />Accepting...</> : <><CheckCircle2 className="size-3.5 mr-2" />Accept Load</>}
                  </Button>
                )}
                {currentLoad.status === "Picked Up" && (
                  <Button size="sm" className="w-full h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 shadow-sm" disabled={startingRoute === currentLoad._id} onClick={() => handleAction('start-route', currentLoad)}>
                    {startingRoute === currentLoad._id ? <><Loader2 className="size-3.5 mr-2 animate-spin" />Starting...</> : <><Navigation2 className="size-3.5 mr-2" />Start Route</>}
                  </Button>
                )}
                {currentLoad.status === "In-Transit" && (
                  <div className="flex items-center gap-2 py-1">
                    <span className="relative flex size-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
                    </span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">In Transit</span>
                  </div>
                )}
                {["Assigned", "Accepted"].includes(currentLoad.status) && (
                  <Button size="sm" variant="outline" className="w-full h-8 text-xs font-semibold text-destructive border-destructive/20 hover:bg-destructive/10" disabled={dropping === currentLoad._id} onClick={() => handleAction('drop-load', currentLoad)}>
                    {dropping === currentLoad._id ? <><Loader2 className="size-3.5 mr-2 animate-spin" />Dropping...</> : <><XCircle className="size-3.5 mr-2" />Drop Load</>}
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 gap-3">
                <div className="size-10 rounded-xl bg-muted/40 flex items-center justify-center">
                  <Package className="size-5 text-muted-foreground/40" />
                </div>
                <p className="text-xs text-muted-foreground font-medium">No active loads</p>
                <Link href="/driver/available-loads" className="text-[11px] font-semibold text-primary hover:underline">
                  Browse Available &rarr;
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dispatch Status + Other Loads */}
        <Card className="lg:col-span-4 border-border/50 shadow-sm p-0 gap-0 overflow-hidden bg-card/80 backdrop-blur-sm">
          <CardHeader className="py-3.5 px-5 border-b border-border/10">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Zap className="size-4 text-emerald-500" />
              Dispatch Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-3 gap-1.5">
              {OP_STATUS_CONFIG.map((item) => (
                <Button
                  key={item.key}
                  size="sm"
                  variant="outline"
                  disabled={savingOpStatus}
                  className={cn(
                    "h-9 text-[11px] font-semibold gap-1 transition-all duration-200",
                    opStatus === item.key ? item.activeColor : "border-border/50 text-muted-foreground",
                  )}
                  onClick={() => updateOpStatus(item.key)}
                >
                  {item.icon} {item.label}
                </Button>
              ))}
            </div>
            {activeLoads.length > 1 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Other Loads ({activeLoads.length - 1})</p>
                {activeLoads.slice(1, 4).map((load) => (
                  <div key={load._id} className="flex items-center justify-between py-2 border-b border-border/10 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-mono font-bold truncate">{load.trackingNumber || "No tracking #"}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{load.origin} &rarr; {load.destination}</p>
                    </div>
                    <Badge variant="outline" className={cn("text-[9px] font-bold shrink-0 ml-2", LOAD_STATUS_COLORS[load.status] || "")}>
                      {load.status}
                    </Badge>
                  </div>
                ))}
                <Link href="/driver/loads" className="flex items-center justify-center gap-1.5 pt-1 text-[11px] font-semibold text-primary hover:underline">
                  View all loads <ArrowRight className="size-3" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── LOGISTICS: AVAILABILITY · SERVICE AREA · ROUTES ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in-up stagger-4">
        <Card className="lg:col-span-4 border-border/50 shadow-sm p-0 gap-0 overflow-hidden bg-card/80 backdrop-blur-sm">
          <CardHeader className="py-3.5 px-5 border-b border-border/10">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Calendar className="size-4 text-violet-500" />
              Availability
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_DAYS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDay(d.value)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs font-bold transition-all border",
                    logDays.includes(d.value)
                      ? "border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-400"
                      : "border-border/40 text-muted-foreground hover:border-border",
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 border-border/50 shadow-sm p-0 gap-0 overflow-hidden bg-card/80 backdrop-blur-sm">
          <CardHeader className="py-3.5 px-5 border-b border-border/10">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <MapPin className="size-4 text-blue-500" />
                Service Area
              </CardTitle>
              <span className="text-lg font-black text-blue-600 dark:text-blue-400 tabular-nums">{logRadius} mi</span>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <Slider value={[logRadius]} onValueChange={([v]) => setLogRadius(v)} min={25} max={3000} step={25} />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>25 mi</span>
              <span>3,000 mi</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input value={logCity} onChange={(e) => setLogCity(e.target.value)} placeholder="City" className="h-9 text-xs" />
              <Select value={logState || ""} onValueChange={setLogState}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((s) => (
                    <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 border-border/50 shadow-sm p-0 gap-0 overflow-hidden bg-card/80 backdrop-blur-sm">
          <CardHeader className="py-3.5 px-5 border-b border-border/10">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Route className="size-4 text-amber-500" />
              Preferred Routes
              <span className="text-[10px] text-muted-foreground ml-auto">{logRoutes.length}/10</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="flex gap-2">
              <Input
                value={logRouteInput}
                onChange={(e) => setLogRouteInput(e.target.value)}
                placeholder="e.g. UT &rarr; CA"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRoute(); } }}
                maxLength={50}
                className="h-9 text-xs"
              />
              <Button size="sm" variant="outline" onClick={addRoute} disabled={logRoutes.length >= 10} className="h-9 px-3 text-xs shrink-0">
                Add
              </Button>
            </div>
            {logRoutes.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {logRoutes.map((r) => (
                  <Badge key={r} variant="outline" className="gap-1 pr-1 cursor-pointer hover:bg-destructive/10 text-xs" onClick={() => setLogRoutes(logRoutes.filter((x) => x !== r))}>
                    {r} <span className="text-destructive text-[10px]">&times;</span>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/50 text-center py-1">No routes added yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── SAVE ── */}
      <div className="flex justify-end pb-8">
        <Button onClick={saveLogistics} disabled={savingLogistics} className="gap-2 shadow-sm hover:shadow-md transition-shadow">
          {savingLogistics ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save Logistics
        </Button>
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

      <ConfirmationModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={executeConfirmedAction}
        title={confirmState.title}
        description={confirmState.description}
        variant={confirmState.variant}
        isLoading={!!accepting || !!dropping || !!startingRoute}
      />
    </div>
  );
}
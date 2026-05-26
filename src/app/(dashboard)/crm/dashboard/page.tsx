"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Car,
  LogOut,
  User,
  Copy,
  Check,
  Settings,
  Clock,
  ChevronDown,
  Loader2,
  CheckCircle2,
  CalendarDays,
  Sun,
  Moon,
  Sunset,
  ArrowRight,
  Fingerprint,
  CalendarCheck,
  Activity,
  Sparkles,
  Coffee,
  Play,
  Trophy,
  Users,
  Tag,
  X,
  MonitorDot,
  Download,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiClient } from "@/lib/api-client";
import { initializeSocket } from "@/lib/socket.client";
import { SupraLeoAI } from "@/components/supra-leo-ai/SupraLeoAI";
import { DashboardNotifications } from "@/components/crm/DashboardNotifications";
import { AutrixWelcomeGate } from "@/components/supra-leo-ai/AutrixWelcomeSystem";
import { CrmPushPrompt } from "@/components/crm/CrmPushPrompt";
import { cn, resolveImageUrl } from "@/lib/utils";
import { toast } from "sonner";

interface CrmUserData {
  _id: string;
  fullName: string;
  username: string;
  email: string;
  avatar?: string;
  avatarUrl?: string;
  role: string;
  todayTimeLogs?: Array<{
    _id: string;
    type: "time-in" | "time-out" | "break-in" | "break-out";
    timestamp: string;
  }>;
}

// ─── MDT timezone helpers (company operates on MDT = UTC-6) ─────────────────
const MDT_OFFSET_MS = -6 * 60 * 60 * 1000;
const toMDT = (d: Date) => new Date(d.getTime() + MDT_OFFSET_MS);

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getGreeting(name: string) {
  const h = toMDT(new Date()).getUTCHours();
  if (h >= 5 && h < 12)
    return {
      text: `Good Morning, ${name}`,
      icon: <Sun className="h-5 w-5 text-amber-400" />,
      period: "morning",
    };
  if (h >= 12 && h < 18)
    return {
      text: `Good Afternoon, ${name}`,
      icon: <Sunset className="h-5 w-5 text-orange-400" />,
      period: "afternoon",
    };
  return {
    text: `Good Evening, ${name}`,
    icon: <Moon className="h-5 w-5 text-indigo-400" />,
    period: "evening",
  };
}
function ini(n: string) {
  return n
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
function fmt(d: Date) {
  return toMDT(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "UTC" });
}

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

function withAvatarCacheBust(avatar?: string | null) {
  if (!avatar) return undefined;
  return `${avatar}${avatar.includes("?") ? "&" : "?"}v=${Date.now()}`;
}

function AnimatedDigit({ value }: { value: string }) {
  const [displayed, setDisplayed] = React.useState(value);
  const [animating, setAnimating] = React.useState(false);
  const prevRef = React.useRef(value);

  React.useEffect(() => {
    if (prevRef.current !== value) {
      setAnimating(true);
      const t = setTimeout(() => {
        setDisplayed(value);
        setAnimating(false);
        prevRef.current = value;
      }, 150);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <span
      className={cn(
        "inline-block transition-all duration-150",
        animating
          ? "opacity-0 -translate-y-2 scale-95"
          : "opacity-100 translate-y-0 scale-100",
      )}
    >
      {displayed}
    </span>
  );
}

function LiveClock() {
  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const mdtNow = toMDT(now);
  const timeStr = mdtNow.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="group relative inline-flex items-center gap-2.5 rounded-full px-4 py-2 cursor-default select-none overflow-hidden border border-emerald-200/80 dark:border-emerald-500/20 bg-linear-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20 backdrop-blur-sm hover:border-emerald-300/80 dark:hover:border-emerald-400/30 transition-all duration-300">
          <div className="absolute inset-0 bg-linear-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
          </span>
          <span className="font-mono text-xs font-bold tabular-nums tracking-wide text-emerald-700 dark:text-emerald-400">
            {timeStr}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200"
      >
        <p className="text-xs">
          {mdtNow.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
            timeZone: "UTC",
          })}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

function ActivityTimer({
  todayTotalActiveMs,
  activityStartAt,
  isOnShift,
}: {
  todayTotalActiveMs: number;
  activityStartAt: number | null;
  isOnShift: boolean;
}) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const liveMs = activityStartAt ? Math.max(0, now - activityStartAt) : 0;
  const totalMs = todayTotalActiveMs + liveMs;
  // isActive if tray confirmed an active interval, OR if we haven't loaded heartbeat data
  // yet after clock-in (activityStartAt is set optimistically on time-in socket event so
  // this null-but-active window is < 2.5s; the fallback covers second-session re-clocks)
  const isActive = activityStartAt !== null || (isOnShift && todayTotalActiveMs === 0);

  const pad = (n: number) => n.toString().padStart(2, "0");
  const toHMS = (ms: number) => ({
    h: Math.floor(ms / 3600000),
    m: Math.floor((ms % 3600000) / 60000),
    s: Math.floor((ms % 60000) / 1000),
  });

  const worked = toHMS(totalMs);
  const units = [
    { v: pad(worked.h), l: "HRS" },
    { v: pad(worked.m), l: "MIN" },
    { v: pad(worked.s), l: "SEC" },
  ];

  const maxShiftMs = 8 * 3600000;
  const progress = Math.min(totalMs / maxShiftMs, 1);
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-center">
        <div className="relative">
          <svg width="140" height="140" className="absolute inset-0 -rotate-90">
            <circle
              cx="70"
              cy="70"
              r="54"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-zinc-200 dark:text-zinc-800"
            />
            <circle
              cx="70"
              cy="70"
              r="54"
              fill="none"
              stroke={isActive ? "#10b981" : "#71717a"}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000"
              style={{
                filter: `drop-shadow(0 0 6px ${isActive ? "#10b981" : "#71717a"})`,
              }}
            />
          </svg>
          <div className="w-35 h-35 flex flex-col items-center justify-center">
            <div className="flex items-end gap-0.5">
              {units.map((item, i) => (
                <React.Fragment key={item.l}>
                  {i > 0 && (
                    <span
                      className={cn(
                        "text-xl font-thin mb-3 mx-0.5 transition-colors duration-500",
                        isActive ? "text-emerald-500/50" : "text-zinc-400/50",
                      )}
                    >
                      :
                    </span>
                  )}
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "text-3xl font-mono font-black tabular-nums leading-none tracking-tighter transition-colors duration-500",
                        isActive
                          ? "text-zinc-900 dark:text-white"
                          : "text-zinc-400 dark:text-zinc-600",
                      )}
                    >
                      <AnimatedDigit value={item.v[0]} />
                      <AnimatedDigit value={item.v[1]} />
                    </span>
                    <span className="text-[8px] tracking-widest text-zinc-400 dark:text-zinc-600 font-bold mt-0.5">
                      {item.l}
                    </span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-center">
        <span
          className={cn(
            "text-[10px] font-bold tracking-[0.2em] uppercase",
            isActive
              ? "text-emerald-500 dark:text-emerald-400"
              : "text-zinc-400 dark:text-zinc-600",
          )}
        >
          {isActive ? "● Active — Tracking" : "○ Idle — Paused"}
        </span>
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
  accent = "emerald",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  accent?: "emerald" | "amber";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-center justify-center gap-3 rounded-2xl p-5 w-full min-h-27.5",
        "border border-zinc-200/80 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/50 backdrop-blur-sm",
        "hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-all duration-300 cursor-pointer overflow-hidden",
        "hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98]",
        accent === "amber"
          ? "hover:border-amber-500/30 hover:shadow-[0_0_20px_-5px_rgba(245,158,11,0.2)]"
          : "hover:border-emerald-500/30 hover:shadow-[0_0_20px_-5px_rgba(16,185,129,0.2)]",
      )}
    >
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-linear-to-r from-transparent via-white/6 dark:via-white/3 to-transparent pointer-events-none" />
      <div
        className={cn(
          "h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-300",
          "bg-zinc-100 dark:bg-zinc-800/80 group-hover:scale-110",
          accent === "amber"
            ? "group-hover:bg-amber-500/10 group-hover:shadow-[0_0_16px_-4px_rgba(245,158,11,0.4)]"
            : "group-hover:bg-emerald-500/10 group-hover:shadow-[0_0_16px_-4px_rgba(16,185,129,0.4)]",
        )}
      >
        {icon}
      </div>
      <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors duration-300 tracking-wide uppercase whitespace-nowrap">
        {label}
      </span>
    </button>
  );
}

function StatChip({
  label,
  value,
  copyable,
  breakMode = "words",
  capitalize,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  breakMode?: "all" | "words";
  capitalize?: boolean;
}) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [value, label]);

  return (
    <div className="min-w-0 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 px-4 py-3 hover:border-zinc-300/60 dark:hover:border-zinc-700/60 transition-colors duration-200">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[9px] uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 font-bold">
          {label}
        </p>
        {copyable && (
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-200/80 dark:border-zinc-700/70 bg-white/80 dark:bg-zinc-800/70 px-1.5 py-0.5 text-[10px] font-bold text-zinc-500 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            aria-label={`Copy ${label}`}
            title={copied ? "Copied!" : `Copy ${label}`}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        )}
      </div>
      <p
        className={cn(
          "text-sm font-bold text-zinc-700 dark:text-zinc-200 whitespace-normal leading-snug",
          breakMode === "all" ? "break-all" : "break-words",
          capitalize && "capitalize",
        )}
      >
        {value}
      </p>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
export default function CrmDashboardPage() {
  const router = useRouter();
  const [user, setUser] = React.useState<CrmUserData | null>(null);
  const [token, setToken] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [todayLogs, setTodayLogs] = React.useState<
    CrmUserData["todayTimeLogs"]
  >([]);
  const [isClocking, setIsClocking] = React.useState(false);
  const [clockMsg, setClockMsg] = React.useState("");
  const [isOnBreak, setIsOnBreak] = React.useState(false);
  const [breakAccumulatedMs, setBreakAccumulatedMs] = React.useState(0);
  const [mounted, setMounted] = React.useState(false);
  const [trayBanner, setTrayBanner] = React.useState(false);
  const [trayToken, setTrayToken] = React.useState("");
  const [showTrayModal, setShowTrayModal] = React.useState(false);
  const [trayChecking, setTrayChecking] = React.useState(false);
  const [todayTotalActiveMs, setTodayTotalActiveMs] = React.useState(0);
  const [activityStartAt, setActivityStartAt] = React.useState<number | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    const pending = localStorage.getItem("pending_tray_auth");
    if (!pending) return;

    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 2000);

    fetch('http://127.0.0.1:18642/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: pending }),
      signal: controller.signal,
    })
      .then(res => {
        clearTimeout(tid);
        if (res.ok) {
          localStorage.removeItem("pending_tray_auth");
          // Tray connected silently — no banner needed
        } else {
          throw new Error('rejected');
        }
      })
      .catch(() => {
        clearTimeout(tid);
        // Tray not running — show banner as fallback
        setTrayToken(pending);
        setTrayBanner(true);
      });
  }, []);

  const openTrayApp = React.useCallback(() => {
    try { window.location.href = `actionauto://auth?token=${encodeURIComponent(trayToken)}`; } catch {}
    localStorage.removeItem("pending_tray_auth");
    setTrayBanner(false);
  }, [trayToken]);

  const dismissTrayBanner = React.useCallback(() => {
    localStorage.removeItem("pending_tray_auth");
    setTrayBanner(false);
  }, []);

  // Re-fetch todayTimeLogs from the server to sync state that changed outside
  // this page (e.g. tray app clocked in/out while the tab was open or in the background)
  const refreshShiftState = React.useCallback(async () => {
    const t = localStorage.getItem("crm_token");
    if (!t) return;
    try {
      const res = await apiClient.get("/api/crm/me", {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = res.data?.data || res.data;
      setTodayLogs(data.todayTimeLogs || []);
    } catch {}
  }, []);

  // Sync whenever the user switches back to this tab
  React.useEffect(() => {
    const onVisibility = () => { if (!document.hidden) refreshShiftState(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [refreshShiftState]);

  // Fetch activity state (idle-aware timer data) from getShiftState
  const fetchActivityState = React.useCallback(async () => {
    const t = localStorage.getItem("crm_token");
    if (!t) return;
    try {
      const res = await apiClient.get("/api/crm/timeproof/shift-state", {
        headers: { Authorization: `Bearer ${t}` },
      });
      const s = res.data?.data;
      if (s) {
        setTodayTotalActiveMs((s.todayTotalActiveSeconds ?? 0) * 1000);
        setActivityStartAt(s.currentIntervalStartAt ? new Date(s.currentIntervalStartAt).getTime() : null);
      }
    } catch {}
  }, []);

  // Poll activity state every 30s so the timer stays in sync with the tray
  React.useEffect(() => {
    if (!token) return;
    fetchActivityState();
    const id = setInterval(fetchActivityState, 10_000);
    return () => clearInterval(id);
  }, [token, fetchActivityState]);

  // Real-time sync: receive time-clock events pushed by the backend (e.g. tray app clocks in/out)
  React.useEffect(() => {
    if (!token) return;
    const sock = initializeSocket(token);
    const sync = () => { refreshShiftState(); };
    // For time-in we delay the activity fetch so the tray heartbeat lands first
    const syncTimeIn = () => {
      refreshShiftState();
      // Optimistically mark as active so the timer doesn't flash "Idle" for
      // the 2.5s before fetchActivityState reads the confirmed heartbeat value.
      setActivityStartAt(Date.now());
      setTimeout(() => fetchActivityState(), 2500);
    };
    const syncTimeOut = () => {
      refreshShiftState();
      fetchActivityState();
    };
    sock.on('time-in', syncTimeIn);
    sock.on('time-out', syncTimeOut);
    sock.on('break-in', sync);
    sock.on('break-out', sync);
    return () => {
      sock.off('time-in', syncTimeIn);
      sock.off('time-out', syncTimeOut);
      sock.off('break-in', sync);
      sock.off('break-out', sync);
    };
  }, [token, refreshShiftState, fetchActivityState]);

  React.useEffect(() => {
    const check = async () => {
      const t = localStorage.getItem("crm_token");
      if (!t) {
        router.replace("/crm");
        return;
      }
      try {
        const res = await apiClient.get("/api/crm/me", {
          headers: { Authorization: `Bearer ${t}` },
        });
        const data = res.data?.data || res.data;
        const profileRes = await apiClient.get("/api/profile").catch(() => null);
        const profile = profileRes?.data?.data || profileRes?.data;
        const profileAvatar = profile?.avatarUrl || profile?.avatar;
        setUser({
          ...data,
          avatar: withAvatarCacheBust(profileAvatar || data.avatarUrl || data.avatar),
        });
        setToken(t);
        setTodayLogs(data.todayTimeLogs || []);
      } catch {
        localStorage.removeItem("crm_token");
        localStorage.removeItem("crm_user");
        router.replace("/crm");
      } finally {
        setIsLoading(false);
      }
    };
    check();
  }, [router]);

  const handleExit = async () => {
    try {
      await apiClient.post(
        "/api/crm/logout",
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch { }
    localStorage.removeItem("crm_token");
    localStorage.removeItem("crm_user");
    router.push("/");
  };

  const handleClock = async (type: "time-in" | "time-out") => {
    setIsClocking(true);
    setClockMsg("");
    try {
      const res = await apiClient.post(
        "/api/crm/time-clock",
        { type },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = res.data?.data || res.data;
      setTodayLogs(data.todayLogs || []);
      if (type === "time-out") {
        setIsOnBreak(false);
        setBreakAccumulatedMs(0);
      }
      setClockMsg(
        `${type === "time-in" ? "Clocked in" : "Clocked out"} at ${fmt(new Date())}`,
      );
      // Re-fetch activity state after a short delay so the tray's pingHeartbeat
      // has time to update currentIntervalStartAt on the server before we read it.
      setTimeout(() => fetchActivityState(), 2500);
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setClockMsg(apiError.response?.data?.message || "Failed");
      // Re-fetch so the buttons reflect the real server state
      // (e.g. 400 on time-in means we're already on shift via tray app)
      refreshShiftState();
    } finally {
      setIsClocking(false);
    }
  };

  // Check if the tray app is running before allowing clock-in.
  // If unreachable, show the download modal instead of starting the shift.
  const checkTrayAndStartShift = React.useCallback(async () => {
    setTrayChecking(true);
    try {
      const res = await fetch("http://127.0.0.1:18642/", {
        method: "GET",
        signal: AbortSignal.timeout(2000),
      });
      // Any HTTP response means the server is up
      if (res.status < 600) {
        setShowTrayModal(false);
        handleClock("time-in");
      } else {
        setShowTrayModal(true);
      }
    } catch {
      setShowTrayModal(true);
    } finally {
      setTrayChecking(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBreak = async () => {
    setClockMsg("");
    if (!isOnBreak) {
      setIsOnBreak(true);
      try {
        const res = await apiClient.post(
          "/api/crm/time-clock",
          { type: "break-in" },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const d = res.data?.data || res.data;
        if (d?.todayLogs) setTodayLogs(d.todayLogs);
      } catch { }
      setClockMsg(`Break started at ${fmt(new Date())}`);
    } else {
      setIsOnBreak(false);
      try {
        const res = await apiClient.post(
          "/api/crm/time-clock",
          { type: "break-out" },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const d = res.data?.data || res.data;
        if (d?.todayLogs) setTodayLogs(d.todayLogs);
      } catch { }
      setClockMsg(`Break ended at ${fmt(new Date())}`);
    }
  };

  // Sort ascending so we can find the most recent session pair correctly
  const sortedLogs = React.useMemo(
    () => [...(todayLogs || [])].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    ),
    [todayLogs],
  );

  // Most recent time-in entry (current or last session)
  const timeIn = [...sortedLogs].reverse().find(l => l.type === "time-in");
  // Most recent time-out AFTER that time-in (current session only)
  const timeOut = timeIn
    ? [...sortedLogs].reverse().find(
        l => l.type === "time-out" &&
          new Date(l.timestamp).getTime() >= new Date(timeIn.timestamp).getTime()
      )
    : undefined;

  const hasClockedIn = !!timeIn;
  const hasClockedOut = !!timeOut;
  const isActive = hasClockedIn && !hasClockedOut;
  const isComplete = hasClockedOut;

  // Derive break state from server logs so tray ↔ CRM stays in sync
  React.useEffect(() => {
    if (!timeIn) return;
    const sessionStart = new Date(timeIn.timestamp).getTime();
    const breakLogs = sortedLogs.filter(
      l => (l.type === "break-in" || l.type === "break-out") &&
           new Date(l.timestamp).getTime() >= sessionStart
    );
    let accumulated = 0;
    let currentBreakStart: number | null = null;
    for (const log of breakLogs) {
      if (log.type === "break-in") {
        currentBreakStart = new Date(log.timestamp).getTime();
      } else if (log.type === "break-out" && currentBreakStart !== null) {
        accumulated += new Date(log.timestamp).getTime() - currentBreakStart;
        currentBreakStart = null;
      }
    }
    setBreakAccumulatedMs(accumulated);
    setIsOnBreak(currentBreakStart !== null);
  }, [sortedLogs]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sum all completed sessions BEFORE the current active time-in
  const previousSessionsMs = React.useMemo(() => {
    if (!timeIn) return 0;
    const currentStart = new Date(timeIn.timestamp).getTime();
    let total = 0;
    let sessionIn: number | null = null;
    for (const log of sortedLogs) {
      const ts = new Date(log.timestamp).getTime();
      if (ts >= currentStart) break;
      if (log.type === "time-in") {
        sessionIn = ts;
      } else if (log.type === "time-out" && sessionIn !== null) {
        total += ts - sessionIn;
        sessionIn = null;
      }
    }
    return total;
  }, [sortedLogs, timeIn]);

  const finalHours = React.useMemo(() => {
    if (!timeIn || !timeOut) return null;
    // Last session net time
    const lastSessionMs =
      new Date(timeOut.timestamp).getTime() -
      new Date(timeIn.timestamp).getTime();
    // Total = prior completed sessions + last session net (break-deducted)
    const workedMs = previousSessionsMs + Math.max(0, lastSessionMs - breakAccumulatedMs);
    const h = Math.floor(workedMs / 3600000);
    const m = Math.floor((workedMs % 3600000) / 60000);
    return `${h}h ${m}m`;
  }, [timeIn, timeOut, breakAccumulatedMs, previousSessionsMs]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-full bg-white dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-14 w-14">
            <div className="absolute inset-0 rounded-2xl bg-emerald-500/10 animate-ping" />
            <div className="relative h-14 w-14 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-emerald-500/20 flex items-center justify-center">
              <Car className="h-6 w-6 text-emerald-500" />
            </div>
          </div>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-600 tracking-[0.3em] uppercase font-bold">
            Loading workspace
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const userAvatarSrc = resolveImageUrl(user.avatar || user.avatarUrl);
  const greeting = getGreeting(user.fullName.split(" ")[0]);
  const todayStr = toMDT(new Date()).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  const quickActions = [
    {
      icon: <Users className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />,
      label: "Leads",
      route: "/crm/leads",
    },
    {
      icon: <Activity className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />,
      label: "Service Hub",
      route: "/crm/appointments/dashboard",
    },
    {
      icon: (
        <CalendarCheck className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
      ),
      label: "Appointments",
      route: "/crm/appointments/dashboard",
    },
    {
      icon: (
        <CalendarDays className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
      ),
      label: "Timeproof",
      route: "/crm/timeproof",
    },
    {
      icon: (
        <Tag className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
      ),
      label: "Finance Line",
      route: "/crm/aftermarket",
    },
    {
      icon: <Trophy className="h-5 w-5 text-amber-500 dark:text-amber-400" />,
      label: "Leaderboard",
      route: "/crm/leaderboard",
      accent: "amber" as const,
    },
  ];

  return (
    <TooltipProvider>
      <div className="min-h-full w-full bg-zinc-50 dark:bg-zinc-950 relative overflow-hidden transition-colors duration-300 flex flex-col">
        <div
          className="fixed inset-0 pointer-events-none overflow-hidden"
          aria-hidden
        >
          <div className="absolute -top-64 -left-64 w-150 h-150 rounded-full bg-emerald-500/4 dark:bg-emerald-500/3 blur-3xl" />
          <div className="absolute top-1/3 -right-48 w-125 h-125 rounded-full bg-emerald-600/5 dark:bg-emerald-600/4 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-100 h-100 rounded-full bg-emerald-400/3 dark:bg-emerald-400/2 blur-3xl" />
        </div>

        <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl transition-colors duration-300">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="relative h-9 w-9 rounded-xl bg-linear-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-900/20 dark:shadow-emerald-900/50">
                <Car className="h-4 w-4 text-white" />
                <div className="absolute inset-0 rounded-xl ring-1 ring-emerald-400/30" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-black text-zinc-900 dark:text-white leading-none tracking-tight">
                  Action Auto
                </p>
                <p className="text-[9px] uppercase tracking-[0.3em] text-emerald-500 mt-0.5 font-bold">
                  Workspace
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <LiveClock />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 gap-2 pl-1.5 pr-3 rounded-full border border-zinc-200/80 dark:border-zinc-700/60 bg-white/80 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:border-zinc-300/60 dark:hover:border-zinc-600/60 backdrop-blur-sm transition-all duration-200"
                  >
                    <Avatar className="h-6 w-6 ring-1 ring-emerald-500/30">
                      <AvatarImage src={userAvatarSrc} />
                      <AvatarFallback className="bg-linear-to-br from-emerald-600 to-emerald-800 text-white text-[9px] font-black">
                        {ini(user.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-xs font-semibold text-zinc-700 dark:text-zinc-200 max-w-25 truncate">
                      {user.fullName}
                    </span>
                    <ChevronDown className="h-3 w-3 text-zinc-400 dark:text-zinc-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-60 rounded-2xl p-0 overflow-hidden shadow-2xl shadow-black/10 dark:shadow-black/50 border-zinc-200/80 dark:border-zinc-700/60 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl"
                >
                  <div className="p-4 bg-linear-to-br from-zinc-50 to-white dark:from-zinc-800/50 dark:to-zinc-900/50">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 ring-2 ring-emerald-500/20">
                        <AvatarImage src={userAvatarSrc} />
                        <AvatarFallback className="bg-linear-to-br from-emerald-600 to-emerald-800 text-white text-xs font-black">
                          {ini(user.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate">
                          {user.fullName}
                        </p>
                        <p className="text-[11px] text-zinc-500 truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="m-0 bg-zinc-100 dark:bg-zinc-800/60" />
                  <div className="p-1.5">
                    <DropdownMenuItem
                      onClick={() => router.push("/crm/profile")}
                      className="rounded-xl text-xs h-9 gap-2.5 cursor-pointer text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 focus:bg-zinc-100 dark:focus:bg-zinc-800/60"
                    >
                      <User className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />{" "}
                      My Profile
                    </DropdownMenuItem>

                      <DropdownMenuItem
                      onClick={() => router.push("/crm/biometrics")}
                      className="rounded-xl text-xs h-9 gap-2.5 cursor-pointer text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 focus:bg-zinc-100 dark:focus:bg-zinc-800/60"
                    >
                      <Fingerprint className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />{" "}
                     Biometrics
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push("/crm/settings")}
                      className="rounded-xl text-xs h-9 gap-2.5 cursor-pointer text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 focus:bg-zinc-100 dark:focus:bg-zinc-800/60"
                    >
                      <Settings className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />{" "}
                      Settings
                    </DropdownMenuItem>
                  </div>
                  <DropdownMenuSeparator className="m-0 bg-zinc-100 dark:bg-zinc-800/60" />
                  <div className="p-1.5">
                    <DropdownMenuItem
                      onClick={handleExit}
                      className="rounded-xl text-xs h-9 gap-2.5 cursor-pointer text-red-500 dark:text-red-400 focus:text-red-600 dark:focus:text-red-300 focus:bg-red-50 dark:focus:bg-red-500/10"
                    >
                      <LogOut className="h-3.5 w-3.5" /> Exit CRM
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-7 flex-1 min-h-0 overflow-y-auto">
          <div
            className={cn(
              "flex items-center justify-between transition-all duration-700",
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
            )}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-center shadow-sm">
                {greeting.icon}
              </div>
              <div>
                <h1 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
                  {greeting.text}
                </h1>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 font-mono">
                  {todayStr}
                </p>
              </div>
              <Badge className="hidden sm:inline-flex text-[10px] h-5 px-2.5 rounded-full capitalize font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 ml-1">
                {user.role}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div
              className={cn(
                "lg:col-span-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-900/40 backdrop-blur-sm flex flex-col overflow-hidden shadow-sm dark:shadow-none",
                "transition-all duration-700 delay-100",
                mounted
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6",
              )}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-zinc-400 dark:text-zinc-600" />
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400 dark:text-zinc-500">
                    Time Clock
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full transition-colors duration-500",
                      isOnBreak
                        ? "bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                        : isActive
                          ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                          : isComplete
                            ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                            : "bg-zinc-300 dark:bg-zinc-700",
                    )}
                  />
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wider transition-colors duration-500",
                      isOnBreak
                        ? "text-amber-500"
                        : isActive
                          ? "text-emerald-500 dark:text-emerald-400"
                          : isComplete
                            ? "text-emerald-500"
                            : "text-zinc-400 dark:text-zinc-600",
                    )}
                  >
                    {isOnBreak
                      ? "On Break"
                      : isActive
                        ? "On Shift"
                        : isComplete
                          ? "Completed"
                          : "Off Clock"}
                  </span>
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center px-8 py-8 min-h-55">
                {isActive && (
                  <ActivityTimer
                    todayTotalActiveMs={todayTotalActiveMs}
                    activityStartAt={activityStartAt}
                    isOnShift={isActive}
                  />
                )}
                {isComplete && (
                  <div className="text-center space-y-3">
                    <div className="relative inline-flex">
                      <CheckCircle2 className="h-12 w-12 text-emerald-500 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                    </div>
                    <p className="text-5xl font-mono font-black tracking-tighter text-zinc-900 dark:text-white">
                      {finalHours}
                    </p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.2em] font-bold">
                      Shift Complete
                    </p>
                  </div>
                )}
                {!hasClockedIn && (
                  <div className="text-center space-y-4">
                    <div className="relative mx-auto w-20 h-20">
                      <div
                        className="absolute inset-0 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 animate-spin"
                        style={{ animationDuration: "8s" }}
                      />
                      <div className="absolute inset-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 flex items-center justify-center">
                        <Activity className="h-7 w-7 text-zinc-300 dark:text-zinc-700" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
                        Ready to clock in?
                      </p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-1">
                        Start tracking your shift
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-5 py-4 border-t border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/20">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    {
                      label: "Time In",
                      value: timeIn ? fmt(new Date(timeIn.timestamp)) : "——",
                    },
                    {
                      label: "Time Out",
                      value: timeOut ? fmt(new Date(timeOut.timestamp)) : "——",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/40 px-3 py-2.5 shadow-sm dark:shadow-none"
                    >
                      <p className="text-[9px] uppercase tracking-widest text-zinc-400 dark:text-zinc-600 font-bold mb-1">
                        {item.label}
                      </p>
                      <p className="text-xl font-mono font-black tabular-nums text-zinc-900 dark:text-white leading-none">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                {!isActive && (
                  <Button
                    onClick={checkTrayAndStartShift}
                    disabled={isClocking || trayChecking}
                    className="w-full h-12 rounded-xl font-black text-sm gap-2 transition-all duration-200 bg-linear-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white border-0 shadow-lg shadow-emerald-500/20 dark:shadow-emerald-900/40 hover:shadow-emerald-500/30 dark:hover:shadow-emerald-800/50 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {(isClocking || trayChecking) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" /> Start Shift{" "}
                        <ArrowRight className="h-4 w-4 ml-auto opacity-60" />
                      </>
                    )}
                  </Button>
                )}
                {isActive && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={handleBreak}
                      className={cn(
                        "h-11 rounded-xl font-bold gap-2 transition-all duration-200 border text-sm",
                        isOnBreak
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                          : "border-zinc-200 dark:border-zinc-700/60 bg-zinc-50 dark:bg-zinc-800/40 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-500/30",
                      )}
                    >
                      {isOnBreak ? (
                        <>
                          <Play className="h-4 w-4" /> Resume
                        </>
                      ) : (
                        <>
                          <Coffee className="h-4 w-4" /> Break
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => handleClock("time-out")}
                      disabled={isClocking || isOnBreak}
                      className="h-11 rounded-xl font-bold gap-2 transition-all duration-200 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 hover:border-red-300 dark:hover:border-red-400/40 disabled:opacity-30 text-sm"
                    >
                      {isClocking ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <LogOut className="h-4 w-4" /> End Shift
                        </>
                      )}
                    </Button>
                  </div>
                )}
                {clockMsg && (
                  <p className="text-[11px] text-center text-emerald-600 dark:text-emerald-400/70 font-mono mt-2">
                    {clockMsg}
                  </p>
                )}
              </div>
            </div>

            <div className="lg:col-span-8 flex flex-col gap-5">
              <div
                className={cn(
                  "rounded-2xl border border-zinc-200/80 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-900/40 backdrop-blur-sm p-6 overflow-hidden relative shadow-sm dark:shadow-none",
                  "transition-all duration-700 delay-200",
                  mounted
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-6",
                )}
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-linear-to-bl from-emerald-500/4 to-transparent rounded-bl-[100px]" />

                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 mb-5">
                  My Profile
                </p>

                <div className="flex items-center gap-5 pb-5 border-b border-zinc-100 dark:border-zinc-800/60">
                  <div className="relative shrink-0">
                    <div className="absolute -inset-1 rounded-full bg-linear-to-br from-emerald-500/30 to-emerald-700/10 animate-[spin_6s_linear_infinite]" />
                    <Avatar className="relative h-16 w-16 ring-2 ring-zinc-200 dark:ring-zinc-800">
                      <AvatarImage src={userAvatarSrc} />
                      <AvatarFallback className="bg-linear-to-br from-emerald-600 to-emerald-800 text-white text-lg font-black">
                        {ini(user.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    {isActive && (
                      <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-black text-zinc-900 dark:text-white leading-tight">
                      {user.fullName}
                    </p>
                    <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-0.5 font-mono">
                      {user.email}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      <Badge className="text-[10px] h-5 px-2.5 rounded-full font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700/60">
                        {user.username}
                      </Badge>
                      <Badge className="text-[10px] h-5 px-2.5 rounded-full capitalize font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20">
                        {user.role}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4">
                  <StatChip label="Full Name" value={user.fullName} />
                  <StatChip
                    label="Employee ID"
                    value={user.username}
                    breakMode="all"
                    copyable
                  />
                  <StatChip label="Role" value={user.role} capitalize />
                </div>
              </div>

              {/* Quick Actions card */}
              <div
                className={cn(
                  "rounded-2xl border border-zinc-200/80 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-900/40 backdrop-blur-sm p-6 flex-1 shadow-sm dark:shadow-none",
                  "transition-all duration-700 delay-300",
                  mounted
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-6",
                )}
              >
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 mb-5">
                  Quick Actions
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {quickActions.map((action, i) => (
                    <div
                      key={action.label}
                      className="transition-all duration-500"
                      style={{
                        transitionDelay: mounted ? `${300 + i * 60}ms` : "0ms",
                        opacity: mounted ? 1 : 0,
                        transform: mounted
                          ? "translateY(0)"
                          : "translateY(12px)",
                      }}
                    >
                      <QuickAction
                        icon={action.icon}
                        label={action.label}
                        onClick={() => router.push(action.route)}
                        accent={action.accent ?? "emerald"}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <SupraLeoAI />
      <DashboardNotifications
        user={user}
        token={token}
        hasClockedIn={hasClockedIn}
      />
      <AutrixWelcomeGate
        userName={user.fullName}
        isReady={!isLoading && !!user}
      />
      <CrmPushPrompt role={user.role} />

      {/* CRM Tray App connect banner — appears once after login */}
      {trayBanner && (
        <div className="fixed bottom-5 right-5 z-50 w-76 rounded-2xl bg-zinc-900 border border-zinc-700/50 shadow-2xl shadow-black/60 overflow-hidden"
          style={{ animation: "slideUp 0.3s ease-out" }}>
          <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MonitorDot className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white leading-tight">Connect CRM Tray App</p>
                <p className="text-xs text-zinc-400 mt-0.5 leading-snug">Open your desktop agent to enable time tracking &amp; screenshots.</p>
              </div>
              <button
                onClick={dismissTrayBanner}
                className="text-zinc-600 hover:text-zinc-400 transition-colors mt-0.5 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={openTrayApp}
                className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <MonitorDot className="h-3.5 w-3.5" />
                Open CRM Tray-App
              </button>
              <button
                onClick={dismissTrayBanner}
                className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-bold transition-colors"
              >
                Later
              </button>
            </div>
            <p className="text-[10px] text-zinc-600 text-center mt-2">Check &ldquo;Always allow&rdquo; in the browser dialog to auto-connect next time.</p>
          </div>
        </div>
      )}

      {/* ── Tray App Required Modal ── */}
      {showTrayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowTrayModal(false)}
          />

          {/* Card */}
          <div
            className="relative z-10 w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-700/60 shadow-2xl shadow-black/70 overflow-hidden"
            style={{ animation: "slideUp 0.25s ease-out" }}
          >
            <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }`}</style>

            {/* Close */}
            <button
              onClick={() => setShowTrayModal(false)}
              className="absolute top-3 right-3 h-7 w-7 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <div className="px-6 pt-6 pb-5 space-y-5">
              {/* Icon + heading */}
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <MonitorDot className="h-8 w-8 text-emerald-400" />
                </div>
                <div>
                  <p className="text-base font-black text-white">Tray App Required</p>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    The <span className="text-white font-semibold">Action Auto CRM Tray App</span> must be installed and running to track your shift, capture screenshots, and monitor activity.
                  </p>
                </div>
              </div>

              {/* Steps */}
              <div className="rounded-xl bg-zinc-800/60 border border-zinc-700/40 px-4 py-3 space-y-2">
                {[
                  "Download and install the tray app below",
                  "Launch it — it will appear in your system tray",
                  "Come back here and click Start Shift",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="h-4 w-4 rounded-full bg-emerald-600/20 border border-emerald-500/30 text-[9px] font-black text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <a
                  href={process.env.NEXT_PUBLIC_TRAY_DOWNLOAD_URL ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download Tray App
                </a>
                <button
                  onClick={async () => {
                    try { window.location.href = `actionauto://auth?token=${encodeURIComponent(token)}`; } catch {}
                    // After firing the deep link, re-check after a short delay
                    await new Promise(r => setTimeout(r, 3000));
                    setTrayChecking(true);
                    try {
                      const res = await fetch("http://127.0.0.1:18642/", { method: "GET", signal: AbortSignal.timeout(2000) });
                      if (res.status < 600) { setShowTrayModal(false); handleClock("time-in"); }
                    } catch { /* still not running */ } finally { setTrayChecking(false); }
                  }}
                  disabled={trayChecking}
                  className="flex w-full items-center justify-center gap-2 h-10 rounded-xl border border-zinc-700/60 bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-300 text-xs font-bold transition-colors disabled:opacity-50"
                >
                  <MonitorDot className="h-3.5 w-3.5" />
                  Already Installed — Open It
                </button>
                <button
                  onClick={async () => {
                    setTrayChecking(true);
                    try {
                      const res = await fetch("http://127.0.0.1:18642/", { method: "GET", signal: AbortSignal.timeout(2000) });
                      if (res.status < 600) { setShowTrayModal(false); handleClock("time-in"); }
                      else toast.error("Tray app not detected. Make sure it is running.");
                    } catch { toast.error("Tray app not detected. Make sure it is running."); }
                    finally { setTrayChecking(false); }
                  }}
                  disabled={trayChecking}
                  className="flex w-full items-center justify-center gap-2 h-9 rounded-xl text-zinc-500 hover:text-zinc-300 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {trayChecking
                    ? <><Loader2 className="h-3 w-3 animate-spin" /> Checking…</>
                    : <><RefreshCw className="h-3 w-3" /> Check Again</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </TooltipProvider>
  );
}

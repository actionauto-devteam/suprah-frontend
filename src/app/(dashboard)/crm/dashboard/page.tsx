"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Car,
  LogOut,
  Copy,
  Check,
  Clock,
  Loader2,
  CheckCircle2,
  CalendarDays,
  Sun,
  Moon,
  Sunset,
  ArrowRight,
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
  AlertTriangle,
  ShieldAlert,
  Headset,
  Gift,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { apiClient } from "@/lib/api-client";
import { initializeSocket } from "@/lib/socket.client";
import { SupraLeoAI } from "@/components/supra-leo-ai/SupraLeoAI";
import { DashboardNotifications } from "@/components/crm/DashboardNotifications";
import { AutrixWelcomeGate } from "@/components/supra-leo-ai/AutrixWelcomeSystem";
import { CrmPushPrompt } from "@/components/crm/CrmPushPrompt";
import { cn, resolveImageUrl } from "@/lib/utils";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

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

// Target length of a standard shift — drives the radial gauge fill.
const SHIFT_TARGET_MS = 8 * 60 * 60 * 1000;

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
  return toMDT(d).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
}

type ApiError = {
  response?: {
    status?: number;
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

// ─── Signature element: radial shift-progress gauge ──────────────────────────
// An instrument-cluster ring that fills toward the 8h target. The same gauge
// frame is reused across every clock state (tracking / break / complete / idle)
// so the card always reads like one consistent telemetry dial.
type GaugeAccent = "emerald" | "amber" | "red" | "zinc";
function ShiftGauge({
  progress,
  accent,
  glow = false,
  children,
}: {
  progress: number;
  accent: GaugeAccent;
  glow?: boolean;
  children: React.ReactNode;
}) {
  const R = 86;
  const CIRC = 2 * Math.PI * R;
  const pct = Math.min(1, Math.max(0, progress));
  const dash = CIRC * pct;
  const accentText =
    accent === "amber"
      ? "text-amber-500 dark:text-amber-400"
      : accent === "red"
        ? "text-red-500 dark:text-red-400"
        : accent === "zinc"
          ? "text-zinc-300 dark:text-zinc-700"
          : "text-emerald-500 dark:text-emerald-400";
  const glowColor =
    accent === "amber"
      ? "rgba(245,158,11,0.45)"
      : accent === "red"
        ? "rgba(239,68,68,0.45)"
        : "rgba(16,185,129,0.5)";
  return (
    <div className="relative h-44 w-44 shrink-0 sm:h-52 sm:w-52">
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
        <circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          strokeWidth="6"
          className="stroke-current text-zinc-200/70 dark:text-zinc-800/90"
        />
        <circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${CIRC}`}
          className={cn(
            "stroke-current transition-all duration-700 motion-reduce:transition-none",
            accentText,
          )}
          style={glow ? { filter: `drop-shadow(0 0 7px ${glowColor})` } : undefined}
        />
      </svg>
      {/* inner hairline ring for the instrument-bezel feel */}
      <div className="absolute inset-3.5 rounded-full border border-zinc-200/50 dark:border-white/4" />
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

function ActivityTimer({
  todayTotalActiveMs,
  activityStartAt,
  isOnShift,
  isOnBreak,
  breakTotalMs,
  currentBreakStartAt,
}: {
  todayTotalActiveMs: number;
  activityStartAt: number | null;
  isOnShift: boolean;
  isOnBreak: boolean;
  breakTotalMs: number;
  currentBreakStartAt: number | null;
}) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const liveMs = activityStartAt ? Math.max(0, now - activityStartAt) : 0;
  const totalMs = todayTotalActiveMs + liveMs;
  // "Active" means the timer is actually ticking. Without activityStartAt the
  // display is frozen, so labelling it "Active — Tracking" is misleading. The
  // fallback for the just-clocked-in case (todayTotalActiveMs===0) is gated to
  // when we actually have a live interval; otherwise we show the paused state.
  const isActive = activityStartAt !== null;

  const breakLiveMs = currentBreakStartAt
    ? Math.max(0, now - currentBreakStartAt)
    : 0;
  const totalBreakMs = breakTotalMs + breakLiveMs;
  // 5-minute grace period: orange up to 1h04:59, red at 1h05:00+
  const BREAK_LIMIT_MS = 65 * 60 * 1000;
  const breakExceeded = isOnBreak && totalBreakMs >= BREAK_LIMIT_MS;

  const pad = (n: number) => n.toString().padStart(2, "0");
  const toHMS = (ms: number) => ({
    h: Math.floor(ms / 3600000),
    m: Math.floor((ms % 3600000) / 60000),
    s: Math.floor((ms % 60000) / 1000),
  });

  const displayMs = isOnBreak ? totalBreakMs : totalMs;
  const worked = toHMS(displayMs);
  const units = [
    { v: pad(worked.h), l: "HRS" },
    { v: pad(worked.m), l: "MIN" },
    { v: pad(worked.s), l: "SEC" },
  ];

  // Gauge always tracks progress of the actual shift toward the 8h target,
  // independent of break time, so the dial doesn't lie while paused.
  const shift = toHMS(totalMs);
  const shiftProgress = totalMs / SHIFT_TARGET_MS;
  const accent: GaugeAccent = isOnBreak
    ? breakExceeded
      ? "red"
      : "amber"
    : isActive
      ? "emerald"
      : "zinc";

  const centerColor = isOnBreak
    ? breakExceeded
      ? "text-red-500 dark:text-red-400"
      : "text-amber-500 dark:text-amber-400"
    : isActive
      ? "text-zinc-900 dark:text-white"
      : "text-zinc-400 dark:text-zinc-600";

  const stateLabel = isOnBreak
    ? breakExceeded
      ? "Break over"
      : "On break"
    : isActive
      ? "Tracking"
      : isOnShift
        ? "Paused"
        : "Off clock";

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <ShiftGauge
        progress={shiftProgress}
        accent={accent}
        glow={isActive || isOnBreak}
      >
        <div className="flex flex-col items-center gap-1 px-6 text-center">
          <span
            className={cn(
              "text-[9px] font-black uppercase tracking-[0.25em]",
              accent === "amber"
                ? "text-amber-500 dark:text-amber-400"
                : accent === "red"
                  ? "text-red-500 dark:text-red-400"
                  : accent === "emerald"
                    ? "text-emerald-500 dark:text-emerald-400"
                    : "text-zinc-400 dark:text-zinc-600",
            )}
          >
            {stateLabel}
          </span>
          <div className="flex items-end gap-0.5 font-mono font-black leading-none tracking-tighter">
            {units.map((item, i) => (
              <React.Fragment key={item.l}>
                {i > 0 && (
                  <span
                    className={cn(
                      "mb-0.5 text-base opacity-30 sm:text-lg",
                      centerColor,
                    )}
                  >
                    :
                  </span>
                )}
                <span
                  className={cn(
                    "text-2xl tabular-nums transition-colors duration-500 sm:text-3xl",
                    centerColor,
                  )}
                >
                  <AnimatedDigit value={item.v[0]} />
                  <AnimatedDigit value={item.v[1]} />
                </span>
              </React.Fragment>
            ))}
          </div>
          <span className="font-mono text-[10px] font-bold tabular-nums text-zinc-400 dark:text-zinc-600">
            {pad(shift.h)}h {pad(shift.m)}m{" "}
            <span className="opacity-50">/ 8h</span>
          </span>
        </div>
      </ShiftGauge>

      {breakExceeded && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">
            Break limit exceeded
          </p>
          <p className="mt-0.5 text-[9px] text-red-400/60">
            Over 1h 5m — please resume your shift
          </p>
        </div>
      )}
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
        "group relative flex h-full w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl p-3 min-h-22 sm:gap-2.5 sm:p-4 sm:min-h-25",
        "border border-zinc-200/80 bg-white/60 backdrop-blur-sm dark:border-white/6 dark:bg-zinc-900/40",
        "cursor-pointer transition-all duration-300 hover:bg-white dark:hover:bg-zinc-800/50",
        "hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] motion-reduce:transform-none",
        accent === "amber"
          ? "hover:border-amber-500/30 hover:shadow-[0_0_22px_-6px_rgba(245,158,11,0.35)]"
          : "hover:border-emerald-500/30 hover:shadow-[0_0_22px_-6px_rgba(16,185,129,0.35)]",
      )}
    >
      {/* corner telemetry tick */}
      <span
        className={cn(
          "absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          accent === "amber" ? "bg-amber-400" : "bg-emerald-400",
        )}
      />
      <div className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/6 to-transparent transition-transform duration-700 ease-in-out group-hover:translate-x-full motion-reduce:hidden dark:via-white/3" />
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 sm:h-11 sm:w-11",
          "bg-zinc-100 group-hover:scale-110 dark:bg-zinc-800/80",
          accent === "amber"
            ? "group-hover:bg-amber-500/10 group-hover:shadow-[0_0_16px_-4px_rgba(245,158,11,0.4)]"
            : "group-hover:bg-emerald-500/10 group-hover:shadow-[0_0_16px_-4px_rgba(16,185,129,0.4)]",
        )}
      >
        {icon}
      </div>
      <span className="line-clamp-2 text-center text-[10px] font-bold uppercase leading-tight tracking-wide text-zinc-500 transition-colors duration-300 group-hover:text-zinc-800 dark:text-zinc-400 dark:group-hover:text-zinc-200 sm:text-[11px]">
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
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(true);
        toast.success(`${label} copied`);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => { });
  }, [value, label]);

  return (
    <div className="min-w-0 rounded-xl border border-zinc-200/60 bg-white/50 px-4 py-3 backdrop-blur-sm transition-colors duration-200 hover:border-emerald-500/20 dark:border-white/5 dark:bg-zinc-900/40 dark:hover:border-emerald-500/20">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600">
          {label}
        </p>
        {copyable && (
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-200/80 bg-zinc-100/85 px-2 py-1 text-[10px] font-bold text-zinc-500 transition-colors hover:text-emerald-600 dark:border-zinc-700/70 dark:bg-zinc-800/70 dark:text-zinc-300 dark:hover:text-emerald-400"
            aria-label={`Copy ${label}`}
            title={copied ? "Copied!" : `Copy ${label}`}
          >
            {copied ? (
              <Check className="h-3 w-3" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        )}
      </div>
      <p
        className={cn(
          "text-sm font-bold leading-snug text-zinc-700 dark:text-zinc-200",
          breakMode === "all" ? "break-all" : "wrap-break-word",
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
  const [serverIsOnShift, setServerIsOnShift] = React.useState(false);
  const [serverIsShiftFromToday, setServerIsShiftFromToday] = React.useState(false);
  const [locallyResumedShift, setLocallyResumedShift] = React.useState(
    () => sessionStorage.getItem('crm_resumed_shift') === 'true'
  );
  const [serverShiftStartedAt, setServerShiftStartedAt] = React.useState<string | null>(null);
  const [todayTotalActiveMs, setTodayTotalActiveMs] = React.useState(0);
  const [activityStartAt, setActivityStartAt] = React.useState<number | null>(
    null,
  );
  const [currentBreakStartAt, setCurrentBreakStartAt] = React.useState<
    number | null
  >(null);
  const [resumeModal, setResumeModal] = React.useState(false);
  const [resumeOriginalClockIn, setResumeOriginalClockIn] = React.useState<string | null>(null);
  const [showEarlyEndModal, setShowEarlyEndModal] = React.useState(false);
  const isMobile = useIsMobile();
  const [showConfirmEndModal, setShowConfirmEndModal] = React.useState(false);
  const [earlyEndReason, setEarlyEndReason] = React.useState("");
  const [earlyEndDetails, setEarlyEndDetails] = React.useState("");
  const [earlyEndSubmitting, setEarlyEndSubmitting] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    const pending = localStorage.getItem("pending_tray_auth");
    if (!pending) return;

    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 2000);

    fetch("http://127.0.0.1:18642/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: pending }),
      signal: controller.signal,
    })
      .then((res) => {
        clearTimeout(tid);
        if (res.ok) {
          localStorage.removeItem("pending_tray_auth");
          // Tray connected silently — no banner needed
        } else {
          throw new Error("rejected");
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
    try {
      window.location.href = `actionauto://auth?token=${encodeURIComponent(trayToken)}`;
    } catch { }
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
    } catch { }
  }, []);

  // Sync whenever the user switches back to this tab
  React.useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden) refreshShiftState();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [refreshShiftState]);

  // Fetch activity state (idle-aware timer data) from getShiftState.
  // Also syncs break state directly from server so break color updates reliably
  // even when socket events are delayed or missed.
  const fetchActivityState = React.useCallback(async () => {
    const t = localStorage.getItem("crm_token");
    if (!t) return;
    try {
      const res = await apiClient.get("/api/crm/timeproof/shift-state", {
        headers: { Authorization: `Bearer ${t}` },
      });
      const s = res.data?.data;
      if (s) {
        setServerIsOnShift(!!s.isOnShift);
        setServerIsShiftFromToday(!!s.isShiftFromToday);
        setServerShiftStartedAt(s.shiftStartedAt ?? null);
        setTodayTotalActiveMs((s.todayTotalActiveSeconds ?? 0) * 1000);

        // Pick the live-interval start carefully:
        //  • Server says on-break or off-shift → clear local tracking
        //  • Server gave a fresh currentIntervalStartAt → use it
        //  • Otherwise → PRESERVE any existing local activityStartAt instead of
        //    clobbering to null. This is critical for the race after Resume from
        //    break: the user is actively tracking again, but the tray's heartbeat
        //    may not have caught up yet, so the server still returns null. Without
        //    this preservation, the CRM timer would freeze at "Idle — Paused" for
        //    up to 60 seconds while the heartbeat lags.
        //  • Fresh state with no prior tracking + shift started recently → Date.now()
        const SHIFT_AUTO_RESUME_MS = 5 * 60 * 1000;
        const shiftStartedMs = s.shiftStartedAt ? new Date(s.shiftStartedAt).getTime() : 0;
        const shiftStartedRecently = shiftStartedMs > 0
          && (Date.now() - shiftStartedMs) < SHIFT_AUTO_RESUME_MS;

        setActivityStartAt((prev) => {
          if (!s.isOnShift || s.isOnBreak) return null;
          if (s.currentIntervalStartAt) return new Date(s.currentIntervalStartAt).getTime();
          if (prev !== null) return prev;                   // ← keep local tracking through brief heartbeat lag
          if (shiftStartedRecently) return Date.now();
          return null;
        });
        // Break state (isOnBreak, currentBreakStartAt) is derived from todayLogs
        // via the break state effect — do NOT override here to avoid stale-server
        // data freezing the work timer at 00:00:00.
        // currentBreakStartAt is kept accurate via optimistic updates in handleBreak
        // and the syncBreakIn/syncBreakOut socket handlers.
      }
    } catch { }
  }, []);

  // Poll shift state every 5s — keeps timer, break state, and on-shift status in sync
  // with the tray even when socket events are delayed or dropped.
  React.useEffect(() => {
    if (!token) return;
    fetchActivityState();
    refreshShiftState();
    const actId = setInterval(fetchActivityState, 10_000);
    const shiftId = setInterval(refreshShiftState, 5_000);
    return () => {
      clearInterval(actId);
      clearInterval(shiftId);
    };
  }, [token, fetchActivityState, refreshShiftState]);

  // Real-time sync: receive time-clock events pushed by the backend (e.g. tray app clocks in/out)
  React.useEffect(() => {
    if (!token) return;
    const sock = initializeSocket(token);
    // For time-in we delay the activity fetch so the tray heartbeat lands first
    const syncTimeIn = () => {
      refreshShiftState();
      setActivityStartAt(Date.now());
      setTimeout(() => fetchActivityState(), 2500);
    };
    const syncTimeOut = () => {
      refreshShiftState();
      fetchActivityState();
    };
    // Optimistic break-in: stop work timer immediately and start break timer
    // from the SERVER's breakStartedAt (matches the tray exactly — both clients
    // are computing now() against the same reference). Using Date.now() would
    // drift from the tray by the network/clock skew between client and server.
    const syncBreakIn = (data?: { breakStartedAt?: string }) => {
      setActivityStartAt(null);
      setIsOnBreak(true);
      const breakStart = data?.breakStartedAt
        ? new Date(data.breakStartedAt).getTime()
        : Date.now();
      setCurrentBreakStartAt(breakStart);
      refreshShiftState();
      fetchActivityState();
    };
    // Optimistic break-out: stop break timer, restart work timer
    const syncBreakOut = () => {
      setIsOnBreak(false);
      setCurrentBreakStartAt(null);
      setActivityStartAt(Date.now());
      refreshShiftState();
      setTimeout(() => fetchActivityState(), 2500);
    };
    sock.on("time-in", syncTimeIn);
    sock.on("time-out", syncTimeOut);
    sock.on("break-in", syncBreakIn);
    sock.on("break-out", syncBreakOut);
    // Early-end reason — notify admin/manager with a toast
    const onEarlyEnd = (data: { fullName: string; reason: string }) => {
      if (user && ["admin", "manager"].includes(user.role)) {
        toast.warning("Early End Shift", {
          description: `${data.fullName}: "${data.reason}"`,
          duration: 10000,
        });
      }
    };
    sock.on("crm:early-end", onEarlyEnd);

    return () => {
      sock.off("time-in", syncTimeIn);
      sock.off("time-out", syncTimeOut);
      sock.off("break-in", syncBreakIn);
      sock.off("break-out", syncBreakOut);
      sock.off("crm:early-end", onEarlyEnd);
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
        const profileRes = await apiClient
          .get("/api/profile")
          .catch(() => null);
        const profile = profileRes?.data?.data || profileRes?.data;
        const profileAvatar = profile?.avatarUrl || profile?.avatar;
        setUser({
          ...data,
          avatar: withAvatarCacheBust(
            profileAvatar || data.avatarUrl || data.avatar,
          ),
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

  const handleClock = async (type: "time-in" | "time-out", note?: string) => {
    setIsClocking(true);
    setClockMsg("");
    // Always read the freshest token from storage — the React state copy is set
    // at page load and goes stale after the 12h CRM JWT expiry.
    const freshToken = localStorage.getItem("crm_token");
    if (!freshToken) {
      router.replace("/crm");
      return;
    }
    try {
      const res = await apiClient.post(
        "/api/crm/time-clock",
        { type, ...(note && { note }) },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { headers: { Authorization: `Bearer ${freshToken}` }, _skipAuthRefresh: true } as any,
      );
      const data = res.data?.data || res.data;
      setTodayLogs(data.todayLogs || []);
      if (type === "time-out") {
        setIsOnBreak(false);
        setBreakAccumulatedMs(0);
        setResumeOriginalClockIn(null);
        setLocallyResumedShift(false);
        sessionStorage.removeItem('crm_resumed_shift');
      }
      setClockMsg(
        `${type === "time-in" ? "Clocked in" : "Clocked out"} at ${fmt(new Date())}`,
      );
      // Re-fetch activity state after a short delay so the tray's pingHeartbeat
      // has time to update currentIntervalStartAt on the server before we read it.
      setTimeout(() => fetchActivityState(), 2500);
    } catch (err: unknown) {
      const apiError = err as ApiError;
      const msg = apiError.response?.data?.message || "Failed";
      const status = apiError.response?.status;

      // CRM token expired or invalid — clear stored credentials and redirect
      // to CRM login so the user can get a fresh token.
      if (status === 401) {
        localStorage.removeItem("crm_token");
        localStorage.removeItem("crm_user");
        router.replace("/crm");
        return;
      }

      // Graceful "Resume" path: backend already has an open clock-in (e.g. a
      // forgotten clock-out from earlier or yesterday that today's logs don't
      // surface). The user clicking Start Shift means they want to be on shift,
      // so treat this as a successful state-sync rather than a hard error.
      if (type === "time-in" && /already clocked in/i.test(msg)) {
        setLocallyResumedShift(true);
        sessionStorage.setItem('crm_resumed_shift', 'true');
        setClockMsg(`Resumed your open shift at ${fmt(new Date())}`);
        await refreshShiftState();
        setTimeout(() => fetchActivityState(), 2500);
      } else if (type === "time-out" && /must clock in before/i.test(msg)) {
        // Symmetric: user clicks End Shift but backend says no active session.
        // The CRM was showing on-shift from stale state — re-sync silently.
        setClockMsg("");
        await refreshShiftState();
      } else {
        setClockMsg(msg);
        refreshShiftState();
      }
    } finally {
      setIsClocking(false);
    }
  };

  // Check if the tray app is running before allowing clock-in.
  // If unreachable, show the download modal instead of starting the shift.
  const checkTrayAndStartShift = React.useCallback(async () => {
    if (isMobile) return;
    setTrayChecking(true);
    try {
      const res = await fetch("http://127.0.0.1:18642/", {
        method: "GET",
        signal: AbortSignal.timeout(2000),
      });
      if (res.status < 600) {
        setShowTrayModal(false);
        // Before clocking in, check if there's a resumable session from today
        try {
          const t = localStorage.getItem("crm_token");
          if (t) {
            const resumeRes = await apiClient.get("/api/crm/timeproof/resumable-shift", {
              headers: { Authorization: `Bearer ${t}` },
            });
            const d = resumeRes.data?.data;
            if (d?.resumable && d?.originalClockIn) {
              setResumeOriginalClockIn(d.originalClockIn);
              setResumeModal(true);
              return;
            }
          }
        } catch { }
        handleClock("time-in");
      } else {
        setShowTrayModal(true);
      }
    } catch {
      setShowTrayModal(true);
    } finally {
      setTrayChecking(false);
    }
  }, [isMobile]); // eslint-disable-line react-hooks/exhaustive-deps

  const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;

  const handleEndShiftClick = React.useCallback(() => {
    const currentTotalMs = todayTotalActiveMs + (activityStartAt ? Date.now() - activityStartAt : 0);
    if (currentTotalMs < EIGHT_HOURS_MS) {
      setShowEarlyEndModal(true);
    } else {
      setShowConfirmEndModal(true);
    }
  }, [todayTotalActiveMs, activityStartAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEarlyEndSubmit = async () => {
    if (!earlyEndReason) return;
    setEarlyEndSubmitting(true);
    try {
      const note = earlyEndDetails.trim()
        ? `${earlyEndReason} — ${earlyEndDetails.trim()}`
        : earlyEndReason;
      await handleClock("time-out", note);
      setShowEarlyEndModal(false);
      setEarlyEndReason("");
      setEarlyEndDetails("");
    } finally {
      setEarlyEndSubmitting(false);
    }
  };

  const handleBreak = async () => {
    setClockMsg("");
    if (!isOnBreak) {
      setIsOnBreak(true);
      setCurrentBreakStartAt(Date.now());
      setActivityStartAt(null);
      try {
        const res = await apiClient.post(
          "/api/crm/time-clock",
          { type: "break-in" },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const d = res.data?.data || res.data;
        if (d?.todayLogs) setTodayLogs(d.todayLogs);
      } catch { }
      refreshShiftState();
      setClockMsg(`Break started at ${fmt(new Date())}`);
    } else {
      setIsOnBreak(false);
      setCurrentBreakStartAt(null);
      setActivityStartAt(Date.now());
      try {
        const res = await apiClient.post(
          "/api/crm/time-clock",
          { type: "break-out" },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const d = res.data?.data || res.data;
        if (d?.todayLogs) setTodayLogs(d.todayLogs);
      } catch { }
      refreshShiftState();
      setTimeout(() => fetchActivityState(), 2500);
      setClockMsg(`Break ended at ${fmt(new Date())}`);
    }
  };

  // Sort ascending so we can find the most recent session pair correctly
  const sortedLogs = React.useMemo(
    () =>
      [...(todayLogs || [])].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      ),
    [todayLogs],
  );

  // Most recent time-in entry (current or last session)
  const timeIn = [...sortedLogs].reverse().find((l) => l.type === "time-in");
  // Most recent time-out AFTER that time-in (current session only)
  const timeOut = timeIn
    ? [...sortedLogs]
      .reverse()
      .find(
        (l) =>
          l.type === "time-out" &&
          new Date(l.timestamp).getTime() >=
          new Date(timeIn.timestamp).getTime(),
      )
    : undefined;

  // hasClockedIn / isActive incorporate the backend's `isOnShift` (from
  // getShiftState's 2-day lookback) so an unclosed clock-in from yesterday or
  // earlier today is still recognised even when today's todayTimeLogs is empty.
  // Without this the CRM would show "Ready to clock in" while backend rejects
  // Start Shift with "already clocked in", confusing the user.
  //
  // serverIsOnShift alone must NOT flip the UI on a new MDT day — an unclosed
  // shift from yesterday would make Break/End Shift appear instead of Start
  // Shift. We only fold it in when the server confirms the shift is from today
  // (serverIsShiftFromToday) or the user explicitly resumed it this session
  // (locallyResumedShift).
  // activityStartAt is non-null when the tray is actively tracking (fresh heartbeat
  // delivered currentIntervalStartAt). Treating this as "clocked in" covers the case
  // where the user resumes tracking from the tray on a cross-day open shift — without
  // it the dashboard would stay "OFF CLOCK" until the user also clicks Resume here.
  const hasClockedIn = !!timeIn || (serverIsOnShift && (serverIsShiftFromToday || locallyResumedShift || activityStartAt !== null));
  const hasClockedOut = !!timeOut;
  const isActive = hasClockedIn && !hasClockedOut;
  const isComplete = hasClockedOut;

  // Derive break state from server logs so tray ↔ CRM stays in sync.
  // Session start prefers today's time-in, but falls back to the backend's
  // serverShiftStartedAt so break tracking still works when the active shift
  // crossed MDT midnight (today has no time-in log of its own).
  React.useEffect(() => {
    const sessionStartMs = timeIn
      ? new Date(timeIn.timestamp).getTime()
      : serverShiftStartedAt
        ? new Date(serverShiftStartedAt).getTime()
        : null;
    if (sessionStartMs === null) return;
    const breakLogs = sortedLogs.filter(
      (l) =>
        (l.type === "break-in" || l.type === "break-out") &&
        new Date(l.timestamp).getTime() >= sessionStartMs,
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
    setCurrentBreakStartAt(currentBreakStart);
  }, [sortedLogs, serverShiftStartedAt]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const workedMs =
      previousSessionsMs + Math.max(0, lastSessionMs - breakAccumulatedMs);
    const h = Math.floor(workedMs / 3600000);
    const m = Math.floor((workedMs % 3600000) / 60000);
    return `${h}h ${m}m`;
  }, [timeIn, timeOut, breakAccumulatedMs, previousSessionsMs]);

  if (isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-zinc-100 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-14 w-14">
            <div className="absolute inset-0 animate-ping rounded-2xl bg-emerald-500/10 motion-reduce:animate-none" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-zinc-50 dark:bg-zinc-900">
              <Car className="h-6 w-6 text-emerald-500" />
            </div>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-600">
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
      icon: (
        <Users className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
      ),
      label: "Leads",
      route: "/crm/leads",
    },
    {
      icon: (
        <Activity className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
      ),
      label: "Service Hub",
      route: "/crm/appointments/dashboard",
    },
    {
      icon: (
        <CalendarCheck className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
      ),
      label: "Appointments",
      route: "/crm/appointments",
    },
    {
      icon: (
        <CalendarDays className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
      ),
      label: "Timeproof",
      route: "/crm/timeproof",
    },
    {
      icon: <Tag className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />,
      label: "Finance Line",
      route: "/crm/aftermarket",
    },
    {
      icon: <Car className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />,
      label: "Garage Review",
      route: "/crm/garage-review",
    },
    {
      icon: <Headset className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />,
      label: "Support Center",
      route: "/crm/support-center",
    },
    {
      icon: <Star className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />,
      label: "Reviews",
      route: "/crm/reviews",
    },
    {
      icon: <Trophy className="h-5 w-5 text-amber-500 dark:text-amber-400" />,
      label: "Leaderboard",
      route: "/crm/leaderboard",
      accent: "amber" as const,
    },
    {
      icon: <Gift className="h-5 w-5 text-violet-500 dark:text-violet-400" />,
      label: "Referrals",
      route: "/crm/referrals",
    },
  ];

  return (
    <TooltipProvider>
      <div className="relative flex min-h-full w-full flex-col overflow-hidden bg-zinc-100 transition-colors duration-300 dark:bg-zinc-950">
        {/* Ambient instrument backdrop: emerald orbs + faint telemetry grid */}
        <div
          className="pointer-events-none fixed inset-0 overflow-hidden"
          aria-hidden
        >
          <div className="absolute -left-64 -top-64 h-150 w-150 rounded-full bg-emerald-500/4 blur-3xl dark:bg-emerald-500/3" />
          <div className="absolute -right-48 top-1/3 h-125 w-125 rounded-full bg-emerald-600/5 blur-3xl dark:bg-emerald-600/4" />
          <div className="absolute bottom-0 left-1/3 h-100 w-100 rounded-full bg-emerald-400/3 blur-3xl dark:bg-emerald-400/2" />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(16,185,129,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(16,185,129,0.05) 1px, transparent 1px)",
              backgroundSize: "46px 46px",
              maskImage:
                "radial-gradient(ellipse 75% 55% at 50% 0%, black, transparent 78%)",
              WebkitMaskImage:
                "radial-gradient(ellipse 75% 55% at 50% 0%, black, transparent 78%)",
            }}
          />
        </div>

        <main className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-6 sm:space-y-7 flex-1 min-h-0 overflow-y-auto">
          <div
            className={cn(
              "flex flex-wrap items-center gap-x-3 gap-y-2 transition-all duration-700 motion-reduce:transition-none",
              mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200/80 bg-zinc-100 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900">
                {greeting.icon}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-black tracking-tight text-zinc-900 dark:text-white sm:text-xl">
                  {greeting.text}
                </h1>
                <p className="mt-0.5 truncate font-mono text-xs text-zinc-400 dark:text-zinc-500">
                  {todayStr}
                </p>
              </div>
            </div>
            <Badge className="hidden h-5 rounded-full border-emerald-200 bg-emerald-50 px-2.5 text-[10px] font-bold capitalize text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 sm:inline-flex">
              {user.role}
            </Badge>
          </div>

          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-5">
            <div
              className={cn(
                "flex flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/70 shadow-[0_10px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl lg:col-span-4 dark:border-white/6 dark:bg-zinc-900/40 dark:shadow-none",
                "transition-all duration-700 delay-100 motion-reduce:transition-none",
                mounted
                  ? "translate-y-0 opacity-100"
                  : "translate-y-6 opacity-0",
              )}
            >
              <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800/60">
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
                        ? "animate-pulse bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)] motion-reduce:animate-none"
                        : isActive
                          ? "animate-pulse bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] motion-reduce:animate-none"
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

              <div className="flex min-h-55 flex-1 items-center justify-center px-4 py-8 sm:px-8">
                {isActive && (
                  <ActivityTimer
                    todayTotalActiveMs={todayTotalActiveMs}
                    activityStartAt={activityStartAt}
                    isOnShift={isActive}
                    isOnBreak={isOnBreak}
                    breakTotalMs={breakAccumulatedMs}
                    currentBreakStartAt={currentBreakStartAt}
                  />
                )}
                {isComplete && (
                  <ShiftGauge progress={1} accent="emerald" glow>
                    <div className="flex flex-col items-center gap-1.5 text-center">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                      <p className="font-mono text-2xl font-black tracking-tighter text-zinc-900 dark:text-white sm:text-3xl">
                        {finalHours}
                      </p>
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600">
                        Shift Complete
                      </p>
                    </div>
                  </ShiftGauge>
                )}
                {!hasClockedIn && (
                  <ShiftGauge progress={0} accent="zinc">
                    <div className="flex flex-col items-center gap-2 px-6 text-center">
                      <Activity className="h-7 w-7 text-zinc-300 dark:text-zinc-700" />
                      <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
                        Ready to clock in
                      </p>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-600">
                        Start tracking your shift
                      </p>
                    </div>
                  </ShiftGauge>
                )}
              </div>

              <div className="border-t border-zinc-100 bg-zinc-50/50 px-5 py-4 dark:border-zinc-800/60 dark:bg-zinc-900/20">
                <div className="mb-4 grid grid-cols-2 gap-3">
                  {[
                    {
                      label: "Time In",
                      value: resumeOriginalClockIn
                        ? fmt(new Date(resumeOriginalClockIn))
                        : timeIn
                          ? fmt(new Date(timeIn.timestamp))
                          : serverShiftStartedAt
                            ? fmt(new Date(serverShiftStartedAt))
                            : "——",
                    },
                    {
                      label: "Time Out",
                      value: timeOut ? fmt(new Date(timeOut.timestamp)) : "——",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-zinc-200/70 bg-white/60 px-3 py-2.5 shadow-[0_6px_18px_rgba(0,0,0,0.03)] dark:border-zinc-800/40 dark:bg-zinc-900/50 dark:shadow-none"
                    >
                      <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
                        {item.label}
                      </p>
                      <p className="font-mono text-xl font-black leading-none tabular-nums text-zinc-900 dark:text-white">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                {!isActive && (
                  isMobile ? (
                    <div className="h-12 w-full rounded-xl border border-zinc-700/40 bg-zinc-800/30 flex items-center justify-center gap-2 px-4">
                      <MonitorDot className="h-4 w-4 text-zinc-500 shrink-0" />
                      <p className="text-[11px] text-zinc-500 font-bold text-center">Shift tracking requires the desktop app</p>
                    </div>
                  ) : (
                    <Button
                      onClick={checkTrayAndStartShift}
                      disabled={isClocking || trayChecking}
                      className="h-12 w-full gap-2 rounded-xl border-0 bg-linear-to-r from-emerald-600 to-emerald-500 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:from-emerald-500 hover:to-emerald-400 hover:shadow-emerald-500/30 active:translate-y-0 motion-reduce:transform-none dark:shadow-emerald-900/40 dark:hover:shadow-emerald-800/50"
                    >
                      {isClocking || trayChecking ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Start Shift{" "}
                          <ArrowRight className="ml-auto h-4 w-4 opacity-60" />
                        </>
                      )}
                    </Button>
                  )
                )}
                {isActive && (() => {
                  // Three states for the active-shift action buttons:
                  //  • On break → Break button shows "Resume" (ends break)
                  //  • On shift but paused (no active tracking) → swap Break for "Resume Shift"
                  //    so the user can re-engage tracking without having to "Break" first.
                  //  • Actively tracking → normal Break + End Shift.
                  const isPausedOnShift = !isOnBreak && activityStartAt === null;
                  return (
                    <div className="grid grid-cols-2 gap-2">
                      {isPausedOnShift ? (
                        <Button
                          onClick={() => { setActivityStartAt(Date.now()); handleClock("time-in"); }}
                          disabled={isClocking}
                          className="h-11 gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-sm font-bold text-emerald-600 transition-all duration-200 hover:bg-emerald-500/20 dark:text-emerald-400"
                        >
                          <Play className="h-4 w-4" /> Resume Shift
                        </Button>
                      ) : (
                        <Button
                          onClick={handleBreak}
                          className={cn(
                            "h-11 gap-2 rounded-xl border text-sm font-bold transition-all duration-200",
                            isOnBreak
                              ? "border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
                              : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-amber-500/30 hover:bg-zinc-100 hover:text-amber-600 dark:border-zinc-700/60 dark:bg-zinc-800/40 dark:text-zinc-300 dark:hover:bg-zinc-700/60 dark:hover:text-amber-400",
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
                      )}
                      <Button
                        onClick={handleEndShiftClick}
                        disabled={isClocking || isOnBreak}
                        className="h-11 gap-2 rounded-xl border border-red-200 bg-red-50 text-sm font-bold text-red-500 transition-all duration-200 hover:border-red-300 hover:bg-red-100 disabled:opacity-30 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:border-red-400/40 dark:hover:bg-red-500/20"
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
                  );
                })()}
                {clockMsg && (
                  <p className="mt-2 text-center font-mono text-[11px] text-emerald-600 dark:text-emerald-400/70">
                    {clockMsg}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 lg:col-span-8 lg:gap-5">
              <div
                className={cn(
                  "relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/70 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl sm:p-6 dark:border-white/6 dark:bg-zinc-900/40 dark:shadow-none",
                  "transition-all duration-700 delay-200 motion-reduce:transition-none",
                  mounted
                    ? "translate-y-0 opacity-100"
                    : "translate-y-6 opacity-0",
                )}
              >
                <div className="absolute right-0 top-0 h-48 w-48 rounded-bl-[100px] bg-linear-to-bl from-emerald-500/5 to-transparent" />

                <p className="mb-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600">
                  My Profile
                </p>

                <div className="flex items-center gap-4 border-b border-zinc-100 pb-5 dark:border-zinc-800/60 sm:gap-5">
                  <div className="relative shrink-0">
                    <div className="absolute -inset-1 animate-[spin_6s_linear_infinite] rounded-full bg-linear-to-br from-emerald-500/30 to-emerald-700/10 motion-reduce:animate-none" />
                    <Avatar className="relative h-16 w-16 ring-2 ring-zinc-200 dark:ring-zinc-800">
                      <AvatarImage src={userAvatarSrc} />
                      <AvatarFallback className="bg-linear-to-br from-emerald-600 to-emerald-800 text-lg font-black text-white">
                        {ini(user.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    {isActive && (
                      <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] dark:border-zinc-900" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-black leading-tight text-zinc-900 dark:text-white">
                      {user.fullName}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-sm text-zinc-400 dark:text-zinc-500">
                      {user.email}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <Badge className="h-5 rounded-full border-zinc-200 bg-zinc-100 px-2.5 text-[10px] font-bold text-zinc-600 dark:border-zinc-700/60 dark:bg-zinc-800 dark:text-zinc-300">
                        {user.username}
                      </Badge>
                      <Badge className="h-5 rounded-full border-emerald-200 bg-emerald-50 px-2.5 text-[10px] font-bold capitalize text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                        {user.role}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 sm:grid-cols-3">
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
                  "flex-1 rounded-2xl border border-zinc-200/80 bg-white/70 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl sm:p-6 dark:border-white/6 dark:bg-zinc-900/40 dark:shadow-none",
                  "transition-all duration-700 delay-300 motion-reduce:transition-none",
                  mounted
                    ? "translate-y-0 opacity-100"
                    : "translate-y-6 opacity-0",
                )}
              >
                <p className="mb-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600">
                  Quick Actions
                </p>
                {/* 9 actions → balanced grid at every breakpoint:
                    3 cols (mobile / sm) = 3 even rows, 5 cols (lg+) keeps the
                    wide column tidy without orphan tiles dangling on their own row. */}
                <div className="grid auto-rows-fr grid-cols-3 gap-2.5 sm:gap-3 lg:grid-cols-5">
                  {quickActions.map((action, i) => (
                    <div
                      key={action.label}
                      className="h-full transition-all duration-500 motion-reduce:transition-none"
                      style={{
                        transitionDelay: mounted ? `${300 + i * 50}ms` : "0ms",
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
        <div
          className="fixed bottom-5 right-5 z-50 w-76 max-w-[calc(100vw-2.5rem)] rounded-2xl bg-zinc-900 border border-zinc-700/50 shadow-2xl shadow-black/60 overflow-hidden"
          style={{ animation: "slideUp 0.3s ease-out" }}
        >
          <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <MonitorDot className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white leading-tight">
                  Connect CRM Tray App
                </p>
                <p className="text-xs text-zinc-400 mt-0.5 leading-snug">
                  Open your desktop agent to enable time tracking &amp;
                  screenshots.
                </p>
              </div>
              <button
                onClick={dismissTrayBanner}
                className="flex h-8 w-8 items-center justify-center -m-1.5 shrink-0 text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={openTrayApp}
                className="flex-1 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <MonitorDot className="h-3.5 w-3.5" />
                Open CRM Tray-App
              </button>
              <button
                onClick={dismissTrayBanner}
                className="px-3 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-bold transition-colors"
              >
                Later
              </button>
            </div>
            <p className="text-[10px] text-zinc-600 text-center mt-2">
              Check &ldquo;Always allow&rdquo; in the browser dialog to
              auto-connect next time.
            </p>
          </div>
        </div>
      )}

      {/* ── Early End Shift Modal (< 8 hours worked) ── */}
      {showEarlyEndModal && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEarlyEndModal(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-700/60 shadow-2xl overflow-y-auto max-h-[90vh] overscroll-contain" style={{ animation: "slideUp 0.25s ease-out" }}>
            <button onClick={() => setShowEarlyEndModal(false)} className="absolute top-3 right-3 h-9 w-9 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
            {/* Banner */}
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-5 py-3 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-black text-amber-300 uppercase tracking-wider">Minimum shift not yet completed</p>
                <p className="text-[11px] text-amber-400/60 mt-0.5">
                  You need to render <span className="font-bold text-amber-400">8 hours</span> per shift.
                </p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/30 px-4 py-3 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Time Worked</span>
                <span className="font-mono text-sm font-black text-zinc-200">
                  {(() => {
                    const ms = todayTotalActiveMs + (activityStartAt ? Date.now() - activityStartAt : 0);
                    const h = Math.floor(ms / 3600000);
                    const m = Math.floor((ms % 3600000) / 60000);
                    return `${h}h ${m}m`;
                  })()}
                </span>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Reason for early end <span className="text-red-400">*</span></label>
                <select
                  value={earlyEndReason}
                  onChange={(e) => setEarlyEndReason(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700/60 rounded-xl px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-amber-500/50 transition-colors"
                >
                  <option value="">Select a reason…</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Medical / Illness">Medical / Illness</option>
                  <option value="Family Emergency">Family Emergency</option>
                  <option value="Personal Matters">Personal Matters</option>
                  <option value="Work Completed Early">Work Completed Early</option>
                  <option value="Technical Issues">Technical Issues</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Additional details (optional)</label>
                <textarea
                  value={earlyEndDetails}
                  onChange={(e) => setEarlyEndDetails(e.target.value)}
                  placeholder="Add more context here…"
                  rows={3}
                  className="w-full bg-zinc-800 border border-zinc-700/60 rounded-xl px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-amber-500/50 transition-colors resize-none"
                />
              </div>
              <div className="space-y-2 pt-1">
                <button
                  onClick={handleEarlyEndSubmit}
                  disabled={!earlyEndReason || earlyEndSubmitting}
                  className="flex w-full items-center justify-center gap-2 h-11 rounded-xl bg-red-500/90 hover:bg-red-500 text-white text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {earlyEndSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LogOut className="h-4 w-4" /> Submit & End Shift</>}
                </button>
                <button
                  onClick={() => setShowEarlyEndModal(false)}
                  className="flex w-full items-center justify-center gap-2 h-10 rounded-xl border border-zinc-700/60 bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-300 text-xs font-bold transition-colors"
                >
                  <Play className="h-3.5 w-3.5" /> Resume Shift
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm End Shift Modal (≥ 8 hours worked) ── */}
      {showConfirmEndModal && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirmEndModal(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-700/60 shadow-2xl overflow-hidden" style={{ animation: "slideUp 0.25s ease-out" }}>
            <button onClick={() => setShowConfirmEndModal(false)} className="absolute top-3 right-3 h-9 w-9 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="px-6 pt-6 pb-5 space-y-4">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <ShieldAlert className="h-7 w-7 text-red-400" />
                </div>
                <div>
                  <p className="text-base font-black text-white">End your shift?</p>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    You have worked{" "}
                    <span className="text-white font-semibold">
                      {(() => {
                        const ms = todayTotalActiveMs + (activityStartAt ? Date.now() - activityStartAt : 0);
                        const h = Math.floor(ms / 3600000);
                        const m = Math.floor((ms % 3600000) / 60000);
                        return `${h}h ${m}m`;
                      })()}
                    </span>{" "}
                    today. Are you sure you want to clock out?
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => { setShowConfirmEndModal(false); handleClock("time-out"); }}
                  disabled={isClocking}
                  className="flex w-full items-center justify-center gap-2 h-11 rounded-xl bg-red-500/90 hover:bg-red-500 text-white text-sm font-bold transition-colors disabled:opacity-40"
                >
                  {isClocking ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LogOut className="h-4 w-4" /> Yes, End Shift</>}
                </button>
                <button
                  onClick={() => setShowConfirmEndModal(false)}
                  className="flex w-full items-center justify-center gap-2 h-10 rounded-xl border border-zinc-700/60 bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-300 text-xs font-bold transition-colors"
                >
                  <Play className="h-3.5 w-3.5" /> Resume Shift
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Resume Shift Modal ── */}
      {resumeModal && (
        <div className="fixed inset-0 z-200 flex items-start justify-center pt-12 p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setResumeModal(false)}
          />
          <div
            className="relative z-10 w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-700/60 shadow-2xl shadow-black/70 overflow-hidden"
            style={{ animation: "slideUp 0.25s ease-out" }}
          >
            <button
              onClick={() => setResumeModal(false)}
              className="absolute top-3 right-3 h-9 w-9 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="px-6 pt-6 pb-5 space-y-4">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Clock className="h-7 w-7 text-amber-400" />
                </div>
                <div>
                  <p className="text-base font-black text-white">Resume Your Shift?</p>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    You have an unfinished shift from today that started at{" "}
                    <span className="text-white font-semibold">
                      {resumeOriginalClockIn ? fmt(new Date(resumeOriginalClockIn)) : "—"}
                    </span>
                    . Would you like to continue from where you left off?
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setResumeModal(false);
                    handleClock("time-in");
                  }}
                  className="flex w-full items-center justify-center gap-2 h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold transition-colors"
                >
                  <Play className="h-4 w-4" />
                  Yes, Resume Shift
                </button>
                <button
                  onClick={() => {
                    setResumeModal(false);
                    setResumeOriginalClockIn(null);
                    handleClock("time-in");
                  }}
                  className="flex w-full items-center justify-center h-10 rounded-xl border border-zinc-700/60 bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-300 text-xs font-bold transition-colors"
                >
                  No, Start a New Shift
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tray App Required Modal ── */}
      {showTrayModal && (
        <div className="fixed inset-0 z-200 flex items-start justify-center pt-12 p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowTrayModal(false)}
          />

          {/* Card */}
          <div
            className="relative z-10 w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-700/60 shadow-2xl shadow-black/70 overflow-y-auto max-h-[88vh] overscroll-contain"
            style={{ animation: "slideUp 0.25s ease-out" }}
          >
            <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }`}</style>

            {/* Close */}
            <button
              onClick={() => setShowTrayModal(false)}
              className="absolute top-3 right-3 h-9 w-9 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
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
                  <p className="text-base font-black text-white">
                    Tray App Required
                  </p>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    The{" "}
                    <span className="text-white font-semibold">
                      Action Auto CRM Tray App
                    </span>{" "}
                    must be installed and running to track your shift, capture
                    screenshots, and monitor activity.
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
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      {step}
                    </p>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <a
                  href={process.env.NEXT_PUBLIC_TRAY_DOWNLOAD_URL ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowTrayModal(false)}
                  className="flex w-full items-center justify-center gap-2 h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download Tray App
                </a>
                <button
                  onClick={async () => {
                    try {
                      window.location.href = `actionauto://auth?token=${encodeURIComponent(token)}`;
                    } catch { }
                    // After firing the deep link, re-check after a short delay
                    await new Promise((r) => setTimeout(r, 3000));
                    setTrayChecking(true);
                    try {
                      const res = await fetch("http://127.0.0.1:18642/", {
                        method: "GET",
                        signal: AbortSignal.timeout(2000),
                      });
                      if (res.status < 600) {
                        setShowTrayModal(false);
                        handleClock("time-in");
                      }
                    } catch {
                      /* still not running */
                    } finally {
                      setTrayChecking(false);
                    }
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
                      const res = await fetch("http://127.0.0.1:18642/", {
                        method: "GET",
                        signal: AbortSignal.timeout(2000),
                      });
                      if (res.status < 600) {
                        setShowTrayModal(false);
                        handleClock("time-in");
                      } else
                        toast.error(
                          "Tray app not detected. Make sure it is running.",
                        );
                    } catch {
                      toast.error(
                        "Tray app not detected. Make sure it is running.",
                      );
                    } finally {
                      setTrayChecking(false);
                    }
                  }}
                  disabled={trayChecking}
                  className="flex w-full items-center justify-center gap-2 h-9 rounded-xl text-zinc-500 hover:text-zinc-300 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {trayChecking ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" /> Checking…
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3" /> Check Again
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </TooltipProvider>
  );
}
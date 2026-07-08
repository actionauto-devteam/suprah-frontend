"use client";

import * as React from "react";
import {
  Phone,
  Video,
  PhoneCall,
  Loader2,
  X,
  Bell,
  Clock,
  CheckCircle2,
  PhoneOff,
  Headset,
  Check,
  Mic,
  Wifi,
  ListChecks,
  ChevronDown,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth, useUser } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";
import { JitsiMeet } from "@/app/(dashboard)/crm/supra-space/JitsiMeet";
import { initializeSocket } from "@/lib/socket.client";
import type { Socket } from "socket.io-client";

// ─── Types ────────────────────────────────────────────────────────────────────

type CallMode = "voice" | "video";

type CallStatus =
  | "idle"
  | "requested"
  | "preparing"
  | "about_to_start"
  | "in_progress"
  | "ended"
  | "declined";

interface CallConversation {
  _id: string;
  name: string;
  metadata: {
    type: string;
    customerUserId: string;
    callMode?: CallMode;
    callStatus?: CallStatus;
    resolved?: boolean;
  };
}

interface CallMessage {
  _id: string;
  content: string;
  createdAt: string;
  type: string;
  metadata?: {
    isCustomerMessage?: boolean;
    crmUserName?: string;
    crmUserRole?: string;
  };
}

interface StatusToast {
  id: string;
  text: string;
  status: CallStatus;
  crmUserName?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString('en-US', { hour: "2-digit", minute: "2-digit", timeZone: 'America/Denver' });
}

const STATUS_META: Record<
  CallStatus,
  { label: string; tone: string; icon: React.ReactNode }
> = {
  idle: { label: "Ready", tone: "text-muted-foreground", icon: <Phone className="h-4 w-4" /> },
  requested: {
    label: "Request sent",
    tone: "text-blue-600",
    icon: <Clock className="h-4 w-4" />,
  },
  preparing: {
    label: "Team is preparing",
    tone: "text-amber-600",
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
  },
  about_to_start: {
    label: "About to start",
    tone: "text-emerald-600",
    icon: <Bell className="h-4 w-4" />,
  },
  in_progress: {
    label: "Call in progress",
    tone: "text-emerald-600",
    icon: <PhoneCall className="h-4 w-4" />,
  },
  ended: { label: "Call ended", tone: "text-muted-foreground", icon: <CheckCircle2 className="h-4 w-4" /> },
  declined: { label: "Call declined", tone: "text-red-600", icon: <PhoneOff className="h-4 w-4" /> },
};

// ─── Status toast (one-way pop-up from staff) ─────────────────────────────────

function StatusToastCard({ toast, onClose }: { toast: StatusToast; onClose: () => void }) {
  const meta = STATUS_META[toast.status] ?? STATUS_META.preparing;
  return (
    <div className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-border/60 bg-card/95 backdrop-blur-sm px-4 py-3 shadow-xl shadow-black/5 dark:shadow-black/30 w-80 max-w-[calc(100vw-3rem)]">
      <div className={cn("mt-0.5 shrink-0 h-8 w-8 rounded-xl flex items-center justify-center bg-muted", meta.tone)}>
        {meta.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold">
          {toast.crmUserName ? `${toast.crmUserName} · Support` : "Support"}
        </p>
        <p className="text-sm text-foreground/90 mt-0.5 leading-snug">{toast.text}</p>
      </div>
      <button
        onClick={onClose}
        className="h-6 w-6 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Status stepper ───────────────────────────────────────────────────────────

function statusStepIndex(status: CallStatus): number {
  switch (status) {
    case "requested":
      return 0;
    case "preparing":
      return 1;
    case "about_to_start":
    case "in_progress":
      return 2;
    case "ended":
    case "declined":
      return 3;
    default:
      return -1;
  }
}

function CallStatusStepper({ status }: { status: CallStatus }) {
  const declined = status === "declined";
  const steps = ["Requested", "Preparing", "Live", declined ? "Declined" : "Ended"];
  const current = statusStepIndex(status);

  return (
    <div className="flex items-center">
      {steps.map((label, i) => {
        const isLast = i === steps.length - 1;
        const completed = current > i && !(declined && isLast);
        const active = current === i;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors shrink-0",
                  completed && "border-emerald-500 bg-emerald-500 text-white",
                  active && !declined && "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                  active && declined && "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400",
                  !completed && !active && "border-border text-muted-foreground/50",
                )}
              >
                {completed ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium whitespace-nowrap",
                  active ? "text-foreground" : "text-muted-foreground/70",
                )}
              >
                {label}
              </span>
            </div>
            {!isLast && (
              <div
                className={cn(
                  "h-0.5 flex-1 mx-1 mb-4 rounded-full transition-colors",
                  current > i ? "bg-emerald-500" : "bg-border",
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Mode toggle ────────────────────────────────────────────────────────────

function CallModeToggle({
  mode,
  onChange,
  disabled,
}: {
  mode: CallMode;
  onChange: (m: CallMode) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex self-start rounded-xl border border-border/60 bg-muted/40 p-1">
      {(["voice", "video"] as CallMode[]).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          disabled={disabled}
          aria-pressed={mode === m}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all touch-manipulation",
            mode === m
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
            disabled && "opacity-60 cursor-not-allowed",
          )}
        >
          {m === "voice" ? <Phone className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
          {m === "voice" ? "Voice" : "Video"}
        </button>
      ))}
    </div>
  );
}

// ─── Primary call action ──────────────────────────────────────────────────────

function CallActionButton({
  mode,
  canRequest,
  canJoin,
  requesting,
  joining,
  onRequest,
  onJoin,
}: {
  mode: CallMode;
  canRequest: boolean;
  canJoin: boolean;
  requesting: boolean;
  joining: boolean;
  onRequest: () => void;
  onJoin: () => void;
}) {
  const ModeIcon = mode === "voice" ? Phone : Video;

  if (canJoin) {
    return (
      <button
        onClick={onJoin}
        disabled={joining}
        className="relative flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center rounded-full bg-linear-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-900/30 transition-transform hover:scale-105 disabled:opacity-70 touch-manipulation"
      >
        <span className="absolute inset-0 rounded-full ring-2 ring-emerald-400/40 animate-ping" />
        <span
          className="absolute inset-0 rounded-full ring-2 ring-emerald-400/25 animate-ping"
          style={{ animationDelay: "0.6s" }}
        />
        {joining ? (
          <Loader2 className="relative h-8 w-8 animate-spin" />
        ) : (
          <ModeIcon className="relative h-8 w-8" />
        )}
      </button>
    );
  }

  if (!canRequest) {
    return (
      <div className="flex h-28 w-28 sm:h-32 sm:w-32 flex-col items-center justify-center gap-1.5 rounded-full bg-muted text-muted-foreground">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
    );
  }

  return (
    <button
      onClick={onRequest}
      disabled={requesting}
      className="flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center rounded-full bg-linear-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-900/20 transition-transform hover:scale-105 disabled:opacity-60 touch-manipulation"
    >
      {requesting ? (
        <Loader2 className="h-8 w-8 animate-spin" />
      ) : (
        <ModeIcon className="h-8 w-8" />
      )}
    </button>
  );
}

// ─── Quick tips (idle-state guidance) ─────────────────────────────────────────

const CALL_TIPS = [
  {
    icon: Mic,
    title: "Check mic & camera",
    description: "Make sure your device's mic and camera are enabled before you connect.",
  },
  {
    icon: Wifi,
    title: "Find a stable connection",
    description: "A steady Wi-Fi or data connection keeps your call smooth and clear.",
  },
  {
    icon: ListChecks,
    title: "Have your questions ready",
    description: "Jot down what you'd like to cover so the team can help you faster.",
  },
];

function CallQuickTips() {
  return (
    <div className="grid flex-1 grid-cols-1 content-start gap-3 sm:grid-cols-3">
      {CALL_TIPS.map((tip) => (
        <div
          key={tip.title}
          className="flex flex-col gap-2 rounded-xl border border-border/50 bg-muted/30 p-3.5"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
            <tip.icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-xs font-semibold">{tip.title}</p>
          <p className="text-[11px] leading-snug text-muted-foreground">{tip.description}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Idle empty-state guidance ─────────────────────────────────────────────────

const HOW_IT_WORKS = [
  { icon: PhoneCall, label: "Request", description: "Choose voice or video, then tap the call button." },
  { icon: Clock, label: "Wait for Agent", description: "Our team is notified and starts preparing." },
  { icon: Video, label: "Join Call", description: "Tap Join the moment we're ready to connect." },
];

function HowItWorks() {
  return (
    <div className="flex items-stretch gap-2 sm:gap-4">
      {HOW_IT_WORKS.map((step, i) => (
        <React.Fragment key={step.label}>
          <div className="flex flex-1 flex-col items-center gap-2 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <step.icon className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold">{step.label}</p>
            <p className="text-[11px] leading-snug text-muted-foreground">{step.description}</p>
          </div>
          {i < HOW_IT_WORKS.length - 1 && (
            <div className="mt-5 h-px w-6 shrink-0 self-start bg-border sm:w-10" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function CallAvailabilityBadge() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1">
        <Clock className="h-3 w-3" /> Typical wait: 2–5 min
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-2.5 py-1 text-emerald-600 dark:text-emerald-400">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </span>
        Agents online now
      </span>
    </div>
  );
}

function CallEmptyStateIllustration() {
  return (
    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
      <span className="absolute h-20 w-20 rounded-full bg-emerald-500/10" />
      <span className="absolute h-14 w-14 rounded-full bg-emerald-500/15" />
      <Headset className="relative h-8 w-8 text-emerald-600 dark:text-emerald-400" />
    </div>
  );
}

function CallIntro() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <CallEmptyStateIllustration />
        <div className="max-w-sm">
          <h2 className="text-base font-bold">Talk to our team in seconds</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Request a voice or video call and a support agent will join you live — no scheduling needed.
          </p>
        </div>
        <CallAvailabilityBadge />
      </div>
      <HowItWorks />
    </div>
  );
}

const CALL_FAQS = [
  {
    q: "What's the difference between voice and video?",
    a: "Voice calls connect with audio only. Video calls add a live camera feed so the agent can see you too.",
  },
  {
    q: "How long will I wait?",
    a: "Most requests are picked up within 2–5 minutes, depending on how many agents are available.",
  },
  {
    q: "Can I switch between voice and video?",
    a: "Yes, switch the toggle any time before you send your request.",
  },
  {
    q: "What happens if I miss my agent?",
    a: "Your status will show as Ended. Just tap Request again to start a new call.",
  },
];

function CallFAQ() {
  const [open, setOpen] = React.useState<number | null>(null);
  return (
    <div className="flex flex-col gap-1.5">
      {CALL_FAQS.map((item, i) => (
        <div key={item.q} className="rounded-xl border border-border/50 bg-muted/20">
          <button
            type="button"
            onClick={() => setOpen((p) => (p === i ? null : i))}
            className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left"
          >
            <span className="text-xs font-medium">{item.q}</span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                open === i && "rotate-180",
              )}
            />
          </button>
          {open === i && (
            <p className="px-3.5 pb-3 text-[11px] leading-snug text-muted-foreground">{item.a}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CustomerCallCenterPage() {
  const { getToken } = useAuth();
  const { user } = useUser();

  const [conversation, setConversation] = React.useState<CallConversation | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [requesting, setRequesting] = React.useState(false);
  const [mode, setMode] = React.useState<CallMode>("video");
  const [status, setStatus] = React.useState<CallStatus>("idle");
  const [timeline, setTimeline] = React.useState<CallMessage[]>([]);
  const [toasts, setToasts] = React.useState<StatusToast[]>([]);
  const [notice, setNotice] = React.useState<{ kind: "error" | "info"; text: string } | null>(null);

  // Jitsi join state
  const [joining, setJoining] = React.useState(false);
  const [jitsi, setJitsi] = React.useState<{ roomName: string } | null>(null);

  const toastTimers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const noticeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = (kind: "error" | "info", text: string) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice({ kind, text });
    noticeTimer.current = setTimeout(() => setNotice(null), 3500);
  };

  const authHeaders = React.useCallback(async () => {
    const token = await getToken();
    return { Authorization: `Bearer ${token}` };
  }, [getToken]);

  // ── Push a one-way status toast ────────────────────────────────────────────
  const pushToast = React.useCallback((t: Omit<StatusToast, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((p) => [...p, { ...t, id }]);
    toastTimers.current[id] = setTimeout(() => {
      setToasts((p) => p.filter((x) => x.id !== id));
      delete toastTimers.current[id];
    }, 6000);
  }, []);

  const dismissToast = (id: string) => {
    if (toastTimers.current[id]) {
      clearTimeout(toastTimers.current[id]);
      delete toastTimers.current[id];
    }
    setToasts((p) => p.filter((x) => x.id !== id));
  };

  // ── Init + load status timeline ────────────────────────────────────────────
  const init = React.useCallback(async () => {
    setLoading(true);
    try {
      const headers = await authHeaders();
      const r = await apiClient.get("/api/customer-call/init", { headers });
      const conv: CallConversation | null = r.data?.data || null;
      setConversation(conv);
      if (conv?.metadata?.callStatus) setStatus(conv.metadata.callStatus);
      if (conv?.metadata?.callMode) setMode(conv.metadata.callMode);

      const m = await apiClient.get("/api/customer-call/messages", { headers });
      setTimeline(m.data?.data || []);
    } catch {
      showNotice("error", "Could not connect to the call center. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  React.useEffect(() => {
    init();
    // eslint-disable-line react-hooks/exhaustive-deps
  }, [init]);

  // ── Real-time: one-way status pushes from staff ───────────────────────────
  React.useEffect(() => {
    let active = true;
    let socket: Socket | null = null;

    const onStatus = (payload: any) => {
      if (payload?.status) setStatus(payload.status as CallStatus);
      if (payload?.text) {
        pushToast({
          text: payload.text,
          status: (payload.status as CallStatus) || "preparing",
          crmUserName: payload.crmUserName,
        });
      }
      if (payload?.message) {
        setTimeline((p) =>
          p.find((m) => m._id === payload.message._id) ? p : [...p, payload.message]
        );
      }
    };

    const onStarted = (payload: any) => {
      setStatus("in_progress");
      pushToast({
        text: payload?.text || "Your call has started. Tap Join to enter.",
        status: "in_progress",
        crmUserName: payload?.crmUserName,
      });
    };

    (async () => {
      const token = await getToken();
      if (!token || !active) return;
      socket = initializeSocket(token);
      socket.on("call:status", onStatus);
      socket.on("call:started", onStarted);
    })();

    return () => {
      active = false;
      socket?.off("call:status", onStatus);
      socket?.off("call:started", onStarted);
    };
  }, [pushToast, getToken]);

  // Cleanup toast timers on unmount
  React.useEffect(() => {
    return () => {
      Object.values(toastTimers.current).forEach(clearTimeout);
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  // ── Request a call ─────────────────────────────────────────────────────────
  const handleRequest = async () => {
    if (requesting) return;
    setRequesting(true);
    try {
      const headers = await authHeaders();
      await apiClient.post("/api/customer-call/request", { mode }, { headers });
      setStatus("requested");
      showNotice("info", "Your call request has been sent. The team will be with you shortly.");
    } catch {
      showNotice("error", "Could not send your call request. Please try again.");
    } finally {
      setRequesting(false);
    }
  };

  // ── Join the Jitsi session (token gated server-side) ──────────────────────
  const handleJoin = async () => {
    if (joining) return;
    setJoining(true);
    try {
      const headers = await authHeaders();
      const r = await apiClient.get("/api/customer-call/video-token", { headers });
      const roomName = r.data?.data?.roomName;
      if (roomName) setJitsi({ roomName });
      else showNotice("error", "Could not join the call yet. Please wait for the team.");
    } catch {
      showNotice("error", "The call has not started yet. Please wait for the team.");
    } finally {
      setJoining(false);
    }
  };

  const displayName = user?.fullName || (user as any)?.firstName || "Customer";
  const meta = STATUS_META[status] ?? STATUS_META.idle;
  const canRequest = status === "idle" || status === "ended" || status === "declined";
  const canJoin = status === "in_progress" || status === "about_to_start";

  // ── Jitsi full-screen overlay ──────────────────────────────────────────────
  if (jitsi) {
    return (
      <JitsiMeet
        roomName={jitsi.roomName}
        displayName={displayName}
        onClose={() => setJitsi(null)}
      />
    );
  }

  const isLive = status === "in_progress" || status === "about_to_start";

  const actionLabel = canJoin
    ? `Join ${mode === "voice" ? "Voice" : "Video"} Call`
    : !canRequest
      ? "Waiting for the team…"
      : `Request ${mode === "voice" ? "Voice" : "Video"} Call`;

  return (
    <div className="flex h-full flex-col gap-3">
      {/* ─── Page header ─────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-3 rounded-2xl border border-border/50 bg-card px-4 py-3">
        <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
          <Headset className="h-4.5 w-4.5 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold leading-tight">Call Center</h1>
          <p className="text-xs text-muted-foreground">Connect live with our team.</p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold shrink-0",
            isLive
              ? "border-emerald-500/25 bg-emerald-500/8 text-emerald-600 dark:text-emerald-400"
              : "border-amber-500/25 bg-amber-500/8 text-amber-600 dark:text-amber-400",
          )}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span
              className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-60",
                isLive ? "bg-emerald-400" : "bg-amber-400",
              )}
            />
            <span
              className={cn(
                "relative inline-flex h-1.5 w-1.5 rounded-full",
                isLive ? "bg-emerald-500" : "bg-amber-500",
              )}
            />
          </span>
          {meta.label}
        </span>
      </div>

      {/* One-way status toasts (top-right) */}
      <div className="pointer-events-none fixed top-20 right-6 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <StatusToastCard key={t.id} toast={t} onClose={() => dismissToast(t.id)} />
        ))}
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[1fr_360px] gap-3">
          {/* Left: status + mode + call action */}
          <div className="flex flex-col gap-5 overflow-y-auto rounded-2xl border border-border/50 bg-card p-5 sm:p-6">
            {status === "idle" ? <CallIntro /> : <CallStatusStepper status={status} />}

            <CallModeToggle mode={mode} onChange={setMode} disabled={!canRequest} />

            {notice && (
              <p
                className={cn(
                  "text-xs px-1",
                  notice.kind === "error" ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {notice.text}
              </p>
            )}

            <div className="flex flex-col items-center gap-3 py-4">
              <CallActionButton
                mode={mode}
                canRequest={canRequest}
                canJoin={canJoin}
                requesting={requesting}
                joining={joining}
                onRequest={handleRequest}
                onJoin={handleJoin}
              />
              <button
                onClick={canJoin ? handleJoin : handleRequest}
                disabled={joining || requesting || (!canRequest && !canJoin)}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors touch-manipulation",
                  canRequest || canJoin
                    ? "text-foreground hover:text-emerald-600 dark:hover:text-emerald-400"
                    : "text-muted-foreground cursor-not-allowed",
                )}
              >
                {actionLabel}
              </button>
            </div>

            <p className="text-[11px] text-center text-muted-foreground/70">
              Updates from our team appear automatically. To talk, use the call itself.
            </p>

            {!canJoin && <CallQuickTips />}

            {status === "idle" && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  FAQs
                </p>
                <CallFAQ />
              </div>
            )}
          </div>

          {/* Right: activity / updates feed */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card p-4 sm:p-5 lg:max-h-full">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground shrink-0">
              Updates
            </p>
            <div
              className="flex-1 min-h-32 lg:min-h-0 space-y-2 overflow-y-auto"
              style={{ scrollbarWidth: "thin" }}
            >
              {timeline.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  No updates yet.
                </p>
              ) : (
                timeline.map((m) => {
                  const fromStaff = m.metadata?.isCustomerMessage === false;
                  return (
                    <div
                      key={m._id}
                      className="flex items-start gap-2.5 rounded-xl bg-muted/40 px-3 py-2"
                    >
                      <div className="shrink-0 mt-0.5 h-6 w-6 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Bell className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug">{m.content}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          {fromStaff && m.metadata?.crmUserName
                            ? `${m.metadata.crmUserName} · `
                            : ""}
                          {fmtTime(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
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
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth, useUser } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";
import { JitsiMeet } from "@/app/(dashboard)/crm/supra-space/JitsiMeet";

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
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
    <div className="pointer-events-auto flex items-start gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-lg w-80 max-w-[calc(100vw-3rem)]">
      <div className={cn("mt-0.5 shrink-0", meta.tone)}>{meta.icon}</div>
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

// ─── Mode chooser card ────────────────────────────────────────────────────────

function ModeCard({
  mode,
  selected,
  onSelect,
}: {
  mode: CallMode;
  selected: boolean;
  onSelect: () => void;
}) {
  const isVoice = mode === "voice";
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border p-6 transition-all",
        selected
          ? "border-emerald-500/60 bg-emerald-500/5 ring-2 ring-emerald-500/20"
          : "border-border/60 hover:border-border bg-card hover:bg-muted/40"
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-2xl",
          selected ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
        )}
      >
        {isVoice ? <Phone className="h-6 w-6" /> : <Video className="h-6 w-6" />}
      </div>
      <div className="text-center">
        <p className="font-semibold text-sm">{isVoice ? "Voice Call" : "Video Call"}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isVoice ? "Audio only" : "Audio and video"}
        </p>
      </div>
    </button>
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
    const candidates = ["__socket", "_socket", "socket", "__io"];
    let socket: any = null;
    for (const key of candidates) {
      if ((window as any)[key]?.on) {
        socket = (window as any)[key];
        break;
      }
    }
    if (!socket) return;

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

    socket.on("call:status", onStatus);
    socket.on("call:started", onStarted);
    return () => {
      socket.off("call:status", onStatus);
      socket.off("call:started", onStarted);
    };
  }, [pushToast]);

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

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">Call Center</h1>
        <p className="text-muted-foreground mt-1">
          Start a voice or video call with our team. We&apos;ll keep you posted with live updates.
        </p>
      </div>

      {/* One-way status toasts (top-right) */}
      <div className="pointer-events-none fixed top-20 right-6 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <StatusToastCard key={t.id} toast={t} onClose={() => dismissToast(t.id)} />
        ))}
      </div>

      <div className="flex-1 min-h-0">
        <div className="mx-auto flex max-w-xl flex-col gap-6 rounded-2xl border border-border/50 bg-background p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Current status banner */}
              <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3">
                <div className={cn("shrink-0", meta.tone)}>{meta.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Current status</p>
                  <p className={cn("text-sm font-semibold", meta.tone)}>{meta.label}</p>
                </div>
              </div>

              {/* Mode chooser */}
              <div>
                <p className="text-sm font-medium mb-3">Choose how you&apos;d like to connect</p>
                <div className="flex gap-3">
                  <ModeCard mode="voice" selected={mode === "voice"} onSelect={() => setMode("voice")} />
                  <ModeCard mode="video" selected={mode === "video"} onSelect={() => setMode("video")} />
                </div>
              </div>

              {/* Notice */}
              {notice && (
                <p
                  className={cn(
                    "text-xs px-1",
                    notice.kind === "error" ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  {notice.text}
                </p>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {canJoin ? (
                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition-all hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {joining ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <PhoneCall className="h-4 w-4" />
                    )}
                    Join {mode === "voice" ? "Voice" : "Video"} Call
                  </button>
                ) : (
                  <button
                    onClick={handleRequest}
                    disabled={requesting || !canRequest}
                    className={cn(
                      "flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all",
                      canRequest
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "bg-muted text-muted-foreground/60 cursor-not-allowed"
                    )}
                  >
                    {requesting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : mode === "voice" ? (
                      <Phone className="h-4 w-4" />
                    ) : (
                      <Video className="h-4 w-4" />
                    )}
                    {canRequest
                      ? `Request ${mode === "voice" ? "Voice" : "Video"} Call`
                      : "Waiting for the team…"}
                  </button>
                )}
              </div>

              {/* Read-only status timeline */}
              {timeline.length > 0 && (
                <div className="border-t border-border/50 pt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Updates</p>
                  <div className="space-y-2 max-h-56 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                    {timeline.map((m) => {
                      const fromStaff = m.metadata?.isCustomerMessage === false;
                      return (
                        <div
                          key={m._id}
                          className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2"
                        >
                          <Bell className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
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
                    })}
                  </div>
                </div>
              )}

              {/* One-way notice */}
              <p className="text-[11px] text-center text-muted-foreground/70">
                Updates from our team are shown here automatically. This is a notification-only
                channel — please use the call to talk with us.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Phone,
  Video,
  PhoneCall,
  PhoneOff,
  Loader2,
  RefreshCw,
  Search,
  Bell,
  Clock,
  ChevronRight,
  Send,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { useCrmToken } from "@/hooks/useCrmToken";
import { useSupraSpaceSocket } from "@/hooks/useSupraSpaceSocket";
import { fmtTimeMDT, fmtFullDateTimeMDT, MDT_TZ } from "@/lib/timezone";
import { JitsiMeet } from "@/app/(dashboard)/crm/supra-space/JitsiMeet";
import { linkifyText } from "@/lib/chatFormat";

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
    type: "customer_call";
    customerUserId: string;
    customerName: string;
    customerEmail?: string;
    callMode?: CallMode;
    callStatus?: CallStatus;
    resolved?: boolean;
    requestedAt?: string;
  };
  lastMessageAt?: string;
  unreadCount: number;
  members: Array<{ _id: string; fullName: string; avatar?: string; role: string }>;
}

interface CallMessage {
  _id: string;
  content: string;
  createdAt: string;
  type: string;
  metadata?: {
    isCustomerMessage?: boolean;
    customerName?: string;
    crmUserName?: string;
    crmUserRole?: string;
  };
}

// ─── Predefined status presets (must match the server's PRESET_MESSAGES) ─────

const PRESETS: Array<{ key: string; label: string }> = [
  { key: "preparing", label: "Please wait while we prepare" },
  { key: "about_to_start", label: "We are about to start the call" },
  { key: "joining_now", label: "Our team is joining now" },
  { key: "brief_delay", label: "Apologies for the short delay" },
  { key: "declined", label: "Unable to take the call now" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtRelative(d?: string) {
  if (!d) return "";
  const date = new Date(d);
  const dateStr = date.toLocaleDateString('en-US', { timeZone: MDT_TZ });
  const todayStr = new Date().toLocaleDateString('en-US', { timeZone: MDT_TZ });
  const yestStr = new Date(Date.now() - 86400000).toLocaleDateString('en-US', { timeZone: MDT_TZ });
  if (dateStr === todayStr) return fmtTimeMDT(date);
  if (dateStr === yestStr) return "Yesterday";
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: MDT_TZ });
}
function fmtFull(d: string) {
  return fmtFullDateTimeMDT(d);
}
function ini(name: string) {
  return (name || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const STATUS_BADGE: Record<CallStatus, { label: string; cls: string }> = {
  idle: { label: "idle", cls: "text-muted-foreground" },
  requested: { label: "requested", cls: "text-chart-2" },
  preparing: { label: "preparing", cls: "text-chart-4" },
  about_to_start: { label: "starting", cls: "text-chart-4" },
  in_progress: { label: "in call", cls: "text-primary" },
  ended: { label: "ended", cls: "text-muted-foreground" },
  declined: { label: "declined", cls: "text-destructive" },
};

const STATUS_RAIL: Record<CallStatus, string> = {
  idle: "border-l-transparent",
  requested: "border-l-chart-2",
  preparing: "border-l-chart-4",
  about_to_start: "border-l-chart-4",
  in_progress: "border-l-primary",
  ended: "border-l-transparent",
  declined: "border-l-destructive",
};

// ─── Squircle avatar (shared visual unit, mirrors Concerns tab) ───────────────

function Squircle({
  label,
  tone = "neutral",
  size = "md",
}: {
  label: string;
  tone?: "primary" | "neutral" | "chart2";
  size?: "sm" | "md" | "lg";
}) {
  const sizeCls = size === "lg" ? "h-11 w-11 text-sm" : size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";
  const toneCls = tone === "primary" ? "bg-primary text-primary-foreground" : tone === "chart2" ? "bg-chart-2 text-white" : "bg-foreground/85 text-background";
  return (
    <div className={cn("shrink-0 rounded-[10px] flex items-center justify-center font-bold tracking-tight", sizeCls, toneCls)}>
      {ini(label)}
    </div>
  );
}

// ─── Conversation list item ───────────────────────────────────────────────────

function CallListItem({
  conv,
  isActive,
  onClick,
}: {
  conv: CallConversation;
  isActive: boolean;
  onClick: () => void;
}) {
  const mode = conv.metadata?.callMode || "video";
  const status = (conv.metadata?.callStatus as CallStatus) || "idle";
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.idle;
  const rail = STATUS_RAIL[status] ?? STATUS_RAIL.idle;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 px-3 py-3 text-left transition-colors relative border-l-[3px]",
        isActive ? cn("bg-primary/6", rail) : cn(rail, "hover:bg-muted/50")
      )}
    >
      <Squircle label={conv.metadata?.customerName || conv.name} tone="chart2" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <p className={cn("text-sm truncate flex-1", conv.unreadCount > 0 ? "font-bold text-foreground" : "font-semibold text-foreground/90")}>
            {conv.metadata?.customerName || conv.name}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {conv.unreadCount > 0 && (
              <span className="h-4.5 min-w-4.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center px-1">
                {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground/60 tabular-nums font-mono">
              {fmtRelative(conv.lastMessageAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70 font-mono">
            {mode === "voice" ? <Phone className="h-2.5 w-2.5" /> : <Video className="h-2.5 w-2.5" />}
            {mode}
          </span>
          <span className={cn("text-[10px] font-bold uppercase tracking-wide font-mono", badge.cls)}>
            {badge.label}
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Status timeline row ──────────────────────────────────────────────────────

function TimelineRow({ msg }: { msg: CallMessage }) {
  const isCustomer = msg.metadata?.isCustomerMessage === true;
  const senderName = isCustomer
    ? msg.metadata?.customerName || "Customer"
    : msg.metadata?.crmUserName || "Support";

  return (
    <div className="flex gap-3 px-5 py-1.5">
      <div className="w-7 shrink-0">
        <Squircle label={senderName} size="sm" tone={isCustomer ? "chart2" : "primary"} />
      </div>
      <div className="flex flex-col gap-1 min-w-0 flex-1 max-w-[80%]">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-semibold text-foreground">{senderName}</span>
          {isCustomer ? (
            <span className="text-[9px] font-bold uppercase tracking-wide text-chart-2 font-mono">customer</span>
          ) : (
            msg.metadata?.crmUserRole && (
              <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground font-mono">{msg.metadata.crmUserRole}</span>
            )
          )}
        </div>
        <div
          className={cn(
            "rounded-r-lg rounded-l-[3px] border-l-[3px] px-3.5 py-2 text-sm leading-relaxed wrap-break-word flex items-start gap-2",
            isCustomer ? "border-l-chart-2 bg-chart-2/6 text-foreground" : "border-l-chart-4 bg-chart-4/8 text-foreground"
          )}
        >
          {!isCustomer && <Bell className="h-3.5 w-3.5 shrink-0 mt-0.5 text-chart-4" />}
          <span className="whitespace-pre-wrap">{linkifyText(msg.content)}</span>
        </div>
        <span className="text-[10px] text-muted-foreground/50 tabular-nums font-mono">
          {fmtFull(msg.createdAt)}
        </span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CustomerCallsTab() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [debSearch, setDebSearch] = React.useState("");
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const [messages, setMessages] = React.useState<CallMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = React.useState(false);

  const [sendingPreset, setSendingPreset] = React.useState<string | null>(null);
  const [startingCall, setStartingCall] = React.useState(false);
  const [endingCall, setEndingCall] = React.useState(false);
  const [notice, setNotice] = React.useState<{ kind: "error" | "info"; text: string } | null>(null);

  // Jitsi join state (staff)
  const [jitsi, setJitsi] = React.useState<{ roomName: string; displayName: string } | null>(null);

  const endRef = React.useRef<HTMLDivElement>(null);
  const noticeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const showNotice = (kind: "error" | "info", text: string) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice({ kind, text });
    noticeTimer.current = setTimeout(() => setNotice(null), 3500);
  };

  const getHeaders = React.useCallback(
    async () => ({ headers: { Authorization: `Bearer ${await getToken()}` } }),
    [getToken]
  );

  // ── Fetch call conversations ──
  const {
    data: conversations = [],
    isLoading: loadingConvs,
    isFetching: fetchingConvs,
    refetch: refetchConvs,
  } = useQuery({
    queryKey: ["call-conversations", debSearch],
    queryFn: async () => {
      const h = await getHeaders();
      const r = await apiClient.get("/api/customer-call/crm/conversations", {
        ...h,
        params: debSearch ? { search: debSearch } : undefined,
      });
      return (r.data?.data || []) as CallConversation[];
    },
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  const handleRefresh = async () => {
    try {
      await refetchConvs({ throwOnError: true });
      showNotice("info", "Calls list refreshed.");
    } catch {
      showNotice("error", "Failed to refresh. Please try again.");
    }
  };

  const totalUnread = conversations.reduce((n, c) => n + (c.unreadCount || 0), 0);
  const activeConv = conversations.find((c) => c._id === activeId) || null;
  const activeStatus = (activeConv?.metadata?.callStatus as CallStatus) || "idle";

  // ── Fetch messages for active conversation ──
  const fetchMessages = React.useCallback(
    async (id: string) => {
      const h = await getHeaders();
      const r = await apiClient.get(`/api/customer-call/crm/conversations/${id}/messages`, {
        ...h,
        params: { limit: 40 },
      });
      setMessages(r.data?.data || []);
    },
    [getHeaders]
  );

  React.useEffect(() => {
    if (!activeId) return;
    setLoadingMsgs(true);
    setMessages([]);
    fetchMessages(activeId).finally(() => setLoadingMsgs(false));
  }, [activeId, fetchMessages]);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // ── Real-time socket (SupraSpace, authenticated via crm_token) ──
  const crmToken = useCrmToken();
  const { socket } = useSupraSpaceSocket(crmToken);

  React.useEffect(() => {
    if (!socket) return;

    const onAny = (payload: any) => {
      if (payload?.conversationId === activeId && payload?.message) {
        setMessages((p) => (p.find((m) => m._id === payload.message._id) ? p : [...p, payload.message]));
      }
      queryClient.invalidateQueries({ queryKey: ["call-conversations"] });
    };

    socket.on("call:request", onAny);
    socket.on("call:status", onAny);
    socket.on("call:started", onAny);
    return () => {
      socket.off("call:request", onAny);
      socket.off("call:status", onAny);
      socket.off("call:started", onAny);
    };
  }, [socket, activeId, queryClient]);

  // ── Send a predefined status update (one-way to customer) ──
  const handleSendPreset = async (presetKey: string) => {
    if (!activeId || sendingPreset) return;
    setSendingPreset(presetKey);
    try {
      const h = await getHeaders();
      const r = await apiClient.post(
        `/api/customer-call/crm/conversations/${activeId}/status`,
        { preset: presetKey },
        h
      );
      if (r.data?.data?.message) {
        setMessages((p) =>
          p.find((m) => m._id === r.data.data.message._id) ? p : [...p, r.data.data.message]
        );
      }
      queryClient.invalidateQueries({ queryKey: ["call-conversations"] });
    } catch {
      showNotice("error", "Failed to send the update. Please try again.");
    } finally {
      setSendingPreset(null);
    }
  };

  // ── Start the Jitsi session ──
  const handleStartCall = async () => {
    if (!activeId || startingCall) return;
    setStartingCall(true);
    try {
      const h = await getHeaders();
      const r = await apiClient.post(`/api/customer-call/crm/conversations/${activeId}/start`, {}, h);
      const roomName = r.data?.data?.roomName;
      queryClient.invalidateQueries({ queryKey: ["call-conversations"] });
      await fetchMessages(activeId);
      if (roomName) {
        setJitsi({
          roomName,
          displayName: activeConv?.members?.[0]?.fullName || "Support",
        });
      }
    } catch {
      showNotice("error", "Failed to start the call. Please try again.");
    } finally {
      setStartingCall(false);
    }
  };

  // ── Re-join an in-progress call ──
  const handleJoinCall = async () => {
    if (!activeId) return;
    try {
      const h = await getHeaders();
      const r = await apiClient.get(`/api/customer-call/crm/conversations/${activeId}/video-token`, h);
      const roomName = r.data?.data?.roomName;
      if (roomName) setJitsi({ roomName, displayName: "Support" });
    } catch {
      showNotice("error", "Could not join the call.");
    }
  };

  // ── End the call ──
  const handleEndCall = async () => {
    if (!activeId || endingCall) return;
    setEndingCall(true);
    try {
      const h = await getHeaders();
      await apiClient.post(`/api/customer-call/crm/conversations/${activeId}/end`, {}, h);
      queryClient.invalidateQueries({ queryKey: ["call-conversations"] });
      await fetchMessages(activeId);
    } catch {
      showNotice("error", "Failed to end the call.");
    } finally {
      setEndingCall(false);
    }
  };

  const crmUserId = React.useMemo(() => {
    try {
      return JSON.parse(atob(localStorage.getItem("crm_token")?.split(".")[1] || ""))?.id || "";
    } catch {
      return "";
    }
  }, [crmToken]);

  // ── Jitsi overlay ──
  if (jitsi) {
    return (
      <JitsiMeet
        roomName={jitsi.roomName}
        displayName={jitsi.displayName}
        onClose={() => setJitsi(null)}
      />
    );
  }

  const callLive = activeStatus === "in_progress";

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden border border-border bg-background">
      {notice && (
        <div
          className={cn(
            "absolute top-3 right-3 z-10 rounded-xl border px-3 py-2 text-[11px] font-medium shadow-sm",
            notice.kind === "error"
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-border bg-card text-muted-foreground"
          )}
        >
          {notice.text}
        </div>
      )}
      {/* ── Left: request list ── */}
      <div
        className={cn(
          "flex flex-col border-r border-border shrink-0 overflow-hidden",
          activeId ? "hidden md:flex md:w-72 lg:w-80" : "w-full md:w-72 lg:w-80"
        )}
      >
        <div className="p-3 space-y-2.5 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-chart-4/15">
                <PhoneCall className="h-3.5 w-3.5 text-chart-4" />
              </div>
              <p className="font-bold text-sm tracking-tight">Calls</p>
              {totalUnread > 0 && (
                <span className="h-4.5 min-w-4.5 rounded-full bg-chart-4 text-white text-[9px] font-bold px-1.5 flex items-center justify-center">
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={fetchingConvs}
              className="h-9 w-9 p-0 rounded-xl hover:bg-chart-4/10 hover:text-chart-4 disabled:opacity-100"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", fetchingConvs && "animate-spin")} />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search customers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-muted/40 border-border rounded-xl focus-visible:ring-chart-4/30 focus-visible:border-chart-4/40"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border/60" style={{ scrollbarWidth: "thin" }}>
          {loadingConvs ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
              <div className="h-12 w-12 rounded-[10px] bg-muted flex items-center justify-center">
                <PhoneCall className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-xs text-muted-foreground">
                {search ? "No results found" : "No incoming call requests"}
              </p>
            </div>
          ) : (
            conversations.map((conv) => (
              <CallListItem
                key={conv._id}
                conv={conv}
                isActive={conv._id === activeId}
                onClick={() => setActiveId(conv._id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Right: detail panel ── */}
      <div className={cn("flex flex-col flex-1 min-w-0 overflow-hidden", !activeId && "hidden md:flex")}>
        {!activeId ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
            <div className="h-14 w-14 rounded-[12px] bg-muted flex items-center justify-center">
              <PhoneCall className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <div>
              <p className="font-semibold text-sm">Select a call request</p>
              <p className="text-xs text-muted-foreground mt-1">
                Choose a customer from the list to send updates and start the call.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
              <button
                onClick={() => setActiveId(null)}
                className="md:hidden h-9 w-9 rounded-md flex items-center justify-center hover:bg-muted"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
              </button>
              <Squircle label={activeConv?.metadata?.customerName || ""} tone="chart2" size="lg" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate">
                    {activeConv?.metadata?.customerName || "Customer"}
                  </p>
                  <span className={cn("text-[9px] font-bold uppercase tracking-wide font-mono shrink-0", STATUS_BADGE[activeStatus]?.cls)}>
                    {STATUS_BADGE[activeStatus]?.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70 font-mono">
                    {activeConv?.metadata?.callMode === "voice" ? (
                      <Phone className="h-2.5 w-2.5" />
                    ) : (
                      <Video className="h-2.5 w-2.5" />
                    )}
                    {activeConv?.metadata?.callMode || "video"}
                  </span>
                  {activeConv?.metadata?.customerEmail && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      · {activeConv.metadata.customerEmail}
                    </p>
                  )}
                </div>
              </div>

              {/* Call actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                {callLive ? (
                  <>
                    <Button
                      size="sm"
                      onClick={handleJoinCall}
                      className="h-9 px-2.5 text-xs gap-1.5 rounded-xl"
                    >
                      <PhoneCall className="h-3 w-3" />
                      Join
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleEndCall}
                      disabled={endingCall}
                      className="h-9 px-2.5 text-xs gap-1.5 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
                    >
                      {endingCall ? <Loader2 className="h-3 w-3 animate-spin" /> : <PhoneOff className="h-3 w-3" />}
                      End
                    </Button>
                  </>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        onClick={handleStartCall}
                        disabled={startingCall}
                        className="h-9 px-2.5 text-xs gap-1.5 rounded-xl"
                      >
                        {startingCall ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : activeConv?.metadata?.callMode === "voice" ? (
                          <Phone className="h-3 w-3" />
                        ) : (
                          <Video className="h-3 w-3" />
                        )}
                        Start call
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Start the JitsiMeet session</TooltipContent>
                  </Tooltip>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      <p className="font-medium mb-1">Handling team</p>
                      {activeConv?.members.map((m) => (
                        <p key={m._id} className="text-muted-foreground">
                          {m.fullName}
                        </p>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Timeline */}
            <div className="flex-1 min-h-0 overflow-y-auto py-3" style={{ scrollbarWidth: "thin" }}>
              {loadingMsgs && messages.length === 0 ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
                  <div className="h-12 w-12 rounded-[10px] bg-muted flex items-center justify-center">
                    <Clock className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium">No activity yet</p>
                  <p className="text-xs text-muted-foreground">
                    Send a status update or start the call when you&apos;re ready.
                  </p>
                </div>
              ) : (
                messages.map((m) => <TimelineRow key={m._id} msg={m} />)
              )}
              <div ref={endRef} />
            </div>

            {/* Predefined status sender (one-way) */}
            <div className="shrink-0 px-3 pb-3 pt-2 border-t border-border space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground px-1 font-mono">
                Send a status update
              </p>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => handleSendPreset(preset.key)}
                    disabled={sendingPreset !== null}
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl border border-border bg-muted/30 px-2.5 py-2.5 text-xs font-medium transition-all hover:bg-chart-4/10 hover:border-chart-4/40 disabled:opacity-50",
                      preset.key === "declined" && "border-destructive/20 text-destructive hover:bg-destructive/10 hover:border-destructive/30"
                    )}
                  >
                    {sendingPreset === preset.key ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3 opacity-60" />
                    )}
                    {preset.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground/60 px-1">
                Updates are delivered to the customer as one-way notifications — they cannot reply here.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

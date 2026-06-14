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
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { useCrmToken } from "@/hooks/useCrmToken";
import { useSupraSpaceSocket } from "@/hooks/useSupraSpaceSocket";
import { format, isToday, isYesterday } from "date-fns";
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
  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d");
}
function fmtFull(d: string) {
  return format(new Date(d), "MMM d, yyyy · h:mm a");
}
function ini(name: string) {
  return (name || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const STATUS_BADGE: Record<CallStatus, { label: string; cls: string }> = {
  idle: { label: "Idle", cls: "border-border/40 text-muted-foreground bg-muted/40" },
  requested: { label: "Requested", cls: "border-blue-500/30 text-blue-600 bg-blue-500/5" },
  preparing: { label: "Preparing", cls: "border-amber-500/30 text-amber-600 bg-amber-500/5" },
  about_to_start: { label: "Starting", cls: "border-emerald-500/30 text-emerald-600 bg-emerald-500/5" },
  in_progress: { label: "In call", cls: "border-emerald-500/40 text-emerald-700 bg-emerald-500/10" },
  ended: { label: "Ended", cls: "border-border/40 text-muted-foreground bg-muted/40" },
  declined: { label: "Declined", cls: "border-red-500/30 text-red-600 bg-red-500/5" },
};

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

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 px-3 py-3 text-left rounded-xl transition-all relative",
        isActive ? "bg-amber-500/8 ring-1 ring-amber-500/20" : "hover:bg-muted/60"
      )}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-linear-to-b from-amber-500 to-orange-600 rounded-r" />
      )}
      <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white mt-0.5 bg-linear-to-br from-blue-500 to-blue-700 shadow-sm shadow-blue-900/20">
        {ini(conv.metadata?.customerName || conv.name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <p className={cn("text-sm font-semibold truncate flex-1", conv.unreadCount > 0 && "font-bold")}>
            {conv.metadata?.customerName || conv.name}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {conv.unreadCount > 0 && (
              <span className="h-4.5 min-w-4.5 rounded-full bg-linear-to-br from-amber-500 to-orange-600 text-white text-[9px] font-bold flex items-center justify-center px-1">
                {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground/60 tabular-nums">
              {fmtRelative(conv.lastMessageAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <Badge variant="outline" className="h-4 px-1.5 text-[9px] gap-1 capitalize">
            {mode === "voice" ? <Phone className="h-2.5 w-2.5" /> : <Video className="h-2.5 w-2.5" />}
            {mode}
          </Badge>
          <Badge variant="outline" className={cn("h-4 px-1.5 text-[9px]", badge.cls)}>
            {badge.label}
          </Badge>
        </div>
      </div>
    </button>
  );
}

// ─── Status timeline row ──────────────────────────────────────────────────────

function TimelineRow({ msg, crmUserId }: { msg: CallMessage; crmUserId: string }) {
  const isCustomer = msg.metadata?.isCustomerMessage === true;
  const senderName = isCustomer
    ? msg.metadata?.customerName || "Customer"
    : msg.metadata?.crmUserName || "Support";

  return (
    <div className={cn("flex gap-2.5 px-5 py-1", !isCustomer && "flex-row-reverse")}>
      <div
        className={cn(
          "h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-white shadow-sm",
          isCustomer
            ? "bg-linear-to-br from-blue-500 to-blue-700 shadow-blue-900/20"
            : "bg-linear-to-br from-amber-500 to-orange-600 shadow-amber-900/20"
        )}
      >
        {ini(senderName)}
      </div>
      <div className={cn("flex flex-col gap-0.5 max-w-[72%]", !isCustomer && "items-end")}>
        <div className="flex items-center gap-1.5 px-0.5">
          <span className="text-[11px] font-medium text-muted-foreground">{senderName}</span>
          {isCustomer ? (
            <Badge variant="outline" className="h-4 px-1.5 text-[9px] border-blue-500/30 text-blue-600 bg-blue-500/5">
              Customer
            </Badge>
          ) : (
            msg.metadata?.crmUserRole && (
              <Badge variant="outline" className="h-4 px-1.5 text-[9px]">
                {msg.metadata.crmUserRole}
              </Badge>
            )
          )}
        </div>
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2 text-sm leading-relaxed wrap-break-word flex items-start gap-2",
            isCustomer
              ? "bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-foreground rounded-tl-sm"
              : "bg-linear-to-br from-amber-500 to-orange-600 text-white rounded-tr-sm shadow-sm shadow-amber-900/10"
          )}
        >
          {!isCustomer && <Bell className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-80" />}
          <span>{msg.content}</span>
        </div>
        <span className="text-[10px] text-muted-foreground/50 tabular-nums px-0.5">
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
    <div className="flex h-full min-h-0 overflow-hidden rounded-xl border border-border/50 bg-background">
      {/* ── Left: request list ── */}
      <div
        className={cn(
          "flex flex-col border-r border-border/50 shrink-0 overflow-hidden",
          activeId ? "hidden md:flex md:w-72 lg:w-80" : "w-full md:w-72 lg:w-80"
        )}
      >
        <div className="relative overflow-hidden p-3 space-y-2.5 border-b border-border/50 shrink-0">
          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-amber-500/8 blur-2xl pointer-events-none" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-amber-500 to-orange-600 shadow-sm shadow-amber-900/20 dark:shadow-amber-900/40">
                <PhoneCall className="h-3.5 w-3.5 text-white" />
                <div className="absolute inset-0 rounded-xl ring-1 ring-amber-400/30" />
              </div>
              <p className="font-bold text-sm tracking-tight">Calls</p>
              {totalUnread > 0 && (
                <Badge className="h-4.5 min-w-4.5 rounded-full text-[9px] font-bold px-1.5 bg-amber-600 hover:bg-amber-600">
                  {totalUnread > 99 ? "99+" : totalUnread}
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => refetchConvs()} className="h-7 w-7 p-0 rounded-lg hover:bg-amber-500/10 hover:text-amber-600">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search customers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-muted/40 border-border/40 rounded-xl focus-visible:ring-amber-500/30 focus-visible:border-amber-500/40"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5" style={{ scrollbarWidth: "thin" }}>
          {loadingConvs ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
              <div className="relative h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center ring-1 ring-amber-500/15">
                <PhoneCall className="h-5 w-5 text-amber-400" />
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
            <div className="relative h-16 w-16 rounded-2xl bg-linear-to-br from-amber-500/15 to-orange-600/10 flex items-center justify-center ring-1 ring-amber-500/15">
              <PhoneCall className="h-7 w-7 text-amber-400" />
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
            <div className="relative shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-card overflow-hidden">
              <div className="absolute -top-10 right-10 h-28 w-28 rounded-full bg-amber-500/6 blur-2xl pointer-events-none -z-10" />
              <button
                onClick={() => setActiveId(null)}
                className="md:hidden h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
              </button>
              <div className="h-9 w-9 rounded-full bg-linear-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm shadow-blue-900/20">
                {ini(activeConv?.metadata?.customerName || "")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate">
                    {activeConv?.metadata?.customerName || "Customer"}
                  </p>
                  <Badge
                    variant="outline"
                    className={cn("h-4 px-1.5 text-[9px] shrink-0", STATUS_BADGE[activeStatus]?.cls)}
                  >
                    {STATUS_BADGE[activeStatus]?.label}
                  </Badge>
                  <Badge variant="outline" className="h-4 px-1.5 text-[9px] gap-1 shrink-0 capitalize">
                    {activeConv?.metadata?.callMode === "voice" ? (
                      <Phone className="h-2.5 w-2.5" />
                    ) : (
                      <Video className="h-2.5 w-2.5" />
                    )}
                    {activeConv?.metadata?.callMode || "video"}
                  </Badge>
                </div>
                {activeConv?.metadata?.customerEmail && (
                  <p className="text-[11px] text-muted-foreground truncate">
                    {activeConv.metadata.customerEmail}
                  </p>
                )}
              </div>

              {/* Call actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                {callLive ? (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          onClick={handleJoinCall}
                          className="h-7 px-2.5 text-xs gap-1.5 rounded-lg bg-linear-to-br from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 shadow-sm shadow-emerald-900/20"
                        >
                          <PhoneCall className="h-3 w-3" />
                          Join
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Re-join the live call</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleEndCall}
                          disabled={endingCall}
                          className="h-7 px-2.5 text-xs gap-1.5 border-red-500/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                        >
                          {endingCall ? <Loader2 className="h-3 w-3 animate-spin" /> : <PhoneOff className="h-3 w-3" />}
                          End
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>End the call</TooltipContent>
                    </Tooltip>
                  </>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        onClick={handleStartCall}
                        disabled={startingCall}
                        className="h-7 px-2.5 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700"
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
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
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
            <div className="flex-1 min-h-0 overflow-y-auto py-3 space-y-0.5" style={{ scrollbarWidth: "thin" }}>
              {loadingMsgs && messages.length === 0 ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
                  <div className="relative h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center ring-1 ring-amber-500/15">
                    <Clock className="h-5 w-5 text-amber-400" />
                  </div>
                  <p className="text-sm font-medium">No activity yet</p>
                  <p className="text-xs text-muted-foreground">
                    Send a status update or start the call when you&apos;re ready.
                  </p>
                </div>
              ) : (
                messages.map((m) => <TimelineRow key={m._id} msg={m} crmUserId={crmUserId} />)
              )}
              <div ref={endRef} />
            </div>

            {/* Predefined status sender (one-way) */}
            <div className="shrink-0 px-3 pb-3 pt-2 border-t border-border/50 space-y-2">
              {notice && (
                <p
                  className={cn(
                    "text-[11px] px-1",
                    notice.kind === "error" ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  {notice.text}
                </p>
              )}
              <p className="text-[11px] font-medium text-muted-foreground px-1">
                Send a status update to the customer
              </p>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => handleSendPreset(preset.key)}
                    disabled={sendingPreset !== null}
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl border border-border/60 bg-muted/30 px-2.5 py-1.5 text-xs font-medium transition-all hover:bg-amber-500/8 hover:border-amber-500/30 hover:text-amber-700 dark:hover:text-amber-400 disabled:opacity-50",
                      preset.key === "declined" && "border-red-500/20 text-red-600 hover:bg-red-50 hover:border-red-500/30 hover:text-red-600 dark:hover:bg-red-950/20"
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
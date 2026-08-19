"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Check as CheckIcon,
  ChevronDown,
  Inbox,
  LayoutGrid,
  LogOut,
  Mail,
  MessageSquare,
  Moon,
  PhoneCall,
  Plus,
  RefreshCw,
  Smartphone,
  Square,
  Sun,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiClient } from "@/lib/api-client";
import { useAuth, useUser } from "@/providers/AuthProvider";
import { useTheme } from "@/context/ThemeContext";
import { useMailRealtime } from "@/hooks/useMailRealtime";
import { useDispatchChatUnread } from "@/hooks/useDispatchChatUnread";

import { ensureMailStyles } from "@/components/suprah-mail/theme";
import { ConnectGmailScreen } from "@/components/suprah-mail/Shared";
import { InboxTab } from "@/components/suprah-mail/InboxTab";
import { ConversationTab } from "@/components/suprah-mail/ConversationTab";
import { DispatchChatTab } from "@/components/suprah-mail/DispatchChatTab";
import { CallDialPadTab } from "@/components/suprah-mail/CallDialPadTab";
import { SmsTab } from "@/components/suprah-mail/SmsTab";
import { OverviewTab } from "@/components/suprah-mail/OverviewTab";
import {
  CommunicationPaneWorkspace,
  movePaneInRows,
  type PaneDropZone,
  type PaneRows,
} from "@/components/suprah-mail/CommunicationPaneWorkspace";
import { getErrorMessage, getJwtType } from "@/components/suprah-mail/utils";
import type { ConvPushPayload, MailStatus } from "@/components/suprah-mail/types";

ensureMailStyles();

type CommunicationTab = "overview" | "inbox" | "conversation" | "dispatch" | "sms" | "call";

const LAST_CHANNEL_STORAGE_KEY = "sm5_last_channel";
const VALID_CHANNELS: CommunicationTab[] = [
  "overview",
  "inbox",
  "conversation",
  "dispatch",
  "sms",
  "call",
];

// Overview is the default landing pane, not a communication channel, so it
// stays out of CHANNELS (which drives the selectable channel list and the
// Add Pane menu) — kept separately just for header/trigger icon+label
// lookups on whichever pane happens to be showing it.
const OVERVIEW_CHANNEL: {
  key: CommunicationTab;
  label: string;
  description: string;
  icon: React.ElementType;
} = {
  key: "overview",
  label: "Overview",
  description: "Your One Desk home — quick status for every channel",
  icon: LayoutGrid,
};

const CHANNELS: Array<{
  key: CommunicationTab;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    key: "inbox",
    label: "Inbox",
    description: "Gmail folders, drafts and email threads",
    icon: Inbox,
  },
  {
    key: "conversation",
    label: "Email Chat",
    description: "External email conversations in chat form",
    icon: MessageSquare,
  },
  {
    key: "dispatch",
    label: "Dispatch Chat",
    description: "Private dispatcher ↔ driver operations",
    icon: Truck,
  },
  {
    key: "sms",
    label: "SMS",
    description: "Reserved for the approved SMS integration",
    icon: Smartphone,
  },
  {
    key: "call",
    label: "Call",
    description: "Reserved for the approved calling integration",
    icon: PhoneCall,
  },
];

function LoadingSplash({ theme }: { theme: "dark" | "light" }) {
  return (
    <div
      className="sm5 flex h-full w-full items-center justify-center"
      data-theme={theme}
      style={{ minHeight: 320 }}
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{
            background: "linear-gradient(140deg,#16a34a,#34c97d)",
            boxShadow: "0 4px 16px rgba(52,201,125,0.25)",
          }}
        >
          <Mail className="h-6 w-6 text-white" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <p
            className="sm5-display font-bold"
            style={{ fontSize: 16, color: "var(--text-primary)" }}
          >
            Suprah <span style={{ color: "var(--accent)" }}>One Desk</span>
          </p>
          <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            Every Channel. Every Conversation. One Desk.
          </p>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="sm5-dot inline-block h-1.5 w-1.5 rounded-full"
                style={{
                  background: "var(--accent)",
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChannelSelector({
  value,
  onChange,
  inboxUnread,
  emailUnread,
  dispatchUnread,
  smsUnread,
  callUnread,
  disabledKeys = [],
}: {
  value: CommunicationTab;
  onChange: (tab: CommunicationTab) => void;
  inboxUnread: number;
  emailUnread: number;
  dispatchUnread: number;
  smsUnread: number;
  callUnread: number;
  disabledKeys?: CommunicationTab[];
}) {
  const active =
    value === "overview"
      ? OVERVIEW_CHANNEL
      : CHANNELS.find((channel) => channel.key === value) ?? CHANNELS[0];
  const ActiveIcon = active.icon;

  const unreadFor = (key: CommunicationTab) => {
    if (key === "inbox") return inboxUnread;
    if (key === "conversation") return emailUnread;
    if (key === "dispatch") return dispatchUnread;
    if (key === "sms") return smsUnread;
    if (key === "call") return callUnread;
    return 0;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-9 min-w-0 max-w-[15rem] items-center gap-2 rounded-xl border px-3 text-left text-white transition-all hover:-translate-y-px hover:brightness-105 active:translate-y-0"
          style={{
            background: "var(--accent)",
            borderColor: "var(--accent)",
            color: "#ffffff",
            boxShadow: "0 4px 14px rgba(16,185,129,0.18)",
          }}
          aria-label="Choose communication channel"
        >
          <div className="flex size-6 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white">
            <ActiveIcon className="size-3.5" />
          </div>
          <span className="min-w-0 flex-1 truncate text-xs font-bold">
            {active.label}
          </span>
          {(unreadFor(active.key) > 0 || active.key === "sms" || active.key === "call") && (
            <span
              className={`shrink-0 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[8px] font-black ${
                unreadFor(active.key) > 0
                  ? "bg-white text-emerald-700"
                  : "border border-white/20 bg-white/10 text-white/90"
              }`}
            >
              {unreadFor(active.key) > 99 ? "99+" : unreadFor(active.key)}
            </span>
          )}
          <ChevronDown className="size-3.5 shrink-0" style={{ color: "var(--text-tertiary)" }} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-80 p-1.5">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Communication Channel
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {CHANNELS.map((channel) => {
          const Icon = channel.icon;
          const unread = unreadFor(channel.key);
          const selected = channel.key === value;
          const disabled =
            !selected && disabledKeys.includes(channel.key);

          return (
            <DropdownMenuItem
              key={channel.key}
              disabled={disabled}
              onSelect={() => {
                if (!disabled) onChange(channel.key);
              }}
              className={`my-1 flex items-start gap-3 rounded-xl border px-3 py-3 transition-all ${
                selected
                  ? "border-emerald-500 bg-emerald-500 text-white shadow-sm focus:bg-emerald-500 focus:text-white"
                  : disabled
                    ? "border-border/50 bg-muted/20 text-muted-foreground opacity-50"
                    : "border-border/70 bg-background/85 text-foreground shadow-sm hover:border-emerald-500/35 hover:bg-emerald-500/[0.06] focus:border-emerald-500/35 focus:bg-emerald-500/[0.06] focus:text-foreground"
              }`}
            >
              <div
                className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border ${
                  selected
                    ? "border-white/20 bg-white/10 text-white"
                    : "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-600 dark:text-emerald-400"
                }`}
              >
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1 py-0.5">
                <p
                  className={`text-[12.5px] font-bold leading-tight ${
                    selected ? "text-white" : "text-foreground"
                  }`}
                >
                  {channel.label}
                </p>
                <p
                  className={`mt-1 line-clamp-2 text-[10.5px] font-medium leading-snug ${
                    selected
                      ? "text-white/80"
                      : "text-foreground/65 dark:text-foreground/70"
                  }`}
                >
                  {channel.description}
                </p>
              </div>
              {(unread > 0 || channel.key === "sms" || channel.key === "call") && (
                <span
                  className={`mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[8.5px] font-black ${
                    selected
                      ? unread > 0
                        ? "bg-white text-emerald-700"
                        : "border border-white/20 bg-white/10 text-white/85"
                      : unread > 0
                        ? "bg-emerald-600 text-white"
                        : "border border-border/70 bg-muted/70 text-foreground/70"
                  }`}
                >
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
              {selected && <CheckIcon className="mt-1 size-3.5 shrink-0 text-white" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AddPaneMenu({
  availableChannels,
  onAdd,
}: {
  availableChannels: typeof CHANNELS;
  onAdd: (channel: CommunicationTab) => void;
}) {
  const disabled = availableChannels.length === 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="sm5-btn flex h-9 shrink-0 items-center gap-1.5 px-3"
          style={{ fontSize: 12 }}
          title={
            disabled
              ? "All communication channels are already open"
              : "Add another communication pane"
          }
        >
          <Plus className="size-3.5" />
          <span className="hidden sm:inline">Add Pane</span>
          <ChevronDown className="size-3.5" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-72 p-1.5">
        <DropdownMenuLabel className="sm5-label px-2 py-1.5">
          Add communication pane
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {availableChannels.length === 0 ? (
          <div className="px-3 py-4 text-center">
            <p className="sm5-supporting">
              All available channels are already open.
            </p>
          </div>
        ) : (
          availableChannels.map((channel) => {
            const Icon = channel.icon;
            return (
              <DropdownMenuItem
                key={channel.key}
                onSelect={() => onAdd(channel.key)}
                className="my-1 flex items-start gap-3 rounded-xl border border-border/70 bg-background/85 px-3 py-3 text-foreground transition-all hover:border-emerald-500/35 hover:bg-emerald-500/[0.06] focus:border-emerald-500/35 focus:bg-emerald-500/[0.06]"
              >
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-600 dark:text-emerald-400">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="sm5-title-sm">{channel.label}</p>
                  <p className="sm5-supporting mt-1 line-clamp-2">
                    {channel.description}
                  </p>
                </div>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


export default function SuprahMailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();
  const { getToken: getMainToken } = useAuth();
  const { user } = useUser();

  const getMainTokenRef = React.useRef(getMainToken);
  getMainTokenRef.current = getMainToken;

  const [token, setToken] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const initialPaneId = "pane-1";
  const paneCounterRef = React.useRef(1);
  const [panes, setPanes] = React.useState<
    Array<{ id: string; channel: CommunicationTab }>
  >([{ id: initialPaneId, channel: "overview" }]);
  const [paneRows, setPaneRows] = React.useState<PaneRows>([
    [initialPaneId],
  ]);
  const [focusedPaneId, setFocusedPaneId] =
    React.useState(initialPaneId);

  const [status, setStatus] = React.useState<MailStatus | null>(null);
  const [connecting, setConnecting] = React.useState(false);

  const [inboxRefreshSignal, setInboxRefreshSignal] = React.useState(0);
  const [conversationRefreshSignal, setConversationRefreshSignal] = React.useState(0);

  // Manual refresh is pane-scoped. Two Inbox/Email Chat/Dispatch panes may
  // legitimately show different folders, searches, filters, or conversations;
  // refreshing the focused pane must not refresh every pane of that channel.
  const [paneManualRefreshSignals, setPaneManualRefreshSignals] =
    React.useState<Record<string, number>>({});
  const [convPushes, setConvPushes] = React.useState<ConvPushPayload[]>([]);
  const [inboxUnreadTotal, setInboxUnreadTotal] = React.useState(0);
  const [emailUnreadTotal, setEmailUnreadTotal] = React.useState(0);

  const inboxUnreadRequestSeqRef = React.useRef(0);
  const inboxUnreadInFlightRef = React.useRef<Promise<void> | null>(null);
  const inboxUnreadPendingRef = React.useRef(false);

  // Email Chat must know its unread total before ConversationTab is mounted.
  // Reuse the existing /api/mail/conversations response and keep one shared
  // page-level authoritative counter, just like Inbox/Dispatch Chat.
  const emailChatUnreadRequestSeqRef = React.useRef(0);
  const emailChatUnreadInFlightRef = React.useRef<Promise<void> | null>(null);
  const emailChatUnreadPendingRef = React.useRef(false);

  const inboxRealtimeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversationRealtimeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastInboxSafetyReconcileAtRef = React.useRef(0);
  const lastConversationSafetyReconcileAtRef = React.useRef(0);
  const [convUnreadBump, setConvUnreadBump] = React.useState(0);

  const dispatchChatEnabled = ["employee", "admin", "super_admin"].includes(
    String(user?.role ?? ""),
  );

  const {
    unreadTotal: dispatchUnreadTotal,
    refresh: refreshDispatchUnread,
  } = useDispatchChatUnread({
    enabled: dispatchChatEnabled,
  });

  const focusedPane =
    panes.find((pane) => pane.id === focusedPaneId) ?? panes[0];
  const focusedChannel = focusedPane?.channel ?? "overview";

  // Remember the last channel the user had focused so the next visit reopens
  // there instead of always defaulting back to Overview.
  React.useEffect(() => {
    if (focusedChannel) {
      localStorage.setItem(LAST_CHANNEL_STORAGE_KEY, focusedChannel);
    }
  }, [focusedChannel]);

  const activeChannelKeys = React.useMemo(
    () => panes.map((pane) => pane.channel),
    [panes],
  );

  const unavailableForFocusedSelector = React.useMemo(
    () =>
      panes
        .filter((pane) => pane.id !== focusedPaneId)
        .map((pane) => pane.channel),
    [focusedPaneId, panes],
  );

  const availablePaneChannels = React.useMemo(
    () =>
      CHANNELS.filter(
        (channel) => !activeChannelKeys.includes(channel.key),
      ),
    [activeChannelKeys],
  );

  const changeChannel = React.useCallback(
    (next: CommunicationTab) => {
      const usedByAnotherPane = panes.some(
        (pane) =>
          pane.id !== focusedPaneId && pane.channel === next,
      );
      if (usedByAnotherPane) return;

      setPanes((current) =>
        current.map((pane) =>
          pane.id === focusedPaneId
            ? { ...pane, channel: next }
            : pane,
        ),
      );

      if (next === "conversation") {
        setConvUnreadBump(0);
      }
    },
    [focusedPaneId, panes],
  );

  const addPane = React.useCallback(
    (channel: CommunicationTab) => {
      if (panes.some((pane) => pane.channel === channel)) {
        return;
      }

      paneCounterRef.current += 1;
      const paneId = `pane-${paneCounterRef.current}`;

      setPanes((current) => [...current, { id: paneId, channel }]);

      setPaneRows((currentRows) => {
        const next = currentRows.map((row) => [...row]);
        const focusedRowIndex = next.findIndex((row) =>
          row.includes(focusedPaneId),
        );

        const targetRowIndex =
          focusedRowIndex >= 0
            ? focusedRowIndex
            : Math.max(0, next.length - 1);

        const targetRow = next[targetRowIndex] ?? [];

        // Default additions stay beside the focused pane while the row has
        // enough room. After three panes, create a new full-width row below.
        if (targetRow.length >= 3) {
          next.splice(targetRowIndex + 1, 0, [paneId]);
          return next;
        }

        const focusedIndex = targetRow.indexOf(focusedPaneId);
        const insertAt =
          focusedIndex >= 0 ? focusedIndex + 1 : targetRow.length;
        targetRow.splice(insertAt, 0, paneId);
        return next;
      });

      setFocusedPaneId(paneId);

      if (channel === "conversation") {
        setConvUnreadBump(0);
      }
    },
    [focusedPaneId, panes],
  );

  const closePane = React.useCallback(
    (paneId: string) => {
      if (panes.length <= 1) return;

      const remainingPanes = panes.filter(
        (pane) => pane.id !== paneId,
      );
      const remainingIds = new Set(
        remainingPanes.map((pane) => pane.id),
      );

      setPanes(remainingPanes);
      setPaneRows((currentRows) =>
        currentRows
          .map((row) =>
            row.filter((id) => id !== paneId),
          )
          .filter((row) => row.length > 0),
      );

      if (focusedPaneId === paneId) {
        const nextFocused =
          paneRows
            .flat()
            .find(
              (id) =>
                id !== paneId && remainingIds.has(id),
            ) ?? remainingPanes[0]?.id;

        if (nextFocused) setFocusedPaneId(nextFocused);
      }
    },
    [focusedPaneId, paneRows, panes],
  );

  const revertToSingleView = React.useCallback(() => {
    const keep =
      panes.find((pane) => pane.id === focusedPaneId) ??
      panes[0];
    if (!keep) return;

    setPanes([keep]);
    setPaneRows([[keep.id]]);
    setFocusedPaneId(keep.id);
  }, [focusedPaneId, panes]);

  const movePane = React.useCallback(
    (
      sourcePaneId: string,
      targetPaneId: string,
      zone: PaneDropZone,
    ) => {
      setPaneRows((currentRows) =>
        movePaneInRows(
          currentRows,
          sourcePaneId,
          targetPaneId,
          zone,
        ),
      );
      setFocusedPaneId(sourcePaneId);
    },
    [],
  );

  const globalRefreshAvailable =
    focusedChannel === "dispatch"
      ? dispatchChatEnabled
      : focusedChannel === "inbox" ||
          focusedChannel === "conversation"
        ? Boolean(status?.connected)
        : false;

  const globalRefreshTitle =
    focusedChannel === "inbox"
      ? "Refresh Inbox"
      : focusedChannel === "conversation"
        ? "Refresh Email Chat"
        : focusedChannel === "dispatch"
          ? "Refresh Dispatch Chat"
          : focusedChannel === "sms"
            ? "Refresh will be available when SMS is connected"
            : focusedChannel === "call"
              ? "Refresh will be available when calling is connected"
              : "Nothing to refresh here";

  const handleGlobalRefresh = React.useCallback(() => {
    const canRefreshFocusedPane =
      focusedChannel === "dispatch"
        ? dispatchChatEnabled
        : focusedChannel === "inbox" ||
            focusedChannel === "conversation"
          ? Boolean(status?.connected)
          : false;

    if (!canRefreshFocusedPane || !focusedPaneId) return;

    setPaneManualRefreshSignals((current) => ({
      ...current,
      [focusedPaneId]:
        (current[focusedPaneId] || 0) + 1,
    }));
  }, [
    dispatchChatEnabled,
    focusedChannel,
    focusedPaneId,
    status?.connected,
  ]);

  const mailWorkspaceActive =
    panes.some(
      (pane) =>
        pane.channel === "dispatch" ||
        pane.channel === "sms" ||
        pane.channel === "call",
    ) ||
    (panes.some(
      (pane) => pane.channel === "conversation",
    ) &&
      Boolean(status?.connected));

  React.useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("suprah-mail:workspace-state", {
        detail: { active: mailWorkspaceActive },
      }),
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent("suprah-mail:workspace-state", {
          detail: { active: false },
        }),
      );
    };
  }, [mailWorkspaceActive]);

  React.useEffect(() => {
    (async () => {
      let nextToken = localStorage.getItem("crm_token");

      if (nextToken && getJwtType(nextToken) !== "crm") {
        localStorage.removeItem("crm_token");
        nextToken = null;
      }

      if (!nextToken) {
        const mainToken = await getMainTokenRef.current();
        if (mainToken) {
          try {
            const session = await apiClient.post(
              "/api/supraspace/session-token",
              {},
              { headers: { Authorization: `Bearer ${mainToken}` } },
            );
            nextToken = session.data?.data?.token ?? null;
          } catch {
            try {
              const sso = await apiClient.get("/api/auth/crm-sso", {
                headers: { Authorization: `Bearer ${mainToken}` },
              });
              nextToken = sso.data?.data?.token ?? null;
            } catch {
              // The redirect below handles a missing CRM session.
            }
          }

          if (nextToken) localStorage.setItem("crm_token", nextToken);
        }
      }

      if (!nextToken) {
        router.replace("/crm");
        return;
      }

      setToken(nextToken);

      const savedChannel = localStorage.getItem(LAST_CHANNEL_STORAGE_KEY);
      if (savedChannel && (VALID_CHANNELS as string[]).includes(savedChannel)) {
        setPanes([{ id: initialPaneId, channel: savedChannel as CommunicationTab }]);
      }

      try {
        const response = await apiClient.get("/api/mail/status", {
          headers: { Authorization: `Bearer ${nextToken}` },
        });
        setStatus(response.data?.data);
      } catch (error: any) {
        if (error?.response?.status === 401) {
          localStorage.removeItem("crm_token");
          router.replace("/crm");
          return;
        }
        setStatus({ connected: false, gmailAddress: null });
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const mailParam = searchParams.get("mail");

  React.useEffect(() => {
    if (!mailParam) return;

    if (mailParam === "connected") {
      toast.success("Gmail connected — syncing your inbox now");
    } else if (mailParam === "denied") {
      toast.error("Google access was denied. Connect Gmail to use Suprah One Desk.");
    } else {
      toast.error("Gmail connection failed. Please try again.");
    }

    router.replace("/crm/suprah-mail", { scroll: false });

    if (mailParam === "connected" && token) {
      apiClient
        .get("/api/mail/status", {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((response: any) => setStatus(response.data?.data))
        .catch(() => {});
    }
  }, [mailParam, router, token]);

  const hasOpenChannel = React.useCallback(
    (channel: CommunicationTab) =>
      panes.some((pane) => pane.channel === channel),
    [panes],
  );

  /**
   * One Desk channel-level Inbox unread counter.
   *
   * This reuses the existing /api/mail/mailbox-summary endpoint; no new API
   * contract is introduced. The Stage 2 badge-count fix makes an invalidated
   * summary request return Gmail's refreshed mailbox-wide count within the
   * existing bounded deadline.
   *
   * Coalesce overlapping requests and preserve one trailing refresh so bursty
   * Gmail socket events cannot leave the header badge one event behind.
   */
  const refreshInboxUnreadTotal = React.useCallback(async () => {
    if (!token || !status?.connected) {
      setInboxUnreadTotal(0);
      return;
    }

    if (inboxUnreadInFlightRef.current) {
      inboxUnreadPendingRef.current = true;
      return inboxUnreadInFlightRef.current;
    }

    let request!: Promise<void>;
    request = (async () => {
      try {
        do {
          inboxUnreadPendingRef.current = false;
          const requestSeq =
            ++inboxUnreadRequestSeqRef.current;

          try {
            const response = await apiClient.get(
              "/api/mail/mailbox-summary",
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                timeout: 30_000,
              },
            );

            if (
              requestSeq !==
              inboxUnreadRequestSeqRef.current
            ) {
              continue;
            }

            const mailboxes = Array.isArray(
              response.data?.data?.mailboxes,
            )
              ? response.data.data.mailboxes
              : [];

            const inboxSummary = mailboxes.find(
              (item: any) =>
                String(item?.id || "") === "INBOX",
            );

            if (inboxSummary?.unreadCount != null) {
              setInboxUnreadTotal(
                Math.max(
                  0,
                  Number(inboxSummary.unreadCount),
                ),
              );
            }
          } catch {
            // Keep the last successful count. The next socket event,
            // reconnect, visibility safety check, or Inbox mutation retries.
          }
        } while (inboxUnreadPendingRef.current);
      } finally {
        if (inboxUnreadInFlightRef.current === request) {
          inboxUnreadInFlightRef.current = null;
        }
      }
    })();

    inboxUnreadInFlightRef.current = request;
    return request;
  }, [
    status?.connected,
    token,
  ]);

  React.useEffect(() => {
    if (!status?.connected) {
      setInboxUnreadTotal(0);
      return;
    }

    void refreshInboxUnreadTotal();
  }, [
    refreshInboxUnreadTotal,
    status?.connected,
  ]);

  /**
   * Email Chat unread total independent of ConversationTab mounting.
   *
   * The existing conversations endpoint already returns each conversation's
   * persisted unreadCount. Fetch it at One Desk startup so the channel badge is
   * available immediately even while the user is still on Inbox/Dispatch.
   */
  const refreshEmailChatUnreadTotal = React.useCallback(async () => {
    if (!token || !status?.connected) {
      setEmailUnreadTotal(0);
      setConvUnreadBump(0);
      return;
    }

    if (emailChatUnreadInFlightRef.current) {
      emailChatUnreadPendingRef.current = true;
      return emailChatUnreadInFlightRef.current;
    }

    let request!: Promise<void>;
    request = (async () => {
      try {
        do {
          emailChatUnreadPendingRef.current = false;
          const requestSeq =
            ++emailChatUnreadRequestSeqRef.current;

          try {
            const response = await apiClient.get(
              "/api/mail/conversations",
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                timeout: 30_000,
              },
            );

            if (
              requestSeq !==
              emailChatUnreadRequestSeqRef.current
            ) {
              continue;
            }

            const conversations = Array.isArray(
              response.data?.data?.conversations,
            )
              ? response.data.data.conversations
              : [];

            const total = conversations.reduce(
              (sum: number, conversation: any) =>
                sum +
                Math.max(
                  0,
                  Number(conversation?.unreadCount || 0),
                ),
              0,
            );

            setEmailUnreadTotal(total);
            setConvUnreadBump(0);
          } catch {
            // Keep the last successful total. Reconnect/focus/socket events
            // will retry without flashing a false zero.
          }
        } while (emailChatUnreadPendingRef.current);
      } finally {
        if (
          emailChatUnreadInFlightRef.current === request
        ) {
          emailChatUnreadInFlightRef.current = null;
        }
      }
    })();

    emailChatUnreadInFlightRef.current = request;
    return request;
  }, [
    status?.connected,
    token,
  ]);

  React.useEffect(() => {
    if (!status?.connected) {
      setEmailUnreadTotal(0);
      setConvUnreadBump(0);
      return;
    }

    // Fresh One Desk open: preload Email Chat unread count immediately.
    void refreshEmailChatUnreadTotal();
  }, [
    refreshEmailChatUnreadTotal,
    status?.connected,
  ]);

  const scheduleInboxRealtimeReconcile = React.useCallback(
    (delay = 120) => {
      if (!status?.connected || !hasOpenChannel("inbox")) return;

      if (inboxRealtimeTimerRef.current) {
        clearTimeout(inboxRealtimeTimerRef.current);
      }

      inboxRealtimeTimerRef.current = setTimeout(() => {
        inboxRealtimeTimerRef.current = null;
        setInboxRefreshSignal((value) => value + 1);
      }, delay);
    },
    [hasOpenChannel, status?.connected],
  );

  const scheduleConversationRealtimeReconcile = React.useCallback(
    (delay = 160) => {
      if (!status?.connected || !hasOpenChannel("conversation")) return;

      if (conversationRealtimeTimerRef.current) {
        clearTimeout(conversationRealtimeTimerRef.current);
      }

      conversationRealtimeTimerRef.current = setTimeout(() => {
        conversationRealtimeTimerRef.current = null;
        setConversationRefreshSignal((value) => value + 1);
      }, delay);
    },
    [hasOpenChannel, status?.connected],
  );

  const { connected: socketConnected } = useMailRealtime(token || null, {
    onInboxUpdate: () => {
      // Gmail history may report several added/changed ids in one sync. Collapse
      // them into one silent UI reconciliation instead of multiplying requests.
      scheduleInboxRealtimeReconcile();

      // The channel badge must remain live even when Inbox is not currently
      // open in a pane.
      void refreshInboxUnreadTotal();
    },
    onConversationMessage: (payload) => {
      // Queue instead of storing one "latest" payload. Back-to-back socket
      // messages cannot overwrite each other before ConversationTab consumes them.
      setConvPushes((current) => {
        const messageId = String(payload.message?._id ?? "");
        if (
          messageId &&
          current.some(
            (item) => String(item.message?._id ?? "") === messageId,
          )
        ) {
          return current;
        }

        return [...current, {
          conversationId: payload.conversationId,
          message: payload.message,
        }].slice(-100);
      });

      if (
        payload.message?.direction === "inbound" &&
        !hasOpenChannel("conversation")
      ) {
        // Immediate visual response on the socket event itself.
        setConvUnreadBump((value: number) => value + 1);
      }

      // Reconcile persisted Email Chat unread totals even when the pane is
      // closed, so the channel badge stays authoritative.
      void refreshEmailChatUnreadTotal();

      // The push patches the visible conversation immediately. The debounced
      // read-only fetch below is only a server reconciliation safeguard.
      scheduleConversationRealtimeReconcile();
    },
    onConnectionReady: () => {
      // Socket connect/reconnect may follow a brief network gap. Reconcile
      // both live mail surfaces once without reloading the page.
      scheduleInboxRealtimeReconcile(0);
      scheduleConversationRealtimeReconcile(0);
      void refreshInboxUnreadTotal();
      void refreshEmailChatUnreadTotal();
    },
  });

  React.useEffect(() => {
    if (!status?.connected) return;

    const reconcileVisibleMail = () => {
      if (document.visibilityState !== "visible") return;

      const now = Date.now();

      // Focus/visibility are safety-net triggers rather than actual mail
      // events. DevTools/window focus changes can fire repeatedly while
      // testing, so throttle only this safety path. Socket mail events and
      // socket reconnect reconciliation remain unchanged.
      const inboxSafetyMinGap =
        socketConnected ? 15_000 : 5_000;
      const conversationSafetyMinGap =
        socketConnected ? 15_000 : 5_000;

      if (
        now - lastInboxSafetyReconcileAtRef.current >=
        inboxSafetyMinGap
      ) {
        lastInboxSafetyReconcileAtRef.current = now;

        if (hasOpenChannel("inbox")) {
          scheduleInboxRealtimeReconcile(0);
        }

        // Lightweight mailbox-summary reconciliation keeps the channel badge
        // accurate even if the user is currently viewing Dispatch Chat or
        // another One Desk pane.
        void refreshInboxUnreadTotal();
      }

      if (
        now -
          lastConversationSafetyReconcileAtRef.current >=
          conversationSafetyMinGap
      ) {
        lastConversationSafetyReconcileAtRef.current = now;

        if (hasOpenChannel("conversation")) {
          scheduleConversationRealtimeReconcile(0);
        }

        // Channel-level Email Chat badge stays current even while another
        // One Desk channel is open.
        void refreshEmailChatUnreadTotal();
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        reconcileVisibleMail();
      }
    };

    // Socket events are the fast path. This is only a missed-event safety net:
    // when the socket is connected it is intentionally slower to avoid turning
    // Gmail list loading into aggressive polling.
    // Realtime socket events are the fast path. The Inbox list request is
    // comparatively expensive, so only use a slow safety reconciliation while
    // the socket is healthy. Reconcile more often only while realtime is down.
    const intervalMs = socketConnected ? 120_000 : 30_000;
    const timer = window.setInterval(reconcileVisibleMail, intervalMs);

    window.addEventListener("focus", reconcileVisibleMail);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", reconcileVisibleMail);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [
    hasOpenChannel,
    refreshEmailChatUnreadTotal,
    refreshInboxUnreadTotal,
    scheduleConversationRealtimeReconcile,
    scheduleInboxRealtimeReconcile,
    socketConnected,
    status?.connected,
  ]);

  React.useEffect(
    () => () => {
      if (inboxRealtimeTimerRef.current) {
        clearTimeout(inboxRealtimeTimerRef.current);
      }
      if (conversationRealtimeTimerRef.current) {
        clearTimeout(conversationRealtimeTimerRef.current);
      }
    },
    [],
  );

  const handleConnect = async () => {
    if (!token) return;
    setConnecting(true);

    try {
      const response = await apiClient.get("/api/mail/connect", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const url = response.data?.data?.url;
      if (!url) throw new Error("No authorization URL returned");
      window.location.href = url;
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Could not start the Gmail connection."),
      );
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!token) return;

    try {
      await apiClient.post(
        "/api/mail/disconnect",
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setStatus({ connected: false, gmailAddress: null });
      setInboxUnreadTotal(0);
      setEmailUnreadTotal(0);
      setConvUnreadBump(0);
      toast.success("Gmail disconnected");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not disconnect."));
    }
  };


  const unreadForChannel = React.useCallback(
    (channel: CommunicationTab) => {
      if (channel === "inbox") {
        return Math.max(0, inboxUnreadTotal);
      }
      if (channel === "conversation") {
        return Math.max(
          0,
          emailUnreadTotal + convUnreadBump,
        );
      }
      if (channel === "dispatch") {
        return Math.max(0, dispatchUnreadTotal);
      }
      return 0;
    },
    [
      convUnreadBump,
      dispatchUnreadTotal,
      emailUnreadTotal,
      inboxUnreadTotal,
    ],
  );

  const renderPaneHeader = React.useCallback(
    (
      paneId: string,
      { focused }: { focused: boolean },
    ) => {
      const pane = panes.find((item) => item.id === paneId);
      if (!pane) return null;

      const channel =
        pane.channel === "overview"
          ? OVERVIEW_CHANNEL
          : CHANNELS.find((item) => item.key === pane.channel) ?? CHANNELS[0];
      const Icon = channel.icon;
      const unread = unreadForChannel(pane.channel);

      return (
        <div className="flex min-w-0 items-center gap-2">
          <div
            className={`flex size-6 shrink-0 items-center justify-center rounded-lg ${
              focused
                ? "bg-emerald-500/12 text-emerald-500"
                : "bg-muted/50 text-muted-foreground"
            }`}
          >
            <Icon className="size-3.5" />
          </div>

          <span
            className={`min-w-0 flex-1 truncate text-[11.5px] font-bold ${
              focused
                ? "text-foreground"
                : "text-muted-foreground"
            }`}
          >
            {channel.label}
          </span>

          {unread > 0 && (
            <span className="shrink-0 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[8.5px] font-black text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}

          {panes.length > 1 && (
            <button
              type="button"
              draggable={false}
              onPointerDown={(event) =>
                event.stopPropagation()
              }
              onClick={(event) => {
                event.stopPropagation();
                closePane(paneId);
              }}
              className="sm5-icon-btn size-9 shrink-0"
              title={`Close ${channel.label} pane`}
              aria-label={`Close ${channel.label} pane`}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      );
    },
    [
      closePane,
      panes,
      unreadForChannel,
    ],
  );

  const renderPaneContent = React.useCallback(
    (paneId: string) => {
      const pane = panes.find((item) => item.id === paneId);
      if (!pane) return null;

      if (pane.channel === "overview") {
        return (
          <OverviewTab
            token={token}
            mailConnected={Boolean(status?.connected)}
            dispatchEnabled={dispatchChatEnabled}
            inboxUnread={inboxUnreadTotal}
            emailUnread={emailUnreadTotal + convUnreadBump}
            dispatchUnread={dispatchUnreadTotal}
            onSelectChannel={changeChannel}
          />
        );
      }

      if (pane.channel === "inbox") {
        return status?.connected ? (
          <InboxTab
            token={token}
            theme={theme}
            refreshSignal={inboxRefreshSignal}
            manualRefreshSignal={
              paneManualRefreshSignals[paneId] || 0
            }
            onGlobalRefreshHandled={() => {}}
            onInboxUnreadTotalChange={setInboxUnreadTotal}
          />
        ) : (
          <ConnectGmailScreen
            connecting={connecting}
            onConnect={handleConnect}
          />
        );
      }

      if (pane.channel === "conversation") {
        return status?.connected ? (
          <ConversationTab
            token={token}
            convPushes={convPushes}
            onConvPushesHandled={(handledCount: number) => {
              setConvPushes((current) => current.slice(handledCount));
            }}
            refreshSignal={conversationRefreshSignal}
            manualRefreshSignal={
              paneManualRefreshSignals[paneId] || 0
            }
            onUnreadTotalChange={(count: number) => {
              if (count > 0) {
                setEmailUnreadTotal(count);
                setConvUnreadBump(0);
                return;
              }

              // ConversationTab initially derives 0 from its empty convos[]
              // before GET /conversations finishes. Never let that transient
              // mount state erase the page-level preloaded badge. Revalidate
              // the existing authoritative source; a real final zero still
              // settles correctly after the last unread chat is read.
              void refreshEmailChatUnreadTotal();
            }}
          />
        ) : (
          <ConnectGmailScreen
            connecting={connecting}
            onConnect={handleConnect}
          />
        );
      }

      if (pane.channel === "dispatch") {
        return (
          <DispatchChatTab
            unreadTotal={dispatchUnreadTotal}
            onUnreadRefresh={refreshDispatchUnread}
            refreshSignal={
              paneManualRefreshSignals[paneId] || 0
            }
          />
        );
      }

      if (pane.channel === "sms") {
        return <SmsTab token={token} />;
      }

      return <CallDialPadTab token={token} />;
    },
    [
      changeChannel,
      connecting,
      convPushes,
      convUnreadBump,
      conversationRefreshSignal,
      dispatchChatEnabled,
      dispatchUnreadTotal,
      emailUnreadTotal,
      handleConnect,
      inboxRefreshSignal,
      inboxUnreadTotal,
      paneManualRefreshSignals,
      panes,
      refreshDispatchUnread,
      refreshEmailChatUnreadTotal,
      status?.connected,
      theme,
      token,
    ],
  );

  if (loading) return <LoadingSplash theme={theme} />;

  return (
    <div
      className="sm5 relative flex h-full min-h-0 w-full flex-col overflow-hidden"
      data-theme={theme}
      style={{ minHeight: "100%" }}
    >
      <header className="sm5-topbar z-30 shrink-0">
        <div className="flex min-w-0 items-center gap-2.5 px-3 sm:gap-3 sm:px-4" style={{ height: 56 }}>
          <div className="flex min-w-0 shrink-0 items-center gap-2.5">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: "linear-gradient(140deg,#16a34a,#34c97d)",
                boxShadow:
                  "0 0 0 1px rgba(52,201,125,0.3), 0 4px 16px rgba(52,201,125,0.25)",
              }}
            >
              <Mail className="h-4 w-4 text-white" />
            </div>
            <div className="hidden min-w-0 sm:block">
              <div className="flex items-center gap-1.5 leading-none">
                <p
                  className="sm5-title-md whitespace-nowrap"
                  style={{ fontSize: 14, color: "var(--text-primary)" }}
                >
                  Suprah <span style={{ color: "var(--accent)" }}>One Desk</span>
                </p>
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{
                    background: socketConnected
                      ? "var(--accent)"
                      : "var(--text-disabled)",
                    boxShadow: socketConnected
                      ? "0 0 6px rgba(52,201,125,0.7)"
                      : "none",
                  }}
                />
                {socketConnected && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: "var(--accent)",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Live
                  </span>
                )}
              </div>
              <p
                className="sm5-meta mt-1 hidden truncate leading-none md:block"
                style={{
                  fontSize: 9,
                  letterSpacing: "0.08em",
                  color: "var(--text-tertiary)",
                }}
              >
                Every Channel. Every Conversation. One Desk.
              </p>
            </div>
          </div>

          <ChannelSelector
            value={focusedChannel}
            onChange={changeChannel}
            inboxUnread={inboxUnreadTotal}
            emailUnread={emailUnreadTotal + convUnreadBump}
            dispatchUnread={dispatchUnreadTotal}
            smsUnread={0}
            callUnread={0}
            disabledKeys={unavailableForFocusedSelector}
          />

          <AddPaneMenu
            availableChannels={availablePaneChannels}
            onAdd={addPane}
          />

          {panes.length > 1 && (
            <button
              type="button"
              onClick={revertToSingleView}
              className="sm5-pill flex h-9 shrink-0 items-center gap-1.5 px-3"
              style={{ fontSize: 12 }}
              title="Close the other panes and return to the focused pane"
            >
              <Square className="size-3.5" />
              <span className="hidden lg:inline">
                Single View
              </span>
            </button>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            {status?.connected && (
              <>
                <div
                  className="hidden items-center gap-1.5 rounded-lg px-3 xl:flex"
                  style={{
                    height: 32,
                    background: "var(--accent-muted)",
                    border: "1px solid rgba(52,201,125,0.2)",
                  }}
                  title={
                    status.lastSyncError
                      ? `Last sync issue: ${status.lastSyncError}`
                      : "Gmail connected"
                  }
                >
                  {status.lastSyncError ? (
                    <AlertCircle
                      className="h-3.5 w-3.5"
                      style={{ color: "var(--warning)" }}
                    />
                  ) : (
                    <CheckIcon
                      className="h-3.5 w-3.5"
                      style={{ color: "var(--accent)" }}
                    />
                  )}
                  <span
                    className="truncate font-semibold"
                    style={{
                      fontSize: 11,
                      color: "var(--accent-text)",
                      maxWidth: 180,
                    }}
                  >
                    {status.gmailAddress}
                  </span>
                </div>

                <button
                  onClick={handleDisconnect}
                  className="sm5-icon-btn h-10 w-10"
                  title="Disconnect Gmail"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleGlobalRefresh}
              disabled={!globalRefreshAvailable}
              className="sm5-icon-btn h-10 w-10"
              style={{ border: "1px solid var(--border-2)" }}
              title={globalRefreshTitle}
              aria-label={globalRefreshTitle}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="sm5-icon-btn h-10 w-10"
              style={{ border: "1px solid var(--border-2)" }}
              title="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-3.5 w-3.5" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      </header>

      <CommunicationPaneWorkspace
        rows={paneRows}
        focusedPaneId={focusedPaneId}
        onFocusPane={setFocusedPaneId}
        onMovePane={movePane}
        renderHeader={renderPaneHeader}
        renderContent={renderPaneContent}
      />
    </div>
  );
}
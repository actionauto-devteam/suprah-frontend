"use client";

import * as React from "react"
import {
  ArrowRight,
  ArrowUpDown,
  CheckSquare,
  ChevronDown,
  Filter,
  Inbox,
  Mail,
  MessageSquare,
  Moon,
  PanelRightOpen,
  RefreshCw,
  Search,
  Sun,
  X,
} from "lucide-react"
import { useLeads, Lead } from "@/hooks/useLeads"
import { initializeSocket } from "@/lib/socket.client"
import { useAuth } from "@/providers/AuthProvider"
import { apiClient } from "@/lib/api-client"
import { ShippingQuoteModal } from "@/components/shipping-quote-modal"
import { Vehicle } from "@/types/inventory"
import { useTheme } from "@/context/ThemeContext"
import { injectLeadDetailsPanelStyles, injectSS4Styles } from "@/lib/ss4-styles"
import { cn } from "@/lib/utils"

// Atomic & Modular Components
import { SyncStatus } from "./leads/atomic/SyncStatus";
import { ToastStack, Toast } from "./leads/atomic/ToastStack";
import { LeadsList } from "./leads/LeadsList";
import { ConversationView } from "./leads/ConversationView";
import { LeadDetailsPanel } from "./leads/LeadDetailsPanel";
import { ReplySection } from "./leads/ReplySection";
import { CreateAppointmentModal } from "@/components/CreateAppointmentModal";
import {
  BulkReplyModal,
  BulkReplyRecipient,
} from "@/components/leads/BulkReplyModal";

// External Components
import { InboundCallsTab } from "@/components/inbound-calls/InboundCallsTab";
import { SupraLeoAI } from "@/components/supra-leo-ai/SupraLeoAI";


// Constants
const LEADS_SOURCE_EMAIL = "leads@dealerscloud.com";
const LEADS_PER_PAGE = 20;
const THREAD_POLL_INTERVAL_MS = 15_000;
const DRAFT_STORAGE_KEY = "crm-appointment-draft";

const TABS = [
  { key: null, label: "All" },
  { key: "New", label: "New" },
  { key: "Pending", label: "Pending" },
  { key: "Contacted", label: "Contacted" },
  { key: "Appointment Set", label: "Appt. Set" },
  { key: "Closed", label: "Closed" },
  { key: "Inbound Calls", label: "Inbound Calls" },
] as const;

type LeadSortOption = "newest" | "oldest" | "waiting_longest";

export interface LeadsTabPendingNav {
  leadId?: string;
  leadSearch?: string;
}

export function LeadsTab({
  pendingNav,
  onNavConsumed,
}: {
  pendingNav?: LeadsTabPendingNav | null;
  onNavConsumed?: () => void;
} = {}) {
  const { getToken } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Load the base styles first, then the Leads workspace overrides.
  React.useEffect(() => {
    injectSS4Styles();
    injectLeadDetailsPanelStyles();
  }, []);

  // -- Filters & Pagination --
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null);
  const [sortBy, setSortBy] = React.useState<LeadSortOption>("newest");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isChatHovered, setIsChatHovered] = React.useState(false);

  const {
    leads,
    isLoading,
    isFetching,
    total,
    pages,
    updateLeadStatus,
    markAsRead,
    addLeadNote,
    isAddingNote,
    refetch,
    sync,
    isSyncing: isWorkerSyncing,
    bulkReply,
    isBulkReplying,
  } = useLeads({
    page: currentPage,
    limit: LEADS_PER_PAGE,
    search: searchQuery,
    status: statusFilter,
    sortBy,
  });

  // -- Pending deep-link lead (from ?leadId= or ?leadSearch= URL param) --
  const [pendingLeadId, setPendingLeadId] = React.useState<string | null>(null);
  const [autoSelectOnSingleResult, setAutoSelectOnSingleResult] =
    React.useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const leadId = params.get("leadId");
    const leadSearch = params.get("leadSearch");

    if (leadId || leadSearch) {
      const url = new URL(window.location.href);
      url.searchParams.delete("leadId");
      url.searchParams.delete("leadSearch");
      url.searchParams.delete("tab");
      const newSearch = url.searchParams.toString();
      window.history.replaceState(
        {},
        "",
        url.pathname + (newSearch ? `?${newSearch}` : ""),
      );
    }

    if (leadId) {
      setPendingLeadId(leadId);
    } else if (leadSearch) {
      setSearchQuery(decodeURIComponent(leadSearch));
      setAutoSelectOnSingleResult(true);
    }
  }, []);

  // -- React to pendingNav prop (same-page navigation from CustomerCredentials) --
  React.useEffect(() => {
    if (!pendingNav) return;
    onNavConsumed?.();
    if (pendingNav.leadId) {
      setPendingLeadId(pendingNav.leadId);
    } else if (pendingNav.leadSearch) {
      setSearchQuery(pendingNav.leadSearch);
      setAutoSelectOnSingleResult(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingNav]);

  // -- Local UI State --
  const [selectedLead, _setSelectedLead] = React.useState<Lead | null>(null);
  const [showLeadDetails, setShowLeadDetails] = React.useState(true);
  const [localIsSyncing, setLocalIsSyncing] = React.useState(false);
  const [centralConnected, setCentralConnected] = React.useState(false);
  const [centralStatusLoaded, setCentralStatusLoaded] = React.useState(false);
  const [centralEmail, setCentralEmail] = React.useState("");
  const [lastSyncTime, setLastSyncTime] = React.useState<Date | null>(null);

  const [replyMessage, setReplyMessage] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [apptOpen, setApptOpen] = React.useState(false);
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const [isClosed, setIsClosed] = React.useState(false);
  const [threads, setThreads] = React.useState<Record<string, any[]>>({});


  const loadedThreadIdsRef = React.useRef<Set<string>>(new Set());

  const [highlightedLeadIds, setHighlightedLeadIds] = React.useState<
    Set<string>
  >(new Set());
  const [shippingOpen, setShippingOpen] = React.useState(false);

  // -- Bulk reply: select mode + selection --
  const [selectMode, setSelectMode] = React.useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = React.useState<Set<string>>(
    new Set(),
  );
  const [bulkModalOpen, setBulkModalOpen] = React.useState(false);

  // Group currently loaded leads by vehicle stock # to power the
  // "N other inquiries for this vehicle" nudge in the conversation view.
  const leadsByVehicleStock = React.useMemo(() => {
    const map = new Map<string, Lead[]>();
    for (const l of leads) {
      const stock = (l.vehicle as any)?.stock;
      if (!stock) continue;
      const arr = map.get(stock) || [];
      arr.push(l);
      map.set(stock, arr);
    }
    return map;
  }, [leads]);

  const toggleSelectMode = () => {
    setSelectMode((prev) => {
      if (prev) setSelectedLeadIds(new Set());
      return !prev;
    });
  };

  const toggleLeadSelected = (lead: Lead) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(lead._id)) next.delete(lead._id);
      else next.add(lead._id);
      return next;
    });
  };

  const bulkRecipients: BulkReplyRecipient[] = React.useMemo(
    () =>
      leads
        .filter((l) => selectedLeadIds.has(l._id))
        .map((l) => ({
          _id: l._id,
          firstName: l.firstName,
          lastName: l.lastName,
          email: l.email,
        })),
    [leads, selectedLeadIds],
  );

  const handleBulkSend = async (message: string) => {
    const leadIds = Array.from(selectedLeadIds);
    try {
      const result = await bulkReply({ leadIds, message });
      addToast(
        result.failed.length === 0 ? "success" : "error",
        result.failed.length === 0
          ? `Reply sent to ${result.sent} customer${result.sent === 1 ? "" : "s"}`
          : `Sent to ${result.sent}, ${result.failed.length} failed`,
      );
      setBulkModalOpen(false);
      setSelectedLeadIds(new Set());
      setSelectMode(false);
    } catch {
      addToast("error", "Failed to send bulk reply");
    }
  };

  const openBulkReplyForSiblings = (
    vehicleStock: string,
    includeLeadId?: string,
  ) => {
    const siblings = leadsByVehicleStock.get(vehicleStock) || [];
    const ids = new Set(siblings.map((l) => l._id));
    if (includeLeadId) ids.add(includeLeadId);
    setSelectedLeadIds(ids);
    setBulkModalOpen(true);
  };

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!stored) return;

    try {
      const draft = JSON.parse(stored) as any;
      const leadId = draft?.meta?.extraPayload?.leadId;
      if (draft?.resume && leadId) {
        setApptOpen(true);
        sessionStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({ ...draft, resume: false }),
        );
      }
    } catch {
      // ignore invalid draft
    }
  }, []);

  // 1. Reliability Sync: Keep selectedLead in sync with master leads list
  React.useEffect(() => {
    if (!selectedLead) return;
    const updated = leads.find((l) => l._id === selectedLead._id);
    if (updated && JSON.stringify(updated) !== JSON.stringify(selectedLead)) {
      _setSelectedLead(updated);
      if (updated.status === "Closed") setIsClosed(true);
      else if ((updated.status as string) !== "Closed") setIsClosed(false);
    }
  }, [leads, selectedLead]);

  // 1b-ii. Auto-select if email search produces exactly one result
  React.useEffect(() => {
    if (!autoSelectOnSingleResult || isLoading || leads.length !== 1) return;
    setAutoSelectOnSingleResult(false);
    setSelectedLead(leads[0]); // eslint-disable-line react-hooks/exhaustive-deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, isLoading, autoSelectOnSingleResult]);

  // 1b. Deep-link: fetch lead by ID directly, bypassing pagination
  React.useEffect(() => {
    if (!pendingLeadId) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const res = await apiClient.get(`/api/leads/${pendingLeadId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const lead: Lead = res.data?.data;
        if (!cancelled && lead?._id) {
          setPendingLeadId(null);
          setSelectedLead(lead); // eslint-disable-line react-hooks/exhaustive-deps
        }
      } catch {
        setPendingLeadId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
    // setSelectedLead intentionally omitted — render-scope fn, not a stable ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingLeadId, getToken]);

  // 2. Real-Time WebSocket Implementation
  React.useEffect(() => {
    let socket: any = null;
    const setupSocket = async () => {
      const token = await getToken();
      if (!token) return;
      socket = initializeSocket(token);

      socket.on("lead:new", (newLead: any) => {
        if (currentPage === 1) {
          refetch();
          setHighlightedLeadIds((prev) => new Set(prev).add(newLead._id));
          setTimeout(() => {
            setHighlightedLeadIds((prev) => {
              const next = new Set(prev);
              next.delete(newLead._id);
              return next;
            });
          }, 10000);
          addToast("success", "New lead received!");
        }
      });
      socket.on("lead:update", () => refetch());
      socket.on("lead:delete", () => {
        refetch();
        setSelectedLead(null);
      });
    };
    setupSocket();
    return () => {
      if (socket) {
        socket.off("lead:new");
        socket.off("lead:update");
        socket.off("lead:delete");
      }
    };
  }, [getToken, currentPage, refetch]);

  // 3. Central Status Fetch
  React.useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await apiClient.get("/api/org-lead/config", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = res.data?.data;
        setCentralConnected(d?.gmailConnected || false);
        setCentralEmail(d?.gmailAddress || "");
      } catch {
        setCentralConnected(false);
      } finally {
        setCentralStatusLoaded(true);
      }
    })();
  }, [getToken]);

  // 4. Sync & Refresh Logic (Refined)
  const syncAndRefresh = React.useCallback(async () => {
    if (isWorkerSyncing || localIsSyncing) return;
    setLocalIsSyncing(true);
    try {
      const token = await getToken();
      if (!token) return;
      await refetch();
      if (!centralStatusLoaded || !centralConnected) return;

      const r = await sync();
      const n = r?.data?.leads?.synced ?? 0;
      if (n > 0) addToast("success", `${n} new lead${n > 1 ? "s" : ""} added`);
      setLastSyncTime(new Date());
    } catch {
      try {
        await refetch();
      } catch {}
    } finally {
      setLocalIsSyncing(false);
    }
  }, [
    getToken,
    centralConnected,
    centralStatusLoaded,
    refetch,
    sync,
    isWorkerSyncing,
    localIsSyncing,
  ]);

  React.useEffect(() => {
    if (centralStatusLoaded) syncAndRefresh();
  }, [centralStatusLoaded]);

  // 5. Safety Sync (Background only, no 1s timer)
  React.useEffect(() => {
    if (!centralStatusLoaded) return;
    const SAFETY_SYNC_MS = 20 * 60 * 1000;
    const sI = setInterval(() => syncAndRefresh(), SAFETY_SYNC_MS);
    return () => clearInterval(sI);
  }, [syncAndRefresh, centralStatusLoaded]);

  // 6. Thread Refresh
  const buildLeadFallbackMessage = React.useCallback((lead: Lead) => {
  const content =
    lead.parsedContent?.trim() ||
    lead.body?.trim() ||
    lead.comments?.trim() ||
    lead.subject?.trim();

  if (!content) return [];

  return [
    {
      _id: `lead-inquiry-${lead._id}`,
      direction: "inbound",
      body: content,
      text: content,
      subject: lead.subject,
      createdAt: lead.createdAt,
      from: lead.senderEmail || lead.email,
      senderName:
        lead.senderName ||
        `${lead.firstName || ""} ${lead.lastName || ""}`.trim(),
      isLeadFallback: true,
    },
  ];
}, []);

const fetchThread = React.useCallback(
  async (lead: Lead) => {
    const fallbackMessages =
      buildLeadFallbackMessage(lead);

    const threadId = lead.threadId;

    /*
     * Immediately seed the conversation with the inquiry stored
     * on the lead. This prevents ConversationView from rendering
     * an empty state while the latest Gmail thread is loading.
     *
     * Do not overwrite a previously cached thread.
     */
    setThreads((previous) => {
      if (previous[lead._id]) {
        return previous;
      }

      return {
        ...previous,
        [lead._id]: fallbackMessages,
      };
    });

    // Imported leads may not have a Gmail thread.
    if (!threadId) {
      return;
    }

    try {
      const token = await getToken();

      if (!token) {
        return;
      }

      const startedAt = performance.now();

      const response = await apiClient.get(
        `/api/leads/${lead._id}/thread`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      console.log(
        `Thread request took ${
          Math.round(performance.now() - startedAt)
        } ms`
      );

      console.log(
        `[THREAD] ${lead._id} loaded in ${Math.round(
          performance.now() - startedAt,
        )}ms`,
      );

      const syncedMessages =
        response.data?.data?.messages ||
        response.data?.messages ||
        [];

      /*
      * Replace the temporary fallback only when the backend
      * returns real synced messages.
      */
      if (syncedMessages.length > 0) {
        // Mark this lead as having a fully loaded thread
        loadedThreadIdsRef.current.add(lead._id);

        setThreads((previous) => ({
          ...previous,
          [lead._id]: syncedMessages,
        }));
      }
    } catch (error) {
      /*
       * Keep the immediate fallback visible if the request fails.
       * Do not replace the conversation with an empty array.
       */
      console.error(
        "Failed to load lead thread:",
        error,
      );
    }
  },
  [getToken, buildLeadFallbackMessage],
);

  React.useEffect(() => {
    if (!selectedLead) return;

    const currentLead = selectedLead;
    const leadId = currentLead._id;

    let cancelled = false;

    // Only fetch immediately when no cached entry exists.
    if (!loadedThreadIdsRef.current.has(leadId)) {
    void fetchThread(currentLead);
  }

    const intervalId = window.setInterval(() => {
      if (!cancelled) {
        void fetchThread(currentLead);
      }
    }, THREAD_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [
    selectedLead?._id,
    fetchThread,
  ]);

  // Hide the floating mobile bottom nav while a lead conversation is open,
  // matching the SupraSpace convention, so it doesn't sit over the reply composer.
  React.useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("crm-leads:convo-state", {
        detail: { active: !!selectedLead },
      }),
    );
  }, [selectedLead]);

  React.useEffect(() => {
    return () => {
      window.dispatchEvent(
        new CustomEvent("crm-leads:convo-state", {
          detail: { active: false },
        }),
      );
    };
  }, []);

  // Helpers
  const addToast = (type: Toast["type"], msg: string) => {
    if (toasts.some((t) => t.message === msg)) return;
    const id = Math.random().toString(36);
    setToasts((p) => [...p, { id, type, message: msg, ts: new Date() }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 5000);
  };

  const handleStatus = async (
    status: string,
    reason?: string,
    targetLead?: Lead,
  ) => {
    const leadToUpdate = targetLead || selectedLead;
    if (!leadToUpdate) return;
    await updateLeadStatus({ id: leadToUpdate._id, status, reason });
    _setSelectedLead((p) =>
      p && p._id === leadToUpdate._id ? { ...p, status: status as any } : p,
    );
    if (leadToUpdate._id === selectedLead?._id) {
      if (status === "Closed") setIsClosed(true);
      else setIsClosed(false);
    }
    addToast("success", `Marked as ${status}`);
  };

  const setSelectedLead = (lead: Lead | null) => {
    if (!lead) {
      _setSelectedLead(null);
      setShowLeadDetails(true);
      return;
    }

    /*
     * Seed the message cache before selecting the lead.
     * React can then render the lead and its first message together.
     */
    setThreads((previous) => {
      if (previous[lead._id]) {
        return previous;
      }

      return {
        ...previous,
        [lead._id]: buildLeadFallbackMessage(lead),
      };
    });

    _setSelectedLead(lead);
    setShowLeadDetails(true);
    setIsClosed(lead.status === "Closed");

    // Run this in the background so it cannot delay opening.
    if (!lead.isRead) {
      void markAsRead(lead._id).catch((error) => {
        console.error("Failed to mark lead as read:", error);
      });
    }
  };

  const handleSend = async (
    attachments: File[] = [],
  ) => {
    if (
      !selectedLead ||
      (!replyMessage.trim() &&
        attachments.length === 0)
    ) {
      return;
    }

    setIsSending(true);

    try {
      const token = await getToken();

      if (!token) {
        addToast("error", "Auth required");
        throw new Error("Authentication required");
      }

      const formData = new FormData();

      formData.append(
        "message",
        replyMessage.trim(),
      );

      attachments.forEach((file) => {
        formData.append(
          "attachments",
          file,
        );
      });

      await apiClient.post(
        `/api/leads/${selectedLead._id}/reply`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setReplyMessage("");
      addToast("success", "Reply sent");

      await updateLeadStatus({
        id: selectedLead._id,
        status: "Contacted",
      });

      window.setTimeout(() => {
        void fetchThread(selectedLead);
      }, 1000);

      await refetch();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        "Failed to send reply";

      addToast("error", message);
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  const handleAppt = async (appointmentData: Record<string, unknown>) => {
    const hasLeadId = Boolean((appointmentData as any)?.leadId);
    if (!selectedLead && !hasLeadId) {
      throw new Error("Please select a lead first.");
    }
    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication required.");

      await apiClient.post("/api/crm/calendar/appointments", appointmentData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      addToast("success", "Appointment scheduled");
      await refetch();
    } catch (err: any) {
      const status = err?.response?.status;
      const backendMessage =
        err?.response?.data?.message || err?.response?.data?.data?.message;
      let message = backendMessage || "Failed to save appointment";

      if (status === 401) {
        message = "Google Calendar not connected. Please go to Settings.";
      } else if (status === 409 || status === 400) {
        message =
          backendMessage ||
          "Time Slot Unavailable: You have a conflicting appointment.";
      }

      addToast("error", message);
      throw new Error(message);
    }
  };

  const handleCalculateQuote = async (formData: any) => {
    try {
      const token = await getToken();
      await apiClient.post(
        "/api/quotes",
        {
          ...formData,
          toZip: formData.zipCode,
          toAddress: formData.fullAddress,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      addToast("success", "Shipping Quote Calculated & Saved");
      setShippingOpen(false);
    } catch {
      addToast("error", "Failed to calculate quote");
    }
  };

  // ── Dot colour per lead status ─────────────────────────────────────────────
  const TAB_DOTS: Record<string, string> = {
    New: "bg-emerald-500",
    Pending: "bg-amber-500",
    Contacted: "bg-sky-500",
    "Appointment Set": "bg-violet-500",
    Closed: "bg-muted-foreground/40",
    "Inbound Calls": "bg-teal-500",
  };

  return (
    <div className={cn("ss4 flex flex-col h-full min-h-0")} data-theme={theme}>
      <ToastStack
        toasts={toasts}
        dismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))}
      />

      {/* ── TOPBAR ── */}
      {/* On mobile/tablet, the open conversation shows its own header — collapse
          the inbox topbar + tab strip so the conversation gets near-full height. */}
      <header
        className={cn("ss4-topbar shrink-0", selectedLead && "hidden lg:block")}
        style={{ minHeight: 52 }}
      >
        {/* Title + actions */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-3 pb-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 ss4-logo-mark flex shrink-0 items-center justify-center">
              <Mail className="h-3.5 w-3.5" style={{ color: "#fff" }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1
                  className="ss4-display font-bold leading-tight tracking-tight"
                  style={{ fontSize: 16, color: "var(--text-primary)" }}
                >
                  Lead Inbox
                </h1>
                {total > 0 && (
                  <span
                    className="ss4-badge inline-flex items-center tabular-nums"
                    style={{ borderRadius: 10 }}
                  >
                    {total}
                  </span>
                )}
              </div>
              <div className="mt-0.5">
                <SyncStatus
                  connected={centralConnected}
                  email={centralEmail}
                  sourceEmail={LEADS_SOURCE_EMAIL}
                  lastSyncTime={lastSyncTime}
                  statusLoaded={centralStatusLoaded}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={toggleSelectMode}
              className="ss4-pill-btn flex items-center gap-1.5 px-2.5 h-9 sm:h-7 text-[11px] font-medium transition-all"
              style={
                selectMode
                  ? { color: "var(--accent)", borderColor: "var(--accent)" }
                  : undefined
              }
            >
              {selectMode ? (
                <X className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
              ) : (
                <CheckSquare className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
              )}
              <span className="hidden sm:inline">
                {selectMode ? "Cancel" : "Select"}
              </span>
            </button>
            <button
              onClick={syncAndRefresh}
              disabled={!centralConnected || isWorkerSyncing || localIsSyncing}
              className="ss4-pill-btn flex items-center gap-1.5 px-2.5 h-9 sm:h-7 text-[11px] font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 sm:h-3 sm:w-3 ${isWorkerSyncing || localIsSyncing ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">
                {isWorkerSyncing || localIsSyncing ? "Syncing…" : "Refresh"}
              </span>
            </button>
            <button
              onClick={toggleTheme}
              className="ss4-theme-btn h-9 w-9 sm:h-7 sm:w-7 flex items-center justify-center shrink-0"
              title="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              ) : (
                <Moon className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              )}
            </button>
            <SupraLeoAI variant="toolbar" />
          </div>
        </div>

      </header>

      {/* ── BODY ── */}
      {statusFilter === "Inbound Calls" ? (
        <div
          className="flex-1 overflow-auto p-6"
          style={{ background: "var(--bg-base)" }}
        >
          <InboundCallsTab />
        </div>
      ) : (
        <div className="suprah-workspace-scroll flex-1 min-h-0 bg-[var(--bg-base)]">
          <div className="suprah-workspace-track">
          {/* PODIUM-LIKE LEFT CONVERSATION SIDEBAR */}
          <aside
            className={cn(
              "suprah-leads-panel flex flex-col shrink-0 min-h-0 border-r",
            )}
            style={{
              background: "var(--bg-elevated)",
              borderColor: "var(--border-1)",
            }}
          >
            {/* Sidebar title like Podium's "All Conversations" */}
            <div
              className="flex items-center justify-between px-4 py-4 border-b"
              style={{ borderColor: "var(--border-1)" }}
            >
              <div>
                <h2
                  className="font-bold tracking-tight"
                  style={{ color: "var(--text-primary)", fontSize: 17 }}
                >
                  All Conversations
                </h2>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Lead Inbox
                </p>
              </div>

              <button
                onClick={toggleSelectMode}
                className="ss4-pill-btn h-9 w-9 flex items-center justify-center"
                title={
                  selectMode ? "Cancel select mode" : "Select conversations"
                }
              >
                {selectMode ? (
                  <X className="h-4 w-4" />
                ) : (
                  <CheckSquare className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Podium-style status and sorting filters */}
            <div
              className="grid grid-cols-2 gap-2 px-3 py-3 shrink-0"
              style={{
                borderBottom: "1px solid var(--border-1)",
                background: "var(--bg-elevated)",
              }}
            >
              <label className="relative min-w-0">
                <Filter
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                  style={{ color: "var(--text-tertiary)" }}
                />

                <select
                  value={statusFilter ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    setStatusFilter(value === "" ? null : value);
                    setCurrentPage(1);
                    setSelectedLead(null);
                  }}
                  className="h-9 w-full appearance-none rounded-lg pl-9 pr-8 text-xs font-medium outline-none"
                  style={{
                    background: "var(--input-bg)",
                    border: "1px solid var(--input-border)",
                    color: "var(--text-primary)",
                  }}
                  aria-label="Filter conversations by status"
                >
                  {TABS.map((tab) => (
                    <option key={tab.label} value={tab.key ?? ""}>
                      {tab.key === null ? "All statuses" : tab.label}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                  style={{ color: "var(--text-tertiary)" }}
                />
              </label>

              <label className="relative min-w-0">
                <ArrowUpDown
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                  style={{ color: "var(--text-tertiary)" }}
                />

                <select
                  value={sortBy}
                  onChange={(event) => {
                    setSortBy(event.target.value as LeadSortOption);
                    setCurrentPage(1);
                  }}
                  className="h-9 w-full appearance-none rounded-lg pl-9 pr-8 text-xs font-medium outline-none"
                  style={{
                    background: "var(--input-bg)",
                    border: "1px solid var(--input-border)",
                    color: "var(--text-primary)",
                  }}
                  aria-label="Sort conversations"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="waiting_longest">Longest waiting</option>
                </select>

                <ChevronDown
                  className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                  style={{ color: "var(--text-tertiary)" }}
                />
              </label>
            </div>

            {isFetching && !isLoading && (
              <div
                className="px-3 pb-2 text-xs"
                style={{
                  color: "var(--text-tertiary)",
                }}
              >
                Updating…
              </div>
            )}

            {/* Existing list component keeps pagination, search, read status, selection */}
            {selectMode && (
              <div
                className="flex items-center justify-between gap-2 px-3 py-2 shrink-0"
                style={{
                  borderBottom: "1px solid var(--border-1)",
                  background: "var(--bg-elevated)",
                }}
              >
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {selectedLeadIds.size} selected
                </span>

                <button
                  onClick={() => setBulkModalOpen(true)}
                  disabled={selectedLeadIds.size === 0}
                  className="ss4-pill-btn px-3 h-8 text-[12px] font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Reply to all
                </button>
              </div>
            )}

            <LeadsList
              leads={leads}
              isLoading={isLoading}
              total={total}
              pages={pages}
              currentPage={currentPage}
              selectedLeadId={selectedLead?._id}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onPageChange={setCurrentPage}
              onLeadSelect={setSelectedLead}
              highlightedLeadIds={highlightedLeadIds}
              itemsPerPage={LEADS_PER_PAGE}
              sourceEmail={LEADS_SOURCE_EMAIL}
              selectMode={selectMode}
              selectedIds={selectedLeadIds}
              onToggleSelect={toggleLeadSelected}
            />
          </aside>

          {/* PODIUM-LIKE CENTER CONVERSATION PANEL */}
          <main
            className={cn(
              "suprah-center-panel relative flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden",
              !selectedLead ? "hidden lg:flex" : "flex",
            )}
            style={{
              background: "var(--bg-base)",
            }}
            onMouseEnter={() => setIsChatHovered(true)}
            onMouseLeave={() => setIsChatHovered(false)}
          >
            {selectedLead && !showLeadDetails && (
              <button
                type="button"
                onClick={() => setShowLeadDetails(true)}
                className="absolute right-3 top-3 z-40 flex h-9 w-9 items-center justify-center rounded-lg border shadow-sm transition-colors"
                style={{
                  background: "var(--bg-elevated)",
                  borderColor: "var(--border-2)",
                  color: "var(--text-secondary)",
                }}
                title="Show lead details"
                aria-label="Show lead details"
              >
                <PanelRightOpen className="h-4 w-4" />
              </button>
            )}

            {selectedLead ? (
              <>
                <ConversationView
                  lead={selectedLead}
                  threads={threads[selectedLead._id] || []}
                  hideConversationChrome={isChatHovered}
                  onClose={() => setSelectedLead(null)}
                  sourceEmail={LEADS_SOURCE_EMAIL}
                  siblingCount={
                    (selectedLead.vehicle as any)?.stock
                      ? leadsByVehicleStock
                          .get((selectedLead.vehicle as any).stock)
                          ?.filter(
                            (lead) =>
                              lead._id !== selectedLead._id,
                          ).length || 0
                      : 0
                  }
                  onReplyToSiblings={() =>
                    openBulkReplyForSiblings(
                      (selectedLead.vehicle as any).stock,
                      selectedLead._id,
                    )
                  }
                />

                <ReplySection
                  isClosed={isClosed}
                  replyMessage={replyMessage}
                  setReplyMessage={setReplyMessage}
                  onSend={handleSend}
                  isSending={isSending}
                  onStatusChange={handleStatus}
                  onApptOpen={() => setApptOpen(true)}
                  onQuoteShipping={() => setShippingOpen(true)}
                  onReopen={(reason) =>
                    handleStatus("Pending", reason)
                  }
                  selectedLeadStatus={selectedLead.status}
                />
              </>
            ) : (
              <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-10 lg:px-12 xl:px-16">
                <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center gap-6">
                  <div className="flex items-start gap-4">
                    <div className="relative shrink-0">
                      <div className="ss4-empty-icon flex h-14 w-14 items-center justify-center">
                        <MessageSquare className="h-6 w-6" style={{ color: 'var(--accent)', opacity: 0.55 }} />
                      </div>
                      <div className="absolute -bottom-1.5 -right-1.5 h-6 w-6 ss4-logo-mark flex items-center justify-center">
                        <Mail className="h-3 w-3" style={{ color: '#fff' }} />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold" style={{ fontSize: 18, color: 'var(--text-primary)' }}>Select a lead to start</p>
                      <p className="mt-1 max-w-xl leading-relaxed" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        Pick a lead from the inbox to view the full inquiry, reply, schedule an appointment, or ask Autrix for follow-up help.
                      </p>
                      <p className="ss4-mono mt-2" style={{ fontSize: 10, color: 'var(--text-disabled)' }}>{LEADS_SOURCE_EMAIL}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => { setStatusFilter("New"); setCurrentPage(1); }}
                      className="rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
                      style={{ background: 'var(--surface-1)', borderColor: 'var(--border-1)' }}
                    >
                      <Inbox className="mb-3 h-4 w-4" style={{ color: 'var(--accent)' }} />
                      <p className="font-semibold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>Review new leads</p>
                      <p className="mt-1" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Jump to fresh inquiries that need attention.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStatusFilter(null); setSearchQuery(''); setCurrentPage(1); }}
                      className="rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
                      style={{ background: 'var(--surface-1)', borderColor: 'var(--border-1)' }}
                    >
                      <Search className="mb-3 h-4 w-4" style={{ color: 'var(--accent)' }} />
                      <p className="font-semibold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>Search all leads</p>
                      <p className="mt-1" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Clear filters and browse the complete inbox.</p>
                    </button>
                    <button
                      type="button"
                      onClick={refetch}
                      className="rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
                      style={{ background: 'var(--surface-1)', borderColor: 'var(--border-1)' }}
                    >
                      <RefreshCw className="mb-3 h-4 w-4" style={{ color: 'var(--accent)' }} />
                      <p className="font-semibold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>Refresh inbox</p>
                      <p className="mt-1" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Pull the latest synced lead activity.</p>
                    </button>
                  </div>

                  {leads.length > 0 && (
                    <div className="rounded-2xl border p-4" style={{ background: 'var(--surface-1)', borderColor: 'var(--border-1)' }}>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="font-semibold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>Recent conversations</p>
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Select one to open</span>
                      </div>
                      <div className="grid gap-2">
                        {leads.slice(0, 3).map((lead) => (
                          <button
                            key={lead._id}
                            type="button"
                            onClick={() => setSelectedLead(lead)}
                            className="flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition hover:bg-black/5 dark:hover:bg-white/5"
                            style={{ borderColor: 'var(--border-1)' }}
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-white" style={{ background: 'var(--accent)', fontSize: 11 }}>
                              {`${lead.firstName?.[0] || ''}${lead.lastName?.[0] || ''}` || 'L'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold" style={{ fontSize: 12.5, color: 'var(--text-primary)' }}>
                                {[lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.email || 'Unknown lead'}
                              </p>
                              <p className="truncate" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                {lead.email || lead.phone || lead.status}
                              </p>
                            </div>
                            <span className="rounded-full px-2 py-1 font-semibold" style={{ fontSize: 10, color: 'var(--accent)', background: 'var(--accent-muted)' }}>{lead.status}</span>
                            <ArrowRight className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl border px-4 py-3" style={{ background: 'var(--accent-muted)', borderColor: 'rgba(91,124,246,0.18)' }}>
                    <p className="font-semibold" style={{ fontSize: 12, color: 'var(--accent-text)' }}>Autrix is standing by</p>
                    <p className="mt-1" style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                      Select a lead to give Autrix the right customer context for summaries, reply drafts, and follow-up suggestions.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* PODIUM-LIKE RIGHT DETAILS PANEL */}
          {selectedLead && showLeadDetails && (
            <div className="suprah-details-slot">
              <LeadDetailsPanel
                lead={selectedLead}
                sourceEmail={LEADS_SOURCE_EMAIL}
                onClose={() =>
                  setShowLeadDetails(false)
                }
                onStatusChange={handleStatus}
                onAppointment={() =>
                  setApptOpen(true)
                }
                onQuote={() =>
                  setShippingOpen(true)
                }
                onAddNote={async (note) => {
                  if (!selectedLead?._id) {
                    throw new Error(
                      "No lead selected",
                    );
                  }

                  await addLeadNote({
                    id: selectedLead._id,
                    note,
                  });
                }}
              />
            </div>
          )}
          </div>
        </div>
      )}

      <CreateAppointmentModal
        open={apptOpen}
        onOpenChange={setApptOpen}
        onCreateAppointment={handleAppt}
        conversations={[]}
        initialCustomerBooking={
          selectedLead
            ? {
                firstName: selectedLead.firstName || "",
                lastName: selectedLead.lastName || "",
                email: selectedLead.email || "",
                phone: selectedLead.phone || "",
              }
            : undefined
        }
        forceCustomerBooking={true}
        extraPayload={selectedLead ? { leadId: selectedLead._id } : undefined}
        entryTypeLock="appointment"
      />

      <ShippingQuoteModal
        open={shippingOpen}
        onOpenChange={setShippingOpen}
        vehicles={[]}
        onCalculate={handleCalculateQuote}
        defaultVehicle={
          selectedLead?.vehicle
            ? ({
                make: selectedLead.vehicle.make,
                model: selectedLead.vehicle.model,
                year: parseInt(selectedLead.vehicle.year),
              } as any)
            : undefined
        }
        initialData={
          selectedLead
            ? {
                firstName: selectedLead.firstName,
                lastName: selectedLead.lastName,
                email: selectedLead.email,
                phone: selectedLead.phone,
              }
            : undefined
        }
      />

      <BulkReplyModal
        open={bulkModalOpen}
        onOpenChange={setBulkModalOpen}
        recipients={bulkRecipients}
        onRemoveRecipient={(id) =>
          setSelectedLeadIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          })
        }
        onSend={handleBulkSend}
        isSending={isBulkReplying}
      />
    </div>
  );
}
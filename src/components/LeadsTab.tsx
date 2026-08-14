"use client";

import * as React from "react"
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  CheckSquare,
  CircleDollarSign,
  ChevronDown,
  CreditCard,
  Filter,
  Inbox,
  Mail,
  MessageSquare,
  Moon,
  Plus,
  Loader2,
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
import { ConversationWorkspace } from "@/components/conversation-workspace/ConversationWorkspace"
import { injectConversationWorkspaceStyles } from "@/components/conversation-workspace/workspace-styles"
import { cn } from "@/lib/utils"
import type { CreatePaymentData } from "@/types/billing"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"

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
import { WorkspaceEmptyState } from "@/components/conversation-workspace/WorkspaceEmptyState";


// Constants
const LEADS_SOURCE_EMAIL = "leads@dealerscloud.com";
const LEADS_PER_PAGE = 20;
const THREAD_POLL_INTERVAL_MS = 15_000;
const DRAFT_STORAGE_KEY = "crm-appointment-draft";

const isMongoObjectId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f\d]{24}$/i.test(value.trim());

/*
 * SMS-channel detection: leads that came in by text or phone (or that have a
 * phone number but no email/Gmail thread) get their Reply routed through the
 * shared SMS pipeline instead of the centralized Gmail account.
 */
const isSmsLead = (lead: Lead | null | undefined): boolean => {
  if (!lead) return false;
  const channel = String(lead.channel || "").toLowerCase();
  if (channel === "sms" || channel === "phone") return true;
  return Boolean(lead.phone && !lead.email && !lead.threadId);
};

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
type LeadsViewportMode = "narrow" | "compact" | "wide";

type LeadPaymentForm = CreatePaymentData & { customerPhone?: string };

const EMPTY_PAYMENT_FORM: LeadPaymentForm = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  amount: 0,
  description: "",
  dueDate: "",
  notes: "",
};

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
    injectConversationWorkspaceStyles();
  }, []);

  // -- Filters & Pagination --
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null);
  const [sortBy, setSortBy] = React.useState<LeadSortOption>("newest");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isChatHovered, setIsChatHovered] = React.useState(false);
  const [viewportMode, setViewportMode] =
    React.useState<LeadsViewportMode>("wide");
  const [isInboxSummaryExpanded, setIsInboxSummaryExpanded] =
    React.useState(false);
  const [isAutrixOpen, setIsAutrixOpen] = React.useState(false);

  React.useEffect(() => {
    const updateViewportMode = () => {
      const width = window.innerWidth;

      if (width < 1024) {
        setViewportMode("narrow");
        return;
      }

      if (width < 1440) {
        setViewportMode("compact");
        return;
      }

      setViewportMode("wide");
    };

    updateViewportMode();
    window.addEventListener("resize", updateViewportMode);

    return () => {
      window.removeEventListener("resize", updateViewportMode);
    };
  }, []);

  React.useEffect(() => {
    if (viewportMode === "narrow") {
      setIsInboxSummaryExpanded(false);
    }
  }, [viewportMode]);

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

  /*
   * Match Suprah Space panel priority:
   * - Wide: list + conversation + details
   * - Compact with active lead: conversation + details
   * - Narrow with active lead: conversation first; details starts collapsed
   *
   * The user can still expand/collapse details after the automatic change.
   */
  React.useEffect(() => {
    if (!selectedLead) {
      setShowLeadDetails(false);
      return;
    }

    setShowLeadDetails(viewportMode !== "narrow");
  }, [selectedLead?._id, viewportMode]);
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
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [isCreatingPayment, setIsCreatingPayment] = React.useState(false);
  const [paymentForm, setPaymentForm] =
    React.useState<LeadPaymentForm>(EMPTY_PAYMENT_FORM);

  // The shipping modal expects inventory-style Vehicle objects with an `id`.
  // A CRM lead usually stores only a partial vehicle snapshot, so normalize it
  // before passing it to the quote dropdown.
  const quoteVehicle = React.useMemo<Vehicle | null>(() => {
    const vehicle = selectedLead?.vehicle as any;
    if (!vehicle) return null;

    /*
     * CRM leads can contain either:
     * - a real MongoDB vehicle ID, or
     * - only a stock number such as "L22575".
     *
     * Never treat the stock number as the database vehicle ID. The backend
     * uses Vehicle.findById(), which only accepts a 24-character ObjectId.
     */
    const rawVehicleId =
      vehicle.vehicleId?._id ||
      vehicle.vehicleId ||
      vehicle.inventoryVehicleId?._id ||
      vehicle.inventoryVehicleId ||
      vehicle._id ||
      vehicle.id;

    const databaseVehicleId = isMongoObjectId(String(rawVehicleId || ""))
      ? String(rawVehicleId).trim()
      : undefined;

    // The modal still needs a stable value for its dropdown, even when this
    // lead only has a vehicle snapshot and no inventory database ID.
    const displayId =
      databaseVehicleId ||
      String(
        vehicle.stockNumber ||
        vehicle.stock ||
        `lead-vehicle-${selectedLead?._id || "unknown"}`,
      );

    return {
      ...vehicle,
      id: displayId,
      ...(databaseVehicleId ? { _id: databaseVehicleId } : {}),
      year: Number(vehicle.year) || new Date().getFullYear(),
      make: vehicle.make || "Unknown",
      model: vehicle.model || vehicle.modelName || "Vehicle",
      stockNumber: vehicle.stockNumber || vehicle.stock || "N/A",
      vin: vehicle.vin || vehicle.VIN || vehicle.vinNumber || "",
      location: vehicle.location || "Action Auto - Orem, UT",
      image: vehicle.image || vehicle.imageUrl || "",
      price: Number(vehicle.price) || 0,
    } as Vehicle;
  }, [selectedLead?._id, selectedLead?.vehicle]);

  const quoteVehicles = React.useMemo<Vehicle[]>(
    () => (quoteVehicle ? [quoteVehicle] : []),
    [quoteVehicle],
  );

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

      /*
       * Shared SMS pipeline: when any teammate's message (or an inbound
       * customer text) lands, append it to that lead's cached thread so
       * every open Leads workspace updates live without a refetch.
       */
      socket.on("comm:message:new", (data: any) => {
        const message = data?.message;
        const leadId = message?.leadId || data?.conversation?.leadId;
        if (!message || !leadId) return;
        setThreads((previous) => {
          const existing = previous[leadId];
          if (!existing) return previous;
          if (existing.some((m: any) => m?._id === message._id)) return previous;
          return { ...previous, [leadId]: [...existing, message] };
        });
      });

      socket.on("comm:message:status", (data: any) => {
        const { messageId, status } = data || {};
        if (!messageId) return;
        setThreads((previous) => {
          let changed = false;
          const next: Record<string, any[]> = {};
          for (const [leadId, messages] of Object.entries(previous)) {
            const idx = messages.findIndex((m: any) => m?._id === messageId);
            if (idx >= 0) {
              changed = true;
              next[leadId] = messages.map((m: any) =>
                m?._id === messageId ? { ...m, status } : m,
              );
            } else {
              next[leadId] = messages;
            }
          }
          return changed ? next : previous;
        });
      });
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
        socket.off("comm:message:new");
        socket.off("comm:message:status");
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
      } catch { }
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
    let content =
      lead.parsedContent?.trim() ||
      lead.body?.trim() ||
      lead.comments?.trim() ||
      lead.subject?.trim();

    /*
     * SAFEGUARD: the customer's actual message (lead.comments) must always
     * be visible. If the pre-rendered parsedContent was generated without a
     * Customer Comments section (older parser missed vehicle-level comments)
     * but the comments field itself holds text, append it as its own section
     * so the person's message is never hidden.
     */
    const customerComments = lead.comments?.trim();
    if (
      content &&
      customerComments &&
      customerComments !== content &&
      !content.includes(customerComments)
    ) {
      content = `${content}\n\n— Customer Comments —\n${customerComments}`;
    }

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

      /*
       * SMS/phone leads: load the shared communications thread by phone
       * instead of Gmail. Messages carry direction/body/createdAt, which is
       * exactly what ConversationView renders.
       */
      if (isSmsLead(lead)) {
        if (!lead.phone) return;
        try {
          const smsResponse = await apiClient.get(
            "/api/crm/communications/threads/by-phone",
            {
              params: { phone: lead.phone, leadId: lead._id },
            },
          );
          const smsMessages =
            smsResponse.data?.data?.messages || [];
          if (smsMessages.length > 0) {
            loadedThreadIdsRef.current.add(lead._id);
            /*
             * MERGE, don't replace: the customer's ORIGINAL inquiry lives on
             * the lead itself (it arrived through the DealersCloud pipeline,
             * not through Telnyx), so it must stay at the top of the thread.
             * Replacing the seed with only SMS-pipeline messages made the
             * customer's first message disappear once an employee replied.
             */
            setThreads((previous) => {
              const smsIds = new Set(
                smsMessages.map((m: any) => m?._id).filter(Boolean),
              );
              const preserved = (previous[lead._id] || fallbackMessages).filter(
                (m: any) => m?.isLeadFallback && !smsIds.has(m?._id),
              );
              const seed =
                preserved.length > 0 ? preserved : fallbackMessages;
              return {
                ...previous,
                [lead._id]: [...seed, ...smsMessages],
              };
            });
          }
        } catch (error) {
          console.error("Failed to load SMS thread:", error);
        }
        return;
      }

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
          `Thread request took ${Math.round(performance.now() - startedAt)
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

          /*
           * MERGE, don't replace (same fix as the SMS path): the customer's
           * ORIGINAL inquiry (ADF/website leads) exists only on the lead —
           * it is NOT in the Gmail thread — so it must stay at the top when
           * the synced Gmail messages (staff replies + customer replies)
           * load underneath it.
           */
          setThreads((previous) => {
            const syncedIds = new Set(
              syncedMessages
                .map((m: any) => m?._id || m?.id)
                .filter(Boolean),
            );
            const preserved = (previous[lead._id] || fallbackMessages).filter(
              (m: any) =>
                m?.isLeadFallback && !syncedIds.has(m?._id || m?.id),
            );
            const seed = preserved.length > 0 ? preserved : fallbackMessages;
            return {
              ...previous,
              [lead._id]: [...seed, ...syncedMessages],
            };
          });
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
    setShowLeadDetails(viewportMode !== "narrow");
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

      /*
       * SMS Reply: text-channel leads go out through the shared company
       * number. The reply is saved on the org-wide conversation with the
       * sending user, and every teammate's workspace updates via socket.
       */
      if (isSmsLead(selectedLead)) {
        if (!selectedLead.phone) {
          addToast("error", "This lead has no phone number on file");
          throw new Error("Missing phone number");
        }
        if (attachments.length > 0) {
          addToast(
            "error",
            "Attachments aren't supported for SMS replies yet",
          );
          throw new Error("Attachments unsupported for SMS");
        }

        const smsResponse = await apiClient.post(
          "/api/crm/communications/messages",
          {
            toPhone: selectedLead.phone,
            body: replyMessage.trim(),
            leadId: selectedLead._id,
            customerName: `${selectedLead.firstName || ""} ${selectedLead.lastName || ""}`.trim(),
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const sentMessage =
          smsResponse.data?.data?.message;
        if (sentMessage) {
          setThreads((previous) => {
            const existing = previous[selectedLead._id] || [];
            if (existing.some((m: any) => m?._id === sentMessage._id)) {
              return previous;
            }
            return {
              ...previous,
              [selectedLead._id]: [...existing, sentMessage],
            };
          });
        }

        setReplyMessage("");
        addToast("success", "Text message sent");

        await updateLeadStatus({
          id: selectedLead._id,
          status: "Contacted",
        });

        await refetch();
        return;
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

  const openQuoteModal = () => {
    if (!selectedLead) {
      addToast("error", "Please select a lead first");
      return;
    }

    setShippingOpen(true);
  };

  const openPaymentRequest = () => {
    if (!selectedLead) {
      addToast("error", "Please select a lead first");
      return;
    }

    const customerName =
      [selectedLead.firstName, selectedLead.lastName]
        .filter(Boolean)
        .join(" ") ||
      selectedLead.senderName ||
      "";

    const customerEmail =
      selectedLead.email || selectedLead.senderEmail || "";

    if (!customerEmail) {
      addToast("error", "This lead does not have an email address");
      return;
    }

    const vehicleDescription = [
      selectedLead.vehicle?.year,
      selectedLead.vehicle?.make,
      selectedLead.vehicle?.model,
    ]
      .filter(Boolean)
      .join(" ");

    setPaymentForm({
      customerName,
      customerEmail,
      customerPhone: selectedLead.phone || "",
      amount: 0,
      description: vehicleDescription
        ? `Payment for ${vehicleDescription}`
        : "Payment request",
      dueDate: "",
      notes: selectedLead._id
        ? `Created from CRM lead ${selectedLead._id}`
        : "Created from CRM Leads",
    });
    setPaymentOpen(true);
  };

  const handleCreateAndRequestPayment = async () => {
    if (isCreatingPayment) return;

    const customerName = paymentForm.customerName.trim();
    const customerEmail = paymentForm.customerEmail.trim();
    const description = paymentForm.description.trim();
    const amount = Number(paymentForm.amount);

    if (!customerName || !customerEmail || !description || amount <= 0) {
      addToast(
        "error",
        "Customer name, email, amount, and description are required",
      );
      return;
    }

    setIsCreatingPayment(true);

    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication required");

      const createResponse = await apiClient.post(
        "/api/payments",
        {
          customerName,
          customerEmail,
          customerPhone: paymentForm.customerPhone?.trim() || undefined,
          amount,
          currency: "usd",
          description,
          dueDate: paymentForm.dueDate || undefined,
          notes: paymentForm.notes?.trim() || undefined,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const payment = createResponse.data?.data;
      const paymentId = payment?._id || payment?.id;

      if (!paymentId) {
        throw new Error("Payment was created without an ID");
      }

      try {
        await apiClient.post(
          `/api/payments/${paymentId}/request`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        addToast("success", "Payment created and request sent");
      } catch (requestError: any) {
        const status = requestError?.response?.status;

        const requestMessage =
          requestError?.response?.data?.message ||
          requestError?.response?.data?.data?.message ||
          "The payment was created, but the request could not be sent";

        if (status === 404 || status === 409) {
          addToast(
            "error",
            "Payment created successfully, but the customer does not have a registered account yet. Ask them to sign up before sending the payment request.",
          );
        } else {
          addToast(
            "error",
            `Payment created, but request not sent: ${requestMessage}`,
          );
        }
      }

      setPaymentOpen(false);
      setPaymentForm(EMPTY_PAYMENT_FORM);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.data?.message ||
        error?.message ||
        "Failed to create payment";

      addToast("error", message);
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const handleCalculateQuote = async (formData: any) => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Authentication required");
      }

      const leadVehicle = selectedLead?.vehicle as any;

      const quoteVehicleWithId = quoteVehicle as Vehicle & {
        _id?: string;
      };

      const rawVehicleId =
        leadVehicle?.vehicleId?._id ||
        leadVehicle?.vehicleId ||
        leadVehicle?.inventoryVehicleId?._id ||
        leadVehicle?.inventoryVehicleId ||
        leadVehicle?._id ||
        leadVehicle?.id ||
        quoteVehicleWithId?._id ||
        quoteVehicleWithId?.id;

      const databaseVehicleId = isMongoObjectId(String(rawVehicleId || ""))
        ? String(rawVehicleId).trim()
        : undefined;

      const vehicleName = [
        quoteVehicle?.year,
        quoteVehicle?.make,
        quoteVehicle?.model,
      ]
        .filter(Boolean)
        .join(" ");

      /*
       * Send a MongoDB ID only when it is valid. Also include the vehicle
       * snapshot directly so VIN and vehicle details are not lost when a CRM
       * lead only contains a stock number instead of an inventory ObjectId.
       */
      const payload = {
        ...formData,
        ...(databaseVehicleId ? { vehicleId: databaseVehicleId } : {}),
        vehicleName: vehicleName || undefined,
        vin:
          quoteVehicle?.vin ||
          leadVehicle?.vin ||
          leadVehicle?.VIN ||
          leadVehicle?.vinNumber ||
          undefined,
        stockNumber:
          quoteVehicle?.stockNumber ||
          leadVehicle?.stockNumber ||
          leadVehicle?.stock ||
          undefined,
        vehicleLocation:
          quoteVehicle?.location ||
          leadVehicle?.location ||
          undefined,
        vehiclePrice:
          Number(quoteVehicle?.price || leadVehicle?.price) || undefined,
        toZip: formData.zipCode,
        toAddress: formData.fullAddress,
      };

      await apiClient.post("/api/quotes", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      addToast("success", "Shipping Quote Calculated & Saved");
      setShippingOpen(false);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.data?.message ||
        error?.message ||
        "Failed to calculate quote";

      addToast("error", message);
    }
  };

  const handleUpdateSelectedLeadDetails = async (changes: any) => {
    if (!selectedLead?._id) {
      throw new Error("No lead selected");
    }

    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication required");

      const response = await apiClient.patch(
        `/api/leads/${selectedLead._id}/details`,
        changes,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const updatedLead =
        response.data?.data?.lead ||
        response.data?.data ||
        response.data?.lead ||
        response.data;

      if (updatedLead?._id) {
        _setSelectedLead(updatedLead);
      }

      await refetch();
      addToast("success", "Lead details updated");
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Lead details could not be updated";
      addToast("error", message);
      throw error;
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

  const showLeadsPanel =
    !selectedLead || viewportMode === "wide";

  const showConversationPanel =
    Boolean(selectedLead) || viewportMode === "wide";

  const showDetailsPanel =
    Boolean(selectedLead) && showLeadDetails;

  return (
    <div
      className={cn("ss4 flex h-full min-h-0 flex-col")}
      data-theme={theme}
      data-viewport-mode={viewportMode}
      data-has-active-lead={selectedLead ? "true" : "false"}
      data-details-expanded={showLeadDetails ? "true" : "false"}
      data-autrix-open={isAutrixOpen ? "true" : "false"}
    >
      <ToastStack
        toasts={toasts}
        dismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))}
      />

      {/* ── TOPBAR ── */}
      {/* The mobile version stays compact by default. Full sync information is
          available on demand instead of permanently taking vertical space. */}
      <header
        className={cn(
          "ss4-topbar shrink-0",
          selectedLead && "hidden lg:block",
        )}
      >
        <div className="flex min-h-12 items-center justify-between gap-2 px-3 py-2 sm:min-h-13 sm:gap-3 sm:px-5 sm:py-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <div className="ss4-logo-mark flex h-8 w-8 shrink-0 items-center justify-center">
              <Mail className="h-3.5 w-3.5" style={{ color: "#fff" }} />
            </div>

            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h1
                  className="ss4-display truncate font-bold leading-tight tracking-tight"
                  style={{ fontSize: 15, color: "var(--text-primary)" }}
                >
                  Lead Inbox
                </h1>

                {total > 0 && (
                  <span
                    className="ss4-badge inline-flex shrink-0 items-center tabular-nums"
                    style={{ borderRadius: 10 }}
                  >
                    {total}
                  </span>
                )}
              </div>

              {/* Compact status on phones */}
              <button
                type="button"
                onClick={() =>
                  setIsInboxSummaryExpanded((expanded) => !expanded)
                }
                className="mt-0.5 flex max-w-full items-center gap-1.5 text-left sm:hidden"
                aria-expanded={isInboxSummaryExpanded}
                aria-label="Show lead inbox sync information"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    background: centralConnected
                      ? "var(--accent)"
                      : "var(--text-tertiary)",
                  }}
                />
                <span
                  className="truncate text-[10px] font-medium"
                  style={{
                    color: centralConnected
                      ? "var(--accent-text)"
                      : "var(--text-tertiary)",
                  }}
                >
                  {centralConnected ? "Live sync" : "Sync unavailable"}
                </span>
                <ChevronDown
                  className={cn(
                    "h-3 w-3 shrink-0 transition-transform",
                    isInboxSummaryExpanded && "rotate-180",
                  )}
                  style={{ color: "var(--text-tertiary)" }}
                />
              </button>

              {/* Full status remains visible from the sm breakpoint upward */}
              <div className="mt-0.5 hidden sm:block">
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
          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            <button
              onClick={toggleSelectMode}
              className="ss4-pill-btn flex h-8 w-8 items-center justify-center p-0 text-[11px] font-medium transition-all sm:h-7 sm:w-auto sm:gap-1.5 sm:px-2.5"
              style={
                selectMode
                  ? { color: "var(--accent)", borderColor: "var(--accent)" }
                  : undefined
              }
              title={selectMode ? "Cancel selection" : "Select conversations"}
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
              className="ss4-pill-btn flex h-8 w-8 items-center justify-center p-0 text-[11px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-30 sm:h-7 sm:w-auto sm:gap-1.5 sm:px-2.5"
              title="Refresh leads"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 sm:h-3 sm:w-3 ${isWorkerSyncing || localIsSyncing ? "animate-spin" : ""
                  }`}
              />
              <span className="hidden sm:inline">
                {isWorkerSyncing || localIsSyncing ? "Syncing…" : "Refresh"}
              </span>
            </button>

            <button
              onClick={toggleTheme}
              className="ss4-theme-btn flex h-8 w-8 shrink-0 items-center justify-center sm:h-7 sm:w-7"
              title="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-3.5 w-3.5" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )}
            </button>

            <div className="shrink-0 max-[380px]:scale-90 max-[380px]:origin-right">
              <SupraLeoAI variant="toolbar" onOpenChange={setIsAutrixOpen} />
            </div>
          </div>
        </div>

        {/* Expandable sync information for small screens */}
        {isInboxSummaryExpanded && (
          <div
            className="border-t px-3 py-2 sm:hidden"
            style={{
              borderColor: "var(--border-1)",
              background: "var(--bg-elevated)",
            }}
          >
            <SyncStatus
              connected={centralConnected}
              email={centralEmail}
              sourceEmail={LEADS_SOURCE_EMAIL}
              lastSyncTime={lastSyncTime}
              statusLoaded={centralStatusLoaded}
            />
          </div>
        )}
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
        <ConversationWorkspace
          viewportMode={viewportMode}
          hasSelection={Boolean(selectedLead)}
          detailsExpanded={showLeadDetails}
          className="bg-(--bg-base)"
        >
          {/* SHARED CONVERSATION LIST PANEL */}
          {showLeadsPanel && (
            <aside
              className="cw-list-slot flex min-h-0 min-w-0 shrink-0 flex-col border-r"
              style={{
                background: "var(--bg-elevated)",
                borderColor: "var(--border-1)",
              }}
            >
              <LeadsList
                title="Inquiries & Leads"
                subtitle="Lead Inbox"
                leads={leads}
                isLoading={isLoading}
                total={total}
                pages={pages}
                currentPage={currentPage}
                selectedLeadId={selectedLead?._id}
                searchQuery={searchQuery}
                onSearchChange={(query) => {
                  setSearchQuery(query);
                  setCurrentPage(1);
                }}
                onPageChange={setCurrentPage}
                onLeadSelect={setSelectedLead}
                highlightedLeadIds={highlightedLeadIds}
                itemsPerPage={LEADS_PER_PAGE}
                sourceEmail={LEADS_SOURCE_EMAIL}
                selectMode={selectMode}
                selectedIds={selectedLeadIds}
                onToggleSelect={toggleLeadSelected}
                headerAction={
                  <button
                    type="button"
                    onClick={toggleSelectMode}
                    className="ss4-icon-btn h-9 w-9"
                    title={selectMode ? "Cancel select mode" : "Select conversations"}
                    aria-label={selectMode ? "Cancel select mode" : "Select conversations"}
                  >
                    {selectMode ? (
                      <X className="h-4 w-4" />
                    ) : (
                      <CheckSquare className="h-4 w-4" />
                    )}
                  </button>
                }
                topContent={
                  <>
                    <div
                      className="grid shrink-0 grid-cols-2 gap-1.5 border-b px-2 py-2 sm:gap-2 sm:px-3 sm:py-3"
                      style={{
                        borderColor: "var(--border-1)",
                        background: "var(--bg-elevated)",
                      }}
                    >
                      <label className="relative min-w-0">
                        <Filter
                          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 sm:left-3"
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
                          className="h-8 w-full appearance-none rounded-lg pl-8 pr-7 text-[11px] font-medium outline-none sm:h-9 sm:pl-9 sm:pr-8 sm:text-xs"
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
                          className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 sm:right-2.5"
                          style={{ color: "var(--text-tertiary)" }}
                        />
                      </label>

                      <label className="relative min-w-0">
                        <ArrowUpDown
                          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 sm:left-3"
                          style={{ color: "var(--text-tertiary)" }}
                        />
                        <select
                          value={sortBy}
                          onChange={(event) => {
                            setSortBy(event.target.value as LeadSortOption);
                            setCurrentPage(1);
                          }}
                          className="h-8 w-full appearance-none rounded-lg pl-8 pr-7 text-[11px] font-medium outline-none sm:h-9 sm:pl-9 sm:pr-8 sm:text-xs"
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
                          className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 sm:right-2.5"
                          style={{ color: "var(--text-tertiary)" }}
                        />
                      </label>
                    </div>

                    {isFetching && !isLoading ? (
                      <div
                        className="shrink-0 px-3 py-1 text-[10px]"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        Updating…
                      </div>
                    ) : null}

                    {selectMode ? (
                      <div
                        className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2"
                        style={{
                          borderColor: "var(--border-1)",
                          background: "var(--bg-elevated)",
                        }}
                      >
                        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                          {selectedLeadIds.size} selected
                        </span>
                        <button
                          onClick={() => setBulkModalOpen(true)}
                          disabled={selectedLeadIds.size === 0}
                          className="ss4-pill-btn h-8 px-3 text-[12px] font-medium disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          Reply to all
                        </button>
                      </div>
                    ) : null}
                  </>
                }
              />
            </aside>
          )}

          {/* PODIUM-LIKE CENTER CONVERSATION PANEL */}
          {showConversationPanel && (
            <main
              className="cw-center-slot relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
              style={{
                background: "var(--bg-base)",
              }}
              onMouseEnter={() => setIsChatHovered(true)}
              onMouseLeave={() => setIsChatHovered(false)}
            >
              {selectedLead && viewportMode !== "wide" && (
                <button
                  type="button"
                  onClick={() => setSelectedLead(null)}
                  className="absolute left-3 top-3 z-40 flex h-9 w-9 items-center justify-center rounded-lg border shadow-sm transition-colors"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--border-2)",
                    color: "var(--text-secondary)",
                  }}
                  title="Back to leads"
                  aria-label="Back to leads"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}

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
                    onQuoteShipping={openQuoteModal}
                    onReopen={(reason) =>
                      handleStatus("Pending", reason)
                    }
                    selectedLeadStatus={selectedLead.status}
                  />
                </>
              ) : (
                <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
                  <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 lg:max-w-3xl">
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
          )}

          {/* PODIUM-LIKE RIGHT DETAILS PANEL */}
          {showDetailsPanel && (
            <div
              className={cn(
                "cw-details-slot",
                viewportMode === "narrow" &&
                "cw-details-overlay",
              )}
            >
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
                onCalculateQuote={openQuoteModal}
                onRequestPayment={openPaymentRequest}
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
                onUpdateDetails={handleUpdateSelectedLeadDetails}
              />
            </div>
          )}
        </ConversationWorkspace>
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

      <LeadPaymentDialog
        open={paymentOpen}
        form={paymentForm}
        isCreating={isCreatingPayment}
        onOpenChange={(open) => {
          if (!isCreatingPayment) {
            setPaymentOpen(open);
          }
        }}
        onFormChange={setPaymentForm}
        onSubmit={() => void handleCreateAndRequestPayment()}
      />

      <ShippingQuoteModal
        open={shippingOpen}
        onOpenChange={setShippingOpen}
        vehicles={quoteVehicles}
        onCalculate={handleCalculateQuote}
        defaultVehicle={quoteVehicle}
        initialData={
          selectedLead
            ? {
              firstName: selectedLead.firstName || "",
              lastName: selectedLead.lastName || "",
              email:
                selectedLead.email ||
                selectedLead.senderEmail ||
                "",
              phone: selectedLead.phone || "",
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

function LeadPaymentDialog({
  open,
  form,
  isCreating,
  onOpenChange,
  onFormChange,
  onSubmit,
}: {
  open: boolean;
  form: LeadPaymentForm;
  isCreating: boolean;
  onOpenChange: (open: boolean) => void;
  onFormChange: (form: LeadPaymentForm) => void;
  onSubmit: () => void;
}) {
  const fieldClass =
    "w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-offset-background transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="!z-[2147483000] bg-black/70 backdrop-blur-[4px]"
        className="z-2147483001! w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-125 max-h-[90dvh] overflow-y-auto custom-scrollbar bg-card border-border text-card-foreground"
      >

        <div className="space-y-3 border-b border-border pb-4">
          <DialogTitle className="text-lg font-bold text-foreground">
            Request Payment
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Create a pending payment and send the request to this lead.
          </DialogDescription>
        </div>

        <div className="space-y-6 pt-4">
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <CircleDollarSign className="h-4 w-4" />
              <span className="text-sm font-semibold">Customer Information</span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <PaymentField label="Customer name" required>
                <input
                  value={form.customerName}
                  onChange={(event) =>
                    onFormChange({ ...form, customerName: event.target.value })
                  }
                  className={fieldClass}
                  placeholder="Full name"
                  disabled={isCreating}
                />
              </PaymentField>

              <PaymentField label="Email" required>
                <input
                  type="email"
                  value={form.customerEmail}
                  onChange={(event) =>
                    onFormChange({ ...form, customerEmail: event.target.value })
                  }
                  className={fieldClass}
                  placeholder="customer@example.com"
                  disabled={isCreating}
                />
              </PaymentField>
            </div>

            <PaymentField label="Phone">
              <input
                type="tel"
                value={form.customerPhone || ""}
                onChange={(event) =>
                  onFormChange({ ...form, customerPhone: event.target.value })
                }
                className={fieldClass}
                placeholder="Phone number"
                disabled={isCreating}
              />
            </PaymentField>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <CreditCard className="h-4 w-4" />
              <span className="text-sm font-semibold">Payment Details</span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <PaymentField label="Amount (USD)" required>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount ? String(form.amount) : ""}
                  onChange={(event) =>
                    onFormChange({
                      ...form,
                      amount: Number.parseFloat(event.target.value) || 0,
                    })
                  }
                  className={fieldClass}
                  placeholder="0.00"
                  disabled={isCreating}
                />
              </PaymentField>

              <PaymentField label="Due date">
                <input
                  type="date"
                  value={form.dueDate || ""}
                  onChange={(event) =>
                    onFormChange({ ...form, dueDate: event.target.value })
                  }
                  className={fieldClass}
                  disabled={isCreating}
                />
              </PaymentField>
            </div>

            <PaymentField label="Description" required>
              <input
                value={form.description}
                onChange={(event) =>
                  onFormChange({ ...form, description: event.target.value })
                }
                className={fieldClass}
                placeholder="Payment description"
                disabled={isCreating}
              />
            </PaymentField>

            <PaymentField label="Notes">
              <textarea
                rows={4}
                value={form.notes || ""}
                onChange={(event) =>
                  onFormChange({ ...form, notes: event.target.value })
                }
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-offset-background transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Optional internal notes"
                disabled={isCreating}
              />
            </PaymentField>
          </section>

          <button
            type="button"
            onClick={onSubmit}
            disabled={
              isCreating ||
              !form.customerName.trim() ||
              !form.customerEmail.trim() ||
              Number(form.amount) <= 0 ||
              !form.description.trim()
            }
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating and sending…
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create and request payment
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PaymentField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-foreground">
        {label}
        {required ? <span className="ml-1 text-primary">*</span> : null}
      </span>
      {children}
    </label>
  );
}
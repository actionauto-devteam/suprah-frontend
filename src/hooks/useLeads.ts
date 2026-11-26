import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { useRef, useCallback, useEffect } from "react";
import type { LeadStatus } from "@/lib/leadStatus";
import type { Lead as LinkedLead } from "@/types/lead";
import type { CustomerArea } from "@/lib/customerArea";

export interface Lead {
  _id: string;
  combinedInto?: { leadId?: string; at?: string; via?: "combine" | "link" } | null;
  customerId?: string;
  customerLink?: LinkedLead['customerLink'];
  // Contact Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  senderEmail?: string;
  senderName?: string;

  // Email Fields
  subject?: string;
  body?: string;
  parsedContent?: string;
  threadId?: string;
  messageId?: string;
  isRead?: boolean;
  isPending?: boolean;
  labels?: string[];
  channel?: string;

  // Lead Information
  source: string;
  sourceProvider?: string;
  isDemoLead?: boolean;
  status: LeadStatus;
  vehicle: {
    year: string;
    make: string;
    model: string;
    stock?: string;
    vin?: string;
  };
  vehicleId?: string;
  location?: string;
  storeName?: string | null;
  dealershipLine?: string;
  comments: string;
  address?: string;
  customerArea?: CustomerArea | null;
  needsReplySince?: string | null;
  birthday?: string;
  tags?: string[];
  aiSummary?: string;
  aiSummaryGeneratedAt?: string;
  aiPausedAt?: string;
  intakeIdentity?: "unverified";
  inquiryCount?: number;
  aiPausedBy?: { userId?: string; name?: string };
  aiAutoPausedUntil?: string;
  opportunityValue?: number;
  appointment?: any;
  statusHistory?: {
    from: string;
    to: string;
    changedAt: string;
    changedBy?: string;
    reason?: string;
  }[];
  assignedTo?: string | null;
  assignedAt?: string | null;
  assignmentUnseenBy?: string | null;
  openedBy?: Array<{ userId: string; name?: string; at: string }> | null;
  firstContactBy?: "customer" | "team" | null;
  firstContactVia?: "team_text" | "team_call" | "added_by_team" | null;
  campaign?: {
    kind: "price_drop" | "reengagement" | "sms_campaign" | "email_campaign";
    sentAt: string;
    responded: boolean;
  } | null;
  assignmentHistory?: {
    from?: string;
    to?: string;
    changedAt: string;
    changedBy?: string;
  }[];
  notes?: {
    _id?: string;
    text: string;
    createdAt: string;
    createdBy?: string;
    authorType?: "user" | "ai";
    authorName?: string;
    mentionedUserIds?: string[];
    mentionedGroupIds?: string[];
    milestone?: boolean;
    sourceTaskId?: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedLeads {
  leads: Lead[];
  total: number;
  page: number;
  pages: number;
}

interface UseLeadsOptions {
  page?: number
  limit?: number
  search?: string
  status?: string | null
  statusGroup?: string | null
  sortBy?: "latest_activity" | "customer_activity" | "newest" | "oldest" | "waiting_longest"
  assignedTo?: string | null
  handledBy?: string | null
  customerArea?: string | null
  needsReply?: boolean
  location?: string | null
  source?: string | null
  leadType?: string | null
  dateFrom?: string | null
  dateTo?: string | null
  liveRefreshMs?: number
}

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// Longer timeout specifically for the leads list fetch.
// The default apiClient timeout (30s) is too tight when the DB query is slow
// on first load or after a sync. 60s gives the backend enough headroom.
const LEADS_FETCH_TIMEOUT_MS = 60_000;

export const useLeads = (options: UseLeadsOptions = {}) => {
  const {
  page = 1,
  limit = 20,
  search = '',
  status = null,
  statusGroup = null,
  sortBy = 'latest_activity',
  assignedTo = null,
  handledBy = null,
  customerArea = null,
  needsReply = false,
  location = null,
  source = null,
  leadType = null,
  dateFrom = null,
  dateTo = null,
  liveRefreshMs = 0,
  } = options
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  // Concurrency guard: only one invalidate+refetch runs at a time.
  // Without this, concurrent mutation onSuccess callbacks (e.g. markAsRead
  // firing while a sync is in progress) stack up and cause request pile-up.
  const refetchInProgress = useRef(false);
  const refetchQueued = useRef(false);
  const queuedRefetch = useRef<(() => Promise<void>) | null>(null);

  const getAuthHeaders = async () => {
    const token = await getToken();
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  // ── Fetch paginated leads ──────────────────────────────────────────────────
  const {
    data,
    isLoading,
    isFetching,
    isPlaceholderData,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      "leads",
      page,
      limit,
      search,
      status,
      statusGroup,
      sortBy,
      assignedTo,
      handledBy,
      location,
      source,
      leadType,
      dateFrom,
      dateTo,
      customerArea,
      needsReply,
    ],

    queryFn: async ({ signal }) => {
      const token = await getToken();

      const params = new URLSearchParams();

      params.append("page", page.toString());
      params.append("limit", limit.toString());

      if (search) {
        params.append("search", search);
      }

      if (
        status &&
        status !== "Inbound Calls"
      ) {
        params.append("status", status);
      } else if (statusGroup) {
        params.append("statusGroup", statusGroup);
      }

      params.append("sortBy", sortBy);

      if (assignedTo) {
        params.append("assignedTo", assignedTo);
      }

      if (handledBy) {
        params.append("handledBy", handledBy);
      }

      if (customerArea) {
        params.append("customerArea", customerArea);
      }

      if (needsReply) {
        params.append("needsReply", "true");
      }

      if (location) {
        params.append("location", location);
      }

      if (source) {
        params.append("source", source);
      }

      if (leadType) {
        params.append("leadType", leadType);
      }

      if (dateFrom) {
        params.append("dateFrom", dateFrom);
      }

      if (dateTo) {
        params.append("dateTo", dateTo);
      }

      const response = await apiClient.get(
        `/api/leads?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal,
          timeout: LEADS_FETCH_TIMEOUT_MS,
        },
      );

      const resData =
        response.data?.data ||
        response.data;

      return resData as PaginatedLeads;
    },

    // Keep the previous list on screen while another filter loads.
    placeholderData: (previousData) =>
      previousData,

    // Reuse recently fetched filter combinations for 30 seconds.
    staleTime: 30_000,

    refetchOnWindowFocus: false,

    refetchInterval: liveRefreshMs > 0 ? liveRefreshMs : false,

    retry: (failureCount, error: any) => {
      if (
        error?.code === "ECONNABORTED" ||
        error?.message?.includes("timeout") ||
        !error?.response
      ) {
        return failureCount < 1;
      }

      return false;
    },

    retryDelay: 2000,
  });

  // ── Shared invalidation helper — guards against concurrent calls ──────────
  const invalidateAndRefetch = useCallback(
    async (waitMs = 600) => {
      if (refetchInProgress.current) {
        refetchQueued.current = true;
        return;
      }
      refetchInProgress.current = true;
      try {
        if (waitMs > 0) await delay(waitMs);
        await queryClient.invalidateQueries({ queryKey: ["leads"] });
        await refetch();
      } finally {
        refetchInProgress.current = false;
        if (refetchQueued.current) {
          refetchQueued.current = false;
          void queuedRefetch.current?.();
        }
      }
    },
    [queryClient, refetch],
  );

  useEffect(() => {
    queuedRefetch.current = () => invalidateAndRefetch(0);
  }, [invalidateAndRefetch]);

  // ── Update lead status ─────────────────────────────────────────────────────
  const updateLeadMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: string;
      reason?: string;
    }) => {
      const headers = await getAuthHeaders();
      const response = await apiClient.patch(
        `/api/leads/${id}`,
        { status, reason },
        headers,
      );
      return response.data;
    },
    onSuccess: () => invalidateAndRefetch(300),
  });

  // ── Mark as read ───────────────────────────────────────────────────────────
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const headers = await getAuthHeaders();
      const response = await apiClient.patch(
        `/api/leads/${id}/read`,
        {},
        headers,
      );
      return response.data;
    },
    // isRead is cosmetic — skip the delay, update immediately
    onSuccess: () => invalidateAndRefetch(0),
  });

  // ── Mark as pending ────────────────────────────────────────────────────────
  const markAsPendingMutation = useMutation({
    mutationFn: async (id: string) => {
      const headers = await getAuthHeaders();
      const response = await apiClient.patch(
        `/api/leads/${id}/pending`,
        {},
        headers,
      );
      return response.data;
    },
    onSuccess: () => invalidateAndRefetch(300),
  });

  const assignLeadMutation = useMutation({
    mutationFn: async ({
      id,
      assignedTo,
    }: {
      id: string;
      assignedTo: string | null;
    }) => {
      const headers = await getAuthHeaders();
      const response = await apiClient.patch(
        `/api/leads/${id}/assign`,
        { assignedTo },
        headers,
      );
      return response.data;
    },
    onSuccess: () => invalidateAndRefetch(0),
  });

  // ── Add internal note ──────────────────────────────────────────────────────
  const addNoteMutation = useMutation({
    mutationFn: async ({
      id,
      note,
      mentionedUserIds,
      mentionedGroupIds,
    }: {
      id: string;
      note: string;
      mentionedUserIds?: string[];
      mentionedGroupIds?: string[];
    }) => {
      const trimmedNote = note.trim();

      if (!trimmedNote) {
        throw new Error("Note cannot be empty");
      }

      const headers = await getAuthHeaders();

      const response = await apiClient.post(
        `/api/leads/${id}/notes`,
        {
          note: trimmedNote,
          mentionedUserIds: mentionedUserIds || [],
          mentionedGroupIds: mentionedGroupIds || [],
        },
        headers,
      );

      return response.data;
    },

    onSuccess: async () => {
      await invalidateAndRefetch(0);
    },
  });

  // ── Reply to inquiry ───────────────────────────────────────────────────────
  const replyMutation = useMutation({
    mutationFn: async ({ id, message }: { id: string; message: string }) => {
      const headers = await getAuthHeaders();
      const response = await apiClient.post(
        `/api/leads/${id}/reply`,
        { message },
        headers,
      );
      return response.data;
    },
    onSuccess: () => invalidateAndRefetch(300),
  });

  // ── Bulk reply to multiple inquiries ────────────────────────────────────────
  const bulkReplyMutation = useMutation({
    mutationFn: async ({
      leadIds,
      message,
    }: {
      leadIds: string[];
      message: string;
    }) => {
      const headers = await getAuthHeaders();
      const response = await apiClient.post(
        `/api/leads/bulk-reply`,
        { leadIds, message },
        headers,
      );
      return response.data as {
        success: boolean;
        sent: number;
        failed: { leadId: string; error: string }[];
      };
    },
    onSuccess: () => invalidateAndRefetch(300),
  });

  // ── Sync Gmail & Calendar (Unified Org-level) ──────────────────────────────
  const syncMutation = useMutation({
    mutationFn: async () => {
      const headers = await getAuthHeaders();
      const response = await apiClient.post(`/api/org-lead/sync`, {}, headers);
      return response.data;
    },
    // After sync, wait 1s for all DB writes to settle before refetching
    onSuccess: () => invalidateAndRefetch(1000),
  });

  const stableRefetch = useCallback(
    () => invalidateAndRefetch(0),
    [invalidateAndRefetch],
  );
  const stableSync = useCallback(syncMutation.mutateAsync, [
    syncMutation.mutateAsync,
  ]);

  return {
    leads: data?.leads || [],
    total: data?.total || 0,
    page: data?.page || 1,
    pages: data?.pages || 1,
    isLoading,
    isFetching,
    isPlaceholderData,
    isError,

    refetch: stableRefetch,

    updateLeadStatus:
      updateLeadMutation.mutateAsync,

    assignLead:
      assignLeadMutation.mutateAsync,

    markAsRead:
      markAsReadMutation.mutateAsync,

    markAsPending:
      markAsPendingMutation.mutateAsync,

    // Internal lead notes
    addLeadNote:
      addNoteMutation.mutateAsync,

    isAddingNote:
      addNoteMutation.isPending,

    reply:
      replyMutation.mutate,

    bulkReply:
      bulkReplyMutation.mutateAsync,

    isBulkReplying:
      bulkReplyMutation.isPending,

    sync:
      stableSync,

    isSyncing:
      syncMutation.isPending,

  };
};

export const useLeadStatusCounts = (liveRefreshMs = 0) => {
  const { getToken } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["leads", "status-counts"],

    queryFn: async ({ signal }) => {
      const token = await getToken();

      const response = await apiClient.get("/api/leads/status-counts", {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });

      const resData = response.data?.data || response.data;
      return (resData?.counts || {}) as Record<string, number>;
    },

    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchInterval: liveRefreshMs > 0 ? liveRefreshMs : false,
  });

  return { counts: data || {}, isLoading };
};

export const useLeadLocationCounts = (liveRefreshMs = 0) => {
  const { getToken } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["leads", "location-counts"],

    queryFn: async ({ signal }) => {
      const token = await getToken();

      const response = await apiClient.get("/api/leads/location-counts", {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });

      const resData = response.data?.data || response.data;
      return (resData?.counts || {}) as Record<string, number>;
    },

    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchInterval: liveRefreshMs > 0 ? liveRefreshMs : false,
  });

  return { counts: data || {}, isLoading };
};

export const useLeadTypeCounts = (liveRefreshMs = 0) => {
  const { getToken } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["leads", "lead-type-counts"],

    queryFn: async ({ signal }) => {
      const token = await getToken();

      const response = await apiClient.get("/api/leads/lead-type-counts", {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });

      const resData = response.data?.data || response.data;
      return (resData?.counts || {}) as Record<string, number>;
    },

    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchInterval: liveRefreshMs > 0 ? liveRefreshMs : false,
  });

  return { counts: data || {}, isLoading };
};

export const useAssignedNewCount = (enabled: boolean, liveRefreshMs = 0) => {
  const { getToken } = useAuth();

  const { data } = useQuery({
    queryKey: ["leads", "assigned-new"],
    enabled,

    queryFn: async ({ signal }) => {
      const token = await getToken();
      const response = await apiClient.get("/api/leads/assigned-new-count", {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      const resData = response.data?.data || response.data;
      const total = Number(resData?.total);
      return { count: Number(resData?.count) || 0, total: Number.isFinite(total) ? total : null };
    },

    staleTime: 15_000,
    refetchOnWindowFocus: true,
    refetchInterval: enabled && liveRefreshMs > 0 ? liveRefreshMs : false,
  });

  return { count: data?.count || 0, total: data?.total ?? null };
};

export type LeadMentionStatus = "new" | "completed" | "all";

export interface LeadMentionItem {
  id: string;
  leadId: string;
  noteId: string;
  firstName: string;
  lastName: string;
  customerName: string;
  phone: string;
  email: string;
  status: string;
  channel: string;
  via: "person" | "team";
  teamName: string;
  authorName: string;
  authorType: string;
  text: string;
  mentionedAt: string;
  completedAt: string | null;
}

export const useLeadMentions = (options: { enabled: boolean; status: LeadMentionStatus; page: number; search: string }) => {
  const { getToken } = useAuth();

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["leads", "mentions", options.status, options.page, options.search],
    enabled: options.enabled,

    queryFn: async ({ signal }) => {
      const token = await getToken();
      const response = await apiClient.get("/api/leads/mentions", {
        headers: { Authorization: `Bearer ${token}` },
        params: { status: options.status, page: options.page, limit: 20, ...(options.search ? { q: options.search } : {}) },
        signal,
      });
      const resData = response.data?.data || response.data;
      return {
        items: (Array.isArray(resData?.items) ? resData.items : []) as LeadMentionItem[],
        total: Number(resData?.total) || 0,
        pages: Number(resData?.pages) || 1,
        asOf: typeof resData?.asOf === "string" ? resData.asOf : null,
      };
    },

    staleTime: 10_000,
    refetchOnWindowFocus: true,
    placeholderData: (previous) => previous,
  });

  return {
    items: data?.items || [],
    total: data?.total || 0,
    pages: data?.pages || 1,
    asOf: data?.asOf || null,
    isLoading,
    isFetching,
    isError,
    refetch,
  };
};

export const useLeadMentionCount = (enabled: boolean, liveRefreshMs = 0) => {
  const { getToken } = useAuth();

  const { data } = useQuery({
    queryKey: ["leads", "mentions-count"],
    enabled,

    queryFn: async ({ signal }) => {
      const token = await getToken();
      const response = await apiClient.get("/api/leads/mentions/count", {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      const resData = response.data?.data || response.data;
      return Number(resData?.count) || 0;
    },

    staleTime: 15_000,
    refetchOnWindowFocus: true,
    refetchInterval: enabled && liveRefreshMs > 0 ? liveRefreshMs : false,
  });

  return data || 0;
};

export const useCompleteLeadMentions = () => {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useCallback(
    async (body: { all?: boolean; mentionId?: string; noteId?: string; before?: string }) => {
      const token = await getToken();
      await apiClient.post("/api/leads/mentions/complete", body, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["leads", "mentions"] }),
        queryClient.invalidateQueries({ queryKey: ["leads", "mentions-count"] }),
      ]);
    },
    [getToken, queryClient],
  );
};

export const useNeedsReplyCount = (enabled: boolean, liveRefreshMs = 0) => {
  const { getToken } = useAuth();

  const { data } = useQuery({
    queryKey: ["leads", "needs-reply"],
    enabled,

    queryFn: async ({ signal }) => {
      const token = await getToken();
      const response = await apiClient.get("/api/leads/needs-reply-count", {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      const resData = response.data?.data || response.data;
      return Number(resData?.count) || 0;
    },

    staleTime: 15_000,
    refetchOnWindowFocus: true,
    refetchInterval: enabled && liveRefreshMs > 0 ? liveRefreshMs : false,
  });

  return data || 0;
};

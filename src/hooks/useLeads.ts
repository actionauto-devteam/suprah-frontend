import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useAuth } from "@/providers/AuthProvider"
import { useRef, useCallback } from 'react'

export interface Lead {
  _id: string
  // Contact Information
  firstName: string
  lastName: string
  email: string
  phone: string
  senderEmail?: string
  senderName?: string

  // Email Fields
  subject?: string
  body?: string
  parsedContent?: string
  threadId?: string
  messageId?: string
  isRead?: boolean
  isPending?: boolean
  labels?: string[]
  channel?: string

  // Lead Information
  source: string
  status: 'New' | 'Contacted' | 'Pending' | 'Appointment Set' | 'Closed'
  vehicle: {
    year: string
    make: string
    model: string
    stock?: string
  }
  comments: string
  appointment?: any
  statusHistory?: {
    from: string
    to: string
    changedAt: string
    changedBy?: string
    reason?: string
  }[]
  createdAt: string
  updatedAt: string
}

export interface PaginatedLeads {
  leads: Lead[]
  total: number
  page: number
  pages: number
}

interface UseLeadsOptions {
  page?: number
  limit?: number
  search?: string
  status?: string | null
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

// Longer timeout specifically for the leads list fetch.
// The default apiClient timeout (30s) is too tight when the DB query is slow
// on first load or after a sync. 60s gives the backend enough headroom.
const LEADS_FETCH_TIMEOUT_MS = 60_000

export const useLeads = (options: UseLeadsOptions = {}) => {
  const { page = 1, limit = 20, search = '', status = null } = options
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  // Concurrency guard: only one invalidate+refetch runs at a time.
  // Without this, concurrent mutation onSuccess callbacks (e.g. markAsRead
  // firing while a sync is in progress) stack up and cause request pile-up.
  const refetchInProgress = useRef(false)

  const getAuthHeaders = async () => {
    const token = await getToken()
    return { headers: { Authorization: `Bearer ${token}` } }
  }

  // ── Fetch paginated leads ──────────────────────────────────────────────────
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['leads', page, limit, search, status],
    queryFn: async ({ signal }) => {
      const token = await getToken()

      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('limit', limit.toString())
      if (search) params.append('search', search)
      if (status && status !== 'Inbound Calls') params.append('status', status)

      // Pass the React Query AbortSignal into axios so that when React Query
      // cancels a stale request (e.g. component unmounts, or a newer fetch
      // supersedes this one), the in-flight HTTP request is also cancelled.
      const response = await apiClient.get(`/api/leads?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
        timeout: LEADS_FETCH_TIMEOUT_MS,
      })

      const resData = response.data?.data || response.data

      // Temporary fallback for backwards compatibility with un-paginated backend
      // (This will be removed once Phase 2 backend is deployed)
      if (Array.isArray(resData)) {
        // Client-side simulate the query logic if backend is still legacy
        let filtered = resData
        if (status && status !== 'Inbound Calls') {
          filtered = filtered.filter((l: any) => l.status === status)
        }
        if (search) {
          const q = search.toLowerCase()
          filtered = filtered.filter((l: any) =>
            l.firstName?.toLowerCase().includes(q) || l.lastName?.toLowerCase().includes(q) ||
            l.email?.toLowerCase().includes(q) || l.subject?.toLowerCase().includes(q)
          )
        }
        return {
          leads: filtered.slice((page - 1) * limit, page * limit),
          total: filtered.length,
          page: page,
          pages: Math.ceil(filtered.length / limit)
        } as PaginatedLeads
      }

      return resData as PaginatedLeads
    },
    // Always re-fetch from network — never serve stale leads from cache
    staleTime: 0,
    refetchOnWindowFocus: true,
    // Retry once on timeout/network error before surfacing the failure.
    retry: (failureCount, error: any) => {
      if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
        return failureCount < 1
      }
      return false
    },
    retryDelay: 2000,
  })

  // ── Shared invalidation helper — guards against concurrent calls ──────────
  const invalidateAndRefetch = useCallback(async (waitMs = 600) => {
    if (refetchInProgress.current) return
    refetchInProgress.current = true
    try {
      if (waitMs > 0) await delay(waitMs)
      await queryClient.invalidateQueries({ queryKey: ['leads'] })
      await refetch()
    } finally {
      refetchInProgress.current = false
    }
  }, [queryClient, refetch])

  // ── Update lead status ─────────────────────────────────────────────────────
  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      const headers = await getAuthHeaders()
      const response = await apiClient.patch(`/api/leads/${id}`, { status, reason }, headers)
      return response.data
    },
    onSuccess: () => invalidateAndRefetch(300),
  })

  // ── Mark as read ───────────────────────────────────────────────────────────
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const headers = await getAuthHeaders()
      const response = await apiClient.patch(`/api/leads/${id}/read`, {}, headers)
      return response.data
    },
    // isRead is cosmetic — skip the delay, update immediately
    onSuccess: () => invalidateAndRefetch(0),
  })

  // ── Mark as pending ────────────────────────────────────────────────────────
  const markAsPendingMutation = useMutation({
    mutationFn: async (id: string) => {
      const headers = await getAuthHeaders()
      const response = await apiClient.patch(`/api/leads/${id}/pending`, {}, headers)
      return response.data
    },
    onSuccess: () => invalidateAndRefetch(300),
  })

  // ── Reply to inquiry ───────────────────────────────────────────────────────
  const replyMutation = useMutation({
    mutationFn: async ({ id, message }: { id: string; message: string }) => {
      const headers = await getAuthHeaders()
      const response = await apiClient.post(`/api/leads/${id}/reply`, { message }, headers)
      return response.data
    },
    onSuccess: () => invalidateAndRefetch(300),
  })

  // ── Bulk reply to multiple inquiries ────────────────────────────────────────
  const bulkReplyMutation = useMutation({
    mutationFn: async ({ leadIds, message }: { leadIds: string[]; message: string }) => {
      const headers = await getAuthHeaders()
      const response = await apiClient.post(`/api/leads/bulk-reply`, { leadIds, message }, headers)
      return response.data as { success: boolean; sent: number; failed: { leadId: string; error: string }[] }
    },
    onSuccess: () => invalidateAndRefetch(300),
  })

  // ── Sync Gmail & Calendar (Unified Org-level) ──────────────────────────────
  const syncMutation = useMutation({
    mutationFn: async () => {
      const headers = await getAuthHeaders()
      const response = await apiClient.post(`/api/org-lead/sync`, {}, headers)
      return response.data
    },
    // After sync, wait 1s for all DB writes to settle before refetching
    onSuccess: () => invalidateAndRefetch(1000),
  })

  const stableRefetch = useCallback(() => invalidateAndRefetch(0), [invalidateAndRefetch])
  const stableSync = useCallback(syncMutation.mutateAsync, [syncMutation.mutateAsync])

  return {
    leads: data?.leads || [],
    total: data?.total || 0,
    page: data?.page || 1,
    pages: data?.pages || 1,
    isLoading,
    refetch: stableRefetch,
    updateLeadStatus: updateLeadMutation.mutateAsync,
    markAsRead: markAsReadMutation.mutateAsync,
    markAsPending: markAsPendingMutation.mutateAsync,
    reply: replyMutation.mutate,
    bulkReply: bulkReplyMutation.mutateAsync,
    isBulkReplying: bulkReplyMutation.isPending,
    sync: stableSync,
    isSyncing: syncMutation.isPending,
  }
}
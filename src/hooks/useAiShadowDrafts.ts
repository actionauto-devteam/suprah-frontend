"use client"

import * as React from "react"
import { apiClient } from "@/lib/api-client"
import type {
  AiChangeHistoryPage,
  ShadowDraftDetail,
  ShadowDraftPage,
  ShadowUsageReport,
} from "@/lib/aiShadowDrafts"

type GetToken = () => Promise<string | null>

function errorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
  return message || fallback
}

function useReadOnlyResource<T>(getToken: GetToken, path: string | null, fallbackError: string) {
  const [data, setData] = React.useState<T | null>(null)
  const [loading, setLoading] = React.useState(Boolean(path))
  const [error, setError] = React.useState<string | null>(null)
  const getTokenRef = React.useRef(getToken)
  const [reloadKey, setReloadKey] = React.useState(0)

  React.useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  React.useEffect(() => {
    if (!path) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    const load = async () => {
      try {
        const token = await getTokenRef.current()
        if (!token) throw new Error("Please sign in again")
        const res = await apiClient.get(path, { headers: { Authorization: `Bearer ${token}` } })
        if (!cancelled) setData((res.data?.data || res.data) as T)
      } catch (err) {
        if (!cancelled) setError(errorMessage(err, fallbackError))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [path, fallbackError, reloadKey])

  const reload = React.useCallback(() => setReloadKey((key) => key + 1), [])
  return { data, loading, error, reload }
}

export interface ShadowDraftFilters {
  status?: string
  channel?: string
  sort?: "newest" | "oldest"
  page?: number
  limit?: number
}

export function shadowDraftQuery(filters: ShadowDraftFilters): string {
  const params = new URLSearchParams()
  if (filters.status) params.set("status", filters.status)
  if (filters.channel) params.set("channel", filters.channel)
  if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort)
  if (filters.page && filters.page > 1) params.set("page", String(filters.page))
  if (filters.limit) params.set("limit", String(filters.limit))
  const query = params.toString()
  return query ? `?${query}` : ""
}

export function useShadowDraftList(getToken: GetToken, filters: ShadowDraftFilters, enabled = true) {
  const path = enabled ? `/api/crm/ai-shadow-drafts${shadowDraftQuery(filters)}` : null
  return useReadOnlyResource<ShadowDraftPage>(getToken, path, "Could not load shadow drafts")
}

export function useShadowDraft(getToken: GetToken, id: string | null) {
  const path = id ? `/api/crm/ai-shadow-drafts/${encodeURIComponent(id)}` : null
  return useReadOnlyResource<ShadowDraftDetail>(getToken, path, "Could not load this shadow draft")
}

export function useShadowDraftUsage(getToken: GetToken, days: number, enabled = true) {
  const path = enabled ? `/api/crm/ai-shadow-drafts/usage?days=${days}` : null
  return useReadOnlyResource<ShadowUsageReport>(getToken, path, "Could not load usage")
}

export function useAiModeHistory(getToken: GetToken, page: number, channel: string, enabled = true) {
  const params = new URLSearchParams()
  if (page > 1) params.set("page", String(page))
  if (channel) params.set("channel", channel)
  const query = params.toString()
  const path = enabled ? `/api/crm/ai-modes/history${query ? `?${query}` : ""}` : null
  return useReadOnlyResource<AiChangeHistoryPage>(getToken, path, "Could not load change history")
}

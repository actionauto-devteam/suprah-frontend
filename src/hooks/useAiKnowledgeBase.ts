"use client"

import * as React from "react"
import { apiClient } from "@/lib/api-client"
import type {
  KbAuditPage,
  KbAuditRow,
  KbAvailability,
  KbEntryDetail,
  KbEntryPage,
  KbIssue,
  KbLocation,
  KbVersion,
  KbVersionSummary,
  VerifiedDetail,
  VerifiedDetailView,
} from "@/lib/aiKnowledgeBase"

type GetToken = () => Promise<string | null>

export const KB_BASE = "/api/crm/knowledge-base"

export function knowledgeErrorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
  return message || fallback
}

export function knowledgeErrorIssues(err: unknown): KbIssue[] {
  const issues = (err as { response?: { data?: { errors?: KbIssue[] } } })?.response?.data?.errors
  return Array.isArray(issues) ? issues : []
}

export function knowledgeErrorStatus(err: unknown): number | null {
  return (err as { response?: { status?: number } })?.response?.status ?? null
}

function useKnowledgeResource<T>(getToken: GetToken, path: string | null, fallbackError: string) {
  const [data, setData] = React.useState<T | null>(null)
  const [loading, setLoading] = React.useState(Boolean(path))
  const [error, setError] = React.useState<string | null>(null)
  const [reloadKey, setReloadKey] = React.useState(0)
  const getTokenRef = React.useRef(getToken)

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
        if (!cancelled) setData((res.data?.data ?? res.data) as T)
      } catch (err) {
        if (!cancelled) setError(knowledgeErrorMessage(err, fallbackError))
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
  return { data, setData, loading, error, reload }
}

export function useKnowledgeStatus(getToken: GetToken) {
  return useKnowledgeResource<KbAvailability>(getToken, `${KB_BASE}/status`, "Could not load the Knowledge Base status")
}

export function useKnowledgeLocations(getToken: GetToken, enabled: boolean) {
  return useKnowledgeResource<KbLocation[]>(getToken, enabled ? `${KB_BASE}/locations` : null, "Could not load locations")
}

export interface KbEntryFilters {
  q?: string
  status?: string
  lifecycle?: string
  kind?: string
  topic?: string
  locationId?: string
  needsReapproval?: boolean
  page?: number
}

export function useKnowledgeEntries(getToken: GetToken, filters: KbEntryFilters, enabled: boolean, refreshKey = 0) {
  const params = new URLSearchParams()
  for (const key of ["q", "status", "lifecycle", "kind", "topic", "locationId"] as const) {
    const value = filters[key]
    if (value) params.set(key, value)
  }
  if (filters.needsReapproval) params.set("needsReapproval", "true")
  if (filters.page && filters.page > 1) params.set("page", String(filters.page))
  params.set("limit", "20")
  params.set("refresh", String(refreshKey))
  return useKnowledgeResource<KbEntryPage>(getToken, enabled ? `${KB_BASE}/entries?${params.toString()}` : null, "Could not load Knowledge Base entries")
}

export function useKnowledgeEntry(getToken: GetToken, id: string | null, refreshKey = 0) {
  const path = id ? `${KB_BASE}/entries/${encodeURIComponent(id)}?refresh=${refreshKey}` : null
  return useKnowledgeResource<KbEntryDetail>(getToken, path, "Could not load this entry")
}

export function useKnowledgeVersions(getToken: GetToken, id: string | null, refreshKey = 0) {
  const path = id ? `${KB_BASE}/entries/${encodeURIComponent(id)}/versions?refresh=${refreshKey}` : null
  return useKnowledgeResource<KbVersionSummary[]>(getToken, path, "Could not load the version history")
}

export function useKnowledgeVersion(getToken: GetToken, id: string | null, version: number | null) {
  const path = id && version ? `${KB_BASE}/entries/${encodeURIComponent(id)}/versions/${version}` : null
  return useKnowledgeResource<KbVersion>(getToken, path, "Could not load this version")
}

export function useKnowledgeEntryAudit(getToken: GetToken, id: string | null, refreshKey = 0) {
  const path = id ? `${KB_BASE}/entries/${encodeURIComponent(id)}/audit?refresh=${refreshKey}` : null
  return useKnowledgeResource<KbAuditRow[]>(getToken, path, "Could not load the history")
}

export function useKnowledgeAudit(getToken: GetToken, page: number, enabled: boolean, refreshKey = 0) {
  const path = enabled ? `${KB_BASE}/audit?page=${page}&limit=25&refresh=${refreshKey}` : null
  return useKnowledgeResource<KbAuditPage>(getToken, path, "Could not load the Knowledge Base history")
}

export function useVerifiedDetails(getToken: GetToken, filters: { kind?: string; status?: string }, enabled: boolean, refreshKey = 0) {
  const params = new URLSearchParams()
  if (filters.kind) params.set("kind", filters.kind)
  if (filters.status) params.set("status", filters.status)
  params.set("refresh", String(refreshKey))
  return useKnowledgeResource<VerifiedDetail[]>(getToken, enabled ? `${KB_BASE}/verified-details?${params.toString()}` : null, "Could not load verified contacts and programs")
}

export function useVerifiedDetail(getToken: GetToken, id: string | null, refreshKey = 0) {
  const path = id ? `${KB_BASE}/verified-details/${encodeURIComponent(id)}?refresh=${refreshKey}` : null
  return useKnowledgeResource<VerifiedDetailView>(getToken, path, "Could not load this verified detail")
}

export async function knowledgeRequest<T>(
  getToken: GetToken,
  method: "post" | "put" | "patch",
  path: string,
  body: Record<string, unknown> = {},
): Promise<T> {
  const token = await getToken()
  const res = await apiClient[method](`${KB_BASE}${path}`, body, { headers: { Authorization: `Bearer ${token}` } })
  return (res.data?.data ?? res.data) as T
}

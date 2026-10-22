"use client"

import * as React from "react"
import { apiClient } from "@/lib/api-client"
import type { CrmLocation, CrmLocationHistoryEntry, CrmLocationList, CrmLocationSuggestion } from "@/lib/crmLocations"

type GetToken = () => Promise<string | null>

export function locationErrorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
  return message || fallback
}

function useLocationResource<T>(getToken: GetToken, path: string | null, fallbackError: string) {
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
        if (!cancelled) setData((res.data?.data || res.data) as T)
      } catch (err) {
        if (!cancelled) setError(locationErrorMessage(err, fallbackError))
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

export function useCrmLocations(getToken: GetToken, status: "active" | "archived" | "all", enabled = true) {
  return useLocationResource<CrmLocationList>(getToken, enabled ? `/api/crm/locations?status=${status}` : null, "Could not load locations")
}

export function useCrmLocationSuggestions(getToken: GetToken, enabled = true) {
  return useLocationResource<{ suggestions: CrmLocationSuggestion[] }>(getToken, enabled ? "/api/crm/locations/suggestions" : null, "Could not load location labels")
}

export function useCrmLocation(getToken: GetToken, id: string | null) {
  const path = id ? `/api/crm/locations/${encodeURIComponent(id)}` : null
  return useLocationResource<{ location: CrmLocation; history: CrmLocationHistoryEntry[] }>(getToken, path, "Could not load this location")
}

export async function locationRequest<T>(getToken: GetToken, method: "post" | "patch", path: string, body: Record<string, unknown> = {}): Promise<T> {
  const token = await getToken()
  const res = await apiClient[method](path, body, { headers: { Authorization: `Bearer ${token}` } })
  return (res.data?.data || res.data) as T
}

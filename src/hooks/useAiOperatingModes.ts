"use client"

import * as React from "react"
import { apiClient } from "@/lib/api-client"
import { initializeSocket } from "@/lib/socket.client"
import type { AiModesPayload } from "@/lib/aiOperatingModes"

export function useAiOperatingModes(getToken: () => Promise<string | null>) {
  const [data, setData] = React.useState<AiModesPayload | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const getTokenRef = React.useRef(getToken)

  React.useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  const refresh = React.useCallback(async () => {
    try {
      const token = await getTokenRef.current()
      if (!token) return
      const res = await apiClient.get("/api/crm/ai-modes", { headers: { Authorization: `Bearer ${token}` } })
      setData((res.data?.data || res.data) as AiModesPayload)
      setError(null)
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(message || "Could not load AI operating modes")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  React.useEffect(() => {
    let socket: ReturnType<typeof initializeSocket> | null = null
    let cancelled = false
    const handleUpdate = () => {
      void refresh()
    }
    const setup = async () => {
      const token = await getTokenRef.current()
      if (!token || cancelled) return
      socket = initializeSocket(token)
      socket.on("ai:modes_updated", handleUpdate)
    }
    void setup()
    return () => {
      cancelled = true
      if (socket) socket.off("ai:modes_updated", handleUpdate)
    }
  }, [refresh])

  return { data, setData, loading, error, refresh }
}

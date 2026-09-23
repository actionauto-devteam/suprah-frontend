"use client"

import * as React from "react"
import { apiClient } from "@/lib/api-client"
import { getSocket } from "@/lib/socket.client"

export type TimelineChannel = "sms" | "call" | "email" | "webchat" | "appointment" | "note"

export interface CustomerTimelineItem {
  id: string
  channel: TimelineChannel
  direction?: "inbound" | "outbound" | "system"
  title: string
  body?: string
  status?: string
  actor?: string
  occurredAt: string
  metadata?: Record<string, unknown>
}

interface TimelineResponse {
  items: CustomerTimelineItem[]
  nextCursor: string | null
  hasMore: boolean
  unavailableSources: string[]
}

function mergeItems(current: CustomerTimelineItem[], incoming: CustomerTimelineItem[]) {
  const merged = new Map(current.map((item) => [item.id, item]))
  for (const item of incoming) merged.set(item.id, item)
  return Array.from(merged.values()).sort((a, b) => {
    const byTime = new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    return byTime || b.id.localeCompare(a.id)
  })
}

function centralEmailItems(messages: Array<Record<string, unknown>>): CustomerTimelineItem[] {
  return messages.map((message) => {
    const id = String(message._id || message.id || message.messageId || "")
    const direction: "inbound" | "outbound" = message.direction === "outbound" || message.isOwn ? "outbound" : "inbound"
    return {
      id: `central-email:${id}`,
      channel: "email" as const,
      direction,
      title: direction === "inbound" ? "Email received" : "Email sent",
      body: String(message.body || message.message || message.content || ""),
      status: "sent",
      actor: String(message.senderName || message.sender || message.senderEmail || (direction === "outbound" ? "Team member" : "Customer")),
      occurredAt: String(message.createdAt || message.timestamp || new Date().toISOString()),
    }
  }).filter((item) => item.id !== "central-email:")
}

export function useCustomerTimeline(leadId: string | undefined, enabled = true) {
  const [items, setItems] = React.useState<CustomerTimelineItem[]>([])
  const [loading, setLoading] = React.useState(false)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const [error, setError] = React.useState("")
  const [hasMore, setHasMore] = React.useState(false)
  const [unavailableSources, setUnavailableSources] = React.useState<string[]>([])
  const requestId = React.useRef(0)
  const nextCursorRef = React.useRef<string | null>(null)

  const load = React.useCallback(async (append = false) => {
    if (!leadId || !enabled) return
    const id = ++requestId.current
    if (append) setLoadingMore(true)
    else setLoading(true)
    setError("")

    try {
      const params = append && nextCursorRef.current ? { before: nextCursorRef.current, limit: 30 } : { limit: 30 }
      const timelineRequest = apiClient.get(`/api/crm/communications/leads/${leadId}/timeline`, { params })
      const emailRequest = append ? Promise.resolve(null) : apiClient.get(`/api/leads/${leadId}/thread`).catch(() => null)
      const [timelineResult, emailResult] = await Promise.all([timelineRequest, emailRequest])
      if (id !== requestId.current) return

      const payload = (timelineResult.data?.data || timelineResult.data) as TimelineResponse
      const threadPayload = emailResult?.data?.data || emailResult?.data
      const incoming = mergeItems(payload.items || [], centralEmailItems(threadPayload?.messages || []))
      setItems((current) => append ? mergeItems(current, incoming) : incoming)
      nextCursorRef.current = payload.nextCursor || null
      setHasMore(Boolean(payload.hasMore))
      setUnavailableSources(payload.unavailableSources || [])
    } catch {
      if (id === requestId.current) setError("Customer activity is temporarily unavailable.")
    } finally {
      if (id === requestId.current) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [enabled, leadId])

  React.useEffect(() => {
    setItems([])
    nextCursorRef.current = null
    setHasMore(false)
    setUnavailableSources([])
    if (enabled && leadId) void load(false)
  }, [enabled, leadId, load])

  React.useEffect(() => {
    if (!enabled || !leadId) return
    const socket = getSocket()
    let timer: number | undefined
    const refresh = (payload?: Record<string, unknown>) => {
      const eventLeadId = payload?.leadId || (payload?.message as Record<string, unknown> | undefined)?.leadId || (payload?.call as Record<string, unknown> | undefined)?.leadId
      if (eventLeadId && String(eventLeadId) !== leadId) return
      if (timer) window.clearTimeout(timer)
      timer = window.setTimeout(() => void load(false), 350)
    }
    const events = ["comm:message:new", "comm:message:status", "comm:call:incoming", "comm:call:update", "webchat:message", "appointment:status_updated", "lead:update"]
    for (const event of events) socket?.on(event, refresh)
    const interval = window.setInterval(() => void load(false), 30000)
    const refreshOnline = () => refresh()
    window.addEventListener("online", refreshOnline)

    return () => {
      if (timer) window.clearTimeout(timer)
      window.clearInterval(interval)
      window.removeEventListener("online", refreshOnline)
      for (const event of events) socket?.off(event, refresh)
    }
  }, [enabled, leadId, load])

  return { items, loading, loadingMore, error, hasMore, unavailableSources, loadMore: () => load(true), refetch: () => load(false) }
}

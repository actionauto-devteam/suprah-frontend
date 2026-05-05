'use client'

/**
 * hooks/useSupraLeoChat.ts
 * Persistent streaming chat hook for the Supra Leo / Autrix AI full-screen page.
 * Handles SSE streaming, history loading, pagination, and abort control.
 */

import { useState, useRef, useCallback, useEffect } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChatModule =
  | 'general'
  | 'appointments'
  | 'timeproof'
  | 'supraspace'
  | 'biometrics'
  | 'feeds'

export interface ChatMessage {
  _id?: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
  createdAt: string | Date
  module?: ChatModule
}

interface UseSupraLeoChatOptions {
  module: ChatModule
  autoLoadHistory?: boolean
}

interface UseSupraLeoChatReturn {
  messages: ChatMessage[]
  isLoading: boolean
  isLoadingHistory: boolean
  hasMore: boolean
  error: string | null
  sendMessage: (text: string) => Promise<void>
  stopGeneration: () => void
  clearHistory: () => Promise<void>
  loadMoreHistory: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToken(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('crm_token') || ''
}

function apiUrl(path: string): string {
  const base =
    typeof window !== 'undefined'
      ? (window as any).__NEXT_DATA__?.runtimeConfig?.NEXT_PUBLIC_API_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        ''
      : process.env.NEXT_PUBLIC_API_URL || ''
  return `${base}${path}`
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSupraLeoChat({
  module,
  autoLoadHistory = false,
}: UseSupraLeoChatOptions): UseSupraLeoChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const abortRef = useRef<AbortController | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // ── Load history ────────────────────────────────────────────────────────────
  const loadHistory = useCallback(async (pageNum = 1, append = false) => {
    const token = getToken()
    if (!token) return

    if (!append) setIsLoadingHistory(true)

    try {
      const res = await fetch(
        apiUrl(`/api/supraleo/chat/history?page=${pageNum}&limit=50`),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (!res.ok) throw new Error('Failed to load history')

      const data = await res.json()
      const rawMessages: any[] = data?.data?.messages || []

      const msgs: ChatMessage[] = rawMessages.map((m: any) => ({
        _id: m._id || `hist-${Math.random()}`,
        role: m.role as 'user' | 'assistant',
        content: m.content || '',
        streaming: false,
        createdAt: m.createdAt || new Date().toISOString(),
        module: m.module,
      }))

      if (!isMountedRef.current) return

      // History is returned in reverse order (newest first), so reverse it back
      const ordered = [...msgs].reverse()

      setMessages(prev => (append ? [...ordered, ...prev] : ordered))
      setHasMore(data?.data?.hasMore || false)
    } catch {
      // Silently ignore history load errors — don't block the chat
    } finally {
      if (isMountedRef.current) setIsLoadingHistory(false)
    }
  }, [])

  // Auto-load history on mount
  useEffect(() => {
    if (autoLoadHistory) {
      loadHistory(1, false)
    }
  }, [autoLoadHistory, loadHistory])

  // ── Send message ────────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isLoading) return

      setError(null)

      const now = new Date().toISOString()
      const userMsgId = `user-${Date.now()}`
      const assistantMsgId = `assistant-${Date.now()}`

      const userMsg: ChatMessage = {
        _id: userMsgId,
        role: 'user',
        content: trimmed,
        streaming: false,
        createdAt: now,
        module,
      }

      const assistantMsg: ChatMessage = {
        _id: assistantMsgId,
        role: 'assistant',
        content: '',
        streaming: true,
        createdAt: now,
        module,
      }

      setMessages(prev => [...prev, userMsg, assistantMsg])
      setIsLoading(true)

      try {
        abortRef.current?.abort()
        abortRef.current = new AbortController()
        const token = getToken()

        const res = await fetch(apiUrl('/api/supraleo/chat'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: trimmed,
            module,
            stream: true,
          }),
          signal: abortRef.current.signal,
        })

        if (!res.ok || !res.body) {
          let errMsg = `Server error (${res.status})`
          try {
            const errData = await res.json()
            errMsg = errData?.message || errMsg
          } catch {
            // ignore parse error
          }
          throw new Error(errMsg)
        }

        // ── SSE streaming reader ──
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Process complete lines from buffer
          const lines = buffer.split('\n')
          // Keep the last incomplete line in buffer
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            const trimmedLine = line.trim()
            if (!trimmedLine.startsWith('data: ')) continue

            const raw = trimmedLine.slice(6).trim()
            if (!raw || raw === '[DONE]') continue

            try {
              const parsed = JSON.parse(raw)

              if (parsed.type === 'delta' && parsed.text) {
                accumulated += parsed.text
                if (isMountedRef.current) {
                  setMessages(prev =>
                    prev.map(m =>
                      m._id === assistantMsgId
                        ? { ...m, content: accumulated }
                        : m
                    )
                  )
                }
              } else if (parsed.type === 'done') {
                if (isMountedRef.current) {
                  setMessages(prev =>
                    prev.map(m =>
                      m._id === assistantMsgId
                        ? { ...m, streaming: false }
                        : m
                    )
                  )
                }
              } else if (parsed.type === 'error') {
                throw new Error(parsed.message || 'AI generation error')
              }
            } catch (parseErr) {
              // Ignore JSON parse errors on incomplete SSE chunks
              if (parseErr instanceof SyntaxError) continue
              throw parseErr
            }
          }
        }

        // Guarantee streaming is stopped even if 'done' event was missed
        if (isMountedRef.current) {
          setMessages(prev =>
            prev.map(m =>
              m._id === assistantMsgId ? { ...m, streaming: false } : m
            )
          )
        }
      } catch (err: any) {
        if (!isMountedRef.current) return

        if (err.name === 'AbortError') {
          // User stopped generation — just stop the spinner
          setMessages(prev =>
            prev.map(m =>
              m._id === assistantMsgId ? { ...m, streaming: false } : m
            )
          )
        } else {
          const errMsg = err.message || 'Something went wrong. Please try again.'
          setError(errMsg)
          setMessages(prev =>
            prev.map(m =>
              m._id === assistantMsgId
                ? { ...m, content: errMsg, streaming: false }
                : m
            )
          )
        }
      } finally {
        if (isMountedRef.current) setIsLoading(false)
      }
    },
    [module, isLoading]
  )

  // ── Stop generation ─────────────────────────────────────────────────────────
  const stopGeneration = useCallback(() => {
    abortRef.current?.abort()
    setIsLoading(false)
    setMessages(prev =>
      prev.map(m => (m.streaming ? { ...m, streaming: false } : m))
    )
  }, [])

  // ── Clear history ───────────────────────────────────────────────────────────
  const clearHistory = useCallback(async () => {
    const token = getToken()
    try {
      const res = await fetch(apiUrl('/api/supraleo/chat/history'), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to clear history')
      if (isMountedRef.current) {
        setMessages([])
        setHasMore(false)
        setCurrentPage(1)
        setError(null)
      }
    } catch (e: any) {
      if (isMountedRef.current) {
        setError(e?.message || 'Failed to clear history')
      }
    }
  }, [])

  // ── Load more (pagination) ──────────────────────────────────────────────────
  const loadMoreHistory = useCallback(() => {
    const next = currentPage + 1
    setCurrentPage(next)
    loadHistory(next, true)
  }, [currentPage, loadHistory])

  return {
    messages,
    isLoading,
    isLoadingHistory,
    hasMore,
    error,
    sendMessage,
    stopGeneration,
    clearHistory,
    loadMoreHistory,
  }
}

export default useSupraLeoChat
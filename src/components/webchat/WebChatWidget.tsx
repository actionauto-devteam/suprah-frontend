"use client"

import * as React from "react"
import { ArrowLeft, CheckCircle2, ChevronRight, ExternalLink, Loader2, MessageCircle, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  getWebchatConfig,
  sendWebChatMessage,
  startWebChat,
  syncWebChat,
  type StartWebChatPayload,
  type StartWebChatResult,
  type WebChatConfig,
  type WebChatVisitorMessage,
} from "@/lib/api/webchat"

const STORAGE_PREFIX = "suprah-webchat:"
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000
const OPEN_POLL_MS = 4000
const CLOSED_POLL_MS = 20000
const MAX_LENGTH = 1000
const TEXT_US_MESSAGE_LENGTH = 900
const DEFAULT_ERROR = "Something went wrong. Please try again."
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TEXT_US_INK = "text-[oklch(0.15_0.02_269.18)]"
const TEXT_US_GREETING = "Enter your information, and our team will get back to you shortly."
const TEXT_US_NO_MESSAGE = "Sent the Text Us form without a message."

function readableInk(hex: string) {
  const value = hex.replace("#", "")
  const channel = (start: number) => {
    const c = parseInt(value.slice(start, start + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4)
  return luminance > 0.35 ? "#080b14" : "#ffffff"
}

function locationKey(value?: string) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

interface StoredSession {
  sessionId: string
  token: string
  savedAt: number
  byText?: boolean
  textedTo?: string | null
}

interface WebChatWidgetProps {
  vehicleId?: string
  orgKey?: string
  contextLabel?: string
  /** True when rendered inside the /embed/chat iframe on an external site.
   *  Fills its container instead of self-positioning with `fixed`, and
   *  reports its own pixel size to the parent page so the loader script can
   *  resize the iframe to match (closed bubble vs. open panel). */
  embedMode?: boolean
  /** The customer portal: who is chatting, so they aren't asked again. */
  prefill?: { name?: string; email?: string; phone?: string }
  /** The panel's title, e.g. "Chat with Anna" (defaults to "Chat with us"). */
  title?: string
  /** The customer portal's draggable launcher (see useDraggableWidget). */
  launcher?: {
    setNode: (node: HTMLButtonElement | null) => void
    style: React.CSSProperties
    handleProps: { onPointerDown: React.PointerEventHandler; onClickCapture: React.MouseEventHandler; style: React.CSSProperties }
    /** Where it sits before the customer moves it. */
    className?: string
  }
  textUs?: boolean
  defaultLocation?: string
  pageLauncher?: boolean
}

function postToParent(message: Record<string, unknown>) {
  if (typeof window === "undefined" || window.parent === window) return
  window.parent.postMessage(message, "*")
}

function postEmbedState(open: boolean) {
  postToParent({ type: "suprah-webchat:resize", open })
}

function TextUsField({ id, label, ...props }: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="group">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground transition-colors group-focus-within:text-foreground">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className="mt-1 block w-full rounded-none border-0 border-b border-input bg-transparent px-0 py-1 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:shadow-[0_1px_0_0_var(--color-primary)]"
      />
    </div>
  )
}

function readSession(key: string): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredSession
    if (!parsed?.sessionId || !parsed?.token) return null
    if (Date.now() - parsed.savedAt > SESSION_TTL_MS) {
      window.localStorage.removeItem(key)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function writeSession(key: string, value: StoredSession | null) {
  try {
    if (value) window.localStorage.setItem(key, JSON.stringify(value))
    else window.localStorage.removeItem(key)
  } catch {
    return
  }
}

function getStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } })?.response?.status
}

function getErrorMessage(error: unknown, fallback: string): string {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback
  )
}

const START_RETRY_DELAYS_MS = [2000, 5000]

function startNotConfirmed(error: unknown): boolean {
  const status = getStatus(error)
  if (status === undefined) return true
  if (status === 502 || status === 503 || status === 504) return !getErrorMessage(error, "")
  return status === 409 && /already being processed/i.test(getErrorMessage(error, ""))
}

async function startWithRetry(payload: StartWebChatPayload, onRetry: () => void): Promise<StartWebChatResult> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await startWebChat(payload)
    } catch (error) {
      if (attempt >= START_RETRY_DELAYS_MS.length || !startNotConfirmed(error)) throw error
      onRetry()
      await new Promise((resolve) => window.setTimeout(resolve, START_RETRY_DELAYS_MS[attempt]))
    }
  }
}

function mergeMessages(current: WebChatVisitorMessage[], incoming: WebChatVisitorMessage[]) {
  const known = new Set(current.map((message) => message._id))
  const fresh = incoming.filter((message) => !known.has(message._id))
  if (fresh.length === 0) return current
  return [...current, ...fresh].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
}

function PoweredBySuprah({ className = "" }: { className?: string }) {
  return (
    <p className={`text-center text-[13px] text-muted-foreground ${className}`} data-testid="webchat-powered-by">
      <a
        href="https://www.suprah-app.com"
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-center gap-1 rounded-md px-1.5 py-1 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        title="Learn about Suprah (opens in a new tab)"
      >
        <span>Powered by</span>
        <span className="font-semibold text-[var(--color-primary)] underline decoration-2 underline-offset-[3px] group-hover:decoration-[3px]">Suprah</span>
        <ExternalLink className="h-3 w-3 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
      </a>
    </p>
  )
}

export function WebChatWidget({ vehicleId, orgKey, contextLabel, embedMode, prefill, title, launcher, textUs, defaultLocation, pageLauncher }: WebChatWidgetProps) {
  const storageKey = `${STORAGE_PREFIX}${orgKey ? `org:${orgKey}` : `vehicle:${vehicleId}`}`

  const [open, setOpen] = React.useState(false)
  const [session, setSession] = React.useState<StoredSession | null>(null)
  const [messages, setMessages] = React.useState<WebChatVisitorMessage[]>([])
  const [unread, setUnread] = React.useState(0)
  const [name, setName] = React.useState(prefill?.name?.trim() ?? "")
  const [contact, setContact] = React.useState(prefill?.email?.trim() || prefill?.phone?.trim() || "")
  // A signed-in customer isn't asked for their name and contact again.
  const knownVisitor = Boolean(prefill?.name?.trim() && (prefill?.email?.trim() || prefill?.phone?.trim()))
  const [draft, setDraft] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState("")
  const [config, setConfig] = React.useState<WebChatConfig | null>(null)
  const [staffTyping, setStaffTyping] = React.useState(false)
  const [notice, setNotice] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [location, setLocation] = React.useState("")
  const textMode = Boolean(config?.textMode) && !knownVisitor
  const textUsForm = Boolean(textUs) && !knownVisitor
  const locationOptions = React.useMemo(() => (textUsForm ? config?.locations ?? [] : []), [textUsForm, config])
  const panelTitle = title ?? (textUs ? "Text Us" : "Chat with us")
  const visitorFirstName = name.trim().split(/\s+/)[0]
  const showLocationStep = textUsForm && !session && locationOptions.length > 1 && !location
  const canChangeLocation = textUsForm && !session && locationOptions.length > 1 && Boolean(location)

  const listRef = React.useRef<HTMLDivElement | null>(null)
  const openRef = React.useRef(open)
  const messagesRef = React.useRef(messages)
  const clientRequestIdRef = React.useRef<string>("")
  if (!clientRequestIdRef.current) {
    clientRequestIdRef.current =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }

  React.useEffect(() => {
    openRef.current = open
    if (embedMode) postEmbedState(open)
  }, [open, embedMode])

  React.useEffect(() => {
    if (!pageLauncher) return
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) return
      if ((event.data as { type?: string } | null)?.type !== "suprah-webchat:open") return
      setOpen(true)
      setUnread(0)
    }
    window.addEventListener("message", onMessage)
    postToParent({ type: "suprah-webchat:ready" })
    return () => window.removeEventListener("message", onMessage)
  }, [pageLauncher])

  React.useEffect(() => {
    if (pageLauncher) postToParent({ type: "suprah-webchat:unread", count: unread })
  }, [unread, pageLauncher])

  const themeColor = config?.color && /^#[0-9a-f]{6}$/i.test(config.color) ? config.color : ""
  const themeInk = themeColor ? readableInk(themeColor) : ""
  const themeStyle = themeColor
    ? ({ "--primary": themeColor, "--color-primary": themeColor, "--primary-foreground": themeInk, "--color-primary-foreground": themeInk, "--ring": themeColor, "--color-ring": themeColor } as React.CSSProperties)
    : undefined

  React.useEffect(() => {
    if (pageLauncher && themeColor) postToParent({ type: "suprah-webchat:theme", color: themeColor, ink: themeInk })
  }, [pageLauncher, themeColor, themeInk])

  React.useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  React.useEffect(() => {
    setSession(readSession(storageKey))
  }, [storageKey])

  React.useEffect(() => {
    let cancelled = false
    void getWebchatConfig(vehicleId, orgKey).then((result) => {
      if (!cancelled) setConfig(result)
    }).catch(() => {
      if (!cancelled) setConfig({ enabled: true, greeting: "", withinHours: true })
    })
    return () => {
      cancelled = true
    }
  }, [vehicleId, orgKey])

  React.useEffect(() => {
    if (locationOptions.length === 0) return
    setLocation((current) => {
      if (current && locationOptions.includes(current)) return current
      if (locationOptions.length === 1) return locationOptions[0]
      const wanted = locationKey(defaultLocation)
      if (!wanted) return ""
      const exact = locationOptions.find((option) => locationKey(option) === wanted)
      if (exact) return exact
      const wantedWords = wanted.split(" ")
      const partial = locationOptions.filter((option) => {
        const words = locationKey(option).split(" ")
        return wantedWords.every((word) => words.includes(word))
      })
      return partial.length === 1 ? partial[0] : ""
    })
  }, [locationOptions, defaultLocation])

  React.useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, open])

  const endSession = React.useCallback(
    (notice: string) => {
      writeSession(storageKey, null)
      setSession(null)
      setMessages([])
      setUnread(0)
      setError(notice)
    },
    [storageKey],
  )

  React.useEffect(() => {
    if (!session || session.byText) return

    let cancelled = false
    let timer: number | undefined

    const tick = async () => {
      if (cancelled) return

      if (!document.hidden) {
        try {
          const last = messagesRef.current[messagesRef.current.length - 1]
          const after = last
            ? new Date(new Date(last.createdAt).getTime() - 1000).toISOString()
            : undefined
          const result = await syncWebChat(session.sessionId, session.token, after)
          if (cancelled) return

          if (result.continuedByText) {
            const next: StoredSession = { ...session, byText: true, textedTo: result.textedTo }
            writeSession(storageKey, next)
            setSession(next)
            return
          }

          setStaffTyping(result.staffTyping)
          const known = new Set(messagesRef.current.map((message) => message._id))
          const fresh = result.messages.filter((message) => !known.has(message._id))
          if (fresh.length > 0) {
            setMessages((previous) => mergeMessages(previous, fresh))
            if (!openRef.current) {
              setUnread((count) => count + fresh.filter((message) => !message.fromVisitor).length)
            }
          }
        } catch (err) {
          if (getStatus(err) === 404) {
            endSession("Your previous chat has ended. Send a message to start a new one.")
            return
          }
        }
      }

      timer = window.setTimeout(tick, openRef.current ? OPEN_POLL_MS : CLOSED_POLL_MS)
    }

    void tick()

    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [session, endSession, storageKey])

  const handleOpen = () => {
    setOpen(true)
    setUnread(0)
  }

  const handleStart = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy) return

    const trimmedName = name.trim().replace(/\s+/g, " ")
    const trimmedContact = contact.trim()
    const text = draft.trim()
    const trimmedEmail = email.trim()

    if (textUsForm) {
      if (!trimmedName) {
        setError("Please add your name.")
        return
      }
      if (trimmedContact && trimmedContact.replace(/\D/g, "").length < 10) {
        setError("Please enter your mobile number with the area code.")
        return
      }
      if (trimmedEmail && !EMAIL_PATTERN.test(trimmedEmail)) {
        setError("Please enter a valid email address.")
        return
      }
      if (!trimmedContact && !trimmedEmail && !text) {
        setError("Please add your mobile number, your email, or a message.")
        return
      }
      if (locationOptions.length > 0 && !location) {
        setError("Please choose a location.")
        return
      }
    } else if (!trimmedName || !trimmedContact || !text) {
      setError(
        knownVisitor
          ? "Type your message, then send it."
          : textMode
            ? "Please add your name, your mobile number, and a message."
            : "Please add your name, a phone number or email, and a message.",
      )
      return
    }
    if (!textUsForm && textMode && trimmedContact.replace(/\D/g, "").length < 10) {
      setError("Please enter your mobile number with the area code, so we can text you.")
      return
    }

    setBusy(true)
    setError("")
    setNotice("")

    try {
      const isEmail = !textUsForm && !textMode && trimmedContact.includes("@")
      const [givenName, ...otherNames] = trimmedName.split(" ")
      const result = await startWithRetry({
        vehicleId,
        orgKey,
        name: trimmedName,
        ...(textUsForm
          ? {
              firstName: givenName,
              lastName: otherNames.join(" "),
              phone: trimmedContact || undefined,
              email: trimmedEmail || undefined,
              location: location || undefined,
            }
          : {
              email: isEmail ? trimmedContact : undefined,
              phone: isEmail ? undefined : trimmedContact,
            }),
        message: text,
        pageUrl: window.location.href,
        clientRequestId: clientRequestIdRef.current,
        ...(textMode ? { continueByText: true } : {}),
      }, () => setNotice("Still sending your message…"))

      const stored: StoredSession = {
        sessionId: result.sessionId,
        token: result.token,
        savedAt: Date.now(),
        ...(result.continuedByText ? { byText: true, textedTo: result.textedTo || null } : {}),
      }
      writeSession(storageKey, stored)
      setMessages(result.messages)
      setSession(stored)
      setDraft("")
      setNotice(result.textNotice || "")
    } catch (err) {
      setNotice("")
      setError(
        startNotConfirmed(err)
          ? textMode && trimmedContact
            ? "We couldn't confirm your message went through. Please check your phone for our text before you send it again."
            : "We couldn't confirm your message went through. Please wait a moment, then try again."
          : getErrorMessage(err, "We couldn't start the chat. Please try again."),
      )
    } finally {
      setBusy(false)
    }
  }

  const handleSend = async () => {
    const text = draft.trim()
    if (!session || !text || busy) return

    setBusy(true)
    setError("")

    try {
      const sent = await sendWebChatMessage(session.sessionId, session.token, text)
      if (sent.session?.sessionId && sent.session?.token) {
        const next: StoredSession = {
          sessionId: sent.session.sessionId,
          token: sent.session.token,
          savedAt: Date.now(),
        }
        writeSession(storageKey, next)
        setSession(next)
      }
      setMessages((previous) => mergeMessages(previous, [sent.message]))
      setDraft("")
    } catch (err) {
      if (getStatus(err) === 404) {
        endSession("Your previous chat has ended. Send a message to start a new one.")
      } else {
        setError(getErrorMessage(err, DEFAULT_ERROR))
      }
    } finally {
      setBusy(false)
    }
  }

  if (!vehicleId && !orgKey) return null
  if (config?.enabled === false) return null

  if (!open) {
    if (pageLauncher) return null
    const bubble = (
      <button
        type="button"
        ref={launcher?.setNode}
        onClick={handleOpen}
        onPointerDown={launcher?.handleProps.onPointerDown}
        onClickCapture={launcher?.handleProps.onClickCapture}
        aria-label={textUs ? "Text Us" : title ? `Open ${title.charAt(0).toLowerCase()}${title.slice(1)}` : "Open chat"}
        title={title}
        className={cn(
          "flex h-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          textUs ? "gap-2 px-5 text-sm font-semibold whitespace-nowrap" : "w-14",
          embedMode ? "relative" : launcher?.className ?? "fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6",
        )}
        style={
          embedMode
            ? themeColor ? { ...themeStyle, background: themeColor, color: themeInk } : undefined
            : { marginBottom: "env(safe-area-inset-bottom)", ...launcher?.handleProps.style, ...launcher?.style, ...(themeColor ? { ...themeStyle, background: themeColor, color: themeInk } : {}) }
        }
      >
        <MessageCircle className={textUs ? "h-5 w-5" : "h-6 w-6"} />
        {textUs && <span>Text Us</span>}
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    )
    return embedMode && textUs ? (
      <div className="fixed inset-0 flex items-center justify-center">{bubble}</div>
    ) : (
      bubble
    )
  }

  return (
    <div
      role="dialog"
      aria-label={panelTitle}
      style={themeStyle}
      className={cn(
        "flex flex-col bg-background",
        textUs && "overflow-hidden text-foreground",
        embedMode
          ? pageLauncher
            ? "fixed inset-0 sm:rounded-2xl"
            : "fixed inset-0 sm:rounded-2xl sm:border sm:shadow-2xl"
          : cn(
              "fixed inset-0 z-50 sm:inset-auto sm:bottom-6 sm:right-6 sm:max-h-[calc(100dvh-3rem)] sm:w-96 sm:rounded-2xl sm:border sm:shadow-2xl",
              textUs ? "sm:h-[37rem]" : "sm:h-[34rem]",
            ),
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between bg-primary py-3 sm:rounded-t-2xl",
          textUs ? cn("gap-2 px-3", TEXT_US_INK) : "gap-3 px-4 text-primary-foreground",
        )}
        style={themeColor ? { background: themeColor, color: themeInk } : undefined}
      >
        {canChangeLocation && (
          <button
            type="button"
            onClick={() => {
              setLocation("")
              setError("")
            }}
            aria-label="Choose a different location"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-black/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className={cn("min-w-0", textUs && "flex-1", textUs && !canChangeLocation && "pl-1")}>
          <p className="text-sm font-semibold leading-tight">{panelTitle}</p>
          <p className={cn("truncate text-xs", textUs ? "opacity-75" : "opacity-80")}>
            {contextLabel
              ? `About the ${contextLabel}`
              : textUs
                ? showLocationStep
                  ? "Choose a location"
                  : location || config?.dealershipName || "We'll text you back"
                : "Ask us anything"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close chat"
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition focus:outline-none focus-visible:ring-2",
            textUs ? "hover:bg-black/10 focus-visible:ring-current" : "hover:bg-white/15 focus-visible:ring-white",
          )}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {session?.byText ? (
        <div
          className="flex flex-1 flex-col items-center justify-center gap-3 overflow-y-auto p-6 text-center"
          style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
          data-testid="webchat-texted"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <p className="text-base font-semibold" role="status">
            {visitorFirstName ? `Thanks, ${visitorFirstName}!` : "Thanks!"} We just texted you.
          </p>
          <p className="text-sm text-muted-foreground">
            We sent a text to {session.textedTo || "your phone"}. Reply to it to keep chatting with us.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-2"
            onClick={() => {
              writeSession(storageKey, null)
              setSession(null)
              setMessages([])
              setError("")
              setNotice("")
              clientRequestIdRef.current =
                typeof crypto !== "undefined" && "randomUUID" in crypto
                  ? crypto.randomUUID()
                  : `${Date.now()}-${Math.random().toString(36).slice(2)}`
            }}
          >
            Send another message
          </Button>
          <PoweredBySuprah className="mt-2" />
        </div>
      ) : session ? (
        <>
          <div
            ref={listRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
            aria-live="polite"
          >
            {notice && (
              <p className="rounded-lg bg-muted px-3 py-2 text-center text-xs text-muted-foreground" role="status">
                {notice}
              </p>
            )}
            {messages.filter((message) => !(message.fromVisitor && message.body === TEXT_US_NO_MESSAGE)).map((message) => (
              <div
                key={message._id}
                className={cn("flex", message.fromVisitor ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm [overflow-wrap:anywhere]",
                    message.fromVisitor
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-muted text-foreground",
                  )}
                >
                  {!message.fromVisitor && message.agentName && (
                    <p className="mb-0.5 text-[11px] font-semibold opacity-70">
                      {message.agentName}
                    </p>
                  )}
                  {message.body}
                </div>
              </div>
            ))}

            {messages.length <= 1 && (
              <p className="px-2 text-center text-xs text-muted-foreground">
                {config?.greeting ||
                  "Thanks for reaching out! A team member will reply here soon. You can close this window and come back later. Your chat is saved on this device."}
                {config?.withinHours === false && (
                  <span className="mt-1 block">
                    We&apos;re currently offline — we&apos;ll get back to you as soon as we&apos;re back.
                  </span>
                )}
              </p>
            )}

            {staffTyping && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2.5">
                  <span className="size-1.5 animate-bounce rounded-full bg-foreground/50 [animation-delay:-0.3s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-foreground/50 [animation-delay:-0.15s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-foreground/50" />
                </div>
              </div>
            )}
          </div>

          <div className="border-t p-3" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
            {error && (
              <p className="mb-2 text-xs text-red-500" role="alert">
                {error}
              </p>
            )}
            <div className="flex items-end gap-2">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    void handleSend()
                  }
                }}
                placeholder="Type a message"
                aria-label="Type a message"
                rows={1}
                maxLength={MAX_LENGTH}
                className="max-h-28 min-h-10 resize-none"
              />
              <Button
                type="button"
                size="icon"
                onClick={() => void handleSend()}
                disabled={busy || !draft.trim()}
                aria-label="Send message"
                className="h-10 w-10 shrink-0"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <PoweredBySuprah className="mt-2" />
          </div>
        </>
      ) : showLocationStep ? (
        <div
          className="flex flex-1 flex-col overflow-y-auto bg-muted/30 p-4"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          data-testid="webchat-location-step"
        >
          <p className="mb-3 text-sm text-muted-foreground">Which location would you like to text?</p>
          <div className="divide-y overflow-hidden rounded-2xl border bg-card shadow-sm">
            {locationOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setLocation(option)
                  setError("")
                }}
                className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left text-sm font-semibold transition hover:bg-muted/50 focus:outline-none focus-visible:bg-muted/60"
              >
                <span className="min-w-0 truncate">{option}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
          <PoweredBySuprah className="mt-auto pt-4" />
        </div>
      ) : textUsForm ? (
        <form
          onSubmit={handleStart}
          noValidate
          className="flex flex-1 flex-col gap-3 overflow-y-auto bg-muted/30 p-4"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          data-testid="webchat-text-us-form"
        >
          <p className="max-w-[88%] rounded-2xl rounded-tl-md bg-muted px-4 py-2.5 text-sm leading-snug">
            {config?.greeting || TEXT_US_GREETING}
          </p>

          <div className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
            <TextUsField
              id="webchat-name"
              label="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              maxLength={80}
            />
            <TextUsField
              id="webchat-mobile"
              label="Mobile phone"
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={30}
            />
            <TextUsField
              id="webchat-email"
              label="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={120}
            />
            <div className="group">
              <label
                htmlFor="webchat-message"
                className="text-xs font-medium text-muted-foreground transition-colors group-focus-within:text-foreground"
              >
                Message
              </label>
              <textarea
                id="webchat-message"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={2}
                maxLength={TEXT_US_MESSAGE_LENGTH}
                placeholder={contextLabel ? `Is the ${contextLabel} still available?` : "How can we help?"}
                className="mt-1 block w-full resize-none rounded-none border-0 border-b border-input bg-transparent px-0 py-1 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:shadow-[0_1px_0_0_var(--color-primary)]"
              />
            </div>

            <p className={busy && notice ? "text-xs text-muted-foreground" : "sr-only"} role="status">
              {busy ? notice : ""}
            </p>
            {error && (
              <p className="text-xs text-red-600" role="alert">
                {error}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={busy}
                className={cn(
                  "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold shadow-sm transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60",
                  TEXT_US_INK,
                )}
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Send
              </button>
            </div>
          </div>

          {textMode && (
            <p className="px-1 text-[11px] leading-snug text-muted-foreground" data-testid="webchat-text-consent">
              By sending, you agree to get text messages from {config?.dealershipName || "us"} at this number. Message and data rates may apply. Reply STOP to opt out.
            </p>
          )}
          <PoweredBySuprah className="mt-auto" />
        </form>
      ) : (
        <form
          onSubmit={handleStart}
          noValidate
          className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <p className="text-sm text-muted-foreground">
            {config?.greeting ||
              (textMode
                ? "Have a question? Send us a message and we'll text you back."
                : "Have a question? Send us a message and we'll reply right here.")}
          </p>

          {config?.withinHours === false && (
            <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              We&apos;re currently offline. Leave a message and a team member will get back to you.
            </p>
          )}

          {!knownVisitor && (
          <>
          <div className="space-y-1.5">
            <label htmlFor="webchat-name" className="text-xs font-medium">
              Your name
            </label>
            <Input
              id="webchat-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              maxLength={80}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="webchat-contact" className="text-xs font-medium">
              {textMode ? "Mobile number" : "Phone or email"}
            </label>
            <Input
              id="webchat-contact"
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              maxLength={textMode ? 30 : 120}
              {...(textMode ? { type: "tel", inputMode: "tel" as const, autoComplete: "tel" } : {})}
            />
          </div>
          </>
          )}

          <div className="space-y-1.5">
            <label htmlFor="webchat-message" className="text-xs font-medium">
              Message
            </label>
            <Textarea
              id="webchat-message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={4}
              maxLength={MAX_LENGTH}
              placeholder={contextLabel ? `Is the ${contextLabel} still available?` : "How can we help?"}
              className="resize-none"
            />
          </div>

          <p className={busy && notice ? "text-xs text-muted-foreground" : "sr-only"} role="status">
            {busy ? notice : ""}
          </p>
          {error && (
            <p className="text-xs text-red-500" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={busy} className="mt-auto w-full">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {textMode ? "Text me" : "Start chat"}
          </Button>
          {textMode && (
            <p className="text-[11px] leading-snug text-muted-foreground" data-testid="webchat-text-consent">
              By sending, you agree to get text messages from {config?.dealershipName || "us"} at this number. Message and data rates may apply. Reply STOP to opt out.
            </p>
          )}
          <PoweredBySuprah />
        </form>
      )}
    </div>
  )
}

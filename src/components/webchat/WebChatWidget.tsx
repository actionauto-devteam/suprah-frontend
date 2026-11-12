"use client"

import * as React from "react"
import { CheckCircle2, Loader2, MessageCircle, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  getWebchatConfig,
  sendWebChatMessage,
  startWebChat,
  syncWebChat,
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
}

function postEmbedState(open: boolean) {
  if (typeof window === "undefined" || window.parent === window) return
  window.parent.postMessage({ type: "suprah-webchat:resize", open }, "*")
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
    <p className={`text-center text-[10px] text-muted-foreground ${className}`} data-testid="webchat-powered-by">
      Powered by <span className="font-semibold text-foreground/80">Suprah</span>
    </p>
  )
}

export function WebChatWidget({ vehicleId, orgKey, contextLabel, embedMode, prefill, title, launcher, textUs, defaultLocation }: WebChatWidgetProps) {
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
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [vehicleInterest, setVehicleInterest] = React.useState("")
  const [location, setLocation] = React.useState("")
  const textMode = Boolean(config?.textMode) && !knownVisitor
  const textUsForm = Boolean(textUs) && !knownVisitor
  const locationOptions = React.useMemo(() => (textUsForm ? config?.locations ?? [] : []), [textUsForm, config])
  const panelTitle = title ?? (textUs ? "Text Us" : "Chat with us")
  const visitorFirstName = textUsForm ? firstName.trim() : name.trim().split(/\s+/)[0]

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

    const trimmedName = textUsForm ? `${firstName.trim()} ${lastName.trim()}`.trim() : name.trim()
    const trimmedContact = contact.trim()
    const text = draft.trim()
    const trimmedEmail = email.trim()

    if (textUsForm) {
      if (!firstName.trim() || !lastName.trim() || !trimmedContact || !text) {
        setError("Please add your first name, last name, mobile number, and a message.")
        return
      }
      if (trimmedContact.replace(/\D/g, "").length < 10) {
        setError("Please enter your mobile number with the area code.")
        return
      }
      if (trimmedEmail && !EMAIL_PATTERN.test(trimmedEmail)) {
        setError("Please enter a valid email address.")
        return
      }
      if (locationOptions.length > 0 && !location) {
        setError("Please choose a dealership.")
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
      const result = await startWebChat({
        vehicleId,
        orgKey,
        name: trimmedName,
        ...(textUsForm
          ? {
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              phone: trimmedContact,
              email: trimmedEmail || undefined,
              vehicleInterest: vehicleId ? undefined : vehicleInterest.trim() || undefined,
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
      })

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
      if (result.textNotice) setNotice(result.textNotice)
    } catch (err) {
      setError(getErrorMessage(err, "We couldn't start the chat. Please try again."))
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
            ? undefined
            : { marginBottom: "env(safe-area-inset-bottom)", ...launcher?.handleProps.style, ...launcher?.style }
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
      className={cn(
        "flex flex-col bg-background",
        embedMode
          ? "fixed inset-0 sm:rounded-2xl sm:border sm:shadow-2xl"
          : "fixed inset-0 z-50 sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[34rem] sm:max-h-[calc(100dvh-3rem)] sm:w-96 sm:rounded-2xl sm:border sm:shadow-2xl",
      )}
    >
      <div className="flex items-center justify-between gap-3 bg-primary px-4 py-3 text-primary-foreground sm:rounded-t-2xl">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">{panelTitle}</p>
          <p className="truncate text-xs opacity-80">
            {contextLabel ? `About the ${contextLabel}` : textUs ? "We'll text you back" : "Ask us anything"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close chat"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
            {messages.map((message) => (
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

          {textUsForm && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0 space-y-1.5">
                  <label htmlFor="webchat-first-name" className="text-xs font-medium">
                    First name
                  </label>
                  <Input
                    id="webchat-first-name"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    autoComplete="given-name"
                    maxLength={40}
                    required
                  />
                </div>
                <div className="min-w-0 space-y-1.5">
                  <label htmlFor="webchat-last-name" className="text-xs font-medium">
                    Last name
                  </label>
                  <Input
                    id="webchat-last-name"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    autoComplete="family-name"
                    maxLength={40}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="webchat-mobile" className="text-xs font-medium">
                  Mobile number
                </label>
                <Input
                  id="webchat-mobile"
                  value={contact}
                  onChange={(event) => setContact(event.target.value)}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={30}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="webchat-email" className="text-xs font-medium">
                  Email <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <Input
                  id="webchat-email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  maxLength={120}
                />
              </div>

              {!vehicleId && (
                <div className="space-y-1.5">
                  <label htmlFor="webchat-vehicle" className="text-xs font-medium">
                    Vehicle you&apos;re interested in <span className="font-normal text-muted-foreground">(optional)</span>
                  </label>
                  <Input
                    id="webchat-vehicle"
                    value={vehicleInterest}
                    onChange={(event) => setVehicleInterest(event.target.value)}
                    placeholder="e.g. 2021 Toyota Tacoma"
                    maxLength={80}
                  />
                </div>
              )}

              {locationOptions.length > 0 && (
                <div className="space-y-1.5">
                  <label htmlFor="webchat-location" className="text-xs font-medium">
                    Dealership
                  </label>
                  <select
                    id="webchat-location"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    required
                    className="flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
                  >
                    <option value="" disabled>
                      Choose a dealership
                    </option>
                    {locationOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {!knownVisitor && !textUsForm && (
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
              rows={textUsForm ? 3 : 4}
              maxLength={textUsForm ? TEXT_US_MESSAGE_LENGTH : MAX_LENGTH}
              placeholder={contextLabel ? `Is the ${contextLabel} still available?` : "How can we help?"}
              className="resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={busy} className="mt-auto w-full">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {textUsForm ? "Send" : textMode ? "Text me" : "Start chat"}
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

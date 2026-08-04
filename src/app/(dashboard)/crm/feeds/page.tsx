"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Car,
  ArrowLeft,
  Send,
  Smile,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  X,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
  MessageCircle,
  Rss,
  BarChart2,
  Paperclip,
  FileText,
  AtSign,
  Bell,
  Megaphone,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { apiClient } from "@/lib/api-client"
import {
  useFeedBadge,
  refreshFeedBadge,
  clearUnseenPosts,
  clearFeedNotificationsBadge,
  decrementFeedNotifications,
} from "@/lib/feed-notification-store"
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react"
import DayPulsePage from "@/components/DayPulsePage"


interface Attachment {
  url: string
  fileKey: string
  originalName: string
  mimeType: string
  size: number
  thumbnailUrl?: string | null
}

interface Comment {
  _id: string
  postId: string
  userId: string
  authorName: string
  authorAvatar?: string
  authorRole: string
  content: string
  attachments?: Attachment[]
  createdAt: string
}

interface Post {
  _id: string
  userId: string
  authorName: string
  authorAvatar?: string
  authorRole: string
  content: string
  attachments?: Attachment[]
  isEdited: boolean
  createdAt: string
  updatedAt: string
}

interface CrmUser {
  _id: string
  fullName: string
  username: string
  email: string
  avatar?: string
  role: string
  organizationId?: string
}

/** Org member shown in the @ mention autocomplete. `_id === "all"` is the
 *  special client-side "Everyone" entry. */
interface MentionCandidate {
  _id: string
  fullName: string
  username?: string
  email?: string
  avatar?: string
  role?: string
}

/** Row in the Activity panel — mirrors the FeedNotification backend model. */
interface FeedNotificationItem {
  _id: string
  type: "mention_post" | "mention_comment" | "comment_on_post" | "all_announcement"
  postId: string
  commentId?: string | null
  actorName: string
  snippet: string
  readAt: string | null
  createdAt: string
}

type FeedTab = "feeds" | "daypulse"

type ReactionType = "like" | "love" | "haha" | "wow" | "sad" | "angry"

interface ReactionSummary {
  [key: string]: { count: number; users: string[] }
}

interface ReactionState {
  summary: ReactionSummary
  myReaction: ReactionType | null
}

const REACTIONS: { type: ReactionType; emoji: string; label: string; color: string; bg: string }[] = [
  { type: "like", emoji: "\u{1f44d}", label: "Like", color: "text-blue-500", bg: "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30" },
  { type: "love", emoji: "\u{2764}\u{fe0f}", label: "Love", color: "text-rose-500", bg: "bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30" },
  { type: "haha", emoji: "\u{1f602}", label: "Haha", color: "text-amber-500", bg: "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30" },
  { type: "wow", emoji: "\u{1f62e}", label: "Wow", color: "text-amber-400", bg: "bg-amber-400/10 hover:bg-amber-400/20 border-amber-400/30" },
  { type: "sad", emoji: "\u{1f622}", label: "Sad", color: "text-sky-400", bg: "bg-sky-400/10 hover:bg-sky-400/20 border-sky-400/30" },
  { type: "angry", emoji: "\u{1f620}", label: "Angry", color: "text-orange-500", bg: "bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/30" },
]

const REACTION_MAP = Object.fromEntries(REACTIONS.map((r) => [r.type, r])) as Record<ReactionType, typeof REACTIONS[0]>


function usePreferNativeEmojiPicker() {
  const [preferNative, setPreferNative] = React.useState(false)
  React.useEffect(() => {
    if (typeof window === "undefined") return
    const media = window.matchMedia?.("(pointer: coarse)")
    const update = () => {
      const coarse = media?.matches ?? false
      const touch = navigator.maxTouchPoints > 0
      const mobileUA = Boolean((navigator as any).userAgentData?.mobile) || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
      setPreferNative(coarse || touch || mobileUA)
    }
    update()
    media?.addEventListener?.("change", update)
    return () => media?.removeEventListener?.("change", update)
  }, [])
  return preferNative
}

function ini(n: string) {
  return n.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return "just now"
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function fullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    year: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

const ROLE_COLORS: Record<string, string> = {
  admin: "text-violet-500 bg-violet-500/10 border-violet-500/20",
  manager: "text-sky-500 bg-sky-500/10 border-sky-500/20",
  employee: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
}

const ROLE_DOT: Record<string, string> = {
  admin: "bg-violet-500",
  manager: "bg-sky-500",
  employee: "bg-emerald-500",
}

const MAX_FEED_ATTACHMENTS = 4
const MAX_FEED_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B"
  if (bytes < 1024) return `${bytes} B`
  const units = ["KB", "MB", "GB"]
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value >= 10 || unitIndex === 0 ? Math.round(value) : value.toFixed(1)} ${units[unitIndex]}`
}

function isImageAttachment(file: Pick<Attachment, "mimeType" | "originalName">): boolean {
  return file.mimeType?.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(file.originalName)
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/")
}

function totalReactions(summary: ReactionSummary): number {
  return Object.values(summary).reduce((acc, v) => acc + v.count, 0)
}

function topReactionEmojis(summary: ReactionSummary): string[] {
  return Object.entries(summary)
    .filter(([, v]) => v.count > 0)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 3)
    .map(([type]) => REACTION_MAP[type as ReactionType]?.emoji ?? "")
}

// --- Mentions: tokens, rendering, autocomplete --------------------------------
//
// Mentions are stored inside content as tokens:  @[Roque Jerico](664f…)  or
// @[all](all). The composer inserts tokens via the @ autocomplete; the token
// regex here must stay in sync with utils/feedMentions.ts on the backend.

const MENTION_TOKEN = /@\[([^\]\n]{1,80})\]\(([a-fA-F0-9]{24}|all)\)/g

/** Replace tokens with plain "@Name" — for character counters and previews. */
function stripMentions(content: string): string {
  return (content || "").replace(new RegExp(MENTION_TOKEN.source, "g"), (_f, name, id) =>
    id === "all" ? "@Everyone" : `@${name}`
  )
}

/** Visible length (what the author perceives) — limits apply to this. */
function visibleLength(content: string): number {
  return stripMentions(content).length
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Convert the CLEAN text the user sees ("@Aaron Gonzalez Navarro", "@all")
 * into storage tokens ("@[Aaron Gonzalez Navarro](id)", "@[all](all)") right
 * before submitting. The textarea never shows raw tokens — this is the only
 * place display text and storage format meet.
 *
 * Longest names are matched first so "Aaron Gonzalez" can't shadow
 * "Aaron Gonzalez Navarro". Matching is case-insensitive with a word
 * boundary after the name; the canonical fullName is written into the token.
 */
function serializeMentions(text: string, candidates: MentionCandidate[]): string {
  let out = text
  const sorted = [...candidates].sort((a, b) => b.fullName.length - a.fullName.length)
  for (const c of sorted) {
    if (!c.fullName) continue
    const re = new RegExp(`@${escapeRegExp(c.fullName)}(?=$|[^A-Za-z0-9_])`, "gi")
    out = out.replace(re, `@[${c.fullName}](${c._id})`)
  }
  // "@all" / "@everyone" ? the org-wide token (also catches manually typed ones)
  out = out.replace(/@(all|everyone)(?=$|[^A-Za-z0-9_])/gi, "@[all](all)")
  return out
}

/** Render content with mention tokens as highlighted chips. */
function renderWithMentions(content: string): React.ReactNode {
  if (!content) return null
  const re = new RegExp(MENTION_TOKEN.source, "g")
  const parts: React.ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  let key = 0
  while ((m = re.exec(content)) !== null) {
    if (m.index > last) parts.push(content.slice(last, m.index))
    const isAll = m[2] === "all"
    parts.push(
      <span
        key={`mention-${key++}`}
        className={`inline rounded px-1 font-medium ${isAll
          ? "bg-amber-500/15 text-amber-600"
          : "bg-emerald-500/12 text-emerald-600"
          }`}
      >
        @{isAll ? "Everyone" : m[1]}
      </span>
    )
    last = m.index + m[0].length
  }
  if (last < content.length) parts.push(content.slice(last))
  return parts
}

const ALL_CANDIDATE: MentionCandidate = { _id: "all", fullName: "Everyone", username: "all" }

/** Style props mirrored onto the hidden measuring div — anything that affects
 *  text layout inside the textarea. */
const CARET_MIRROR_PROPS = [
  "boxSizing", "width", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
  "fontStyle", "fontVariant", "fontWeight", "fontStretch", "fontSize", "fontFamily",
  "lineHeight", "textAlign", "textTransform", "textIndent", "letterSpacing",
  "wordSpacing", "tabSize", "whiteSpace", "wordBreak", "overflowWrap",
] as const

interface CaretCoords { top: number; left: number; height: number }

/**
 * Pixel position of a character inside a textarea (relative to the textarea's
 * top-left corner) — the classic mirror-div technique: clone the textarea's
 * text styles onto a hidden div, insert the text up to `position`, and measure
 * where a marker span lands. Accounts for wrapping, padding, and scroll.
 */
function getCaretCoordinates(el: HTMLTextAreaElement, position: number): CaretCoords {
  const style = window.getComputedStyle(el)
  const div = document.createElement("div")
  div.style.position = "absolute"
  div.style.visibility = "hidden"
  div.style.top = "0"
  div.style.left = "-9999px"
  div.style.whiteSpace = "pre-wrap"
  div.style.wordWrap = "break-word"
  for (const prop of CARET_MIRROR_PROPS) {
    ; (div.style as any)[prop] = (style as any)[prop]
  }
  div.textContent = el.value.substring(0, position)
  const marker = document.createElement("span")
  marker.textContent = el.value.substring(position) || "."
  div.appendChild(marker)
  document.body.appendChild(div)
  const lh = parseFloat(style.lineHeight)
  const height = Number.isFinite(lh) ? lh : parseFloat(style.fontSize) * 1.4
  const coords: CaretCoords = {
    top: marker.offsetTop - el.scrollTop,
    left: marker.offsetLeft - el.scrollLeft,
    height,
  }
  document.body.removeChild(div)
  return coords
}

/**
 * @ autocomplete for a textarea. Detects an "@query" being typed at the
 * caret, filters candidates, and inserts the storage token on selection.
 * Returns handlers the host component wires into onChange / onKeyDown.
 */
function useMentions(opts: {
  value: string
  setValue: (v: string) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  candidates: MentionCandidate[]
}) {
  const { value, setValue, textareaRef, candidates } = opts
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [caret, setCaret] = React.useState<CaretCoords | null>(null)
  const anchorStart = React.useRef(-1)

  const results = React.useMemo(() => {
    if (!open) return [] as MentionCandidate[]
    const q = query.toLowerCase()
    const base = [ALL_CANDIDATE, ...candidates]
    return base
      .filter((c) =>
        !q ||
        c.fullName.toLowerCase().includes(q) ||
        (c.username || "").toLowerCase().includes(q)
      )
      .slice(0, 6)
  }, [open, query, candidates])

  /** Call after every value change — looks for "@query" ending at the caret. */
  const detect = React.useCallback((val: string) => {
    const el = textareaRef.current
    const caret = el ? el.selectionStart : val.length
    const before = val.slice(0, caret)
    // "@" at start or after whitespace, then up to two words (names contain
    // spaces). Closes as soon as the pattern breaks (e.g. "@" mid-sentence
    // followed by normal prose past two words).
    const m = before.match(/(^|\s)@([A-Za-z0-9._-]{0,24}(?: [A-Za-z0-9._-]{0,24})?)$/)
    if (m) {
      setOpen(true)
      setQuery(m[2])
      anchorStart.current = caret - m[2].length - 1
      setActiveIndex(0)
      // Pin the panel to the "@" character itself, clamped so a 288px-wide
      // panel never overflows the textarea's right edge.
      if (el) {
        try {
          const coords = getCaretCoordinates(el, anchorStart.current)
          setCaret({
            ...coords,
            left: Math.max(0, Math.min(coords.left, el.clientWidth - 296)),
          })
        } catch { setCaret(null) }
      }
    } else {
      setOpen(false)
      setQuery("")
      setCaret(null)
    }
  }, [textareaRef])

  const insert = React.useCallback((c: MentionCandidate) => {
    const el = textareaRef.current
    const caret = el ? el.selectionStart : value.length
    const start = anchorStart.current >= 0 ? anchorStart.current : caret
    // Insert CLEAN display text — storage tokens are produced by
    // serializeMentions() only at submit time.
    const token = c._id === "all" ? "@all " : `@${c.fullName} `
    const next = value.slice(0, start) + token + value.slice(caret)
    setValue(next)
    setOpen(false)
    setQuery("")
    requestAnimationFrame(() => {
      el?.focus()
      const pos = start + token.length
      el?.setSelectionRange(pos, pos)
    })
  }, [value, setValue, textareaRef])

  /** Returns true when the key was consumed by the suggestion list. */
  const onKeyDown = React.useCallback((e: React.KeyboardEvent): boolean => {
    if (!open || results.length === 0) return false
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => (i + 1) % results.length); return true }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => (i - 1 + results.length) % results.length); return true }
    if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insert(results[activeIndex]); return true }
    if (e.key === "Escape") { e.preventDefault(); setOpen(false); return true }
    return false
  }, [open, results, activeIndex, insert])

  return { open, query, results, activeIndex, setActiveIndex, detect, insert, onKeyDown, caret, close: () => setOpen(false) }
}

/** Bold the part of the name that matches the typed query. */
function highlightMatch(name: string, query: string): React.ReactNode {
  if (!query) return name
  const idx = name.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return name
  return (
    <>
      {name.slice(0, idx)}
      <span className="text-emerald-500">{name.slice(idx, idx + query.length)}</span>
      {name.slice(idx + query.length)}
    </>
  )
}

/** Floating suggestion list — render inside a `relative` wrapper around the
 *  textarea. `placement="bottom"` drops the panel BELOW the input (use for
 *  inputs near the top of the viewport, e.g. the composer, where an upward
 *  panel would collide with the sticky header); `"top"` opens upward (use for
 *  comment inputs at the bottom of cards). */
function MentionSuggestions({ mention, placement = "top" }: { mention: ReturnType<typeof useMentions>; placement?: "top" | "bottom" }) {
  if (!mention.open || mention.results.length === 0) return null
  const caret = mention.caret
  // With caret coords: pin directly under the "@" (bottom) or horizontally
  // aligned to it while opening upward (top). Without coords (measurement
  // failed): fall back to anchoring on the input edge.
  const posStyle: React.CSSProperties = caret
    ? placement === "bottom"
      ? { top: caret.top + caret.height + 4, left: caret.left }
      : { left: caret.left }
    : {}
  const anchorClass = placement === "top"
    ? "bottom-full mb-1.5"
    : caret ? "" : "top-full mt-1.5"
  const hasEveryone = mention.results[0]?._id === "all"
  const people = hasEveryone ? mention.results.slice(1) : mention.results
  const renderRow = (c: MentionCandidate, i: number) => {
    const active = i === mention.activeIndex
    const isAll = c._id === "all"
    return (
      <button
        key={c._id}
        type="button"
        // mousedown (not click) so the textarea doesn't blur first
        onMouseDown={(e) => { e.preventDefault(); mention.insert(c) }}
        onMouseEnter={() => mention.setActiveIndex(i)}
        className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors duration-100
          ${active ? "bg-emerald-500/12 ring-1 ring-inset ring-emerald-500/20" : "hover:bg-muted/40"}`}
      >
        {isAll ? (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500 ring-1 ring-inset ring-amber-500/25">
            <Megaphone className="h-3.5 w-3.5" />
          </div>
        ) : (
          <Avatar className="h-7 w-7 shrink-0 rounded-lg ring-1 ring-border/40">
            <AvatarImage src={c.avatar} />
            <AvatarFallback className="rounded-lg bg-emerald-600 text-white text-[9px] font-semibold">{ini(c.fullName)}</AvatarFallback>
          </Avatar>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium leading-tight text-foreground">
            {isAll ? "Everyone" : highlightMatch(c.fullName, mention.query)}
          </p>
          <p className="truncate text-[10px] leading-tight text-muted-foreground/55">
            {isAll ? "Notify the whole team" : `@${c.username || c.email || ""}`}
          </p>
        </div>
        {active && <span className="shrink-0 text-[9px] font-semibold text-emerald-500/70">{"↵"}</span>}
      </button>
    )
  }
  return (
    <div
      style={posStyle}
      className={`absolute z-50 w-72 overflow-hidden rounded-2xl border border-border/50 bg-popover shadow-2xl shadow-black/40 ${anchorClass}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <AtSign className="h-3 w-3 text-emerald-500" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">Mention</span>
        </div>
        <span className="text-[9px] font-medium tabular-nums text-muted-foreground/40">
          {mention.results.length} {mention.results.length === 1 ? "match" : "matches"}
        </span>
      </div>

      {/* Results — Everyone pinned as its own section, teammates below */}
      <div className="max-h-60 overflow-y-auto p-1.5 [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/50">
        {hasEveryone && (
          <>
            {renderRow(mention.results[0], 0)}
            {people.length > 0 && (
              <div className="mx-2 my-1 h-px bg-linear-to-r from-transparent via-border/50 to-transparent" />
            )}
          </>
        )}
        <div className="space-y-0.5">
          {people.map((c, idx) => renderRow(c, hasEveryone ? idx + 1 : idx))}
        </div>
      </div>

      {/* Keyboard hints */}
      <div className="flex items-center gap-2.5 border-t border-border/40 bg-muted/20 px-3 py-1.5 text-[9px] text-muted-foreground/45">
        <span className="flex items-center gap-1"><kbd className="rounded border border-border/40 bg-muted/50 px-1 font-sans leading-relaxed">{"↑↓"}</kbd> navigate</span>
        <span className="flex items-center gap-1"><kbd className="rounded border border-border/40 bg-muted/50 px-1 font-sans leading-relaxed">{"↵"}</kbd> select</span>
        <span className="flex items-center gap-1"><kbd className="rounded border border-border/40 bg-muted/50 px-1 font-sans leading-relaxed">esc</kbd> close</span>
      </div>
    </div>
  )
}

// --- Clean gradient divider ---------------------------------------------------

function Divider({ label, className = "" }: { label?: string; className?: string }) {
  if (!label) {
    return <div className={`h-px w-full bg-linear-to-r from-transparent via-border/50 to-transparent ${className}`} />
  }
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="h-px flex-1 bg-linear-to-r from-transparent to-border/50" />
      <span className="text-[11px] font-medium text-muted-foreground/50 shrink-0">{label}</span>
      <div className="h-px flex-1 bg-linear-to-l from-transparent to-border/50" />
    </div>
  )
}

// --- Attachment Preview Modal --------------------------------------------------

function AttachmentPreviewModal({ attachment, onClose }: { attachment: Attachment; onClose: () => void }) {
  const imageLike = isImageAttachment(attachment)
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-3xl border border-border/50 bg-card/95 backdrop-blur-2xl shadow-2xl shadow-black/30 overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border/40 px-5 py-4">
          <h3 className="truncate text-sm font-semibold tracking-tight">{attachment.originalName}</h3>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted/60" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-5">
          {imageLike ? (
            <img src={attachment.url} alt={attachment.originalName} className="max-h-[70vh] w-full rounded-2xl object-contain bg-muted/15" />
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/40 bg-muted/15 px-6 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
                <FileText className="h-6 w-6" />
              </div>
              <p className="text-xs text-muted-foreground/60">{formatBytes(attachment.size)}</p>
              <Button asChild size="sm" className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs">
                <a href={attachment.url} target="_blank" rel="noreferrer">Open attachment</a>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// --- Attachment Grid (rendered on a posted post/comment) ----------------------

function AttachmentGrid({ attachments, compact = false }: { attachments: Attachment[]; compact?: boolean }) {
  const [preview, setPreview] = React.useState<Attachment | null>(null)
  if (!attachments?.length) return null

  return (
    <>
      {preview && <AttachmentPreviewModal attachment={preview} onClose={() => setPreview(null)} />}
      <div className={`grid gap-2 ${attachments.length > 1 ? "sm:grid-cols-2" : ""}`}>
        {attachments.map((a) => {
          const imageLike = isImageAttachment(a)
          if (imageLike) {
            return (
              <button
                key={a.fileKey}
                type="button"
                onClick={() => setPreview(a)}
                className={`overflow-hidden rounded-2xl border border-border/40 bg-muted/15 ${compact ? "h-28" : "h-44"}`}
              >
                <img src={a.thumbnailUrl || a.url} alt={a.originalName} className="h-full w-full object-cover" />
              </button>
            )
          }
          return (
            <a
              key={a.fileKey}
              href={a.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card/60 px-3 py-2.5 transition-colors hover:border-border/60 hover:bg-muted/30"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground ring-1 ring-border/30">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">{a.originalName}</p>
                <p className="text-[10px] text-muted-foreground/55">{formatBytes(a.size)}</p>
              </div>
            </a>
          )
        })}
      </div>
    </>
  )
}

// --- Pending Attachments (composer preview, before posting) -------------------

function PendingAttachments({ files, onRemove, className = "px-5 pb-2" }: { files: File[]; onRemove: (index: number) => void; className?: string }) {
  if (!files.length) return null
  return (
    <div className={`grid gap-2 ${className} ${files.length > 1 ? "sm:grid-cols-2" : ""}`}>
      {files.map((file, index) => {
        const imageLike = isImageFile(file)
        return (
          <div
            key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
            className="flex items-center gap-3 rounded-2xl border border-border/40 bg-muted/20 px-3 py-2"
          >
            {imageLike ? (
              <img src={URL.createObjectURL(file)} alt={file.name} className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-border/30" />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground ring-1 ring-border/30">
                <FileText className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">{file.name}</p>
              <p className="text-[10px] text-muted-foreground/55">{formatBytes(file.size)}</p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="rounded-full p-1 text-muted-foreground/40 transition-colors hover:bg-muted hover:text-muted-foreground/75"
              aria-label={`Remove ${file.name}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// --- Reaction Details Modal (who reacted) --------------------------------------

function ReactionDetailsModal({ summary, onClose }: {
  summary: ReactionSummary; onClose: () => void
}) {
  const types = (Object.keys(summary) as ReactionType[])
    .filter((t) => (summary[t]?.count ?? 0) > 0 && REACTION_MAP[t])
    .sort((a, b) => summary[b].count - summary[a].count)

  const [tab, setTab] = React.useState<ReactionType | "all">("all")

  const allEntries = types.flatMap((t) =>
    (summary[t].users || []).map((name) => ({ name, type: t }))
  )
  const entries = tab === "all"
    ? allEntries
    : (summary[tab]?.users || []).map((name) => ({ name, type: tab }))

  const total = allEntries.length

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl border border-border/50 bg-card/95 backdrop-blur-2xl shadow-2xl shadow-black/30 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <h3 className="text-sm font-semibold tracking-tight">
            Reactions <span className="text-muted-foreground/40 font-normal">· {total}</span>
          </h3>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-muted/60" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-3 py-2.5 border-b border-border/30 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={() => setTab("all")}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors
              ${tab === "all" ? "bg-foreground text-background" : "text-muted-foreground/60 hover:bg-muted/50"}`}
          >
            All <span className="tabular-nums opacity-70">{total}</span>
          </button>
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors
                ${tab === t ? "bg-muted text-foreground ring-1 ring-border/60" : "text-muted-foreground/60 hover:bg-muted/50"}`}
            >
              <span className="text-sm leading-none">{REACTION_MAP[t].emoji}</span>
              <span className="tabular-nums">{summary[t].count}</span>
            </button>
          ))}
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto p-2">
          {entries.length === 0 ? (
            <p className="py-10 text-center text-xs text-muted-foreground/50">No reactions yet</p>
          ) : (
            entries.map((e, i) => (
              <div key={`${e.name}-${e.type}-${i}`} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-muted/40 transition-colors">
                <div className="relative shrink-0">
                  <Avatar className="h-9 w-9 ring-1 ring-border/40">
                    <AvatarFallback className="bg-emerald-600 text-white text-[10px] font-semibold">{ini(e.name)}</AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-card text-[11px] leading-none ring-1 ring-border/40">
                    {REACTION_MAP[e.type].emoji}
                  </span>
                </div>
                <span className="text-sm font-medium text-foreground/90 truncate">{e.name}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// --- Reaction Bar -------------------------------------------------------------

function ReactionBar({
  targetType, targetId, token, reactionState, onReactionChange, compact = false,
}: {
  targetType: "post" | "comment"; targetId: string; token: string
  reactionState: ReactionState; onReactionChange: (state: ReactionState) => void; compact?: boolean
}) {
  const [showPicker, setShowPicker] = React.useState(false)
  const [showDetails, setShowDetails] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const pickerRef = React.useRef<HTMLDivElement>(null)
  const btnRef = React.useRef<HTMLButtonElement>(null)
  const hoverTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    function handle(e: MouseEvent) {
      if (
        pickerRef.current && !pickerRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setShowPicker(false)
    }
    if (showPicker) document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [showPicker])

  const handleReact = async (type: ReactionType) => {
    if (loading) return
    setLoading(true); setShowPicker(false)
    try {
      const res = await apiClient.post(
        "/api/crm/feeds/reactions",
        { targetType, targetId, reaction: type }
      )
      const { summary, action } = res.data?.data
      onReactionChange({ summary, myReaction: action === "removed" ? null : type })
    } catch (err: any) {
      console.error("Reaction failed:", err?.response?.status, err?.response?.data)
    }
    finally { setLoading(false) }
  }

  const { summary, myReaction } = reactionState
  const total = totalReactions(summary)
  const topEmojis = topReactionEmojis(summary)
  const myMeta = myReaction ? REACTION_MAP[myReaction] : null

  return (
    <>
      {showDetails && <ReactionDetailsModal summary={summary} onClose={() => setShowDetails(false)} />}
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            ref={btnRef}
            disabled={loading}
            onClick={() => setShowPicker((p) => !p)}
            onMouseEnter={() => { hoverTimer.current = setTimeout(() => setShowPicker(true), 400) }}
            onMouseLeave={() => { if (hoverTimer.current) clearTimeout(hoverTimer.current) }}
            className={`flex items-center gap-1.5 rounded-full border font-medium transition-all duration-150 select-none
              ${compact ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs"}
              ${myMeta ? `${myMeta.bg} ${myMeta.color} border-current` : "border-border/40 text-muted-foreground/50 hover:border-emerald-500/40 hover:text-emerald-600 hover:bg-emerald-500/5"}
              ${loading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className={compact ? "text-sm leading-none" : "text-base leading-none"}>{myMeta ? myMeta.emoji : "\u{1f44d}"}</span>}
            {!compact && <span>{myMeta ? myMeta.label : "React"}</span>}
          </button>
          {showPicker && (
            <div
              ref={pickerRef}
              className="absolute bottom-full left-0 mb-2 z-50 flex items-center gap-0.5 rounded-full border border-border/40 bg-card/95 backdrop-blur-xl px-2 py-1.5 shadow-2xl shadow-black/25"
              onMouseEnter={() => { if (hoverTimer.current) clearTimeout(hoverTimer.current) }}
            >
              {REACTIONS.map((r) => (
                <button
                  key={r.type}
                  onClick={() => handleReact(r.type)}
                  title={r.label}
                  className={`group relative flex items-center justify-center rounded-full w-9 h-9 transition-all duration-150 hover:scale-125 active:scale-110
                    ${myReaction === r.type ? "bg-muted/60 ring-2 ring-current scale-110" : "hover:bg-muted/40"} ${r.color}`}
                >
                  <span className="text-xl leading-none select-none">{r.emoji}</span>
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover border border-border/40 px-2 py-0.5 text-[9px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity shadow-lg pointer-events-none">
                    {r.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {total > 0 && (
          <button
            type="button"
            onClick={() => setShowDetails(true)}
            title="See who reacted"
            className="flex items-center gap-1.5 rounded-full px-1.5 py-0.5 transition-colors hover:bg-muted/40 cursor-pointer"
          >
            <div className="flex -space-x-1">
              {topEmojis.map((emoji, i) => (
                <span key={i} className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted/70 border border-border/30 text-[11px] leading-none select-none" style={{ zIndex: topEmojis.length - i }}>
                  {emoji}
                </span>
              ))}
            </div>
            <span className="text-xs font-medium text-muted-foreground/60 tabular-nums">{total}</span>
          </button>
        )}
      </div>
    </>
  )
}

// --- Delete Confirm Modal -----------------------------------------------------

function DeleteModal({ label = "post", onConfirm, onCancel, loading }: {
  label?: string; onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl border border-border/50 bg-card/95 backdrop-blur-2xl shadow-2xl shadow-black/30 p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
            <Trash2 className="h-4 w-4 text-rose-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold tracking-tight">Delete {label}?</h3>
            <p className="text-xs text-muted-foreground/60 leading-relaxed">This can't be undone. The {label} will be permanently removed.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 rounded-xl h-9 text-xs font-medium border-border/40" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button variant="destructive" className="flex-1 rounded-xl h-9 text-xs font-semibold gap-1.5" onClick={onConfirm} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Delete
          </Button>
        </div>
      </div>
    </div>
  )
}

// --- Comment Item -------------------------------------------------------------

function CommentItem({ comment, currentUser, token, postId, onDeleted, reactionState, onReactionChange }: {
  comment: Comment; currentUser: CrmUser; token: string; postId: string
  onDeleted: (commentId: string) => void; reactionState: ReactionState; onReactionChange: (state: ReactionState) => void
}) {
  const [showDeleteModal, setShowDeleteModal] = React.useState(false)
  const [deleteLoading, setDeleteLoading] = React.useState(false)

  const isOwner = comment.userId === currentUser._id
  const isAdmin = currentUser.role === "admin"
  const canDelete = isOwner || isAdmin

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      await apiClient.delete(`/api/crm/feeds/${postId}/comments/${comment._id}`)
      onDeleted(comment._id)
    } catch (err: any) {
      console.error("Comment delete failed:", err?.response?.status, err?.response?.data)
      setDeleteLoading(false); setShowDeleteModal(false)
    }
  }

  return (
    <>
      {showDeleteModal && <DeleteModal label="comment" onConfirm={handleDelete} onCancel={() => setShowDeleteModal(false)} loading={deleteLoading} />}
      <div className="group flex items-start gap-2.5">
        <Avatar className="h-7 w-7 shrink-0 mt-0.5 ring-1 ring-border/40">
          <AvatarImage src={comment.authorAvatar} />
          <AvatarFallback className="bg-emerald-600 text-white text-[9px] font-semibold">{ini(comment.authorName)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="inline-block rounded-2xl rounded-tl-md bg-muted/40 px-3.5 py-2.5 max-w-full">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className="text-xs font-semibold leading-none">{comment.authorName}</span>
              <Badge variant="outline" className={`text-[8px] h-4 px-1.5 rounded-full capitalize font-medium leading-none border ${ROLE_COLORS[comment.authorRole] ?? ROLE_COLORS.employee}`}>
                {comment.authorRole}
              </Badge>
            </div>
            {comment.content && <p className="text-xs leading-relaxed whitespace-pre-wrap wrap-break-word text-foreground/80">{renderWithMentions(comment.content)}</p>}
          </div>
          {!!comment.attachments?.length && (
            <div className="mt-2 max-w-xs">
              <AttachmentGrid attachments={comment.attachments} compact />
            </div>
          )}
          <div className="flex items-center gap-2 mt-1 pl-1 flex-wrap">
            <span className="text-[10px] text-muted-foreground/50 cursor-default" title={fullDate(comment.createdAt)}>{timeAgo(comment.createdAt)}</span>
            {canDelete && (
              <button onClick={() => setShowDeleteModal(true)} className="text-[10px] text-muted-foreground/40 hover:text-rose-500 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 font-medium">
                Delete
              </button>
            )}
            <ReactionBar targetType="comment" targetId={comment._id} token={token} reactionState={reactionState} onReactionChange={onReactionChange} compact />
          </div>
        </div>
      </div>
    </>
  )
}

// --- Comment Section ----------------------------------------------------------

function CommentSection({ post, currentUser, token, comments, setComments, commentReactions, setCommentReactions, inputId, mentionCandidates }: {
  post: Post; currentUser: CrmUser; token: string; inputId: string
  comments: Comment[]; setComments: React.Dispatch<React.SetStateAction<Comment[]>>
  commentReactions: Record<string, ReactionState>; setCommentReactions: React.Dispatch<React.SetStateAction<Record<string, ReactionState>>>
  mentionCandidates: MentionCandidate[]
}) {
  const COLLAPSE_THRESHOLD = 5
  const VISIBLE_WHEN_COLLAPSED = 3

  const [loading, setLoading] = React.useState(false)
  const [showAll, setShowAll] = React.useState(false)
  const [newComment, setNewComment] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState("")
  const [showEmoji, setShowEmoji] = React.useState(false)
  const [pendingFiles, setPendingFiles] = React.useState<File[]>([])
  const preferNativeEmoji = usePreferNativeEmojiPicker()
  const inputRef = React.useRef<HTMLTextAreaElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const sectionRef = React.useRef<HTMLDivElement>(null)
  const [shouldLoadComments, setShouldLoadComments] = React.useState(false)

  const mention = useMentions({
    value: newComment,
    setValue: (v) => { setNewComment(v); setSubmitError("") },
    textareaRef: inputRef,
    candidates: mentionCandidates,
  })

  const addFiles = (incoming: File[]) => {
    if (!incoming.length) return
    if (pendingFiles.length + incoming.length > MAX_FEED_ATTACHMENTS) {
      setSubmitError(`You can attach up to ${MAX_FEED_ATTACHMENTS} files.`)
      return
    }
    const oversized = incoming.find((f) => f.size > MAX_FEED_ATTACHMENT_SIZE_BYTES)
    if (oversized) {
      setSubmitError(`${oversized.name} exceeds 25 MB.`)
      return
    }
    setPendingFiles((prev) => [...prev, ...incoming])
    setSubmitError("")
  }

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []))
    e.target.value = ""
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const imageFiles = Array.from(e.clipboardData?.items || [])
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((f): f is File => !!f)
    if (imageFiles.length) addFiles(imageFiles)
  }

  React.useEffect(() => {
    const node = sectionRef.current
    if (!node || shouldLoadComments) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setShouldLoadComments(true)
        observer.disconnect()
      },
      { rootMargin: "400px 0px", threshold: 0.01 }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [shouldLoadComments])

  React.useEffect(() => {
    if (!shouldLoadComments || !token || !post._id) return
    const controller = new AbortController()
    setLoading(true)

    apiClient.get(`/api/crm/feeds/${post._id}/comments`, { signal: controller.signal })
      .then((res) => {
        const fetched: Comment[] = res.data?.data?.comments || []
        setComments(fetched)

        // Comment reactions are loaded independently so comments can render first.
        if (fetched.length > 0) {
          apiClient.post(
            "/api/crm/feeds/reactions/bulk",
            { targetIds: fetched.map((comment) => comment._id) },
            { signal: controller.signal }
          )
            .then((reactionRes) => setCommentReactions(reactionRes.data?.data?.reactions || {}))
            .catch(() => { })
        }
      })
      .catch(() => { })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldLoadComments, post._id, token])

  const handleSubmit = async () => {
    if (!newComment.trim() && pendingFiles.length === 0) return
    if (newComment.trim().length > 1000) { setSubmitError("Comment cannot exceed 1000 characters"); return }
    setSubmitting(true); setSubmitError("")
    try {
      // Convert clean "@Name" text into storage tokens only now, at submit.
      const payload = serializeMentions(newComment.trim(), mentionCandidates)
      let res
      if (pendingFiles.length > 0) {
        // Has attachments ? multipart
        const formData = new FormData()
        formData.append("content", payload)
        pendingFiles.forEach((f) => formData.append("files", f))
        res = await apiClient.post(`/api/crm/feeds/${post._id}/comments`, formData)
      } else {
        // Text-only ? plain JSON
        res = await apiClient.post(`/api/crm/feeds/${post._id}/comments`, { content: payload })
      }
      const comment: Comment = res.data?.data?.comment
      setComments((prev) => prev.some((c) => c._id === comment._id) ? prev : [...prev, comment])
      setCommentReactions((prev) => ({ ...prev, [comment._id]: { summary: {}, myReaction: null } }))
      setNewComment(""); setPendingFiles([]); setShowEmoji(false); setShowAll(true)
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message || "Failed to post comment")
    } finally { setSubmitting(false) }
  }

  const handleDeleteComment = (commentId: string) => {
    setComments((prev) => prev.filter((c) => c._id !== commentId))
    setCommentReactions((prev) => { const next = { ...prev }; delete next[commentId]; return next })
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mention.onKeyDown(e)) return
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); handleSubmit() }
  }

  const shouldCollapse = comments.length >= COLLAPSE_THRESHOLD && !showAll
  const visibleComments = shouldCollapse ? comments.slice(-VISIBLE_WHEN_COLLAPSED) : comments
  const hiddenCount = comments.length - VISIBLE_WHEN_COLLAPSED

  return (
    <div ref={sectionRef} className="rounded-2xl border border-border/30 bg-muted/15 mt-3 p-4 space-y-3">
      {loading && <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground/40" /></div>}
      {!loading && shouldCollapse && (
        <button onClick={() => setShowAll(true)} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground/60 hover:text-emerald-600 transition-colors">
          <ChevronDown className="h-3.5 w-3.5" /> Show {hiddenCount} more {hiddenCount === 1 ? "comment" : "comments"}
        </button>
      )}
      {!loading && comments.length >= COLLAPSE_THRESHOLD && showAll && (
        <button onClick={() => setShowAll(false)} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground/60 hover:text-muted-foreground/80 transition-colors">
          <ChevronUp className="h-3.5 w-3.5" /> Show less
        </button>
      )}
      {!loading && comments.length === 0 && (
        <p className="text-xs text-muted-foreground/50 text-center py-1">No comments yet — be the first.</p>
      )}
      {!loading && visibleComments.map((comment) => (
        <CommentItem
          key={comment._id} comment={comment} currentUser={currentUser} token={token} postId={post._id}
          onDeleted={handleDeleteComment}
          reactionState={commentReactions[comment._id] ?? { summary: {}, myReaction: null }}
          onReactionChange={(state) => setCommentReactions((prev) => ({ ...prev, [comment._id]: state }))}
        />
      ))}

      {/* New comment input */}
      <div className="flex items-start gap-2.5 pt-1">
        <Avatar className="h-7 w-7 shrink-0 mt-0.5 ring-1 ring-emerald-500/25">
          <AvatarImage src={currentUser.avatar} />
          <AvatarFallback className="bg-emerald-600 text-white text-[9px] font-semibold">{ini(currentUser.fullName)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 relative">
          <MentionSuggestions mention={mention} />
          <div className="rounded-2xl border border-border/40 bg-background/50 focus-within:border-emerald-500/40 focus-within:ring-1 focus-within:ring-emerald-500/15 transition-all">
            <textarea
              id={inputId}
              ref={inputRef} value={newComment}
              onChange={(e) => { setNewComment(e.target.value); setSubmitError(""); mention.detect(e.target.value) }}
              onKeyDown={handleKey}
              onPaste={handlePaste}
              onBlur={() => setTimeout(mention.close, 150)}
              placeholder="Leave a comment… (@ to mention)" rows={1} maxLength={1000}
              className="w-full bg-transparent text-xs leading-relaxed p-3 pr-16 resize-none focus:outline-none placeholder:text-muted-foreground/40"
              style={{ minHeight: "38px" }}
            />
            <PendingAttachments files={pendingFiles} onRemove={(i) => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))} className="px-3 pb-2" />
            <div className="flex items-center justify-between px-3 pb-2">
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors" title="Attach file">
                  <Paperclip className="h-3.5 w-3.5" />
                </button>
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFilePick} />
                <button
                  type="button"
                  title="Mention someone"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    const el = inputRef.current
                    if (!el) return
                    const caret = el.selectionStart ?? newComment.length
                    const needsSpace = caret > 0 && !/\s$/.test(newComment.slice(0, caret))
                    const inserted = `${needsSpace ? " " : ""}@`
                    const next = newComment.slice(0, caret) + inserted + newComment.slice(caret)
                    setNewComment(next)
                    requestAnimationFrame(() => {
                      el.focus()
                      const pos = caret + inserted.length
                      el.setSelectionRange(pos, pos)
                      mention.detect(next)
                    })
                  }}
                  className="text-muted-foreground/50 hover:text-emerald-600 transition-colors"
                >
                  <AtSign className="h-3.5 w-3.5" />
                </button>
                {preferNativeEmoji ? (
                  <button type="button" onClick={() => inputRef.current?.focus()} className="text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors" title="Emoji">
                    <Smile className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <Popover open={showEmoji} onOpenChange={setShowEmoji}>
                    <PopoverTrigger asChild>
                      <button type="button" className="text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors">
                        <Smile className="h-3.5 w-3.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="top" align="start" sideOffset={8} collisionPadding={8} className="w-auto border-none bg-transparent p-0 shadow-none">
                      <div className="rounded-2xl border border-border/40 bg-card/95 shadow-2xl overflow-hidden">
                        <EmojiPicker theme={"auto" as Theme} onEmojiClick={(e: EmojiClickData) => { setNewComment((p) => p + e.emoji); setShowEmoji(false); inputRef.current?.focus() }} height={320} width={280} />
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <button type="button" onClick={handleSubmit} disabled={submitting || (!newComment.trim() && pendingFiles.length === 0)} className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Post
              </button>
            </div>
          </div>
          {submitError && <p className="text-[10px] text-rose-500 mt-1 pl-1">{submitError}</p>}
          {newComment && !submitError && <p className="text-[10px] text-muted-foreground/40 mt-1 pl-1">?/Ctrl + Enter to post</p>}
        </div>
      </div>
    </div>
  )
}

// --- Post Card ----------------------------------------------------------------

function PostCard({ post, currentUser, token, onUpdated, onDeleted, reactionState, onReactionChange, mentionCandidates, isUnread, isFlashing, onMarkRead }: {
  post: Post; currentUser: CrmUser; token: string
  onUpdated: (updated: Post) => void; onDeleted: (id: string) => void
  reactionState: ReactionState; onReactionChange: (state: ReactionState) => void
  mentionCandidates: MentionCandidate[]
  /** True when this post is newer than the user's last visit and not yet read. */
  isUnread: boolean
  /** True while a deep-link / auto-scroll wants this card visually flashed. */
  isFlashing: boolean
  onMarkRead: (postId: string) => void
}) {
  const [isEditing, setIsEditing] = React.useState(false)
  // The edit textarea works with CLEAN text — stored tokens are stripped on
  // open and re-serialized on save.
  const [editContent, setEditContent] = React.useState(() => stripMentions(post.content))
  const [editLoading, setEditLoading] = React.useState(false)
  const [editError, setEditError] = React.useState("")
  const [showEmojiEdit, setShowEmojiEdit] = React.useState(false)
  const preferNativeEmoji = usePreferNativeEmojiPicker()
  const [showDeleteModal, setShowDeleteModal] = React.useState(false)
  const [deleteLoading, setDeleteLoading] = React.useState(false)
  const [comments, setComments] = React.useState<Comment[]>([])
  const [commentReactions, setCommentReactions] = React.useState<Record<string, ReactionState>>({})
  const editRef = React.useRef<HTMLTextAreaElement>(null)
  const commentInputId = `comment-input-${post._id}`

  const editMention = useMentions({
    value: editContent,
    setValue: (v) => { setEditContent(v); setEditError("") },
    textareaRef: editRef,
    candidates: mentionCandidates,
  })

  const isOwner = post.userId === currentUser._id
  const isAdmin = currentUser.role === "admin"
  const canEdit = isOwner
  const canDelete = isOwner || isAdmin

  const roleDot = ROLE_DOT[post.authorRole] ?? ROLE_DOT.employee

  React.useEffect(() => {
    if (isEditing) {
      editRef.current?.focus()
      const len = editRef.current?.value.length ?? 0
      editRef.current?.setSelectionRange(len, len)
    }
  }, [isEditing])

  const handleSave = async () => {
    if (!editContent.trim()) { setEditError("Content cannot be empty"); return }
    if (editContent.trim().length > 5000) { setEditError("Post content cannot exceed 5000 characters"); return }
    setEditLoading(true); setEditError("")
    try {
      const payload = serializeMentions(editContent.trim(), mentionCandidates)
      const res = await apiClient.put(`/api/crm/feeds/${post._id}`, { content: payload })
      onUpdated(res.data?.data?.post || res.data?.post)
      setIsEditing(false)
    } catch (err: any) {
      setEditError(err?.response?.data?.message || "Failed to update post")
    } finally { setEditLoading(false) }
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      await apiClient.delete(`/api/crm/feeds/${post._id}`)
      onDeleted(post._id)
    } catch (err: any) {
      console.error("Post delete failed:", err?.response?.status, err?.response?.data)
      setDeleteLoading(false); setShowDeleteModal(false)
    }
  }

  const handleFocusComment = () => {
    if (typeof document === "undefined") return
    const el = document.getElementById(commentInputId) as HTMLTextAreaElement | null
    if (!el) return
    el.focus()
    el.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  return (
    <>
      {showDeleteModal && <DeleteModal label="post" onConfirm={handleDelete} onCancel={() => setShowDeleteModal(false)} loading={deleteLoading} />}
      <article
        id={`post-${post._id}`}
        className={`group relative rounded-3xl border bg-card/60 backdrop-blur-xl shadow-sm transition-all duration-300
          ${isFlashing
            ? "border-emerald-500/60 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/15"
            : isUnread
              ? "border-emerald-500/35 shadow-md shadow-emerald-500/8 hover:border-emerald-500/45"
              : "border-border/40 hover:border-emerald-500/25 hover:shadow-lg hover:shadow-emerald-500/5"}`}
      >
        {/* Unread accent rail */}
        {isUnread && !isFlashing && (
          <span className="pointer-events-none absolute left-0 top-5 bottom-5 w-0.75 rounded-full bg-linear-to-b from-emerald-500 to-emerald-500/30" />
        )}
        <div className="p-5 space-y-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative">
                <Avatar className="h-10 w-10 shrink-0 ring-1 ring-border/40">
                  <AvatarImage src={post.authorAvatar} />
                  <AvatarFallback className="bg-emerald-600 text-white text-xs font-semibold">{ini(post.authorName)}</AvatarFallback>
                </Avatar>
                <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ${roleDot} border-2 border-card`} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold tracking-tight truncate leading-none">{post.authorName}</p>
                  <Badge variant="outline" className={`text-[8px] h-4 px-1.5 rounded-full capitalize font-medium leading-none border ${ROLE_COLORS[post.authorRole] ?? ROLE_COLORS.employee}`}>
                    {post.authorRole}
                  </Badge>
                  {isUnread && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/12 border border-emerald-500/30 px-1.5 h-4 text-[8px] font-semibold uppercase tracking-wide text-emerald-600 leading-none">
                      <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" /> New
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <p className="text-[10px] text-muted-foreground/55 cursor-default" title={fullDate(post.createdAt)}>{timeAgo(post.createdAt)}</p>
                  {post.isEdited && <span className="text-[10px] text-muted-foreground/40 italic">· edited</span>}
                  {isUnread && (
                    <button
                      type="button"
                      onClick={() => onMarkRead(post._id)}
                      className="text-[10px] font-medium text-muted-foreground/45 hover:text-emerald-600 transition-colors"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            </div>
            {(canEdit || canDelete) && !isEditing && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0 hover:bg-muted/60">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 rounded-2xl border-border/40 shadow-xl p-1 bg-card/95 backdrop-blur-xl">
                  {canEdit && (
                    <DropdownMenuItem className="rounded-xl text-xs h-8 gap-2.5 cursor-pointer font-medium" onClick={() => { setIsEditing(true); setEditContent(stripMentions(post.content)) }}>
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" /> Edit post
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem className="rounded-xl text-xs h-8 gap-2.5 cursor-pointer text-rose-500 focus:text-rose-500 focus:bg-rose-500/5 font-medium" onClick={() => setShowDeleteModal(true)}>
                      <Trash2 className="h-3.5 w-3.5" /> Delete post
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Content */}
          {isEditing ? (
            <div className="space-y-3">
              <div className="relative">
                <MentionSuggestions mention={editMention} placement="bottom" />
                <textarea
                  ref={editRef} value={editContent}
                  onChange={(e) => { setEditContent(e.target.value); setEditError(""); editMention.detect(e.target.value) }}
                  onKeyDown={(e) => { editMention.onKeyDown(e) }}
                  onBlur={() => setTimeout(editMention.close, 150)}
                  rows={4} maxLength={5000}
                  className="w-full rounded-2xl border border-border/40 bg-muted/20 text-sm p-3.5 pr-10 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/25 leading-relaxed"
                />
                {preferNativeEmoji ? (
                  <button type="button" onClick={() => editRef.current?.focus()} className="absolute bottom-3 right-3 text-muted-foreground/30 hover:text-muted-foreground/70 transition-colors" title="Emoji">
                    <Smile className="h-4 w-4" />
                  </button>
                ) : (
                  <Popover open={showEmojiEdit} onOpenChange={setShowEmojiEdit}>
                    <PopoverTrigger asChild>
                      <button type="button" className="absolute bottom-3 right-3 text-muted-foreground/30 hover:text-muted-foreground/70 transition-colors">
                        <Smile className="h-4 w-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="top" align="end" sideOffset={8} collisionPadding={8} className="w-auto border-none bg-transparent p-0 shadow-none">
                      <div className="rounded-2xl border border-border/40 bg-card/95 shadow-2xl overflow-hidden">
                        <EmojiPicker theme={"auto" as Theme} onEmojiClick={(e: EmojiClickData) => { setEditContent((p) => p + e.emoji); setShowEmojiEdit(false) }} height={380} width={320} />
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              {editError && <p className="text-xs text-rose-500">{editError}</p>}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground/55 tabular-nums">{editContent.length}/5000</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="h-8 rounded-xl text-xs gap-1.5 font-medium" onClick={() => { setIsEditing(false); setEditError("") }} disabled={editLoading}>
                    <X className="h-3.5 w-3.5" /> Cancel
                  </Button>
                  <Button size="sm" className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5 font-semibold px-4" onClick={handleSave} disabled={editLoading || !editContent.trim()}>
                    {editLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {post.content && <p className="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word text-foreground/85">{renderWithMentions(post.content)}</p>}
              {!!post.attachments?.length && <AttachmentGrid attachments={post.attachments} />}
            </>
          )}

          {/* Action row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/20">
            <ReactionBar targetType="post" targetId={post._id} token={token} reactionState={reactionState} onReactionChange={onReactionChange} />
            <button
              type="button"
              onClick={handleFocusComment}
              className="flex items-center gap-2 rounded-full border border-border/40 bg-muted/20 px-3 py-1.5 text-xs font-medium text-muted-foreground/70 hover:text-emerald-600 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all duration-150"
            >
              <MessageCircle className="h-3.5 w-3.5" /> Comment
              {comments.length > 0 && (
                <span className="ml-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 tabular-nums">
                  {comments.length}
                </span>
              )}
            </button>
          </div>

          <CommentSection
            post={post} currentUser={currentUser} token={token}
            comments={comments} setComments={setComments}
            commentReactions={commentReactions} setCommentReactions={setCommentReactions}
            inputId={commentInputId}
            mentionCandidates={mentionCandidates}
          />
        </div>
      </article>
    </>
  )
}

// --- Post Composer ------------------------------------------------------------

function Composer({ currentUser, token, onPosted, mentionCandidates }: {
  currentUser: CrmUser; token: string; onPosted: (post: Post) => void
  mentionCandidates: MentionCandidate[]
}) {
  const [content, setContent] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [showEmoji, setShowEmoji] = React.useState(false)
  const [isFocused, setIsFocused] = React.useState(false)
  const [pendingFiles, setPendingFiles] = React.useState<File[]>([])
  const preferNativeEmoji = usePreferNativeEmojiPicker()
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const mention = useMentions({
    value: content,
    setValue: (v) => { setContent(v); setError("") },
    textareaRef,
    candidates: mentionCandidates,
  })

  const addFiles = (incoming: File[]) => {
    if (!incoming.length) return
    if (pendingFiles.length + incoming.length > MAX_FEED_ATTACHMENTS) {
      setError(`You can attach up to ${MAX_FEED_ATTACHMENTS} files.`)
      return
    }
    const oversized = incoming.find((f) => f.size > MAX_FEED_ATTACHMENT_SIZE_BYTES)
    if (oversized) {
      setError(`${oversized.name} exceeds 25 MB.`)
      return
    }
    setPendingFiles((prev) => [...prev, ...incoming])
    setError("")
  }

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []))
    e.target.value = ""
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const imageFiles = Array.from(e.clipboardData?.items || [])
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((f): f is File => !!f)
    if (imageFiles.length) addFiles(imageFiles)
  }

  const handleSubmit = async () => {
    if (!content.trim() && pendingFiles.length === 0) { setError("Write something first!"); return }
    if (content.trim().length > 5000) { setError("Post content cannot exceed 5000 characters"); return }
    setLoading(true); setError("")
    try {
      // Convert clean "@Name" text into storage tokens only now, at submit.
      const payload = serializeMentions(content.trim(), mentionCandidates)
      let res
      if (pendingFiles.length > 0) {
        // Has attachments ? multipart
        const formData = new FormData()
        formData.append("content", payload)
        pendingFiles.forEach((f) => formData.append("files", f))
        res = await apiClient.post("/api/crm/feeds", formData)
      } else {
        // Text-only ? plain JSON (matches the proven-working comment/reaction path)
        res = await apiClient.post("/api/crm/feeds", { content: payload })
      }
      onPosted(res.data?.data?.post || res.data?.post)
      setContent(""); setPendingFiles([]); textareaRef.current?.blur(); setIsFocused(false)
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to post")
    } finally { setLoading(false) }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mention.onKeyDown(e)) return
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); handleSubmit() }
  }

  const shownLength = content.length

  return (
    <div className={`relative rounded-3xl border bg-card/60 backdrop-blur-xl shadow-sm transition-all duration-200 ${isFocused ? "border-emerald-500/35 shadow-lg shadow-emerald-500/10" : "border-border/40"}`}>
      <div className="flex items-center justify-between px-5 pt-4 pb-1">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-muted-foreground/70">Share an update</span>
        </div>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground/40">
          <AtSign className="h-3 w-3" /> mention teammates or everyone
        </span>
      </div>

      <div className="flex items-start gap-3 px-5 pb-2">
        <Avatar className="h-9 w-9 shrink-0 mt-1 ring-1 ring-emerald-500/25">
          <AvatarImage src={currentUser.avatar} />
          <AvatarFallback className="bg-emerald-600 text-white text-xs font-semibold">{ini(currentUser.fullName)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 relative">
          <MentionSuggestions mention={mention} placement="bottom" />
          <textarea
            ref={textareaRef} value={content}
            onChange={(e) => { setContent(e.target.value); setError(""); mention.detect(e.target.value) }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => { setIsFocused(false); setTimeout(mention.close, 150) }}
            onKeyDown={handleKey}
            onPaste={handlePaste}
            placeholder={`What's happening, ${currentUser.fullName.split(" ")[0]}?`}
            rows={isFocused || content ? 4 : 2} maxLength={5000}
            className="w-full bg-transparent text-sm leading-relaxed resize-none focus:outline-none placeholder:text-muted-foreground/40 transition-all duration-200"
          />
        </div>
      </div>

      {pendingFiles.length > 0 && <PendingAttachments files={pendingFiles} onRemove={(i) => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))} />}

      <div className="flex items-center justify-between px-5 pb-4 border-t border-border/20 pt-3">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1.5 transition-colors text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/40" title="Attach file">
            <Paperclip className="h-4 w-4" /> Attach
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFilePick} />
          <button
            type="button"
            title="Mention someone"
            onMouseDown={(e) => {
              e.preventDefault()
              const el = textareaRef.current
              if (!el) return
              const caret = el.selectionStart ?? content.length
              const needsSpace = caret > 0 && !/\s$/.test(content.slice(0, caret))
              const inserted = `${needsSpace ? " " : ""}@`
              const next = content.slice(0, caret) + inserted + content.slice(caret)
              setContent(next)
              requestAnimationFrame(() => {
                el.focus()
                const pos = caret + inserted.length
                el.setSelectionRange(pos, pos)
                mention.detect(next)
              })
            }}
            className="flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1.5 transition-colors text-muted-foreground/60 hover:text-emerald-600 hover:bg-emerald-500/5"
          >
            <AtSign className="h-4 w-4" /> Mention
          </button>
          {preferNativeEmoji ? (
            <button type="button" onClick={() => textareaRef.current?.focus()} className="flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1.5 transition-colors text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/40" title="Emoji">
              <Smile className="h-4 w-4" /> Emoji
            </button>
          ) : (
            <Popover open={showEmoji} onOpenChange={setShowEmoji}>
              <PopoverTrigger asChild>
                <button type="button" className={`flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1.5 transition-colors ${showEmoji ? "bg-emerald-500/10 text-emerald-600" : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/40"}`}>
                  <Smile className="h-4 w-4" /> Emoji
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" sideOffset={8} collisionPadding={8} className="w-auto border-none bg-transparent p-0 shadow-none">
                <div className="rounded-2xl border border-border/40 bg-card/95 shadow-2xl overflow-hidden">
                  <EmojiPicker theme={"auto" as Theme} onEmojiClick={(e: EmojiClickData) => { setContent((p) => p + e.emoji); setShowEmoji(false); textareaRef.current?.focus() }} height={380} width={320} />
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
        <div className="flex items-center gap-3">
          {content.length > 0 && (
            <span className={`text-[10px] tabular-nums font-medium transition-colors ${shownLength > 4500 ? "text-rose-500" : "text-muted-foreground/55"}`}>
              {shownLength}/5000
            </span>
          )}
          <Button onClick={handleSubmit} disabled={loading || (!content.trim() && pendingFiles.length === 0)} size="sm" className="h-8 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold gap-2 px-4 disabled:opacity-30 transition-all">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Post
          </Button>
        </div>
      </div>
      {error && <p className="text-xs text-rose-500 px-5 pb-3">{error}</p>}
      {content && !error && <p className="text-[10px] text-muted-foreground/40 px-5 pb-3">?/Ctrl + Enter to post</p>}
    </div>
  )
}

// --- Activity Panel (mentions & comments on your posts) -----------------------

const NOTIF_META: Record<FeedNotificationItem["type"], { icon: React.ReactNode; text: string; iconBg: string }> = {
  mention_post: {
    icon: <AtSign className="h-3.5 w-3.5 text-emerald-600" />,
    text: "mentioned you in a post",
    iconBg: "bg-emerald-500/12 border-emerald-500/25",
  },
  mention_comment: {
    icon: <AtSign className="h-3.5 w-3.5 text-emerald-600" />,
    text: "mentioned you in a comment",
    iconBg: "bg-emerald-500/12 border-emerald-500/25",
  },
  comment_on_post: {
    icon: <MessageCircle className="h-3.5 w-3.5 text-sky-500" />,
    text: "commented on your post",
    iconBg: "bg-sky-500/12 border-sky-500/25",
  },
  all_announcement: {
    icon: <Megaphone className="h-3.5 w-3.5 text-amber-500" />,
    text: "posted an announcement for everyone",
    iconBg: "bg-amber-500/12 border-amber-500/25",
  },
}

function ActivityPanel({ items, loading, onItemClick, onMarkAllRead, onClose }: {
  items: FeedNotificationItem[]
  loading: boolean
  onItemClick: (n: FeedNotificationItem) => void
  onMarkAllRead: () => void
  onClose: () => void
}) {
  const hasUnread = items.some((n) => !n.readAt)
  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-88 max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-border/50 bg-card/95 backdrop-blur-2xl shadow-2xl shadow-black/30">
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-3.5 w-3.5 text-emerald-500" />
          <h3 className="text-sm font-semibold tracking-tight">Activity</h3>
        </div>
        <div className="flex items-center gap-1">
          {hasUnread && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold text-emerald-600 hover:bg-emerald-500/10 transition-colors"
            >
              <CheckCheck className="h-3 w-3" /> Mark all read
            </button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-muted/60" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="max-h-104 overflow-y-auto p-1.5">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/40" />
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-dashed border-border/30">
              <Bell className="h-4 w-4 text-muted-foreground/25" />
            </div>
            <p className="text-xs text-muted-foreground/50">No activity yet.</p>
            <p className="text-[10px] text-muted-foreground/40 max-w-60">Mentions, comments on your posts, and team-wide announcements will show up here.</p>
          </div>
        )}
        {!loading && items.map((n) => {
          const meta = NOTIF_META[n.type] ?? NOTIF_META.comment_on_post
          const unread = !n.readAt
          return (
            <button
              key={n._id}
              type="button"
              onClick={() => onItemClick(n)}
              className={`flex w-full items-start gap-2.5 rounded-2xl px-2.5 py-2.5 text-left transition-colors hover:bg-muted/40 ${unread ? "bg-emerald-500/5" : ""}`}
            >
              <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${meta.iconBg}`}>
                {meta.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs leading-snug text-foreground/85">
                  <span className="font-semibold">{n.actorName}</span>{" "}
                  <span className="text-muted-foreground/70">{meta.text}</span>
                </p>
                {n.snippet && (
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground/55">“{n.snippet}”</p>
                )}
                <p className="mt-1 text-[10px] text-muted-foreground/45" title={fullDate(n.createdAt)}>{timeAgo(n.createdAt)}</p>
              </div>
              {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// --- Tab Bar ------------------------------------------------------------------

function TabBar({ active, onChange }: { active: FeedTab; onChange: (t: FeedTab) => void }) {
  return (
    <div className="flex items-center gap-1 border-b border-border/30">
      {(
        [
          { key: "feeds", label: "Team Feeds", icon: <Rss className="h-3.5 w-3.5" /> },
          { key: "daypulse", label: "DayPulse", icon: <BarChart2 className="h-3.5 w-3.5" /> },
        ] as { key: FeedTab; label: string; icon: React.ReactNode }[]
      ).map(({ key, label, icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-all
            ${active === key
              ? "text-emerald-600"
              : "text-muted-foreground/60 hover:text-muted-foreground"
            }`}
        >
          {icon}
          {label}
          {active === key && (
            <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-emerald-500" />
          )}
        </button>
      ))}
    </div>
  )
}

// --- Feed Page ----------------------------------------------------------------

const PAGE_LIMIT = 10
const INIT_TIMEOUT_MS = 15000

export default function FeedsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = React.useState<FeedTab>("feeds")
  const [currentUser, setCurrentUser] = React.useState<CrmUser | null>(null)
  const [token, setToken] = React.useState("")
  const [posts, setPosts] = React.useState<Post[]>([])
  const [postReactions, setPostReactions] = React.useState<Record<string, ReactionState>>({})
  const [page, setPage] = React.useState(1)
  const [hasMore, setHasMore] = React.useState(false)
  const [loadingInit, setLoadingInit] = React.useState(true)
  const [initError, setInitError] = React.useState<string | null>(null)
  const [initAttempt, setInitAttempt] = React.useState(0)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const [refreshing, setRefreshing] = React.useState(false)
  const [newPostCount, setNewPostCount] = React.useState(0)
  const observerRef = React.useRef<HTMLDivElement>(null)
  const socketRef = React.useRef<any>(null)
  const ssSocketRef = React.useRef<any>(null)

  // -- Notification system state --
  const badge = useFeedBadge()
  /** Watermark from the PREVIOUS visit — posts newer than this render as unread. */
  const [unreadSince, setUnreadSince] = React.useState<string | null>(null)
  /** Posts the user marked read during this visit (client-side overlay). */
  const [locallyRead, setLocallyRead] = React.useState<Set<string>>(new Set())
  const [flashPostId, setFlashPostId] = React.useState<string | null>(null)
  const [mentionCandidates, setMentionCandidates] = React.useState<MentionCandidate[]>([])
  const [activityOpen, setActivityOpen] = React.useState(false)
  const [activityItems, setActivityItems] = React.useState<FeedNotificationItem[]>([])
  const [activityLoading, setActivityLoading] = React.useState(false)
  const activityFetchedRef = React.useRef(false)
  const activityWrapRef = React.useRef<HTMLDivElement>(null)
  const autoScrolledRef = React.useRef(false)
  const flashTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const isUnreadPost = React.useCallback((post: Post): boolean => {
    if (!unreadSince || !currentUser) return false
    if (post.userId === currentUser._id) return false
    if (locallyRead.has(post._id)) return false
    return new Date(post.createdAt).getTime() > new Date(unreadSince).getTime()
  }, [unreadSince, currentUser, locallyRead])

  const scrollToPost = React.useCallback((postId: string) => {
    if (typeof document === "undefined") return
    const el = document.getElementById(`post-${postId}`)
    if (!el) return
    el.scrollIntoView({ behavior: "smooth", block: "center" })
    setFlashPostId(postId)
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    flashTimerRef.current = setTimeout(() => setFlashPostId(null), 2500)
  }, [])

  const fetchPosts = React.useCallback(async (pg: number, signal?: AbortSignal) => {
    const res = await apiClient.get(`/api/crm/feeds?page=${pg}&limit=${PAGE_LIMIT}`, { signal })
    const d = res.data?.data || res.data || {}
    return {
      posts: Array.isArray(d.posts) ? d.posts as Post[] : [],
      hasMore: Boolean(d.hasMore),
    }
  }, [])

  const fetchReactions = React.useCallback(async (targetIds: string[], signal?: AbortSignal) => {
    if (targetIds.length === 0) return {} as Record<string, ReactionState>
    try {
      const res = await apiClient.post(
        "/api/crm/feeds/reactions/bulk",
        { targetIds },
        { signal }
      )
      return res.data?.data?.reactions || {}
    } catch {
      return {} as Record<string, ReactionState>
    }
  }, [])

  React.useEffect(() => {
    let active = true
    const controller = new AbortController()
    let didTimeout = false

    const timeoutId = setTimeout(() => {
      didTimeout = true
      controller.abort()
      if (!active) return
      setInitError("Initialization is taking too long. Please check your connection and retry.")
      setLoadingInit(false)
    }, INIT_TIMEOUT_MS)

    const init = async () => {
      setLoadingInit(true)
      setInitError(null)
      setCurrentUser(null)
      setToken("")
      setPosts([])
      setPostReactions({})
      setHasMore(false)
      setPage(1)
      setNewPostCount(0)
      setUnreadSince(null)
      setLocallyRead(new Set())
      autoScrolledRef.current = false

      const t = localStorage.getItem("crm_token")
      if (!t) {
        if (!active) return
        setInitError("Session expired. Please sign in again.")
        setLoadingInit(false)
        router.replace("/crm")
        return
      }

      try {
        // Fetch the user profile and first feed page in parallel. The previous
        // implementation waited for the profile, posts, and reactions one after
        // another, which kept the entire page behind the full-screen loader.
        const [meRes, feedPage] = await Promise.all([
          apiClient.get("/api/crm/me", { signal: controller.signal }),
          fetchPosts(1, controller.signal),
        ])
        if (!active) return

        const me = meRes.data?.data || meRes.data
        if (!me?._id) throw new Error("User profile missing from response")

        setCurrentUser(me)
        setToken(t)
        setPosts(feedPage.posts)
        setHasMore(feedPage.hasMore)
        setLoadingInit(false)

        // Reactions are useful but must not block the first usable render.
        fetchReactions(feedPage.posts.map((post) => post._id), controller.signal)
          .then((reactions) => { if (active) setPostReactions(reactions) })

        // Read-state, badge refresh, and mention candidates are all background work.
        apiClient.post("/api/crm/feeds/read-state", {}, { signal: controller.signal })
          .then((rs) => {
            const prev = rs.data?.data?.previousLastSeenAt
            if (active && prev) setUnreadSince(prev)
          })
          .catch(() => { })
          .finally(() => {
            clearUnseenPosts()
            refreshFeedBadge()
          })

        apiClient.get("/api/crm/feeds/mention-candidates", { signal: controller.signal })
          .then((res) => {
            if (!active) return
            const users: MentionCandidate[] = res.data?.data?.users || []
            setMentionCandidates(users.filter((u) => u._id !== me._id))
          })
          .catch(() => { })
      } catch (err: any) {
        if (!active || controller.signal.aborted || didTimeout) return
        const status = err?.response?.status
        if (status === 401 || status === 403) {
          localStorage.removeItem("crm_token")
          localStorage.removeItem("crm_user")
          setInitError("Session expired. Please sign in again.")
          router.replace("/crm")
          return
        }
        const message = err?.response?.data?.message || err?.message || "Failed to initialize Feeds."
        setInitError(message)
      } finally {
        if (!active) return
        clearTimeout(timeoutId)
        setLoadingInit(false)
      }
    }

    init()
    return () => {
      active = false
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [router, fetchPosts, fetchReactions, initAttempt])

  // Auto-scroll to the OLDEST unread post once the first page has rendered.
  React.useEffect(() => {
    if (loadingInit || !unreadSince || autoScrolledRef.current || activeTab !== "feeds") return
    const unread = posts.filter(isUnreadPost)
    if (unread.length === 0) return
    // Posts are sorted newest-first, so the oldest unread is the last match.
    const target = unread[unread.length - 1]
    autoScrolledRef.current = true
    const id = setTimeout(() => scrollToPost(target._id), 300)
    return () => clearTimeout(id)
  }, [loadingInit, unreadSince, posts, isUnreadPost, scrollToPost, activeTab])

  React.useEffect(() => {
    if (!token || typeof window === "undefined") return
    import("socket.io-client").then(({ io }) => {
      const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "", {
        auth: { token }, path: "/socket.io", transports: ["websocket"],
      })
      socket.on("feed:new", ({ post }: { post: Post }) => {
        setPosts((prev) => { if (prev.some((p) => p._id === post._id)) return prev; setNewPostCount((c) => c + 1); return prev })
      })
      socket.on("feed:updated", ({ post }: { post: Post }) => {
        setPosts((prev) => prev.map((p) => (p._id === post._id ? post : p)))
      })
      socket.on("feed:deleted", ({ postId }: { postId: string }) => {
        setPosts((prev) => prev.filter((p) => p._id !== postId))
      })
      socket.on("feed:reactions_updated", ({ targetType, targetId, summary }: { targetType: "post" | "comment"; targetId: string; summary: ReactionSummary }) => {
        if (targetType === "post") {
          setPostReactions((prev) => ({ ...prev, [targetId]: { summary, myReaction: prev[targetId]?.myReaction ?? null } }))
        }
      })
      // Targeted notification for THIS user (mention / comment / announcement).
      // The badge count itself is bumped by the feed-notification store's own
      // socket — here we only keep the Activity panel list fresh.
      socket.on("feed:notify", ({ notification }: { notification: FeedNotificationItem }) => {
        if (!notification?._id) return
        setActivityItems((prev) => prev.some((n) => n._id === notification._id) ? prev : [notification, ...prev])
      })
      socketRef.current = socket
    }).catch(() => { })
    return () => { socketRef.current?.disconnect() }
  }, [token])

  // SupraSpace socket — receives milestone feed:new announcements
  React.useEffect(() => {
    if (!token || typeof window === "undefined") return
    import("socket.io-client").then(({ io }) => {
      const ssSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "", {
        auth: { token }, path: "/socket/supraspace", transports: ["websocket"],
      })
      ssSocket.on("feed:new", ({ post }: { post: Post }) => {
        setPosts((prev) => { if (prev.some((p) => p._id === post._id)) return prev; setNewPostCount((c) => c + 1); return prev })
      })
      ssSocketRef.current = ssSocket
    }).catch(() => { })
    return () => { ssSocketRef.current?.disconnect() }
  }, [token])

  React.useEffect(() => {
    if (!token) return
    const id = setInterval(async () => {
      try {
        const res = await apiClient.get(`/api/crm/feeds?page=1&limit=${PAGE_LIMIT}`)
        const fresh: Post[] = res.data?.data?.posts || []
        setPosts((prev) => {
          const prevIds = new Set(prev.map((p) => p._id))
          const newOnes = fresh.filter((p) => !prevIds.has(p._id))
          if (newOnes.length) setNewPostCount((c) => c + newOnes.length)
          return prev.map((p) => fresh.find((f) => f._id === p._id) ?? p)
        })
      } catch { }
    }, 30_000)
    return () => clearInterval(id)
  }, [token])

  React.useEffect(() => {
    if (activeTab !== "feeds") return
    if (!observerRef.current) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && hasMore && !loadingMore) loadMore() },
      { threshold: 0.5 }
    )
    obs.observe(observerRef.current)
    return () => obs.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore, posts, activeTab])

  // Close the Activity panel on outside click.
  React.useEffect(() => {
    if (!activityOpen) return
    function handle(e: MouseEvent) {
      if (activityWrapRef.current && !activityWrapRef.current.contains(e.target as Node)) {
        setActivityOpen(false)
      }
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [activityOpen])

  const loadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const next = page + 1
    try {
      const { posts: morePosts, hasMore: moreHasMore } = await fetchPosts(next)
      setPosts((prev) => { const ids = new Set(prev.map((p) => p._id)); return [...prev, ...morePosts.filter((p) => !ids.has(p._id))] })
      setHasMore(moreHasMore); setPage(next)
      fetchReactions(morePosts.map((post) => post._id))
        .then((reactions) => setPostReactions((prev) => ({ ...prev, ...reactions })))
    } catch { }
    finally { setLoadingMore(false) }
  }

  const handleRefresh = async () => {
    setRefreshing(true); setNewPostCount(0)
    try {
      const { posts, hasMore } = await fetchPosts(1)
      setPosts(posts); setHasMore(hasMore); setPage(1)
      fetchReactions(posts.map((post) => post._id)).then(setPostReactions)
      // The refreshed page is now "seen": advance the watermark and clear the
      // sidebar badge, but keep `unreadSince` from this visit so freshly
      // arrived posts still carry their "New" pill until read/navigated away.
      try { await apiClient.post("/api/crm/feeds/read-state", {}) } catch { }
      clearUnseenPosts()
      refreshFeedBadge()
    } catch { }
    finally { setRefreshing(false) }
  }

  const handleMarkPostRead = async (postId: string) => {
    setLocallyRead((prev) => { const next = new Set(prev); next.add(postId); return next })
    try {
      await apiClient.post("/api/crm/feeds/read-state/posts", { postIds: [postId] })
      refreshFeedBadge()
    } catch { }
  }

  const openActivity = async () => {
    const willOpen = !activityOpen
    setActivityOpen(willOpen)
    if (!willOpen) return
    if (activityFetchedRef.current && activityItems.length > 0) return
    setActivityLoading(true)
    try {
      const res = await apiClient.get("/api/crm/feeds/notifications?page=1&limit=30")
      setActivityItems(res.data?.data?.notifications || [])
      activityFetchedRef.current = true
    } catch { }
    finally { setActivityLoading(false) }
  }

  const handleActivityItemClick = async (n: FeedNotificationItem) => {
    setActivityOpen(false)
    if (!n.readAt) {
      setActivityItems((prev) => prev.map((x) => x._id === n._id ? { ...x, readAt: new Date().toISOString() } : x))
      decrementFeedNotifications(1)
      apiClient.patch("/api/crm/feeds/notifications/read", { ids: [n._id] }).catch(() => { })
    }
    setActiveTab("feeds")
    // Deep-link to the post: scroll if loaded, otherwise refresh page 1 first
    // (comment/announcement targets are usually recent). Older DayPulse or
    // paged-out targets simply won't scroll — the row itself carries context.
    if (posts.some((p) => p._id === n.postId)) {
      setTimeout(() => scrollToPost(n.postId), 100)
      return
    }
    try {
      const { posts: fresh, hasMore } = await fetchPosts(1)
      setPosts(fresh); setHasMore(hasMore); setPage(1)
      fetchReactions(fresh.map((post) => post._id)).then(setPostReactions)
      setTimeout(() => scrollToPost(n.postId), 300)
    } catch { }
  }

  const handleMarkAllActivityRead = async () => {
    setActivityItems((prev) => prev.map((x) => x.readAt ? x : { ...x, readAt: new Date().toISOString() }))
    clearFeedNotificationsBadge()
    try {
      await apiClient.patch("/api/crm/feeds/notifications/read", {})
      refreshFeedBadge()
    } catch { }
  }

  // -- Loading screen ----------------------------------------------------------
  if (loadingInit) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-5">
          <div className="relative h-14 w-14">
            <div className="absolute inset-0 rounded-full border-2 border-border/15" />
            <div className="absolute inset-0 rounded-full border-2 border-t-emerald-500 border-r-emerald-500/40 border-b-transparent border-l-transparent animate-spin" />
            <div className="absolute inset-2.5 rounded-full bg-emerald-500/5 flex items-center justify-center">
              <Car className="h-4 w-4 text-emerald-500/70" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-muted-foreground/80">Loading your feed</p>
            <p className="text-xs text-muted-foreground/50">Action Auto CRM</p>
          </div>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    const message = initError || "We could not load your profile. Please try again."
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4 max-w-md px-6 text-center">
          <div className="h-14 w-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
            <X className="h-6 w-6 text-rose-500/70" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground/80">Initialization failed</p>
            <p className="text-xs text-muted-foreground/60 leading-relaxed">{message}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="h-9 rounded-xl text-xs font-medium px-4" onClick={() => setInitAttempt((v) => v + 1)}>
              Retry
            </Button>
            <Button size="sm" variant="outline" className="h-9 rounded-xl text-xs font-medium px-4" onClick={() => router.replace("/crm")}>
              Sign in
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-background">

      {/* -- Sticky header -- */}
      <header className="sticky top-0 z-40 w-full border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center gap-4 h-14 px-6 max-w-screen-2xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full shrink-0 hover:bg-muted/60"
            onClick={() => router.push("/crm/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-3 flex-1">
            <p className="text-sm font-semibold tracking-tight leading-none">
              {activeTab === "feeds" ? "Team Feeds" : "DayPulse"}
            </p>
          </div>

          {/* Activity bell — mentions, comments on your posts, announcements */}
          <div ref={activityWrapRef} className="relative shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 rounded-full hover:bg-muted/60 ${activityOpen ? "bg-emerald-500/10 text-emerald-600" : ""}`}
              onClick={openActivity}
              title="Activity"
            >
              <Bell className="h-3.5 w-3.5" />
            </Button>
            {badge.unreadNotifications > 0 && (
              <span className="pointer-events-none absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[9px] font-semibold leading-none text-white tabular-nums">
                {badge.unreadNotifications > 99 ? "99+" : badge.unreadNotifications}
              </span>
            )}
            {activityOpen && (
              <ActivityPanel
                items={activityItems}
                loading={activityLoading}
                onItemClick={handleActivityItemClick}
                onMarkAllRead={handleMarkAllActivityRead}
                onClose={() => setActivityOpen(false)}
              />
            )}
          </div>

          {activeTab === "feeds" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full shrink-0 hover:bg-muted/60"
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-emerald-500" : ""}`} />
            </Button>
          )}
        </div>

        <div className="px-6 max-w-screen-2xl mx-auto">
          <TabBar active={activeTab} onChange={setActiveTab} />
        </div>
      </header>

      {/* -- Main content -- */}
      <main className="relative max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-20">
        {/* Ambient background glow */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(800px_circle_at_20%_0%,rgba(16,185,129,0.05),transparent_55%),radial-gradient(700px_circle_at_80%_10%,rgba(16,185,129,0.035),transparent_55%)]" />

        {/* -- Team Feeds tab -- */}
        {activeTab === "feeds" && (
          <>
            {initError && (
              <div className="flex flex-col gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                    <RefreshCw className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-emerald-700">Feeds not ready</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">{initError}</p>
                  </div>
                </div>
                <div>
                  <Button variant="outline" className="h-8 rounded-xl text-xs font-medium" onClick={() => setInitAttempt((v) => v + 1)}>
                    Retry initialization
                  </Button>
                </div>
              </div>
            )}
            {/* New posts banner */}
            {newPostCount > 0 && (
              <button
                onClick={handleRefresh}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 hover:bg-emerald-500/10 py-3 text-sm font-medium text-emerald-600 transition-all hover:border-emerald-500/40"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {newPostCount} new {newPostCount === 1 ? "post" : "posts"} — tap to refresh
              </button>
            )}

            <Composer currentUser={currentUser} token={token} mentionCandidates={mentionCandidates} onPosted={(p) => {
              setPosts((prev) => [p, ...prev])
              setPostReactions((prev) => ({ ...prev, [p._id]: { summary: {}, myReaction: null } }))
            }} />

            <Divider label="Latest" />

            {/* Posts list */}
            {posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-5 py-24">
                <div className="relative h-20 w-20">
                  <div className="absolute inset-0 rounded-3xl border-2 border-dashed border-border/25" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Car className="h-8 w-8 text-muted-foreground/15" />
                  </div>
                </div>
                <div className="text-center space-y-1.5">
                  <p className="text-sm font-medium text-muted-foreground/70">Nothing here yet</p>
                  <p className="text-xs text-muted-foreground/50">Be the first to post something.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard
                    key={post._id} post={post} currentUser={currentUser} token={token}
                    onUpdated={(u) => setPosts((prev) => prev.map((p) => (p._id === u._id ? u : p)))}
                    onDeleted={(id) => { setPosts((prev) => prev.filter((p) => p._id !== id)); setPostReactions((prev) => { const n = { ...prev }; delete n[id]; return n }) }}
                    reactionState={postReactions[post._id] ?? { summary: {}, myReaction: null }}
                    onReactionChange={(state) => setPostReactions((prev) => ({ ...prev, [post._id]: state }))}
                    mentionCandidates={mentionCandidates}
                    isUnread={isUnreadPost(post)}
                    isFlashing={flashPostId === post._id}
                    onMarkRead={handleMarkPostRead}
                  />
                ))}
              </div>
            )}

            <div ref={observerRef} className="h-1" />

            {loadingMore && (
              <div className="flex justify-center py-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/40" />
                  <span className="text-xs font-medium text-muted-foreground/60">Loading</span>
                </div>
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <Divider label="You're all caught up" className="py-4" />
            )}

            {hasMore && !loadingMore && (
              <Button
                variant="outline"
                className="w-full rounded-2xl h-10 text-xs font-medium gap-2 border-border/30 hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-emerald-600 transition-all"
                onClick={loadMore}
              >
                <ChevronDown className="h-4 w-4" /> Load more
              </Button>
            )}
          </>
        )}

        {/* -- DayPulse tab -- */}
        {activeTab === "daypulse" && (
          <DayPulsePage currentUser={currentUser} token={token} />
        )}
      </main>
    </div>
  )
}
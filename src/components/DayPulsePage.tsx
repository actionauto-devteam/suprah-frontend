"use client"

import * as React from "react"
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Send,
  Smile,
  Trash2,
  Pencil,
  X,
  Check,
  MoreHorizontal,
  CalendarDays,
  Hash,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock3,
  RefreshCw,
  MessageCircle,
  Building2,
  Paperclip,
  Image as ImageIcon,
  FileText,
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
import { apiClient } from "@/lib/api-client"
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react"

// ─── Department definitions ───────────────────────────────────────────────────

export const DEPARTMENTS = [
  { key: "SalesAndFinance", label: "Sales & Finance", color: "emerald" },
  { key: "Accounting", label: "Accounting", color: "sky" },
  { key: "Recon", label: "Recon", color: "amber" },
  { key: "Marketing", label: "Marketing", color: "pink" },
  { key: "OnlineTeam", label: "Online Team", color: "violet" },
  { key: "WebDevTeam", label: "Web Dev", color: "blue" },
  { key: "WholesaleTeam", label: "Wholesale", color: "orange" },
  { key: "BuyingTeam", label: "Buying", color: "teal" },
  { key: "OperationsTeam", label: "Operations", color: "rose" },
  { key: "LotTechTeam", label: "Lot Tech", color: "indigo" },
  { key: "FundingTeam", label: "Funding", color: "lime" },
  { key: "ProspectsTeam", label: "Prospects", color: "cyan" },
  { key: "PriceCheckTeam", label: "Price Check", color: "fuchsia" },
] as const

export type DepartmentKey = typeof DEPARTMENTS[number]["key"]
type DayPulseAttachmentSection = "accomplishment" | "blockers" | "inProgress"

// Color token maps (Tailwind-safe — avoids dynamic class generation)
const DEPT_STYLES: Record<string, {
  tab: string; tabActive: string; badge: string; ring: string; glow: string; dot: string
}> = {
  emerald: { tab: "text-emerald-400/60 hover:text-emerald-400", tabActive: "text-emerald-400 border-b-2 border-emerald-400", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", ring: "ring-emerald-500/30", glow: "shadow-emerald-500/10", dot: "bg-emerald-400" },
  sky: { tab: "text-sky-400/60 hover:text-sky-400", tabActive: "text-sky-400 border-b-2 border-sky-400", badge: "bg-sky-500/10 text-sky-400 border-sky-500/20", ring: "ring-sky-500/30", glow: "shadow-sky-500/10", dot: "bg-sky-400" },
  amber: { tab: "text-amber-400/60 hover:text-amber-400", tabActive: "text-amber-400 border-b-2 border-amber-400", badge: "bg-amber-500/10 text-amber-400 border-amber-500/20", ring: "ring-amber-500/30", glow: "shadow-amber-500/10", dot: "bg-amber-400" },
  pink: { tab: "text-pink-400/60 hover:text-pink-400", tabActive: "text-pink-400 border-b-2 border-pink-400", badge: "bg-pink-500/10 text-pink-400 border-pink-500/20", ring: "ring-pink-500/30", glow: "shadow-pink-500/10", dot: "bg-pink-400" },
  violet: { tab: "text-violet-400/60 hover:text-violet-400", tabActive: "text-violet-400 border-b-2 border-violet-400", badge: "bg-violet-500/10 text-violet-400 border-violet-500/20", ring: "ring-violet-500/30", glow: "shadow-violet-500/10", dot: "bg-violet-400" },
  blue: { tab: "text-blue-400/60 hover:text-blue-400", tabActive: "text-blue-400 border-b-2 border-blue-400", badge: "bg-blue-500/10 text-blue-400 border-blue-500/20", ring: "ring-blue-500/30", glow: "shadow-blue-500/10", dot: "bg-blue-400" },
  orange: { tab: "text-orange-400/60 hover:text-orange-400", tabActive: "text-orange-400 border-b-2 border-orange-400", badge: "bg-orange-500/10 text-orange-400 border-orange-500/20", ring: "ring-orange-500/30", glow: "shadow-orange-500/10", dot: "bg-orange-400" },
  teal: { tab: "text-teal-400/60 hover:text-teal-400", tabActive: "text-teal-400 border-b-2 border-teal-400", badge: "bg-teal-500/10 text-teal-400 border-teal-500/20", ring: "ring-teal-500/30", glow: "shadow-teal-500/10", dot: "bg-teal-400" },
  rose: { tab: "text-rose-400/60 hover:text-rose-400", tabActive: "text-rose-400 border-b-2 border-rose-400", badge: "bg-rose-500/10 text-rose-400 border-rose-500/20", ring: "ring-rose-500/30", glow: "shadow-rose-500/10", dot: "bg-rose-400" },
  indigo: { tab: "text-indigo-400/60 hover:text-indigo-400", tabActive: "text-indigo-400 border-b-2 border-indigo-400", badge: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20", ring: "ring-indigo-500/30", glow: "shadow-indigo-500/10", dot: "bg-indigo-400" },
  lime: { tab: "text-lime-400/60 hover:text-lime-400", tabActive: "text-lime-400 border-b-2 border-lime-400", badge: "bg-lime-500/10 text-lime-400 border-lime-500/20", ring: "ring-lime-500/30", glow: "shadow-lime-500/10", dot: "bg-lime-400" },
  cyan: { tab: "text-cyan-400/60 hover:text-cyan-400", tabActive: "text-cyan-400 border-b-2 border-cyan-400", badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20", ring: "ring-cyan-500/30", glow: "shadow-cyan-500/10", dot: "bg-cyan-400" },
  fuchsia: { tab: "text-fuchsia-400/60 hover:text-fuchsia-400", tabActive: "text-fuchsia-400 border-b-2 border-fuchsia-400", badge: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20", ring: "ring-fuchsia-500/30", glow: "shadow-fuchsia-500/10", dot: "bg-fuchsia-400" },
}

function getDeptStyle(color: string) {
  return DEPT_STYLES[color] ?? DEPT_STYLES.emerald
}

// ─── Shared types ─────────────────────────────────────────────────────────────

interface DayPulseReport {
  _id: string
  userId: string
  authorName: string
  authorAvatar?: string
  authorRole: string
  department: DepartmentKey
  reportDate: string
  accomplishment: string
  blockers: string
  inProgress: string
  attachments?: DayPulseAttachment[]
  isEdited: boolean
  createdAt: string
}

interface DayPulseAttachment {
  url: string
  fileKey: string
  originalName: string
  mimeType: string
  size: number
  thumbnailUrl?: string | null
  section?: DayPulseAttachmentSection
}

interface Comment {
  _id: string
  postId: string
  userId: string
  authorName: string
  authorAvatar?: string
  authorRole: string
  content: string
  createdAt: string
}

interface CrmUser {
  _id: string
  fullName: string
  avatar?: string
  role: string
}

type ReactionType = "like" | "love" | "haha" | "wow" | "sad" | "angry"
interface ReactionSummary { [key: string]: { count: number; users: string[] } }
interface ReactionState { summary: ReactionSummary; myReaction: ReactionType | null }

const REACTIONS = [
  { type: "like" as ReactionType, emoji: "👍", label: "Like", color: "text-blue-500", bg: "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30" },
  { type: "love" as ReactionType, emoji: "❤️", label: "Love", color: "text-red-500", bg: "bg-red-500/10 hover:bg-red-500/20 border-red-500/30" },
  { type: "haha" as ReactionType, emoji: "😂", label: "Haha", color: "text-yellow-500", bg: "bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/30" },
  { type: "wow" as ReactionType, emoji: "😮", label: "Wow", color: "text-yellow-400", bg: "bg-yellow-400/10 hover:bg-yellow-400/20 border-yellow-400/30" },
  { type: "sad" as ReactionType, emoji: "😢", label: "Sad", color: "text-sky-400", bg: "bg-sky-400/10 hover:bg-sky-400/20 border-sky-400/30" },
  { type: "angry" as ReactionType, emoji: "😡", label: "Angry", color: "text-orange-500", bg: "bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/30" },
]
const REACTION_MAP = Object.fromEntries(REACTIONS.map((r) => [r.type, r])) as Record<ReactionType, typeof REACTIONS[0]>

const PAGE_PANEL = "rounded-2xl border border-border/40 bg-card"
const PAGE_SECTION = "rounded-2xl border border-border/40 bg-card"
const MAX_DAYPULSE_ATTACHMENTS_PER_SECTION = 5
const MAX_DAYPULSE_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024
const DAYPULSE_ATTACHMENT_ACCEPT = ".png,.jpg,.jpeg,.webp,.pdf,.doc,.docx,image/png,image/jpeg,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"

const DAYPULSE_ATTACHMENT_FIELDS: Record<DayPulseAttachmentSection, string> = {
  accomplishment: "attachmentsAccomplishment",
  blockers: "attachmentsBlockers",
  inProgress: "attachmentsInProgress",
}

const DAYPULSE_SECTION_CONFIG: Array<{
  key: DayPulseAttachmentSection
  label: string
  icon: React.ReactNode
  placeholder: string
  borderClass: string
  accentClass: string
}> = [
    {
      key: "accomplishment",
      label: "Accomplishment",
      icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
      placeholder: "What did you accomplish today? Include completed tasks, closed deals, resolved issues…",
      borderClass: "bg-emerald-500/5 border-emerald-500/15",
      accentClass: "text-emerald-500",
    },
    {
      key: "blockers",
      label: "Blockers",
      icon: <AlertCircle className="h-3.5 w-3.5 text-red-500" />,
      placeholder: "What obstacles or dependencies are slowing you down? Who do you need help from?",
      borderClass: "bg-red-500/5 border-red-500/15",
      accentClass: "text-red-500",
    },
    {
      key: "inProgress",
      label: "In Progress",
      icon: <Clock3 className="h-3.5 w-3.5 text-amber-500" />,
      placeholder: "What are you actively working on right now? What will you tackle next?",
      borderClass: "bg-amber-500/5 border-amber-500/15",
      accentClass: "text-amber-500",
    },
  ]

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function fullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    year: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

/** Format a YYYY-MM-DD string for display */
function formatReportDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z")
  return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })
}

/** Today as YYYY-MM-DD in local time */
function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const ROLE_COLORS: Record<string, string> = {
  admin: "text-violet-500 bg-violet-500/10 border-violet-500/20",
  manager: "text-sky-500 bg-sky-500/10 border-sky-500/20",
  employee: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
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

function groupDayPulseAttachments(attachments?: DayPulseAttachment[]) {
  const grouped: Record<DayPulseAttachmentSection, DayPulseAttachment[]> = {
    accomplishment: [],
    blockers: [],
    inProgress: [],
  }
  const unassigned: DayPulseAttachment[] = []

  for (const attachment of attachments ?? []) {
    if (attachment.section && attachment.section in grouped) {
      grouped[attachment.section].push(attachment)
    } else {
      unassigned.push(attachment)
    }
  }

  return { grouped, unassigned }
}

function isImageAttachment(attachment: Pick<DayPulseAttachment, "mimeType" | "originalName">) {
  return attachment.mimeType.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(attachment.originalName)
}

function AttachmentPreviewModal({
  attachment,
  heading,
  onClose,
}: {
  attachment: DayPulseAttachment
  heading: string
  onClose: () => void
}) {
  const imageLike = isImageAttachment(attachment)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-border/50 bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border/40 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/45">{heading}</p>
            <h3 className="truncate text-base font-bold text-foreground">{attachment.originalName}</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-[1.6fr_1fr]">
          <div className="rounded-2xl border border-border/40 bg-muted/15 p-3 flex items-center justify-center min-h-65 overflow-hidden">
            {imageLike ? (
              <img
                src={attachment.thumbnailUrl || attachment.url}
                alt={attachment.originalName}
                className="max-h-90 w-full rounded-xl object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-center px-6 py-10">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
                  {attachment.mimeType.includes("pdf") || attachment.mimeType.includes("word") ? (
                    <FileText className="h-7 w-7" />
                  ) : (
                    <ImageIcon className="h-7 w-7" />
                  )}
                </div>
                <p className="max-w-xs text-sm leading-6 text-muted-foreground/70">This file type opens in a new tab for a full preview.</p>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div className="rounded-2xl border border-border/40 bg-muted/15 p-4 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/45">Details</p>
              <p className="text-sm font-medium text-foreground">{attachment.originalName}</p>
              <p className="text-xs text-muted-foreground/60">{formatBytes(attachment.size)}</p>
              <p className="text-xs text-muted-foreground/60">{attachment.mimeType}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Button asChild className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
                <a href={attachment.url} target="_blank" rel="noreferrer">Open attachment</a>
              </Button>
              <Button variant="outline" className="rounded-xl" onClick={onClose}>Close</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Reaction Bar ─────────────────────────────────────────────────────────────

function ReactionBar({
  targetType, targetId, token, reactionState, onReactionChange, compact = false,
}: {
  targetType: "post" | "comment"; targetId: string; token: string
  reactionState: ReactionState; onReactionChange: (s: ReactionState) => void; compact?: boolean
}) {
  const [showPicker, setShowPicker] = React.useState(false)
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
        { targetType, targetId, reaction: type },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const { summary, action } = res.data?.data
      onReactionChange({ summary, myReaction: action === "removed" ? null : type })
    } catch { }
    finally { setLoading(false) }
  }

  const { summary, myReaction } = reactionState
  const total = totalReactions(summary)
  const topEmojis = topReactionEmojis(summary)
  const myMeta = myReaction ? REACTION_MAP[myReaction] : null

  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "mt-0.5"}`}>
      <div className="relative">
        <button
          ref={btnRef}
          disabled={loading}
          onClick={() => setShowPicker((p) => !p)}
          onMouseEnter={() => { hoverTimer.current = setTimeout(() => setShowPicker(true), 400) }}
          onMouseLeave={() => { if (hoverTimer.current) clearTimeout(hoverTimer.current) }}
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all duration-150 select-none
            ${myMeta ? `${myMeta.bg} ${myMeta.color} border-current` : "border-border/30 text-muted-foreground/40 hover:border-border/60 hover:text-muted-foreground/70 hover:bg-muted/30"}
            ${loading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className={compact ? "text-sm" : "text-base leading-none"}>{myMeta ? myMeta.emoji : "👍"}</span>}
          {!compact && <span>{myMeta ? myMeta.label : "React"}</span>}
        </button>
        {showPicker && (
          <div
            ref={pickerRef}
            className="absolute bottom-full left-0 mb-2 z-50 flex items-center gap-1 rounded-full border border-border/40 bg-card/95 backdrop-blur-xl px-2 py-1.5 shadow-2xl shadow-black/20"
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
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-popover border border-border/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity shadow-lg pointer-events-none">
                  {r.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      {total > 0 && (
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1">
            {topEmojis.map((emoji, i) => (
              <span key={i} className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted/60 border border-border/30 text-[11px] leading-none select-none" style={{ zIndex: topEmojis.length - i }}>
                {emoji}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {Object.entries(summary).filter(([, v]) => v.count > 0).sort(([, a], [, b]) => b.count - a.count).map(([type, data]) => {
              const meta = REACTION_MAP[type as ReactionType]
              if (!meta) return null
              return (
                <span key={type} className={`text-[11px] font-semibold cursor-default ${myReaction === type ? meta.color : "text-muted-foreground/40 hover:text-muted-foreground/70"}`}>
                  {data.count}
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({ label = "report", onConfirm, onCancel, loading }: {
  label?: string; onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border/50 bg-card shadow-2xl p-6 space-y-5">
        <div className="space-y-1.5">
          <h3 className="text-base font-bold tracking-tight">Delete {label}?</h3>
          <p className="text-sm text-muted-foreground/60">This action cannot be undone.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl h-10 text-sm" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button variant="destructive" className="flex-1 rounded-xl h-10 text-sm font-semibold gap-2" onClick={onConfirm} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Comment Item ─────────────────────────────────────────────────────────────

function CommentItem({ comment, currentUser, token, postId, onDeleted, reactionState, onReactionChange }: {
  comment: Comment; currentUser: CrmUser; token: string; postId: string
  onDeleted: (id: string) => void; reactionState: ReactionState; onReactionChange: (s: ReactionState) => void
}) {
  const [showDelete, setShowDelete] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const canDelete = comment.userId === currentUser._id || currentUser.role === "admin"

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await apiClient.delete(`/api/crm/feeds/${postId}/comments/${comment._id}`, { headers: { Authorization: `Bearer ${token}` } })
      onDeleted(comment._id)
    } catch { setDeleting(false); setShowDelete(false) }
  }

  return (
    <>
      {showDelete && <DeleteModal label="comment" onConfirm={handleDelete} onCancel={() => setShowDelete(false)} loading={deleting} />}
      <div className="group flex items-start gap-2.5">
        <Avatar className="h-7 w-7 shrink-0 mt-0.5 ring-1 ring-border/30">
          <AvatarImage src={comment.authorAvatar} />
          <AvatarFallback className="bg-emerald-600 text-white text-[9px] font-bold">{ini(comment.authorName)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="inline-block rounded-2xl rounded-tl-sm bg-muted/40 px-3.5 py-2.5 max-w-full">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className="text-[11px] font-bold leading-none">{comment.authorName}</span>
              <Badge variant="outline" className={`text-[8px] h-3.5 px-1 rounded-full capitalize font-semibold leading-none border ${ROLE_COLORS[comment.authorRole] ?? ROLE_COLORS.employee}`}>
                {comment.authorRole}
              </Badge>
            </div>
            <p className="text-xs leading-relaxed whitespace-pre-wrap wrap-break-word text-foreground/80">{comment.content}</p>
          </div>
          <div className="flex items-center gap-2 mt-1 pl-1 flex-wrap">
            <span className="text-[10px] text-muted-foreground/35 cursor-default" title={fullDate(comment.createdAt)}>{timeAgo(comment.createdAt)}</span>
            {canDelete && (
              <button onClick={() => setShowDelete(true)} className="text-[10px] text-muted-foreground/25 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
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

// ─── Comment Section ──────────────────────────────────────────────────────────

function CommentSection({ reportId, currentUser, token }: {
  reportId: string; currentUser: CrmUser; token: string
}) {
  const COLLAPSE_AT = 4
  const SHOW_WHEN_COLLAPSED = 2

  const [comments, setComments] = React.useState<Comment[]>([])
  const [commentReactions, setCommentReactions] = React.useState<Record<string, ReactionState>>({})
  const [loading, setLoading] = React.useState(false)
  const [showAll, setShowAll] = React.useState(false)
  const [newComment, setNewComment] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState("")
  const [showEmoji, setShowEmoji] = React.useState(false)
  const inputRef = React.useRef<HTMLTextAreaElement>(null)
  const emojiRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handle(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmoji(false)
    }
    if (showEmoji) document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [showEmoji])

  React.useEffect(() => {
    if (!token || !reportId) return
    setLoading(true)
    apiClient.get(`/api/crm/feeds/${reportId}/comments`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        const fetched: Comment[] = res.data?.data?.comments || []
        setComments(fetched)
        if (fetched.length > 0) {
          try {
            const rRes = await apiClient.post("/api/crm/feeds/reactions/bulk", { targetIds: fetched.map((c) => c._id) }, { headers: { Authorization: `Bearer ${token}` } })
            setCommentReactions(rRes.data?.data?.reactions || {})
          } catch { }
        }
      })
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [reportId, token])

  const handleSubmit = async () => {
    if (!newComment.trim()) return
    setSubmitting(true); setError("")
    try {
      const res = await apiClient.post(`/api/crm/feeds/${reportId}/comments`, { content: newComment.trim() }, { headers: { Authorization: `Bearer ${token}` } })
      const c: Comment = res.data?.data?.comment
      setComments((prev) => prev.some((x) => x._id === c._id) ? prev : [...prev, c])
      setCommentReactions((prev) => ({ ...prev, [c._id]: { summary: {}, myReaction: null } }))
      setNewComment(""); setShowEmoji(false); setShowAll(true)
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to post comment")
    } finally { setSubmitting(false) }
  }

  const shouldCollapse = comments.length >= COLLAPSE_AT && !showAll
  const visible = shouldCollapse ? comments.slice(-SHOW_WHEN_COLLAPSED) : comments
  const hiddenCount = comments.length - SHOW_WHEN_COLLAPSED

  return (
    <div className="border-t border-border/20 mt-3 pt-3 space-y-3">
      {loading && <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground/30" /></div>}

      {!loading && shouldCollapse && (
        <button onClick={() => setShowAll(true)} className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors">
          <ChevronDown className="h-3.5 w-3.5" /> See {hiddenCount} more {hiddenCount === 1 ? "comment" : "comments"}
        </button>
      )}
      {!loading && comments.length >= COLLAPSE_AT && showAll && (
        <button onClick={() => setShowAll(false)} className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors">
          <ChevronUp className="h-3.5 w-3.5" /> Show less
        </button>
      )}
      {!loading && comments.length === 0 && (
        <p className="text-xs text-muted-foreground/30 text-center py-1">No comments yet.</p>
      )}
      {!loading && visible.map((c) => (
        <CommentItem
          key={c._id} comment={c} currentUser={currentUser} token={token} postId={reportId}
          onDeleted={(id) => { setComments((p) => p.filter((x) => x._id !== id)); setCommentReactions((p) => { const n = { ...p }; delete n[id]; return n }) }}
          reactionState={commentReactions[c._id] ?? { summary: {}, myReaction: null }}
          onReactionChange={(s) => setCommentReactions((p) => ({ ...p, [c._id]: s }))}
        />
      ))}

      {/* New comment input */}
      <div className="flex items-start gap-2.5 pt-1">
        <Avatar className="h-7 w-7 shrink-0 mt-0.5 ring-1 ring-border/30">
          <AvatarImage src={currentUser.avatar} />
          <AvatarFallback className="bg-emerald-600 text-white text-[9px] font-bold">{ini(currentUser.fullName)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 relative">
          <div className="rounded-2xl rounded-tl-sm border border-border/40 bg-muted/20 focus-within:border-emerald-500/30 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all">
            <textarea
              ref={inputRef} value={newComment}
              onChange={(e) => { setNewComment(e.target.value); setError("") }}
              onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); handleSubmit() } }}
              placeholder="Comment on this report…" rows={1} maxLength={1000}
              className="w-full bg-transparent text-xs leading-relaxed p-2.5 pr-16 resize-none focus:outline-none placeholder:text-muted-foreground/25"
              style={{ minHeight: "36px" }}
            />
            <div className="flex items-center justify-between px-2.5 pb-2">
              <div className="relative" ref={emojiRef}>
                <button type="button" onClick={() => setShowEmoji((p) => !p)} className="text-muted-foreground/25 hover:text-muted-foreground/60 transition-colors">
                  <Smile className="h-3.5 w-3.5" />
                </button>
                {showEmoji && (
                  <div className="absolute bottom-full left-0 mb-2 z-30 shadow-2xl">
                    <EmojiPicker theme={"auto" as Theme} onEmojiClick={(e: EmojiClickData) => { setNewComment((p) => p + e.emoji); setShowEmoji(false); inputRef.current?.focus() }} height={320} width={280} />
                  </div>
                )}
              </div>
              <button type="button" onClick={handleSubmit} disabled={submitting || !newComment.trim()} className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 hover:text-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Post
              </button>
            </div>
          </div>
          {error && <p className="text-[10px] text-red-500 mt-1 pl-1">{error}</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Report Card ──────────────────────────────────────────────────────────────

function ReportCard({ report, currentUser, token, onUpdated, onDeleted, reactionState, onReactionChange }: {
  report: DayPulseReport; currentUser: CrmUser; token: string
  onUpdated: (r: DayPulseReport) => void; onDeleted: (id: string) => void
  reactionState: ReactionState; onReactionChange: (s: ReactionState) => void
}) {
  const dept = DEPARTMENTS.find((d) => d.key === report.department)
  const style = getDeptStyle(dept?.color ?? "emerald")
  const { grouped, unassigned } = React.useMemo(() => groupDayPulseAttachments(report.attachments), [report.attachments])

  const [isEditing, setIsEditing] = React.useState(false)
  const [previewAttachment, setPreviewAttachment] = React.useState<{ attachment: DayPulseAttachment; heading: string } | null>(null)
  const [editAcc, setEditAcc] = React.useState(report.accomplishment)
  const [editBlk, setEditBlk] = React.useState(report.blockers)
  const [editInp, setEditInp] = React.useState(report.inProgress)
  const [editLoading, setEditLoading] = React.useState(false)
  const [editError, setEditError] = React.useState("")
  const [showDeleteModal, setShowDeleteModal] = React.useState(false)
  const [deleteLoading, setDeleteLoading] = React.useState(false)
  const [showComments, setShowComments] = React.useState(false)

  const isOwner = report.userId === currentUser._id
  const isAdmin = currentUser.role === "admin"
  const canEdit = isOwner
  const canDelete = isOwner || isAdmin

  const handleSave = async () => {
    if (!editAcc.trim() || !editBlk.trim() || !editInp.trim()) {
      setEditError("All three sections are required"); return
    }
    setEditLoading(true); setEditError("")
    try {
      const res = await apiClient.put(`/api/crm/daypulse/${report._id}`,
        { accomplishment: editAcc.trim(), blockers: editBlk.trim(), inProgress: editInp.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      onUpdated(res.data?.data?.report)
      setIsEditing(false)
    } catch (err: any) {
      setEditError(err?.response?.data?.message || "Failed to update")
    } finally { setEditLoading(false) }
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      await apiClient.delete(`/api/crm/daypulse/${report._id}`, { headers: { Authorization: `Bearer ${token}` } })
      onDeleted(report._id)
    } catch { setDeleteLoading(false); setShowDeleteModal(false) }
  }

  return (
    <>
      {showDeleteModal && <DeleteModal onConfirm={handleDelete} onCancel={() => setShowDeleteModal(false)} loading={deleteLoading} />}
      {previewAttachment && (
        <AttachmentPreviewModal
          attachment={previewAttachment.attachment}
          heading={previewAttachment.heading}
          onClose={() => setPreviewAttachment(null)}
        />
      )}

      <article className={`group rounded-2xl border border-border/40 bg-card overflow-hidden transition-all duration-200 hover:border-border/50 ${style.glow}`}>

        {/* ── Header band ── */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className={`h-9 w-9 shrink-0 ring-2 ${style.ring}`}>
              <AvatarImage src={report.authorAvatar} />
              <AvatarFallback className="bg-emerald-600 text-white text-xs font-bold">{ini(report.authorName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[15px] font-semibold truncate leading-none text-foreground">{report.authorName}</p>
                <Badge variant="outline" className={`text-[8px] h-5 px-2 rounded-full capitalize font-semibold leading-none border ${ROLE_COLORS[report.authorRole] ?? ROLE_COLORS.employee}`}>
                  {report.authorRole}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <p className="text-[10px] text-muted-foreground/45 cursor-default" title={fullDate(report.createdAt)}>{timeAgo(report.createdAt)}</p>
                {report.isEdited && <span className="text-[10px] text-muted-foreground/35 italic">(edited)</span>}
                {/* Department badge */}
                <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-2 py-0.5 rounded-full border ${style.badge}`}>
                  <Hash className="h-2 w-2" />{dept?.label}
                </span>
              </div>
            </div>
          </div>

          {(canEdit || canDelete) && !isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 rounded-xl border-border/40 shadow-xl p-1">
                {canEdit && (
                  <DropdownMenuItem className="rounded-lg text-xs h-8 gap-2.5 cursor-pointer" onClick={() => { setIsEditing(true); setEditAcc(report.accomplishment); setEditBlk(report.blockers); setEditInp(report.inProgress) }}>
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" /> Edit report
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem className="rounded-lg text-xs h-8 gap-2.5 cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/5" onClick={() => setShowDeleteModal(true)}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete report
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* ── Structured sections ── */}
        {isEditing ? (
          <div className="px-5 pb-5 space-y-3">
            {[
              { label: "Accomplishment", icon: <CheckCircle2 className="h-3.5 w-3.5" />, value: editAcc, onChange: setEditAcc, placeholder: "What did you accomplish today?" },
              { label: "Blockers", icon: <AlertCircle className="h-3.5 w-3.5" />, value: editBlk, onChange: setEditBlk, placeholder: "What is blocking your progress?" },
              { label: "In Progress", icon: <Clock3 className="h-3.5 w-3.5" />, value: editInp, onChange: setEditInp, placeholder: "What are you currently working on?" },
            ].map(({ label, icon, value, onChange, placeholder }) => (
              <div key={label}>
                <label className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/55">{icon}{label}</label>
                <textarea
                  value={value}
                  onChange={(e) => { onChange(e.target.value); setEditError("") }}
                  rows={3} maxLength={5000}
                  placeholder={placeholder}
                  className="w-full rounded-xl border border-border/50 bg-muted/20 text-sm p-3 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30 leading-relaxed placeholder:text-muted-foreground/25"
                />
              </div>
            ))}
            {editError && <p className="text-xs text-red-500">{editError}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" className="h-8 rounded-xl text-xs gap-1.5" onClick={() => { setIsEditing(false); setEditError("") }} disabled={editLoading}>
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
              <Button size="sm" className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5" onClick={handleSave} disabled={editLoading || !editAcc.trim() || !editBlk.trim() || !editInp.trim()}>
                {editLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="px-5 pb-5 space-y-3.5">
            {DAYPULSE_SECTION_CONFIG.map(({ key, label, icon, borderClass, accentClass }) => {
              const content = key === "accomplishment" ? report.accomplishment : key === "blockers" ? report.blockers : report.inProgress
              const sectionAttachments = grouped[key]

              return (
                <div key={label} className={`rounded-xl border p-3.5 ${borderClass}`}>
                  <div className="flex items-center gap-1.5 mb-2">
                    {icon}
                    <span className={`text-[10px] font-bold uppercase tracking-[0.16em] ${accentClass}/80`}>{label}</span>
                  </div>
                  <p className="text-sm leading-7 whitespace-pre-wrap wrap-break-word text-foreground/85">{content}</p>

                  {sectionAttachments.length > 0 ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {sectionAttachments.map((attachment) => {
                        const imageLike = isImageAttachment(attachment)

                        return (
                          <button
                            key={attachment.fileKey}
                            type="button"
                            onClick={() => setPreviewAttachment({ attachment, heading: `${label} attachment` })}
                            className="flex items-center gap-3 rounded-xl border border-border/40 bg-card px-3 py-2.5 text-left transition-colors hover:border-border/60 hover:bg-muted/30"
                          >
                            {imageLike && attachment.thumbnailUrl ? (
                              <img
                                src={attachment.thumbnailUrl}
                                alt={attachment.originalName}
                                className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-border/30"
                              />
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground ring-1 ring-border/30">
                                {attachment.mimeType.includes("pdf") || attachment.mimeType.includes("word") ? (
                                  <FileText className="h-4 w-4" />
                                ) : (
                                  <ImageIcon className="h-4 w-4" />
                                )}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">{attachment.originalName}</p>
                              <p className="text-[10px] text-muted-foreground/55">{formatBytes(attachment.size)}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              )
            })}

            {unassigned.length > 0 ? (
              <div className="rounded-xl border border-border/40 bg-muted/20 p-3.5">
                <div className="mb-3 flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5 text-muted-foreground/60" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/60">Attachments</span>
                  <Badge variant="outline" className="h-5 rounded-full border-border/40 px-2 text-[9px] font-semibold">
                    {unassigned.length}
                  </Badge>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {unassigned.map((attachment) => {
                    return (
                      <a
                        key={attachment.fileKey}
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 rounded-xl border border-border/40 bg-card px-3 py-2.5 transition-colors hover:border-border/60 hover:bg-muted/30"
                      >
                        {isImageAttachment(attachment) && attachment.thumbnailUrl ? (
                          <img
                            src={attachment.thumbnailUrl}
                            alt={attachment.originalName}
                            className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-border/30"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
                            {attachment.mimeType.includes("pdf") || attachment.mimeType.includes("word") ? (
                              <FileText className="h-4 w-4" />
                            ) : (
                              <ImageIcon className="h-4 w-4" />
                            )}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{attachment.originalName}</p>
                          <p className="text-[10px] text-muted-foreground/55">{formatBytes(attachment.size)}</p>
                        </div>
                      </a>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ── Footer: reactions + comment toggle ── */}
        <div className="px-5 pb-5 flex items-center justify-between gap-3 flex-wrap">
          <ReactionBar
            targetType="post" targetId={report._id} token={token}
            reactionState={reactionState} onReactionChange={onReactionChange}
          />
          <button
            onClick={() => setShowComments((p) => !p)}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground/45 hover:text-muted-foreground/75 transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {showComments ? "Hide comments" : "Comments"}
          </button>
        </div>

        {/* ── Comments ── */}
        {showComments && (
          <div className="px-5 pb-5">
            <CommentSection reportId={report._id} currentUser={currentUser} token={token} />
          </div>
        )}
      </article>
    </>
  )
}

// ─── Report Composer ──────────────────────────────────────────────────────────

function ReportComposer({ currentUser, token, selectedDept, onPosted }: {
  currentUser: CrmUser; token: string; selectedDept: DepartmentKey | null; onPosted: (r: DayPulseReport) => void
}) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const [previewAttachment, setPreviewAttachment] = React.useState<{ attachment: DayPulseAttachment; heading: string } | null>(null)
  const [open, setOpen] = React.useState(false)
  const [dept, setDept] = React.useState<DepartmentKey | null>(selectedDept)
  const [date, setDate] = React.useState(todayStr())
  const [accomplishment, setAcc] = React.useState("")
  const [blockers, setBlk] = React.useState("")
  const [inProgress, setInp] = React.useState("")
  const [activeAttachmentSection, setActiveAttachmentSection] = React.useState<DayPulseAttachmentSection | null>(null)
  const [pendingAttachments, setPendingAttachments] = React.useState<Record<DayPulseAttachmentSection, File[]>>({
    accomplishment: [],
    blockers: [],
    inProgress: [],
  })
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState("")

  // Sync dept with selected tab
  React.useEffect(() => { setDept(selectedDept) }, [selectedDept])

  React.useEffect(() => {
    return () => {
      const previewUrl = previewAttachment?.attachment.url
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewAttachment])

  const canSubmit = !!dept && !!date && accomplishment.trim() && blockers.trim() && inProgress.trim()

  const openAttachmentPicker = (section: DayPulseAttachmentSection) => {
    setActiveAttachmentSection(section)
    fileInputRef.current?.click()
  }

  const handleAttachmentPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    event.target.value = ""

    if (!selectedFiles.length) return

    if (!activeAttachmentSection) {
      setError("Select a section before attaching files.")
      return
    }

    const currentFiles = pendingAttachments[activeAttachmentSection]
    if (currentFiles.length + selectedFiles.length > MAX_DAYPULSE_ATTACHMENTS_PER_SECTION) {
      setError(`You can attach up to ${MAX_DAYPULSE_ATTACHMENTS_PER_SECTION} files per section.`)
      return
    }

    const allowedExtensions = [".png", ".jpg", ".jpeg", ".webp", ".pdf", ".doc", ".docx"]
    const allowedMimeTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]

    for (const file of selectedFiles) {
      if (file.size === 0) {
        setError(`${file.name} is empty and cannot be attached.`)
        return
      }

      if (file.size > MAX_DAYPULSE_ATTACHMENT_SIZE_BYTES) {
        setError(`${file.name} exceeds 25 MB.`)
        return
      }

      const extension = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase() : ""
      if (!allowedExtensions.includes(extension) && !allowedMimeTypes.includes(file.type)) {
        setError("Only PNG, JPG, PDF, and DOCX files are allowed.")
        return
      }
    }

    setPendingAttachments((prev) => ({
      ...prev,
      [activeAttachmentSection]: [...prev[activeAttachmentSection], ...selectedFiles],
    }))
    setError("")
  }

  const removeAttachment = (section: DayPulseAttachmentSection, index: number) => {
    setPendingAttachments((prev) => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async () => {
    if (!canSubmit) { setError("Please fill in all fields and select a department."); return }
    setSubmitting(true); setError("")
    try {
      const payload = new FormData()
      payload.append("department", dept)
      payload.append("reportDate", date)
      payload.append("accomplishment", accomplishment.trim())
      payload.append("blockers", blockers.trim())
      payload.append("inProgress", inProgress.trim())
      Object.entries(DAYPULSE_ATTACHMENT_FIELDS).forEach(([section, fieldName]) => {
        pendingAttachments[section as DayPulseAttachmentSection].forEach((file) => payload.append(fieldName, file))
      })

      const res = await apiClient.post(
        "/api/crm/daypulse",
        payload,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } }
      )
      onPosted(res.data?.data?.report)
      setAcc(""); setBlk(""); setInp("")
      setPendingAttachments({ accomplishment: [], blockers: [], inProgress: [] })
      setActiveAttachmentSection(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      setOpen(false)
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to submit report")
    } finally { setSubmitting(false) }
  }

  const selectedDeptMeta = DEPARTMENTS.find((d) => d.key === dept)
  const deptStyle = getDeptStyle(selectedDeptMeta?.color ?? "emerald")

  return (
    <div className={`rounded-[28px] border bg-card transition-all duration-300 ${open ? "border-emerald-500/30 shadow-lg shadow-emerald-500/5" : "border-border/40 shadow-sm"}`}>
      {previewAttachment && (
        <AttachmentPreviewModal
          attachment={previewAttachment.attachment}
          heading={previewAttachment.heading}
          onClose={() => setPreviewAttachment(null)}
        />
      )}

      {/* Collapsed trigger */}
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-4 p-5 text-left"
        >
          <Avatar className="h-10 w-10 shrink-0 ring-2 ring-border/30">
            <AvatarImage src={currentUser.avatar} />
            <AvatarFallback className="bg-emerald-600 text-white text-xs font-bold">{ini(currentUser.fullName)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 rounded-2xl bg-muted/30 border border-border/30 px-4 py-3 text-sm text-muted-foreground/50 hover:bg-muted/50 transition-colors">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground/35">New report</span>
            File your DayPulse update…
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground/45 shrink-0">
            <CalendarDays className="h-3.5 w-3.5" />
            {date}
          </div>
        </button>
      ) : (
        <div className="p-6 space-y-5">
          {/* Form header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="mt-0.5 h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="min-w-0">
                <span className="block text-sm font-bold text-foreground">New DayPulse Report</span>
              </div>
            </div>
            <button onClick={() => { setOpen(false); setError("") }} className="text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Row: Department selector + Date picker */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Department */}
            <div>
              <label className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/55">
                <Hash className="h-3 w-3" /> Department <span className="text-red-500">*</span>
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={`w-full flex items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-xs font-semibold transition-all
                    ${dept ? `${deptStyle.badge} border-current` : "border-border/40 text-muted-foreground/50 hover:border-border/70"}`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      {selectedDeptMeta ? selectedDeptMeta.label : "Select department"}
                    </span>
                    <ChevronDown className="h-3 w-3 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 rounded-2xl border-border/40 shadow-xl p-1.5 max-h-64 overflow-y-auto">
                  {DEPARTMENTS.map((d) => {
                    const s = getDeptStyle(d.color)
                    return (
                      <DropdownMenuItem
                        key={d.key}
                        className={`rounded-xl text-xs h-9 gap-2 cursor-pointer font-semibold ${dept === d.key ? s.badge : ""}`}
                        onClick={() => setDept(d.key)}
                      >
                        <span>{d.label}</span>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Date */}
            <div>
              <label className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/55">
                <CalendarDays className="h-3 w-3" /> Report Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                max={todayStr()}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-2xl border border-border/40 bg-muted/20 px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40 transition-all text-foreground/80"
              />
            </div>
          </div>

          {/* Structured sections */}
          {DAYPULSE_SECTION_CONFIG.map(({ key, label, icon, placeholder, borderClass }) => {
            const value = key === "accomplishment" ? accomplishment : key === "blockers" ? blockers : inProgress
            const onChange = key === "accomplishment" ? setAcc : key === "blockers" ? setBlk : setInp
            const attachments = pendingAttachments[key]

            return (
              <div key={label} className="space-y-3">
                <div>
                  <label className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/55">
                    {icon}{label} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={value}
                    onChange={(e) => { onChange(e.target.value); setError("") }}
                    rows={3} maxLength={5000}
                    placeholder={placeholder}
                    className="w-full rounded-2xl border border-border/40 bg-muted/20 text-sm p-4 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30 leading-relaxed placeholder:text-muted-foreground/25 transition-all"
                  />
                  <div className="mt-1.5 text-right">
                    <span className={`text-[9px] tabular-nums ${value.length > 4500 ? "text-red-500" : "text-muted-foreground/25"}`}>{value.length}/5000</span>
                  </div>
                </div>

                <div className={`rounded-2xl border px-4 py-3 ${borderClass}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/55">Attachments</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground/40">Up to {MAX_DAYPULSE_ATTACHMENTS_PER_SECTION} files for this section</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-xl border-border/40 bg-card text-xs gap-2"
                      onClick={() => openAttachmentPicker(key)}
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      Attach file
                    </Button>
                  </div>

                  {attachments.length > 0 ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {attachments.map((file, index) => {
                        const imageLike = file.type.startsWith("image/")

                        return (
                          <div
                            key={`${key}-${file.name}-${file.size}-${file.lastModified}-${index}`}
                            onClick={() => setPreviewAttachment({
                              attachment: {
                                url: URL.createObjectURL(file),
                                fileKey: `${file.name}-${file.lastModified}-${index}`,
                                originalName: file.name,
                                mimeType: file.type,
                                size: file.size,
                                section: key,
                              },
                              heading: `${label} attachment`,
                            })}
                            role="button"
                            tabIndex={0}
                            className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/40 bg-card px-3 py-2.5 text-left transition-colors hover:border-border/60 hover:bg-muted/30"
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground ring-1 ring-border/30">
                              {imageLike ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                              <p className="text-[10px] text-muted-foreground/55">{formatBytes(file.size)}</p>
                            </div>
                            <button
                              type="button"
                              onClick={(event) => { event.stopPropagation(); removeAttachment(key, index) }}
                              className="rounded-full p-1.5 text-muted-foreground/40 transition-colors hover:bg-muted hover:text-muted-foreground/75"
                              aria-label={`Remove ${file.name}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}

          <input
            ref={fileInputRef}
            type="file"
            accept={DAYPULSE_ATTACHMENT_ACCEPT}
            multiple
            className="hidden"
            onChange={handleAttachmentPick}
          />

          {error && (
            <div className="flex items-center gap-2 rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-3">
              <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
              <p className="text-xs leading-5 text-red-500">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 flex-wrap pt-1 border-t border-border/20">
            <p className="pt-3 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/25">Ctrl+Enter to submit</p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="h-10 rounded-xl text-xs px-4" onClick={() => { setOpen(false); setError("") }} disabled={submitting}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitting || !canSubmit}
                className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-2 px-5 disabled:opacity-40"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Submit Report
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Date Navigator ───────────────────────────────────────────────────────────

function DateNavigator({ selectedDate, onDateChange }: {
  selectedDate: string; onDateChange: (d: string) => void
}) {
  const today = todayStr()

  const shift = (days: number) => {
    const d = new Date(selectedDate + "T00:00:00Z")
    d.setUTCDate(d.getUTCDate() + days)
    onDateChange(d.toISOString().split("T")[0])
  }

  const isToday = selectedDate === today

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => shift(-1)} className="h-7 w-7 rounded-lg border border-border/30 flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:border-border/60 transition-all">
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={selectedDate}
          max={today}
          onChange={(e) => onDateChange(e.target.value)}
          className="rounded-lg border border-border/40 bg-muted/20 px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-foreground/80 transition-all"
        />
        {!isToday && (
          <button onClick={() => onDateChange(today)} className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-500 transition-colors">
            Today
          </button>
        )}
      </div>
      <button
        onClick={() => shift(1)}
        disabled={selectedDate >= today}
        className="h-7 w-7 rounded-lg border border-border/30 flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:border-border/60 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ─── Department Tab Bar ───────────────────────────────────────────────────────

function DeptTabBar({ selected, onSelect }: {
  selected: DepartmentKey | null; onSelect: (d: DepartmentKey | null) => void
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(true)

  const checkScroll = React.useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
  }, [])

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener("scroll", checkScroll, { passive: true })
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", checkScroll)
      ro.disconnect()
    }
  }, [checkScroll])

  const nudge = (dir: "left" | "right") =>
    scrollRef.current?.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" })

  return (
    <div className="flex items-center gap-2 w-full min-w-0">
      {/* Left arrow */}
      <button
        onClick={() => nudge("left")}
        disabled={!canScrollLeft}
        className="shrink-0 h-8 w-8 rounded-full border border-border/30 flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:border-border/60 disabled:opacity-0 disabled:pointer-events-none transition-all"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>

      {/* Tab strip — the key: clip here intentionally with overflow-hidden, scroll via JS */}
      <div
        ref={scrollRef}
        className="flex items-center gap-1.5 flex-1 min-w-0"
        style={{
          overflowX: "auto",
          overflowY: "visible",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        } as React.CSSProperties}
        onScroll={checkScroll}
      >
        {/* hide webkit scrollbar */}
        <style>{`#dept-scroll::-webkit-scrollbar{display:none}`}</style>
        <div id="dept-scroll" className="flex items-center gap-1.5 pb-0.5">
          {/* All tab */}
          <button
            onClick={() => onSelect(null)}
            className={`shrink-0 flex items-center gap-1 px-3.5 py-2 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border
              ${selected === null
                ? "bg-foreground text-background border-foreground"
                : "border-border/30 text-muted-foreground/50 hover:text-muted-foreground hover:border-border/60"
              }`}
          >
            <Building2 className="h-3 w-3" /> All Teams
          </button>

          {DEPARTMENTS.map((d) => {
            const s = getDeptStyle(d.color ?? "emerald")
            const isActive = selected === d.key
            return (
              <button
                key={d.key}
                onClick={() => onSelect(d.key)}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border
                  ${isActive
                    ? `${s.badge} border-current`
                    : "border-border/30 text-muted-foreground/50 hover:text-muted-foreground hover:border-border/60"
                  }`}
              >
                <Hash className="h-2.5 w-2.5 opacity-60" />
                <span>{d.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right arrow */}
      <button
        onClick={() => nudge("right")}
        disabled={!canScrollRight}
        className="shrink-0 h-8 w-8 rounded-full border border-border/30 flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:border-border/60 disabled:opacity-0 disabled:pointer-events-none transition-all"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
// ─── DayPulse Page ────────────────────────────────────────────────────────────

export default function DayPulsePage({ currentUser, token }: {
  currentUser: CrmUser; token: string
}) {
  const [selectedDept, setSelectedDept] = React.useState<DepartmentKey | null>(null)
  const [selectedDate, setSelectedDate] = React.useState(todayStr())
  const [reports, setReports] = React.useState<DayPulseReport[]>([])
  const [postReactions, setPostReactions] = React.useState<Record<string, ReactionState>>({})
  const [loading, setLoading] = React.useState(false)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const [hasMore, setHasMore] = React.useState(false)
  const [page, setPage] = React.useState(1)
  const [refreshing, setRefreshing] = React.useState(false)
  const observerRef = React.useRef<HTMLDivElement>(null)

  const PAGE_LIMIT = 20

  /** Build query string from current filters */
  const buildQuery = React.useCallback((pg: number) => {
    const params = new URLSearchParams({ page: String(pg), limit: String(PAGE_LIMIT) })
    if (selectedDept) params.set("department", selectedDept)
    if (selectedDate) params.set("date", selectedDate)
    return params.toString()
  }, [selectedDept, selectedDate])

  /** Fetch reports + bulk reactions */
  const fetchReports = React.useCallback(async (tk: string, pg: number) => {
    const res = await apiClient.get(`/api/crm/daypulse?${buildQuery(pg)}`, {
      headers: { Authorization: `Bearer ${tk}` },
    })
    const d = res.data?.data
    const fetched: DayPulseReport[] = d.reports || []
    let rxMap: Record<string, ReactionState> = {}
    if (fetched.length > 0) {
      try {
        const rRes = await apiClient.post("/api/crm/feeds/reactions/bulk", { targetIds: fetched.map((r) => r._id) }, { headers: { Authorization: `Bearer ${tk}` } })
        rxMap = rRes.data?.data?.reactions || {}
      } catch { }
    }
    return { reports: fetched, hasMore: d.hasMore ?? false, reactions: rxMap }
  }, [buildQuery])

  // Fetch on mount + whenever filters change
  React.useEffect(() => {
    if (!token) return
    setLoading(true)
    fetchReports(token, 1)
      .then(({ reports, hasMore, reactions }) => {
        setReports(reports); setPostReactions(reactions); setHasMore(hasMore); setPage(1)
      })
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [token, fetchReports])

  // Infinite scroll
  React.useEffect(() => {
    if (!observerRef.current) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && hasMore && !loadingMore) loadMore() },
      { threshold: 0.5 }
    )
    obs.observe(observerRef.current)
    return () => obs.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore, reports])

  const loadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const next = page + 1
    try {
      const { reports: more, hasMore: moreHasMore, reactions } = await fetchReports(token, next)
      setReports((prev) => { const ids = new Set(prev.map((r) => r._id)); return [...prev, ...more.filter((r) => !ids.has(r._id))] })
      setPostReactions((prev) => ({ ...prev, ...reactions }))
      setHasMore(moreHasMore); setPage(next)
    } catch { }
    finally { setLoadingMore(false) }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const { reports, hasMore, reactions } = await fetchReports(token, 1)
      setReports(reports); setPostReactions(reactions); setHasMore(hasMore); setPage(1)
    } catch { }
    finally { setRefreshing(false) }
  }

  const deptMeta = DEPARTMENTS.find((d) => d.key === selectedDept)

  return (
    <div className="space-y-5">
      <section className={`${PAGE_PANEL} p-4 sm:p-5`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/45">CRM Feed Module</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">DayPulse</h2>
          </div>

          <div className="grid gap-2 sm:min-w-70 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/40 bg-muted/30 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/40">Selected date</p>
              <p className="mt-1 text-sm font-medium text-foreground">{formatReportDate(selectedDate)}</p>
            </div>
            <div className="rounded-2xl border border-border/40 bg-muted/30 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/40">Scope</p>
              <p className="mt-1 text-sm font-medium text-foreground">{deptMeta ? deptMeta.label : "All Teams"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className={`${PAGE_SECTION} p-4 sm:p-5 space-y-4`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/45">Viewing reports for</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <DateNavigator selectedDate={selectedDate} onDateChange={(d) => setSelectedDate(d)} />
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl shrink-0 border border-border/30" onClick={handleRefresh} disabled={refreshing} title="Refresh">
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        <DeptTabBar selected={selectedDept} onSelect={setSelectedDept} />

        <ReportComposer
          currentUser={currentUser} token={token}
          selectedDept={selectedDept}
          onPosted={(r) => {
            setReports((prev) => [r, ...prev])
            setPostReactions((prev) => ({ ...prev, [r._id]: { summary: {}, myReaction: null } }))
          }}
        />

        <div className="flex items-center gap-3 pt-1">
          <div className="flex-1 h-px bg-border/30" />
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/30">
            {deptMeta ? <><Hash className="h-2.5 w-2.5" /><span>{deptMeta.label}</span></> : "All Teams"}
          </p>
          <div className="flex-1 h-px bg-border/30" />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/30" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/30">Loading reports…</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-18">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl border-2 border-dashed border-border/25 bg-muted/10">
              <CalendarDays className="h-7 w-7 text-muted-foreground/15" />
            </div>
            <div className="max-w-md space-y-2 text-center">
              <p className="text-base font-semibold tracking-tight text-muted-foreground/45">No reports for this day</p>
              <p className="text-sm leading-6 text-muted-foreground/25">
                {selectedDept ? `No #${deptMeta?.label} reports on ${selectedDate}.` : `No reports on ${selectedDate}.`} Be the first to file one!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <ReportCard
                key={report._id}
                report={report}
                currentUser={currentUser}
                token={token}
                onUpdated={(u) => setReports((prev) => prev.map((r) => (r._id === u._id ? u : r)))}
                onDeleted={(id) => {
                  setReports((prev) => prev.filter((r) => r._id !== id))
                  setPostReactions((prev) => { const n = { ...prev }; delete n[id]; return n })
                }}
                reactionState={postReactions[report._id] ?? { summary: {}, myReaction: null }}
                onReactionChange={(s) => setPostReactions((prev) => ({ ...prev, [report._id]: s }))}
              />
            ))}
          </div>
        )}

        <div ref={observerRef} className="h-1" />

        {loadingMore && (
          <div className="flex justify-center py-5">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/30" />
          </div>
        )}

        {!hasMore && reports.length > 0 && (
          <div className="flex items-center gap-3 py-4">
            <div className="flex-1 h-px bg-border/20" />
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/25">End of reports</p>
            <div className="flex-1 h-px bg-border/20" />
          </div>
        )}

        {hasMore && !loadingMore && (
          <Button variant="outline" className="w-full h-11 rounded-2xl text-xs gap-2 border-border/30 hover:border-emerald-500/30" onClick={loadMore}>
            <ChevronDown className="h-4 w-4" /> Load more reports
          </Button>
        )}
      </section>
    </div>
  )
}
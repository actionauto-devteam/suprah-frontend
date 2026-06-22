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
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
  MessageCircle,
  Rss,
  BarChart2,
  Paperclip,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { apiClient } from "@/lib/api-client"
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react"
import DayPulsePage from "@/components/DayPulsePage"

// ─── Types ────────────────────────────────────────────────────────────────────

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
  { type: "like", emoji: "👍", label: "Like", color: "text-blue-500", bg: "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30" },
  { type: "love", emoji: "❤️", label: "Love", color: "text-rose-500", bg: "bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30" },
  { type: "haha", emoji: "😂", label: "Haha", color: "text-amber-500", bg: "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30" },
  { type: "wow", emoji: "😮", label: "Wow", color: "text-amber-400", bg: "bg-amber-400/10 hover:bg-amber-400/20 border-amber-400/30" },
  { type: "sad", emoji: "😢", label: "Sad", color: "text-sky-400", bg: "bg-sky-400/10 hover:bg-sky-400/20 border-sky-400/30" },
  { type: "angry", emoji: "😡", label: "Angry", color: "text-orange-500", bg: "bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/30" },
]

const REACTION_MAP = Object.fromEntries(REACTIONS.map((r) => [r.type, r])) as Record<ReactionType, typeof REACTIONS[0]>

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Clean gradient divider ───────────────────────────────────────────────────

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

// ─── Attachment Preview Modal ──────────────────────────────────────────────────

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

// ─── Attachment Grid (rendered on a posted post/comment) ──────────────────────

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

// ─── Pending Attachments (composer preview, before posting) ───────────────────

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

// ─── Reaction Details Modal (who reacted) ──────────────────────────────────────

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

// ─── Reaction Bar ─────────────────────────────────────────────────────────────

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
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className={compact ? "text-sm leading-none" : "text-base leading-none"}>{myMeta ? myMeta.emoji : "👍"}</span>}
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

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

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

// ─── Comment Item ─────────────────────────────────────────────────────────────

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
      await apiClient.delete(`/api/crm/feeds/${postId}/comments/${comment._id}`, { headers: { Authorization: `Bearer ${token}` } })
      onDeleted(comment._id)
    } catch { setDeleteLoading(false); setShowDeleteModal(false) }
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
            {comment.content && <p className="text-xs leading-relaxed whitespace-pre-wrap wrap-break-word text-foreground/80">{comment.content}</p>}
          </div>
          {!!comment.attachments?.length && (
            <div className="mt-2 max-w-xs">
              <AttachmentGrid attachments={comment.attachments} compact />
            </div>
          )}
          <div className="flex items-center gap-2 mt-1 pl-1 flex-wrap">
            <span className="text-[10px] text-muted-foreground/50 cursor-default" title={fullDate(comment.createdAt)}>{timeAgo(comment.createdAt)}</span>
            {canDelete && (
              <button onClick={() => setShowDeleteModal(true)} className="text-[10px] text-muted-foreground/30 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 font-medium">
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

function CommentSection({ post, currentUser, token, comments, setComments, commentReactions, setCommentReactions, inputId }: {
  post: Post; currentUser: CrmUser; token: string; inputId: string
  comments: Comment[]; setComments: React.Dispatch<React.SetStateAction<Comment[]>>
  commentReactions: Record<string, ReactionState>; setCommentReactions: React.Dispatch<React.SetStateAction<Record<string, ReactionState>>>
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
    if (!token || !post._id) return
    setLoading(true)
    apiClient.get(`/api/crm/feeds/${post._id}/comments`, { headers: { Authorization: `Bearer ${token}` } })
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post._id, token])

  const handleSubmit = async () => {
    if (!newComment.trim() && pendingFiles.length === 0) return
    setSubmitting(true); setSubmitError("")
    try {
      const formData = new FormData()
      formData.append("content", newComment.trim())
      pendingFiles.forEach((f) => formData.append("files", f))
      const res = await apiClient.post(`/api/crm/feeds/${post._id}/comments`, formData, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } })
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
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); handleSubmit() }
  }

  const shouldCollapse = comments.length >= COLLAPSE_THRESHOLD && !showAll
  const visibleComments = shouldCollapse ? comments.slice(-VISIBLE_WHEN_COLLAPSED) : comments
  const hiddenCount = comments.length - VISIBLE_WHEN_COLLAPSED

  return (
    <div className="rounded-2xl border border-border/30 bg-muted/15 mt-3 p-4 space-y-3">
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
          <div className="rounded-2xl border border-border/40 bg-background/50 focus-within:border-emerald-500/40 focus-within:ring-1 focus-within:ring-emerald-500/15 transition-all">
            <textarea
              id={inputId}
              ref={inputRef} value={newComment}
              onChange={(e) => { setNewComment(e.target.value); setSubmitError("") }}
              onKeyDown={handleKey}
              onPaste={handlePaste}
              placeholder="Leave a comment…" rows={1} maxLength={1000}
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
          {newComment && !submitError && <p className="text-[10px] text-muted-foreground/40 mt-1 pl-1">⌘/Ctrl + Enter to post</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({ post, currentUser, token, onUpdated, onDeleted, reactionState, onReactionChange }: {
  post: Post; currentUser: CrmUser; token: string
  onUpdated: (updated: Post) => void; onDeleted: (id: string) => void
  reactionState: ReactionState; onReactionChange: (state: ReactionState) => void
}) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editContent, setEditContent] = React.useState(post.content)
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
    setEditLoading(true); setEditError("")
    try {
      const res = await apiClient.put(`/api/crm/feeds/${post._id}`, { content: editContent.trim() }, { headers: { Authorization: `Bearer ${token}` } })
      onUpdated(res.data?.data?.post || res.data?.post)
      setIsEditing(false)
    } catch (err: any) {
      setEditError(err?.response?.data?.message || "Failed to update post")
    } finally { setEditLoading(false) }
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      await apiClient.delete(`/api/crm/feeds/${post._id}`, { headers: { Authorization: `Bearer ${token}` } })
      onDeleted(post._id)
    } catch { setDeleteLoading(false); setShowDeleteModal(false) }
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
      <article className="group relative rounded-3xl border border-border/40 bg-card/60 backdrop-blur-xl overflow-hidden shadow-sm transition-all duration-200 hover:border-emerald-500/25 hover:shadow-lg hover:shadow-emerald-500/5">
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
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <p className="text-[10px] text-muted-foreground/55 cursor-default" title={fullDate(post.createdAt)}>{timeAgo(post.createdAt)}</p>
                  {post.isEdited && <span className="text-[10px] text-muted-foreground/40 italic">· edited</span>}
                </div>
              </div>
            </div>
            {(canEdit || canDelete) && !isEditing && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hover:bg-muted/60">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 rounded-2xl border-border/40 shadow-xl p-1 bg-card/95 backdrop-blur-xl">
                  {canEdit && (
                    <DropdownMenuItem className="rounded-xl text-xs h-8 gap-2.5 cursor-pointer font-medium" onClick={() => { setIsEditing(true); setEditContent(post.content) }}>
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
                <textarea
                  ref={editRef} value={editContent}
                  onChange={(e) => { setEditContent(e.target.value); setEditError("") }}
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
              {post.content && <p className="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word text-foreground/85">{post.content}</p>}
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
          />
        </div>
      </article>
    </>
  )
}

// ─── Post Composer ────────────────────────────────────────────────────────────

function Composer({ currentUser, token, onPosted }: {
  currentUser: CrmUser; token: string; onPosted: (post: Post) => void
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
    setLoading(true); setError("")
    try {
      const formData = new FormData()
      formData.append("content", content.trim())
      pendingFiles.forEach((f) => formData.append("files", f))
      const res = await apiClient.post("/api/crm/feeds", formData, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } })
      onPosted(res.data?.data?.post || res.data?.post)
      setContent(""); setPendingFiles([]); textareaRef.current?.blur(); setIsFocused(false)
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to post")
    } finally { setLoading(false) }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); handleSubmit() }
  }

  return (
    <div className={`relative rounded-3xl border overflow-hidden bg-card/60 backdrop-blur-xl shadow-sm transition-all duration-200 ${isFocused ? "border-emerald-500/35 shadow-lg shadow-emerald-500/10" : "border-border/40"}`}>
      <div className="flex items-center justify-between px-5 pt-4 pb-1">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-muted-foreground/70">Share an update</span>
        </div>
      </div>

      <div className="flex items-start gap-3 px-5 pb-2">
        <Avatar className="h-9 w-9 shrink-0 mt-1 ring-1 ring-emerald-500/25">
          <AvatarImage src={currentUser.avatar} />
          <AvatarFallback className="bg-emerald-600 text-white text-xs font-semibold">{ini(currentUser.fullName)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef} value={content}
            onChange={(e) => { setContent(e.target.value); setError("") }}
            onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
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
            <span className={`text-[10px] tabular-nums font-medium transition-colors ${content.length > 4500 ? "text-rose-500" : "text-muted-foreground/55"}`}>
              {content.length}/5000
            </span>
          )}
          <Button onClick={handleSubmit} disabled={loading || (!content.trim() && pendingFiles.length === 0)} size="sm" className="h-8 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold gap-2 px-4 disabled:opacity-30 transition-all">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Post
          </Button>
        </div>
      </div>
      {error && <p className="text-xs text-rose-500 px-5 pb-3">{error}</p>}
      {content && !error && <p className="text-[10px] text-muted-foreground/40 px-5 pb-3">⌘/Ctrl + Enter to post</p>}
    </div>
  )
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

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

// ─── Feed Page ────────────────────────────────────────────────────────────────

const PAGE_LIMIT = 20
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

  const fetchPostsAndReactions = React.useCallback(async (tk: string, pg: number, signal?: AbortSignal) => {
    const res = await apiClient.get(`/api/crm/feeds?page=${pg}&limit=${PAGE_LIMIT}`, {
      headers: { Authorization: `Bearer ${tk}` },
      signal,
    })
    const d = res.data?.data || res.data || {}
    const fetchedPosts: Post[] = Array.isArray(d.posts) ? d.posts : []
    let rxMap: Record<string, ReactionState> = {}
    if (fetchedPosts.length > 0) {
      try {
        const rRes = await apiClient.post(
          "/api/crm/feeds/reactions/bulk",
          { targetIds: fetchedPosts.map((p) => p._id) },
          { headers: { Authorization: `Bearer ${tk}` }, signal }
        )
        rxMap = rRes.data?.data?.reactions || {}
      } catch { }
    }
    return { posts: fetchedPosts, hasMore: d.hasMore ?? false, reactions: rxMap }
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

      const t = localStorage.getItem("crm_token")
      if (!t) {
        if (!active) return
        setInitError("Session expired. Please sign in again.")
        setLoadingInit(false)
        router.replace("/crm")
        return
      }

      try {
        const meRes = await apiClient.get("/api/crm/me", {
          headers: { Authorization: `Bearer ${t}` },
          signal: controller.signal,
        })
        if (!active) return
        const me = meRes.data?.data || meRes.data
        if (!me?._id) throw new Error("User profile missing from response")
        setCurrentUser(me)
        setToken(t)

        const { posts, hasMore, reactions } = await fetchPostsAndReactions(t, 1, controller.signal)
        if (!active) return
        setPosts(posts)
        setPostReactions(reactions)
        setHasMore(hasMore)
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
  }, [router, fetchPostsAndReactions, initAttempt])

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
        const res = await apiClient.get(`/api/crm/feeds?page=1&limit=${PAGE_LIMIT}`, { headers: { Authorization: `Bearer ${token}` } })
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

  const loadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const next = page + 1
    try {
      const { posts: morePosts, hasMore: moreHasMore, reactions } = await fetchPostsAndReactions(token, next)
      setPosts((prev) => { const ids = new Set(prev.map((p) => p._id)); return [...prev, ...morePosts.filter((p) => !ids.has(p._id))] })
      setPostReactions((prev) => ({ ...prev, ...reactions }))
      setHasMore(moreHasMore); setPage(next)
    } catch { }
    finally { setLoadingMore(false) }
  }

  const handleRefresh = async () => {
    setRefreshing(true); setNewPostCount(0)
    try {
      const { posts, hasMore, reactions } = await fetchPostsAndReactions(token, 1)
      setPosts(posts); setPostReactions(reactions); setHasMore(hasMore); setPage(1)
    } catch { }
    finally { setRefreshing(false) }
  }

  // ── Loading screen ──────────────────────────────────────────────────────────
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

      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-40 w-full border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center gap-4 h-14 px-6 max-w-6xl 2xl:max-w-7xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full shrink-0 hover:bg-muted/60"
            onClick={() => router.push("/crm/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-3 flex-1">
            <div className="relative h-8 w-8 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-500/20 shrink-0">
              <Car className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight leading-none">
                {activeTab === "feeds" ? "Team Feeds" : "DayPulse"}
              </p>
              <p className="text-[11px] text-muted-foreground/50 mt-0.5">Action Auto CRM</p>
            </div>
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

        <div className="px-6 max-w-6xl 2xl:max-w-7xl mx-auto">
          <TabBar active={activeTab} onChange={setActiveTab} />
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="relative max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-20">
        {/* Ambient background glow */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(800px_circle_at_20%_0%,rgba(16,185,129,0.05),transparent_55%),radial-gradient(700px_circle_at_80%_10%,rgba(16,185,129,0.035),transparent_55%)]" />

        {/* ── Team Feeds tab ── */}
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

            <Composer currentUser={currentUser} token={token} onPosted={(p) => {
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

        {/* ── DayPulse tab ── */}
        {activeTab === "daypulse" && (
          <DayPulsePage currentUser={currentUser} token={token} />
        )}
      </main>
    </div>
  )
}
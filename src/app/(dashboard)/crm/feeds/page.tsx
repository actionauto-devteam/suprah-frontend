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
  RefreshCw,
  Sparkles,
  MessageCircle,
  ChevronUp,
  Rss,
  BarChart2,
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

interface Post {
  _id: string
  userId: string
  authorName: string
  authorAvatar?: string
  authorRole: string
  content: string
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

// ─── Tab type ─────────────────────────────────────────────────────────────────

type FeedTab = "feeds" | "daypulse"

// ─── Reaction Types ───────────────────────────────────────────────────────────

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
  { type: "love", emoji: "❤️", label: "Love", color: "text-red-500", bg: "bg-red-500/10 hover:bg-red-500/20 border-red-500/30" },
  { type: "haha", emoji: "😂", label: "Haha", color: "text-yellow-500", bg: "bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/30" },
  { type: "wow", emoji: "😮", label: "Wow", color: "text-yellow-400", bg: "bg-yellow-400/10 hover:bg-yellow-400/20 border-yellow-400/30" },
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

// ─── Reaction Bar ─────────────────────────────────────────────────────────────

function ReactionBar({
  targetType, targetId, token, reactionState, onReactionChange, compact = false,
}: {
  targetType: "post" | "comment"; targetId: string; token: string
  reactionState: ReactionState; onReactionChange: (state: ReactionState) => void; compact?: boolean
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

  function tooltipFor(type: ReactionType): string {
    const users = summary[type]?.users || []
    if (!users.length) return ""
    if (users.length <= 3) return users.join(", ")
    return `${users.slice(0, 3).join(", ")} and ${users.length - 3} more`
  }

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
            {Object.entries(summary)
              .filter(([, v]) => v.count > 0)
              .sort(([, a], [, b]) => b.count - a.count)
              .map(([type, data]) => {
                const meta = REACTION_MAP[type as ReactionType]
                if (!meta) return null
                return (
                  <span key={type} title={tooltipFor(type as ReactionType)} className={`text-[11px] font-semibold cursor-default transition-colors ${myReaction === type ? meta.color : "text-muted-foreground/40 hover:text-muted-foreground/70"}`}>
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

function DeleteModal({ label = "post", onConfirm, onCancel, loading }: {
  label?: string; onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border/50 bg-card shadow-2xl p-6 space-y-5">
        <div className="space-y-1.5">
          <h3 className="text-base font-bold tracking-tight">Delete {label}?</h3>
          <p className="text-sm text-muted-foreground/60">This action cannot be undone. The {label} will be permanently removed.</p>
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
              <button onClick={() => setShowDeleteModal(true)} className="text-[10px] text-muted-foreground/25 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
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

function CommentSection({ post, currentUser, token, comments, setComments, commentReactions, setCommentReactions }: {
  post: Post; currentUser: CrmUser; token: string
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
  const preferNativeEmoji = usePreferNativeEmojiPicker()
  const inputRef = React.useRef<HTMLTextAreaElement>(null)

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
    if (!newComment.trim()) return
    setSubmitting(true); setSubmitError("")
    try {
      const res = await apiClient.post(`/api/crm/feeds/${post._id}/comments`, { content: newComment.trim() }, { headers: { Authorization: `Bearer ${token}` } })
      const comment: Comment = res.data?.data?.comment
      setComments((prev) => prev.some((c) => c._id === comment._id) ? prev : [...prev, comment])
      setCommentReactions((prev) => ({ ...prev, [comment._id]: { summary: {}, myReaction: null } }))
      setNewComment(""); setShowEmoji(false); setShowAll(true)
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
    <div className="border-t border-border/20 mt-1 pt-3 space-y-3">
      {loading && <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground/30" /></div>}
      {!loading && shouldCollapse && (
        <button onClick={() => setShowAll(true)} className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors">
          <ChevronDown className="h-3.5 w-3.5" /> See {hiddenCount} more {hiddenCount === 1 ? "comment" : "comments"}
        </button>
      )}
      {!loading && comments.length >= COLLAPSE_THRESHOLD && showAll && (
        <button onClick={() => setShowAll(false)} className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors">
          <ChevronUp className="h-3.5 w-3.5" /> Show less
        </button>
      )}
      {!loading && comments.length === 0 && (
        <p className="text-xs text-muted-foreground/30 text-center py-1">No comments yet. Be the first!</p>
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
        <Avatar className="h-7 w-7 shrink-0 mt-0.5 ring-1 ring-border/30">
          <AvatarImage src={currentUser.avatar} />
          <AvatarFallback className="bg-emerald-600 text-white text-[9px] font-bold">{ini(currentUser.fullName)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 relative">
          <div className="rounded-2xl rounded-tl-sm border border-border/40 bg-muted/20 focus-within:border-emerald-500/30 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all">
            <textarea
              ref={inputRef} value={newComment}
              onChange={(e) => { setNewComment(e.target.value); setSubmitError("") }}
              onKeyDown={handleKey}
              placeholder="Write a comment…" rows={1} maxLength={1000}
              className="w-full bg-transparent text-xs leading-relaxed p-2.5 pr-16 resize-none focus:outline-none placeholder:text-muted-foreground/25"
              style={{ minHeight: "36px" }}
            />
            <div className="flex items-center justify-between px-2.5 pb-2">
              {preferNativeEmoji ? (
                <button
                  type="button"
                  onClick={() => inputRef.current?.focus()}
                  className="text-muted-foreground/25 hover:text-muted-foreground/60 transition-colors"
                  title="Use your keyboard's emoji picker"
                >
                  <Smile className="h-3.5 w-3.5" />
                </button>
              ) : (
                <Popover open={showEmoji} onOpenChange={setShowEmoji}>
                  <PopoverTrigger asChild>
                    <button type="button" className="text-muted-foreground/25 hover:text-muted-foreground/60 transition-colors">
                      <Smile className="h-3.5 w-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="top"
                    align="start"
                    sideOffset={8}
                    collisionPadding={8}
                    className="w-auto border-none bg-transparent p-0 shadow-none"
                  >
                    <div className="rounded-2xl border border-border/40 bg-card/95 shadow-2xl overflow-hidden">
                      <EmojiPicker
                        theme={"auto" as Theme}
                        onEmojiClick={(e: EmojiClickData) => {
                          setNewComment((p) => p + e.emoji)
                          setShowEmoji(false)
                          inputRef.current?.focus()
                        }}
                        height={320}
                        width={280}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              <button type="button" onClick={handleSubmit} disabled={submitting || !newComment.trim()} className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 hover:text-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Post
              </button>
            </div>
          </div>
          {submitError && <p className="text-[10px] text-red-500 mt-1 pl-1">{submitError}</p>}
          {newComment && !submitError && <p className="text-[9px] text-muted-foreground/20 mt-1 pl-1">Ctrl+Enter to post</p>}
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

  const isOwner = post.userId === currentUser._id
  const isAdmin = currentUser.role === "admin"
  const canEdit = isOwner
  const canDelete = isOwner || isAdmin

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

  return (
    <>
      {showDeleteModal && <DeleteModal label="post" onConfirm={handleDelete} onCancel={() => setShowDeleteModal(false)} loading={deleteLoading} />}
      <article className="group rounded-2xl border border-border/40 bg-card p-5 space-y-3 transition-colors hover:border-border/60">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-9 w-9 shrink-0 ring-2 ring-border/30">
              <AvatarImage src={post.authorAvatar} />
              <AvatarFallback className="bg-emerald-600 text-white text-xs font-bold">{ini(post.authorName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold truncate leading-none">{post.authorName}</p>
                <Badge variant="outline" className={`text-[9px] h-4 px-1.5 rounded-full capitalize font-semibold leading-none border ${ROLE_COLORS[post.authorRole] ?? ROLE_COLORS.employee}`}>
                  {post.authorRole}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <p className="text-[11px] text-muted-foreground/40 cursor-default" title={fullDate(post.createdAt)}>{timeAgo(post.createdAt)}</p>
                {post.isEdited && <span className="text-[10px] text-muted-foreground/30 italic">(edited)</span>}
              </div>
            </div>
          </div>
          {(canEdit || canDelete) && !isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 rounded-xl border-border/40 shadow-xl p-1">
                {canEdit && (
                  <DropdownMenuItem className="rounded-lg text-xs h-8 gap-2.5 cursor-pointer" onClick={() => { setIsEditing(true); setEditContent(post.content) }}>
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" /> Edit post
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem className="rounded-lg text-xs h-8 gap-2.5 cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/5" onClick={() => setShowDeleteModal(true)}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete post
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <div className="relative">
              <textarea
                ref={editRef} value={editContent}
                onChange={(e) => { setEditContent(e.target.value); setEditError("") }}
                rows={4} maxLength={5000}
                className="w-full rounded-xl border border-border/50 bg-muted/20 text-sm p-3 pr-10 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30 leading-relaxed"
              />
              {preferNativeEmoji ? (
                <button
                  type="button"
                  onClick={() => editRef.current?.focus()}
                  className="absolute bottom-2.5 right-2.5 text-muted-foreground/30 hover:text-muted-foreground/70 transition-colors"
                  title="Use your keyboard's emoji picker"
                >
                  <Smile className="h-4 w-4" />
                </button>
              ) : (
                <Popover open={showEmojiEdit} onOpenChange={setShowEmojiEdit}>
                  <PopoverTrigger asChild>
                    <button type="button" className="absolute bottom-2.5 right-2.5 text-muted-foreground/30 hover:text-muted-foreground/70 transition-colors">
                      <Smile className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="top"
                    align="end"
                    sideOffset={8}
                    collisionPadding={8}
                    className="w-auto border-none bg-transparent p-0 shadow-none"
                  >
                    <div className="rounded-2xl border border-border/40 bg-card/95 shadow-2xl overflow-hidden">
                      <EmojiPicker
                        theme={"auto" as Theme}
                        onEmojiClick={(e: EmojiClickData) => {
                          setEditContent((p) => p + e.emoji)
                          setShowEmojiEdit(false)
                        }}
                        height={380}
                        width={320}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
            {editError && <p className="text-xs text-red-500">{editError}</p>}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground/30 tabular-nums">{editContent.length}/5000</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="h-8 rounded-xl text-xs gap-1.5" onClick={() => { setIsEditing(false); setEditError("") }} disabled={editLoading}>
                  <X className="h-3.5 w-3.5" /> Cancel
                </Button>
                <Button size="sm" className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5" onClick={handleSave} disabled={editLoading || !editContent.trim()}>
                  {editLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word text-foreground/85">{post.content}</p>
        )}

        <ReactionBar targetType="post" targetId={post._id} token={token} reactionState={reactionState} onReactionChange={onReactionChange} />

        <CommentSection
          post={post} currentUser={currentUser} token={token}
          comments={comments} setComments={setComments}
          commentReactions={commentReactions} setCommentReactions={setCommentReactions}
        />
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
  const preferNativeEmoji = usePreferNativeEmojiPicker()
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const handleSubmit = async () => {
    if (!content.trim()) { setError("Write something first!"); return }
    setLoading(true); setError("")
    try {
      const res = await apiClient.post("/api/crm/feeds", { content: content.trim() }, { headers: { Authorization: `Bearer ${token}` } })
      onPosted(res.data?.data?.post || res.data?.post)
      setContent(""); textareaRef.current?.blur(); setIsFocused(false)
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to post")
    } finally { setLoading(false) }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); handleSubmit() }
  }

  return (
    <div className={`rounded-2xl border bg-card p-5 space-y-3 transition-all duration-200 ${isFocused ? "border-emerald-500/30 shadow-sm shadow-emerald-500/5" : "border-border/40"}`}>
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9 shrink-0 mt-1 ring-2 ring-border/30">
          <AvatarImage src={currentUser.avatar} />
          <AvatarFallback className="bg-emerald-600 text-white text-xs font-bold">{ini(currentUser.fullName)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef} value={content}
            onChange={(e) => { setContent(e.target.value); setError("") }}
            onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
            onKeyDown={handleKey}
            placeholder={`What's on your mind, ${currentUser.fullName.split(" ")[0]}?`}
            rows={isFocused || content ? 4 : 2} maxLength={5000}
            className="w-full bg-transparent text-sm leading-relaxed resize-none focus:outline-none placeholder:text-muted-foreground/30 transition-all duration-200"
          />
        </div>
      </div>
      <div className="flex items-center justify-between pl-12 border-t border-border/20 pt-3">
        {preferNativeEmoji ? (
          <button
            type="button"
            onClick={() => textareaRef.current?.focus()}
            className="flex items-center gap-1.5 text-xs font-medium rounded-lg px-2.5 py-1.5 transition-colors text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/40"
            title="Use your keyboard's emoji picker"
          >
            <Smile className="h-4 w-4" /> Emoji
          </button>
        ) : (
          <Popover open={showEmoji} onOpenChange={setShowEmoji}>
            <PopoverTrigger asChild>
              <button type="button" className={`flex items-center gap-1.5 text-xs font-medium rounded-lg px-2.5 py-1.5 transition-colors ${showEmoji ? "bg-emerald-500/10 text-emerald-600" : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/40"}`}>
                <Smile className="h-4 w-4" /> Emoji
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="start"
              sideOffset={8}
              collisionPadding={8}
              className="w-auto border-none bg-transparent p-0 shadow-none"
            >
              <div className="rounded-2xl border border-border/40 bg-card/95 shadow-2xl overflow-hidden">
                <EmojiPicker
                  theme={"auto" as Theme}
                  onEmojiClick={(e: EmojiClickData) => {
                    setContent((p) => p + e.emoji)
                    setShowEmoji(false)
                    textareaRef.current?.focus()
                  }}
                  height={380}
                  width={320}
                />
              </div>
            </PopoverContent>
          </Popover>
        )}
        <div className="flex items-center gap-3">
          {content.length > 0 && (
            <span className={`text-[10px] tabular-nums font-medium transition-colors ${content.length > 4500 ? "text-red-500" : "text-muted-foreground/30"}`}>
              {content.length}/5000
            </span>
          )}
          <Button onClick={handleSubmit} disabled={loading || !content.trim()} size="sm" className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 px-4 disabled:opacity-40">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Post
          </Button>
        </div>
      </div>
      {error && <p className="text-xs text-red-500 pl-12">{error}</p>}
      {content && !error && <p className="text-[10px] text-muted-foreground/25 pl-12">Tip: Press Ctrl+Enter to post</p>}
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
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition-all relative
            ${active === key
              ? "text-emerald-600"
              : "text-muted-foreground/50 hover:text-muted-foreground/80"
            }`}
        >
          {icon}
          {label}
          {/* Active indicator */}
          {active === key && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-emerald-600" />
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Feed Page ────────────────────────────────────────────────────────────────

const PAGE_LIMIT = 20

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
  const [loadingMore, setLoadingMore] = React.useState(false)
  const [refreshing, setRefreshing] = React.useState(false)
  const [newPostCount, setNewPostCount] = React.useState(0)
  const observerRef = React.useRef<HTMLDivElement>(null)
  const socketRef = React.useRef<any>(null)

  // Auth check
  React.useEffect(() => {
    const t = localStorage.getItem("crm_token")
    if (!t) { router.replace("/crm"); return }
    apiClient.get("/api/crm/me", { headers: { Authorization: `Bearer ${t}` } })
      .then((res) => { setCurrentUser(res.data?.data || res.data); setToken(t) })
      .catch(() => { localStorage.removeItem("crm_token"); router.replace("/crm") })
  }, [router])

  const fetchPostsAndReactions = React.useCallback(async (tk: string, pg: number) => {
    const res = await apiClient.get(`/api/crm/feeds?page=${pg}&limit=${PAGE_LIMIT}`, {
      headers: { Authorization: `Bearer ${tk}` },
    })
    const d = res.data?.data
    const fetchedPosts: Post[] = d.posts || []
    let rxMap: Record<string, ReactionState> = {}
    if (fetchedPosts.length > 0) {
      try {
        const rRes = await apiClient.post("/api/crm/feeds/reactions/bulk", { targetIds: fetchedPosts.map((p) => p._id) }, { headers: { Authorization: `Bearer ${tk}` } })
        rxMap = rRes.data?.data?.reactions || {}
      } catch { }
    }
    return { posts: fetchedPosts, hasMore: d.hasMore ?? false, reactions: rxMap }
  }, [])

  // Initial fetch
  React.useEffect(() => {
    if (!token) return
    fetchPostsAndReactions(token, 1)
      .then(({ posts, hasMore, reactions }) => { setPosts(posts); setPostReactions(reactions); setHasMore(hasMore) })
      .catch(() => { })
      .finally(() => setLoadingInit(false))
  }, [token, fetchPostsAndReactions])

  // Socket.IO real-time
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

  // 30-second polling fallback
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

  // Infinite scroll (only active on feeds tab)
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

  if (loadingInit || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
          </div>
          <p className="text-xs text-muted-foreground/40 tracking-widest uppercase">Loading feed…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-background">

      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/90 backdrop-blur-xl">
        <div className="flex items-center gap-4 h-14 px-6 max-w-4xl mx-auto">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl shrink-0" onClick={() => router.push("/crm/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <div className="h-7 w-7 rounded-lg bg-emerald-600 flex items-center justify-center shadow-sm">
              <Car className="h-3.5 w-3.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none">
                {activeTab === "feeds" ? "Team Feeds" : "DayPulse"}
              </p>
              <p className="text-[9px] uppercase tracking-[0.25em] text-emerald-600 mt-0.5 font-bold">Action Auto CRM</p>
            </div>
          </div>
          {/* Only show refresh on the feeds tab */}
          {activeTab === "feeds" && (
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl shrink-0" onClick={handleRefresh} disabled={refreshing} title="Refresh">
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          )}
        </div>

        {/* Tab bar sits below the header row, inside the sticky wrapper */}
        <div className="px-6 max-w-4xl mx-auto">
          <TabBar active={activeTab} onChange={setActiveTab} />
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-20">

        {/* ── Team Feeds tab ── */}
        {activeTab === "feeds" && (
          <>
            {newPostCount > 0 && (
              <button onClick={handleRefresh} className="w-full flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 hover:bg-emerald-500/10 py-3 text-xs font-semibold text-emerald-600 transition-colors">
                <Sparkles className="h-3.5 w-3.5" />
                {newPostCount} new {newPostCount === 1 ? "post" : "posts"} — tap to refresh
              </button>
            )}

            <Composer currentUser={currentUser} token={token} onPosted={(p) => {
              setPosts((prev) => [p, ...prev])
              setPostReactions((prev) => ({ ...prev, [p._id]: { summary: {}, myReaction: null } }))
            }} />

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border/30" />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/25">Latest</p>
              <div className="flex-1 h-px bg-border/30" />
            </div>

            {posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-20">
                <div className="h-16 w-16 rounded-2xl border-2 border-dashed border-border/25 flex items-center justify-center">
                  <Sparkles className="h-7 w-7 text-muted-foreground/15" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-semibold text-muted-foreground/40">No posts yet</p>
                  <p className="text-xs text-muted-foreground/25">Be the first to post something!</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
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
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground/30" /></div>
            )}
            {!hasMore && posts.length > 0 && (
              <div className="flex items-center gap-3 py-4">
                <div className="flex-1 h-px bg-border/20" />
                <p className="text-[10px] text-muted-foreground/25 font-medium uppercase tracking-widest">You&apos;re all caught up</p>
                <div className="flex-1 h-px bg-border/20" />
              </div>
            )}
            {hasMore && !loadingMore && (
              <Button variant="outline" className="w-full rounded-xl h-10 text-xs gap-2 border-border/30 hover:border-emerald-500/30" onClick={loadMore}>
                <ChevronDown className="h-4 w-4" /> Load more posts
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
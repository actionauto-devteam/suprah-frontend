"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  X,
  Loader2,
  Send,
  Trash2,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Pencil,
  Eye,
  MessageCircle,
  Pause,
  Play,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiClient } from "@/lib/api-client";
import { io, type Socket } from "socket.io-client";

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface StoryItem {
  _id: string;
  userId: string;
  authorName: string;
  authorAvatar?: string;
  media: {
    url: string;
    mimeType: string;
    mediaType: "image" | "video";
    durationSec?: number;
    thumbnailUrl?: string;
  };
  caption?: string;
  createdAt: string;
  reactionCount: number;
  myReaction: string | null;
  viewedByMe: boolean;
  commentCount: number;
}

interface RailNote {
  _id: string;
  text: string;
  updatedAt: string;
}

interface RailUser {
  _id: string;
  fullName: string;
  avatar?: string;
  role?: string;
  isMe: boolean;
  hasStory: boolean;
  hasUnseen: boolean;
  storyCount: number;
  stories: StoryItem[];
  note: RailNote | null;
}

/* ── Constants / helpers ───────────────────────────────────────────────────── */

const MAX_VIDEO_SECONDS = 120;
const PHOTO_DURATION_MS = 15_000;
const NOTE_MAX = 100;
const QUICK_REACTIONS = ["❤️", "🔥", "👏", "😂", "😮", "😢"];
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/quicktime"];

function ini(n?: string) {
  return (n || "U").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

// All story timestamps render in Mountain Time (MDT/MST), matching the rest of
// the dashboard.
const MOUNTAIN_TZ = "America/Denver";
function mdtTime(d: string | Date) {
  return new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: MOUNTAIN_TZ });
}
function mdtDateTime(d: string | Date) {
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: MOUNTAIN_TZ });
}

/**
 * Renders children into document.body. Full-screen overlays (viewer/composer/
 * note modals) must escape ancestors that have transforms, filters, or
 * backdrop-blur — otherwise `position: fixed` is contained by that ancestor and
 * the overlay renders in the wrong place or not at all (this is what broke the
 * story viewer on desktop, where the dashboard shell uses backdrop-blur).
 */
function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);
  if (!mounted || typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

/** Downscale + re-encode an image to keep uploads light. */
function compressImage(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const maxDim = 1440;
      let { width, height } = img;
      if (Math.max(width, height) > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas unsupported"));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) return reject(new Error("Compression failed"));
          resolve({ blob, width, height });
        },
        "image/jpeg",
        0.82
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

/** Read a video's duration and grab a first-frame JPEG thumbnail. */
function inspectVideo(
  file: File
): Promise<{ durationSec: number; width: number; height: number; thumbnail: Blob | null }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.muted = true;
    video.src = url;
    const cleanup = () => URL.revokeObjectURL(url);

    video.onloadedmetadata = () => {
      const durationSec = video.duration || 0;
      const width = video.videoWidth;
      const height = video.videoHeight;
      video.currentTime = Math.min(0.1, durationSec / 2 || 0.1);
      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = width || 720;
        canvas.height = height || 1280;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          cleanup();
          return resolve({ durationSec, width, height, thumbnail: null });
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            cleanup();
            resolve({ durationSec, width, height, thumbnail: blob });
          },
          "image/jpeg",
          0.8
        );
      };
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("Could not read video"));
    };
  });
}

/* ── Note editor (Instagram "Leave a note") ────────────────────────────────── */

function NoteEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    setSaving(true);
    try {
      if (!draft.trim()) await apiClient.delete("/api/crm/notes");
      else await apiClient.put("/api/crm/notes", { text: draft.trim() });
      onSaved();
      onClose();
    } catch {
      setSaving(false);
    }
  };

  const del = async () => {
    setSaving(true);
    try {
      await apiClient.delete("/api/crm/notes");
      onSaved();
      onClose();
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-card/95 backdrop-blur-2xl shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/40 px-5 py-3.5">
          <h3 className="text-sm font-black tracking-tight">Share a note</h3>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted/60"><X className="size-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="relative rounded-2xl rounded-bl-md border border-emerald-500/30 bg-emerald-500/[0.07] px-4 py-3">
            <textarea
              autoFocus
              value={draft}
              maxLength={NOTE_MAX}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              placeholder="What's on your mind?"
              className="w-full resize-none bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/40"
            />
            <span className="absolute bottom-1.5 right-3 text-[9px] tabular-nums text-muted-foreground/40">{draft.length}/{NOTE_MAX}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {initial ? "Update note" : "Share note"}
            </button>
            {initial && (
              <button
                onClick={del}
                disabled={saving}
                className="rounded-full border border-rose-500/40 px-4 py-2.5 text-sm font-medium text-rose-500 hover:bg-rose-500/10 transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Composer ──────────────────────────────────────────────────────────────── */

function StoryComposer({ onClose, onPosted }: { onClose: () => void; onPosted: () => void }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isVideo, setIsVideo] = React.useState(false);
  const [caption, setCaption] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<number | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const pick = (f?: File | null) => {
    if (!f) return;
    if (!ACCEPTED.includes(f.type)) {
      setError("Unsupported format. Use JPG, PNG, WEBP, GIF, MP4, WEBM, or MOV.");
      return;
    }
    setError(null);
    setFile(f);
    setIsVideo(f.type.startsWith("video/"));
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!file) return;
    setError(null);
    setProgress(0);
    try {
      const form = new FormData();
      if (isVideo) {
        const { durationSec, width, height, thumbnail } = await inspectVideo(file);
        if (durationSec > MAX_VIDEO_SECONDS + 1) {
          setProgress(null);
          setError(`Video stories can be at most ${MAX_VIDEO_SECONDS / 60} minutes.`);
          return;
        }
        form.append("media", file, file.name);
        if (thumbnail) form.append("thumbnail", thumbnail, "thumb.jpg");
        form.append("durationSec", String(Math.round(durationSec)));
        if (width) form.append("width", String(width));
        if (height) form.append("height", String(height));
      } else {
        const { blob, width, height } = await compressImage(file);
        form.append("media", blob, (file.name.replace(/\.[^.]+$/, "") || "story") + ".jpg");
        form.append("width", String(width));
        form.append("height", String(height));
      }
      if (caption.trim()) form.append("caption", caption.trim());

      await apiClient.post("/api/crm/stories", form, {
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      onPosted();
      onClose();
    } catch (e: any) {
      setProgress(null);
      setError(e?.response?.data?.message || "Upload failed. Try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-card/95 backdrop-blur-2xl shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/40 px-5 py-3.5">
          <h3 className="text-sm font-black tracking-tight">Add to your day</h3>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted/60"><X className="size-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          {!file ? (
            <button
              onClick={() => inputRef.current?.click()}
              className="flex aspect-[9/12] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border/50 bg-muted/20 hover:border-emerald-500/40 transition-colors"
            >
              <ImagePlus className="size-8 text-muted-foreground/50" />
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground/80">Upload photo or video</p>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">Video up to 2 min · disappears in 24h</p>
              </div>
            </button>
          ) : (
            <div className="relative aspect-[9/12] w-full overflow-hidden rounded-2xl bg-black">
              {isVideo ? (
                <video src={previewUrl!} className="size-full object-contain" controls muted />
              ) : (
                <img src={previewUrl!} alt="" className="size-full object-contain" />
              )}
              <button
                onClick={() => { setFile(null); setPreviewUrl(null); }}
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
              >
                <X className="size-4" />
              </button>
            </div>
          )}

          <input ref={inputRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />

          {file && (
            <input
              value={caption}
              maxLength={300}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption…"
              className="w-full rounded-xl border border-border/40 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/40 placeholder:text-muted-foreground/40"
            />
          )}

          {error && <p className="text-xs text-rose-500">{error}</p>}

          {progress !== null && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}

          <button
            onClick={submit}
            disabled={!file || progress !== null}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            {progress !== null ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {progress !== null ? `Uploading ${progress}%` : "Share to your day"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Viewer ────────────────────────────────────────────────────────────────── */

interface StoryComment {
  _id: string;
  userId: string;
  authorName: string;
  authorAvatar?: string;
  text: string;
  createdAt: string;
}
interface StoryViewerRow {
  userId: string;
  name: string;
  avatar?: string;
  viewedAt: string;
  emoji: string | null;
}
interface StoryDetail {
  isOwner: boolean;
  myReaction: string | null;
  reactionCount: number;
  viewCount: number;
  commentCount: number;
  comments: StoryComment[];
  viewers?: StoryViewerRow[];
  reactions?: { userId: string; authorName: string; authorAvatar?: string; emoji: string }[];
}

function StoryViewer({
  authors,
  start,
  onClose,
  onChanged,
}: {
  authors: RailUser[];
  start: { author: number; story: number };
  onClose: () => void;
  onChanged: () => void;
}) {
  // Freeze the author list for the session so background re-sorts don't shuffle
  // indices mid-view.
  const authorsRef = React.useRef(authors);
  const list = authorsRef.current;

  const [ai, setAi] = React.useState(start.author);
  const [si, setSi] = React.useState(start.story);
  const [progress, setProgress] = React.useState(0);
  const [muted, setMuted] = React.useState(false);
  const [manualPause, setManualPause] = React.useState(false);
  const [inputFocused, setInputFocused] = React.useState(false);
  const [panel, setPanel] = React.useState<null | "comments" | "viewers">(null);
  const [detail, setDetail] = React.useState<StoryDetail | null>(null);
  const [commentText, setCommentText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [mediaDuration, setMediaDuration] = React.useState(PHOTO_DURATION_MS / 1000); // seconds
  const [burst, setBurst] = React.useState<{ emoji: string; id: number } | null>(null);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const rafRef = React.useRef<number | null>(null);
  const elapsedRef = React.useRef(0);
  const lastTsRef = React.useRef(0);

  const author = list[ai];
  const story = author?.stories[si];
  const isMine = Boolean(author?.isMe);

  // A story is paused when the user pauses it, opens a panel, or types a comment.
  const paused = manualPause || panel !== null || inputFocused;

  const stopLoop = () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null; };

  const goNext = React.useCallback(() => {
    stopLoop();
    setProgress(0);
    setPanel(null);
    setManualPause(false);
    setCommentText("");
    if (!author) return onClose();
    if (si < author.stories.length - 1) return setSi(si + 1);
    if (ai < list.length - 1) { setAi(ai + 1); setSi(0); return; }
    onClose();
  }, [ai, si, author, list.length, onClose]);

  const goPrev = () => {
    stopLoop();
    setProgress(0);
    setPanel(null);
    setManualPause(false);
    if (si > 0) return setSi(si - 1);
    if (ai > 0) { setAi(ai - 1); setSi(list[ai - 1].stories.length - 1); return; }
    setProgress(0);
  };

  const loadDetail = React.useCallback(() => {
    if (!story) return;
    apiClient
      .get(`/api/crm/stories/${story._id}`)
      .then((res) => setDetail(res.data?.data?.story || null))
      .catch(() => {});
  }, [story?._id]);

  // On each story: reset duration/pause, mark viewed, load detail + light poll.
  React.useEffect(() => {
    if (!story) return;
    setDetail(null);
    setManualPause(false);
    setMediaDuration(story.media.mediaType === "image" ? PHOTO_DURATION_MS / 1000 : (story.media.durationSec || 0));
    apiClient.post(`/api/crm/stories/${story._id}/view`).catch(() => {});
    loadDetail();
    const id = setInterval(loadDetail, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?._id]);

  // Auto-advance timer for images (respects pause).
  React.useEffect(() => {
    if (!story || story.media.mediaType !== "image") return;
    lastTsRef.current = performance.now();
    const tick = (ts: number) => {
      const dt = ts - lastTsRef.current;
      lastTsRef.current = ts;
      if (!paused) {
        elapsedRef.current += dt;
        const p = Math.min(1, elapsedRef.current / PHOTO_DURATION_MS);
        setProgress(p);
        if (p >= 1) { goNext(); return; }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return stopLoop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?._id, paused]);

  // Reset the image elapsed accumulator whenever the story changes.
  React.useEffect(() => { elapsedRef.current = 0; }, [story?._id]);

  // Pause/resume the video with the derived pause state.
  React.useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (paused) v.pause();
    else v.play().catch(() => {});
  }, [paused]);

  const react = async (emoji: string) => {
    if (!story) return;
    setBurst({ emoji, id: Date.now() });      // fire the float-up animation
    window.setTimeout(() => setBurst(null), 900);
    try {
      await apiClient.post(`/api/crm/stories/${story._id}/react`, { emoji });
      loadDetail();
    } catch { /* ignore */ }
  };

  const sendComment = async () => {
    if (!story || !commentText.trim()) return;
    setSending(true);
    try {
      await apiClient.post(`/api/crm/stories/${story._id}/comment`, { text: commentText.trim() });
      setCommentText("");
      loadDetail();
      setPanel("comments");
    } catch { /* ignore */ } finally { setSending(false); }
  };

  const remove = async () => {
    if (!story) return;
    try { await apiClient.delete(`/api/crm/stories/${story._id}`); onChanged(); goNext(); } catch { /* ignore */ }
  };

  if (!author || !story) return null;

  const commentCount = detail?.commentCount ?? story.commentCount ?? 0;
  const viewCount = detail?.viewCount ?? 0;
  const reactionCount = detail?.reactionCount ?? story.reactionCount ?? 0;
  const myReaction = detail?.myReaction ?? story.myReaction ?? null;

  const remaining = Math.max(0, Math.ceil((1 - progress) * (mediaDuration || 0)));
  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <style>{`@keyframes storyReactFloat{0%{opacity:0;transform:translateY(28px) scale(.4)}25%{opacity:1;transform:translateY(0) scale(1.15)}100%{opacity:0;transform:translateY(-150px) scale(1.75)}}`}</style>
      <button onClick={onClose} className="absolute right-4 top-4 z-30 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
        <X className="size-5" />
      </button>
      <button onClick={goPrev} className="absolute left-2 sm:left-6 z-20 rounded-full bg-white/5 p-2 text-white/70 hover:bg-white/15">
        <ChevronLeft className="size-6" />
      </button>
      <button onClick={goNext} className="absolute right-2 sm:right-6 z-20 rounded-full bg-white/5 p-2 text-white/70 hover:bg-white/15">
        <ChevronRight className="size-6" />
      </button>

      <div className="relative flex h-full max-h-[92vh] w-full max-w-md flex-col">
        <div className="flex gap-1 px-3 pt-3">
          {author.stories.map((_, i) => (
            <div key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
              <div className="h-full bg-white transition-[width] duration-75" style={{ width: i < si ? "100%" : i === si ? `${progress * 100}%` : "0%" }} />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2.5 px-4 py-3">
          <Avatar className="size-8 ring-2 ring-white/20">
            <AvatarImage src={author.avatar} />
            <AvatarFallback className="bg-emerald-600 text-white text-[10px] font-bold">{ini(author.fullName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{author.fullName}</p>
            <p className="text-[10px] text-white/50">{mdtTime(story.createdAt)} MDT</p>
          </div>
          {mediaDuration > 0 && (
            <span className="rounded-full bg-black/40 px-2 py-0.5 text-[11px] font-bold tabular-nums text-white/90">
              {fmtTime(remaining)}
            </span>
          )}
          <button
            onClick={() => setManualPause((p) => !p)}
            className="rounded-full bg-white/10 p-1.5 text-white hover:bg-white/20"
            aria-label={paused ? "Play" : "Pause"}
          >
            {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
          </button>
          {story.media.mediaType === "video" && (
            <button onClick={() => setMuted((m) => !m)} className="rounded-full bg-white/10 p-1.5 text-white hover:bg-white/20">
              {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
          )}
          {isMine && (
            <button onClick={remove} className="rounded-full bg-white/10 p-1.5 text-white hover:bg-rose-500/70">
              <Trash2 className="size-4" />
            </button>
          )}
        </div>

        <div className="relative flex-1 overflow-hidden bg-black">
          {story.media.mediaType === "video" ? (
            <video
              key={story._id}
              ref={videoRef}
              src={story.media.url}
              className="size-full object-contain"
              autoPlay
              muted={muted}
              playsInline
              onLoadedMetadata={(e) => { const v = e.currentTarget; if (v.duration && isFinite(v.duration)) setMediaDuration(v.duration); }}
              onTimeUpdate={(e) => { const v = e.currentTarget; if (v.duration) setProgress(v.currentTime / v.duration); }}
              onEnded={goNext}
            />
          ) : (
            <img key={story._id} src={story.media.url} alt="" className="size-full object-contain" />
          )}
          {story.caption && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-4 pt-10">
              <p className="text-sm text-white/90">{story.caption}</p>
            </div>
          )}

          {/* Reaction float-up animation */}
          {burst && (
            <div key={burst.id} className="pointer-events-none absolute inset-0 z-10 flex items-end justify-center pb-24">
              <span className="text-6xl drop-shadow-lg" style={{ animation: "storyReactFloat 900ms ease-out forwards" }}>
                {burst.emoji}
              </span>
            </div>
          )}

          {/* Paused hint */}
          {paused && !panel && (
            <div className="pointer-events-none absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/90">
              <Pause className="size-3" /> Paused
            </div>
          )}

          {/* Slide-up panel: comments (everyone) or seen-by (owner) */}
          {panel && (
            <div className="absolute inset-x-0 bottom-0 top-1/3 z-20 flex flex-col rounded-t-3xl border-t border-white/10 bg-neutral-950/95 backdrop-blur-xl animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <p className="text-sm font-bold text-white">
                  {panel === "comments" ? `Comments · ${commentCount}` : `Seen by · ${viewCount}`}
                </p>
                <button onClick={() => setPanel(null)} className="rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white">
                  <X className="size-4" />
                </button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
                {panel === "comments" ? (
                  (detail?.comments?.length ?? 0) === 0 ? (
                    <p className="py-8 text-center text-xs text-white/40">No comments yet. Be the first.</p>
                  ) : (
                    detail!.comments.map((c) => (
                      <div key={c._id} className="flex items-start gap-2.5">
                        <Avatar className="size-7 shrink-0">
                          <AvatarImage src={c.authorAvatar} />
                          <AvatarFallback className="bg-neutral-700 text-white text-[9px] font-bold">{ini(c.authorName)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-white/90">
                            <span className="font-semibold">{c.authorName}</span>{" "}
                            <span className="text-white/80">{c.text}</span>
                          </p>
                          <p className="mt-0.5 text-[9px] text-white/35">{mdtDateTime(c.createdAt)}</p>
                        </div>
                      </div>
                    ))
                  )
                ) : (detail?.viewers?.length ?? 0) === 0 ? (
                  <p className="py-8 text-center text-xs text-white/40">No views yet.</p>
                ) : (
                  detail!.viewers!.map((v) => (
                    <div key={v.userId} className="flex items-center gap-2.5">
                      <Avatar className="size-7 shrink-0">
                        <AvatarImage src={v.avatar} />
                        <AvatarFallback className="bg-neutral-700 text-white text-[9px] font-bold">{ini(v.name)}</AvatarFallback>
                      </Avatar>
                      <p className="min-w-0 flex-1 truncate text-xs font-medium text-white/90">{v.name}</p>
                      {v.emoji && <span className="text-base">{v.emoji}</span>}
                      <span className="text-[9px] text-white/35">{mdtTime(v.viewedAt)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer: reactions (non-owner) + chips + public comment box */}
        <div className="space-y-2 px-4 py-3">
          {!isMine && (
            <div className="flex items-center justify-center gap-2">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => react(emoji)}
                  className={`text-2xl transition-transform duration-150 hover:scale-125 active:scale-[1.6] ${myReaction === emoji ? "scale-125 drop-shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "opacity-80"}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPanel(panel === "comments" ? null : "comments")}
              className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-white/20"
            >
              <MessageCircle className="size-3.5" /> {commentCount} Comments
            </button>
            {isMine && (
              <button
                onClick={() => setPanel(panel === "viewers" ? null : "viewers")}
                className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-white/20"
              >
                <Eye className="size-3.5" /> {viewCount} Seen{reactionCount ? ` · ${reactionCount} ❤` : ""}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onKeyDown={(e) => { if (e.key === "Enter") sendComment(); }}
              placeholder="Add a comment…"
              className="flex-1 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/40"
            />
            <button onClick={sendComment} disabled={!commentText.trim() || sending} className="rounded-full bg-emerald-600 p-2 text-white hover:bg-emerald-500 disabled:opacity-40">
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Note detail (full note + reactions + public comments) ─────────────────── */

interface NoteDetailData {
  _id: string;
  authorName: string;
  authorAvatar?: string;
  text: string;
  updatedAt: string;
  isOwner: boolean;
  myReaction: string | null;
  reactionCount: number;
  commentCount: number;
  comments: StoryComment[];
  reactions?: { userId: string; authorName?: string; authorAvatar?: string; emoji: string }[];
}

function NoteDetail({
  noteId,
  onClose,
  onChanged,
  onEdit,
}: {
  noteId: string;
  onClose: () => void;
  onChanged: () => void;
  onEdit: () => void;
}) {
  const [note, setNote] = React.useState<NoteDetailData | null>(null);
  const [commentText, setCommentText] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const loadDetail = React.useCallback(() => {
    apiClient
      .get(`/api/crm/notes/${noteId}`)
      .then((res) => setNote(res.data?.data?.note || null))
      .catch(() => setNote(null));
  }, [noteId]);

  React.useEffect(() => {
    loadDetail();
    const id = setInterval(loadDetail, 5000);
    return () => clearInterval(id);
  }, [loadDetail]);

  const react = async (emoji: string) => {
    try { await apiClient.post(`/api/crm/notes/${noteId}/react`, { emoji }); loadDetail(); onChanged(); } catch { /* ignore */ }
  };

  const sendComment = async () => {
    if (!commentText.trim()) return;
    setSending(true);
    try {
      await apiClient.post(`/api/crm/notes/${noteId}/comment`, { text: commentText.trim() });
      setCommentText("");
      loadDetail();
      onChanged();
    } catch { /* ignore */ } finally { setSending(false); }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 bg-card/95 shadow-2xl backdrop-blur-2xl">
          {/* Header */}
          <div className="flex items-center gap-2.5 border-b border-border/40 px-5 py-3.5">
            <Avatar className="size-9">
              <AvatarImage src={note?.authorAvatar} />
              <AvatarFallback className="bg-emerald-600 text-white text-[10px] font-bold">{ini(note?.authorName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{note?.authorName || "Note"}</p>
              {note && <p className="text-[10px] text-muted-foreground/60">{mdtDateTime(note.updatedAt)}</p>}
            </div>
            {note?.isOwner && (
              <button onClick={onEdit} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted/60 hover:text-foreground" aria-label="Edit note">
                <Pencil className="size-4" />
              </button>
            )}
            <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted/60" aria-label="Close"><X className="size-4" /></button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {/* The note itself */}
            <div className="rounded-2xl rounded-bl-md border border-emerald-500/25 bg-emerald-500/[0.07] px-4 py-3">
              <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground/90">
                {note?.text || "…"}
              </p>
            </div>

            {/* Reactions */}
            <div>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => react(emoji)}
                    className={`text-2xl transition-transform duration-150 hover:scale-125 active:scale-[1.6] ${note?.myReaction === emoji ? "scale-125 drop-shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "opacity-80"}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              {(note?.reactionCount ?? 0) > 0 && (
                <p className="mt-1.5 text-center text-[10px] font-medium text-muted-foreground/60">
                  {note!.reactionCount} reaction{note!.reactionCount === 1 ? "" : "s"}
                </p>
              )}
            </div>

            {/* Comments */}
            <div className="space-y-3 border-t border-border/30 pt-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground/60">
                Comments · {note?.commentCount ?? 0}
              </p>
              {(note?.comments?.length ?? 0) === 0 ? (
                <p className="py-2 text-center text-xs text-muted-foreground/50">No comments yet. Be the first.</p>
              ) : (
                note!.comments.map((c) => (
                  <div key={c._id} className="flex items-start gap-2.5">
                    <Avatar className="size-7 shrink-0">
                      <AvatarImage src={c.authorAvatar} />
                      <AvatarFallback className="bg-muted text-[9px] font-bold">{ini(c.authorName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs">
                        <span className="font-semibold">{c.authorName}</span>{" "}
                        <span className="text-foreground/80">{c.text}</span>
                      </p>
                      <p className="mt-0.5 text-[9px] text-muted-foreground/40">{mdtDateTime(c.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Comment input */}
          <div className="flex items-center gap-2 border-t border-border/40 p-3">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") sendComment(); }}
              placeholder="Add a comment…"
              className="min-w-0 flex-1 rounded-full border border-border/40 bg-background/50 px-4 py-2 text-sm focus:border-emerald-500/40 focus:outline-none placeholder:text-muted-foreground/40"
            />
            <button onClick={sendComment} disabled={!commentText.trim() || sending} className="rounded-full bg-emerald-600 p-2 text-white hover:bg-emerald-500 disabled:opacity-40">
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

/* ── Ring wrapper (green / amber / plain) ──────────────────────────────────── */

function StoryRing({ user, children }: { user: RailUser; children: React.ReactNode }) {
  const ring = user.hasUnseen
    ? "bg-gradient-to-tr from-emerald-500 via-emerald-400 to-cyan-400 p-[2.5px]" // unread story
    : user.hasStory
      ? "bg-gradient-to-tr from-amber-400 to-yellow-300 p-[2.5px]"               // read story
      : user.note
        ? "bg-emerald-500/40 p-[2px]"                                            // note only
        : "bg-border/40 p-[1.5px]";                                             // nothing
  return <div className={`rounded-full ${ring}`}>{children}</div>;
}

/* ── Rail (Instagram-style social strip) ───────────────────────────────────── */

export function StoriesRail({ me }: { me?: { fullName?: string; avatar?: string } | null }) {
  const [users, setUsers] = React.useState<RailUser[]>([]);
  const [ready, setReady] = React.useState(false);
  const [composerOpen, setComposerOpen] = React.useState(false);
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [noteDetailId, setNoteDetailId] = React.useState<string | null>(null);
  const [viewer, setViewer] = React.useState<{ author: number; story: number } | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  const load = React.useCallback((signal?: AbortSignal) => {
    return apiClient
      .get("/api/crm/stories/feed", { signal })
      .then((res) => setUsers(res.data?.data?.users || []))
      .catch(() => setUsers([]))
      .finally(() => setReady(true));
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    // Safety-net poll in case the socket can't connect.
    const id = setInterval(() => load(), 30_000);
    return () => { controller.abort(); clearInterval(id); };
  }, [load]);

  // Real-time: refresh the rail whenever a story or note changes anywhere in
  // the org. Emits come from the server to the `org:{orgId}` / `user:{id}` rooms.
  // If the socket can't connect, the poll above still keeps things fresh.
  React.useEffect(() => {
    let socket: Socket | undefined;
    try {
      const rawBase = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/api\/?$/, "");
      const base = rawBase || (typeof window !== "undefined" ? window.location.origin : "");
      const token =
        (typeof window !== "undefined" &&
          (localStorage.getItem("crm_token") || (window as any).__AUTH_TOKEN__)) ||
        undefined;
      socket = io(base, {
        auth: token ? { token } : undefined,
        withCredentials: true,
        transports: ["websocket"],
        reconnectionAttempts: 5,
      });
      const reload = () => load();
      ["story:new", "story:deleted", "story:reaction", "story:comment", "story:view", "note:updated", "note:deleted", "note:reaction", "note:comment"].forEach((ev) =>
        socket!.on(ev, reload)
      );
    } catch {
      /* polling covers it */
    }
    return () => { try { socket?.disconnect(); } catch { /* ignore */ } };
  }, [load]);

  const meUser = users.find((u) => u.isMe);
  // The viewer only navigates users who actually have stories.
  const storyUsers = React.useMemo(() => users.filter((u) => u.hasStory), [users]);

  const openStories = (userId: string) => {
    const idx = storyUsers.findIndex((u) => u._id === userId);
    if (idx >= 0) setViewer({ author: idx, story: 0 });
  };

  const onAvatarClick = (u: RailUser) => {
    if (u.hasStory) openStories(u._id);
    else if (u.isMe) setComposerOpen(true);
  };

  return (
    <>
      <section className="group/rail relative overflow-hidden rounded-3xl border border-white/10 bg-card/40 backdrop-blur-xl shadow-sm">
        {/* subtle top hairline glow for a more digital feel */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />

        {/* Desktop scroll arrows (hidden on touch) */}
        <button
          onClick={() => scrollBy(-1)}
          className="absolute left-1.5 top-1/2 z-10 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full border border-border/50 bg-background/90 text-foreground/70 shadow-md backdrop-blur transition hover:text-foreground md:flex"
          aria-label="Scroll left"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          onClick={() => scrollBy(1)}
          className="absolute right-1.5 top-1/2 z-10 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full border border-border/50 bg-background/90 text-foreground/70 shadow-md backdrop-blur transition hover:text-foreground md:flex"
          aria-label="Scroll right"
        >
          <ChevronRight className="size-4" />
        </button>

        <div
          ref={scrollRef}
          className="flex items-stretch gap-4 overflow-x-auto scroll-smooth px-4 pt-4 pb-3 md:px-12 [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/70 hover:[&::-webkit-scrollbar-thumb]:bg-border"
        >
          {/* You */}
          <div className="flex shrink-0 flex-col items-center gap-1.5">
            <NoteBubble
              text={meUser?.note?.text}
              placeholder="Leave a note"
              onClick={() => (meUser?.note ? setNoteDetailId(meUser.note._id) : setNoteOpen(true))}
              mine
            />
            <div className="relative">
              <button onClick={() => (meUser?.hasStory ? openStories(meUser._id) : setComposerOpen(true))}>
                <StoryRing user={meUser ?? ({ hasStory: false, hasUnseen: false } as RailUser)}>
                  <Avatar className="size-14 border-2 border-background">
                    <AvatarImage src={me?.avatar || meUser?.avatar} />
                    <AvatarFallback className="bg-muted font-bold text-sm">{ini(me?.fullName || meUser?.fullName)}</AvatarFallback>
                  </Avatar>
                </StoryRing>
              </button>
              <button
                onClick={() => setComposerOpen(true)}
                className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground border-2 border-background shadow hover:scale-110 transition-transform"
                aria-label="Add story"
              >
                <Plus className="size-3" />
              </button>
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground max-w-16 truncate">Your day</span>
          </div>

          <div className="w-px shrink-0 self-center bg-border/40" style={{ height: "3.5rem" }} />

          {/* Everyone else */}
          {users.filter((u) => !u.isMe).map((u) => (
            <div key={u._id} className="flex shrink-0 flex-col items-center gap-1.5">
              <NoteBubble
                text={u.note?.text}
                onClick={u.note ? () => setNoteDetailId(u.note!._id) : undefined}
              />
              <button onClick={() => onAvatarClick(u)} disabled={!u.hasStory} className={u.hasStory ? "" : "cursor-default"}>
                <StoryRing user={u}>
                  <Avatar className="size-14 border-2 border-background">
                    <AvatarImage src={u.avatar} />
                    <AvatarFallback className="bg-muted font-bold text-sm">{ini(u.fullName)}</AvatarFallback>
                  </Avatar>
                </StoryRing>
              </button>
              <span className="text-[10px] font-medium text-muted-foreground max-w-16 truncate">{u.fullName.split(" ")[0]}</span>
            </div>
          ))}

          {ready && users.filter((u) => !u.isMe).length === 0 && (
            <p className="self-center text-[11px] text-muted-foreground/50 font-medium pl-1">
              No teammates to show yet.
            </p>
          )}
        </div>
      </section>

      {composerOpen && (
        <Portal><StoryComposer onClose={() => setComposerOpen(false)} onPosted={() => load()} /></Portal>
      )}
      {noteOpen && (
        <Portal>
          <NoteEditor
            initial={meUser?.note?.text || ""}
            onClose={() => setNoteOpen(false)}
            onSaved={() => load()}
          />
        </Portal>
      )}
      {noteDetailId && (
        <NoteDetail
          noteId={noteDetailId}
          onClose={() => setNoteDetailId(null)}
          onChanged={() => load()}
          onEdit={() => { setNoteDetailId(null); setNoteOpen(true); }}
        />
      )}
      {viewer && (
        <Portal>
          <StoryViewer authors={storyUsers} start={viewer} onClose={() => { setViewer(null); load(); }} onChanged={() => load()} />
        </Portal>
      )}
    </>
  );
}

/* ── Floating note bubble (sits above the avatar, Instagram-style) ─────────── */

function NoteBubble({
  text,
  placeholder,
  mine,
  onClick,
}: {
  text?: string;
  placeholder?: string;
  mine?: boolean;
  onClick?: () => void;
}) {
  const hasText = Boolean(text);
  if (!hasText && !mine) {
    // Reserve vertical space so avatars stay aligned across the row.
    return <div className="h-7" aria-hidden />;
  }
  const clickable = Boolean(onClick);
  return (
    <button
      onClick={onClick}
      disabled={!clickable}
      className={`group relative max-w-[6.5rem] ${clickable ? "cursor-pointer" : "cursor-default"}`}
    >
      <div
        className={`truncate rounded-2xl rounded-bl-md px-2.5 py-1 text-[10px] font-medium leading-tight shadow-sm transition-colors ${
          hasText
            ? "bg-muted/80 text-foreground/80 border border-border/40 group-hover:border-emerald-500/40"
            : "bg-emerald-500/10 text-emerald-600 border border-dashed border-emerald-500/40"
        }`}
      >
        {hasText ? text : placeholder}
        {mine && <Pencil className="ml-1 inline size-2.5 opacity-0 transition-opacity group-hover:opacity-70" />}
      </div>
    </button>
  );
}
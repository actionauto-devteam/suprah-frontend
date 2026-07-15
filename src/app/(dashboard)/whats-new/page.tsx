"use client";

/**
 * What's New — global platform release notes.
 *
 * • Feed of releases, newest first, each stamped with its publish date.
 * • Opening a release launches a walkthrough modal (carousel) that steps
 *   through every update item with its own title, description, and media.
 * • Opening a release marks it read → sidebar badge drops immediately.
 * • Admins (unless revoked) can publish, edit, and delete releases and
 *   manage other admins' posting privileges.
 *
 * NOTE: adjust the apiClient import below to your existing path if different.
 */

import * as React from "react";
import {
  Sparkles,
  Megaphone,
  Wrench,
  Rocket,
  ArrowUpCircle,
  Plus,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  X,
  ImagePlus,
  Film,
  Loader2,
  ShieldCheck,
  ShieldOff,
  CalendarDays,
  Layers,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { useWhatsNew } from "@/context/WhatsNewContext";

/* ── Types ──────────────────────────────────────────────────────────────── */

type MediaType = "image" | "video";
type ItemKind = "feature" | "improvement" | "fix" | "announcement";

interface ReleaseMedia {
  url: string;
  type: MediaType;
}

interface ReleaseItem {
  title: string;
  description: string;
  kind: ItemKind;
  media: ReleaseMedia[];
}

interface Release {
  _id: string;
  title: string;
  description: string;
  publishedAt: string;
  author: { userId: string; fullName: string; email: string; avatar?: string | null };
  items: ReleaseItem[];
  isRead: boolean;
  createdAt: string;
}

interface AdminPermission {
  _id: string;
  fullName: string;
  email: string;
  avatar?: string | null;
  canPost: boolean;
  revokedBy?: { fullName: string; email: string } | null;
  revokedAt?: string | null;
}

const KIND_META: Record<ItemKind, { label: string; icon: LucideIcon; className: string }> = {
  feature: {
    label: "New Feature",
    icon: Rocket,
    className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/25",
  },
  improvement: {
    label: "Improvement",
    icon: ArrowUpCircle,
    className: "bg-cyan-500/10 text-cyan-500 border-cyan-500/25",
  },
  fix: {
    label: "Fix",
    icon: Wrench,
    className: "bg-amber-500/10 text-amber-500 border-amber-500/25",
  },
  announcement: {
    label: "Announcement",
    icon: Megaphone,
    className: "bg-violet-500/10 text-violet-500 border-violet-500/25",
  },
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Denver",
  });

const initialsOf = (name?: string) =>
  (name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/* ── Media viewer (shared by carousel) ──────────────────────────────────── */

function MediaViewer({ media }: { media: ReleaseMedia[] }) {
  const [idx, setIdx] = React.useState(0);
  React.useEffect(() => setIdx(0), [media]);

  if (!media.length) return null;
  const current = media[Math.min(idx, media.length - 1)];

  return (
    <div className="space-y-2">
      <div className="relative rounded-2xl overflow-hidden border border-border/40 bg-black/20">
        {current.type === "video" ? (
          <video
            key={current.url}
            src={current.url}
            controls
            playsInline
            className="w-full max-h-[38dvh] sm:max-h-[340px] object-contain bg-black"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={current.url}
            src={current.url}
            alt="Update media"
            className="w-full max-h-[38dvh] sm:max-h-[340px] object-contain"
          />
        )}
      </div>

      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {media.map((m, i) => (
            <button
              key={m.url + i}
              onClick={() => setIdx(i)}
              className={cn(
                "relative h-12 w-16 shrink-0 rounded-lg overflow-hidden border transition-all",
                i === idx
                  ? "border-primary ring-1 ring-primary/50"
                  : "border-border/40 opacity-60 hover:opacity-100",
              )}
            >
              {m.type === "video" ? (
                <div className="flex h-full w-full items-center justify-center bg-black/60">
                  <Film className="size-4 text-white/80" />
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt="" className="h-full w-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Walkthrough carousel modal ─────────────────────────────────────────── */

function ReleaseWalkthrough({
  release,
  open,
  onClose,
}: {
  release: Release | null;
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = React.useState(0);
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const items = release?.items ?? [];
  const item = items[step];

  React.useEffect(() => {
    if (open) setStep(0);
  }, [open, release?._id]);

  // Each step starts at the top of the scroll body — without this, a long
  // step 2 would open wherever step 1 was scrolled to.
  React.useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [step]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setStep((s) => Math.min(s + 1, items.length - 1));
      if (e.key === "ArrowLeft") setStep((s) => Math.max(s - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items.length]);

  if (!release || !item) return null;

  const kind = KIND_META[item.kind] ?? KIND_META.feature;
  const KindIcon = kind.icon;
  const isLast = step === items.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      {/* Height-capped, column-flex dialog: pinned progress bar + header on
          top, pinned controls on the bottom, and ONE scroll owner in between
          (flex-1 min-h-0 overflow-y-auto — same pattern as the CRM layout).
          Long descriptions and tall media scroll; controls never leave view. */}
      <DialogContent
        className={cn(
          "p-0 gap-0 overflow-hidden border-border/40 bg-card/95 backdrop-blur-xl",
          "w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-2xl",
          "max-h-[92dvh] sm:max-h-[85dvh] flex flex-col",
        )}
      >
        {/* Progress bar — pinned */}
        <div className="h-1 w-full bg-muted/40 shrink-0">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300"
            style={{ width: `${((step + 1) / items.length) * 100}%` }}
          />
        </div>

        {/* Compact release header — pinned */}
        <div className="shrink-0 px-4 sm:px-8 pt-4 sm:pt-5 pb-3 border-b border-border/20">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <Badge
                variant="outline"
                className="bg-primary/5 text-primary border-primary/20 text-[9px] font-black tracking-widest uppercase px-2 py-0.5 max-w-[60vw] sm:max-w-none"
              >
                <span className="truncate">{release.title}</span>
              </Badge>
              <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest flex items-center gap-1 whitespace-nowrap">
                <CalendarDays className="size-3" />
                {formatDate(release.publishedAt)}
              </span>
            </div>
            <span className="text-[10px] font-black text-muted-foreground/50 tabular-nums whitespace-nowrap">
              {step + 1} / {items.length}
            </span>
          </div>
        </div>

        {/* Scrollable body — the single scroll owner */}
        <div
          ref={bodyRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-8 py-4 sm:py-6 [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/50 [&::-webkit-scrollbar-thumb:hover]:bg-border"
        >
          <DialogHeader className="text-left mb-4">
            <Badge
              variant="outline"
              className={cn("w-fit text-[10px] font-bold gap-1 px-2 mb-2", kind.className)}
            >
              <KindIcon className="size-3" />
              {kind.label}
            </Badge>

            <DialogTitle className="text-lg sm:text-2xl font-black tracking-tight break-words">
              {item.title}
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-[15px] leading-relaxed text-muted-foreground whitespace-pre-wrap break-words pt-1">
              {item.description}
            </DialogDescription>
          </DialogHeader>

          <MediaViewer media={item.media} />
        </div>

        {/* Controls — pinned footer, safe-area aware on mobile */}
        <div className="shrink-0 border-t border-border/20 bg-card/80 backdrop-blur px-4 sm:px-8 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:py-4 flex items-center justify-between gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStep((s) => Math.max(s - 1, 0))}
            disabled={step === 0}
            className="gap-1 shrink-0"
            aria-label="Previous update"
          >
            <ChevronLeft className="size-4" />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          {/* Dots for reasonable counts; the pinned header counter covers
              larger releases where dots would overflow on small screens. */}
          {items.length <= 10 && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 min-w-0">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  aria-label={`Go to update ${i + 1}`}
                  className={cn(
                    "size-2 rounded-full transition-all",
                    i === step ? "bg-primary w-5" : "bg-muted-foreground/25 hover:bg-muted-foreground/50",
                  )}
                />
              ))}
            </div>
          )}

          {isLast ? (
            <Button size="sm" onClick={onClose} className="gap-1 shrink-0">
              Done
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setStep((s) => Math.min(s + 1, items.length - 1))}
              className="gap-1 shrink-0"
              aria-label="Next update"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Editor: media uploader for one item ────────────────────────────────── */

function ItemMediaUploader({
  media,
  onChange,
}: {
  media: ReleaseMedia[];
  onChange: (media: ReleaseMedia[]) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploaded: ReleaseMedia[] = [];
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("media", file);
        // No explicit Content-Type: the apiClient request interceptor detects
        // FormData, strips the default application/json header, and lets the
        // browser set multipart/form-data with the correct boundary.
        // Extended timeout: the default 30s would abort large video uploads.
        const res = await apiClient.post("/api/crm/whats-new/media", form, {
          timeout: 120_000,
        });
        const data = res?.data?.data;
        if (data?.url) uploaded.push({ url: data.url, type: data.type === "video" ? "video" : "image" });
      }
      onChange([...media, ...uploaded]);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Media upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {media.map((m, i) => (
          <div
            key={m.url + i}
            className="relative h-16 w-24 rounded-lg overflow-hidden border border-border/40 group"
          >
            {m.type === "video" ? (
              <div className="flex h-full w-full items-center justify-center bg-black/60">
                <Film className="size-5 text-white/80" />
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.url} alt="" className="h-full w-full object-cover" />
            )}
            <button
              type="button"
              onClick={() => onChange(media.filter((_, j) => j !== i))}
              className="absolute top-1 right-1 rounded-md bg-black/70 p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-16 w-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border/60 text-muted-foreground/60 hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          <span className="text-[9px] font-bold uppercase tracking-wide">
            {uploading ? "Uploading" : "Add media"}
          </span>
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

/* ── Editor dialog (create + edit) ──────────────────────────────────────── */

const EMPTY_ITEM = (): ReleaseItem => ({ title: "", description: "", kind: "feature", media: [] });

function ReleaseEditorDialog({
  open,
  onClose,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: Release | null;
  onSaved: () => void;
}) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [items, setItems] = React.useState<ReleaseItem[]>([EMPTY_ITEM()]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setDescription(editing.description);
      setItems(editing.items.map((it) => ({ ...it, media: [...it.media] })));
    } else {
      setTitle("");
      setDescription("");
      setItems([EMPTY_ITEM()]);
    }
  }, [open, editing]);

  const patchItem = (idx: number, patch: Partial<ReleaseItem>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const save = async () => {
    if (!title.trim()) return toast.error("Release title is required");
    if (!description.trim()) return toast.error("Release summary is required");
    for (let i = 0; i < items.length; i++) {
      if (!items[i].title.trim()) return toast.error(`Update ${i + 1}: title is required`);
      if (!items[i].description.trim()) return toast.error(`Update ${i + 1}: description is required`);
    }

    setSaving(true);
    try {
      const payload = { title: title.trim(), description: description.trim(), items };
      if (editing) {
        await apiClient.patch(`/api/crm/whats-new/${editing._id}`, payload);
        toast.success("Release updated");
      } else {
        await apiClient.post("/api/crm/whats-new", payload);
        toast.success("Release published");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save release");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90dvh] overflow-y-auto border-border/40 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="font-black tracking-tight flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            {editing ? "Edit Release" : "Publish a Release"}
          </DialogTitle>
          <DialogDescription>
            Posts are visible to every user across all organizations on the platform.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              Release title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='e.g. "July 2026 Platform Update"'
              maxLength={140}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              Summary
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short overview of what shipped in this release…"
              rows={2}
              maxLength={2000}
            />
          </div>

          {/* Update items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
                <Layers className="size-3.5" />
                Update items ({items.length})
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1 h-7 text-xs"
                onClick={() => setItems((prev) => [...prev, EMPTY_ITEM()])}
              >
                <Plus className="size-3.5" />
                Add update
              </Button>
            </div>

            {items.map((it, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-border/40 bg-background/40 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">
                    Update {idx + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setItems((prev) => prev.filter((_, j) => j !== idx))}
                      className="p-1 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* Kind chips */}
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(KIND_META) as ItemKind[]).map((k) => {
                    const meta = KIND_META[k];
                    const KIcon = meta.icon;
                    const active = it.kind === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => patchItem(idx, { kind: k })}
                        className={cn(
                          "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold transition-all",
                          active
                            ? meta.className
                            : "border-border/40 text-muted-foreground/60 hover:border-border",
                        )}
                      >
                        <KIcon className="size-3" />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>

                <Input
                  value={it.title}
                  onChange={(e) => patchItem(idx, { title: e.target.value })}
                  placeholder="Update title"
                  maxLength={140}
                />
                <Textarea
                  value={it.description}
                  onChange={(e) => patchItem(idx, { description: e.target.value })}
                  placeholder="Describe this update — what changed and why it matters…"
                  rows={3}
                  maxLength={4000}
                />

                <ItemMediaUploader
                  media={it.media}
                  onChange={(media) => patchItem(idx, { media })}
                />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="size-4 animate-spin" />}
            {editing ? "Save changes" : "Publish release"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Permissions dialog ─────────────────────────────────────────────────── */

function PermissionsDialog({
  open,
  onClose,
  selfEmail,
}: {
  open: boolean;
  onClose: () => void;
  selfEmail?: string;
}) {
  const [admins, setAdmins] = React.useState<AdminPermission[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [busyEmail, setBusyEmail] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/api/crm/whats-new/permissions");
      setAdmins(res?.data?.data?.admins ?? []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load permissions");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open) load();
  }, [open, load]);

  const toggle = async (admin: AdminPermission) => {
    setBusyEmail(admin.email);
    try {
      await apiClient.patch("/api/crm/whats-new/permissions", {
        email: admin.email,
        canPost: !admin.canPost,
      });
      toast.success(!admin.canPost ? "Posting privileges restored" : "Posting privileges revoked");
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update permission");
    } finally {
      setBusyEmail(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85dvh] overflow-y-auto border-border/40 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="font-black tracking-tight flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            Posting Privileges
          </DialogTitle>
          <DialogDescription>
            Every CRM admin can post to What's New by default. Revoke an admin to block them from
            publishing or managing releases. You cannot revoke yourself.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {admins.map((admin) => {
              const isSelf = admin.email === selfEmail?.toLowerCase();
              return (
                <div
                  key={admin.email}
                  className="flex items-center gap-3 rounded-xl border border-border/30 bg-background/40 px-3 py-2.5"
                >
                  <Avatar className="size-8">
                    <AvatarImage src={admin.avatar ?? undefined} />
                    <AvatarFallback className="text-[10px] font-bold bg-muted">
                      {initialsOf(admin.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {admin.fullName}
                      {isSelf && (
                        <span className="ml-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">
                          you
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground/60 truncate">{admin.email}</p>
                    {!admin.canPost && admin.revokedBy?.fullName && (
                      <p className="text-[10px] text-amber-500/80 mt-0.5">
                        Revoked by {admin.revokedBy.fullName}
                      </p>
                    )}
                  </div>
                  <Button
                    variant={admin.canPost ? "outline" : "secondary"}
                    size="sm"
                    disabled={isSelf || busyEmail === admin.email}
                    onClick={() => toggle(admin)}
                    className={cn(
                      "gap-1.5 h-8 text-xs shrink-0",
                      admin.canPost
                        ? "border-destructive/30 text-destructive hover:bg-destructive/10"
                        : "border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10",
                    )}
                  >
                    {busyEmail === admin.email ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : admin.canPost ? (
                      <ShieldOff className="size-3.5" />
                    ) : (
                      <ShieldCheck className="size-3.5" />
                    )}
                    {admin.canPost ? "Revoke" : "Restore"}
                  </Button>
                </div>
              );
            })}
            {admins.length === 0 && (
              <p className="text-sm text-muted-foreground/60 text-center py-6">No admins found.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── Release card ───────────────────────────────────────────────────────── */

function ReleaseCard({
  release,
  canManage,
  onOpen,
  onEdit,
  onDelete,
}: {
  release: Release;
  canManage: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const firstImage = release.items.flatMap((it) => it.media).find((m) => m.type === "image");
  const kinds = Array.from(new Set(release.items.map((it) => it.kind)));

  return (
    <div
      className={cn(
        "relative rounded-3xl border bg-card/40 backdrop-blur-md overflow-hidden transition-all",
        "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
        release.isRead ? "border-border/30" : "border-emerald-500/30",
      )}
    >
      {!release.isRead && (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500" />
      )}

      <button onClick={onOpen} className="block w-full text-left">
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-2 flex-wrap mb-2.5">
            <Badge
              variant="outline"
              className="bg-primary/5 text-primary border-primary/20 text-[9px] font-black tracking-widest uppercase px-2 py-0.5 gap-1"
            >
              <CalendarDays className="size-3" />
              {formatDate(release.publishedAt)}
            </Badge>
            {!release.isRead && (
              <Badge className="bg-emerald-600 text-white border-none text-[9px] font-black tracking-widest uppercase px-2 py-0.5 animate-pulse">
                New
              </Badge>
            )}
            {kinds.map((k) => {
              const meta = KIND_META[k];
              const KIcon = meta.icon;
              return (
                <Badge
                  key={k}
                  variant="outline"
                  className={cn("text-[9px] font-bold gap-1 px-1.5 py-0.5", meta.className)}
                >
                  <KIcon className="size-2.5" />
                  {meta.label}
                </Badge>
              );
            })}
          </div>

          <h2 className="text-lg sm:text-xl font-black tracking-tight text-foreground mb-1">
            {release.title}
          </h2>
          <p className="text-sm text-muted-foreground line-clamp-2">{release.description}</p>

          {firstImage && (
            <div className="mt-4 rounded-2xl overflow-hidden border border-border/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={firstImage.url}
                alt=""
                className="w-full max-h-56 object-cover"
                loading="lazy"
              />
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="size-6">
                <AvatarImage src={release.author?.avatar ?? undefined} />
                <AvatarFallback className="text-[9px] font-bold bg-muted">
                  {initialsOf(release.author?.fullName)}
                </AvatarFallback>
              </Avatar>
              <span className="text-[11px] font-semibold text-muted-foreground/70 truncate">
                {release.author?.fullName}
              </span>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary/70 shrink-0">
              <Layers className="size-3" />
              {release.items.length} update{release.items.length !== 1 ? "s" : ""}
              <ChevronRight className="size-3" />
            </span>
          </div>
        </div>
      </button>

      {canManage && (
        <div className="absolute top-3 right-3 flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1.5 rounded-lg bg-background/60 backdrop-blur text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors"
            aria-label="Edit release"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 rounded-lg bg-background/60 backdrop-blur text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
            aria-label="Delete release"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function WhatsNewPage() {
  const { refresh: refreshBadge, decrement } = useWhatsNew();

  const [releases, setReleases] = React.useState<Release[]>([]);
  const [canManage, setCanManage] = React.useState(false);
  const [selfEmail, setSelfEmail] = React.useState<string | undefined>(undefined);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);

  const [activeRelease, setActiveRelease] = React.useState<Release | null>(null);
  const [walkthroughOpen, setWalkthroughOpen] = React.useState(false);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Release | null>(null);
  const [permissionsOpen, setPermissionsOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Release | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = React.useCallback(
    async (pageNum: number, append = false) => {
      setLoading(true);
      try {
        const res = await apiClient.get("/api/crm/whats-new", {
          params: { page: pageNum, limit: 20 },
        });
        const data = res?.data?.data;
        setReleases((prev) => (append ? [...prev, ...(data?.releases ?? [])] : data?.releases ?? []));
        setCanManage(!!data?.canManage);
        setTotalPages(data?.pagination?.totalPages ?? 1);
      } catch (err: any) {
        toast.error(err?.response?.data?.message || "Failed to load updates");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  React.useEffect(() => {
    load(1);
    // Grab the caller's email once for the self-guard in the permissions dialog.
    apiClient
      .get("/api/crm/me")
      .then((res) => setSelfEmail(res?.data?.data?.email?.toLowerCase()))
      .catch(() => {});
  }, [load]);

  const openRelease = async (release: Release) => {
    setActiveRelease(release);
    setWalkthroughOpen(true);

    if (!release.isRead) {
      // Optimistic: flip local state + drop the sidebar badge immediately.
      setReleases((prev) =>
        prev.map((r) => (r._id === release._id ? { ...r, isRead: true } : r)),
      );
      decrement(1);
      try {
        await apiClient.post(`/api/crm/whats-new/${release._id}/read`);
      } catch {
        /* non-fatal — badge poll will self-correct */
      }
      refreshBadge();
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/api/crm/whats-new/${deleteTarget._id}`);
      toast.success("Release deleted");
      setDeleteTarget(null);
      load(1);
      refreshBadge();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete release");
    } finally {
      setDeleting(false);
    }
  };

  const unread = releases.filter((r) => !r.isRead).length;

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-5 sm:space-y-7 container mx-auto max-w-4xl min-h-full pb-24 md:pb-12 animate-in fade-in duration-500">
      {/* ── Hero ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge
              variant="outline"
              className="bg-primary/5 text-primary border-primary/20 text-[9px] font-black tracking-widest uppercase px-2 py-0.5 gap-1"
            >
              Release Notes
            </Badge>
            {unread > 0 && (
              <Badge className="bg-emerald-600 text-white border-none text-[9px] font-black tracking-widest uppercase px-2 py-0.5">
                {unread} unread
              </Badge>
            )}
          </div>
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
            What's <span className="text-primary">New</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            The latest features, improvements, and fixes across the platform.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setPermissionsOpen(true)}
            >
              <ShieldCheck className="size-4" />
              Privileges
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setEditing(null);
                setEditorOpen(true);
              }}
            >
              <Plus className="size-4" />
              New Release
            </Button>
          </div>
        )}
      </div>

      {/* ── Feed ── */}
      {loading && releases.length === 0 ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : releases.length === 0 ? (
        <div className="text-center py-24 border border-border/30 rounded-3xl bg-card/30 backdrop-blur-sm">
          <Sparkles className="size-8 text-primary/40 mx-auto mb-3" />
          <p className="font-black tracking-tight text-lg">No updates yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            {canManage
              ? "Publish the first release to announce what's new on the platform."
              : "Platform updates will appear here as they're released."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {releases.map((release) => (
            <ReleaseCard
              key={release._id}
              release={release}
              canManage={canManage}
              onOpen={() => openRelease(release)}
              onEdit={() => {
                setEditing(release);
                setEditorOpen(true);
              }}
              onDelete={() => setDeleteTarget(release)}
            />
          ))}

          {page < totalPages && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                disabled={loading}
                onClick={() => {
                  const next = page + 1;
                  setPage(next);
                  load(next, true);
                }}
                className="gap-1.5"
              >
                {loading && <Loader2 className="size-4 animate-spin" />}
                Load older releases
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      <ReleaseWalkthrough
        release={activeRelease}
        open={walkthroughOpen}
        onClose={() => setWalkthroughOpen(false)}
      />

      <ReleaseEditorDialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        editing={editing}
        onSaved={() => {
          load(1);
          refreshBadge();
        }}
      />

      <PermissionsDialog
        open={permissionsOpen}
        onClose={() => setPermissionsOpen(false)}
        selfEmail={selfEmail}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this release?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" and all of its update items and media will be permanently
              removed for every user on the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              {deleting ? "Deleting…" : "Delete release"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
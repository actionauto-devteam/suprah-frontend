"use client";

import * as React from "react";
import { differenceInCalendarDays } from "date-fns";
import { fmtShortDateTimeMDT } from "@/lib/timezone";
import { CheckCheck, GripVertical, Pencil, Pin, PinOff, Timer, Trash2, X, ZoomIn } from "lucide-react";
import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { BoardNote, BoardNoteReaction } from "@/hooks/useTeamPulse";
import {
  useAckBoardNote,
  useBoardNoteReactions,
  useToggleBoardNoteReaction,
} from "@/hooks/useTeamPulse";
import { N, ANNOUNCE_CONFIG } from "./team-pulse-constants";
import { toast } from "sonner";

const EMOJI_REACTIONS = [
  { key: "like", label: "👍" },
  { key: "love", label: "❤️" },
  { key: "haha", label: "😂" },
  { key: "wow", label: "😮" },
  { key: "sad", label: "😢" },
  { key: "angry", label: "😠" },
];

function ReactionBar({
  noteId,
  myUserId,
  reactions,
}: {
  noteId: string;
  myUserId?: string;
  reactions: BoardNoteReaction[];
}) {
  const toggleReaction = useToggleBoardNoteReaction();

  const counts = EMOJI_REACTIONS.map((r) => ({
    ...r,
    count: reactions.filter((rx) => rx.reaction === r.key).length,
    mine: reactions.some((rx) => rx.reaction === r.key && rx.userId === myUserId),
    who: reactions.filter((rx) => rx.reaction === r.key).map((rx) => rx.authorName),
  }));

  const total = counts.reduce((s, r) => s + r.count, 0);

  if (total === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4 pb-2 pt-1">
      {counts.map((r) =>
        r.count > 0 ? (
          <Tooltip key={r.key}>
            <TooltipTrigger asChild>
              <button
                onClick={() => toggleReaction.mutate({ noteId, reaction: r.key })}
                className={cn(
                  "flex items-center gap-1 min-h-7 px-2 py-1 rounded-full text-[11px] font-bold transition-all border",
                  r.mine
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-black/5 dark:bg-white/8 border-transparent hover:border-border/50 text-foreground/60",
                )}
              >
                <span className="text-[13px] leading-none">{r.label}</span>
                {r.count}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs max-w-48">
              <div className="space-y-0.5">
                <p className="font-semibold text-[10px] uppercase tracking-wide opacity-60">Reacted</p>
                {r.who.map((name, i) => (
                  <p key={i} className="text-xs">{name}</p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        ) : null,
      )}
    </div>
  );
}

function ReactionPicker({ noteId, onClose }: { noteId: string; onClose: () => void }) {
  const toggleReaction = useToggleBoardNoteReaction();

  return (
    <div
      className="absolute bottom-full left-0 mb-1.5 z-40 flex items-center gap-0.5 px-1.5 py-1 rounded-xl bg-background/95 border border-border/60 shadow-xl backdrop-blur-sm"
      onMouseLeave={onClose}
    >
      {EMOJI_REACTIONS.map((r) => (
        <button
          key={r.key}
          title={r.key}
          onClick={() => {
            toggleReaction.mutate({ noteId, reaction: r.key });
            onClose();
          }}
          className="size-9 flex items-center justify-center text-xl hover:scale-125 active:scale-110 transition-transform leading-none rounded-lg"
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

function ImageLightbox({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[92vh] p-0 bg-black/90 border-0 overflow-hidden flex items-center justify-center rounded-2xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-50 size-8 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
        >
          <X className="size-4" />
        </button>
        <img
          src={url}
          alt={name}
          className="max-w-full max-h-[90vh] object-contain rounded-lg"
        />
        <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/50 text-xs truncate max-w-xs">{name}</p>
      </DialogContent>
    </Dialog>
  );
}

export function NoteCard({
  note,
  isMe,
  isAdmin,
  myUserId,
  onDelete,
  onPin,
  onEdit,
  dragHandleProps,
}: {
  note: BoardNote;
  isMe: boolean;
  isAdmin: boolean;
  myUserId?: string;
  onDelete: () => void;
  onPin: () => void;
  onEdit: () => void;
  dragHandleProps?: { attributes?: DraggableAttributes; listeners?: DraggableSyntheticListeners };
}) {
  const [showReactionPicker, setShowReactionPicker] = React.useState(false);
  const [lightboxUrl, setLightboxUrl] = React.useState<{ url: string; name: string } | null>(null);
  const ackNote = useAckBoardNote();
  const { data: reactions = [] } = useBoardNoteReactions(note._id);

  const style = N[note.color] ?? N.yellow;
  const daysLeft = note.expiresAt
    ? differenceInCalendarDays(new Date(note.expiresAt), new Date())
    : null;
  const announceConfig =
    ANNOUNCE_CONFIG[note.announcementType ?? "general"] ??
    ANNOUNCE_CONFIG.general;
  const AnnounceIcon = announceConfig.icon;
  const isNonGeneral = note.announcementType && note.announcementType !== "general";
  const hasAcked = myUserId && note.ackedBy?.includes(myUserId);
  const isOwner = myUserId && note.userId === myUserId;
  const imageAttachments = note.attachments?.filter((a) =>
    a.mimeType?.startsWith("image/"),
  ) ?? [];
  const displayDate = note.postedAt || note.createdAt;
  const canManage = isMe || isAdmin;

  async function handleAck() {
    try {
      await ackNote.mutateAsync(note._id);
      toast.success("Marked as read ✓");
    } catch {
      toast.error("Failed");
    }
  }

  return (
    <>
      {lightboxUrl && (
        <ImageLightbox
          url={lightboxUrl.url}
          name={lightboxUrl.name}
          onClose={() => setLightboxUrl(null)}
        />
      )}
      <div className="relative group pt-3">
        <div
          className={cn(
            "absolute top-0 left-4 z-20 flex items-center gap-1 h-5 px-2 rounded-b-md text-[8px] font-black uppercase tracking-widest border-x border-b shadow-sm",
            style.pin,
            "border-black/10 text-black/55 dark:text-black/60",
          )}
        >
          <Pin className="size-2.5" />
        </div>

        <div
          className={cn(
            "rounded-xl overflow-hidden flex flex-col relative border shadow-sm",
            "transition-shadow duration-150 sm:group-hover:shadow-md",
            note.pinned && "ring-2 ring-offset-1 ring-offset-background ring-amber-400/60 dark:ring-amber-500/50",
            style.bg,
            isNonGeneral ? announceConfig.border : "",
          )}
        >
          {isNonGeneral && (
            <div
              className={cn(
                "flex items-center justify-center gap-1.5 py-1.5 text-[9px] font-black uppercase tracking-widest",
                announceConfig.badge,
              )}
            >
              <AnnounceIcon className="size-3" />
              {announceConfig.label}
            </div>
          )}

          <div
            className={cn(
              "flex items-start gap-2 px-3.5 pt-3 pb-2",
              style.top,
            )}
          >
            {note.emoji && (
              <span
                className="text-xl leading-none select-none shrink-0 -mt-0.5"
                aria-hidden
              >
                {note.emoji}
              </span>
            )}

            <div className="flex-1 min-w-0">
              {note.pinned && (
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-foreground/35 mb-0.5">
                  <Pin className="size-2.5" />
                  Pinned
                </span>
              )}
              {note.title ? (
                <p className="text-sm font-black tracking-tight leading-snug wrap-break-word">
                  {note.title}
                </p>
              ) : (
                <p className="text-[10px] italic text-foreground/25 uppercase tracking-widest font-semibold">
                  Note
                </p>
              )}
            </div>

            <div
              className={cn(
                "flex items-center gap-0.5 shrink-0 -mt-1 -mr-1 transition-opacity",
                canManage
                  ? "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  : "opacity-0 group-hover:opacity-100",
              )}
            >
              {dragHandleProps && (
                <button
                  type="button"
                  {...dragHandleProps.attributes}
                  {...dragHandleProps.listeners}
                  className="size-7 flex items-center justify-center rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-foreground/40 cursor-grab active:cursor-grabbing touch-none"
                  aria-label="Drag to reorder"
                >
                  <GripVertical className="size-3.5" />
                </button>
              )}
              {isAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={onPin}
                      className="size-7 flex items-center justify-center rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-foreground/50"
                    >
                      {note.pinned ? (
                        <PinOff className="size-3.5" />
                      ) : (
                        <Pin className="size-3.5" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    {note.pinned ? "Unpin" : "Pin to top"}
                  </TooltipContent>
                </Tooltip>
              )}
              {isMe && (
                <button
                  onClick={onEdit}
                  className="size-7 flex items-center justify-center rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-foreground/50"
                >
                  <Pencil className="size-3.5" />
                </button>
              )}
              {canManage && (
                <button
                  onClick={onDelete}
                  className="size-7 flex items-center justify-center rounded-lg hover:bg-red-500/15 transition-colors text-foreground/50 hover:text-red-600"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="px-3.5 py-3 flex-1">
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap wrap-break-word text-foreground/80">
              {note.content}
            </p>
          </div>

          {imageAttachments.length > 0 && (
            <div className={cn("px-3.5 pb-2 flex gap-2 flex-wrap")}>
              {imageAttachments.map((att, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setLightboxUrl({ url: att.url, name: att.originalName })}
                  className="relative block rounded-lg overflow-hidden border border-black/10 dark:border-white/10 shrink-0 hover:opacity-90 hover:scale-[1.02] transition-all group/img"
                  style={{ width: imageAttachments.length === 1 ? "100%" : 72, height: imageAttachments.length === 1 ? 140 : 72 }}
                >
                  <img
                    src={att.url}
                    alt={att.originalName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center">
                    <ZoomIn className="size-4 text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
                  </div>
                </button>
              ))}
            </div>
          )}

          <ReactionBar noteId={note._id} myUserId={myUserId} reactions={reactions} />

          <div className="px-3.5 pb-3.5 pt-1 border-t border-black/[0.07] dark:border-white/[0.07] flex items-center gap-2 flex-wrap">
            <Avatar className="size-5 shrink-0">
              <AvatarImage src={note.userAvatar} />
              <AvatarFallback className="text-[8px] font-black">
                {note.userName[0]}
              </AvatarFallback>
            </Avatar>
            <span className="text-[10px] text-foreground/50 truncate flex-1 min-w-0">
              {note.userName}
            </span>
            <span className="text-[10px] text-foreground/35 shrink-0 tabular-nums">
              {fmtShortDateTimeMDT(new Date(displayDate))}
            </span>
            {daysLeft !== null && (
              <span
                className={cn(
                  "text-[9px] font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded-full shrink-0",
                  daysLeft <= 0
                    ? "bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400"
                    : daysLeft <= 2
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                      : "bg-black/8 dark:bg-white/10 text-foreground/50",
                )}
              >
                <Timer className="size-2.5" />
                {daysLeft <= 0 ? "Expiring" : `${daysLeft}d`}
              </span>
            )}
          </div>

          <div className="px-3.5 pb-3 pt-0 flex items-center justify-between gap-2">
            <div className="relative">
              <button
                onClick={() => setShowReactionPicker((v) => !v)}
                onMouseEnter={() => setShowReactionPicker(true)}
                className="min-h-7 text-[11px] font-semibold text-foreground/40 hover:text-foreground/70 transition-colors px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
              >
                + React
              </button>
              {showReactionPicker && (
                <ReactionPicker
                  noteId={note._id}
                  onClose={() => setShowReactionPicker(false)}
                />
              )}
            </div>

            {note.requiresAck && (
              <button
                onClick={handleAck}
                disabled={!!hasAcked || ackNote.isPending}
                className={cn(
                  "flex items-center gap-1 min-h-7 text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all",
                  hasAcked
                    ? "bg-emerald-100 text-emerald-700 border-emerald-300/50 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-700/40 cursor-default"
                    : "bg-black/5 dark:bg-white/8 border-border/40 text-foreground/50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400",
                )}
              >
                <CheckCheck className="size-3" />
                {hasAcked ? "Read" : "Mark Read"}
              </button>
            )}
          </div>

          {note.requiresAck && (note.ackedByDetails ?? []).length > 0 && (
            <div className="px-3.5 pb-2.5">
              {isOwner ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-1 min-h-6 py-0.5 hover:opacity-80 transition-opacity">
                      <CheckCheck className="size-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold underline underline-offset-2">
                        {(note.ackedByDetails ?? []).length} read
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="start" className="w-56 p-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5 px-1">
                      Read by
                    </p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {(note.ackedByDetails ?? []).map((u, i) => (
                        <div key={i} className="flex items-center gap-2 px-1 py-1 rounded-lg hover:bg-muted/30">
                          <Avatar className="size-5 shrink-0">
                            <AvatarImage src={u.avatar} />
                            <AvatarFallback className="text-[8px] font-black">{u.name[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-semibold truncate">{u.name}</span>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <div className="flex items-center gap-1">
                  <CheckCheck className="size-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    {(note.ackedByDetails ?? []).length} read
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

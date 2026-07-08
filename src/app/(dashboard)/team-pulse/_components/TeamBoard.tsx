"use client";

import * as React from "react";
import { MDT_TZ } from "@/lib/timezone";
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  Check,
  CheckSquare,
  Edit2,
  ImageIcon,
  LayoutGrid,
  Pin,
  Plus,
  Smile,
  StickyNote,
  X,
  ZoomIn,
} from "lucide-react";
import { toast } from "sonner";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BoardNote, NoteColor, AnnouncementType } from "@/hooks/useTeamPulse";
import {
  useBoardNotes,
  useCreateBoardNote,
  useUpdateBoardNote,
  useDeleteBoardNote,
  useTogglePinNote,
  useReorderBoardNotes,
  useUploadBoardNoteAttachments,
} from "@/hooks/useTeamPulse";
import { N, ANNOUNCE_CONFIG } from "./team-pulse-constants";
import { NoteCard } from "./NoteCard";
import { PushPin } from "./StatusDot";

const CORK_STYLE: React.CSSProperties = {
  backgroundColor: "rgb(182, 136, 78)",
  backgroundImage: `
    radial-gradient(ellipse at 12% 20%, rgba(225,180,115,0.65) 0%, transparent 42%),
    radial-gradient(ellipse at 88% 80%, rgba(135,85,30,0.55) 0%, transparent 38%),
    radial-gradient(ellipse at 50% 50%, rgba(200,155,90,0.2) 0%, transparent 55%),
    radial-gradient(circle at 1.5px 1.5px, rgba(100,60,20,0.20) 1.5px, transparent 0),
    radial-gradient(circle at 9px 9px, rgba(160,110,50,0.16) 1px, transparent 0),
    radial-gradient(circle at 4px 7px, rgba(80,45,15,0.10) 0.8px, transparent 0)
  `,
  backgroundSize: "100% 100%, 100% 100%, 100% 100%, 11px 11px, 19px 19px, 7px 7px",
};

const FRAME_STYLE: React.CSSProperties = {
  border: "12px solid rgb(78, 48, 18)",
  borderRadius: "12px",
  boxShadow:
    "inset 0 3px 18px rgba(0,0,0,0.30), inset 0 -2px 8px rgba(0,0,0,0.18), 0 8px 32px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.18)",
  outline: "3px solid rgb(58, 36, 10)",
  outlineOffset: "-14px",
};

function SortableNoteItem({
  note,
  userName,
  myUserId,
  isAdmin,
  onDelete,
  onPin,
  onEdit,
}: {
  note: BoardNote;
  userName?: string;
  myUserId?: string;
  isAdmin: boolean;
  onDelete: () => void;
  onPin: () => void;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: note._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="break-inside-avoid mb-5">
      <NoteCard
        note={note}
        isMe={note.userName === userName}
        isAdmin={isAdmin}
        myUserId={myUserId}
        onDelete={onDelete}
        onPin={onPin}
        onEdit={onEdit}
        dragHandleProps={{ attributes, listeners }}
      />
    </div>
  );
}

export function TeamBoard({
  userName,
  myUserId,
  isAdmin,
}: {
  userName?: string;
  myUserId?: string;
  isAdmin: boolean;
}) {
  const [boardTypeFilter, setBoardTypeFilter] = React.useState("all");
  const [noteDialog, setNoteDialog] = React.useState(false);
  const [editNoteId, setEditNoteId] = React.useState<string | null>(null);
  const [noteTitle, setNoteTitle] = React.useState("");
  const [noteBody, setNoteBody] = React.useState("");
  const [noteColor, setNoteColor] = React.useState<NoteColor>("yellow");
  const [noteExpiry, setNoteExpiry] = React.useState("");
  const [noteAnnounce, setNoteAnnounce] = React.useState<AnnouncementType>("general");
  const [noteEmoji, setNoteEmoji] = React.useState("");
  const [noteRequiresAck, setNoteRequiresAck] = React.useState(false);
  const [notePostedAt, setNotePostedAt] = React.useState("");
  const [pendingImages, setPendingImages] = React.useState<File[]>([]);
  const [dialogLightbox, setDialogLightbox] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { data: boardNotes = [], isLoading: boardLoading } = useBoardNotes();
  const [localOrder, setLocalOrder] = React.useState<string[]>([]);
  const createNote = useCreateBoardNote();
  const updateNote = useUpdateBoardNote();
  const deleteNote = useDeleteBoardNote();
  const pinNote = useTogglePinNote();
  const reorderNotes = useReorderBoardNotes();
  const uploadAttachments = useUploadBoardNoteAttachments();

  React.useEffect(() => {
    setLocalOrder(boardNotes.map((n) => n._id));
  }, [boardNotes]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = localOrder.indexOf(active.id as string);
    const newIndex = localOrder.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(localOrder, oldIndex, newIndex);
    setLocalOrder(newOrder);
    reorderNotes.mutate(newOrder);
  }

  const filteredNotes =
    boardTypeFilter === "all"
      ? boardNotes
      : boardNotes.filter((n) => (n.announcementType ?? "general") === boardTypeFilter);
  const urgentCount = boardNotes.filter((n) => n.announcementType === "urgent").length;
  const pinnedCount = boardNotes.filter((n) => n.pinned).length;

  function openNewNote() {
    setEditNoteId(null);
    setNoteTitle("");
    setNoteBody("");
    setNoteColor("yellow");
    setNoteExpiry("");
    setNoteAnnounce("general");
    setNoteEmoji("");
    setNoteRequiresAck(false);
    setNotePostedAt("");
    setPendingImages([]);
    setNoteDialog(true);
  }

  function openEditNote(note: BoardNote) {
    setEditNoteId(note._id);
    setNoteTitle(note.title ?? "");
    setNoteBody(note.content);
    setNoteColor(note.color);
    setNoteEmoji(note.emoji ?? "");
    setNotePostedAt(note.postedAt ? new Date(note.postedAt).toLocaleDateString('en-CA', { timeZone: MDT_TZ }) : "");
    setPendingImages([]);
    setNoteDialog(true);
  }

  async function handleSaveNote() {
    if (!noteBody.trim()) return;
    try {
      if (editNoteId) {
        await updateNote.mutateAsync({
          id: editNoteId,
          title: noteTitle.trim() || undefined,
          content: noteBody.trim(),
          color: noteColor,
          emoji: noteEmoji || undefined,
          postedAt: notePostedAt || undefined,
        });
        if (pendingImages.length > 0) {
          await uploadAttachments.mutateAsync({ id: editNoteId, files: pendingImages });
        }
        toast.success("Note updated");
      } else {
        const durationDays = noteExpiry
          ? Math.max(1, Math.ceil((new Date(noteExpiry).getTime() - Date.now()) / 86_400_000))
          : null;
        const created = await createNote.mutateAsync({
          title: noteTitle.trim() || undefined,
          content: noteBody.trim(),
          color: noteColor,
          durationDays,
          announcementType: noteAnnounce,
          emoji: noteEmoji || undefined,
          requiresAck: noteRequiresAck,
        });
        if (pendingImages.length > 0 && created?._id) {
          await uploadAttachments.mutateAsync({ id: created._id, files: pendingImages });
        }
        if (noteAnnounce === "urgent")
          toast.error(`🚨 Urgent: ${noteTitle || noteBody.slice(0, 40)}`, { duration: 6000 });
        else if (noteAnnounce === "important")
          toast.warning(`⚠️ Important: ${noteTitle || noteBody.slice(0, 40)}`, { duration: 5000 });
        else toast.success("Note pinned to the board");
      }
      setNoteDialog(false);
    } catch {
      toast.error("Failed to save note");
    }
  }

  return (
    <div className="space-y-0">
      {/* Outer wrapper — controls above the board */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
            <StickyNote className="size-5 text-amber-600 dark:text-amber-400" />
            Team Bulletin Board
          </h2>
          <p className="text-[11px] text-muted-foreground/50 mt-0.5 font-semibold">
            {boardNotes.length} note{boardNotes.length !== 1 ? "s" : ""}
            {pinnedCount > 0 && ` · ${pinnedCount} pinned`}
            {urgentCount > 0 && ` · ${urgentCount} urgent`}
          </p>
        </div>
        <Button
          onClick={openNewNote}
          className="self-start gap-2 bg-amber-700 hover:bg-amber-600 dark:bg-amber-700 dark:hover:bg-amber-600 text-white border-0 shadow-lg shrink-0"
        >
          <Plus className="size-4" />
          Pin a Note
        </Button>
      </div>

      {/* Filter tabs */}
      {boardNotes.length > 0 && (
        <div className="flex gap-0 border-b border-border/40 overflow-x-auto no-scrollbar mb-4">
          {(
            [
              { key: "all", label: "All", Icon: LayoutGrid },
              ...Object.entries(ANNOUNCE_CONFIG).map(([key, cfg]) => ({ key, label: cfg.label, Icon: cfg.icon })),
            ] as { key: string; label: string; Icon: React.ComponentType<any> }[]
          ).map(({ key, label, Icon }) => {
            const count = key === "all" ? boardNotes.length : boardNotes.filter((n) => (n.announcementType ?? "general") === key).length;
            if (count === 0 && key !== "all") return null;
            const on = boardTypeFilter === key;
            return (
              <button
                key={key}
                onClick={() => setBoardTypeFilter(key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs font-semibold transition-all shrink-0 border-b-2",
                  on
                    ? "border-amber-600 text-foreground font-black"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("size-3 shrink-0", on ? "text-amber-600" : "text-muted-foreground/50")} />
                {label}
                <span className={cn(
                  "text-[9px] font-black px-1 py-px rounded min-w-4 text-center leading-none tabular-nums",
                  on ? "bg-amber-600/12 text-amber-700 dark:text-amber-400" : "bg-muted-foreground/10 text-muted-foreground/60",
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* THE CORK BOARD */}
      {boardLoading ? (
        <div className="relative overflow-hidden rounded-xl p-3.5 sm:p-6 md:p-7 min-h-80" style={{ ...CORK_STYLE, ...FRAME_STYLE }}>
          <div className="absolute inset-0 dark:bg-black/50 rounded-lg" />
          <div className="relative columns-1 sm:columns-2 lg:columns-3 gap-4 sm:gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="break-inside-avoid mb-5 h-36 rounded-xl bg-white/20 animate-pulse" />
            ))}
          </div>
        </div>
      ) : boardNotes.length === 0 ? (
        <div
          className="relative overflow-hidden rounded-xl flex flex-col items-center justify-center py-24 text-center"
          style={{ ...CORK_STYLE, ...FRAME_STYLE }}
        >
          <div className="absolute inset-0 dark:bg-black/50" />
          <div className="relative flex flex-col items-center gap-4">
            <div className="relative">
              <PushPin color="bg-amber-400" />
              <div
                className={cn("rounded-xl border px-8 py-5 shadow-md", N.yellow.bg)}
                style={{ transform: "rotate(-1.5deg)", boxShadow: "0 4px 16px rgba(0,0,0,0.20)" }}
              >
                <p className="text-sm font-black text-amber-900/70 dark:text-amber-100/70">No notes yet…</p>
                <p className="text-xs text-amber-700/50 dark:text-amber-300/40 mt-0.5">Be the first to pin one!</p>
              </div>
            </div>
            <Button
              onClick={openNewNote}
              className="gap-2 bg-amber-700 hover:bg-amber-600 text-white border-0 shadow-lg mt-2"
            >
              <Plus className="size-4" />
              Pin the First Note
            </Button>
          </div>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div
          className="relative overflow-hidden rounded-xl flex flex-col items-center justify-center py-20 text-center"
          style={{ ...CORK_STYLE, ...FRAME_STYLE }}
        >
          <div className="absolute inset-0 dark:bg-black/50" />
          <div className="relative flex flex-col items-center gap-2">
            <StickyNote className="size-7 text-white/40 mb-1" />
            <p className="text-sm font-semibold text-white/70">No {boardTypeFilter} notes</p>
            <button onClick={() => setBoardTypeFilter("all")} className="text-xs text-amber-200 mt-1 hover:underline">
              Show all
            </button>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-xl p-3.5 pt-7 sm:p-6 sm:pt-8 md:p-7 md:pt-9" style={{ ...CORK_STYLE, ...FRAME_STYLE }}>
          <div className="absolute inset-0 dark:bg-black/50 pointer-events-none rounded-sm" />

          {/* Corner screws decoration */}
          {[
            "top-3.5 left-3.5",
            "top-3.5 right-3.5",
            "bottom-3.5 left-3.5",
            "bottom-3.5 right-3.5",
          ].map((pos) => (
            <div
              key={pos}
              className={cn("absolute size-3 rounded-full z-10 pointer-events-none", pos)}
              style={{
                background: "radial-gradient(circle at 35% 35%, rgb(160,120,60), rgb(80,55,20))",
                boxShadow: "inset 0 1px 2px rgba(255,255,255,0.25), 0 1px 3px rgba(0,0,0,0.5)",
              }}
            />
          ))}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filteredNotes.map((n) => n._id)} strategy={rectSortingStrategy}>
              <div className="relative columns-1 sm:columns-2 lg:columns-3 gap-4 sm:gap-5">
                {filteredNotes.map((note) => (
                  <SortableNoteItem
                    key={note._id}
                    note={note}
                    userName={userName}
                    myUserId={myUserId}
                    isAdmin={isAdmin}
                    onDelete={() =>
                      deleteNote.mutateAsync(note._id)
                        .then(() => toast.success("Note removed"))
                        .catch(() => toast.error("Failed to remove"))
                    }
                    onPin={() => pinNote.mutateAsync(note._id).catch(() => toast.error("Failed"))}
                    onEdit={() => openEditNote(note)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Inline lightbox for pending image previews */}
      {dialogLightbox && (
        <Dialog open onOpenChange={(o) => { if (!o) setDialogLightbox(null); }}>
          <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] p-0 bg-black/90 border-0 overflow-hidden flex items-center justify-center rounded-2xl">
            <button
              onClick={() => setDialogLightbox(null)}
              className="absolute top-3 right-3 z-50 size-8 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
            >
              <X className="size-4" />
            </button>
            <img src={dialogLightbox} alt="preview" className="max-w-full max-h-[88vh] object-contain rounded-lg" />
          </DialogContent>
        </Dialog>
      )}

      {/* Note create/edit dialog */}
      <Dialog open={noteDialog} onOpenChange={setNoteDialog}>
        <DialogContent className="w-[calc(100%-2rem)] sm:w-full sm:max-w-lg max-h-[92vh] overflow-y-auto p-0 rounded-2xl">
          <div className="relative overflow-hidden rounded-t-xl px-6 py-4 border-b border-amber-200/60 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/40">
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: "radial-gradient(circle at 1.5px 1.5px, rgba(120,80,30,0.3) 1.5px, transparent 0)",
                backgroundSize: "10px 10px",
              }}
            />
            <DialogHeader className="relative">
              <DialogTitle className="flex items-center gap-2.5 text-base font-black text-amber-900 dark:text-amber-100">
                {editNoteId ? (
                  <><Edit2 className="size-4 text-amber-700 dark:text-amber-400" />Edit Note</>
                ) : (
                  <><Pin className="size-4 text-amber-700 dark:text-amber-400" />Pin a New Note</>
                )}
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            {/* Emoji + Title */}
            <div className="flex gap-2">
              <div className="space-y-1.5 shrink-0">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Emoji Pin</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn("h-9 w-12 flex items-center justify-center rounded-md border border-input bg-background text-lg hover:bg-accent/40 transition-colors", !noteEmoji && "text-muted-foreground/40")}
                    >
                      {noteEmoji || <Smile className="size-4" />}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 border-0" align="start">
                    <EmojiPicker theme={"auto" as Theme} onEmojiClick={(e: EmojiClickData) => setNoteEmoji(e.emoji)} height={360} width={300} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5 flex-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  Title <span className="font-normal normal-case tracking-normal text-muted-foreground/40">(optional)</span>
                </label>
                <Input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Announcement, Reminder, FYI…" className="h-9 text-sm" maxLength={100} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Message <span className="text-destructive">*</span>
              </label>
              <Textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Write your message for the team…" className="text-sm resize-none h-28" maxLength={1000} />
              <p className="text-[10px] text-muted-foreground/40 text-right tabular-nums">{noteBody.length}/1000</p>
            </div>

            {/* Image upload */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Images <span className="font-normal normal-case tracking-normal text-muted-foreground/40">(up to 3)</span>
              </label>
              <div className="flex flex-wrap gap-2 items-center">
                {pendingImages.map((f, i) => {
                  const objectUrl = URL.createObjectURL(f);
                  return (
                    <div key={i} className="relative size-14 rounded-lg overflow-hidden border border-border/40 group/thumb">
                      <button
                        type="button"
                        onClick={() => setDialogLightbox(objectUrl)}
                        className="w-full h-full block"
                      >
                        <img src={objectUrl} alt={f.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/25 transition-colors flex items-center justify-center">
                          <ZoomIn className="size-3.5 text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity" />
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setPendingImages((prev) => prev.filter((_, idx) => idx !== i)); }}
                        className="absolute top-0.5 right-0.5 size-4 rounded-full bg-black/60 text-white flex items-center justify-center z-10"
                      >
                        <X className="size-2.5" />
                      </button>
                    </div>
                  );
                })}
                {pendingImages.length < 3 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="size-14 rounded-lg border-2 border-dashed border-border/40 flex items-center justify-center text-muted-foreground/40 hover:border-border/70 hover:text-foreground transition-colors"
                  >
                    <ImageIcon className="size-5" />
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []).slice(0, 3 - pendingImages.length);
                    setPendingImages((prev) => [...prev, ...files].slice(0, 3));
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            {!editNoteId && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Type</label>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.entries(ANNOUNCE_CONFIG) as [AnnouncementType, any][]).map(([type, cfg]) => {
                      const Icon = cfg.icon;
                      return (
                        <button
                          key={type}
                          onClick={() => setNoteAnnounce(type)}
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                            noteAnnounce === type ? cn(cfg.badge, "shadow-sm") : "border-border/40 text-muted-foreground hover:border-border/70 bg-muted/20",
                          )}
                        >
                          <Icon className="size-3" />
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                    Auto-expire <span className="font-normal normal-case tracking-normal text-muted-foreground/40">(leave empty = stays forever)</span>
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left h-9 text-sm font-normal">
                        <CalendarDays className="size-4 mr-2 text-muted-foreground/60 shrink-0" />
                        {noteExpiry ? new Date(noteExpiry + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : <span className="text-muted-foreground/50">No expiry — permanent</span>}
                        {noteExpiry && (
                          <span className="ml-auto text-[10px] text-muted-foreground/40 font-normal">
                            {Math.max(1, Math.ceil((new Date(noteExpiry).getTime() - Date.now()) / 86_400_000))}d from now
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={noteExpiry ? new Date(noteExpiry + 'T00:00:00') : undefined}
                        onSelect={(day) => setNoteExpiry(day ? day.toLocaleDateString('en-CA') : "")}
                        disabled={(date) => date <= new Date()}
                      />
                      {noteExpiry && (
                        <div className="px-3 pb-3 border-t border-border/40 pt-2">
                          <Button variant="ghost" size="sm" className="w-full h-7 text-xs text-muted-foreground gap-1.5" onClick={() => setNoteExpiry("")}>
                            <X className="size-3" />
                            Remove expiry — keep permanent
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 px-3.5 py-2.5">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="size-4 text-muted-foreground/60 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold">Requires Read Acknowledgment</p>
                      <p className="text-[10px] text-muted-foreground/50">Team members must confirm they've read this</p>
                    </div>
                  </div>
                  <Switch checked={noteRequiresAck} onCheckedChange={setNoteRequiresAck} />
                </div>
              </>
            )}

            {editNoteId && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  Post Date <span className="font-normal normal-case tracking-normal text-muted-foreground/40">(override display date)</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={notePostedAt}
                    onChange={(e) => setNotePostedAt(e.target.value)}
                    className="h-9 text-sm flex-1"
                  />
                  {notePostedAt && (
                    <Button variant="ghost" size="icon" className="size-9 shrink-0 text-muted-foreground/50" onClick={() => setNotePostedAt("")}>
                      <X className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Note Color</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(N) as NoteColor[]).map((c) => (
                  <Tooltip key={c}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setNoteColor(c)}
                        style={{ backgroundColor: N[c].hex }}
                        className={cn(
                          "size-8 rounded-xl border-2 transition-all",
                          noteColor === c ? "border-foreground/40 scale-[1.15] shadow-lg" : "border-transparent hover:scale-110 opacity-55 hover:opacity-90",
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent className="text-xs capitalize">{c}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>

            {(noteTitle || noteBody || noteEmoji) && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Preview</label>
                <div className={cn("rounded-xl border p-3.5 relative", N[noteColor].bg)} style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.10)" }}>
                  {noteEmoji && (
                    <span className="absolute top-2 right-2 text-2xl leading-none select-none" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))" }}>
                      {noteEmoji}
                    </span>
                  )}
                  <div className="space-y-1 pr-8">
                    {noteTitle && <p className="font-black text-sm tracking-tight">{noteTitle}</p>}
                    {noteBody && <p className="text-[13px] leading-relaxed whitespace-pre-wrap wrap-break-word text-foreground/80">{noteBody}</p>}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setNoteDialog(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-amber-700 hover:bg-amber-600 dark:bg-amber-700 dark:hover:bg-amber-600 text-white border-0 gap-1.5"
                onClick={handleSaveNote}
                disabled={!noteBody.trim() || createNote.isPending || updateNote.isPending}
              >
                {editNoteId ? (
                  <><Check className="size-3.5" />Save Changes</>
                ) : (
                  <><Pin className="size-3.5" />{createNote.isPending ? "Posting…" : "Pin to Board"}</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

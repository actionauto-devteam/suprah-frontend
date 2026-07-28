"use client";

import * as React from "react";
import { StickyNote, Plus, X, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiClient } from "@/lib/api-client";

interface TeamNote {
  _id: string;
  userId: string;
  authorName: string;
  authorAvatar?: string;
  text: string;
  updatedAt: string;
}

function ini(n?: string) {
  return (n || "U").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const NOTE_MAX = 100;

export function NotesRail() {
  const [notes, setNotes] = React.useState<TeamNote[]>([]);
  const [myNote, setMyNote] = React.useState<TeamNote | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback((signal?: AbortSignal) => {
    return apiClient
      .get("/api/crm/notes", { signal })
      .then((res) => {
        setNotes(res.data?.data?.notes || []);
        setMyNote(res.data?.data?.myNote || null);
      })
      .catch(() => {
        setNotes([]);
        setMyNote(null);
      });
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    const id = setInterval(() => load(), 45_000);
    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, [load]);

  const openEditor = () => {
    setDraft(myNote?.text || "");
    setEditing(true);
  };

  const save = async () => {
    const text = draft.trim();
    setSaving(true);
    try {
      if (!text) {
        await apiClient.delete("/api/crm/notes");
        setMyNote(null);
      } else {
        const res = await apiClient.put("/api/crm/notes", { text });
        setMyNote(res.data?.data?.note || null);
      }
      await load();
      setEditing(false);
    } catch {
      /* keep editor open on failure */
    } finally {
      setSaving(false);
    }
  };

  const others = notes.filter((n) => n._id !== myNote?._id);

  return (
    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar px-1">
      {/* Your note */}
      {editing ? (
        <div className="flex items-center gap-2 shrink-0 rounded-2xl border border-emerald-500/30 bg-card/60 backdrop-blur-md px-2.5 py-1.5">
          <input
            autoFocus
            value={draft}
            maxLength={NOTE_MAX}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
            placeholder="Share a note…"
            className="w-40 bg-transparent text-[11px] focus:outline-none placeholder:text-muted-foreground/40"
          />
          <span className="text-[9px] tabular-nums text-muted-foreground/40">{draft.length}/{NOTE_MAX}</span>
          <button onClick={save} disabled={saving} className="text-emerald-500 hover:text-emerald-400 disabled:opacity-50">
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <StickyNote className="size-3.5" />}
          </button>
          <button onClick={() => setEditing(false)} className="text-muted-foreground/40 hover:text-muted-foreground/70">
            <X className="size-3.5" />
          </button>
        </div>
      ) : myNote ? (
        <button onClick={openEditor} className="flex items-center gap-2 shrink-0 group">
          <div className="rounded-2xl rounded-bl-sm bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 max-w-52 group-hover:bg-emerald-500/15 transition-colors">
            <p className="text-[11px] leading-snug text-emerald-700 dark:text-emerald-300 line-clamp-2">{myNote.text}</p>
          </div>
        </button>
      ) : (
        <button
          onClick={openEditor}
          className="flex items-center gap-1.5 shrink-0 rounded-2xl border border-dashed border-border/50 px-3 py-1.5 text-[11px] font-medium text-muted-foreground/60 hover:border-emerald-500/40 hover:text-emerald-600 transition-colors"
        >
          <Plus className="size-3.5" /> Add a note
        </button>
      )}

      {others.length > 0 && <div className="w-px h-6 bg-border/40 shrink-0" />}

      {/* Coworkers' notes */}
      {others.map((n) => (
        <div key={n._id} className="flex items-center gap-2 shrink-0">
          <Avatar className="size-7">
            <AvatarImage src={n.authorAvatar} />
            <AvatarFallback className="bg-muted text-[9px] font-bold">{ini(n.authorName)}</AvatarFallback>
          </Avatar>
          <div className="rounded-2xl rounded-bl-sm bg-muted/50 px-3 py-1.5 max-w-52">
            <p className="text-[11px] leading-snug text-foreground/80 line-clamp-2">{n.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
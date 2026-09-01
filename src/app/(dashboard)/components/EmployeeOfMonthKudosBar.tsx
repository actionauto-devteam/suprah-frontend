"use client";

import * as React from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

const REACTIONS: { key: string; emoji: string; label: string }[] = [
  { key: "clap", emoji: "👏", label: "Clap" },
  { key: "fire", emoji: "🔥", label: "Fire" },
  { key: "heart", emoji: "❤️", label: "Heart" },
  { key: "trophy", emoji: "🏆", label: "Trophy" },
  { key: "star", emoji: "⭐", label: "Star" },
];

interface KudosNote {
  authorName: string;
  reaction: string;
  note?: string | null;
}

export function EmployeeOfMonthKudosBar({
  winnerId,
  authHeaders,
}: {
  winnerId: string;
  authHeaders: Record<string, string>;
}) {
  const [counts, setCounts] = React.useState<Record<string, number>>({});
  const [myReaction, setMyReaction] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState<KudosNote[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [comment, setComment] = React.useState("");
  const [posting, setPosting] = React.useState(false);
  const [reacting, setReacting] = React.useState(false);

  const fetchKudos = React.useCallback(() => {
    apiClient
      .get(`/api/employee-of-month/winners/${winnerId}/kudos`, { headers: authHeaders })
      .then((res) => {
        const data = res.data?.data || res.data;
        setCounts(data?.counts || {});
        setMyReaction(data?.myReaction || null);
        setNotes(data?.notes || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [winnerId, authHeaders]);

  React.useEffect(() => {
    fetchKudos();
  }, [fetchKudos]);

  const react = async (key: string) => {
    if (reacting) return;
    setReacting(true);
    const prevReaction = myReaction;
    const prevCounts = counts;
    setCounts((c) => {
      const next = { ...c };
      if (prevReaction) next[prevReaction] = Math.max(0, (next[prevReaction] || 1) - 1);
      if (prevReaction !== key) next[key] = (next[key] || 0) + 1;
      return next;
    });
    setMyReaction(prevReaction === key ? null : key);

    try {
      if (prevReaction === key) {
        await apiClient.delete(`/api/employee-of-month/winners/${winnerId}/kudos`, { headers: authHeaders });
      } else {
        await apiClient.put(
          `/api/employee-of-month/winners/${winnerId}/kudos`,
          { reaction: key },
          { headers: authHeaders },
        );
      }
    } catch {
      toast.error("Could not save your reaction");
      setCounts(prevCounts);
      setMyReaction(prevReaction);
    } finally {
      setReacting(false);
    }
  };

  const postComment = async () => {
    const note = comment.trim();
    if (!note || posting) return;
    setPosting(true);
    try {
      await apiClient.put(
        `/api/employee-of-month/winners/${winnerId}/kudos`,
        { reaction: myReaction || "clap", note },
        { headers: authHeaders },
      );
      setComment("");
      fetchKudos();
    } catch {
      toast.error("Could not post your comment");
    } finally {
      setPosting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="mt-2 w-full space-y-2">
      <div className="flex flex-wrap justify-center gap-1.5">
        {REACTIONS.map((r) => (
          <button
            key={r.key}
            onClick={() => react(r.key)}
            disabled={reacting}
            title={r.label}
            className={cn(
              "flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold transition-colors disabled:opacity-50",
              myReaction === r.key
                ? "border-amber-500 bg-amber-500/10 text-amber-600"
                : "border-border/40 text-muted-foreground/70 hover:bg-muted/50",
            )}
          >
            <span>{r.emoji}</span>
            {counts[r.key] ? <span>{counts[r.key]}</span> : null}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <input
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 280))}
          onKeyDown={(e) => e.key === "Enter" && postComment()}
          placeholder="Leave a congrats note…"
          className="min-w-0 flex-1 rounded-full border border-border/40 bg-background/40 px-3 py-1.5 text-xs outline-none focus:border-amber-500/40"
        />
        <button
          onClick={postComment}
          disabled={!comment.trim() || posting}
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white transition-opacity disabled:opacity-30"
        >
          <Send className="size-3.5" />
        </button>
      </div>

      {notes.length > 0 && (
        <div className="space-y-1 text-left">
          {notes.slice(0, 3).map((n, i) => (
            <p key={i} className="truncate text-[11px] text-muted-foreground/60">
              <span className="font-semibold text-muted-foreground/80">{n.authorName}:</span> {n.note}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

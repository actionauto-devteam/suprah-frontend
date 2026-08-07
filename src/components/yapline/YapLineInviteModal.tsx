"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Search, UserPlus, X, Loader2, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, resolveImageUrl } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

const ini = (name?: string | null) =>
  (name || "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

interface CrmUserLite {
  _id: string;
  fullName: string;
  username?: string;
  avatar?: string | null;
}

/** Invite teammates into an existing group channel (adds them to the underlying SupraSpace conversation). Shared by the Yapline page, floating dock, and dashboard widget. */
export function YapLineInviteModal({
  conv,
  onClose,
  onInvited,
}: {
  conv: { _id: string; name?: string | null; members: Array<{ _id: string }> };
  onClose: () => void;
  onInvited: (memberIds: string[]) => void;
}) {
  const [users, setUsers] = React.useState<CrmUserLite[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [saving, setSaving] = React.useState(false);
  const memberIds = React.useMemo(() => new Set(conv.members.map((m) => m._id)), [conv.members]);

  React.useEffect(() => {
    apiClient
      .get("/api/supraspace/users")
      .then((res) => setUsers(res.data?.data || res.data || []))
      .catch(() => toast.error("Could not load teammates"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(
    (u) =>
      !memberIds.has(u._id) &&
      (u.fullName.toLowerCase().includes(query.toLowerCase()) ||
        (u.username || "").toLowerCase().includes(query.toLowerCase()))
  );

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const submit = async () => {
    if (selected.size === 0 || saving) return;
    setSaving(true);
    try {
      const ids = [...selected];
      await apiClient.patch(`/api/supraspace/conversations/${conv._id}`, { addMembers: ids });
      onInvited(ids);
      toast.success(`Invited ${ids.length} teammate${ids.length === 1 ? "" : "s"}`);
      onClose();
    } catch {
      toast.error("Could not invite teammates");
    } finally {
      setSaving(false);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/30 px-4 py-3">
          <h3 className="text-sm font-black">Invite to {conv.name || "channel"}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted/60">
            <X className="size-4" />
          </button>
        </div>
        <div className="border-b border-border/30 p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search teammates…"
              className="w-full rounded-xl border border-border/40 bg-background/40 py-2 pl-8 pr-3 text-xs outline-none focus:border-emerald-500/40"
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground/40" /></div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground/50">No one left to invite.</p>
          ) : (
            filtered.map((u) => {
              const isSelected = selected.has(u._id);
              return (
                <button
                  key={u._id}
                  onClick={() => toggle(u._id)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left hover:bg-muted/50"
                >
                  <Avatar className="size-8 shrink-0">
                    {u.avatar && <AvatarImage src={resolveImageUrl(u.avatar)} />}
                    <AvatarFallback className="bg-emerald-600 text-[10px] font-bold text-white">{ini(u.fullName)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold">{u.fullName}</span>
                  <span className={cn(
                    "flex size-4.5 shrink-0 items-center justify-center rounded-full border-2",
                    isSelected ? "border-emerald-500 bg-emerald-500" : "border-border"
                  )}>
                    {isSelected && <Check className="size-3 text-white" strokeWidth={3} />}
                  </span>
                </button>
              );
            })
          )}
        </div>
        <div className="border-t border-border/30 p-3">
          <button
            disabled={selected.size === 0 || saving}
            onClick={submit}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-black text-white disabled:opacity-40"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            Invite{selected.size > 0 ? ` (${selected.size})` : ""}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

"use client";

import * as React from "react";
import { FileText, Plus, Pencil, Trash2 } from "lucide-react";
import { useCannedReplies, CannedReply } from "@/hooks/useCannedReplies";

interface CannedReplyPickerProps {
  onInsert: (text: string) => void;
  leadContext?: { firstName?: string; lastName?: string; vehicle?: string };
  disabled?: boolean;
}

function resolveTokens(
  body: string,
  ctx?: CannedReplyPickerProps["leadContext"],
) {
  if (!ctx) return body;
  return body
    .split("{{firstName}}").join(ctx.firstName || "")
    .split("{{lastName}}").join(ctx.lastName || "")
    .split("{{vehicle}}").join(ctx.vehicle || "");
}

export function CannedReplyPicker({
  onInsert,
  leadContext,
  disabled,
}: CannedReplyPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draftTitle, setDraftTitle] = React.useState("");
  const [draftBody, setDraftBody] = React.useState("");
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  const {
    replies,
    createReply,
    updateReply,
    deleteReply,
    recordUsage,
    isCreating,
    isUpdating,
  } = useCannedReplies();

  React.useEffect(() => {
    if (!open) return;

    const closeMenu = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
        setCreating(false);
        setEditingId(null);
      }
    };

    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, [open]);

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return replies;
    return replies.filter(
      (reply) =>
        reply.title.toLowerCase().includes(query) ||
        reply.body.toLowerCase().includes(query),
    );
  }, [replies, search]);

  const resetForm = () => {
    setCreating(false);
    setEditingId(null);
    setDraftTitle("");
    setDraftBody("");
  };

  const handleInsert = (reply: CannedReply) => {
    onInsert(resolveTokens(reply.body, leadContext));
    recordUsage(reply._id);
    setOpen(false);
  };

  const startEdit = (reply: CannedReply) => {
    setEditingId(reply._id);
    setDraftTitle(reply.title);
    setDraftBody(reply.body);
    setCreating(false);
  };

  const saveDraft = async () => {
    const title = draftTitle.trim();
    const body = draftBody.trim();
    if (!title || !body) return;

    if (editingId) {
      await updateReply({ id: editingId, title, body });
    } else {
      await createReply({ title, body });
    }

    resetForm();
  };

  const isEditingForm = creating || Boolean(editingId);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        disabled={disabled}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-emerald-400/10 dark:hover:text-slate-300 sm:h-7 sm:w-7"
        title="Quick replies"
        aria-label="Quick replies"
        aria-expanded={open}
      >
        <FileText className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute bottom-full right-0 z-100 mb-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white shadow-xl dark:border-emerald-400/15 dark:bg-[#0f1f19]">
          {isEditingForm ? (
            <div className="space-y-2 p-3">
              <input
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                placeholder="Template title"
                className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-800 outline-none focus:border-emerald-500/50 dark:border-emerald-400/15 dark:bg-[#0a1410] dark:text-slate-100"
              />
              <textarea
                value={draftBody}
                onChange={(event) => setDraftBody(event.target.value)}
                placeholder="Reply text — use {{firstName}}, {{lastName}}, {{vehicle}}"
                rows={4}
                className="w-full resize-none rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-800 outline-none focus:border-emerald-500/50 dark:border-emerald-400/15 dark:bg-[#0a1410] dark:text-slate-100"
              />
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-emerald-400/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void saveDraft()}
                  disabled={!draftTitle.trim() || !draftBody.trim() || isCreating || isUpdating}
                  className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-40"
                >
                  {editingId ? "Save" : "Create"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 border-b border-slate-100 p-2 dark:border-emerald-400/10">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search templates…"
                  className="h-8 flex-1 min-w-0 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-800 outline-none focus:border-emerald-500/50 dark:border-emerald-400/15 dark:bg-[#0a1410] dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                  title="New template"
                  aria-label="New template"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto p-1.5">
                {filtered.length === 0 ? (
                  <p className="px-2 py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                    {replies.length === 0 ? "No templates yet — create one." : "No matches."}
                  </p>
                ) : (
                  filtered.map((reply) => (
                    <div
                      key={reply._id}
                      className="group flex items-start gap-1.5 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-emerald-400/[0.06]"
                    >
                      <button
                        type="button"
                        onClick={() => handleInsert(reply)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {reply.title}
                        </p>
                        <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                          {reply.body}
                        </p>
                      </button>
                      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => startEdit(reply)}
                          className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-emerald-400/15 dark:hover:text-slate-200"
                          title="Edit template"
                          aria-label="Edit template"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteReply(reply._id)}
                          className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                          title="Delete template"
                          aria-label="Delete template"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

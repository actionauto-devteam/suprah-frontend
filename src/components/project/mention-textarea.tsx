"use client";

/**
 * MentionTextarea — comment composer with @-mentions.
 *
 * Typing "@" (at the start of the text or after whitespace) opens a searchable
 * dropdown of the task's group members, filtered live as the user keeps
 * typing. Arrow keys / Enter / click select; Escape dismisses. Selecting
 * inserts "@Full Name " into the text and records the member's id.
 *
 * The mention list self-heals: if the user later deletes an "@Full Name"
 * token from the text, that member is dropped from the tracked ids, so the
 * ids submitted always match the visible tags.
 *
 * MentionText renders a stored comment message with the @-tags highlighted.
 */

import * as React from "react";
import { AtSign } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MemberAvatar,
  displayName,
  type Member,
} from "@/components/project/task-detail-dialog";

/** Active "@query" fragment immediately before the caret, if any. */
function activeMentionQuery(text: string, caret: number): { query: string; start: number } | null {
  const upToCaret = text.slice(0, caret);
  const match = /(^|\s)@([^\s@]*)$/.exec(upToCaret);
  if (!match) return null;
  return { query: match[2], start: caret - match[2].length - 1 };
}

export function MentionTextarea({
  value,
  onChange,
  members,
  mentionIds,
  onMentionIdsChange,
  onSubmit,
  placeholder,
  disabled,
  bare,
}: {
  value: string;
  onChange: (next: string) => void;
  members: Member[];
  mentionIds: string[];
  onMentionIdsChange: (ids: string[]) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  /** Drops the textarea's own border/background — use when a parent container already supplies them. */
  bare?: boolean;
}) {
  const areaRef = React.useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = React.useState<string | null>(null);
  const [mentionStart, setMentionStart] = React.useState(0);
  const [highlighted, setHighlighted] = React.useState(0);

  // Auto-grow with content instead of relying on internal scroll.
  React.useLayoutEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    area.style.height = "auto";
    area.style.height = `${area.scrollHeight}px`;
  }, [value]);

  const options = React.useMemo(() => {
    if (query === null) return [];
    const q = query.toLowerCase();
    return members
      .filter((m) => {
        const name = displayName(m).toLowerCase();
        return !q || name.includes(q) || (m.username || "").toLowerCase().includes(q);
      })
      .slice(0, 6);
  }, [members, query]);

  /** Keep tracked ids in sync with the tags still present in the text. */
  const pruneMentions = React.useCallback(
    (text: string) => {
      const kept = mentionIds.filter((id) => {
        const m = members.find((x) => x._id === id);
        return m ? text.includes(`@${displayName(m)}`) : false;
      });
      if (kept.length !== mentionIds.length) onMentionIdsChange(kept);
    },
    [mentionIds, members, onMentionIdsChange],
  );

  const syncDropdown = (text: string, caret: number) => {
    const active = activeMentionQuery(text, caret);
    if (active) {
      setQuery(active.query);
      setMentionStart(active.start);
      setHighlighted(0);
    } else {
      setQuery(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    onChange(text);
    pruneMentions(text);
    syncDropdown(text, e.target.selectionStart ?? text.length);
  };

  const select = (member: Member) => {
    const area = areaRef.current;
    const caret = area?.selectionStart ?? value.length;
    const tag = `@${displayName(member)} `;
    const next = value.slice(0, mentionStart) + tag + value.slice(caret);
    onChange(next);
    if (!mentionIds.includes(member._id)) onMentionIdsChange([...mentionIds, member._id]);
    setQuery(null);
    requestAnimationFrame(() => {
      const pos = mentionStart + tag.length;
      area?.focus();
      area?.setSelectionRange(pos, pos);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (query !== null && options.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlighted((h) => (h + 1) % options.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlighted((h) => (h - 1 + options.length) % options.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        select(options[highlighted]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setQuery(null);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="relative min-w-0 flex-1">
      {/* Mention dropdown — anchored above the composer */}
      {query !== null && options.length > 0 && (
        <div className="absolute bottom-full left-0 z-30 mb-1.5 w-64 overflow-hidden rounded-xl border border-border/60 bg-popover shadow-lg">
          <div className="flex items-center gap-1.5 border-b border-border/40 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            <AtSign className="h-3 w-3 text-emerald-600" /> Mention a teammate
          </div>
          {options.map((m, i) => (
            <button
              key={m._id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault(); // keep textarea focus
                select(m);
              }}
              onMouseEnter={() => setHighlighted(i)}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors",
                i === highlighted ? "bg-emerald-500/10" : "hover:bg-muted/40",
              )}
            >
              <MemberAvatar member={m} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium">{displayName(m)}</span>
                <span className="block truncate text-[10px] text-muted-foreground/60">
                  @{m.username}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      <textarea
        ref={areaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={(e) =>
          syncDropdown(value, (e.target as HTMLTextAreaElement).selectionStart ?? 0)
        }
        onBlur={() => setTimeout(() => setQuery(null), 150)}
        placeholder={placeholder}
        rows={1}
        disabled={disabled}
        className={cn(
          "max-h-40 min-h-10 w-full resize-none bg-transparent text-sm placeholder:text-muted-foreground/40 focus:outline-none",
          bare
            ? "px-0 py-1.5"
            : "rounded-xl border border-border/70 bg-background px-3 py-2.5 focus:ring-2 focus:ring-emerald-500/30",
        )}
      />
    </div>
  );
}

/** Renders a comment message with @Name tags of mentioned members highlighted. */
export function MentionText({
  text,
  mentionNames,
}: {
  text: string;
  mentionNames: string[];
}) {
  const parts = React.useMemo(() => {
    if (mentionNames.length === 0) return [{ text, tag: false }];
    // Longest names first so "@Ana Maria Cruz" wins over "@Ana".
    const names = [...mentionNames].filter(Boolean).sort((a, b) => b.length - a.length);
    const pattern = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    const regex = new RegExp(`@(?:${pattern})`, "g");
    const out: Array<{ text: string; tag: boolean }> = [];
    let last = 0;
    for (const m of text.matchAll(regex)) {
      if (m.index! > last) out.push({ text: text.slice(last, m.index), tag: false });
      out.push({ text: m[0], tag: true });
      last = m.index! + m[0].length;
    }
    if (last < text.length) out.push({ text: text.slice(last), tag: false });
    return out;
  }, [text, mentionNames]);

  return (
    <>
      {parts.map((p, i) =>
        p.tag ? (
          <span
            key={i}
            className="rounded bg-emerald-500/15 px-0.5 font-semibold text-emerald-700 dark:text-emerald-400"
          >
            {p.text}
          </span>
        ) : (
          <React.Fragment key={i}>{p.text}</React.Fragment>
        ),
      )}
    </>
  );
}
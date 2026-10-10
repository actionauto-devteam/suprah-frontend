"use client";

import * as React from "react";
import { AtSign, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeamMembers } from "@/hooks/useTeamPulse";
import { useCrmLeadGroups } from "@/hooks/useCrmLeadGroups";
import { Avatar } from "./atomic/Avatar";

interface MentionCandidate {
  kind: "user" | "group";
  id: string;
  name: string;
}

function activeMentionQuery(text: string, caret: number): { query: string; start: number } | null {
  const upToCaret = text.slice(0, caret);
  const match = /(^|\s)@([^\s@]*)$/.exec(upToCaret);
  if (!match) return null;
  return { query: match[2], start: caret - match[2].length - 1 };
}

export function LeadNoteComposer({
  value,
  onChange,
  mentionedUserIds,
  onMentionedUserIdsChange,
  mentionedGroupIds,
  onMentionedGroupIdsChange,
  onSubmit,
  placeholder,
  disabled,
  bare,
}: {
  value: string;
  onChange: (next: string) => void;
  mentionedUserIds: string[];
  onMentionedUserIdsChange: (ids: string[]) => void;
  mentionedGroupIds: string[];
  onMentionedGroupIdsChange: (ids: string[]) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  bare?: boolean;
}) {
  const { data: teamMembers } = useTeamMembers();
  const { groups } = useCrmLeadGroups();

  const areaRef = React.useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = React.useState<string | null>(null);
  const [mentionStart, setMentionStart] = React.useState(0);
  const [highlighted, setHighlighted] = React.useState(0);

  React.useLayoutEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    area.style.height = "auto";
    area.style.height = `${area.scrollHeight}px`;
  }, [value]);

  const candidates: MentionCandidate[] = React.useMemo(() => {
    const users: MentionCandidate[] = (teamMembers || []).map((m) => ({ kind: "user", id: m._id, name: m.name }));
    const teamGroups: MentionCandidate[] = (groups || [])
      .filter((g) => g.isActive)
      .map((g) => ({ kind: "group", id: g._id, name: g.name }));
    return [...users, ...teamGroups];
  }, [teamMembers, groups]);

  const options = React.useMemo(() => {
    if (query === null) return [];
    const q = query.toLowerCase();
    return candidates.filter((c) => !q || c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [candidates, query]);

  const pruneMentions = React.useCallback(
    (text: string) => {
      const keptUsers = mentionedUserIds.filter((id) => {
        const c = candidates.find((x) => x.kind === "user" && x.id === id);
        return c ? text.includes(`@${c.name}`) : false;
      });
      if (keptUsers.length !== mentionedUserIds.length) onMentionedUserIdsChange(keptUsers);

      const keptGroups = mentionedGroupIds.filter((id) => {
        const c = candidates.find((x) => x.kind === "group" && x.id === id);
        return c ? text.includes(`@${c.name}`) : false;
      });
      if (keptGroups.length !== mentionedGroupIds.length) onMentionedGroupIdsChange(keptGroups);
    },
    [candidates, mentionedUserIds, mentionedGroupIds, onMentionedUserIdsChange, onMentionedGroupIdsChange],
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

  const select = (candidate: MentionCandidate) => {
    const area = areaRef.current;
    const caret = area?.selectionStart ?? value.length;
    const tag = `@${candidate.name} `;
    const next = value.slice(0, mentionStart) + tag + value.slice(caret);
    onChange(next);
    if (candidate.kind === "user" && !mentionedUserIds.includes(candidate.id)) {
      onMentionedUserIdsChange([...mentionedUserIds, candidate.id]);
    }
    if (candidate.kind === "group" && !mentionedGroupIds.includes(candidate.id)) {
      onMentionedGroupIdsChange([...mentionedGroupIds, candidate.id]);
    }
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
      {query !== null && options.length > 0 && (
        <div className="absolute bottom-full left-0 z-30 mb-1.5 w-64 overflow-hidden rounded-xl border border-amber-300/60 bg-popover shadow-lg dark:border-amber-500/30">
          <div className="flex items-center gap-1.5 border-b border-border/40 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            <AtSign className="h-3 w-3 text-amber-600" /> Mention someone
          </div>
          {options.map((c, i) => (
            <button
              key={`${c.kind}:${c.id}`}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                select(c);
              }}
              onMouseEnter={() => setHighlighted(i)}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors",
                i === highlighted ? "bg-amber-500/10" : "hover:bg-muted/40",
              )}
            >
              {c.kind === "group" ? (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 ring-1 ring-amber-200/80 dark:bg-amber-900/50 dark:text-amber-300 dark:ring-amber-700/50">
                  <Users className="h-4 w-4" />
                </div>
              ) : (
                <Avatar first={c.name.split(" ")[0]} last={c.name.split(" ").slice(1).join(" ")} size="sm" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium">{c.name}</span>
                <span className="block truncate text-[10px] text-muted-foreground/60">
                  {c.kind === "group" ? "Team" : "Teammate"}
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
        onClick={(e) => syncDropdown(value, (e.target as HTMLTextAreaElement).selectionStart ?? 0)}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
        placeholder={placeholder || "Type @ to mention a teammate or a team..."}
        rows={1}
        disabled={disabled}
        className={cn(
          "max-h-40 min-h-10 w-full resize-none bg-transparent text-sm placeholder:text-muted-foreground/40 focus:outline-none",
          bare
            ? "px-0 py-1.5"
            : "rounded-xl border border-amber-300/60 bg-amber-50/40 px-3 py-2.5 focus:ring-2 focus:ring-amber-500/30 dark:border-amber-500/30 dark:bg-amber-950/10",
        )}
      />
    </div>
  );
}

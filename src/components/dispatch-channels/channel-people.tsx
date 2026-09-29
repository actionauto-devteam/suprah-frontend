"use client";

import * as React from "react";
import { Loader2, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/providers/AuthProvider";
import { userErrorMessage } from "@/lib/user-error";
import { cn } from "@/lib/utils";
import { dispatchChannelsApi, type ChannelPerson } from "@/lib/api/dispatch-channels";

const SEARCH_DELAY_MS = 300;

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

/** "Driver", or "Staff · Organization". */
export function personLabel(person: Pick<ChannelPerson, "kind" | "organizationName">) {
  if (person.kind === "driver") return "Driver";
  return person.organizationName ? `Staff · ${person.organizationName}` : "Staff";
}

export function PersonAvatar({ person, className }: { person: Pick<ChannelPerson, "name" | "avatar">; className?: string }) {
  return (
    <Avatar className={cn("size-8 shrink-0 border border-border/60", className)}>
      {person.avatar && <AvatarImage src={person.avatar} alt={person.name} className="object-cover" />}
      <AvatarFallback className="bg-emerald-500/10 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
        {initialsOf(person.name)}
      </AvatarFallback>
    </Avatar>
  );
}

/**
 * Finds drivers and staff anywhere on the platform by name. Shows only name,
 * driver/staff and organization (never email or phone).
 */
export function ChannelPeoplePicker({
  excludeIds = [],
  actionLabel,
  onPick,
  disabled = false,
  autoFocus = false,
}: {
  excludeIds?: string[];
  actionLabel: string;
  onPick: (person: ChannelPerson) => void | Promise<void>;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const { getToken } = useAuth();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<ChannelPerson[]>([]);
  const [status, setStatus] = React.useState<"idle" | "searching" | "error">("idle");
  const [pickingId, setPickingId] = React.useState<string | null>(null);
  const excluded = React.useMemo(() => new Set(excludeIds), [excludeIds]);
  const search = query.trim();

  React.useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (search.length < 2) {
        setResults([]);
        setStatus("idle");
        return;
      }
      setStatus("searching");
      try {
        const people = await dispatchChannelsApi.searchPeople(getToken, search);
        if (cancelled) return;
        setResults(people);
        setStatus("idle");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }, SEARCH_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [getToken, search]);

  const visible = results.filter((person) => !excluded.has(person.id));

  const pick = async (person: ChannelPerson) => {
    setPickingId(person.id);
    try {
      await onPick(person);
    } finally {
      setPickingId(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search drivers and staff by name"
          className="h-9 pl-8 text-sm"
          autoFocus={autoFocus}
          disabled={disabled}
        />
      </div>
      {status === "searching" && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> Searching…
        </p>
      )}
      {status === "error" && (
        <p className="text-xs text-destructive">{userErrorMessage(null, "search for people")}</p>
      )}
      {status === "idle" && search.length >= 2 && visible.length === 0 && (
        <p className="text-xs text-muted-foreground">Nobody else matches that name.</p>
      )}
      {visible.length > 0 && (
        <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
          {visible.map((person) => (
            <li key={person.id} className="flex items-center gap-2 rounded-md border border-border/50 px-2 py-1.5">
              <PersonAvatar person={person} className="size-7" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{person.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{personLabel(person)}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={disabled || pickingId !== null}
                onClick={() => void pick(person)}
              >
                {pickingId === person.id ? <Loader2 className="size-3 animate-spin" /> : actionLabel}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

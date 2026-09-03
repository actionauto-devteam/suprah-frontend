"use client";

import * as React from "react";
import { Bookmark, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

export interface CalendarSavedView {
  id: string;
  name: string;
  teamFilter: string[];
  typeFilter: string[];
  statusFilter: string[];
  query: string;
  createdAt: string;
}

type CurrentFilters = Omit<CalendarSavedView, "id" | "name" | "createdAt">;

const STORAGE_KEY = "suprah-calendar-views";

function readViews(): CalendarSavedView[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeViews(views: CalendarSavedView[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
}

/**
 * Save/apply named combinations of the calendar's filters (team, type,
 * status, search). Pure localStorage, no backend — mirrors the pattern
 * already established by src/components/reports/workspace/SavedReportViews.tsx,
 * condensed into one popover to fit alongside the other toolbar filters.
 */
export function SavedViewsMenu({
  current,
  onApply,
}: {
  current: CurrentFilters;
  onApply: (view: CalendarSavedView) => void;
}) {
  const [views, setViews] = React.useState<CalendarSavedView[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState("");
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setViews(readViews());
  }, []);

  const saveCurrent = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = views.find((v) => v.name.toLowerCase() === trimmed.toLowerCase());
    const nextView: CalendarSavedView = {
      id: existing?.id ?? crypto.randomUUID(),
      name: trimmed,
      ...current,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    const next = existing
      ? views.map((v) => (v.id === existing.id ? nextView : v))
      : [nextView, ...views];
    writeViews(next);
    setViews(next);
    setName("");
    setSaving(false);
  };

  const remove = (id: string) => {
    const next = views.filter((v) => v.id !== id);
    writeViews(next);
    setViews(next);
  };

  const hasActiveFilters =
    current.teamFilter.length > 0 ||
    current.typeFilter.length > 0 ||
    current.statusFilter.length > 0 ||
    current.query.trim().length > 0;

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setSaving(false);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 rounded-lg border-border bg-background px-2 text-xs font-normal text-foreground hover:bg-accent"
        >
          <Bookmark className="h-3.5 w-3.5 text-muted-foreground" />
          Views
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(92vw,240px)] p-0" align="end">
        <Command>
          <CommandList>
            <CommandEmpty>No saved views yet.</CommandEmpty>
            <CommandGroup heading="Saved views">
              {views.map((v) => (
                <CommandItem
                  key={v.id}
                  onSelect={() => {
                    onApply(v);
                    setOpen(false);
                  }}
                  className="justify-between"
                >
                  <span className="truncate">{v.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(v.id);
                    }}
                    aria-label={`Delete "${v.name}"`}
                    className="ml-2 shrink-0 rounded p-0.5 text-muted-foreground transition hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          <CommandSeparator />
          <div className="p-2">
            {saving ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveCurrent();
                    if (e.key === "Escape") setSaving(false);
                  }}
                  placeholder="View name"
                  className="h-7 min-w-0 flex-1 rounded border border-border bg-background px-2 text-xs text-foreground outline-none placeholder:text-muted-foreground"
                />
                <Button type="button" size="sm" className="h-7 px-2 text-xs" onClick={saveCurrent}>
                  Save
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasActiveFilters}
                className="h-7 w-full gap-1.5 text-xs"
                onClick={() => setSaving(true)}
              >
                <Save className="h-3.5 w-3.5" />
                Save current filters
              </Button>
            )}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

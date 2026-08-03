"use client";

import * as React from "react";
import { Bookmark, Save, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReportFilterState, ReportId } from "@/types/report-filters";
import type { ReportColumnPreferences } from "@/lib/report-filter-query";

interface SavedReportView {
  id: string;
  name: string;
  filters: ReportFilterState;
  columns?: ReportColumnPreferences;
  createdAt: string;
}

interface SavedReportViewsProps {
  reportId: ReportId;
  filters: ReportFilterState;
  columns: ReportColumnPreferences;
  onApply: (
    filters: ReportFilterState,
    columns: ReportColumnPreferences,
  ) => void;
}

function storageKey(reportId: ReportId): string {
  return `suprah-report-views:${reportId}`;
}

function readViews(reportId: ReportId): SavedReportView[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(storageKey(reportId)) ?? "[]",
    );

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeViews(reportId: ReportId, views: SavedReportView[]): void {
  window.localStorage.setItem(storageKey(reportId), JSON.stringify(views));
}

function cloneFilters(filters: ReportFilterState): ReportFilterState {
  return structuredClone(filters);
}

function cloneColumns(
  columns: ReportColumnPreferences | undefined,
): ReportColumnPreferences {
  return structuredClone(columns ?? {});
}

export default function SavedReportViews({
  reportId,
  filters,
  columns,
  onApply,
}: SavedReportViewsProps) {
  const [views, setViews] = React.useState<SavedReportView[]>([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState("");

  React.useEffect(() => {
    const next = readViews(reportId);
    setViews(next);
    setSelectedId("");
  }, [reportId]);

  const saveCurrent = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const existing = views.find(
      (view) => view.name.toLowerCase() === trimmed.toLowerCase(),
    );

    const nextView: SavedReportView = {
      id: existing?.id ?? crypto.randomUUID(),
      name: trimmed,
      filters: cloneFilters(filters),
      columns: cloneColumns(columns),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };

    const next = existing
      ? views.map((view) => (view.id === existing.id ? nextView : view))
      : [nextView, ...views];

    writeViews(reportId, next);
    setViews(next);
    setSelectedId(nextView.id);
    setName("");
    setSaving(false);
  };

  const removeSelected = () => {
    if (!selectedId) return;
    const next = views.filter((view) => view.id !== selectedId);
    writeViews(reportId, next);
    setViews(next);
    setSelectedId("");
  };

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <div className="w-full min-w-48 sm:w-60">
        <Select
          value={selectedId}
          onValueChange={(value) => {
            setSelectedId(value);
            const selected = views.find((view) => view.id === value);
            if (selected) {
              onApply(
                cloneFilters(selected.filters),
                cloneColumns(selected.columns),
              );
            }
          }}
        >
          <SelectTrigger className="h-9 w-full">
            <Bookmark className="mr-2 size-4 text-muted-foreground" />
            <SelectValue placeholder="Saved views" />
          </SelectTrigger>
          <SelectContent>
            {views.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                No saved views yet
              </div>
            ) : (
              views.map((view) => (
                <SelectItem key={view.id} value={view.id}>
                  {view.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {saving ? (
        <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-card p-1">
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") saveCurrent();
              if (event.key === "Escape") setSaving(false);
            }}
            placeholder="View name"
            className="h-7 min-w-36 bg-transparent px-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <Button type="button" size="sm" className="h-7" onClick={saveCurrent}>
            Save
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={() => setSaving(false)}
            aria-label="Cancel saving view"
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-2"
          onClick={() => setSaving(true)}
        >
          <Save className="size-4" />
          Save View
        </Button>
      )}

      {selectedId && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 text-muted-foreground hover:text-destructive"
          onClick={removeSelected}
          aria-label="Delete selected saved view"
        >
          <Trash2 className="size-4" />
        </Button>
      )}
    </div>
  );
}

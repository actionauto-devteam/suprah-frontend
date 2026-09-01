"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Trash2, Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";
import { resolveImageUrl } from "@/lib/utils";
import { ini } from "../../../components/DashboardPanel";
import { monthLabel, type EotmEmployee } from "../../../components/EmployeeOfMonthWinnerCard";

interface HistoryItem {
  _id: string;
  month: string;
  teamId: string;
  teamName: string;
  employee: EotmEmployee | null;
  note?: string | null;
  setAt?: string | null;
}

interface TeamOption {
  _id: string;
  name: string;
}

export function HistoryList({
  token,
  isAdmin,
  onChanged,
}: {
  token: string;
  isAdmin: boolean;
  onChanged?: () => void;
}) {
  const [teams, setTeams] = React.useState<TeamOption[]>([]);
  const [teamId, setTeamId] = React.useState("all");
  const [year, setYear] = React.useState("all");
  const [availableYears, setAvailableYears] = React.useState<string[]>([]);
  const [items, setItems] = React.useState<HistoryItem[]>([]);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);

  const authHeaders = React.useMemo<Record<string, string>>(
    () => (token ? { Authorization: `Bearer ${token}` } : ({} as Record<string, string>)),
    [token],
  );

  React.useEffect(() => {
    apiClient
      .get("/api/employee-of-month/teams", { headers: authHeaders })
      .then((res) => {
        const data = res.data?.data || res.data;
        setTeams(data?.teams || []);
      })
      .catch(() => setTeams([]));
  }, [authHeaders]);

  const fetchPage = React.useCallback(
    (targetPage: number) => {
      const setBusy = targetPage === 1 ? setLoading : setLoadingMore;
      setBusy(true);
      apiClient
        .get("/api/employee-of-month/history", {
          headers: authHeaders,
          params: {
            page: targetPage,
            limit: 24,
            teamId: teamId !== "all" ? teamId : undefined,
            year: year !== "all" ? year : undefined,
          },
        })
        .then((res) => {
          const data = res.data?.data || res.data;
          setItems((prev) => (targetPage === 1 ? data?.items || [] : [...prev, ...(data?.items || [])]));
          setHasMore(!!data?.hasMore);
          setAvailableYears(data?.availableYears || []);
          setPage(targetPage);
        })
        .catch(() => {
          if (targetPage === 1) setItems([]);
        })
        .finally(() => setBusy(false));
    },
    [authHeaders, teamId, year],
  );

  React.useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  const deleteEntry = async (id: string) => {
    try {
      await apiClient.delete(`/api/employee-of-month/history/${id}`, { headers: authHeaders });
      setItems((prev) => prev.filter((i) => i._id !== id));
      toast.success("Removed");
      onChanged?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not remove entry");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Select value={teamId} onValueChange={setTeamId}>
          <SelectTrigger size="sm" className="w-40">
            <SelectValue placeholder="All teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All teams</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t._id} value={t._id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger size="sm" className="w-28">
            <SelectValue placeholder="All years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All years</SelectItem>
            {availableYears.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground/50">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Trophy className="size-6 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground/60">No past winners yet.</p>
        </div>
      ) : (
        <HistoryTimeline items={items} isAdmin={isAdmin} onDelete={deleteEntry} />
      )}

      {hasMore && (
        <div className="flex justify-center pt-1">
          <Button variant="outline" size="sm" disabled={loadingMore} onClick={() => fetchPage(page + 1)}>
            {loadingMore ? <Loader2 className="size-3.5 animate-spin" /> : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}

function HistoryTimeline({
  items,
  isAdmin,
  onDelete,
}: {
  items: HistoryItem[];
  isAdmin: boolean;
  onDelete: (id: string) => void;
}) {
  const grouped = items.reduce<Record<string, HistoryItem[]>>((acc, item) => {
    (acc[item.month] ||= []).push(item);
    return acc;
  }, {});

  return (
    <div className="relative space-y-6 pl-4">
      <div className="absolute top-1 bottom-1 left-[3px] w-px bg-border/40" />
      {Object.entries(grouped).map(([month, rows]) => (
        <div key={month} className="relative">
          <span className="absolute top-1 -left-4 size-2 rounded-full bg-amber-500" />
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground/50">
            {monthLabel(month)}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {rows.map((row) => (
              <div
                key={row._id}
                className="flex items-center gap-3 rounded-xl border border-border/30 bg-background/40 p-3"
              >
                <Avatar className="size-10 shrink-0">
                  <AvatarImage src={resolveImageUrl(row.employee?.avatar)} />
                  <AvatarFallback className="text-xs font-bold">{ini(row.employee?.fullName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{row.employee?.fullName || "Unknown"}</p>
                  <p className="truncate text-[11px] text-muted-foreground/60">{row.teamName}</p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => onDelete(row._id)}
                    title="Remove this record"
                    className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground/40 transition-colors hover:bg-red-500/10 hover:text-red-600"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

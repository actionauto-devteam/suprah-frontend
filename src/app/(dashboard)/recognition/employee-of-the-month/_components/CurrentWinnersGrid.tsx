"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Megaphone, Pencil, Trash2, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { apiClient } from "@/lib/api-client";
import { resolveImageUrl } from "@/lib/utils";
import { ini } from "../../../components/DashboardPanel";
import { EmployeeOfMonthWinnerCard, monthLabel, type EotmEmployee } from "../../../components/EmployeeOfMonthWinnerCard";
import { EmployeeOfMonthKudosBar } from "../../../components/EmployeeOfMonthKudosBar";
import { NominationDialog } from "./NominationDialog";

interface TeamWinner {
  teamId: string;
  name: string;
  color?: string;
  memberCount: number;
  winnerId: string | null;
  employee: EotmEmployee | null;
  note?: string | null;
  setAt?: string | null;
}

interface Candidate {
  _id: string;
  fullName: string;
  avatar?: string;
  department?: string;
}

interface Nomination {
  _id: string;
  nomineeId: { _id: string; fullName: string; avatar?: string } | null;
  submittedBy: { _id: string; fullName: string } | null;
  note?: string | null;
}

function EditableTeamCard({
  teamId,
  name,
  employee,
  winnerId,
  isAdmin,
  authHeaders,
  onUpdated,
}: {
  teamId: string;
  name: string;
  employee: EotmEmployee | null;
  winnerId: string | null;
  isAdmin: boolean;
  authHeaders: Record<string, string>;
  onUpdated: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [candidates, setCandidates] = React.useState<Candidate[]>([]);
  const [nominations, setNominations] = React.useState<Nomination[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [clearing, setClearing] = React.useState(false);
  const [nominateOpen, setNominateOpen] = React.useState(false);

  const loadNominations = React.useCallback(() => {
    if (!isAdmin) return;
    apiClient
      .get("/api/employee-of-month/nominations", { headers: authHeaders, params: { teamId } })
      .then((res) => {
        const data = res.data?.data || res.data;
        setNominations(data?.nominations || []);
      })
      .catch(() => setNominations([]));
  }, [isAdmin, teamId, authHeaders]);

  React.useEffect(() => {
    if (!open) return;
    loadNominations();
  }, [open, loadNominations]);

  React.useEffect(() => {
    if (!open) return;
    setSearching(true);
    const handle = setTimeout(() => {
      apiClient
        .get("/api/employee-of-month/candidates", {
          headers: authHeaders,
          params: { teamId, q: query },
        })
        .then((res) => {
          const data = res.data?.data || res.data;
          setCandidates(data?.users || []);
        })
        .catch(() => setCandidates([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [open, query, teamId, authHeaders]);

  const handleSelect = async (employeeId: string) => {
    setSaving(true);
    try {
      await apiClient.put(
        "/api/employee-of-month",
        { teamId, employeeId },
        { headers: authHeaders },
      );
      setOpen(false);
      setQuery("");
      onUpdated();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not set winner");
    } finally {
      setSaving(false);
    }
  };

  const dismissNomination = async (id: string) => {
    try {
      await apiClient.delete(`/api/employee-of-month/nominations/${id}`, { headers: authHeaders });
      loadNominations();
    } catch {
      toast.error("Could not dismiss nomination");
    }
  };

  const clearWinner = async () => {
    setClearing(true);
    try {
      await apiClient.delete(`/api/employee-of-month/teams/${teamId}/winner`, { headers: authHeaders });
      setOpen(false);
      onUpdated();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not remove winner");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <EmployeeOfMonthWinnerCard label={name} employee={employee}>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-2 right-2 size-7 p-0"
              onClick={() => setOpen(true)}
            >
              <Pencil className="size-3.5" />
            </Button>
            <DialogContent className="max-w-sm p-0 overflow-hidden" showCloseButton={false}>
              <div className="flex items-center justify-between gap-3 px-4 pt-4">
                <DialogTitle className="text-sm">Set {name} Employee of the Month</DialogTitle>
                <DialogClose asChild>
                  <button
                    type="button"
                    className="-mr-1 shrink-0 rounded-lg p-1.5 text-muted-foreground/60 transition-colors hover:bg-muted/60 hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </DialogClose>
              </div>

              {employee && (
                <div className="px-4 pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={clearing}
                    onClick={clearWinner}
                    className="w-full gap-1.5 border-red-500/30 text-xs text-red-600 hover:bg-red-500/10 hover:text-red-600"
                  >
                    {clearing ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                    Remove {employee.fullName} as winner
                  </Button>
                </div>
              )}

              {nominations.length > 0 && (
                <div className="space-y-1.5 px-3 pt-3 pb-3">
                  <p className="px-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground/50">
                    Nominated this month
                  </p>
                  {nominations.map((nom) =>
                    nom.nomineeId ? (
                      <div
                        key={nom._id}
                        className="flex items-center gap-2 rounded-lg border border-border/30 bg-background/40 p-2"
                      >
                        <Avatar className="size-7 shrink-0">
                          <AvatarImage src={resolveImageUrl(nom.nomineeId.avatar)} />
                          <AvatarFallback className="text-[10px]">{ini(nom.nomineeId.fullName)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold">{nom.nomineeId.fullName}</p>
                          {nom.note && <p className="truncate text-[11px] text-muted-foreground/60">{nom.note}</p>}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 shrink-0 px-2 text-[10px]"
                          disabled={saving}
                          onClick={() => nom.nomineeId && handleSelect(nom.nomineeId._id)}
                        >
                          Pick
                        </Button>
                        <button
                          onClick={() => dismissNomination(nom._id)}
                          title="Dismiss nomination"
                          className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:bg-muted/70 hover:text-foreground"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ) : null,
                  )}
                </div>
              )}

              <div className="border-t border-border/30">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search employee by name…"
                    value={query}
                    onValueChange={setQuery}
                  />
                  <CommandList>
                    {!searching && candidates.length === 0 && (
                      <CommandEmpty>No employees on {name}. Add members from Manage Teams.</CommandEmpty>
                    )}
                    <CommandGroup>
                      {candidates.map((c) => (
                        <CommandItem
                          key={c._id}
                          value={c._id}
                          disabled={saving}
                          onSelect={() => handleSelect(c._id)}
                          className="gap-2"
                        >
                          <Avatar className="size-6">
                            <AvatarImage src={resolveImageUrl(c.avatar)} />
                            <AvatarFallback className="text-[10px]">{ini(c.fullName)}</AvatarFallback>
                          </Avatar>
                          <span className="truncate">{c.fullName}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {winnerId && <EmployeeOfMonthKudosBar winnerId={winnerId} authHeaders={authHeaders} />}
      </EmployeeOfMonthWinnerCard>

      {!isAdmin && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 self-center text-[11px] text-muted-foreground/70"
          onClick={() => setNominateOpen(true)}
        >
          <Megaphone className="size-3.5" />
          Nominate
        </Button>
      )}

      <NominationDialog
        open={nominateOpen}
        onOpenChange={setNominateOpen}
        teamId={teamId}
        teamName={name}
        authHeaders={authHeaders}
        onSubmitted={() => {}}
      />
    </div>
  );
}

export function CurrentWinnersGrid({
  token,
  isAdmin,
}: {
  token: string;
  isAdmin: boolean;
}) {
  const [month, setMonth] = React.useState<string | null>(null);
  const [teams, setTeams] = React.useState<TeamWinner[]>([]);
  const [loading, setLoading] = React.useState(true);

  const authHeaders = React.useMemo<Record<string, string>>(
    () => (token ? { Authorization: `Bearer ${token}` } : ({} as Record<string, string>)),
    [token],
  );

  const fetchCurrent = React.useCallback(() => {
    setLoading(true);
    apiClient
      .get("/api/employee-of-month", { headers: authHeaders })
      .then((res) => {
        const data = res.data?.data || res.data;
        setMonth(data?.month || null);
        setTeams(data?.teams || []);
      })
      .catch(() => setTeams([]))
      .finally(() => setLoading(false));
  }, [authHeaders]);

  React.useEffect(() => {
    fetchCurrent();
  }, [fetchCurrent]);

  if (loading) {
    return (
      <div className="grid animate-pulse grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-48 rounded-2xl bg-muted/40" />
        ))}
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <p className="text-sm text-muted-foreground/60">
        No teams yet. {isAdmin ? "Create one from Manage Teams." : "Check back once an admin sets one up."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {month && (
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground/50">
          {monthLabel(month)}
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((t) => (
          <EditableTeamCard
            key={t.teamId}
            teamId={t.teamId}
            name={t.name}
            employee={t.employee}
            winnerId={t.winnerId}
            isAdmin={isAdmin}
            authHeaders={authHeaders}
            onUpdated={fetchCurrent}
          />
        ))}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { Pencil, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
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
import { useCrmUser } from "@/hooks/useCrmUser";
import { Panel, PanelSkeleton, ini } from "./DashboardPanel";

type Team = "Philippines" | "Utah";

interface Winner {
  employee: { _id: string; fullName: string; avatar?: string; department?: string } | null;
  note?: string | null;
}

interface Candidate {
  _id: string;
  fullName: string;
  avatar?: string;
  department?: string;
}

const TEAMS: { team: Team; label: string }[] = [
  { team: "Philippines", label: "PH Team" },
  { team: "Utah", label: "Utah/Lehi" },
];

function monthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, (m || 1) - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function TeamCard({
  team,
  label,
  winner,
  isAdmin,
  authHeaders,
  onUpdated,
}: {
  team: Team;
  label: string;
  winner: Winner | null;
  isAdmin: boolean;
  authHeaders: Record<string, string>;
  onUpdated: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [candidates, setCandidates] = React.useState<Candidate[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setSearching(true);
    const handle = setTimeout(() => {
      apiClient
        .get("/api/employee-of-month/candidates", {
          headers: authHeaders,
          params: { team, q: query },
        })
        .then((res) => {
          const data = res.data?.data || res.data;
          setCandidates(data?.users || []);
        })
        .catch(() => setCandidates([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [open, query, team, authHeaders]);

  const handleSelect = async (employeeId: string) => {
    setSaving(true);
    try {
      await apiClient.put(
        "/api/employee-of-month",
        { team, employeeId },
        { headers: authHeaders },
      );
      setOpen(false);
      setQuery("");
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  const employee = winner?.employee;

  return (
    <div className="relative flex flex-1 flex-col items-center gap-2 rounded-2xl border border-border/30 bg-background/40 p-4 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60">{label}</p>

      {employee ? (
        <>
          <Avatar className="size-16 ring-2 ring-amber-500/40">
            <AvatarImage src={resolveImageUrl(employee.avatar)} />
            <AvatarFallback className="bg-amber-500 text-white text-lg font-bold">
              {ini(employee.fullName)}
            </AvatarFallback>
          </Avatar>
          <p className="text-sm font-black truncate max-w-full">{employee.fullName}</p>
          {employee.department && (
            <p className="text-[11px] text-muted-foreground/60 truncate max-w-full">{employee.department}</p>
          )}
        </>
      ) : (
        <>
          <div className="flex size-16 items-center justify-center rounded-full bg-muted/50 text-muted-foreground/40">
            <Star className="size-6" />
          </div>
          <p className="text-xs text-muted-foreground/50">Not selected yet</p>
        </>
      )}

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
          <DialogContent className="max-w-sm p-0 overflow-hidden">
            <DialogHeader className="px-4 pt-4">
              <DialogTitle className="text-sm">Set {label} Employee of the Month</DialogTitle>
            </DialogHeader>
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search employee by name…"
                value={query}
                onValueChange={setQuery}
              />
              <CommandList>
                {!searching && candidates.length === 0 && (
                  <CommandEmpty>No employees found on {label}.</CommandEmpty>
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
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export function EmployeeOfMonthPanel() {
  const { user, token, isLoading: userLoading } = useCrmUser();
  const [month, setMonth] = React.useState<string | null>(null);
  const [philippines, setPhilippines] = React.useState<Winner | null>(null);
  const [utah, setUtah] = React.useState<Winner | null>(null);
  const [loading, setLoading] = React.useState(true);

  const authHeaders = React.useMemo<Record<string, string>>(
    () => (token ? { Authorization: `Bearer ${token}` } : ({} as Record<string, string>)),
    [token],
  );

  const fetchCurrent = React.useCallback(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    apiClient
      .get("/api/employee-of-month", { headers: authHeaders })
      .then((res) => {
        const data = res.data?.data || res.data;
        setMonth(data?.month || null);
        setPhilippines(data?.philippines || null);
        setUtah(data?.utah || null);
      })
      .catch(() => {
        setPhilippines(null);
        setUtah(null);
      })
      .finally(() => setLoading(false));
  }, [token, authHeaders]);

  React.useEffect(() => {
    if (userLoading) return;
    fetchCurrent();
  }, [userLoading, fetchCurrent]);

  const isAdmin = user?.role === "admin";

  return (
    <Panel title="Employee of the Month" icon={Star} accent="text-amber-500">
      {month && (
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground/50">
          {monthLabel(month)}
        </p>
      )}
      {loading || userLoading ? (
        <PanelSkeleton rows={2} />
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row">
          {TEAMS.map(({ team, label }) => (
            <TeamCard
              key={team}
              team={team}
              label={label}
              winner={team === "Philippines" ? philippines : utah}
              isAdmin={isAdmin}
              authHeaders={authHeaders}
              onUpdated={fetchCurrent}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}

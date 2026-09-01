"use client";

import * as React from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, Loader2, Plus, Search, Users, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiClient } from "@/lib/api-client";
import { cn, resolveImageUrl } from "@/lib/utils";
import { DEPT_COLOR_HEX, DEPT_COLOR_PALETTE } from "@/lib/departments";
import { ini } from "../../../components/DashboardPanel";

interface OrgUser {
  _id: string;
  fullName: string;
  username?: string;
  avatar?: string;
}

interface Team {
  _id: string;
  name: string;
  color: string;
  isActive: boolean;
  memberCount: number;
  memberIds: string[];
}

function TeamEditor({
  team,
  authHeaders,
  onSaved,
  onCancel,
}: {
  team: Team | null;
  authHeaders: Record<string, string>;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = React.useState(team?.name || "");
  const [color, setColor] = React.useState(team?.color || "amber");
  const [isActive, setIsActive] = React.useState(team?.isActive ?? true);
  const [users, setUsers] = React.useState<OrgUser[]>([]);
  const [loadingUsers, setLoadingUsers] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(new Set(team?.memberIds || []));
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    apiClient
      .get("/api/supraspace/users", { headers: authHeaders })
      .then((res) => setUsers(res.data?.data || res.data || []))
      .catch(() => toast.error("Could not load teammates"))
      .finally(() => setLoadingUsers(false));
  }, [authHeaders]);

  const filtered = users.filter((u) => u.fullName.toLowerCase().includes(query.toLowerCase()));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const save = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const body = { name: name.trim(), color, isActive, memberIds: [...selected] };
      if (team) {
        await apiClient.put(`/api/employee-of-month/teams/${team._id}`, body, { headers: authHeaders });
      } else {
        await apiClient.post("/api/employee-of-month/teams", body, { headers: authHeaders });
      }
      toast.success(team ? "Team updated" : "Team created");
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not save team");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border/30 px-4 py-3">
        <Button variant="ghost" size="sm" className="size-7 p-0" onClick={onCancel}>
          <ArrowLeft className="size-4" />
        </Button>
        <h3 className="text-sm font-black">{team ? "Edit team" : "New team"}</h3>
      </div>

      <div className="space-y-3 border-b border-border/30 p-4">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Team name (e.g. Sales Stars)" />
        <div className="flex flex-wrap items-center gap-1.5">
          {DEPT_COLOR_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={cn(
                "size-6 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all",
                color === c ? "ring-foreground" : "ring-transparent",
              )}
              style={{ backgroundColor: DEPT_COLOR_HEX[c] }}
              aria-label={c}
            />
          ))}
        </div>
        {team && (
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground/70">Active</span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        )}
      </div>

      <div className="border-b border-border/30 p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search employees…"
            className="w-full rounded-xl border border-border/40 bg-background/40 py-2 pl-8 pr-3 text-xs outline-none focus:border-amber-500/40"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loadingUsers ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground/40" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground/50">No employees found.</p>
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
                  <AvatarImage src={resolveImageUrl(u.avatar)} />
                  <AvatarFallback className="bg-amber-600 text-[10px] font-bold text-white">
                    {ini(u.fullName)}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate text-xs font-semibold">{u.fullName}</span>
                <span
                  className={cn(
                    "flex size-4.5 shrink-0 items-center justify-center rounded-full border-2",
                    isSelected ? "border-amber-500 bg-amber-500" : "border-border",
                  )}
                >
                  {isSelected && <Check className="size-3 text-white" strokeWidth={3} />}
                </span>
              </button>
            );
          })
        )}
      </div>

      <div className="border-t border-border/30 p-3">
        <Button className="w-full gap-2" disabled={!name.trim() || saving} onClick={save}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          Save team ({selected.size} member{selected.size === 1 ? "" : "s"})
        </Button>
      </div>
    </div>
  );
}

export function TeamsManager({
  open,
  onOpenChange,
  token,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  onChanged: () => void;
}) {
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<Team | "new" | null>(null);

  const authHeaders = React.useMemo<Record<string, string>>(
    () => (token ? { Authorization: `Bearer ${token}` } : ({} as Record<string, string>)),
    [token],
  );

  const fetchTeams = React.useCallback(() => {
    setLoading(true);
    apiClient
      .get("/api/employee-of-month/teams", { headers: authHeaders, params: { includeInactive: "true" } })
      .then((res) => {
        const data = res.data?.data || res.data;
        setTeams(data?.teams || []);
      })
      .catch(() => setTeams([]))
      .finally(() => setLoading(false));
  }, [authHeaders]);

  React.useEffect(() => {
    if (open) fetchTeams();
  }, [open, fetchTeams]);

  const handleSaved = () => {
    setEditing(null);
    fetchTeams();
    onChanged();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[80vh] max-w-md flex-col overflow-hidden p-0" showCloseButton={false}>
        {editing !== null ? (
          <TeamEditor
            team={editing === "new" ? null : editing}
            authHeaders={authHeaders}
            onSaved={handleSaved}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-border/30 px-4 py-3">
              <DialogTitle className="text-sm">Manage Teams</DialogTitle>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setEditing("new")}>
                  <Plus className="size-3.5" />
                  New team
                </Button>
                <DialogClose asChild>
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-muted-foreground/60 transition-colors hover:bg-muted/60 hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </DialogClose>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="size-5 animate-spin text-muted-foreground/40" />
                </div>
              ) : teams.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <Users className="size-6 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground/60">No teams yet. Create one to get started.</p>
                </div>
              ) : (
                teams.map((t) => (
                  <button
                    key={t._id}
                    onClick={() => setEditing(t)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-muted/50"
                  >
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: DEPT_COLOR_HEX[t.color] }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">{t.name}</span>
                    {!t.isActive && (
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground/60">
                        Inactive
                      </span>
                    )}
                    <span className="shrink-0 text-xs text-muted-foreground/50">
                      {t.memberCount} member{t.memberCount === 1 ? "" : "s"}
                    </span>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

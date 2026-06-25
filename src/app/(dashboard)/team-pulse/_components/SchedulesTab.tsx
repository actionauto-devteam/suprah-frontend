"use client";

import * as React from "react";
import {
  addDays,
  format,
  isSameDay,
  parseISO,
  startOfWeek,
} from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Moon,
  Plus,
  Sun,
  Sunset,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Shift, TeamMember } from "@/hooks/useTeamPulse";
import {
  useShifts,
  useCreateShift,
  useDeleteShift,
} from "@/hooks/useTeamPulse";

type ShiftType = 'morning' | 'afternoon' | 'evening' | 'night' | 'custom';

const SHIFT_TYPES: { key: ShiftType; label: string; icon: React.ComponentType<any>; defaultStart: string; defaultEnd: string; color: string }[] = [
  { key: "morning",   label: "Morning",   icon: Sun,      defaultStart: "06:00", defaultEnd: "14:00", color: "bg-amber-100 text-amber-700 border-amber-300/50 dark:bg-amber-950/50 dark:text-amber-400" },
  { key: "afternoon", label: "Afternoon", icon: Sunset,   defaultStart: "14:00", defaultEnd: "22:00", color: "bg-orange-100 text-orange-700 border-orange-300/50 dark:bg-orange-950/50 dark:text-orange-400" },
  { key: "evening",   label: "Evening",   icon: Moon,     defaultStart: "18:00", defaultEnd: "02:00", color: "bg-violet-100 text-violet-700 border-violet-300/50 dark:bg-violet-950/50 dark:text-violet-400" },
  { key: "night",     label: "Night",     icon: Moon,     defaultStart: "22:00", defaultEnd: "06:00", color: "bg-indigo-100 text-indigo-700 border-indigo-300/50 dark:bg-indigo-950/50 dark:text-indigo-400" },
  { key: "custom",    label: "Custom",    icon: Clock,    defaultStart: "09:00", defaultEnd: "17:00", color: "bg-muted text-muted-foreground border-border/40" },
];

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function SchedulesTab({
  members,
  isAdmin,
  myUserId,
  userName,
}: {
  members: TeamMember[];
  isAdmin: boolean;
  myUserId?: string;
  userName?: string;
}) {
  const [weekStart, setWeekStart] = React.useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [shiftDialog, setShiftDialog] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    userId: myUserId || "",
    shiftType: "custom" as ShiftType,
    startTime: "09:00",
    endTime: "17:00",
    role: "",
    location: "",
    note: "",
  });

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekKey = format(weekStart, "yyyy-MM-dd");

  const { data: shifts = [], isLoading } = useShifts({ week: weekKey });
  const createShift = useCreateShift();
  const deleteShift = useDeleteShift();

  function openDialog(date: string) {
    setSelectedDate(date);
    setForm({ userId: myUserId || "", shiftType: "custom", startTime: "09:00", endTime: "17:00", role: "", location: "", note: "" });
    setShiftDialog(true);
  }

  function handleShiftTypeChange(type: ShiftType) {
    const cfg = SHIFT_TYPES.find((t) => t.key === type);
    setForm((p) => ({ ...p, shiftType: type, startTime: cfg?.defaultStart || "09:00", endTime: cfg?.defaultEnd || "17:00" }));
  }

  async function handleCreate() {
    if (!selectedDate || !form.startTime || !form.endTime) return;
    try {
      await createShift.mutateAsync({
        userId: form.userId || undefined,
        date: selectedDate,
        startTime: form.startTime,
        endTime: form.endTime,
        shiftType: form.shiftType,
        role: form.role.trim() || undefined,
        location: form.location.trim() || undefined,
        note: form.note.trim() || undefined,
      } as any);
      toast.success("Shift added");
      setShiftDialog(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to add shift");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteShift.mutateAsync(id);
      toast.success("Shift removed");
    } catch {
      toast.error("Failed");
    }
  }

  const onlineCount = members.filter((m) => m.onlineStatus !== "offline").length;

  return (
    <div className="space-y-5">

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-3.5 text-muted-foreground/50 shrink-0" />
          <span className="text-sm font-black">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </span>
        </div>
        <div className="flex items-center gap-0.5 border border-border/40 rounded-lg p-0.5 bg-card">
          <Button variant="ghost" size="icon" className="size-7 rounded-md" onClick={() => setWeekStart((w) => addDays(w, -7))}>
            <ChevronLeft className="size-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] font-black rounded-md" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            Today
          </Button>
          <Button variant="ghost" size="icon" className="size-7 rounded-md" onClick={() => setWeekStart((w) => addDays(w, 7))}>
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="size-5 animate-spin text-muted-foreground/40" /></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {weekDates.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayShifts = shifts.filter((s) => isSameDay(parseISO(s.date), day));
            const isToday = isSameDay(day, new Date());
            const isWknd = day.getDay() === 0 || day.getDay() === 6;

            return (
              <div
                key={dateStr}
                className={cn(
                  "rounded-xl border flex flex-col overflow-hidden min-h-28",
                  isToday ? "border-primary/50 bg-primary/3" : isWknd ? "border-border/20 bg-muted/15" : "border-border/40 bg-card",
                )}
              >
                <div className={cn(
                  "px-2.5 py-2 flex items-center justify-between border-b",
                  isToday ? "border-primary/20 bg-primary/5" : "border-border/20",
                )}>
                  <div>
                    <p className={cn("text-[9px] font-black uppercase tracking-widest leading-none", isToday ? "text-primary" : "text-muted-foreground/40")}>
                      {DAYS_OF_WEEK[day.getDay()]}
                    </p>
                    <p className={cn("text-lg font-black leading-tight mt-0.5", isToday ? "text-primary" : isWknd ? "text-muted-foreground/50" : "text-foreground")}>
                      {day.getDate()}
                    </p>
                  </div>
                  <button
                    onClick={() => openDialog(dateStr)}
                    className="size-7 rounded-md flex items-center justify-center text-muted-foreground/30 hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>

                <div className="flex flex-col gap-1 p-1.5 flex-1">
                  {dayShifts.map((shift) => {
                    const cfg = SHIFT_TYPES.find((t) => t.key === shift.shiftType) ?? SHIFT_TYPES[4];
                    const Icon = cfg.icon;
                    const canDelete = shift.userId === myUserId || isAdmin;
                    return (
                      <div
                        key={shift._id}
                        className={cn("rounded-lg border px-1.5 py-1 text-[10px] font-semibold flex items-start gap-1 group/shift", cfg.color)}
                      >
                        <Icon className="size-2.5 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-bold">{shift.userName.split(" ")[0]}</p>
                          <p className="opacity-70">{shift.startTime}–{shift.endTime}</p>
                          {shift.role && <p className="opacity-60 truncate">{shift.role}</p>}
                        </div>
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(shift._id)}
                            className="size-5 -mt-0.5 -mr-0.5 flex items-center justify-center rounded transition-colors opacity-70 sm:opacity-0 sm:group-hover/shift:opacity-100 hover:bg-red-500/15 hover:text-red-600 shrink-0"
                          >
                            <X className="size-2.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">This Week's Schedule</p>
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden divide-y divide-border/30">
          {members.map((m) => {
            const myShifts = shifts.filter((s) => s.userId === m._id);
            return (
              <div key={m._id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors">
                <div className="relative shrink-0">
                  <Avatar className="size-7">
                    <AvatarImage src={m.avatar} />
                    <AvatarFallback className="text-[9px] font-black">{m.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <span className={cn("absolute -bottom-px -right-px size-2 rounded-full border border-background", m.onlineStatus === "online" ? "bg-green-500" : m.onlineStatus === "busy" ? "bg-red-500" : "bg-gray-400")} />
                </div>
                <p className="text-xs font-semibold truncate flex-1">{m.name}</p>
                <span className="text-[10px] text-muted-foreground/50 tabular-nums">{myShifts.length} shift{myShifts.length !== 1 ? "s" : ""}</span>
                <button
                  onClick={() => { setForm((p) => ({ ...p, userId: m._id })); openDialog(format(new Date(), "yyyy-MM-dd")); }}
                  className="size-8 flex items-center justify-center rounded-md hover:bg-muted/60 text-muted-foreground/40 hover:text-foreground transition-colors shrink-0"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add shift dialog */}
      <Dialog open={shiftDialog} onOpenChange={setShiftDialog}>
        <DialogContent className="w-[calc(100%-2rem)] sm:w-full sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              Add Shift
              {selectedDate && <span className="text-sm font-normal text-muted-foreground">· {format(parseISO(selectedDate), "EEEE, MMM d")}</span>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {isAdmin && (
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Assign To</label>
                <Select value={form.userId || "self"} onValueChange={(v) => setForm((p) => ({ ...p, userId: v === "self" ? (myUserId || "") : v }))}>
                  <SelectTrigger className="mt-1 h-9 text-sm">
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self" className="text-sm">Myself</SelectItem>
                    {members.filter((m) => m._id !== myUserId).map((m) => (
                      <SelectItem key={m._id} value={m._id} className="text-sm">{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Shift Type</label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {SHIFT_TYPES.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => handleShiftTypeChange(key)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                      form.shiftType === key
                        ? SHIFT_TYPES.find((t) => t.key === key)!.color + " shadow-sm"
                        : "border-border/40 text-muted-foreground hover:border-border/70 bg-muted/20",
                    )}
                  >
                    <Icon className="size-3" />{label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Start</label>
                <Input type="time" value={form.startTime} onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))} className="mt-1 h-9 text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">End</label>
                <Input type="time" value={form.endTime} onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))} className="mt-1 h-9 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Role</label>
                <Input value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} placeholder="Sales, Support…" className="mt-1 h-9 text-sm" maxLength={80} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Location</label>
                <Input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} placeholder="Office, Remote…" className="mt-1 h-9 text-sm" maxLength={100} />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Note</label>
              <Textarea value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} placeholder="Shift notes…" className="mt-1 text-sm resize-none h-16" maxLength={300} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShiftDialog(false)}>Cancel</Button>
              <Button className="flex-1 gap-1.5" onClick={handleCreate} disabled={createShift.isPending}>
                <Clock className="size-3.5" />
                {createShift.isPending ? "Adding…" : "Add Shift"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

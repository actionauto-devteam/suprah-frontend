"use client";

import * as React from "react";
import { format, isSameDay, parseISO } from "date-fns";
import {
  Building2,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Paperclip,
  Plus,
  Trash2,
  TrendingUp,
  Upload,
  X,
  ZoomIn,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DEPARTMENTS } from "@/lib/departments";
import type { TeamMember, Absence, AbsenceType } from "@/hooks/useTeamPulse";
import {
  useTeamAbsences,
  usePendingAbsences,
  useCreateAbsence,
  useDeleteAbsence,
  useApproveAbsence,
  useRejectAbsence,
  useUploadAbsenceProof,
} from "@/hooks/useTeamPulse";
import { A } from "./team-pulse-constants";

export function TeamCalendar({
  members,
  userName,
  isAdmin,
  myUserId,
}: {
  members: TeamMember[];
  userName?: string;
  isAdmin: boolean;
  myUserId?: string;
}) {
  const [calMonth, setCalMonth] = React.useState(new Date());
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null);
  const [absType, setAbsType] = React.useState<AbsenceType>("day_off");
  const [absTitle, setAbsTitle] = React.useState("");
  const [absNote, setAbsNote] = React.useState("");
  const [absOther, setAbsOther] = React.useState("");
  const [absEndDate, setAbsEndDate] = React.useState("");
  const [calDeptFilter, setCalDeptFilter] = React.useState("all");
  const [calTypeFilter, setCalTypeFilter] = React.useState("all");
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [rejectId, setRejectId] = React.useState<string | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [pendingProofId, setPendingProofId] = React.useState<string | null>(
    null,
  );
  const [lightbox, setLightbox] = React.useState<{
    url: string;
    name: string;
  } | null>(null);
  const proofInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setShowAddForm(false);
    setAbsTitle("");
    setAbsNote("");
    setAbsOther("");
    setAbsEndDate("");
    setAbsType("day_off");
  }, [selectedDay]);

  const calYear = calMonth.getFullYear();
  const calMonthNum = calMonth.getMonth() + 1;

  const { data: absences = [] } = useTeamAbsences(calYear, calMonthNum);
  const { data: pendingAbsences = [] } = usePendingAbsences();
  const createAbsence = useCreateAbsence();
  const deleteAbsence = useDeleteAbsence();
  const approveAbsence = useApproveAbsence();
  const rejectAbsence = useRejectAbsence();
  const uploadProof = useUploadAbsenceProof();

  const availableDepts = React.useMemo(
    () => ({
      ordered: [...DEPARTMENTS],
      hasNone: members.some((m) => !m.personalInfo?.department),
    }),
    [members],
  );

  const calAbsences = React.useMemo(() => {
    return absences.filter((a) => {
      const m = members.find((mb) => mb.name === a.userName);
      const deptOk =
        calDeptFilter === "all" ||
        (calDeptFilter === "__none__"
          ? !m?.personalInfo?.department
          : m?.personalInfo?.department === calDeptFilter);
      const typeOk = calTypeFilter === "all" || a.type === calTypeFilter;
      return deptOk && typeOk;
    });
  }, [absences, calDeptFilter, calTypeFilter, members]);

  const todayAbsences = React.useMemo(
    () => absences.filter((a) => isSameDay(parseISO(a.date), new Date())),
    [absences],
  );

  const dayAbsences = selectedDay
    ? calAbsences.filter((a) => isSameDay(parseISO(a.date), selectedDay))
    : [];
  const myDayAbsence = selectedDay
    ? absences
        .filter((a) => isSameDay(parseISO(a.date), selectedDay))
        .find((a) => a.userName === userName)
    : undefined;
  const myMonthAbsences = absences.filter((a) => a.userName === userName);

  const upcomingAbsences = React.useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(todayStart);
    weekEnd.setDate(todayStart.getDate() + 6);
    return calAbsences
      .filter((a) => {
        const d = parseISO(a.date);
        return d >= todayStart && d <= weekEnd;
      })
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  }, [calAbsences]);

  const monthStats = React.useMemo(() => {
    const counts: Record<string, number> = {};
    calAbsences.forEach((a) => {
      counts[a.type] = (counts[a.type] || 0) + 1;
    });
    const peakType =
      (Object.entries(counts).sort(
        ([, x], [, y]) => y - x,
      )[0]?.[0] as AbsenceType | null) ?? null;
    return {
      total: calAbsences.length,
      unique: new Set(calAbsences.map((a) => a.userName)).size,
      peakType,
    };
  }, [calAbsences]);

  async function handleAddAbsence() {
    if (!selectedDay) return;
    if (absType === "other" && !absOther.trim()) {
      toast.error("Please specify what 'Other' means");
      return;
    }
    try {
      await createAbsence.mutateAsync({
        date: format(selectedDay, "yyyy-MM-dd"),
        endDate: absEndDate || undefined,
        type: absType,
        title: absTitle.trim() || undefined,
        note: absNote.trim() || undefined,
        otherText: absType === "other" ? absOther.trim() : undefined,
      });
      toast.success(
        absEndDate
          ? `${A[absType].label} marked for ${format(selectedDay, "MMM d")} – ${absEndDate}`
          : `${A[absType].label} marked for ${format(selectedDay, "MMM d")}`,
      );
      setAbsTitle("");
      setAbsNote("");
      setAbsOther("");
      setAbsEndDate("");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to save");
    }
  }

  async function handleDeleteAbsence(id: string) {
    try {
      await deleteAbsence.mutateAsync(id);
      toast.success("Entry removed");
    } catch {
      toast.error("Failed to remove");
    }
  }

  async function handleApprove(id: string) {
    try {
      await approveAbsence.mutateAsync(id);
      toast.success("Absence approved ✓");
    } catch {
      toast.error("Failed to approve");
    }
  }

  async function handleReject(id: string) {
    try {
      await rejectAbsence.mutateAsync({
        id,
        reason: rejectReason.trim() || undefined,
      });
      toast.success("Absence rejected");
      setRejectId(null);
      setRejectReason("");
    } catch {
      toast.error("Failed to reject");
    }
  }

  async function handleProofUpload(id: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    try {
      await uploadProof.mutateAsync({ id, files: Array.from(files) });
      toast.success("Proof uploaded ✓");
      setPendingProofId(null);
    } catch {
      toast.error("Upload failed");
    }
  }

  function ProofAttachments({
    attachments,
  }: {
    attachments: NonNullable<Absence["proofAttachments"]>;
  }) {
    if (!attachments.length) return null;
    return (
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {attachments.map((att, i) => {
          const isImage = att.mimeType?.startsWith("image/");
          return isImage ? (
            <button
              key={i}
              type="button"
              onClick={() =>
                setLightbox({ url: att.url, name: att.originalName })
              }
              className="relative size-12 rounded-lg overflow-hidden border border-border/40 hover:opacity-90 hover:scale-[1.04] transition-all group/att"
            >
              <img
                src={att.url}
                alt={att.originalName}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover/att:bg-black/20 transition-colors flex items-center justify-center">
                <ZoomIn className="size-3.5 text-white opacity-0 group-hover/att:opacity-100 transition-opacity" />
              </div>
            </button>
          ) : (
            <a
              key={i}
              href={att.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-primary hover:underline px-2 py-1 rounded-lg bg-primary/5 border border-primary/10"
            >
              <Paperclip className="size-2.5" />
              {att.originalName.slice(0, 18)}
            </a>
          );
        })}
      </div>
    );
  }

  return (
    <>
      {lightbox && (
        <Dialog
          open
          onOpenChange={(o) => {
            if (!o) setLightbox(null);
          }}
        >
          <DialogContent className="max-w-4xl w-[95vw] max-h-[92vh] p-0 bg-black/90 border-0 overflow-hidden flex items-center justify-center rounded-2xl">
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-3 right-3 z-50 size-8 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
            >
              <X className="size-4" />
            </button>
            <img
              src={lightbox.url}
              alt={lightbox.name}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/50 text-xs truncate max-w-xs">
              {lightbox.name}
            </p>
          </DialogContent>
        </Dialog>
      )}
      <div className="space-y-5">
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border/30">
            {[
              {
                label: "Out This Month",
                value: monthStats.total,
                sub: `${monthStats.unique} people`,
                accent: "text-rose-600 dark:text-rose-400",
              },
              {
                label: "Out Today",
                value: todayAbsences.length,
                sub: todayAbsences.length ? "on leave / absent" : "everyone in",
                accent: todayAbsences.length
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground/60",
              },
              {
                label: "This Week",
                value: upcomingAbsences.length,
                sub: "upcoming absences",
                accent: "text-violet-600 dark:text-violet-400",
              },
              {
                label: "My Schedule",
                value: myMonthAbsences.length,
                sub: `entries in ${format(calMonth, "MMM")}`,
                accent: "text-emerald-600 dark:text-emerald-400",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="flex flex-col gap-1 px-4 sm:px-5 py-4"
              >
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 leading-none">
                  {s.label}
                </p>
                <p
                  className={cn(
                    "text-3xl sm:text-4xl font-black tabular-nums leading-none mt-1",
                    s.accent,
                  )}
                >
                  {s.value}
                </p>
                <p className="text-[10px] text-muted-foreground/50 leading-tight mt-0.5">
                  {s.sub}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7 rounded-xl border border-border/50 bg-card overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/30">
              <div>
                <h2 className="font-black text-base tracking-tight leading-none">
                  {format(calMonth, "MMMM yyyy")}
                </h2>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mt-0.5">
                  Team Calendar · Click a date
                </p>
              </div>
              <div className="flex items-center gap-0.5 border border-border/40 rounded-lg p-0.5 bg-background shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-md"
                  onClick={() =>
                    setCalMonth(new Date(calYear, calMonthNum - 2, 1))
                  }
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 rounded-md text-[11px] font-black"
                  onClick={() => setCalMonth(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-md"
                  onClick={() => setCalMonth(new Date(calYear, calMonthNum, 1))}
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 px-4 py-2.5 border-b border-border/30 bg-muted/20">
              <Select value={calDeptFilter} onValueChange={setCalDeptFilter}>
                <SelectTrigger className="h-7 text-xs w-auto bg-background border-border/40">
                  <Building2 className="size-3 mr-1 text-muted-foreground/60" />
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All Departments
                  </SelectItem>
                  {availableDepts.ordered.map((d) => (
                    <SelectItem key={d.key} value={d.key} className="text-xs">
                      {d.label}
                    </SelectItem>
                  ))}
                  {availableDepts.hasNone && (
                    <SelectItem value="__none__" className="text-xs italic">
                      No Department
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Select value={calTypeFilter} onValueChange={setCalTypeFilter}>
                <SelectTrigger className="h-7 text-xs w-auto bg-background border-border/40">
                  <Filter className="size-3 mr-1 text-muted-foreground/60" />
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All Types
                  </SelectItem>
                  {(
                    Object.entries(A) as [
                      AbsenceType,
                      { label: string; dot: string },
                    ][]
                  ).map(([t, c]) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      <span className="flex items-center gap-2">
                        <span className={cn("size-2 rounded-full", c.dot)} />
                        {c.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(calDeptFilter !== "all" || calTypeFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2 gap-1 text-muted-foreground"
                  onClick={() => {
                    setCalDeptFilter("all");
                    setCalTypeFilter("all");
                  }}
                >
                  <X className="size-3" />
                  Clear
                </Button>
              )}
            </div>

            <div className="px-3 pb-4 pt-3">
              <Calendar
                mode="single"
                month={calMonth}
                onMonthChange={setCalMonth}
                selected={selectedDay ?? undefined}
                onDayClick={(day) =>
                  setSelectedDay(
                    isSameDay(day, selectedDay ?? new Date(0)) ? null : day,
                  )
                }
                showOutsideDays={false}
                hideNavigation
                className="w-full [--cell-size:--spacing(11)] sm:[--cell-size:--spacing(12)] lg:[--cell-size:--spacing(14)]"
                classNames={{ month_caption: "hidden" }}
                components={{
                  DayButton: ({ day, modifiers, ...props }: any) => {
                    const hits = calAbsences.filter((a) =>
                      isSameDay(parseISO(a.date), day.date),
                    );
                    const isSel =
                      selectedDay && isSameDay(day.date, selectedDay);
                    const isToday = isSameDay(day.date, new Date());
                    const isWknd =
                      day.date.getDay() === 0 || day.date.getDay() === 6;
                    // Google-Calendar style — show text labels per absence instead of
                    // avatars: "FirstName Status" (e.g. "Charl Early Out", "Aldana On Day Off").
                    const MAX_LABELS = 3;
                    const typeCounts: Record<string, number> = {};
                    hits.forEach((h) => {
                      typeCounts[h.type] = (typeCounts[h.type] || 0) + 1;
                    });

                    return (
                      <button
                        {...props}
                        className={cn(
                          "relative flex flex-col items-start w-full h-full rounded-xl px-1 pt-1 pb-1 transition-all cursor-pointer select-none overflow-hidden",
                          "hover:bg-primary/8 active:scale-[0.97]",
                          isSel
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "",
                          isToday && !isSel
                            ? "ring-2 ring-primary/50 ring-inset"
                            : "",
                          isWknd && !isSel ? "bg-muted/30" : "",
                          hits.length > 0 && !isSel
                            ? "bg-rose-50/40 dark:bg-rose-950/15"
                            : "",
                          modifiers.outside
                            ? "opacity-0 pointer-events-none"
                            : "",
                        )}
                      >
                        <span
                          className={cn(
                            "text-[11px] font-black leading-none z-10 px-0.5",
                            isToday && !isSel ? "text-primary" : "",
                            isSel ? "text-primary-foreground" : "",
                            isWknd && !isSel ? "text-muted-foreground/60" : "",
                          )}
                        >
                          {day.date.getDate()}
                        </span>
                        {hits.length > 0 && (
                          <div className="flex sm:hidden flex-wrap gap-0.5 mt-1 w-full z-10 justify-start">
                            {hits.slice(0, 4).map((a) => {
                              const cfg = A[a.type as AbsenceType];
                              return (
                                <span
                                  key={a._id}
                                  className={cn("size-1.5 rounded-full shrink-0", cfg?.dot ?? "bg-gray-400")}
                                />
                              );
                            })}
                            {hits.length > 4 && (
                              <span className="text-[7px] font-black leading-none text-muted-foreground/60">
                                +{hits.length - 4}
                              </span>
                            )}
                          </div>
                        )}
                        {hits.length > 0 && (
                          <div className="hidden sm:flex flex-col gap-0.5 mt-1 w-full z-10">
                            {hits.slice(0, MAX_LABELS).map((a) => {
                              const cfg = A[a.type as AbsenceType];
                              const firstName =
                                a.userName.split(/[\s,]+/)[0] || a.userName;
                              const statusLabel =
                                a.type === "other" && a.otherText
                                  ? a.otherText
                                  : (cfg?.label ?? "Absent");
                              const fullLabel = `${firstName} ${statusLabel}`;
                              return (
                                <Tooltip key={a._id}>
                                  <TooltipTrigger asChild>
                                    <span
                                      className={cn(
                                        "block text-[9px] font-bold leading-tight px-1 py-px rounded truncate w-full text-left",
                                        cfg?.pill ??
                                          "bg-gray-200 text-gray-700",
                                      )}
                                    >
                                      {fullLabel}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs">
                                    <p className="font-bold">{a.userName}</p>
                                    <p className="text-muted-foreground">
                                      {statusLabel}
                                    </p>
                                    {a.status === "pending" && (
                                      <p className="text-amber-500 text-[10px] mt-0.5">
                                        Pending approval
                                      </p>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                            {hits.length > MAX_LABELS && (
                              <span
                                className={cn(
                                  "text-[9px] font-bold leading-tight px-1 py-px rounded text-left",
                                  isSel
                                    ? "text-primary-foreground/70 bg-primary-foreground/20"
                                    : "text-muted-foreground bg-muted/60",
                                )}
                              >
                                +{hits.length - MAX_LABELS} more
                              </span>
                            )}
                          </div>
                        )}
                        {hits.length > 0 && !isSel && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 flex overflow-hidden rounded-b-xl">
                            {(
                              Object.entries(typeCounts) as [
                                AbsenceType,
                                number,
                              ][]
                            ).map(([type, count]) => (
                              <div
                                key={type}
                                style={{ flex: count }}
                                className={cn(A[type]?.dot ?? "bg-gray-400")}
                              />
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  },
                }}
              />

              <div className="mt-4 pt-3 border-t border-border/20">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">
                  Legend
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {(
                    Object.entries(A) as [
                      AbsenceType,
                      { label: string; dot: string; pill: string },
                    ][]
                  ).map(([t, c]) => (
                    <button
                      key={t}
                      onClick={() =>
                        setCalTypeFilter(calTypeFilter === t ? "all" : t)
                      }
                      className={cn(
                        "flex items-center gap-1.5 transition-opacity",
                        calTypeFilter !== "all" && calTypeFilter !== t
                          ? "opacity-30"
                          : "",
                      )}
                    >
                      <span className={cn("size-2.5 rounded-full", c.dot)} />
                      <span className="text-[10px] text-muted-foreground/70 font-semibold">
                        {c.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            {upcomingAbsences.length > 0 && (
              <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/30">
                  <Clock className="size-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">
                    Next 7 Days
                  </span>
                  <span className="ml-auto text-[10px] font-black text-violet-600 dark:text-violet-400 tabular-nums">
                    {upcomingAbsences.length}
                  </span>
                </div>
                <div
                  className="overflow-y-auto px-3 py-2.5 space-y-1.5"
                  style={{ maxHeight: 192, scrollbarWidth: "none" }}
                >
                  {upcomingAbsences.map((a) => {
                    const liveAvatar = members.find(
                      (m) => m.name === a.userName,
                    )?.avatar;
                    const cfg = A[a.type as AbsenceType];
                    return (
                      <div
                        key={a._id}
                        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-muted/20 transition-colors"
                      >
                        <Avatar className="size-6 shrink-0">
                          <AvatarImage src={liveAvatar || a.userAvatar} />
                          <AvatarFallback className="text-[9px] font-black">
                            {a.userName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">
                            {a.userName.split(" ")[0]}
                          </p>
                        </div>
                        <span className="text-[10px] text-muted-foreground/60 shrink-0">
                          {format(parseISO(a.date), "EEE d")}
                        </span>
                        <span
                          className={cn(
                            "text-[9px] font-black px-1.5 py-0.5 rounded shrink-0",
                            cfg.pill,
                          )}
                        >
                          {cfg.label}
                        </span>
                        {a.status === "pending" && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 shrink-0">
                            pending
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedDay ? (
              <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
                <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border/30">
                  <div>
                    <h3 className="font-black text-base tracking-tight leading-none">
                      {format(selectedDay, "EEEE")}
                    </h3>
                    <p className="text-sm text-muted-foreground/70 font-semibold mt-0.5">
                      {format(selectedDay, "MMMM d, yyyy")}
                    </p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mt-1">
                      {dayAbsences.length === 0
                        ? "Everyone in"
                        : `${dayAbsences.length} ${dayAbsences.length === 1 ? "person out" : "people out"}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground/40 hover:text-foreground shrink-0 mt-0.5"
                    onClick={() => setSelectedDay(null)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>

                <div className="p-4 space-y-3">
                  {dayAbsences.length > 0 && (
                    <div
                      className="overflow-y-auto space-y-1.5"
                      style={{ maxHeight: 240, scrollbarWidth: "none" }}
                    >
                      {dayAbsences.map((a) => {
                        const cfg = A[a.type as AbsenceType];
                        const canDel = a.userName === userName || isAdmin;
                        const liveAvatar = members.find(
                          (m) => m.name === a.userName,
                        )?.avatar;
                        const isMyAbsence = myUserId && a.userId === myUserId;
                        const canApprove = isAdmin && a.status === "pending";
                        return (
                          <div
                            key={a._id}
                            className={cn(
                              "flex flex-col gap-2 p-3 rounded-xl border",
                              cfg.card,
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <Avatar className="size-8 shrink-0 ring-1 ring-border/30">
                                <AvatarImage src={liveAvatar || a.userAvatar} />
                                <AvatarFallback className="text-xs font-black">
                                  {a.userName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                  <span className="text-xs font-bold">
                                    {a.userName}
                                  </span>
                                  <span
                                    className={cn(
                                      "text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-1",
                                      cfg.pill,
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "size-1.5 rounded-full",
                                        cfg.dot,
                                      )}
                                    />
                                    {cfg.label}
                                    {a.type === "other" && a.otherText
                                      ? ` — ${a.otherText}`
                                      : ""}
                                  </span>
                                  {a.status && a.status !== "approved" && (
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-[9px] px-1.5 py-0 h-4",
                                        a.status === "pending"
                                          ? "border-amber-300 text-amber-700 dark:text-amber-400"
                                          : "border-destructive/40 text-destructive",
                                      )}
                                    >
                                      {a.status}
                                    </Badge>
                                  )}
                                </div>
                                {a.title && (
                                  <p className="text-xs font-semibold">
                                    {a.title}
                                  </p>
                                )}
                                {a.note && (
                                  <p className="text-xs text-muted-foreground/70 italic">
                                    {a.note}
                                  </p>
                                )}
                                {(a.proofAttachments?.length ?? 0) > 0 && (
                                  <ProofAttachments
                                    attachments={a.proofAttachments!}
                                  />
                                )}
                                {a.type === "sick" && isMyAbsence && (
                                  <div className="mt-1.5">
                                    <input
                                      ref={proofInputRef}
                                      type="file"
                                      accept="image/*,.pdf,.doc,.docx"
                                      multiple
                                      className="hidden"
                                      onChange={(e) =>
                                        handleProofUpload(a._id, e.target.files)
                                      }
                                    />
                                    <button
                                      onClick={() => {
                                        setPendingProofId(a._id);
                                        proofInputRef.current?.click();
                                      }}
                                      className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-foreground transition-colors"
                                    >
                                      <Upload className="size-2.5" />
                                      {(a.proofAttachments?.length ?? 0) > 0
                                        ? "Add more proof"
                                        : "Upload proof"}
                                    </button>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0">
                                {canApprove && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                                      title="Approve"
                                      onClick={() => handleApprove(a._id)}
                                      disabled={approveAbsence.isPending}
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-[10px] font-bold text-destructive hover:text-destructive hover:bg-destructive/10"
                                      title="Reject"
                                      onClick={() =>
                                        setRejectId(
                                          rejectId === a._id ? null : a._id,
                                        )
                                      }
                                    >
                                      Reject
                                    </Button>
                                  </>
                                )}
                                {canDel && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 opacity-60 sm:opacity-40 hover:opacity-100 hover:text-destructive"
                                    title="Delete"
                                    onClick={() => handleDeleteAbsence(a._id)}
                                  >
                                    <Trash2 className="size-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            {canApprove && rejectId === a._id && (
                              <div className="flex flex-col gap-1.5 pl-11">
                                <Input
                                  value={rejectReason}
                                  onChange={(e) =>
                                    setRejectReason(e.target.value)
                                  }
                                  placeholder="Reason for rejection (optional)"
                                  className="h-7 text-xs bg-background"
                                />
                                <div className="flex gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs flex-1"
                                    onClick={() => {
                                      setRejectId(null);
                                      setRejectReason("");
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-7 text-xs flex-1"
                                    onClick={() => handleReject(a._id)}
                                    disabled={rejectAbsence.isPending}
                                  >
                                    Confirm Reject
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {dayAbsences.length === 0 && !showAddForm && (
                    <div className="flex items-center gap-2 py-2 text-emerald-600 dark:text-emerald-400">
                      <Check className="size-3.5 shrink-0" />
                      <span className="text-xs font-semibold">
                        Everyone in on this day
                      </span>
                    </div>
                  )}

                  {myDayAbsence ? (
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/30 border border-border/20">
                      <Check className="size-3.5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold">
                          You&apos;re marked out
                        </p>
                        <p className="text-[10px] text-muted-foreground/60">
                          {A[myDayAbsence.type as AbsenceType]?.label}
                          {myDayAbsence.title ? ` — ${myDayAbsence.title}` : ""}
                          {myDayAbsence.status === "pending" &&
                            " · pending approval"}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:text-destructive gap-1 shrink-0"
                        onClick={() => handleDeleteAbsence(myDayAbsence._id)}
                      >
                        <Trash2 className="size-3" />
                        Remove
                      </Button>
                    </div>
                  ) : showAddForm ? (
                    <div className="rounded-xl border border-border/30 bg-muted/20 p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black tracking-tight">
                          Mark {format(selectedDay, "MMM d")} as out
                        </p>
                        <button
                          onClick={() => setShowAddForm(false)}
                          className="text-muted-foreground/40 hover:text-foreground"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                      <Input
                        value={absTitle}
                        onChange={(e) => setAbsTitle(e.target.value)}
                        placeholder="Title (optional)"
                        className="h-8 text-xs bg-background border-border/50"
                        maxLength={100}
                      />
                      <div className="grid grid-cols-2 gap-1.5">
                        {(
                          Object.entries(A) as [
                            AbsenceType,
                            { label: string; dot: string; pill: string },
                          ][]
                        ).map(([t, c]) => (
                          <button
                            key={t}
                            onClick={() => setAbsType(t)}
                            className={cn(
                              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all text-left",
                              absType === t
                                ? cn(c.pill, "border-current shadow-sm")
                                : "border-border/40 text-muted-foreground hover:border-border/70 bg-background",
                            )}
                          >
                            <span
                              className={cn(
                                "size-1.5 rounded-full shrink-0",
                                c.dot,
                              )}
                            />
                            {c.label}
                          </button>
                        ))}
                      </div>
                      {absType === "other" && (
                        <Input
                          value={absOther}
                          onChange={(e) => setAbsOther(e.target.value)}
                          placeholder="Please specify…"
                          className="h-8 text-xs bg-background border-amber-300/50"
                          maxLength={200}
                        />
                      )}
                      {/* Multi-day range */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 space-y-0.5">
                          <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">
                            End Date
                          </label>
                          <Input
                            type="date"
                            value={absEndDate}
                            min={format(selectedDay, "yyyy-MM-dd")}
                            onChange={(e) => setAbsEndDate(e.target.value)}
                            className="h-8 text-xs bg-background border-border/50"
                          />
                        </div>
                        {absEndDate && (
                          <button
                            className="mt-4 text-muted-foreground/40 hover:text-foreground"
                            onClick={() => setAbsEndDate("")}
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-[9px] text-muted-foreground/40">
                        Leave End Date empty for a single day
                      </p>
                      <Textarea
                        value={absNote}
                        onChange={(e) => setAbsNote(e.target.value)}
                        placeholder="Note for your team (optional)"
                        className="text-xs resize-none h-14 bg-background border-border/50"
                        maxLength={500}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 flex-1 text-xs"
                          onClick={() => setShowAddForm(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 flex-1 text-xs gap-1"
                          onClick={handleAddAbsence}
                          disabled={createAbsence.isPending}
                        >
                          <Plus className="size-3" />
                          {createAbsence.isPending ? "Saving…" : "Add"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs gap-1.5 border-dashed"
                      onClick={() => setShowAddForm(true)}
                    >
                      <Plus className="size-3.5" />
                      Mark this day as out
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/30 bg-card/50 flex flex-col items-center justify-center py-10 text-center px-6">
                <div className="size-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center mb-3">
                  <CalendarDays className="size-4.5 text-primary/60" />
                </div>
                <p className="font-black text-sm">Select a date</p>
                <p className="text-[11px] text-muted-foreground/50 mt-1 leading-relaxed max-w-48">
                  Click any date on the calendar to view entries or mark your
                  availability.
                </p>
              </div>
            )}

            {myMonthAbsences.length > 0 && (
              <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/30">
                  <TrendingUp className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">
                    My Schedule · {format(calMonth, "MMM yyyy")}
                  </span>
                  <span className="ml-auto text-[10px] font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {myMonthAbsences.length}
                  </span>
                </div>
                <div
                  className="overflow-y-auto px-3 py-2 space-y-0.5"
                  style={{ maxHeight: 200, scrollbarWidth: "none" }}
                >
                  {myMonthAbsences.map((a) => {
                    const cfg = A[a.type as AbsenceType];
                    return (
                      <div
                        key={a._id}
                        className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-muted/30 group/e transition-colors"
                      >
                        <span
                          className={cn(
                            "size-2 rounded-full shrink-0",
                            cfg.dot,
                          )}
                        />
                        <span className="text-xs font-bold tabular-nums">
                          {format(parseISO(a.date), "MMM d")}
                        </span>
                        <span
                          className={cn(
                            "text-[9px] font-black px-1.5 py-0.5 rounded shrink-0",
                            cfg.pill,
                          )}
                        >
                          {cfg.label}
                        </span>
                        {a.status === "pending" && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 shrink-0">
                            pending
                          </span>
                        )}
                        {a.title && (
                          <span className="text-xs text-muted-foreground/70 flex-1 truncate">
                            {a.title}
                          </span>
                        )}
                        {!a.title && a.note && (
                          <span className="text-xs text-muted-foreground/50 flex-1 truncate italic">
                            {a.note}
                          </span>
                        )}
                        {!a.title && !a.note && <span className="flex-1" />}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 opacity-100 sm:opacity-0 sm:group-hover/e:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
                          onClick={() => handleDeleteAbsence(a._id)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

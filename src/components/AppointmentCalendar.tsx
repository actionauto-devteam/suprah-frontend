"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Appointment } from "@/types/appointment"
import { cn } from "@/lib/utils"
import {
  ChevronLeft, ChevronRight, Plus, CalendarDays, Clock, MapPin,
} from "lucide-react"
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth,
  addMonths, subMonths, startOfWeek, endOfWeek, isToday,
} from "date-fns"

// ─── Props ────────────────────────────────────────────────────────────────────

interface AppointmentCalendarProps {
  appointments: Appointment[]
  viewDate: Date
  onViewDateChange: (date: Date) => void
  onCreateAppointment: (date?: Date) => void
  onSelectAppointment: (appointment: Appointment) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeDate(value: unknown): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value as string)
  return isNaN(d.getTime()) ? null : d
}

function appointmentIsOnDay(apt: Appointment, day: Date): boolean {
  const start = safeDate(apt.startTime)
  if (!start) return false
  return (
    start.getFullYear() === day.getFullYear() &&
    start.getMonth() === day.getMonth() &&
    start.getDate() === day.getDate()
  )
}

function countInMonth(appointments: Appointment[], month: Date): number {
  return appointments.filter((apt) => {
    const d = safeDate(apt.startTime)
    return d !== null && isSameMonth(d, month)
  }).length
}

function deriveTargetMonth(appointments: Appointment[], todayDate: Date): Date | null {
  if (appointments.length === 0) return null
  const thisMonth = startOfMonth(todayDate)
  if (countInMonth(appointments, thisMonth) > 0) return null

  const validDates = appointments
    .map((apt) => safeDate(apt.startTime))
    .filter((d): d is Date => d !== null)

  const futureDates = validDates.filter((d) => d >= todayDate).sort((a, b) => a.getTime() - b.getTime())
  if (futureDates.length > 0) return startOfMonth(futureDates[0])

  const pastDates = validDates.sort((a, b) => b.getTime() - a.getTime())
  if (pastDates.length > 0) return startOfMonth(pastDates[0])

  return null
}

// ─── Entry-type accent palette ────────────────────────────────────────────────

const ENTRY_STYLES: Record<string, { chip: string; dot: string; popover: string }> = {
  appointment: {
    chip: "bg-violet-500/15 text-violet-800 dark:text-violet-300 border-l-2 border-violet-500 hover:bg-violet-500/25",
    dot: "bg-violet-500",
    popover: "bg-violet-500/10 text-violet-800 dark:text-violet-200 border-violet-500/25",
  },
  event: {
    chip: "bg-blue-500/15 text-blue-800 dark:text-blue-300 border-l-2 border-blue-500 hover:bg-blue-500/25",
    dot: "bg-blue-500",
    popover: "bg-blue-500/10 text-blue-800 dark:text-blue-200 border-blue-500/25",
  },
  task: {
    chip: "bg-orange-500/15 text-orange-800 dark:text-orange-300 border-l-2 border-orange-500 hover:bg-orange-500/25",
    dot: "bg-orange-500",
    popover: "bg-orange-500/10 text-orange-800 dark:text-orange-200 border-orange-500/25",
  },
  reminder: {
    chip: "bg-pink-500/15 text-pink-800 dark:text-pink-300 border-l-2 border-pink-500 hover:bg-pink-500/25",
    dot: "bg-pink-500",
    popover: "bg-pink-500/10 text-pink-800 dark:text-pink-200 border-pink-500/25",
  },
}

const DEFAULT_STYLE = {
  chip: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-l-2 border-emerald-500 hover:bg-emerald-500/25",
  dot: "bg-emerald-500",
  popover: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border-emerald-500/25",
}

function getEntryStyle(entryType: string) {
  return ENTRY_STYLES[entryType] ?? DEFAULT_STYLE
}

// ─── Event chip (compact, inside a day cell) ──────────────────────────────────

function EventChip({ apt, onClick }: { apt: Appointment; onClick: () => void }) {
  const start = safeDate(apt.startTime)
  const style = getEntryStyle(apt.entryType)

  return (
    <button
      className={cn(
        "w-full rounded-[3px] px-1 sm:px-1.5 py-0.5 text-left text-[9px] sm:text-[10px] leading-tight transition-all active:scale-[0.97]",
        style.chip
      )}
      onClick={(e) => { e.stopPropagation(); onClick() }}
      title={apt.title}
    >
      {start && <span className="font-bold mr-0.5 sm:mr-1 opacity-80 hidden sm:inline">{format(start, "h:mma")}</span>}
      <span className="truncate block font-medium">{apt.title}</span>
    </button>
  )
}

// ─── Day cell ─────────────────────────────────────────────────────────────────

interface DayCellProps {
  day: Date
  inCurrentMonth: boolean
  dayAppointments: Appointment[]
  onAddAppointment: (day: Date) => void
  onSelectAppointment: (apt: Appointment) => void
}

function DayCell({ day, inCurrentMonth, dayAppointments, onAddAppointment, onSelectAppointment }: DayCellProps) {
  const todayFlag = isToday(day)
  const visible = dayAppointments.slice(0, 3)
  const overflow = dayAppointments.length - visible.length

  return (
    <div
      className={cn(
        "group relative flex flex-col min-h-18 sm:min-h-28 rounded-md sm:rounded-lg border p-1 sm:p-2 transition-colors",
        inCurrentMonth
          ? todayFlag
            ? "bg-primary/5 border-primary/40 dark:border-primary/30"
            : "bg-card border-border hover:bg-accent/30"
          : "bg-muted/20 border-border/50 opacity-40 pointer-events-none"
      )}
    >
      {/* Day number */}
      <div className="mb-0.5 sm:mb-1 flex items-center justify-between gap-1">
        <div className={cn(
          "flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full text-[10px] sm:text-xs font-medium transition-colors",
          todayFlag
            ? "bg-primary text-primary-foreground font-bold shadow-sm"
            : "text-foreground/70"
        )}>
          {format(day, "d")}
        </div>

        {inCurrentMonth && (
          <button
            className="invisible group-hover:visible flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            onClick={(e) => { e.stopPropagation(); onAddAppointment(day) }}
            title="Add appointment"
            tabIndex={-1}
          >
            <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          </button>
        )}
      </div>

      {/* Event chips */}
      <div className="space-y-0.5 flex-1">
        {visible.map((apt) => (
          <EventChip key={apt._id} apt={apt} onClick={() => onSelectAppointment(apt)} />
        ))}

        {overflow > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="w-full rounded px-1.5 py-0.5 text-left text-[10px] font-semibold text-primary/70 transition-colors hover:bg-primary/10 hover:text-primary"
                onClick={(e) => e.stopPropagation()}
              >
                +{overflow} more
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 shadow-2xl border-border" align="start" side="right">
              {/* Popover header */}
              <div className="px-4 py-3 border-b bg-muted/30">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  {format(day, "EEEE, MMM do")}
                </p>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/25 text-[10px]">
                  {dayAppointments.length} events
                </Badge>
              </div>

              {/* Popover list */}
              <div className="p-2 space-y-1.5 max-h-87.5 overflow-y-auto [scrollbar-width:thin]">
                {dayAppointments.map((apt) => {
                  const start = safeDate(apt.startTime)
                  const end = safeDate(apt.endTime)
                  const style = getEntryStyle(apt.entryType)
                  return (
                    <button
                      key={apt._id}
                      className={cn(
                        "w-full rounded-xl border p-3 text-left transition-all hover:scale-[1.01] hover:shadow-md active:scale-[0.99]",
                        style.popover
                      )}
                      onClick={(e) => { e.stopPropagation(); onSelectAppointment(apt) }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div>
                          <div className="flex items-center gap-1 text-[10px] font-bold opacity-60 mb-0.5">
                            <Clock className="size-3" />
                            {start ? format(start, "h:mm a") : ""}
                            {end && ` – ${format(end, "h:mm a")}`}
                          </div>
                          <span className="font-bold text-sm leading-tight line-clamp-2">{apt.title}</span>
                        </div>
                        <span className="shrink-0 rounded border bg-white/20 dark:bg-black/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                          {apt.entryType}
                        </span>
                      </div>
                      {apt.location && (
                        <div className="flex items-center gap-1 text-[10px] opacity-60 mt-1 truncate">
                          <MapPin className="size-3 shrink-0" />
                          {apt.location}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  )
}

// ─── Nav month button ─────────────────────────────────────────────────────────

function NavButton({
  direction, count, label, onClick,
}: {
  direction: "prev" | "next"
  count: number
  label: string
  onClick: () => void
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="relative gap-1 px-2.5 h-8"
      onClick={onClick}
      title={count > 0 ? `${label} has ${count} event${count !== 1 ? "s" : ""}` : label}
    >
      {direction === "prev" && <ChevronLeft className="size-4" />}
      {count > 0 && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground tabular-nums">
          {count > 9 ? "9+" : count}
        </span>
      )}
      {direction === "next" && <ChevronRight className="size-4" />}
    </Button>
  )
}

// ─── Jump to nearest ──────────────────────────────────────────────────────────

function JumpToNearestButton({
  appointments, onNavigate,
}: {
  appointments: Appointment[]
  onNavigate: (month: Date) => void
}) {
  const todayDate = new Date()

  const nearest = React.useMemo(() => {
    const validWithDates = appointments
      .map((apt) => ({ apt, d: safeDate(apt.startTime) }))
      .filter((x): x is { apt: Appointment; d: Date } => x.d !== null)

    const future = validWithDates
      .filter(({ d, apt }) => d >= todayDate && apt.status !== "cancelled")
      .sort((a, b) => a.d.getTime() - b.d.getTime())[0]

    if (future) return { date: future.d, label: "Jump to next upcoming event" }

    const past = validWithDates.sort((a, b) => b.d.getTime() - a.d.getTime())[0]
    if (past) return { date: past.d, label: "Jump to most recent event" }

    return null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments])

  if (!nearest) return null

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => onNavigate(startOfMonth(nearest.date))}
    >
      {nearest.label} ({format(nearest.date, "MMM yyyy")})
    </Button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AppointmentCalendar({
  appointments,
  viewDate,
  onViewDateChange,
  onCreateAppointment,
  onSelectAppointment,
}: AppointmentCalendarProps) {
  const [todayDate] = React.useState(() => new Date())
  const lastAutoNavCountRef = React.useRef<number>(-1)

  React.useEffect(() => {
    if (appointments.length === lastAutoNavCountRef.current) return
    if (appointments.length === 0) return
    const wasEmpty = lastAutoNavCountRef.current <= 0
    lastAutoNavCountRef.current = appointments.length
    if (!wasEmpty) return
    const target = deriveTargetMonth(appointments, todayDate)
    if (target) onViewDateChange(target)
  }, [appointments, todayDate, onViewDateChange])

  const monthStart = startOfMonth(viewDate)
  const monthEnd = endOfMonth(viewDate)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  const currentMonth = viewDate

  const monthlyCount = React.useMemo(() => countInMonth(appointments, currentMonth), [appointments, currentMonth])
  const prevCount = React.useMemo(() => countInMonth(appointments, subMonths(currentMonth, 1)), [appointments, currentMonth])
  const nextCount = React.useMemo(() => countInMonth(appointments, addMonths(currentMonth, 1)), [appointments, currentMonth])

  const getAppointmentsForDay = (day: Date): Appointment[] =>
    appointments.filter((apt) => appointmentIsOnDay(apt, day))

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">

      {/* ── Calendar header ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 py-3 sm:py-4 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2 min-w-0">
          <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-primary" />
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <h2 className="text-base sm:text-lg font-bold tracking-tight truncate">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            {monthlyCount > 0 ? (
              <Badge variant="secondary" className="tabular-nums text-xs shrink-0">
                {monthlyCount} event{monthlyCount !== 1 ? "s" : ""}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground shrink-0 hidden sm:inline-flex">
                No events
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <NavButton
            direction="prev"
            count={prevCount}
            label={format(subMonths(currentMonth, 1), "MMMM yyyy")}
            onClick={() => onViewDateChange(subMonths(currentMonth, 1))}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 sm:px-3 text-xs font-semibold"
            onClick={() => onViewDateChange(startOfMonth(todayDate))}
          >
            Today
          </Button>
          <NavButton
            direction="next"
            count={nextCount}
            label={format(addMonths(currentMonth, 1), "MMMM yyyy")}
            onClick={() => onViewDateChange(addMonths(currentMonth, 1))}
          />
        </div>
      </div>

      {/* ── Calendar grid ── */}
      <div className="p-2 sm:p-4">
        <div className="overflow-x-auto">
          <div className="grid min-w-[320px] sm:min-w-0 grid-cols-7 gap-0.5 sm:gap-1.5">

            {/* Weekday headers */}
            {[["Sun", "S"], ["Mon", "M"], ["Tue", "T"], ["Wed", "W"], ["Thu", "T"], ["Fri", "F"], ["Sat", "S"]].map(([full, short]) => (
              <div
                key={full}
                className="py-1.5 text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
              >
                <span className="hidden sm:inline">{full}</span>
                <span className="sm:hidden">{short}</span>
              </div>
            ))}

            {/* Day cells */}
            {days.map((day) => (
              <DayCell
                key={day.toISOString()}
                day={day}
                inCurrentMonth={isSameMonth(day, currentMonth)}
                dayAppointments={getAppointmentsForDay(day)}
                onAddAppointment={onCreateAppointment}
                onSelectAppointment={onSelectAppointment}
              />
            ))}
          </div>
        </div>

        {/* No events in this month but has events elsewhere */}
        {monthlyCount === 0 && appointments.length > 0 && (
          <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-muted-foreground/25 py-10 text-center text-muted-foreground">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <CalendarDays className="h-6 w-6 opacity-50" />
            </div>
            <div>
              <p className="font-semibold text-foreground/70">No events in {format(currentMonth, "MMMM yyyy")}</p>
              <p className="mt-1 text-sm opacity-70 max-w-xs">
                You have {appointments.length.toLocaleString()} appointment
                {appointments.length !== 1 ? "s" : ""} across other months.
                The numbered badges on the arrows indicate months with events.
              </p>
            </div>
            <JumpToNearestButton appointments={appointments} onNavigate={onViewDateChange} />
          </div>
        )}
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-2.5 bg-muted/10">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-1">Type</span>
        {[
          { label: "Appointment", style: ENTRY_STYLES.appointment },
          { label: "Event", style: ENTRY_STYLES.event },
          { label: "Task", style: ENTRY_STYLES.task },
          { label: "Reminder", style: ENTRY_STYLES.reminder },
        ].map(({ label, style }) => (
          <div key={label} className="flex items-center gap-1">
            <span className={cn("h-2 w-2 rounded-full shrink-0", style.dot)} />
            <span className="text-[11px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

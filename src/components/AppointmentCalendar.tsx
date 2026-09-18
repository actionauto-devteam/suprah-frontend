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
  addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays,
} from "date-fns"
import { fmtTimeMDT, fmtMonthYearMDT, mdtDateKey, mdtMonthKey, mdtCalendarDate, todayStrMDT, MDT_TZ } from "@/lib/timezone"
import { ENTRY_TYPE_CONFIG as ENTRY_STYLES, getEntryTypeStyle as getEntryStyle } from "@/lib/appointmentStatus"
import { useIsMobile } from "@/hooks/use-mobile"

export type CalendarViewMode = "month" | "week" | "day" | "agenda"

// ─── Props ────────────────────────────────────────────────────────────────────

interface AppointmentCalendarProps {
  appointments: Appointment[]
  viewDate: Date
  onViewDateChange: (date: Date) => void
  onCreateAppointment: (date?: Date) => void
  onSelectAppointment: (appointment: Appointment) => void
  viewMode?: CalendarViewMode
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
  return mdtDateKey(start) === format(day, "yyyy-MM-dd")
}

function countInMonth(appointments: Appointment[], month: Date): number {
  const key = format(month, "yyyy-MM")
  return appointments.filter((apt) => {
    const d = safeDate(apt.startTime)
    return d !== null && mdtMonthKey(d) === key
  }).length
}

function countInDayRange(appointments: Appointment[], days: Date[]): number {
  return appointments.filter((apt) => days.some((day) => appointmentIsOnDay(apt, day))).length
}

function deriveTargetMonth(appointments: Appointment[], todayDate: Date): Date | null {
  if (appointments.length === 0) return null
  const thisMonthKey = mdtMonthKey(todayDate)
  const hasThisMonth = appointments.some((apt) => {
    const d = safeDate(apt.startTime)
    return d !== null && mdtMonthKey(d) === thisMonthKey
  })
  if (hasThisMonth) return null

  const validDates = appointments
    .map((apt) => safeDate(apt.startTime))
    .filter((d): d is Date => d !== null)

  const futureDates = validDates.filter((d) => d >= todayDate).sort((a, b) => a.getTime() - b.getTime())
  if (futureDates.length > 0) return startOfMonth(mdtCalendarDate(futureDates[0]))

  const pastDates = validDates.sort((a, b) => b.getTime() - a.getTime())
  if (pastDates.length > 0) return startOfMonth(mdtCalendarDate(pastDates[0]))

  return null
}

function mdtHourMinute(v: Date | string): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MDT_TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(typeof v === "string" ? new Date(v) : v)
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0)
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0)
  return { hour, minute }
}

function minutesSinceMidnightMDT(v: Date): number {
  const { hour, minute } = mdtHourMinute(v)
  return hour * 60 + minute
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
      {start && <span className="font-bold mr-0.5 sm:mr-1 opacity-80 hidden sm:inline">{fmtTimeMDT(start)}</span>}
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
  todayKeyMDT: string
}

function DayCell({ day, inCurrentMonth, dayAppointments, onAddAppointment, onSelectAppointment, todayKeyMDT }: DayCellProps) {
  const todayFlag = format(day, "yyyy-MM-dd") === todayKeyMDT
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
            className="hidden sm:invisible sm:flex sm:h-5 sm:w-5 sm:items-center sm:justify-center sm:rounded sm:text-muted-foreground sm:transition-colors sm:hover:bg-primary/10 sm:hover:text-primary sm:group-hover:visible"
            onClick={(e) => { e.stopPropagation(); onAddAppointment(day) }}
            title="Add appointment"
            aria-label={`Add appointment on ${format(day, "MMMM d")}`}
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Event chips */}
      <div className="space-y-0.5 flex-1 pb-6 sm:pb-0">
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
                            {start ? fmtTimeMDT(start) : ""}
                            {end && ` – ${fmtTimeMDT(end)}`}
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

      {inCurrentMonth && (
        <button
          className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm ring-1 ring-border/60 transition-colors active:scale-95 hover:bg-primary/10 hover:text-primary sm:hidden"
          onClick={(e) => { e.stopPropagation(); onAddAppointment(day) }}
          title="Add appointment"
          aria-label={`Add appointment on ${format(day, "MMMM d")}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

const HOUR_HEIGHT = 56
const GRID_START_HOUR = 0
const GRID_END_HOUR = 24
const DEFAULT_SCROLL_HOUR = 7
const HOUR_LABELS = Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) => GRID_START_HOUR + i)

function formatHourLabel(hour: number): string {
  if (hour === 0) return "12 AM"
  if (hour < 12) return `${hour} AM`
  if (hour === 12) return "12 PM"
  return `${hour - 12} PM`
}

function HourRows() {
  return (
    <>
      {HOUR_LABELS.map((hour) => (
        <div key={hour} className="border-t border-border/50" style={{ height: HOUR_HEIGHT }} />
      ))}
    </>
  )
}

function HourLabelColumn() {
  return (
    <div className="relative" style={{ height: HOUR_HEIGHT * HOUR_LABELS.length }}>
      {HOUR_LABELS.map((hour) => (
        <div
          key={hour}
          className="absolute -translate-y-1/2 right-1.5 whitespace-nowrap text-[10px] text-muted-foreground"
          style={{ top: hour * HOUR_HEIGHT }}
        >
          {formatHourLabel(hour)}
        </div>
      ))}
    </div>
  )
}

function TimeGridEvent({ apt, onClick }: { apt: Appointment; onClick: () => void }) {
  const start = safeDate(apt.startTime)
  const end = safeDate(apt.endTime)
  if (!start) return null

  const style = getEntryStyle(apt.entryType)
  const startMin = minutesSinceMidnightMDT(start)
  const endMin = end ? minutesSinceMidnightMDT(end) : startMin + 30
  const durationMin = Math.max(endMin - startMin, 20)
  const top = (startMin / 60) * HOUR_HEIGHT
  const height = Math.max((durationMin / 60) * HOUR_HEIGHT, 18)

  return (
    <button
      className={cn(
        "absolute left-0.5 right-0.5 sm:left-1 sm:right-1 overflow-hidden rounded-md border-l-2 px-1.5 py-0.5 text-left text-[10px] leading-tight transition-all hover:z-10 hover:shadow-md active:scale-[0.98]",
        style.chip
      )}
      style={{ top, height }}
      onClick={(e) => { e.stopPropagation(); onClick() }}
      title={apt.title}
    >
      <span className="font-bold block truncate">{fmtTimeMDT(start)}</span>
      <span className="truncate block">{apt.title}</span>
    </button>
  )
}

function DayTimeColumn({
  day, appointments, onSelectAppointment, onAddAppointment,
}: {
  day: Date
  appointments: Appointment[]
  onSelectAppointment: (apt: Appointment) => void
  onAddAppointment: (day: Date) => void
}) {
  const dayAppointments = appointments.filter((apt) => appointmentIsOnDay(apt, day))
  const totalHeight = HOUR_HEIGHT * HOUR_LABELS.length

  return (
    <div
      className="relative"
      style={{ height: totalHeight }}
      onClick={() => onAddAppointment(day)}
    >
      <HourRows />
      {dayAppointments.map((apt) => (
        <TimeGridEvent key={apt._id} apt={apt} onClick={() => onSelectAppointment(apt)} />
      ))}
    </div>
  )
}

function DayView({
  day, appointments, onSelectAppointment, onAddAppointment,
}: {
  day: Date
  appointments: Appointment[]
  onSelectAppointment: (apt: Appointment) => void
  onAddAppointment: (day: Date) => void
}) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null)
  const dayAppointments = appointments.filter((apt) => appointmentIsOnDay(apt, day))

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: Math.max(DEFAULT_SCROLL_HOUR * HOUR_HEIGHT - 40, 0) })
  }, [day])

  return (
    <div className="p-2 sm:p-4">
      {dayAppointments.length === 0 && (
        <div className="mb-3 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onAddAppointment(day)}>
            <Plus className="size-3.5 mr-1" /> Add appointment
          </Button>
        </div>
      )}

      <div ref={scrollRef} className="relative flex overflow-y-auto rounded-lg border" style={{ maxHeight: 560 }}>
        <div className="w-14 sm:w-16 shrink-0 border-r bg-muted/10">
          <HourLabelColumn />
        </div>
        <div className="flex-1">
          <DayTimeColumn
            day={day}
            appointments={appointments}
            onSelectAppointment={onSelectAppointment}
            onAddAppointment={onAddAppointment}
          />
        </div>
      </div>

      {dayAppointments.length === 0 && (
        <p className="mt-3 text-center text-xs text-muted-foreground">No appointments on this day.</p>
      )}
    </div>
  )
}

function WeekView({
  weekStart, appointments, onSelectAppointment, onAddAppointment, todayKeyMDT, isMobile,
}: {
  weekStart: Date
  appointments: Appointment[]
  onSelectAppointment: (apt: Appointment) => void
  onAddAppointment: (day: Date) => void
  todayKeyMDT: string
  isMobile: boolean
}) {
  const days = React.useMemo(
    () => eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart) }),
    [weekStart]
  )

  const scrollRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (isMobile) return
    scrollRef.current?.scrollTo({ top: Math.max(DEFAULT_SCROLL_HOUR * HOUR_HEIGHT - 40, 0) })
  }, [weekStart, isMobile])

  if (isMobile) {
    return (
      <AgendaList
        days={days}
        appointments={appointments}
        onSelectAppointment={onSelectAppointment}
        onAddAppointment={onAddAppointment}
        todayKeyMDT={todayKeyMDT}
      />
    )
  }

  return (
    <div className="p-2 sm:p-4">
      <div ref={scrollRef} className="relative overflow-auto rounded-lg border" style={{ maxHeight: 560 }}>
        <div className="flex min-w-[720px]">
          <div className="w-14 sm:w-16 shrink-0 border-r bg-muted/10 sticky left-0 z-10">
            <div className="h-12 border-b bg-card" />
            <HourLabelColumn />
          </div>

          {days.map((day) => {
            const isToday = format(day, "yyyy-MM-dd") === todayKeyMDT
            return (
              <div key={day.toISOString()} className="min-w-24 flex-1 border-r last:border-r-0">
                <div className={cn(
                  "flex h-12 flex-col items-center justify-center border-b",
                  isToday ? "bg-primary/5" : "bg-card"
                )}>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {format(day, "EEE")}
                  </span>
                  <span className={cn("text-sm font-semibold", isToday && "text-primary")}>
                    {format(day, "d")}
                  </span>
                </div>
                <DayTimeColumn
                  day={day}
                  appointments={appointments}
                  onSelectAppointment={onSelectAppointment}
                  onAddAppointment={onAddAppointment}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function AgendaList({
  days, appointments, onSelectAppointment, onAddAppointment, todayKeyMDT,
}: {
  days: Date[]
  appointments: Appointment[]
  onSelectAppointment: (apt: Appointment) => void
  onAddAppointment: (day: Date) => void
  todayKeyMDT: string
}) {
  return (
    <div className="p-2 sm:p-4 space-y-3">
      {days.map((day) => {
        const dayAppointments = appointments
          .filter((apt) => appointmentIsOnDay(apt, day))
          .sort((a, b) => {
            const aStart = safeDate(a.startTime)?.getTime() ?? 0
            const bStart = safeDate(b.startTime)?.getTime() ?? 0
            return aStart - bStart
          })
        const isToday = format(day, "yyyy-MM-dd") === todayKeyMDT

        return (
          <div key={day.toISOString()} className="overflow-hidden rounded-lg border">
            <div className={cn(
              "flex items-center justify-between px-3 py-2 border-b",
              isToday ? "bg-primary/5" : "bg-muted/20"
            )}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {format(day, "EEEE")}
                </span>
                <span className={cn("text-sm font-semibold", isToday && "text-primary")}>
                  {format(day, "MMM d")}
                </span>
              </div>
              <button
                className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                onClick={() => onAddAppointment(day)}
                title="Add appointment"
                aria-label={`Add appointment on ${format(day, "MMMM d")}`}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {dayAppointments.length === 0 ? (
              <p className="px-3 py-3 text-xs text-muted-foreground">No appointments</p>
            ) : (
              <div className="divide-y divide-border/60">
                {dayAppointments.map((apt) => {
                  const start = safeDate(apt.startTime)
                  const style = getEntryStyle(apt.entryType)
                  return (
                    <button
                      key={apt._id}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/30"
                      onClick={() => onSelectAppointment(apt)}
                    >
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", style.dot)} />
                      <span className="w-16 shrink-0 text-xs font-semibold text-muted-foreground">
                        {start ? fmtTimeMDT(start) : ""}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{apt.title}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
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
      className="relative gap-1 px-2.5 h-9"
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
      {nearest.label} ({fmtMonthYearMDT(nearest.date)})
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
  viewMode = "month",
}: AppointmentCalendarProps) {
  const [todayDate] = React.useState(() => new Date())
  const todayKeyMDT = todayStrMDT()
  const lastAutoNavCountRef = React.useRef<number>(-1)
  const isMobile = useIsMobile()

  React.useEffect(() => {
    if (viewMode !== "month") return
    if (appointments.length === lastAutoNavCountRef.current) return
    if (appointments.length === 0) return
    const wasEmpty = lastAutoNavCountRef.current <= 0
    lastAutoNavCountRef.current = appointments.length
    if (!wasEmpty) return
    const target = deriveTargetMonth(appointments, todayDate)
    if (target) onViewDateChange(target)
  }, [appointments, todayDate, onViewDateChange, viewMode])

  const currentMonth = viewDate

  const monthStart = startOfMonth(viewDate)
  const monthEnd = endOfMonth(viewDate)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)
  const monthDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const getAppointmentsForDay = (day: Date): Appointment[] =>
    appointments.filter((apt) => appointmentIsOnDay(apt, day))

  const weekStart = startOfWeek(viewDate)
  const weekDays = React.useMemo(
    () => eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart) }),
    [weekStart]
  )

  const periodInfo = React.useMemo(() => {
    switch (viewMode) {
      case "week":
        return {
          title: `${format(weekStart, "MMM d")} – ${format(endOfWeek(weekStart), "MMM d, yyyy")}`,
          count: countInDayRange(appointments, weekDays),
          prevCount: countInDayRange(appointments, eachDayOfInterval({ start: startOfWeek(subWeeks(viewDate, 1)), end: endOfWeek(subWeeks(viewDate, 1)) })),
          nextCount: countInDayRange(appointments, eachDayOfInterval({ start: startOfWeek(addWeeks(viewDate, 1)), end: endOfWeek(addWeeks(viewDate, 1)) })),
          prevLabel: "Previous week",
          nextLabel: "Next week",
          onPrev: () => onViewDateChange(subWeeks(viewDate, 1)),
          onNext: () => onViewDateChange(addWeeks(viewDate, 1)),
        }
      case "day":
        return {
          title: format(viewDate, "EEEE, MMMM d, yyyy"),
          count: countInDayRange(appointments, [viewDate]),
          prevCount: countInDayRange(appointments, [subDays(viewDate, 1)]),
          nextCount: countInDayRange(appointments, [addDays(viewDate, 1)]),
          prevLabel: format(subDays(viewDate, 1), "EEE, MMM d"),
          nextLabel: format(addDays(viewDate, 1), "EEE, MMM d"),
          onPrev: () => onViewDateChange(subDays(viewDate, 1)),
          onNext: () => onViewDateChange(addDays(viewDate, 1)),
        }
      case "agenda":
        return {
          title: `${format(weekStart, "MMM d")} – ${format(endOfWeek(weekStart), "MMM d, yyyy")}`,
          count: countInDayRange(appointments, weekDays),
          prevCount: countInDayRange(appointments, eachDayOfInterval({ start: startOfWeek(subWeeks(viewDate, 1)), end: endOfWeek(subWeeks(viewDate, 1)) })),
          nextCount: countInDayRange(appointments, eachDayOfInterval({ start: startOfWeek(addWeeks(viewDate, 1)), end: endOfWeek(addWeeks(viewDate, 1)) })),
          prevLabel: "Previous week",
          nextLabel: "Next week",
          onPrev: () => onViewDateChange(subWeeks(viewDate, 1)),
          onNext: () => onViewDateChange(addWeeks(viewDate, 1)),
        }
      case "month":
      default:
        return {
          title: format(currentMonth, "MMMM yyyy"),
          count: countInMonth(appointments, currentMonth),
          prevCount: countInMonth(appointments, subMonths(currentMonth, 1)),
          nextCount: countInMonth(appointments, addMonths(currentMonth, 1)),
          prevLabel: format(subMonths(currentMonth, 1), "MMMM yyyy"),
          nextLabel: format(addMonths(currentMonth, 1), "MMMM yyyy"),
          onPrev: () => onViewDateChange(subMonths(currentMonth, 1)),
          onNext: () => onViewDateChange(addMonths(currentMonth, 1)),
        }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, viewDate, appointments, weekStart, weekDays, currentMonth])

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">

      {/* ── Calendar header ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 py-3 sm:py-4 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2 min-w-0">
          <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-primary" />
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <h2 className="text-base sm:text-lg font-bold tracking-tight truncate">
              {periodInfo.title}
            </h2>
            {periodInfo.count > 0 ? (
              <Badge variant="secondary" className="tabular-nums text-xs shrink-0">
                {periodInfo.count} event{periodInfo.count !== 1 ? "s" : ""}
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
            count={periodInfo.prevCount}
            label={periodInfo.prevLabel}
            onClick={periodInfo.onPrev}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 sm:px-3 text-xs font-semibold"
            onClick={() => onViewDateChange(viewMode === "month" ? startOfMonth(todayDate) : todayDate)}
          >
            Today
          </Button>
          <NavButton
            direction="next"
            count={periodInfo.nextCount}
            label={periodInfo.nextLabel}
            onClick={periodInfo.onNext}
          />
        </div>
      </div>

      {viewMode === "week" && (
        <WeekView
          weekStart={weekStart}
          appointments={appointments}
          onSelectAppointment={onSelectAppointment}
          onAddAppointment={onCreateAppointment}
          todayKeyMDT={todayKeyMDT}
          isMobile={isMobile}
        />
      )}

      {viewMode === "day" && (
        <DayView
          day={viewDate}
          appointments={appointments}
          onSelectAppointment={onSelectAppointment}
          onAddAppointment={onCreateAppointment}
        />
      )}

      {viewMode === "agenda" && (
        <AgendaList
          days={weekDays}
          appointments={appointments}
          onSelectAppointment={onSelectAppointment}
          onAddAppointment={onCreateAppointment}
          todayKeyMDT={todayKeyMDT}
        />
      )}

      {viewMode === "month" && (
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
              {monthDays.map((day) => (
                <DayCell
                  key={day.toISOString()}
                  day={day}
                  inCurrentMonth={isSameMonth(day, currentMonth)}
                  dayAppointments={getAppointmentsForDay(day)}
                  onAddAppointment={onCreateAppointment}
                  onSelectAppointment={onSelectAppointment}
                  todayKeyMDT={todayKeyMDT}
                />
              ))}
            </div>
          </div>

          {/* No events in this month but has events elsewhere */}
          {periodInfo.count === 0 && appointments.length > 0 && (
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
      )}

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

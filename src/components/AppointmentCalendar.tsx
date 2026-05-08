"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Plus, CalendarDays, Clock, MapPin } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Appointment } from "@/types/appointment"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
} from "date-fns"

interface AppointmentCalendarProps {
  appointments: Appointment[]
  viewDate: Date
  onViewDateChange: (date: Date) => void
  onCreateAppointment: (date?: Date) => void
  onSelectAppointment: (appointment: Appointment) => void
}

// ─── Safe date helper ──────────────────────────────────────────────────────────
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
    start.getMonth()    === day.getMonth()    &&
    start.getDate()     === day.getDate()
  )
}

function countInMonth(appointments: Appointment[], month: Date): number {
  return appointments.filter((apt) => {
    const d = safeDate(apt.startTime)
    return d !== null && isSameMonth(d, month)
  }).length
}

// ─── Derive the best initial/target month from appointments ───────────────────
// Returns the month we SHOULD be showing given the current appointments list.
// Priority:
//   1. Current month — if it has any events, stay here
//   2. Nearest upcoming non-cancelled event
//   3. Most recent past event
// Returns null if appointments is empty (caller should leave state unchanged).
function deriveTargetMonth(appointments: Appointment[], todayDate: Date): Date | null {
  if (appointments.length === 0) return null

  const thisMonth = startOfMonth(todayDate)
  if (countInMonth(appointments, thisMonth) > 0) return null // stay where we are

  const validDates = appointments
    .map((apt) => safeDate(apt.startTime))
    .filter((d): d is Date => d !== null)

  const futureDates = validDates
    .filter((d) => d >= todayDate)
    .sort((a, b) => a.getTime() - b.getTime())

  if (futureDates.length > 0) return startOfMonth(futureDates[0])

  const pastDates = validDates.sort((a, b) => b.getTime() - a.getTime())
  if (pastDates.length > 0) return startOfMonth(pastDates[0])

  return null
}

// ─── Component ────────────────────────────────────────────────────────────────
export function AppointmentCalendar({
  appointments,
  viewDate,
  onViewDateChange,
  onCreateAppointment,
  onSelectAppointment,
}: AppointmentCalendarProps) {
  const [todayDate] = React.useState(() => new Date())

  // FIX: Track the appointments length we last auto-navigated for, so that when
  // the list goes from [] → populated we jump correctly, but we don't keep
  // jumping every time a single appointment is added/removed after that.
  const lastAutoNavCountRef = React.useRef<number>(-1)

  React.useEffect(() => {
    // Skip if we already handled this exact count
    if (appointments.length === lastAutoNavCountRef.current) return
    // Skip if still loading (empty)
    if (appointments.length === 0) return

    // Only auto-navigate on the initial data load:
    // treat a jump from 0 → N as the "first real load"
    const wasEmpty = lastAutoNavCountRef.current <= 0
    lastAutoNavCountRef.current = appointments.length

    if (!wasEmpty) return // don't jump again once data is live

    const target = deriveTargetMonth(appointments, todayDate)
    if (target) onViewDateChange(target)
  }, [appointments, todayDate, onViewDateChange])

  // ── Calendar grid ───────────────────────────────────────────────────────────
  const monthStart    = startOfMonth(viewDate)
  const monthEnd      = endOfMonth(viewDate)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd   = endOfWeek(monthEnd)
  const days          = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  const currentMonth  = viewDate // for backward compatibility in the rest of the render logic

  const monthlyCount = React.useMemo(() => countInMonth(appointments, currentMonth), [appointments, currentMonth])
  const prevCount    = React.useMemo(() => countInMonth(appointments, subMonths(currentMonth, 1)), [appointments, currentMonth])
  const nextCount    = React.useMemo(() => countInMonth(appointments, addMonths(currentMonth, 1)), [appointments, currentMonth])

  const getAppointmentsForDay = (day: Date): Appointment[] =>
    appointments.filter((apt) => appointmentIsOnDay(apt, day))

  const getEntryTypeColor = (entryType: string) => {
    switch (entryType) {
      case "appointment": return "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
      case "event":       return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
      case "task":        return "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300"
      case "reminder":    return "bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300"
      default:            return "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CardTitle>{format(currentMonth, "MMMM yyyy")}</CardTitle>
            {monthlyCount > 0 ? (
              <Badge variant="secondary" className="text-xs">
                {monthlyCount} event{monthlyCount !== 1 ? "s" : ""}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                No events
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="relative"
              onClick={() => onViewDateChange(subMonths(currentMonth, 1))}
              title={
                prevCount > 0
                  ? `${format(subMonths(currentMonth, 1), "MMMM yyyy")} has ${prevCount} event${prevCount !== 1 ? "s" : ""}`
                  : undefined
              }
            >
              <ChevronLeft className="size-4" />
              {prevCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold text-white">
                  {prevCount > 9 ? "9+" : prevCount}
                </span>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDateChange(startOfMonth(todayDate))}
            >
              Today
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="relative"
              onClick={() => onViewDateChange(addMonths(currentMonth, 1))}
              title={
                nextCount > 0
                  ? `${format(addMonths(currentMonth, 1), "MMMM yyyy")} has ${nextCount} event${nextCount !== 1 ? "s" : ""}`
                  : undefined
              }
            >
              <ChevronRight className="size-4" />
              {nextCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold text-white">
                  {nextCount > 9 ? "9+" : nextCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <div className="grid min-w-[700px] grid-cols-7 gap-1.5 sm:min-w-0 sm:gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="p-1.5 text-center text-xs font-medium text-muted-foreground sm:p-2 sm:text-sm">
                {d}
              </div>
            ))}

            {days.map((day) => {
              const dayAppointments = getAppointmentsForDay(day)
              const todayFlag = isToday(day)
              const currentMonthDay = isSameMonth(day, currentMonth)

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-24 rounded-lg border p-1.5 text-left transition-colors sm:min-h-28 sm:p-2 ${
                    !currentMonthDay
                      ? "bg-muted/50 opacity-50"
                      : "bg-card hover:bg-accent/50"
                  } ${todayFlag ? "ring-2 ring-green-500" : ""}`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <div
                      className={
                        todayFlag
                          ? "flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-[11px] font-medium text-white sm:text-xs"
                          : "text-xs font-medium sm:text-sm"
                      }
                    >
                      {format(day, "d")}
                    </div>

                    {currentMonthDay && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-950"
                        onClick={(e) => { e.stopPropagation(); onCreateAppointment(day) }}
                        title="Add new appointment"
                      >
                        <Plus className="size-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-1">
                    {dayAppointments.slice(0, 3).map((apt) => {
                      const start = safeDate(apt.startTime)
                      return (
                        <button
                          key={apt._id}
                          className={`w-full truncate rounded p-1 text-left text-[10px] transition-all hover:opacity-80 hover:shadow-sm sm:p-1.5 sm:text-xs ${getEntryTypeColor(apt.entryType)}`}
                          onClick={(e) => { e.stopPropagation(); onSelectAppointment(apt) }}
                          title={apt.title}
                        >
                          {start && <div className="font-medium">{format(start, "h:mm a")}</div>}
                          <div className="truncate">{apt.title}</div>
                        </button>
                      )
                    })}

                    {dayAppointments.length > 3 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            className="w-full pl-1 text-left text-[10px] font-medium text-muted-foreground transition-colors hover:text-emerald-500"
                            onClick={(e) => e.stopPropagation()}
                          >
                            +{dayAppointments.length - 3} more events
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0 shadow-2xl border-emerald-500/20" align="start">
                          <div className="p-3 border-b bg-muted/30 backdrop-blur-sm">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                              {format(day, "EEEE, MMM do")}
                            </p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
                                {dayAppointments.length} total events
                              </Badge>
                            </div>
                          </div>
                          <div className="p-2 space-y-1.5 max-h-[350px] overflow-y-auto scrollbar-thin">
                            {dayAppointments.map((apt) => {
                              const start = safeDate(apt.startTime)
                              const end = safeDate(apt.endTime)
                              return (
                                <button
                                  key={apt._id}
                                  className={`w-full rounded-xl border p-3 text-left transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] ${getEntryTypeColor(apt.entryType)}`}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onSelectAppointment(apt)
                                  }}
                                >
                                  <div className="flex justify-between items-start mb-1.5">
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-1.5 text-[10px] font-bold opacity-70 mb-0.5">
                                        <Clock className="size-3" />
                                        {start ? format(start, "h:mm a") : ""}
                                        {end && ` - ${format(end, "h:mm a")}`}
                                      </div>
                                      <span className="font-bold text-sm tracking-tight leading-tight line-clamp-2">{apt.title}</span>
                                    </div>
                                    <Badge variant="outline" className="text-[9px] uppercase tracking-tighter h-4 px-1 bg-white/20 border-black/5">
                                      {apt.entryType}
                                    </Badge>
                                  </div>
                                  {apt.location && (
                                    <div className="flex items-center gap-1.5 text-[10px] opacity-60 mt-1 truncate">
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
            })}
          </div>
        </div>

        {monthlyCount === 0 && appointments.length > 0 && (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-dashed border-muted-foreground/30 py-8 text-center text-muted-foreground">
            <CalendarDays className="h-10 w-10 opacity-30" />
            <div>
              <p className="font-medium">No events in {format(currentMonth, "MMMM yyyy")}</p>
              <p className="mt-1 text-sm opacity-70">
                You have {appointments.length.toLocaleString()} appointment
                {appointments.length !== 1 ? "s" : ""} across other months.
                Blue dots on the arrows indicate months with events.
              </p>
            </div>
            <JumpToNearestButton appointments={appointments} onNavigate={onViewDateChange} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Jump-to-nearest helper ───────────────────────────────────────────────────
function JumpToNearestButton({
  appointments,
  onNavigate,
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

"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Search, Calendar, User, Mail, Phone, Clock,
  Loader2, AlertCircle, X, CheckCircle2, XCircle,
  ChevronRight, MapPin, History,
} from "lucide-react"
import { format, isToday } from "date-fns"
import { useCustomerBookings } from "@/hooks/useCustomerBookings"
import { useAuth } from "@/providers/AuthProvider"
import { cn } from "@/lib/utils"

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bar: string; pill: string }> = {
  confirmed:  { bar: "bg-emerald-500", pill: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400" },
  scheduled:  { bar: "bg-blue-500",    pill: "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400" },
  completed:  { bar: "bg-gray-400",    pill: "bg-gray-500/10 text-gray-700 border-gray-400/30 dark:text-gray-400" },
  cancelled:  { bar: "bg-red-500",     pill: "bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-400" },
  "no-show":  { bar: "bg-amber-500",   pill: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400" },
}

function getStatusStyle(status: string) {
  return STATUS_STYLES[status] ?? STATUS_STYLES.scheduled
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon, accentClass, iconBgClass, iconColorClass, loading,
}: {
  label: string
  value: number
  icon: React.ReactNode
  accentClass: string
  iconBgClass: string
  iconColorClass: string
  loading?: boolean
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card px-4 py-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-border/80">
      <div className={cn("absolute top-0 left-0 right-0 h-0.75 rounded-t-xl", accentClass)} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground truncate">{label}</p>
          {loading ? (
            <div className="mt-2 h-8 w-16 animate-pulse rounded-md bg-muted" />
          ) : (
            <p className="mt-1 text-3xl font-bold tabular-nums leading-none">{value.toLocaleString()}</p>
          )}
        </div>
        <div className={cn("mt-0.5 shrink-0 rounded-lg p-2 transition-transform group-hover:scale-105", iconBgClass)}>
          <span className={iconColorClass}>{icon}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Booking card ─────────────────────────────────────────────────────────────

function BookingCard({
  booking,
  onViewHistory,
}: {
  booking: any
  onViewHistory: (b: any) => void
}) {
  const customer = booking.customerBooking
  const start = new Date(booking.startTime)
  const style = getStatusStyle(booking.status)
  const totalBookings = customer?.bookingHistory?.totalBookings || 1
  const todayFlag = isToday(start)

  return (
    <div className="group relative flex gap-4 overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-border/80">
      {/* Status bar */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-xl", style.bar)} />

      {/* Avatar */}
      <div className="shrink-0 pl-1">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 font-bold text-sm text-primary select-none">
          {(customer?.firstName?.[0] ?? "?").toUpperCase()}
          {(customer?.lastName?.[0] ?? "").toUpperCase()}
        </div>
      </div>

      {/* Main info */}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold leading-tight">
                {customer?.firstName} {customer?.lastName}
              </span>
              {totalBookings > 1 && (
                <Badge variant="secondary" className="h-4 rounded-full px-2 text-[10px]">
                  {totalBookings} bookings
                </Badge>
              )}
              {todayFlag && (
                <Badge className="h-4 rounded-full px-2 text-[10px] bg-primary/10 text-primary border-primary/25 border">
                  Today
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{booking.title}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant="outline"
              className={cn("text-[10px] font-semibold uppercase tracking-wide border", style.pill)}
            >
              {booking.status}
            </Badge>
          </div>
        </div>

        {/* Contact + time row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {customer?.email && (
            <span className="flex items-center gap-1 truncate">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-40">{customer.email}</span>
            </span>
          )}
          {customer?.phone && (
            <span className="flex items-center gap-1 font-mono">
              <Phone className="h-3 w-3 shrink-0" />
              {customer.phone}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3 shrink-0" />
            {format(start, "EEE, MMM d, yyyy")}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 shrink-0" />
            {format(start, "h:mm a")}
          </span>
          {booking.location && (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-32">{booking.location}</span>
            </span>
          )}
        </div>
      </div>

      {/* Action */}
      <div className="shrink-0 self-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewHistory(booking)}
          className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <History className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">History</span>
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </div>
    </div>
  )
}

// ─── History modal ────────────────────────────────────────────────────────────

function HistoryModal({
  open,
  onOpenChange,
  customer,
  history,
  isLoading,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  customer: any
  history: any
  isLoading: boolean
}) {
  const name = `${customer?.firstName ?? ""} ${customer?.lastName ?? ""}`.trim()
  const total = history?.statistics?.total ?? history?.statistics?.totalBookings ?? 0
  const upcoming = history?.statistics?.upcoming ?? history?.statistics?.upcomingBookings ?? 0
  const completed = history?.statistics?.completed ?? history?.statistics?.completedBookings ?? 0
  const cancelled = history?.statistics?.cancelled ?? history?.statistics?.cancelledBookings ?? 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-border bg-muted/20">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary select-none">
            {(customer?.firstName?.[0] ?? "?").toUpperCase()}
            {(customer?.lastName?.[0] ?? "").toUpperCase()}
          </div>
          <div>
            <DialogTitle className="text-base font-bold leading-tight">{name}</DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Booking history &amp; activity</p>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto max-h-[60vh] modal-scrollbar px-6 py-5 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm">Loading history…</p>
            </div>
          ) : history ? (
            <>
              {/* Stats strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Total",     value: total,     color: "bg-blue-500"    },
                  { label: "Upcoming",  value: upcoming,  color: "bg-violet-500"  },
                  { label: "Completed", value: completed, color: "bg-emerald-500" },
                  { label: "Cancelled", value: cancelled, color: "bg-red-500"     },
                ].map(({ label, value, color }) => (
                  <div key={label} className="relative overflow-hidden rounded-xl border bg-card px-4 py-3 shadow-sm">
                    <div className={cn("absolute top-0 left-0 right-0 h-0.75 rounded-t-xl", color)} />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold tabular-nums mt-1">{value}</p>
                  </div>
                ))}
              </div>

              {/* Booking timeline */}
              {history.bookings?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Booking Timeline</p>
                  <div className="space-y-2">
                    {history.bookings.map((b: any) => {
                      const bStyle = getStatusStyle(b.status)
                      return (
                        <div key={b._id} className="relative flex items-center gap-3 rounded-xl border bg-card/60 px-4 py-3 overflow-hidden">
                          <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-xl", bStyle.bar)} />
                          <div className="pl-1 flex-1 min-w-0 space-y-0.5">
                            <p className="text-sm font-semibold truncate">{b.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(b.startTime), "PPP p")}
                            </p>
                            {b.createdBy?.name && (
                              <p className="text-[11px] text-muted-foreground/60">
                                Booked by {b.createdBy.name}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className={cn("shrink-0 text-[10px] font-semibold uppercase tracking-wide border", bStyle.pill)}
                          >
                            {b.status}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Booked-by breakdown */}
              {history.bookedBy?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Booked By</p>
                  <div className="space-y-1.5">
                    {history.bookedBy.map((org: any) => (
                      <div
                        key={org.organizerId}
                        className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5"
                      >
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          {org.organizerName}
                        </div>
                        <Badge variant="secondary" className="text-xs tabular-nums">
                          {org.count} booking{org.count !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-muted">
                <History className="h-6 w-6 opacity-50" />
              </div>
              <p className="text-sm font-medium">No history found for this customer</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-border px-6 py-4 bg-muted/10">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed bg-muted/20 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Calendar className="h-7 w-7 text-muted-foreground/50" />
      </div>
      <div>
        <p className="font-semibold">No Customer Bookings Found</p>
        <p className="mt-1 text-sm text-muted-foreground max-w-xs">
          {hasFilters
            ? "Try adjusting your search or filters to see more results."
            : "Customer bookings made through the public portal will appear here."}
        </p>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BookedTab() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null)
  const [selectedCustomer, setSelectedCustomer] = React.useState<any>(null)
  const [historyModalOpen, setHistoryModalOpen] = React.useState(false)
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth()

  const {
    bookings,
    isLoading,
    error,
    fetchCustomerBookings,
    fetchCustomerHistory,
    customerHistory,
    isLoadingHistory,
  } = useCustomerBookings()

  const activeFilters = React.useMemo(() => {
    const filters: any = {}
    if (statusFilter !== "all") filters.status = statusFilter
    if (selectedDate) {
      filters.startDate = selectedDate.toISOString()
      const endDate = new Date(selectedDate)
      endDate.setHours(23, 59, 59, 999)
      filters.endDate = endDate.toISOString()
    }
    return filters
  }, [statusFilter, selectedDate])

  React.useEffect(() => {
    if (!isAuthLoaded || !isSignedIn) return
    void fetchCustomerBookings(activeFilters)
  }, [activeFilters, fetchCustomerBookings, isAuthLoaded, isSignedIn])

  const filteredBookings = React.useMemo(() => {
    if (!bookings) return []
    if (!searchQuery) return bookings
    const q = searchQuery.toLowerCase()
    return bookings.filter((b: any) => {
      const c = b.customerBooking
      if (!c) return false
      return (
        c.firstName?.toLowerCase().includes(q) ||
        c.lastName?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q)
      )
    })
  }, [bookings, searchQuery])

  const stats = React.useMemo(() => {
    if (!bookings) return { total: 0, todays: 0, confirmed: 0, cancelled: 0 }
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
    return {
      total:    bookings.length,
      todays:   bookings.filter((b: any) => { const s = new Date(b.startTime); return s >= today && s < tomorrow }).length,
      confirmed: bookings.filter((b: any) => b.status === "confirmed").length,
      cancelled: bookings.filter((b: any) => b.status === "cancelled").length,
    }
  }, [bookings])

  const handleViewHistory = async (booking: any) => {
    setSelectedCustomer(booking.customerBooking)
    setHistoryModalOpen(true)
    await fetchCustomerHistory(
      booking.customerBooking.email,
      booking.customerBooking.phone,
      booking.customerBooking.firstName,
      booking.customerBooking.lastName,
    )
  }

  const hasFilters = !!searchQuery || statusFilter !== "all" || !!selectedDate
  const clearFilters = () => { setSearchQuery(""); setStatusFilter("all"); setSelectedDate(null) }
  const showLoading = !isAuthLoaded || isLoading
  const handleRetry = () => {
    if (!isAuthLoaded || !isSignedIn) return
    void fetchCustomerBookings(activeFilters)
  }

  if (error) {
    return (
      <Alert variant="destructive" className="border-destructive/30 bg-destructive/8">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>
          Failed to load customer bookings.{" "}
          <span className="text-xs opacity-70">{error}</span>
          </span>
          <Button type="button" variant="secondary" size="sm" onClick={handleRetry}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-5">

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total Bookings"
          value={stats.total}
          icon={<Calendar className="h-4 w-4" />}
          accentClass="bg-primary"
          iconBgClass="bg-primary/10"
          iconColorClass="text-primary"
          loading={showLoading}
        />
        <StatCard
          label="Today"
          value={stats.todays}
          icon={<Clock className="h-4 w-4" />}
          accentClass="bg-blue-500"
          iconBgClass="bg-blue-500/10"
          iconColorClass="text-blue-600 dark:text-blue-400"
          loading={showLoading}
        />
        <StatCard
          label="Confirmed"
          value={stats.confirmed}
          icon={<CheckCircle2 className="h-4 w-4" />}
          accentClass="bg-emerald-500"
          iconBgClass="bg-emerald-500/10"
          iconColorClass="text-emerald-600 dark:text-emerald-400"
          loading={showLoading}
        />
        <StatCard
          label="Cancelled"
          value={stats.cancelled}
          icon={<XCircle className="h-4 w-4" />}
          accentClass="bg-red-500"
          iconBgClass="bg-red-500/10"
          iconColorClass="text-red-600 dark:text-red-400"
          loading={showLoading}
        />
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card px-4 py-3.5 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search name, email, phone…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm bg-muted/40"
          />
        </div>

        {/* Status */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-8 text-sm bg-muted/40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        {/* Date */}
        <input
          type="date"
          value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""}
          onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : null)}
          className="h-8 w-36 px-2.5 rounded-md border border-input bg-muted/40 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all scheme-light-dark"
        />

        {/* Clear */}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* ── Section header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">Customer Bookings</p>
          {!showLoading && (
            <Badge variant="secondary" className="h-5 rounded-full px-2 text-xs tabular-nums">
              {filteredBookings.length}
              {bookings && filteredBookings.length < bookings.length && ` of ${bookings.length}`}
            </Badge>
          )}
        </div>
        {showLoading && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading…
          </div>
        )}
      </div>

      {/* ── Booking list ── */}
      {showLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="relative flex gap-4 rounded-xl border bg-card p-4">
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-muted animate-pulse" />
              <div className="w-10 h-10 rounded-xl bg-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                <div className="h-3 w-56 rounded bg-muted animate-pulse" />
                <div className="h-3 w-64 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <div className="space-y-2.5">
          {filteredBookings.map((booking: any) => (
            <BookingCard key={booking._id} booking={booking} onViewHistory={handleViewHistory} />
          ))}
        </div>
      )}

      {/* ── History modal ── */}
      <HistoryModal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        customer={selectedCustomer}
        history={customerHistory}
        isLoading={isLoadingHistory}
      />
    </div>
  )
}

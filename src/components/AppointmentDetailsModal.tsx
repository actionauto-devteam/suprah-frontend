"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Calendar, Car, Clock, MapPin, Users, Video, Phone, Mail,
  Edit2, Save, X, Trash2, Ban, CheckCircle, AlertCircle,
  Link as LinkIcon, RefreshCw,
} from "lucide-react"
import { Appointment } from "@/types/appointment"
import { fmtLongDateMDT, fmtTimeMDT, fmtLongDateTimeMDT } from "@/lib/timezone"
import { useUser } from "@/providers/AuthProvider"
import { DatePicker } from "@/components/ui/date-picker"
import { TimePicker } from "@/components/ui/time-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserSearch } from "@/components/UserSearch"
import { GuestEmailInput } from "@/components/GuestEmailInput"
import { useAppointmentPolling } from "@/hooks/useAppointmentPolling"
import { useNotifications } from "@/context/NotificationContext"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppointmentDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment: Appointment | null
  // All handlers are optional — when absent the modal is read-only (e.g. dashboard)
  onUpdate?: (id: string, data: any) => Promise<void>
  onCancel?: (id: string) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  confirmed:  "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
  scheduled:  "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400",
  cancelled:  "bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-400",
  completed:  "bg-gray-500/10 text-gray-700 border-gray-400/30 dark:text-gray-400",
  "no-show":  "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400",
}

const ENTRY_BADGE: Record<string, string> = {
  appointment: "bg-violet-500/10 text-violet-700 border-violet-500/30 dark:text-violet-400",
  event:       "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400",
  task:        "bg-orange-500/10 text-orange-700 border-orange-500/30 dark:text-orange-400",
  reminder:    "bg-pink-500/10 text-pink-700 border-pink-500/30 dark:text-pink-400",
}

const GUEST_STATUS_STYLE: Record<string, string> = {
  accepted: "border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400",
  declined: "border-red-500 text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400",
  pending:  "border-border text-muted-foreground",
}

function getStatusBadge(status: string) {
  return STATUS_BADGE[status] ?? "bg-muted text-muted-foreground border-border"
}

function getEntryBadge(type: string) {
  return ENTRY_BADGE[type] ?? "bg-muted text-muted-foreground border-border"
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, icon, children }: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {icon && <span className="opacity-70">{icon}</span>}
        {title}
      </div>
      {children}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AppointmentDetailsModal({
  open,
  onOpenChange,
  appointment: initialAppointment,
  onUpdate,
  onCancel,
  onDelete,
}: AppointmentDetailsModalProps) {
  const { user: currentUser } = useUser()
  const { fetchNotifications } = useNotifications()
  const [appointment, setAppointment] = React.useState<Appointment | null>(initialAppointment)
  const [isEditing,    setIsEditing]    = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error,        setError]        = React.useState<string | null>(null)
  const [editData,     setEditData]     = React.useState<any>({})

  const handleAppointmentUpdate = React.useCallback((updated: Appointment) => {
    setAppointment(updated)
    fetchNotifications()
  }, [fetchNotifications])

  useAppointmentPolling({
    appointmentId: appointment?._id || null,
    onUpdate: handleAppointmentUpdate,
    enabled: open && !isEditing,
    intervalMs: 10000,
  })

  React.useEffect(() => {
    if (initialAppointment) setAppointment(initialAppointment)
  }, [initialAppointment])

  const isRegisteredParticipant = React.useMemo(() => {
    if (!currentUser?.id || !appointment?.participants) return false
    const currentUserId    = currentUser.id
    const currentUserEmail = currentUser.primaryEmailAddress?.emailAddress || currentUser.emailAddresses?.[0]?.emailAddress
    return appointment.participants.some((participant) => {
      const participantId    = participant._id || ""
      const participantEmail = participant.email || ""
      return (
        String(participantId) === String(currentUserId) ||
        (participantEmail && currentUserEmail && participantEmail.toLowerCase() === currentUserEmail.toLowerCase())
      )
    })
  }, [currentUser, appointment])

  const isCreator = React.useMemo(() => {
    if (!currentUser?.id || !appointment?.createdBy) return false
    const createdBy        = appointment.createdBy
    const creatorId        = createdBy._id || ""
    const creatorEmail     = createdBy.email || ""
    const currentUserId    = currentUser.id
    const currentUserEmail = currentUser.primaryEmailAddress?.emailAddress || currentUser.emailAddresses?.[0]?.emailAddress
    if (String(creatorId) === String(currentUserId)) return true
    if (currentUserEmail && creatorEmail && currentUserEmail.toLowerCase() === creatorEmail.toLowerCase()) return true
    return false
  }, [currentUser, appointment])

  // Only allow actions when the relevant handler is provided (read-only when used from dashboard)
  const canEdit   = !!onUpdate && (isCreator || isRegisteredParticipant)
  const canCancel = !!onCancel && isCreator && appointment?.status !== "cancelled"
  const canDelete = !!onDelete && isCreator

  React.useEffect(() => {
    if (!appointment) return
    setEditData({
      title:           appointment.title,
      description:     appointment.description || "",
      startDate:       new Date(appointment.startTime),
      startTime:       appointment.startTime,
      endDate:         new Date(appointment.endTime),
      endTime:         appointment.endTime,
      location:        appointment.location || "",
      type:            appointment.type,
      // senior dev: custom type label for "other"
      customTypeDetails: (appointment as any).customTypeDetails || "",
      status:          appointment.status,
      meetingLink:     appointment.meetingLink || "",
      notes:           appointment.notes || "",
      outcomeNotes:    appointment.outcomeNotes || "",
      participants:    appointment.participants.map((p) => p._id),
      guestEmailsData: appointment.guestEmails || [],
      guestEmails:     appointment.guestEmails?.map((g: any) => {
        if (typeof g === "string") return g
        if (typeof g === "object" && g.email) return g.email
        return ""
      }).filter(Boolean) || [],
    })
    setIsEditing(false)
    setError(null)
  }, [appointment])

  if (!appointment) return null

  // senior dev: resolve display type — use customTypeDetails when type is "other"
  const resolvedDisplayType = appointment.type === "other" && (appointment as any).customTypeDetails
    ? (appointment as any).customTypeDetails
    : appointment.type

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":     return <Video className="size-4" />
      case "phone":     return <Phone className="size-4" />
      case "in-person": return <MapPin className="size-4" />
      default:          return <Calendar className="size-4" />
    }
  }

  const handleSave = async () => {
    if (!onUpdate) return
    setIsSubmitting(true)
    setError(null)
    try {
      const startDateTime = new Date(editData.startDate)
      const startTime     = new Date(editData.startTime)
      startDateTime.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0)

      const endDateTime = new Date(editData.endDate)
      const endTime     = new Date(editData.endTime)
      endDateTime.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0)

      if (endDateTime <= startDateTime) {
        setError("End time must be after start time")
        setIsSubmitting(false); return
      }
      // senior dev: customer bookings don't require participants
      const customerBooking = (appointment as any).customerBooking
      if (editData.participants.length === 0 && editData.guestEmails.length === 0 && !customerBooking) {
        setError("At least one participant or guest is required")
        setIsSubmitting(false); return
      }
      if (["completed", "no-show"].includes(editData.status) && !editData.outcomeNotes?.trim()) {
        setError(`Outcome notes are required when marking as ${editData.status.replace("-", " ")}`)
        setIsSubmitting(false); return
      }

      const formattedGuestEmails = editData.guestEmails.length > 0
        ? editData.guestEmails.map((email: string) => {
            const existing = editData.guestEmailsData?.find((g: any) => g.email === email)
            return existing ?? { email, status: "pending" }
          })
        : undefined

      await onUpdate(appointment._id, {
        title:            editData.title,
        description:      editData.description   || undefined,
        startTime:        startDateTime.toISOString(),
        endTime:          endDateTime.toISOString(),
        location:         editData.location      || undefined,
        type:             editData.type,
        // senior dev: pass customTypeDetails when "other"
        customTypeDetails: editData.type === "other" ? editData.customTypeDetails || undefined : undefined,
        meetingLink:      editData.meetingLink   || undefined,
        notes:            editData.notes         || undefined,
        status:           editData.status,
        outcomeNotes:     editData.outcomeNotes  || undefined,
        participants:     editData.participants,
        guestEmails:      formattedGuestEmails,
      })
      setIsEditing(false)
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to update")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = async () => {
    if (!onCancel) return
    if (!confirm("Are you sure you want to cancel this appointment?")) return
    setIsSubmitting(true)
    try {
      await onCancel(appointment._id)
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || "Failed to cancel")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    if (!confirm("Are you sure you want to delete this appointment? This action cannot be undone.")) return
    setIsSubmitting(true)
    try {
      await onDelete(appointment._id)
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || "Failed to delete")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-2xl p-0 overflow-hidden gap-0">

        {/* ── Status-tinted header ── */}
        <div className={cn(
          "px-4 sm:px-6 pt-5 pb-4 border-b border-border",
          appointment.status === "confirmed" ? "bg-emerald-500/5" :
          appointment.status === "cancelled" ? "bg-red-500/5"     :
          appointment.status === "completed" ? "bg-gray-500/5"    :
          appointment.status === "no-show"   ? "bg-amber-500/5"   :
          "bg-muted/20"
        )}>
          <DialogHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={cn("text-[10px] font-bold uppercase tracking-wide", getEntryBadge(appointment.entryType))}>
                    {capitalize(appointment.entryType)}
                  </Badge>
                  <Badge variant="outline" className={cn("text-[10px] font-bold uppercase tracking-wide", getStatusBadge(appointment.status))}>
                    {appointment.status.replace("-", " ")}
                  </Badge>
                  {!isEditing && (
                    <span title="Live updates active">
                      <RefreshCw className="size-3 text-muted-foreground/50 animate-pulse" />
                    </span>
                  )}
                </div>
                <DialogTitle className="text-xl font-bold leading-tight">
                  {isEditing ? "Edit —" : ""} {appointment.title}
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>
          <DialogDescription className="sr-only">
            View and manage appointment details including time, location, participants, and status.
          </DialogDescription>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto max-h-[calc(90dvh-160px)] modal-scrollbar px-4 sm:px-6 py-5 space-y-6">

          {/* Error */}
          {error && (
            <Alert variant="destructive" className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 rounded-full bg-red-100 dark:bg-red-900 p-1">
                  <AlertCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-900 dark:text-red-100">Error</p>
                  <AlertDescription className="text-sm text-red-800 dark:text-red-200">{error}</AlertDescription>
                </div>
              </div>
            </Alert>
          )}

          {/* Title (edit mode only) */}
          {isEditing && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Title</Label>
              <Input value={editData.title} onChange={(e) => setEditData({ ...editData, title: e.target.value })} className="font-medium" />
            </div>
          )}

          {/* Description */}
          {(isEditing || appointment.description) && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Description</Label>
              {isEditing ? (
                <Textarea value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} rows={3} />
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed">{appointment.description}</p>
              )}
            </div>
          )}

          {/* ── Linked Vehicles (senior dev) ── */}
          {(appointment as any).vehicleIds?.length > 0 && (
            <Section title="Linked Vehicles" icon={<Car className="size-3.5" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(appointment as any).vehicleIds.map((vehicle: any) => (
                  <div key={vehicle._id || vehicle.id} className="flex gap-3 rounded-lg border bg-muted/20 p-3 text-xs">
                    {vehicle.image && (
                      <img src={vehicle.image} alt="" className="h-12 w-16 rounded object-cover shrink-0 bg-muted" />
                    )}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="font-semibold truncate">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                      <p className="text-muted-foreground">Stock #{vehicle.stockNumber}</p>
                      {vehicle.price && (
                        <p className="font-bold text-primary">${vehicle.price.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── Schedule ── */}
          <Section title="Schedule" icon={<Clock className="size-3.5" />}>
            <div className="grid grid-cols-1 xxs:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Start</Label>
                {isEditing ? (
                  <div className="space-y-2">
                    <DatePicker value={editData.startDate} onChange={(d) => d && setEditData({ ...editData, startDate: d })} />
                    <TimePicker value={editData.startTime} onChange={(t) => setEditData({ ...editData, startTime: t })} />
                  </div>
                ) : (
                  <div className="rounded-lg border bg-muted/30 px-3 py-2.5 space-y-0.5">
                    <p className="text-sm font-semibold">{fmtLongDateMDT(appointment.startTime)}</p>
                    <p className="text-xs text-muted-foreground">{fmtTimeMDT(appointment.startTime)}</p>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">End</Label>
                {isEditing ? (
                  <div className="space-y-2">
                    <DatePicker value={editData.endDate} onChange={(d) => d && setEditData({ ...editData, endDate: d })} />
                    <TimePicker value={editData.endTime} onChange={(t) => setEditData({ ...editData, endTime: t })} />
                  </div>
                ) : (
                  <div className="rounded-lg border bg-muted/30 px-3 py-2.5 space-y-0.5">
                    <p className="text-sm font-semibold">{fmtLongDateMDT(appointment.endTime)}</p>
                    <p className="text-xs text-muted-foreground">{fmtTimeMDT(appointment.endTime)}</p>
                  </div>
                )}
              </div>
            </div>
          </Section>

          {/* ── Details ── */}
          <Section title="Details" icon={<Calendar className="size-3.5" />}>
            <div className="grid grid-cols-1 xxs:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Type</Label>
                {isEditing ? (
                  <Select value={editData.type} onValueChange={(v) => setEditData({ ...editData, type: v, customTypeDetails: "" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="z-350">
                      {(appointment as any).customerBooking ? (
                        <>
                          <SelectItem value="test-drive">Test Drive</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="in-person">In Person</SelectItem>
                          <SelectItem value="video">Video Call</SelectItem>
                          <SelectItem value="phone">Phone Call</SelectItem>
                          <SelectItem value="other">Others</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="in-person">In-Person</SelectItem>
                          <SelectItem value="video">Video Call</SelectItem>
                          <SelectItem value="phone">Phone Call</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2.5">
                    <span className="text-muted-foreground">{getTypeIcon(appointment.type)}</span>
                    <span className="text-sm capitalize">{resolvedDisplayType.replace("-", " ")}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Status</Label>
                {isEditing ? (
                  <Select value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="z-350">
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="no-show">No-Show</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2.5">
                    <Badge variant="outline" className={cn("text-[11px] font-semibold", getStatusBadge(appointment.status))}>
                      {appointment.status.replace("-", " ")}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* senior dev: custom type details field */}
            {isEditing && editData.type === "other" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Specify Type <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="e.g. At Customer Showroom…"
                  value={editData.customTypeDetails}
                  onChange={(e) => setEditData({ ...editData, customTypeDetails: e.target.value })}
                />
              </div>
            )}

            {(isEditing || appointment.location) && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="size-3" /> Location
                </Label>
                {isEditing ? (
                  <Input value={editData.location} onChange={(e) => setEditData({ ...editData, location: e.target.value })} placeholder="Enter location…" />
                ) : (
                  <p className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2.5 text-sm">
                    <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                    {appointment.location}
                  </p>
                )}
              </div>
            )}

            {(isEditing || appointment.meetingLink) && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <LinkIcon className="size-3" /> Meeting Link
                </Label>
                {isEditing ? (
                  <Input type="url" value={editData.meetingLink} onChange={(e) => setEditData({ ...editData, meetingLink: e.target.value })} placeholder="https://…" />
                ) : (
                  <a href={appointment.meetingLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2.5 text-sm text-primary hover:underline truncate">
                    <LinkIcon className="size-3.5 shrink-0" />
                    {appointment.meetingLink}
                  </a>
                )}
              </div>
            )}
          </Section>

          {/* ── Participants ── */}
          <Section title={`Participants (${isEditing ? editData.participants.length : appointment.participants.length})`} icon={<Users className="size-3.5" />}>
            {isEditing ? (
              <UserSearch
                selectedUsers={editData.participants}
                onSelectUsers={(ids) => setEditData({ ...editData, participants: ids })}
                label=""
                placeholder="Search and select participants…"
                multiple
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {appointment.participants.map((participant) => (
                  <div key={participant._id} className="flex items-center gap-2 rounded-lg border bg-muted/30 px-2.5 py-1.5">
                    {participant.avatar ? (
                      <img src={participant.avatar} alt="" className="size-5 rounded-full object-cover" />
                    ) : (
                      <div className="size-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                        {(participant.fullName || participant.name || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm font-medium">{participant.fullName || participant.name}</span>
                    {participant._id === appointment.createdBy._id && (
                      <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Organizer</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* ── External Guests ── */}
          {(isEditing || (appointment.guestEmails && appointment.guestEmails.length > 0)) && (
            <Section title={`External Guests (${isEditing ? editData.guestEmails.length : appointment.guestEmails?.length || 0})`} icon={<Mail className="size-3.5" />}>
              {isEditing ? (
                <GuestEmailInput
                  emails={Array.isArray(editData.guestEmails) ? editData.guestEmails.map((item: any) =>
                    typeof item === "string" ? item : item.email
                  ) : []}
                  onChange={(emails) => setEditData({ ...editData, guestEmails: emails })}
                />
              ) : (
                <div className="space-y-2">
                  {appointment.guestEmails?.map((guest, index) => (
                    <div key={index} className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2.5 gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">{guest.email}</span>
                          {guest.guestName && <span className="text-xs text-muted-foreground">({guest.guestName})</span>}
                        </div>
                        {guest.guestPhone && (
                          <p className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                            <Phone className="size-3" /> {guest.guestPhone}
                          </p>
                        )}
                        {guest.respondedAt && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Responded {fmtLongDateTimeMDT(guest.respondedAt)}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("shrink-0 text-[10px] font-semibold uppercase tracking-wide gap-1",
                          GUEST_STATUS_STYLE[guest.status] ?? GUEST_STATUS_STYLE.pending
                        )}
                      >
                        {guest.status === "accepted" && <CheckCircle className="size-3" />}
                        {guest.status === "declined" && <X className="size-3" />}
                        {guest.status === "pending"  && <Clock className="size-3" />}
                        {guest.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {/* ── Notes ── */}
          {(isEditing || appointment.notes) && (
            <Section title="Notes">
              {isEditing ? (
                <Textarea value={editData.notes} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} rows={3} placeholder="Add internal notes…" />
              ) : (
                <div className="rounded-lg border bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {appointment.notes}
                </div>
              )}
            </Section>
          )}

          {/* ── Outcome Notes (terminal statuses) ── */}
          {(isEditing ? ["completed", "no-show"].includes(editData.status) : ["completed", "no-show"].includes(appointment.status)) && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4 space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <CheckCircle className="size-3.5" />
                Outcome Notes
                {isEditing && <span className="text-destructive ml-0.5">*</span>}
              </Label>
              {isEditing ? (
                <Textarea
                  placeholder="What was the result of this appointment?"
                  value={editData.outcomeNotes}
                  onChange={(e) => setEditData({ ...editData, outcomeNotes: e.target.value })}
                  rows={3}
                  className="bg-white dark:bg-background border-amber-200 dark:border-amber-800"
                />
              ) : (
                <p className="text-sm text-amber-800 dark:text-amber-300 whitespace-pre-wrap leading-relaxed">
                  {appointment.outcomeNotes || "No outcome notes provided."}
                </p>
              )}
            </div>
          )}

          {/* ── Customer Booking Information (senior dev) ── */}
          {(appointment as any).customerBooking && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20 p-4 space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <Users className="size-3.5" /> Customer Booking Information
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <p className="text-foreground/80"><span className="font-semibold">Name:</span> {(appointment as any).customerBooking.firstName} {(appointment as any).customerBooking.lastName}</p>
                <p className="text-foreground/80"><span className="font-semibold">Phone:</span> {(appointment as any).customerBooking.phone}</p>
                <p className="col-span-2 text-foreground/80"><span className="font-semibold">Email:</span> {(appointment as any).customerBooking.email}</p>
              </div>
            </div>
          )}

          {/* ── Metadata ── */}
          <div className="rounded-lg border bg-muted/20 px-3 py-3 text-[11px] text-muted-foreground space-y-1">
            <p>Created by: <span className="font-medium text-foreground/70">{appointment.createdBy.fullName || appointment.createdBy.name}</span> ({appointment.createdBy.email})</p>
            <p>Created: {fmtLongDateTimeMDT(appointment.createdAt)}</p>
            {appointment.updatedAt !== appointment.createdAt && (
              <p>Last updated: {fmtLongDateTimeMDT(appointment.updatedAt)}</p>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 sm:px-6 py-3 sm:py-4 bg-muted/10">
          <div className="flex gap-2 flex-wrap">
            {canDelete && !isEditing && (
              <Button variant="ghost" size="sm" onClick={handleDelete} disabled={isSubmitting}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5">
                <Trash2 className="size-4" />
                <span className="hidden xs:inline">Delete</span>
              </Button>
            )}
            {canCancel && !isEditing && (
              <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSubmitting}
                className="text-muted-foreground hover:text-foreground gap-1.5">
                <Ban className="size-4" />
                <span className="hidden xs:inline">Cancel Appointment</span>
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={() => { setIsEditing(false); setError(null) }} disabled={isSubmitting} className="gap-1.5">
                  <X className="size-4" />
                  <span className="hidden xs:inline">Discard</span>
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSubmitting} className="bg-primary hover:bg-primary/90 gap-1.5">
                  <Save className="size-4" />
                  {isSubmitting ? "Saving…" : "Save Changes"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
                {canEdit && (
                  <Button size="sm" onClick={() => setIsEditing(true)} className="bg-primary hover:bg-primary/90 gap-1.5">
                    <Edit2 className="size-4" /> Edit
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

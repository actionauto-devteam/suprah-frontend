"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  AlertCircle, MapPin, Link as LinkIcon, Loader2,
  Calendar, Clock, Users, Car, StickyNote, CalendarPlus, X,
} from "lucide-react"
import { Conversation, EntryType } from "@/types/appointment"
import { UserSearch } from "@/components/UserSearch"
import { GuestEmailInput } from "@/components/GuestEmailInput"
import { CustomerBookingForm } from "@/components/CustomerBookingForm"
import { DatePicker } from "@/components/ui/date-picker"
import { TimePicker } from "@/components/ui/time-picker"
import { VehiclePickerModal } from "@/components/VehiclePickerModal"
import type { Vehicle } from "@/types/inventory"
import { cn } from "@/lib/utils"
import { useUser } from "@/providers/AuthProvider"

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreateAppointmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateAppointment: (data: Record<string, unknown>) => Promise<void>
  conversations: Conversation[]
  preselectedConversation?: string
  preselectedDate?: Date
  initialCustomerBooking?: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
  }
  forceCustomerBooking?: boolean
  extraPayload?: Record<string, unknown>
  entryTypeLock?: EntryType
}

// ─── Draft persistence ────────────────────────────────────────────────────────

const DRAFT_STORAGE_KEY = "crm-appointment-draft"

type AppointmentDraft = {
  version: 1
  resume?: boolean
  formData: {
    title: string
    description: string
    startDate: string
    startTime: string
    endDate: string
    endTime: string
    location: string
    type: string
    customTypeDetails: string
    entryType: EntryType
    conversationId: string
    participants: string[]
    guestEmails: string[]
    meetingLink: string
    notes: string
    isCustomerBooking: boolean
    customerBooking: { firstName: string; lastName: string; email: string; phone: string }
  }
  selectedVehicles?: Vehicle[]
  meta?: {
    initialCustomerBooking?: { firstName?: string; lastName?: string; email?: string; phone?: string }
    forceCustomerBooking?: boolean
    extraPayload?: Record<string, unknown>
  }
}

// ─── Entry type config ────────────────────────────────────────────────────────

const ENTRY_TYPES: { id: EntryType; label: string; color: string }[] = [
  { id: "appointment", label: "Appointment", color: "text-violet-600 dark:text-violet-400" },
  { id: "event",       label: "Event",       color: "text-blue-600 dark:text-blue-400"     },
  { id: "task",        label: "Task",        color: "text-orange-600 dark:text-orange-400" },
  { id: "reminder",    label: "Reminder",    color: "text-pink-600 dark:text-pink-400"     },
]

// ─── Section wrapper ──────────────────────────────────────────────────────────

function FormSection({ title, icon, children }: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3 pt-4 border-t border-border first:pt-0 first:border-0">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {icon && <span className="opacity-70">{icon}</span>}
        {title}
      </div>
      {children}
    </div>
  )
}

// ─── Field label ──────────────────────────────────────────────────────────────

function FieldLabel({ htmlFor, children, required }: { htmlFor?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <Label htmlFor={htmlFor} className="text-xs font-semibold text-foreground/70">
      {children}{required && <span className="ml-0.5 text-destructive">*</span>}
    </Label>
  )
}

function getAppointmentRequestErrorMessage(err: any): string {
  const responseMessage = err?.response?.data?.message
  if (typeof responseMessage === "string" && responseMessage.trim()) {
    return responseMessage.trim()
  }

  const nestedMessage = err?.response?.data?.error?.message
  if (typeof nestedMessage === "string" && nestedMessage.trim()) {
    return nestedMessage.trim()
  }

  if (typeof err?.message === "string" && err.message.trim()) {
    return err.message.trim()
  }

  return "Failed to create appointment. Please try again."
}

function isExpectedAppointmentSchedulingConflict(err: any, message: string): boolean {
  if (err?.response?.status !== 409) return false

  return (
    /^double-booking conflict:/i.test(message) ||
    /time slot is no longer available/i.test(message)
  )
}

type AppointmentErrorPresentation = {
  title: string
  message: string
  hint?: string
}

function getAppointmentErrorPresentation(error: string): AppointmentErrorPresentation {
  const message = error.trim()

  if (/^double-booking conflict:/i.test(message)) {
    return {
      title: "Schedule conflict",
      message: message.replace(/^double-booking conflict:\s*/i, ""),
      hint: "Choose a different start or end time, then try again.",
    }
  }

  if (/time slot is no longer available/i.test(message)) {
    return {
      title: "Time slot unavailable",
      message,
      hint: "Choose another available time before creating the appointment.",
    }
  }

  if (/cannot schedule.*past|schedule.*past/i.test(message)) {
    return {
      title: "Invalid schedule",
      message,
      hint: "Select a future date and time, then try again.",
    }
  }

  return {
    title: "Unable to create appointment",
    message,
    hint: "Review the details below and try again.",
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CreateAppointmentModal({
  open,
  onOpenChange,
  onCreateAppointment,
  conversations,
  preselectedConversation,
  preselectedDate,
  initialCustomerBooking,
  forceCustomerBooking = false,
  extraPayload,
  entryTypeLock,
}: CreateAppointmentModalProps) {
  const [isSubmitting,    setIsSubmitting]    = React.useState(false)
  const [error,           setError]           = React.useState<string | null>(null)
  const [pickerModalOpen, setPickerModalOpen] = React.useState(false)  // senior dev: inline vehicle picker
  const { user: currentUser } = useUser()

  const [formData, setFormData] = React.useState({
    title:            "",
    description:      "",
    startDate:        preselectedDate || new Date(),
    startTime:        "",
    endDate:          preselectedDate || new Date(),
    endTime:          "",
    location:         "",
    type:             "in-person",
    customTypeDetails: "",      // senior dev: label shown when type === "other"
    entryType:        (entryTypeLock || "appointment") as EntryType,
    conversationId:   preselectedConversation || "",
    participants:     [] as string[],
    guestEmails:      [] as string[],
    meetingLink:      "",
    notes:            "",
    isCustomerBooking: false,
    customerBooking:  { firstName: "", lastName: "", email: "", phone: "" },
  })

  const [customerErrors, setCustomerErrors] = React.useState<{
    firstName?: string; lastName?: string; email?: string; phone?: string;
  }>({})

  // senior dev: multiple vehicles (replaces single selectedVehicle)
  const [selectedVehicles, setSelectedVehicles] = React.useState<Vehicle[]>([])
  const [draftMeta,         setDraftMeta]         = React.useState<AppointmentDraft["meta"] | null>(null)
  const draftLoadedRef = React.useRef(false)

  // ── Initializers ─────────────────────────────────────────────────────────────

  React.useEffect(() => {
    if (!open || draftLoadedRef.current) return
    if (preselectedDate) setFormData((prev) => ({ ...prev, startDate: preselectedDate, endDate: preselectedDate }))
  }, [open, preselectedDate])

  React.useEffect(() => {
    if (!open || draftLoadedRef.current) return
    if (preselectedConversation) setFormData((prev) => ({ ...prev, conversationId: preselectedConversation }))
  }, [open, preselectedConversation])

  React.useEffect(() => {
    if (!open) return
    if (!initialCustomerBooking && !forceCustomerBooking) return
    setFormData((prev) => ({
      ...prev,
      isCustomerBooking: forceCustomerBooking || prev.isCustomerBooking,
      // senior dev: auto-set type to test-drive for customer bookings
      type: (forceCustomerBooking || prev.isCustomerBooking) ? "test-drive" : prev.type,
      customerBooking: {
        firstName: initialCustomerBooking?.firstName || prev.customerBooking.firstName,
        lastName:  initialCustomerBooking?.lastName  || prev.customerBooking.lastName,
        email:     initialCustomerBooking?.email     || prev.customerBooking.email,
        phone:     initialCustomerBooking?.phone     || prev.customerBooking.phone,
      },
    }))
  }, [open, initialCustomerBooking, forceCustomerBooking])

  React.useEffect(() => {
    if (!entryTypeLock) return
    setFormData((prev) => ({ ...prev, entryType: entryTypeLock }))
  }, [entryTypeLock])

  // ── Draft persistence ─────────────────────────────────────────────────────

  const readDraft = React.useCallback((): AppointmentDraft | null => {
    if (typeof window === "undefined") return null
    const stored = sessionStorage.getItem(DRAFT_STORAGE_KEY)
    if (!stored) return null
    try {
      const parsed = JSON.parse(stored) as AppointmentDraft
      return parsed?.formData ? parsed : null
    } catch { return null }
  }, [])

  const clearDraft = React.useCallback(() => {
    if (typeof window === "undefined") return
    sessionStorage.removeItem(DRAFT_STORAGE_KEY)
    draftLoadedRef.current = false
  }, [])

  React.useEffect(() => {
    if (!open) { draftLoadedRef.current = false; setDraftMeta(null); return }
    const draft = readDraft()
    if (draft?.formData) {
      draftLoadedRef.current = true
      setFormData({ ...draft.formData, startDate: new Date(draft.formData.startDate), endDate: new Date(draft.formData.endDate) })
      setSelectedVehicles(draft.selectedVehicles || [])
      setDraftMeta(draft.meta || null)
    } else {
      draftLoadedRef.current = false
      setDraftMeta(null)
      setSelectedVehicles([])
    }
  }, [open, readDraft])

  // A hidden Dialog stays mounted, so clear request/validation state whenever
  // it is closed. This prevents a previous 409 (or validation error) from
  // leaking into the next create attempt, even if the parent closes it.
  React.useEffect(() => {
    if (open) return
    setError(null)
    setCustomerErrors({})
    setIsSubmitting(false)
    setPickerModalOpen(false)
  }, [open])

  // senior dev: auto-populate the current user as a default internal participant
  const autoPopulatedRef = React.useRef(false)

  React.useEffect(() => {
    if (!open) { autoPopulatedRef.current = false; return }
    if (autoPopulatedRef.current) return
    if (draftLoadedRef.current) { autoPopulatedRef.current = true; return }
    if (!currentUser?.id) return
    autoPopulatedRef.current = true
    setFormData((prev) =>
      prev.participants.includes(currentUser.id)
        ? prev
        : { ...prev, participants: [...prev.participants, currentUser.id] }
    )
  }, [open, currentUser?.id])

  // ── Helpers ───────────────────────────────────────────────────────────────

  // senior dev: toggle customer booking and auto-set meeting type
  const handleToggleCustomerBooking = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      isCustomerBooking:  checked,
      type:               checked ? "test-drive" : "in-person",
      customTypeDetails:  "",
    }))
  }

  // senior dev: remove a vehicle from the selection
  const handleRemoveVehicle = (id: string) => {
    setSelectedVehicles((prev) => prev.filter((v) => v.id !== id))
  }

  // ── Validation ────────────────────────────────────────────────────────────

  const validateCustomerBooking = (): boolean => {
    if (!formData.isCustomerBooking) return true
    const errors: typeof customerErrors = {}
    let valid = true
    if (!formData.customerBooking.firstName.trim()) { errors.firstName = "First name is required"; valid = false }
    if (!formData.customerBooking.lastName.trim())  { errors.lastName  = "Last name is required";  valid = false }
    if (!formData.customerBooking.email.trim()) {
      errors.email = "Email is required"; valid = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerBooking.email)) {
      errors.email = "Invalid email format"; valid = false
    }
    if (!formData.customerBooking.phone.trim()) { errors.phone = "Phone number is required"; valid = false }
    setCustomerErrors(errors)
    return valid
  }

  const combineDateTime = (date: Date, timeString: string): string => {
    if (!timeString) return date.toISOString()
    const combined = new Date(date)
    const time = new Date(timeString)
    combined.setHours(time.getHours(), time.getMinutes(), 0, 0)
    return combined.toISOString()
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      if (formData.isCustomerBooking && !validateCustomerBooking()) {
        setError("Please fill in all customer information fields correctly")
        setIsSubmitting(false); return
      }
      if (!formData.startTime || !formData.endTime) {
        setError("Please select both start and end times")
        setIsSubmitting(false); return
      }

      const startDateTime = combineDateTime(formData.startDate, formData.startTime)
      const endDateTime   = combineDateTime(formData.endDate,   formData.endTime)

      if (new Date(endDateTime) <= new Date(startDateTime)) {
        setError("End time must be after start time"); setIsSubmitting(false); return
      }
      if (new Date(startDateTime) < new Date()) {
        setError("Cannot schedule in the past"); setIsSubmitting(false); return
      }
      if (!formData.isCustomerBooking && formData.participants.length === 0 && formData.guestEmails.length === 0) {
        setError("Please add at least one participant or guest"); setIsSubmitting(false); return
      }

      const resolvedEntryType    = entryTypeLock || formData.entryType
      const resolvedExtraPayload = extraPayload  || draftMeta?.extraPayload

      const appointmentData: Record<string, unknown> = {
        title:             formData.title,
        description:       formData.description       || undefined,
        startTime:         startDateTime,
        endTime:           endDateTime,
        location:          formData.location          || undefined,
        type:              formData.type,
        // senior dev: attach customTypeDetails when type is "other"
        customTypeDetails: formData.type === "other"
          ? formData.customTypeDetails.trim() || undefined
          : undefined,
        entryType:         resolvedEntryType,
        conversationId:    formData.conversationId    || undefined,
        participants:      formData.isCustomerBooking ? [] : formData.participants,
        guestEmails:       formData.isCustomerBooking ? [] : (formData.guestEmails.length > 0 ? formData.guestEmails : undefined),
        meetingLink:       formData.meetingLink       || undefined,
        notes:             formData.notes             || undefined,
        // senior dev: multiple vehicle IDs
        vehicleIds:        selectedVehicles.map((v) => v.id),
        ...(resolvedExtraPayload || {}),
      }

      if (formData.isCustomerBooking) {
        appointmentData.customerBooking = {
          firstName:         formData.customerBooking.firstName.trim(),
          lastName:          formData.customerBooking.lastName.trim(),
          email:             formData.customerBooking.email.toLowerCase().trim(),
          phone:             formData.customerBooking.phone.trim(),
          isCustomerBooking: true,
        }
      }

      await onCreateAppointment(appointmentData)
      onOpenChange(false)

      setFormData({
        title: "", description: "", startDate: new Date(), startTime: "", endDate: new Date(), endTime: "",
        location: "", type: "in-person", customTypeDetails: "", entryType: entryTypeLock || "appointment",
        conversationId: "", participants: [], guestEmails: [], meetingLink: "", notes: "",
        isCustomerBooking: false, customerBooking: { firstName: "", lastName: "", email: "", phone: "" },
      })
      setSelectedVehicles([])
      clearDraft()
      setError(null)
      setCustomerErrors({})
    } catch (err: any) {
      // Known scheduling conflicts are an expected business-rule response, not
      // an application crash. Keep the rejected request so this modal can show
      // the backend's actionable message, but avoid console.error because the
      // Next.js development overlay treats logged Axios errors as runtime errors.
      const requestErrorMessage = getAppointmentRequestErrorMessage(err)
      if (!isExpectedAppointmentSchedulingConflict(err, requestErrorMessage)) {
        console.error("Failed to create appointment:", err)
      }
      setError(requestErrorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      clearDraft()
      setError(null)
      setCustomerErrors({})
      setIsSubmitting(false)
      setPickerModalOpen(false)
      setSelectedVehicles([])
      setDraftMeta(null)
      setFormData({
        title: "", description: "", startDate: new Date(), startTime: "", endDate: new Date(), endTime: "",
        location: "", type: "in-person", customTypeDetails: "", entryType: entryTypeLock || "appointment",
        conversationId: "", participants: [], guestEmails: [], meetingLink: "", notes: "",
        isCustomerBooking: false, customerBooking: { firstName: "", lastName: "", email: "", phone: "" },
      })
    }
    onOpenChange(nextOpen)
  }

  const entryLabel = (entryTypeLock || formData.entryType).charAt(0).toUpperCase() +
    (entryTypeLock || formData.entryType).slice(1)
  const errorPresentation = error ? getAppointmentErrorPresentation(error) : null

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-2xl max-h-[90dvh] overflow-hidden p-0 gap-0 z-200">

          {/* ── Header ── */}
          <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-border bg-muted/20">
            <DialogHeader>
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <CalendarPlus className="h-4 w-4 text-primary" />
                </div>
                <DialogTitle className="text-lg font-bold">
                  Schedule New {entryLabel}
                </DialogTitle>
              </div>
            </DialogHeader>
          </div>

          {/* ── Scrollable body ── */}
          <div className="overflow-y-auto max-h-[calc(90dvh-130px)] modal-scrollbar px-4 sm:px-6 py-5">
            <form id="create-apt-form" onSubmit={handleSubmit} className="space-y-0">

              {errorPresentation && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="mb-4 w-full rounded-xl border border-destructive/35 bg-destructive/10 p-4 text-left"
                >
                  <div className="flex w-full items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/15 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-5 text-destructive">
                        {errorPresentation.title}
                      </p>
                      <p className="mt-1 w-full whitespace-normal break-words text-sm leading-6 text-foreground">
                        {errorPresentation.message}
                      </p>
                      {errorPresentation.hint && (
                        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                          {errorPresentation.hint}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Entry Type ── */}
              <FormSection title="Entry Type" icon={<Calendar className="size-3.5" />}>
                {entryTypeLock ? (
                  <Badge variant="secondary" className="capitalize px-3 py-1 text-sm font-medium">
                    {entryTypeLock.replace("-", " ")}
                  </Badge>
                ) : (
                  <div className="flex gap-1 rounded-xl border bg-muted/50 p-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {ENTRY_TYPES.map(({ id, label, color }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setFormData({ ...formData, entryType: id })}
                        className={cn(
                          "flex-1 min-w-fit rounded-lg px-2 py-1.5 text-xs sm:text-sm font-medium transition-all whitespace-nowrap",
                          formData.entryType === id
                            ? `bg-card shadow-sm ring-1 ring-border/60 ${color}`
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </FormSection>

              {/* ── Customer Booking toggle ── */}
              {formData.entryType === "appointment" && (
                <FormSection title="Booking Type" icon={<Users className="size-3.5" />}>
                  <CustomerBookingForm
                    isCustomerBooking={formData.isCustomerBooking}
                    onToggle={handleToggleCustomerBooking}
                    customerData={formData.customerBooking}
                    onChange={(field, value) =>
                      setFormData({ ...formData, customerBooking: { ...formData.customerBooking, [field]: value } })
                    }
                    errors={customerErrors}
                  />
                </FormSection>
              )}

              {/* ── Basic Info ── */}
              <FormSection title="Basic Info" icon={<StickyNote className="size-3.5" />}>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="title" required>Title</FieldLabel>
                  <Input
                    id="title"
                    placeholder={
                      formData.entryType === "appointment" ? "e.g. Vehicle Inspection" :
                      formData.entryType === "event"       ? "e.g. Team Meeting"       :
                      formData.entryType === "task"        ? "e.g. Complete Report"    :
                      "e.g. Call Client"
                    }
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="description">Description</FieldLabel>
                  <Textarea
                    id="description"
                    placeholder="Add details or agenda…"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </FormSection>

              {/* ── Vehicles (senior dev: multiple, inline picker) ── */}
              <FormSection title="Vehicles" icon={<Car className="size-3.5" />}>
                <div className="space-y-2">
                  {selectedVehicles.map((vehicle) => (
                    <div key={vehicle.id} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5 text-sm">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Car className="h-4 w-4 shrink-0 text-primary" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                          <p className="text-xs text-muted-foreground">Stock #{vehicle.stockNumber}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveVehicle(vehicle.id)}
                        className="ml-2 shrink-0 h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        aria-label="Remove vehicle"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setPickerModalOpen(true)}
                    className="w-full rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-left transition-all hover:border-primary/50 hover:bg-muted/40"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">
                          {selectedVehicles.length > 0 ? "Add more vehicles" : "Add vehicles"}
                        </p>
                        <p className="text-xs text-muted-foreground">Browse inventory and add cars to this appointment</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0">Browse</Badge>
                    </div>
                  </button>
                </div>
              </FormSection>

              {/* ── Schedule ── */}
              <FormSection title="Schedule" icon={<Clock className="size-3.5" />}>
                <div className="grid grid-cols-1 xxs:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <FieldLabel required>Start Date</FieldLabel>
                    <DatePicker
                      value={formData.startDate}
                      onChange={(date) => date && setFormData({ ...formData, startDate: date })}
                      disablePastDates
                    />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel required>Start Time</FieldLabel>
                    <TimePicker
                      value={formData.startTime}
                      onChange={(time) => setFormData({ ...formData, startTime: time })}
                      placeholder="Select start time"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel required>End Date</FieldLabel>
                    <DatePicker
                      value={formData.endDate}
                      onChange={(date) => date && setFormData({ ...formData, endDate: date })}
                      disablePastDates
                    />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel required>End Time</FieldLabel>
                    <TimePicker
                      value={formData.endTime}
                      onChange={(time) => setFormData({ ...formData, endTime: time })}
                      placeholder="Select end time"
                    />
                  </div>
                </div>
              </FormSection>

              {/* ── Participants & Guests ── */}
              {!formData.isCustomerBooking && (
                <FormSection title="Participants & Guests" icon={<Users className="size-3.5" />}>
                  <UserSearch
                    selectedUsers={formData.participants}
                    onSelectUsers={(ids) => setFormData({ ...formData, participants: ids })}
                    label="Internal Participants (Registered Users)"
                    placeholder="Search and select participants…"
                    multiple
                    knownUsers={currentUser ? [{
                      _id:      currentUser.id,
                      name:     currentUser.fullName,
                      fullName: currentUser.fullName,
                      email:    currentUser.primaryEmailAddress?.emailAddress || "",
                      avatar:   currentUser.imageUrl,
                    }] : []}
                  />
                  <GuestEmailInput
                    emails={formData.guestEmails}
                    onChange={(emails) => setFormData({ ...formData, guestEmails: emails })}
                  />
                </FormSection>
              )}

              {/* ── Meeting Details ── */}
              <FormSection title="Meeting Details" icon={<MapPin className="size-3.5" />}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <FieldLabel htmlFor="type">Meeting Type</FieldLabel>
                    {/* senior dev: customer bookings get extra types (test-drive, meeting) */}
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value, customTypeDetails: "" })}
                    >
                      <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                      <SelectContent className="z-300">
                        {formData.isCustomerBooking ? (
                          <>
                            <SelectItem value="test-drive">Test Drive</SelectItem>
                            <SelectItem value="meeting">Meeting</SelectItem>
                            <SelectItem value="in-person">In-Person</SelectItem>
                            <SelectItem value="video">Video Call</SelectItem>
                            <SelectItem value="phone">Phone Call</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
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
                  </div>

                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <FieldLabel htmlFor="location">Location</FieldLabel>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="location"
                        placeholder="Address or meeting room"
                        className="pl-9"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* senior dev: custom type details when "other" is selected */}
                {formData.type === "other" && (
                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="customTypeDetails" required>Specify Meeting Type</FieldLabel>
                    <Input
                      id="customTypeDetails"
                      placeholder="e.g. At Customer Showroom, Roadside Assist…"
                      value={formData.customTypeDetails}
                      onChange={(e) => setFormData({ ...formData, customTypeDetails: e.target.value })}
                      required
                    />
                  </div>
                )}

                {formData.type === "video" && (
                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="meetingLink">Meeting Link</FieldLabel>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="meetingLink"
                        type="url"
                        placeholder="https://zoom.us/j/… or Google Meet"
                        className="pl-9"
                        value={formData.meetingLink}
                        onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </FormSection>

              {/* ── Additional ── */}
              <FormSection title="Additional" icon={<StickyNote className="size-3.5" />}>
                {!formData.isCustomerBooking && (
                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="conversation">Link to Conversation</FieldLabel>
                    <Select
                      value={formData.conversationId || "none"}
                      onValueChange={(value) =>
                        setFormData({ ...formData, conversationId: value === "none" ? "" : value })
                      }
                    >
                      <SelectTrigger id="conversation">
                        <SelectValue placeholder="Select a conversation" />
                      </SelectTrigger>
                      <SelectContent className="z-300">
                        <SelectItem value="none">None</SelectItem>
                        {conversations.map((conv) => (
                          <SelectItem key={conv._id} value={conv._id}>
                            {conv.type === "group"
                              ? conv.name
                              : `Chat with ${conv.participants[0]?.fullName || conv.participants[0]?.name}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="notes">Notes</FieldLabel>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes or agenda items…"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </FormSection>

            </form>
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4 bg-muted/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-apt-form"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90 gap-1.5 min-w-35"
            >
              {isSubmitting ? (
                <><Loader2 className="size-4 animate-spin" /> Creating…</>
              ) : (
                <><CalendarPlus className="size-4" /> Create {entryLabel}</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* senior dev: inline VehiclePickerModal (replaces page navigation) */}
      <VehiclePickerModal
        open={pickerModalOpen}
        onOpenChange={setPickerModalOpen}
        initialSelectedVehicles={selectedVehicles}
        onConfirmSelection={(vehicles) => setSelectedVehicles(vehicles)}
      />
    </>
  )
}
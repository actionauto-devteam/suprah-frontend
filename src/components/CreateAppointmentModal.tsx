"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, MapPin, Link as LinkIcon, Loader2, Car, X } from "lucide-react"
import { Conversation, EntryType } from "@/types/appointment"
import { UserSearch } from "@/components/UserSearch"
import { GuestEmailInput } from "@/components/GuestEmailInput"
import { CustomerBookingForm } from "@/components/CustomerBookingForm"
import { DatePicker } from "@/components/ui/date-picker"
import { TimePicker } from "@/components/ui/time-picker"
import type { Vehicle } from "@/types/inventory"

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

const DRAFT_STORAGE_KEY = 'crm-appointment-draft'

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
    customerBooking: {
      firstName: string
      lastName: string
      email: string
      phone: string
    }
  }
  selectedVehicles?: Vehicle[]
  meta?: {
    initialCustomerBooking?: {
      firstName?: string
      lastName?: string
      email?: string
      phone?: string
    }
    forceCustomerBooking?: boolean
    extraPayload?: Record<string, unknown>
  }
}

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
  entryTypeLock
}: CreateAppointmentModalProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    startDate: preselectedDate || new Date(),
    startTime: '',
    endDate: preselectedDate || new Date(),
    endTime: '',
    location: '',
    type: 'in-person',
    customTypeDetails: '',
    entryType: entryTypeLock || 'appointment',
    conversationId: preselectedConversation || '',
    participants: [] as string[],
    guestEmails: [] as string[],
    meetingLink: '',
    notes: '',
    isCustomerBooking: false,
    customerBooking: {
      firstName: '',
      lastName: '',
      email: '',
      phone: ''
    }
  })

  const [customerErrors, setCustomerErrors] = React.useState<Record<string, string>>({})
  const [selectedVehicles, setSelectedVehicles] = React.useState<Vehicle[]>([])
  const [draftMeta, setDraftMeta] = React.useState<AppointmentDraft['meta'] | null>(null)
  const draftLoadedRef = React.useRef(false)

  React.useEffect(() => {
    if (draftLoadedRef.current) return
    if (preselectedDate) {
      setFormData(prev => ({
        ...prev,
        startDate: preselectedDate,
        endDate: preselectedDate
      }))
    }
  }, [preselectedDate])

  React.useEffect(() => {
    if (draftLoadedRef.current) return
    if (preselectedConversation) {
      setFormData(prev => ({
        ...prev,
        conversationId: preselectedConversation
      }))
    }
  }, [preselectedConversation])

  React.useEffect(() => {
    if (!open) return
    if (draftLoadedRef.current) return
    if (!initialCustomerBooking && !forceCustomerBooking) return

    setFormData(prev => ({
      ...prev,
      isCustomerBooking: forceCustomerBooking || prev.isCustomerBooking,
      type: (forceCustomerBooking || prev.isCustomerBooking) ? 'test-drive' : prev.type,
      customerBooking: {
        firstName: initialCustomerBooking?.firstName || prev.customerBooking.firstName,
        lastName: initialCustomerBooking?.lastName || prev.customerBooking.lastName,
        email: initialCustomerBooking?.email || prev.customerBooking.email,
        phone: initialCustomerBooking?.phone || prev.customerBooking.phone
      }
    }))
  }, [open, initialCustomerBooking, forceCustomerBooking])

  React.useEffect(() => {
    if (!entryTypeLock) return
    setFormData(prev => ({ ...prev, entryType: entryTypeLock }))
  }, [entryTypeLock])

  const readDraft = React.useCallback((): AppointmentDraft | null => {
    if (typeof window === 'undefined') return null
    const stored = sessionStorage.getItem(DRAFT_STORAGE_KEY)
    if (!stored) return null

    try {
      const parsed = JSON.parse(stored) as AppointmentDraft
      if (!parsed?.formData) return null
      return parsed
    } catch {
      return null
    }
  }, [])

  const clearDraft = React.useCallback(() => {
    if (typeof window === 'undefined') return
    sessionStorage.removeItem(DRAFT_STORAGE_KEY)
    draftLoadedRef.current = false
  }, [])

  const saveDraft = React.useCallback((resume: boolean) => {
    if (typeof window === 'undefined') return
    const draft: AppointmentDraft = {
      version: 1,
      resume,
      formData: {
        ...formData,
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
      },
      selectedVehicles,
      meta: {
        initialCustomerBooking,
        forceCustomerBooking,
        extraPayload
      }
    }

    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
  }, [formData, selectedVehicles, initialCustomerBooking, forceCustomerBooking, extraPayload])

  React.useEffect(() => {
    if (!open) {
      draftLoadedRef.current = false
      setDraftMeta(null)
      return
    }

    const draft = readDraft()
    if (draft?.formData) {
      draftLoadedRef.current = true
      setFormData({
        ...draft.formData,
        startDate: new Date(draft.formData.startDate),
        endDate: new Date(draft.formData.endDate)
      })
      setSelectedVehicles(draft.selectedVehicles || [])
      setDraftMeta(draft.meta || null)
    } else {
      draftLoadedRef.current = false
      setDraftMeta(null)
      setSelectedVehicles([])
    }
  }, [open, readDraft])

  const validateCustomerBooking = (): boolean => {
    if (!formData.isCustomerBooking) return true

    const errors: Record<string, string> = {}
    let isValid = true

    if (!formData.customerBooking.firstName.trim()) {
      errors.firstName = 'First name is required'
      isValid = false
    }

    if (!formData.customerBooking.lastName.trim()) {
      errors.lastName = 'Last name is required'
      isValid = false
    }

    if (!formData.customerBooking.email.trim()) {
      errors.email = 'Email is required'
      isValid = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerBooking.email)) {
      errors.email = 'Invalid email format'
      isValid = false
    }

    if (!formData.customerBooking.phone.trim()) {
      errors.phone = 'Phone number is required'
      isValid = false
    }

    setCustomerErrors(errors)
    return isValid
  }

  const combineDateTime = (date: Date, timeString: string): string => {
    if (!timeString) return date.toISOString()

    const combined = new Date(date)
    const time = new Date(timeString)
    combined.setHours(time.getHours(), time.getMinutes(), 0, 0)
    return combined.toISOString()
  }

  const handleToggleCustomerBooking = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      isCustomerBooking: checked,
      type: checked ? 'test-drive' : 'in-person',
      customTypeDetails: ''
    }))
  }

  const handleRemoveVehicle = (id: string) => {
    setSelectedVehicles(prev => prev.filter(v => v.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      if (formData.isCustomerBooking && !validateCustomerBooking()) {
        setError('Please fill in all customer information fields correctly')
        setIsSubmitting(false)
        return
      }

      if (!formData.startTime || !formData.endTime) {
        setError('Please select both start and end times')
        setIsSubmitting(false)
        return
      }

      const startDateTime = combineDateTime(formData.startDate, formData.startTime)
      const endDateTime = combineDateTime(formData.endDate, formData.endTime)

      if (new Date(endDateTime) <= new Date(startDateTime)) {
        setError('End time must be after start time')
        setIsSubmitting(false)
        return
      }

      if (new Date(startDateTime) < new Date()) {
        setError('Cannot schedule in the past')
        setIsSubmitting(false)
        return
      }

      if (!formData.isCustomerBooking && formData.participants.length === 0 && formData.guestEmails.length === 0) {
        setError('Please add at least one participant or guest')
        setIsSubmitting(false)
        return
      }

      const resolvedEntryType = entryTypeLock || formData.entryType
      const resolvedExtraPayload = extraPayload || draftMeta?.extraPayload

      const appointmentData: Record<string, unknown> = {
        title: formData.title,
        description: formData.description || undefined,
        startTime: startDateTime,
        endTime: endDateTime,
        location: formData.location || undefined,
        type: formData.type,
        customTypeDetails: formData.type === 'other' ? formData.customTypeDetails.trim() : undefined,
        entryType: resolvedEntryType,
        conversationId: formData.conversationId || undefined,
        participants: formData.isCustomerBooking ? [] : formData.participants,
        guestEmails: formData.isCustomerBooking ? [] : (formData.guestEmails.length > 0 ? formData.guestEmails : undefined),
        meetingLink: formData.meetingLink || undefined,
        notes: formData.notes || undefined,
        vehicleIds: selectedVehicles.map(v => v.id),
        ...(resolvedExtraPayload || {})
      }

      if (formData.isCustomerBooking) {
        appointmentData.customerBooking = {
          firstName: formData.customerBooking.firstName.trim(),
          lastName: formData.customerBooking.lastName.trim(),
          email: formData.customerBooking.email.toLowerCase().trim(),
          phone: formData.customerBooking.phone.trim(),
          isCustomerBooking: true
        }
      }

      await onCreateAppointment(appointmentData)
      onOpenChange(false)

      setFormData({
        title: '',
        description: '',
        startDate: new Date(),
        startTime: '',
        endDate: new Date(),
        endTime: '',
        location: '',
        type: 'in-person',
        customTypeDetails: '',
        entryType: entryTypeLock || 'appointment',
        conversationId: '',
        participants: [],
        guestEmails: [],
        meetingLink: '',
        notes: '',
        isCustomerBooking: false,
        customerBooking: {
          firstName: '',
          lastName: '',
          email: '',
          phone: ''
        }
      })
      setSelectedVehicles([])
      clearDraft()
      setError(null)
      setCustomerErrors({})
    } catch (error: any) {
      console.error('Failed to create appointment:', error)
      setError(error.message || 'Failed to create appointment. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) clearDraft()
    onOpenChange(nextOpen)
  }

  const handleOpenVehiclePicker = () => {
    saveDraft(true)
    const search = searchParams.toString()
    const returnTo = `${pathname}${search ? `?${search}` : ''}`
    router.push(`/crm/appointments/vehicle-picker?returnTo=${encodeURIComponent(returnTo)}`)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 z-[200]">
          <div className="max-h-[90vh] overflow-y-auto modal-scrollbar p-6">
            <DialogHeader>
              <DialogTitle>Schedule New {formData.entryType.charAt(0).toUpperCase() + formData.entryType.slice(1)}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {entryTypeLock ? (
                <div className="space-y-2">
                  <Label>Entry Type *</Label>
                  <div>
                    <Badge variant="secondary" className="capitalize">
                      {entryTypeLock.replace('-', ' ')}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Entry Type *</Label>
                  <Tabs
                    value={formData.entryType}
                    onValueChange={(value) => setFormData({ ...formData, entryType: value as EntryType })}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="appointment">Appointment</TabsTrigger>
                      <TabsTrigger value="event">Event</TabsTrigger>
                      <TabsTrigger value="task">Task</TabsTrigger>
                      <TabsTrigger value="reminder">Reminder</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              )}

              {formData.entryType === 'appointment' && (
                <CustomerBookingForm
                  isCustomerBooking={formData.isCustomerBooking}
                  onToggle={handleToggleCustomerBooking}
                  customerData={formData.customerBooking}
                  onChange={(field, value) =>
                    setFormData({
                      ...formData,
                      customerBooking: { ...formData.customerBooking, [field]: value }
                    })
                  }
                  errors={customerErrors}
                />
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder={`e.g., ${formData.entryType === 'appointment' ? 'Vehicle Inspection' :
                    formData.entryType === 'event' ? 'Team Meeting' :
                      formData.entryType === 'task' ? 'Complete Report' :
                        'Call Client'
                    }`}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Add details..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Vehicles Selected ({selectedVehicles.length})</Label>
                </div>
                <div className="space-y-2">
                  {selectedVehicles.map(vehicle => (
                    <div key={vehicle.id} className="flex items-center justify-between p-2 border rounded-lg bg-muted/40 text-sm">
                      <div className="flex items-center gap-3 truncate">
                        <Car className="h-4 w-4 shrink-0 text-emerald-500" />
                        <span className="font-medium truncate">{vehicle.year} {vehicle.make} {vehicle.model}</span>
                        <span className="text-xs text-muted-foreground">Stock #{vehicle.stockNumber}</span>
                      </div>
                      <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleRemoveVehicle(vehicle.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleOpenVehiclePicker}
                    className="w-full rounded-lg border border-dashed border-border bg-muted/20 px-3 py-3 text-left transition hover:border-emerald-400 hover:bg-muted/40 flex items-center justify-between gap-3 h-auto"
                  >
                    <div>
                      <p className="text-sm font-medium">Add or manage selected vehicles</p>
                      <p className="text-xs text-muted-foreground">Browse inventory and add multiple cars to this appointment</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">Browse Inventory</Badge>
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <DatePicker
                    value={formData.startDate}
                    onChange={(date) => date && setFormData({ ...formData, startDate: date })}
                    disablePastDates={true}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Start Time *</Label>
                  <TimePicker
                    value={formData.startTime}
                    onChange={(time) => setFormData({ ...formData, startTime: time })}
                    placeholder="Select start time"
                  />
                </div>

                <div className="space-y-2">
                  <Label>End Date *</Label>
                  <DatePicker
                    value={formData.endDate}
                    onChange={(date) => date && setFormData({ ...formData, endDate: date })}
                    disablePastDates={true}
                  />
                </div>

                <div className="space-y-2">
                  <Label>End Time *</Label>
                  <TimePicker
                    value={formData.endTime}
                    onChange={(time) => setFormData({ ...formData, endTime: time })}
                    placeholder="Select end time"
                  />
                </div>
              </div>

              {!formData.isCustomerBooking && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-medium">Participants & Guests</h3>

                  <UserSearch
                    selectedUsers={formData.participants}
                    onSelectUsers={(userIds) => setFormData({ ...formData, participants: userIds })}
                    label="Internal Participants (Registered Users)"
                    placeholder="Search and select participants..."
                    multiple={true}
                  />

                  <GuestEmailInput
                    emails={formData.guestEmails}
                    onChange={(emails) => setFormData({ ...formData, guestEmails: emails })}
                  />
                </div>
              )}

              <div className="space-y-4 border-t pt-4">
                <h3 className="font-medium">Meeting Details</h3>

                <div className="space-y-2">
                  <Label htmlFor="type">Meeting Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value, customTypeDetails: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[300]">
                      {formData.isCustomerBooking ? (
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
                </div>

                {formData.type === 'other' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                    <Label htmlFor="customTypeDetails">Specify Dynamic Meeting Type Details *</Label>
                    <Input
                      id="customTypeDetails"
                      placeholder="e.g., At Customer Showroom Setup"
                      value={formData.customTypeDetails}
                      onChange={(e) => setFormData({ ...formData, customTypeDetails: e.target.value })}
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="location"
                      placeholder="Meeting location or address"
                      className="pl-10"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>
                </div>

                {formData.type === 'video' && (
                  <div className="space-y-2">
                    <Label htmlFor="meetingLink">Meeting Link</Label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="meetingLink"
                        type="url"
                        placeholder="https://zoom.us/j/... or Google Meet link"
                        className="pl-10"
                        value={formData.meetingLink}
                        onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4 border-t pt-4">
                {!formData.isCustomerBooking && (
                  <div className="space-y-2">
                    <Label htmlFor="conversation">Link to Conversation (Optional)</Label>
                    <Select
                      value={formData.conversationId || 'none'}
                      onValueChange={(value) => {
                        setFormData({ ...formData, conversationId: value === 'none' ? '' : value })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a conversation" />
                      </SelectTrigger>
                      <SelectContent className="z-[300]">
                        <SelectItem value="none">None</SelectItem>
                        {conversations.map((conv) => (
                          <SelectItem key={conv._id} value={conv._id}>
                            {conv.type === 'group' ? conv.name : `Chat with ${conv.participants[0]?.fullName || conv.participants[0]?.name}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes or agenda items..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end border-t pt-4">
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
                  disabled={isSubmitting}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    `Create ${formData.entryType.charAt(0).toUpperCase() + formData.entryType.slice(1)}`
                  )}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
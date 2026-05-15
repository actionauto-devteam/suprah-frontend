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
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  Phone,
  Mail,
  Edit2,
  Save,
  X,
  Trash2,
  Ban,
  CheckCircle,
  AlertCircle,
  Link as LinkIcon,
  RefreshCw,
  Car
} from "lucide-react"
import { Appointment } from "@/types/appointment"
import { format } from "date-fns"
import { useUser } from "@/providers/AuthProvider"
import { DatePicker } from "@/components/ui/date-picker"
import { TimePicker } from "@/components/ui/time-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserSearch } from "@/components/UserSearch"
import { GuestEmailInput } from "@/components/GuestEmailInput"
import { useAppointmentPolling } from "@/hooks/useAppointmentPolling"
import { useNotifications } from "@/context/NotificationContext"

interface AppointmentDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment: Appointment | null
  onUpdate?: (id: string, data: any) => Promise<void>
  onCancel?: (id: string) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

export function AppointmentDetailsModal({
  open,
  onOpenChange,
  appointment: initialAppointment,
  onUpdate,
  onCancel,
  onDelete
}: AppointmentDetailsModalProps) {
  const { user: currentUser } = useUser()
  const { fetchNotifications } = useNotifications()
  const [appointment, setAppointment] = React.useState<Appointment | null>(initialAppointment)
  const [isEditing, setIsEditing] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [editData, setEditData] = React.useState<any>({})

  const handleAppointmentUpdate = React.useCallback((updatedAppointment: Appointment) => {
    console.log('[AppointmentDetailsModal] Received appointment update');
    setAppointment(updatedAppointment);
    fetchNotifications();
  }, [fetchNotifications]);

  useAppointmentPolling({
    appointmentId: appointment?._id || null,
    onUpdate: handleAppointmentUpdate,
    enabled: open && !isEditing,
    intervalMs: 10000,
  });

  React.useEffect(() => {
    if (initialAppointment) {
      setAppointment(initialAppointment);
    }
  }, [initialAppointment]);

  const isRegisteredParticipant = React.useMemo(() => {
    if (!currentUser?.id || !appointment?.participants) return false

    const currentUserId = currentUser.id
    const currentUserEmail = currentUser.primaryEmailAddress?.emailAddress || currentUser.emailAddresses?.[0]?.emailAddress

    return appointment.participants.some(participant => {
      const participantId = participant._id || ''
      const participantEmail = participant.email || ''

      return (
        String(participantId) === String(currentUserId) ||
        (participantEmail && currentUserEmail && participantEmail.toLowerCase() === currentUserEmail.toLowerCase())
      )
    })
  }, [currentUser, appointment])

  const isCreator = React.useMemo(() => {
    if (!currentUser?.id || !appointment?.createdBy) {
      return false
    }

    const createdBy = appointment.createdBy
    const creatorId = createdBy._id || ''
    const creatorEmail = createdBy.email || ''

    const currentUserId = currentUser.id
    const currentUserEmail = currentUser.primaryEmailAddress?.emailAddress || currentUser.emailAddresses?.[0]?.emailAddress

    if (String(creatorId) === String(currentUserId)) return true

    if (currentUserEmail && creatorEmail && currentUserEmail.toLowerCase() === creatorEmail.toLowerCase()) {
      return true
    }

    return false
  }, [currentUser, appointment])

  const canEdit = isCreator || isRegisteredParticipant
  const canCancel = isCreator && (appointment?.status !== 'cancelled')
  const canDelete = isCreator

  React.useEffect(() => {
    if (appointment) {
      setEditData({
        title: appointment.title,
        description: appointment.description || '',
        startDate: new Date(appointment.startTime),
        startTime: appointment.startTime,
        endDate: new Date(appointment.endTime),
        endTime: appointment.endTime,
        location: appointment.location || '',
        type: appointment.type,
        customTypeDetails: (appointment as any).customTypeDetails || '',
        status: appointment.status,
        meetingLink: appointment.meetingLink || '',
        notes: appointment.notes || '',
        outcomeNotes: appointment.outcomeNotes || '',
        participants: appointment.participants.map(p => p._id),
        guestEmailsData: appointment.guestEmails || [],
        guestEmails: appointment.guestEmails?.map(g => {
          if (typeof g === 'string') return g
          if (typeof g === 'object' && g.email) return g.email
          return ''
        }).filter(Boolean) || []
      })
      setIsEditing(false)
      setError(null)
    }
  }, [appointment])

  if (!appointment) return null

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="size-4" />
      case 'phone': return <Phone className="size-4" />
      case 'in-person': return <MapPin className="size-4" />
      default: return <Calendar className="size-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
      case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
      case 'completed': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
      case 'no-show': return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  const getEntryTypeColor = (entryType: string) => {
    switch (entryType) {
      case 'appointment': return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
      case 'event': return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
      case 'task': return 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
      case 'reminder': return 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  const handleSave = async () => {
    if (!onUpdate) return
    setIsSubmitting(true)
    setError(null)

    try {
      const startDateTime = new Date(editData.startDate)
      const startTime = new Date(editData.startTime)
      startDateTime.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0)

      const endDateTime = new Date(editData.endDate)
      const endTime = new Date(editData.endTime)
      endDateTime.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0)

      if (endDateTime <= startDateTime) {
        setError('End time must be after start time')
        setIsSubmitting(false)
        return
      }

      if (editData.participants.length === 0 && editData.guestEmails.length === 0 && !appointment.customerBooking) {
        setError('At least one participant or guest is required')
        setIsSubmitting(false)
        return
      }

      if (['completed', 'no-show'].includes(editData.status) && !editData.outcomeNotes?.trim()) {
        setError(`Outcome notes are required when marking as ${editData.status.replace('-', ' ')}`)
        setIsSubmitting(false)
        return
      }

      const formattedGuestEmails = editData.guestEmails.length > 0
        ? editData.guestEmails.map((email: string) => {
          const existingGuest = editData.guestEmailsData?.find((g: any) => g.email === email)
          if (existingGuest) return existingGuest
          return { email, status: 'pending' }
        })
        : undefined

      await onUpdate(appointment._id, {
        title: editData.title,
        description: editData.description || undefined,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        location: editData.location || undefined,
        type: editData.type,
        customTypeDetails: editData.type === 'other' ? editData.customTypeDetails : undefined,
        meetingLink: editData.meetingLink || undefined,
        notes: editData.notes || undefined,
        status: editData.status,
        outcomeNotes: editData.outcomeNotes || undefined,
        participants: editData.participants,
        guestEmails: formattedGuestEmails
      })

      setIsEditing(false)
      setError(null)
    } catch (error: any) {
      setError(error.message || 'Failed to update')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = async () => {
    if (!onCancel) return
    if (!confirm('Are you sure you want to cancel this appointment?')) return

    setIsSubmitting(true)
    try {
      await onCancel(appointment._id)
      onOpenChange(false)
    } catch (error: any) {
      setError(error.message || 'Failed to cancel')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    if (!confirm('Are you sure you want to delete this appointment? This action cannot be undone.')) return

    setIsSubmitting(true)
    try {
      await onDelete(appointment._id)
      onOpenChange(false)
    } catch (error: any) {
      setError(error.message || 'Failed to delete')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resolvedDisplayType = appointment.type === 'other' && (appointment as any).customTypeDetails
    ? (appointment as any).customTypeDetails
    : appointment.type;

  // Local escape hatch casting configuration to seamlessly avoid compilation mismatches
  const customer = appointment.customerBooking as any;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto z-[250]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {isEditing ? 'Edit ' : ''}
              {appointment.entryType.charAt(0).toUpperCase() + appointment.entryType.slice(1)} Details
            </DialogTitle>
            <div className="flex gap-2 items-center">
              <Badge className={getEntryTypeColor(appointment.entryType || 'appointment')}>{appointment.entryType}</Badge>
              <Badge className={getStatusColor(appointment.status || 'scheduled')}>{appointment.status}</Badge>
              {!isEditing && <RefreshCw className="size-4 text-muted-foreground animate-pulse" />}
            </div>
          </div>
          <DialogDescription className="sr-only">
            View and manage specific client appointment files details context.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Title</Label>
            {isEditing ? (
              <Input value={editData.title} onChange={(e) => setEditData({ ...editData, title: e.target.value })} />
            ) : (
              <p className="text-lg font-semibold">{appointment.title}</p>
            )}
          </div>

          {(isEditing || appointment.description) && (
            <div className="space-y-2">
              <Label>Description</Label>
              {isEditing ? (
                <Textarea value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} rows={3} />
              ) : (
                <p className="text-muted-foreground">{appointment.description}</p>
              )}
            </div>
          )}

          {/* List of Multiple Selected Vehicles Display Context Section */}
          <div className="p-4 border rounded-xl bg-card space-y-3">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <Car className="h-4 w-4 text-emerald-500" /> Complete Selected Vehicles
            </h4>
            {((appointment as any).vehicleIds && (appointment as any).vehicleIds.length > 0) ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(appointment as any).vehicleIds.map((vehicle: any) => (
                  <div key={vehicle._id || vehicle.id} className="p-3 border rounded-lg bg-muted/20 flex gap-3 text-xs">
                    {vehicle.image && <img src={vehicle.image} alt="" className="w-16 h-12 object-cover rounded shrink-0 bg-muted" />}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="font-semibold truncate">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                      <p className="text-muted-foreground text-[11px]">Stock: #{vehicle.stockNumber}</p>
                      {vehicle.price && <p className="text-emerald-600 font-bold">${vehicle.price.toLocaleString()}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No vehicles attached to this operational appointment setup context.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Calendar className="size-4" /> Start</Label>
              {isEditing ? (
                <div className="space-y-2">
                  <DatePicker value={editData.startDate} onChange={(d) => d && setEditData({ ...editData, startDate: d })} />
                  <TimePicker value={editData.startTime} onChange={(t) => setEditData({ ...editData, startTime: t })} />
                </div>
              ) : (
                <p className="text-sm">{format(new Date(appointment.startTime), 'PPP')}<br /><span className="text-muted-foreground">{format(new Date(appointment.startTime), 'p')}</span></p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Clock className="size-4" /> End</Label>
              {isEditing ? (
                <div className="space-y-2">
                  <DatePicker value={editData.endDate} onChange={(d) => d && setEditData({ ...editData, endDate: d })} />
                  <TimePicker value={editData.endTime} onChange={(t) => setEditData({ ...editData, endTime: t })} />
                </div>
              ) : (
                <p className="text-sm">{format(new Date(appointment.endTime), 'PPP')}<br /><span className="text-muted-foreground">{format(new Date(appointment.endTime), 'p')}</span></p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type of Appointment</Label>
              {isEditing ? (
                <div className="space-y-2">
                  <Select value={editData.type} onValueChange={(v) => setEditData({ ...editData, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="z-[300]">
                      {appointment.customerBooking ? (
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
                  {editData.type === 'other' && (
                    <Input placeholder="Specify meeting details" value={editData.customTypeDetails} onChange={(e) => setEditData({ ...editData, customTypeDetails: e.target.value })} required />
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 capitalize text-sm font-medium">
                  {getTypeIcon(appointment.type)}
                  <span>{resolvedDisplayType?.replace('-', ' ')}</span>
                </div>
              )}
            </div>

            {(isEditing || appointment.location) && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><MapPin className="size-4" /> Location</Label>
                {isEditing ? (
                  <Input value={editData.location} onChange={(e) => setEditData({ ...editData, location: e.target.value })} />
                ) : (
                  <p className="text-sm">{appointment.location}</p>
                )}
              </div>
            )}
          </div>

          {isEditing && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-[300]">
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="no-show">No-Show</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {(isEditing || appointment.meetingLink) && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><LinkIcon className="size-4" /> Meeting Link</Label>
              {isEditing ? (
                <Input type="url" value={editData.meetingLink} onChange={(e) => setEditData({ ...editData, meetingLink: e.target.value })} />
              ) : (
                <a href={appointment.meetingLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">
                  {appointment.meetingLink}
                </a>
              )}
            </div>
          )}

          {!appointment.customerBooking && (
            <>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Users className="size-4" /> Participants ({isEditing ? editData.participants.length : appointment.participants.length})</Label>
                {isEditing ? (
                  <UserSearch selectedUsers={editData.participants} onSelectUsers={(ids) => setEditData({ ...editData, participants: ids })} label="" placeholder="Search..." multiple={true} />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {appointment.participants.map((p) => (
                      <Badge key={p._id} variant="outline" className="gap-2">
                        {p.avatar ? <img src={p.avatar} alt="" className="size-4 rounded-full" /> : <div className="size-4 rounded-full bg-green-100" />}
                        {p.fullName || p.name}
                        {p._id === appointment.createdBy?._id && <span className="text-[10px] text-muted-foreground ml-1">(Organizer)</span>}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {(isEditing || (appointment.guestEmails && appointment.guestEmails.length > 0)) && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Mail className="size-4" /> External Guests</Label>
                  {isEditing ? (
                    <GuestEmailInput emails={editData.guestEmails} onChange={(e) => setEditData({ ...editData, guestEmails: e })} />
                  ) : (
                    <div className="space-y-2">
                      {appointment.guestEmails?.map((guest, i) => (
                        <div key={i} className="flex items-center justify-between p-2 border rounded-lg text-xs bg-muted/20">
                          <span>{guest.email} {guest.guestName && `(${guest.guestName})`}</span>
                          <Badge variant="outline" className="capitalize">{guest.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {appointment.customerBooking && (
            <div className="p-4 border border-green-200 bg-green-50/20 rounded-xl space-y-2">
              <h4 className="text-sm font-bold text-green-700">Customer Booking Information</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Fixed lines safely parsing elements across the verified custom inline type-cast target */}
                <p><strong>Name:</strong> {customer.firstName} {customer.lastName}</p>
                <p><strong>Phone:</strong> {customer.phone}</p>
                <p className="col-span-2"><strong>Email:</strong> {customer.email}</p>
              </div>
            </div>
          )}

          {(isEditing || appointment.notes) && (
            <div className="space-y-2">
              <Label>Notes</Label>
              {isEditing ? (
                <Textarea value={editData.notes} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} rows={3} />
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{appointment.notes}</p>
              )}
            </div>
          )}

          {((isEditing ? ['completed', 'no-show'].includes(editData.status) : ['completed', 'no-show'].includes(appointment.status))) && (
            <div className="space-y-2 p-4 rounded-lg bg-amber-50/40 border border-amber-200">
              <Label className="flex items-center gap-2 text-amber-900"><CheckCircle className="size-4" /> Outcome Notes</Label>
              {isEditing ? (
                <Textarea value={editData.outcomeNotes} onChange={(e) => setEditData({ ...editData, outcomeNotes: e.target.value })} rows={3} />
              ) : (
                <p className="text-sm text-amber-800 whitespace-pre-wrap">{appointment.outcomeNotes || "No notes provided."}</p>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-between border-t pt-4">
            <div className="flex gap-2">
              {canDelete && !isEditing && (
                <Button variant="outline" size="sm" onClick={handleDelete} disabled={isSubmitting} className="text-red-600 hover:bg-red-50">
                  <Trash2 className="size-4 mr-2" /> Delete
                </Button>
              )}
              {canCancel && !isEditing && (
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSubmitting}>
                  <Ban className="size-4 mr-2" /> Cancel Appointment
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => { setIsEditing(false); setError(null); }} disabled={isSubmitting}>
                    <X className="size-4 mr-2" /> Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isSubmitting} className="bg-green-500 hover:bg-green-600">
                    <Save className="size-4 mr-2" /> Save Changes
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
                  {canEdit && onUpdate && (
                    <Button size="sm" onClick={() => setIsEditing(true)} className="bg-green-500 hover:bg-green-600">
                      <Edit2 className="size-4 mr-2" /> Edit
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
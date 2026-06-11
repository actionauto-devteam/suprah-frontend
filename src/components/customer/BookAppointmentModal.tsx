"use client"

import * as React from "react"
import { useUser } from "@/providers/AuthProvider"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { createCustomerAppointment } from "@/lib/api/appointments"
import { Calendar, Clock, MapPin, CheckCircle2, Loader2, ChevronLeft } from "lucide-react"

const SERVICE_TYPES = [
  { value: "oil_change", label: "Oil Change" },
  { value: "tires", label: "Tire Rotation / Replacement" },
  { value: "brakes", label: "Brake Service" },
  { value: "inspection", label: "Vehicle Inspection" },
  { value: "other", label: "Other / General Service" },
]

const TIME_SLOTS = [
  "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM",
]

function parseTimeSlot(dateStr: string, timeSlot: string): Date {
  const [time, period] = timeSlot.split(" ")
  const [hourStr, minuteStr] = time.split(":")
  let hour = parseInt(hourStr, 10)
  const minute = parseInt(minuteStr, 10)
  if (period === "PM" && hour !== 12) hour += 12
  if (period === "AM" && hour === 12) hour = 0
  const d = new Date(dateStr)
  d.setHours(hour, minute, 0, 0)
  return d
}

function getTomorrowISO(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split("T")[0]
}

interface Location {
  _id: string
  name: string
  address: string
  city: string
  state: string
  zipCode: string
  phone?: string
}

interface BookAppointmentModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  location: Location | null
}

export function BookAppointmentModal({
  isOpen,
  onOpenChange,
  location,
}: BookAppointmentModalProps) {
  const { user } = useUser()

  const [step, setStep] = React.useState<1 | 2 | 3>(1)
  const [serviceType, setServiceType] = React.useState("")
  const [date, setDate] = React.useState(getTomorrowISO())
  const [timeSlot, setTimeSlot] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [bookedAppointment, setBookedAppointment] = React.useState<any>(null)

  // Reset on close
  React.useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep(1)
        setServiceType("")
        setDate(getTomorrowISO())
        setTimeSlot("")
        setPhone("")
        setNotes("")
        setBookedAppointment(null)
        setIsSubmitting(false)
      }, 300)
    }
  }, [isOpen])

  if (!location) return null

  const locationFullAddress = `${location.address}, ${location.city}, ${location.state} ${location.zipCode}`
  const serviceLabel = SERVICE_TYPES.find(s => s.value === serviceType)?.label || serviceType

  const handleSubmit = async () => {
    if (!user || !serviceType || !date || !timeSlot) return
    setIsSubmitting(true)

    try {
      const startTime = parseTimeSlot(date, timeSlot)
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000) // +1 hour

      const result = await createCustomerAppointment({
        title: `${serviceLabel} — Jiffy Lube ${location.city}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        location: locationFullAddress,
        type: "in-person",
        entryType: "appointment",
        notes: notes || undefined,
        customerBooking: {
          firstName: user.firstName || user.fullName?.split(" ")[0] || "",
          lastName: user.lastName || user.fullName?.split(" ").slice(1).join(" ") || "",
          email: user.primaryEmailAddress.emailAddress,
          phone,
          isCustomerBooking: true,
        },
      })

      setBookedAppointment(result)
      setStep(3)
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Booking failed. Please try again."
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold">
            {step === 3 ? "Booking Confirmed!" : "Book a Service Appointment"}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            Jiffy Lube — {location.name}, {location.city}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        {step !== 3 && (
          <div className="flex items-center gap-2 mt-1 mb-4">
            {[1, 2].map(s => (
              <React.Fragment key={s}>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step >= s
                      ? "bg-green-600 text-white"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {s}
                </div>
                {s < 2 && <div className="flex-1 h-0.5 bg-zinc-200 dark:bg-zinc-800 rounded-full" />}
              </React.Fragment>
            ))}
            <span className="ml-2 text-xs text-muted-foreground font-medium">
              {step === 1 ? "Choose Service & Time" : "Your Details"}
            </span>
          </div>
        )}

        {/* ── Step 1: Service + Date + Time ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Service Type</Label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select a service…" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Preferred Date
              </Label>
              <Input
                type="date"
                value={date}
                min={getTomorrowISO()}
                onChange={e => setDate(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Preferred Time
              </Label>
              <div className="grid grid-cols-4 xxs:grid-cols-4 xs:grid-cols-5 gap-2">
                {TIME_SLOTS.map(slot => (
                  <button
                    key={slot}
                    onClick={() => setTimeSlot(slot)}
                    className={`py-2.5 px-1 rounded-xl text-[11px] xs:text-xs font-semibold border transition-all active:scale-95 ${
                      timeSlot === slot
                        ? "bg-green-600 text-white border-green-600 shadow-md"
                        : "bg-zinc-50 dark:bg-zinc-900 text-foreground border-zinc-200 dark:border-zinc-800 hover:border-green-400 hover:text-green-600"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={() => setStep(2)}
              disabled={!serviceType || !date || !timeSlot}
              className="w-full h-11 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold mt-2"
            >
              Continue
            </Button>
          </div>
        )}

        {/* ── Step 2: Contact Details + Confirm ── */}
        {step === 2 && (
          <div className="space-y-4">
            {/* booking summary */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service</span>
                <span className="font-semibold">{serviceLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-semibold">
                  {new Date(date + "T12:00:00").toLocaleDateString("en-US", {
                    weekday: "short", month: "short", day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time</span>
                <span className="font-semibold">{timeSlot}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location</span>
                <span className="font-semibold text-right max-w-[60%]">
                  {location.city}, {location.state}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Phone Number (optional)</Label>
              <Input
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Used only for appointment reminders.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="e.g. My car makes a squeaking noise when braking…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="flex gap-3 mt-2">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1 h-11 rounded-xl"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 h-11 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold"
              >
                {isSubmitting
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Booking…</>
                  : "Confirm Booking"}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Confirmation ── */}
        {step === 3 && bookedAppointment && (
          <div className="flex flex-col items-center text-center py-4 gap-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-green-600 dark:text-green-400" />
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-foreground">You&apos;re all set!</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Your appointment has been submitted. The Jiffy Lube team will
                confirm it shortly.
              </p>
            </div>

            <div className="w-full p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5 text-sm text-left">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service</span>
                <span className="font-semibold">{serviceLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date & Time</span>
                <span className="font-semibold">
                  {new Date(date + "T12:00:00").toLocaleDateString("en-US", {
                    weekday: "short", month: "short", day: "numeric",
                  })}{" "}
                  · {timeSlot}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location</span>
                <span className="font-semibold">{location.city}, {location.state}</span>
              </div>
            </div>

            <Button
              onClick={() => onOpenChange(false)}
              className="w-full h-11 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

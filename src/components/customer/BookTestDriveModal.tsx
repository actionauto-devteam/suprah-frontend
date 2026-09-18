"use client"

import * as React from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { useUser } from "@/providers/AuthProvider"
import { submitTestDriveBooking } from "@/lib/api/publicBooking"
import { Calendar, Clock, CheckCircle2, Loader2 } from "lucide-react"
import type { Vehicle } from "@/types/inventory"

interface BookTestDriveModalProps {
  vehicle: Vehicle | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

function getTomorrowISO(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split("T")[0]
}

export function BookTestDriveModal({
  vehicle,
  isOpen,
  onOpenChange,
}: BookTestDriveModalProps) {
  const { user } = useUser()

  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [date, setDate] = React.useState(getTomorrowISO())
  const [time, setTime] = React.useState("10:00")
  const [notes, setNotes] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)

  React.useEffect(() => {
    if (isOpen && user) {
      setFirstName((prev) => prev || user.firstName || user.fullName?.split(" ")[0] || "")
      setLastName((prev) => prev || user.lastName || user.fullName?.split(" ").slice(1).join(" ") || "")
      setEmail((prev) => prev || user.primaryEmailAddress?.emailAddress || "")
    }
  }, [isOpen, user])

  React.useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setFirstName("")
        setLastName("")
        setEmail("")
        setPhone("")
        setDate(getTomorrowISO())
        setTime("10:00")
        setNotes("")
        setIsSubmitting(false)
        setSubmitted(false)
      }, 300)
    }
  }, [isOpen])

  if (!vehicle) return null

  const vehicleLabel = `${vehicle.year} ${vehicle.make} ${vehicle.model}`
  const isValid = firstName.trim() && lastName.trim() && email.trim() && phone.trim() && date && time

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return
    setIsSubmitting(true)

    try {
      const startTime = new Date(`${date}T${time}:00`)
      await submitTestDriveBooking({
        vehicleId: vehicle.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        startTime: startTime.toISOString(),
        notes: notes.trim() || undefined,
      })
      setSubmitted(true)
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Something went wrong. Please try again."
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
            {submitted ? "You're all set!" : "Book a Test Drive"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-0.5">
            {vehicleLabel}
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center text-center py-4 gap-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm mt-1">
                Your test drive request has been submitted. Our team will reach out to confirm your time.
              </p>
            </div>
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full h-11 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold"
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input value={firstName} onChange={e => setFirstName(e.target.value)} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={lastName} onChange={e => setLastName(e.target.value)} className="h-11" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="h-11" />
            </div>

            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                <Input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Anything you'd like us to know…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="min-h-20 resize-none"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting}
              className="w-full h-11 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold mt-2"
            >
              {isSubmitting
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</>
                : "Request Test Drive"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

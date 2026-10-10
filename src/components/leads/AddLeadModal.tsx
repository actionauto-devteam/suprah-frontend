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
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/providers/AuthProvider"
import { Loader2 } from "lucide-react"
import { isAxiosError } from "axios"

interface AddLeadModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function AddLeadModal({ isOpen, onOpenChange }: AddLeadModalProps) {
  const { getToken } = useAuth()

  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [vehicleYear, setVehicleYear] = React.useState("")
  const [vehicleMake, setVehicleMake] = React.useState("")
  const [vehicleModel, setVehicleModel] = React.useState("")
  const [comments, setComments] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setFirstName("")
        setLastName("")
        setEmail("")
        setPhone("")
        setVehicleYear("")
        setVehicleMake("")
        setVehicleModel("")
        setComments("")
        setIsSubmitting(false)
      }, 300)
    }
  }, [isOpen])

  const isValid = firstName.trim() && (email.trim() || phone.trim())

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return
    setIsSubmitting(true)

    try {
      const token = await getToken()
      await apiClient.post(
        "/api/leads/",
        {
          firstName: firstName.trim(),
          lastName: lastName.trim() || undefined,
          email: email.trim(),
          phone: phone.trim(),
          vehicle:
            vehicleYear.trim() || vehicleMake.trim() || vehicleModel.trim()
              ? { year: vehicleYear.trim(), make: vehicleMake.trim(), model: vehicleModel.trim() }
              : undefined,
          comments: comments.trim() || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      toast.success("Lead added")
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = (isAxiosError<{ message?: string }>(err) ? err.response?.data?.message : undefined) || "Something went wrong. Please try again."
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-md max-h-[calc(90dvh)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Lead</DialogTitle>
          <DialogDescription>Manually add a customer to the CRM.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-lead-first-name">First name</Label>
              <Input
                id="add-lead-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jordan"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-lead-last-name">Last name</Label>
              <Input
                id="add-lead-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Lee"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-lead-email">Email</Label>
            <Input
              id="add-lead-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jordan@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-lead-phone">Phone</Label>
            <Input
              id="add-lead-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(801) 555-0100"
            />
          </div>

          <div className="grid grid-cols-[0.8fr_1fr_1fr] gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-lead-vehicle-year">Year</Label>
              <Input
                id="add-lead-vehicle-year"
                value={vehicleYear}
                onChange={(e) => setVehicleYear(e.target.value)}
                placeholder="2024"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-lead-vehicle-make">Make</Label>
              <Input
                id="add-lead-vehicle-make"
                value={vehicleMake}
                onChange={(e) => setVehicleMake(e.target.value)}
                placeholder="Toyota"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-lead-vehicle-model">Model</Label>
              <Input
                id="add-lead-vehicle-model"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                placeholder="Camry"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-lead-comments">Notes</Label>
            <Textarea
              id="add-lead-comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Optional notes about this lead"
              rows={3}
            />
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={!isValid || isSubmitting} className="w-full">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Lead"}
        </Button>
      </DialogContent>
    </Dialog>
  )
}

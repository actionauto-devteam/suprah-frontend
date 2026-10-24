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
import { Loader2, ScanBarcode } from "lucide-react"
import { isAxiosError } from "axios"
import { DriverLicenseScanDialog, type LicenseAppliedValues } from "@/components/leads/DriverLicenseScanDialog"

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
  const [address, setAddress] = React.useState("")
  const [scanOpen, setScanOpen] = React.useState(false)
  const [scanApplied, setScanApplied] = React.useState(false)
  const [vehicleYear, setVehicleYear] = React.useState("")
  const [vehicleMake, setVehicleMake] = React.useState("")
  const [vehicleModel, setVehicleModel] = React.useState("")
  const [location, setLocation] = React.useState("")
  const [comments, setComments] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [vehicleLocations, setVehicleLocations] = React.useState<string[]>([])

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const token = await getToken()
        const res = await apiClient.get("/api/vehicles/filters", {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = res.data?.data || res.data
        if (!cancelled && Array.isArray(data?.locations)) {
          setVehicleLocations(data.locations)
        }
      } catch {}
    })()
    return () => {
      cancelled = true
    }
  }, [getToken])

  React.useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setFirstName("")
        setLastName("")
        setEmail("")
        setPhone("")
        setAddress("")
        setScanOpen(false)
        setScanApplied(false)
        setVehicleYear("")
        setVehicleMake("")
        setVehicleModel("")
        setLocation("")
        setComments("")
        setIsSubmitting(false)
      }, 300)
    }
  }, [isOpen])

  const isValid = firstName.trim() && (email.trim() || phone.trim())

  const applyLicenseScan = (values: LicenseAppliedValues) => {
    if (values.firstName !== undefined) setFirstName(values.firstName)
    if (values.lastName !== undefined) setLastName(values.lastName)
    if (values.address !== undefined) setAddress(values.address)
    setScanApplied(true)
  }

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
          address: address.trim() || undefined,
          vehicle:
            vehicleYear.trim() || vehicleMake.trim() || vehicleModel.trim()
              ? { year: vehicleYear.trim(), make: vehicleMake.trim(), model: vehicleModel.trim() }
              : undefined,
          location: location.trim() || undefined,
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
          <div className="space-y-1.5">
            <Button type="button" variant="outline" className="h-11 w-full sm:h-10" onClick={() => setScanOpen(true)}>
              <ScanBarcode className="h-4 w-4" />
              Scan driver&apos;s license
            </Button>
            {scanApplied && (
              <p role="status" className="text-xs text-emerald-700 dark:text-emerald-400">
                Name and address filled in from the license. Check them before adding the lead.
              </p>
            )}
          </div>

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

          <div className="space-y-1.5">
            <Label htmlFor="add-lead-address">Address</Label>
            <Input
              id="add-lead-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, Salt Lake City, UT 84101"
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
            <Label htmlFor="add-lead-location">Location</Label>
            <Input
              id="add-lead-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Orem"
              list="add-lead-location-options"
            />
            <datalist id="add-lead-location-options">
              {vehicleLocations.map((loc) => (
                <option key={loc} value={loc} />
              ))}
            </datalist>
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

        <DriverLicenseScanDialog
          open={scanOpen}
          onOpenChange={setScanOpen}
          current={{ firstName, lastName, address }}
          onApply={applyLicenseScan}
          saveHint="Nothing is saved until you press Add Lead."
        />
      </DialogContent>
    </Dialog>
  )
}

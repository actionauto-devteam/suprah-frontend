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

type PossibleMatch = {
  kind: "lead" | "customer"
  id: string
  name: string
  status: string | null
  email: string
  phone: string
  address: string
  sameAddress: boolean | null
}

const matchLabel = (match: PossibleMatch) =>
  match.sameAddress === true ? "Same name and address" : match.sameAddress === false ? "Same name, different address" : "Same name"

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
  const [matchResult, setMatchResult] = React.useState<{ key: string; matches: PossibleMatch[] } | null>(null)

  const matchFirst = firstName.trim()
  const matchLast = lastName.trim()
  const matchAddress = address.trim()
  const matchKey = `${matchFirst.toLowerCase()}|${matchLast.toLowerCase()}|${matchAddress.toLowerCase()}`
  const visibleMatches = scanApplied && matchResult?.key === matchKey ? matchResult.matches : []

  React.useEffect(() => {
    if (!isOpen || !scanApplied || !matchFirst || !matchLast) return
    let cancelled = false
    const timer = window.setTimeout(async () => {
      try {
        const token = await getToken()
        const res = await apiClient.get("/api/leads/possible-matches", {
          params: { firstName: matchFirst, lastName: matchLast, address: matchAddress || undefined },
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = res.data?.data || res.data
        if (!cancelled) setMatchResult({ key: matchKey, matches: Array.isArray(data?.matches) ? data.matches : [] })
      } catch {
        if (!cancelled) setMatchResult({ key: matchKey, matches: [] })
      }
    }, 400)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [isOpen, scanApplied, matchFirst, matchLast, matchAddress, matchKey, getToken])

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
        setMatchResult(null)
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
            {visibleMatches.length > 0 && (
              <div
                role="status"
                data-testid="license-possible-matches"
                className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs dark:border-amber-500/40 dark:bg-amber-950/30"
              >
                <p className="font-semibold text-amber-900 dark:text-amber-200">This person may already be in the CRM</p>
                <p className="mt-0.5 text-amber-800 dark:text-amber-300">
                  Check these before adding a new lead. Nothing is combined for you.
                </p>
                <ul className="mt-2 space-y-1.5">
                  {visibleMatches.map((match) => (
                    <li
                      key={`${match.kind}-${match.id}`}
                      className="flex items-center justify-between gap-2 rounded-md bg-white/80 px-2.5 py-2 dark:bg-black/20"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {match.name}
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            · {match.kind === "customer" ? "Customer record" : `Lead${match.status ? ` (${match.status})` : ""}`}
                          </span>
                        </p>
                        <p className="truncate text-muted-foreground">
                          {match.address || match.phone || match.email || "No contact details saved"}
                        </p>
                        <p className="text-[11px] font-medium text-amber-800 dark:text-amber-300">{matchLabel(match)}</p>
                      </div>
                      <a
                        href={match.kind === "customer" ? `/crm/customers/${match.id}` : `/crm/leads?leadId=${match.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 shrink-0 items-center rounded-md border bg-background px-3 font-medium text-foreground hover:bg-muted"
                      >
                        Open
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
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

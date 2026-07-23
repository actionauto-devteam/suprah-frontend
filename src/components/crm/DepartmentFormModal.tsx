"use client"

import * as React from "react"
import { Building2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { apiClient } from "@/lib/api-client"
import { DEPT_COLOR_PALETTE, DEPT_COLOR_HEX, DepartmentEntry } from "@/lib/departments"

interface DepartmentFormModalProps {
  token: string
  department: (DepartmentEntry & { _id: string }) | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function DepartmentFormModal({ token, department, open, onOpenChange, onSaved }: DepartmentFormModalProps) {
  const isEdit = !!department

  const [label, setLabel] = React.useState("")
  const [color, setColor] = React.useState<string>(DEPT_COLOR_PALETTE[0])
  const [isMobileMonitoringDept, setIsMobileMonitoringDept] = React.useState(false)
  const [isTimeEditExempt, setIsTimeEditExempt] = React.useState(false)
  const [isMandatoryLocationDept, setIsMandatoryLocationDept] = React.useState(false)
  const [locationRequiredForTimeproof, setLocationRequiredForTimeproof] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setLabel(department?.label ?? "")
    setColor(department?.color ?? DEPT_COLOR_PALETTE[0])
    setIsMobileMonitoringDept(!!department?.isMobileMonitoringDept)
    setIsTimeEditExempt(!!department?.isTimeEditExempt)
    setIsMandatoryLocationDept(!!department?.isMandatoryLocationDept)
    // Defaults ON for a brand-new department (isEdit false, department null) —
    // matches the feature's existing behavior for everyone unless an admin
    // explicitly exempts this department.
    setLocationRequiredForTimeproof(department ? department.locationRequiredForTimeproof !== false : true)
  }, [open, department])

  const handleSubmit = async () => {
    if (!label.trim()) {
      toast.error("Department name is required")
      return
    }
    setIsSaving(true)
    try {
      const payload = {
        label: label.trim(),
        color,
        isMobileMonitoringDept,
        isTimeEditExempt,
        isMandatoryLocationDept,
        locationRequiredForTimeproof,
      }
      if (isEdit) {
        await apiClient.patch(`/api/crm/departments/${department!._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        })
        toast.success("Department updated")
      } else {
        await apiClient.post("/api/crm/departments", payload, {
          headers: { Authorization: `Bearer ${token}` },
        })
        toast.success("Department created")
      }
      onSaved()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save department")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <DialogTitle>{isEdit ? "Edit Department" : "Add Department"}</DialogTitle>
              <DialogDescription>
                {isEdit ? "Update this department's name, color, or behavior." : "Create a new department employees can be assigned to."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Customer Success"
              maxLength={60}
              className="h-10 rounded-xl text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
              Color
            </Label>
            <div className="flex flex-wrap gap-2">
              {DEPT_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full border-2 transition-transform ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: DEPT_COLOR_HEX[c] }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border/50 p-3">
            <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
              Behavior
            </p>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold">Mobile Monitoring</p>
                <p className="text-[11px] text-muted-foreground/60">Uses GPS/stationary tracking instead of desktop screenshots</p>
              </div>
              <Switch checked={isMobileMonitoringDept} onCheckedChange={setIsMobileMonitoringDept} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold">Time-Edit Exempt</p>
                <p className="text-[11px] text-muted-foreground/60">Admins cannot correct this department's time logs</p>
              </div>
              <Switch checked={isTimeEditExempt} onCheckedChange={setIsTimeEditExempt} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold">Mandatory Location</p>
                <p className="text-[11px] text-muted-foreground/60">Location sharing is required for this department</p>
              </div>
              <Switch checked={isMandatoryLocationDept} onCheckedChange={setIsMandatoryLocationDept} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold">Require Location for TimeProof</p>
                <p className="text-[11px] text-muted-foreground/60">Off = no location alerts, no auto-clockout — TimeProof works normally without location sharing</p>
              </div>
              <Switch checked={locationRequiredForTimeproof} onCheckedChange={setLocationRequiredForTimeproof} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9 rounded-xl text-xs">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-2"
          >
            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Department"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

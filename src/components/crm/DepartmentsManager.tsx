"use client"

import * as React from "react"
import { Loader2, Plus, Pencil, Eye, Building2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api-client"
import { DEPT_COLOR_HEX, setDepartments, DepartmentEntry } from "@/lib/departments"
import { DepartmentFormModal } from "./DepartmentFormModal"

type DepartmentRow = DepartmentEntry & { _id: string }

interface DepartmentsManagerProps {
  token: string
}

export function DepartmentsManager({ token }: DepartmentsManagerProps) {
  const [departments, setRows] = React.useState<DepartmentRow[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<DepartmentRow | null>(null)
  const [busyId, setBusyId] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await apiClient.get("/api/crm/departments", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const rows: DepartmentRow[] = res.data?.data || res.data || []
      setRows(rows)
      // Keep the app-wide live department list (used by dropdowns/badges everywhere)
      // in sync with any change made here, without waiting for its own poll.
      setDepartments(rows.filter((d) => d.isActive))
    } catch {
      toast.error("Failed to load departments")
    } finally {
      setIsLoading(false)
    }
  }, [token])

  React.useEffect(() => {
    load()
  }, [load])

  const handleReactivate = async (dept: DepartmentRow) => {
    setBusyId(dept._id)
    try {
      await apiClient.patch(`/api/crm/departments/${dept._id}`, { isActive: true }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success(`${dept.label} reactivated`)
      await load()
    } catch {
      toast.error("Failed to reactivate department")
    } finally {
      setBusyId(null)
    }
  }

  // Deletes for real if nobody's assigned to it, otherwise the backend deactivates it instead
  // (hides it from pickers, keeps it resolvable for whoever's still on it) — surfaced via toast
  // either way, so it's never a silent no-op.
  const handleDelete = async (dept: DepartmentRow) => {
    setBusyId(dept._id)
    try {
      const res = await apiClient.delete(`/api/crm/departments/${dept._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = res.data?.data || res.data
      if (data?.deleted) {
        toast.success(`${dept.label} deleted`)
      } else {
        toast.message(`${dept.label} deactivated — ${data?.memberCount ?? "some"} member(s) still assigned`, {
          description: "Move everyone off it, then delete again to remove it for good.",
        })
      }
      await load()
    } catch {
      toast.error("Failed to delete department")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-border/30">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Building2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">Manage Departments</p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">
              Add, rename, or retire the departments employees can be assigned to
            </p>
          </div>
        </div>
        <Button
          onClick={() => { setEditing(null); setModalOpen(true) }}
          className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs gap-2 shadow-sm shadow-emerald-600/20"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Department
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
        </div>
      ) : (
        <div className="divide-y divide-border/30">
          {departments.map((dept) => (
            <div key={dept._id} className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: DEPT_COLOR_HEX[dept.color] ?? "#9ca3af" }}
                />
                <div className="min-w-0">
                  <p className={`text-sm font-semibold truncate ${!dept.isActive ? "text-muted-foreground/50 line-through" : ""}`}>
                    {dept.label}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {dept.isMobileMonitoringDept && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5 rounded-full font-semibold">Mobile Monitoring</Badge>
                    )}
                    {dept.isTimeEditExempt && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5 rounded-full font-semibold">Time-Edit Exempt</Badge>
                    )}
                    {dept.isMandatoryLocationDept && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5 rounded-full font-semibold">Mandatory Location</Badge>
                    )}
                    {!dept.isActive && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5 rounded-full font-semibold text-muted-foreground/60">Inactive</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setEditing(dept); setModalOpen(true) }}
                  className="h-8 w-8 p-0 rounded-lg"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                {!dept.isActive && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busyId === dept._id}
                    onClick={() => handleReactivate(dept)}
                    className="h-8 w-8 p-0 rounded-lg"
                    title="Reactivate"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busyId === dept._id}
                  onClick={() => handleDelete(dept)}
                  className="h-8 w-8 p-0 rounded-lg text-red-500/70 hover:text-red-500"
                  title={dept.isActive ? "Delete (deactivates if still in use)" : "Delete permanently"}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {departments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <p className="text-sm font-semibold text-muted-foreground/80">No departments yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Add one to get started assigning employees.</p>
            </div>
          )}
        </div>
      )}

      <DepartmentFormModal
        token={token}
        department={editing}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSaved={load}
      />
    </div>
  )
}

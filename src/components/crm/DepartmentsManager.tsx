"use client"

import * as React from "react"
import { Loader2, Plus, Building2, GripVertical, Star, Users } from "lucide-react"
import { toast } from "sonner"
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/api-client"
import { DEPT_COLOR_HEX, setDepartments, DepartmentEntry } from "@/lib/departments"
import { DepartmentFormModal } from "./DepartmentFormModal"
import { DepartmentDetailPanel } from "./DepartmentDetailPanel"

type DepartmentRow = DepartmentEntry & { _id: string }

interface DepartmentsManagerProps {
  token: string
}

function SortableDeptRow({
  dept,
  selected,
  onSelect,
}: {
  dept: DepartmentRow
  selected: boolean
  onSelect: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: dept._id })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={cn(
        "group flex items-center gap-1.5 px-3 sm:px-4 py-2 cursor-pointer rounded-xl mx-2",
        selected ? "bg-emerald-500/10 ring-1 ring-emerald-500/30" : "hover:bg-muted/40"
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="size-6 flex items-center justify-center rounded-lg text-foreground/30 hover:text-foreground/60 hover:bg-black/5 dark:hover:bg-white/10 cursor-grab active:cursor-grabbing touch-none shrink-0"
        aria-label="Drag to reorder"
      >
        <GripVertical className="size-3.5" />
      </button>
      <span
        className="h-2.5 w-2.5 rounded-full shrink-0"
        style={{ backgroundColor: DEPT_COLOR_HEX[dept.color] ?? "#9ca3af" }}
      />
      <p className={cn("text-xs font-semibold truncate flex-1 min-w-0", !dept.isActive && "text-muted-foreground/50 line-through")}>
        {dept.label}
      </p>
      {dept.isDefault && <Star className="h-3 w-3 text-amber-500 fill-current shrink-0" />}
      {typeof dept.memberCount === "number" && (
        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-muted-foreground/60 shrink-0 tabular-nums">
          <Users className="h-2.5 w-2.5" />
          {dept.memberCount}
        </span>
      )}
    </div>
  )
}

export function DepartmentsManager({ token }: DepartmentsManagerProps) {
  const [departments, setRows] = React.useState<DepartmentRow[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [modalOpen, setModalOpen] = React.useState(false)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await apiClient.get("/api/crm/departments", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const rows: DepartmentRow[] = res.data?.data || res.data || []
      setRows(rows)
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

  const selected = departments.find((d) => d._id === selectedId) || null

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = departments.findIndex((d) => d._id === active.id)
    const newIndex = departments.findIndex((d) => d._id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(departments, oldIndex, newIndex)
    setRows(reordered)
    try {
      await apiClient.patch(
        "/api/crm/departments/reorder",
        { order: reordered.map((d) => d._id) },
        { headers: { Authorization: `Bearer ${token}` } }
      )
    } catch {
      toast.error("Failed to reorder departments")
      load()
    }
  }

  return (
    <div className="flex flex-col lg:flex-row lg:h-160">
      <div className={cn("lg:w-72 lg:shrink-0 lg:border-r border-border/30 flex flex-col", selectedId && "hidden lg:flex")}>
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-4 border-b border-border/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">Departments</p>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">{departments.length} total · drag to reorder</p>
            </div>
          </div>
          <Button
            onClick={() => setModalOpen(true)}
            size="sm"
            className="h-8 w-8 p-0 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shrink-0"
            title="Add Department"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto py-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={departments.map((d) => d._id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-0.5">
                  {departments.map((dept) => (
                    <SortableDeptRow
                      key={dept._id}
                      dept={dept}
                      selected={selectedId === dept._id}
                      onSelect={() => setSelectedId(dept._id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            {departments.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <p className="text-sm font-semibold text-muted-foreground/80">No departments yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Add one to get started.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={cn("flex-1 min-w-0 min-h-0", !selectedId && "hidden lg:flex")}>
        {selected ? (
          <DepartmentDetailPanel
            token={token}
            dept={selected}
            allDepartments={departments}
            onSaved={load}
            onDeleted={() => { setSelectedId(null); load() }}
            onBack={() => setSelectedId(null)}
          />
        ) : (
          <div className="hidden lg:flex flex-col items-center justify-center flex-1 text-center px-6">
            <Building2 className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm font-semibold text-muted-foreground/70">Select a department</p>
            <p className="text-xs text-muted-foreground/50 mt-1">Edit its overview, permissions, or members.</p>
          </div>
        )}
      </div>

      <DepartmentFormModal
        token={token}
        department={null}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSaved={load}
      />
    </div>
  )
}

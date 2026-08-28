"use client"

import * as React from "react"
import { Loader2, Plus, Building2, GripVertical, Star, Users, Search, X } from "lucide-react"
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
  currentAdminDepartment?: string
}

function SortableDeptRow({
  dept,
  selected,
  onSelect,
  dragDisabled,
}: {
  dept: DepartmentRow
  selected: boolean
  onSelect: () => void
  dragDisabled: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: dept._id,
    disabled: dragDisabled,
  })
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
        disabled={dragDisabled}
        className={cn(
          "size-6 flex items-center justify-center rounded-lg text-foreground/30 shrink-0",
          dragDisabled
            ? "cursor-default opacity-30"
            : "hover:text-foreground/60 hover:bg-black/5 dark:hover:bg-white/10 cursor-grab active:cursor-grabbing touch-none"
        )}
        aria-label={dragDisabled ? "Clear search to reorder departments" : "Drag to reorder"}
        title={dragDisabled ? "Clear search to reorder departments" : "Drag to reorder"}
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

export function DepartmentsManager({ token, currentAdminDepartment }: DepartmentsManagerProps) {
  const [departments, setRows] = React.useState<DepartmentRow[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [modalOpen, setModalOpen] = React.useState(false)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")

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

  const normalizedSearch = searchQuery.trim().toLowerCase()

  const filteredDepartments = React.useMemo(() => {
    if (!normalizedSearch) return departments

    return departments.filter((department) =>
      department.label.toLowerCase().includes(normalizedSearch)
    )
  }, [departments, normalizedSearch])

  const selected = departments.find((d) => d._id === selectedId) || null
  const isSearching = normalizedSearch.length > 0

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
    <div className="flex flex-col lg:flex-row lg:h-[min(40rem,70vh)]">
      <div className={cn("lg:w-72 lg:shrink-0 lg:border-r border-border/30 flex flex-col", selectedId && "hidden lg:flex")}>
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-4 border-b border-border/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">Departments</p>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">
                {isSearching
                  ? `${filteredDepartments.length} of ${departments.length} found`
                  : `${departments.length} total · drag to reorder`}
              </p>
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

        <div className="px-4 sm:px-6 py-3 border-b border-border/30">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search departments..."
              aria-label="Search departments by name"
              className="h-9 w-full rounded-xl border border-border/50 bg-background pl-9 pr-9 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Clear department search"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto py-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filteredDepartments.map((d) => d._id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-0.5">
                  {filteredDepartments.map((dept) => (
                    <SortableDeptRow
                      key={dept._id}
                      dept={dept}
                      selected={selectedId === dept._id}
                      onSelect={() => setSelectedId(dept._id)}
                      dragDisabled={isSearching}
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

            {departments.length > 0 && filteredDepartments.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-muted/40">
                  <Search className="h-4 w-4 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-semibold text-muted-foreground/80">No departments found</p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  Try a different department name.
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="mt-3 h-8 rounded-xl px-3 text-xs"
                >
                  Clear search
                </Button>
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
            currentAdminDepartment={currentAdminDepartment}
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
        currentAdminDepartment={currentAdminDepartment}
      />
    </div>
  )
}
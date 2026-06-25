"use client"

import * as React from "react"
import { X, Plus, CheckCircle2, AlertCircle, Loader2, PenLine, BookOpen, ChevronsUpDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Field } from "./FormField"
import { FieldError } from "./FieldError"
import { LoadVehicle, VEHICLE_CONDITIONS, emptyVehicle } from "./types"
import { TRAILER_CAPACITY } from "./trailer-capacity"
import { lookupVin, getInventoryVehicles, InventoryVehicle } from "@/lib/api/loads"

// ─── VIN Picker (Manual | From Inventory) ────────────────────────────────────

type VinMode = "manual" | "inventory"

interface VinPickerProps {
  value: LoadVehicle
  onChange: (updated: LoadVehicle) => void
}

function VinPicker({ value, onChange }: VinPickerProps) {
  const [mode, setMode] = React.useState<VinMode>("manual")
  const [vinStatus, setVinStatus] = React.useState<"idle" | "loading" | "found" | "not-found">("idle")
  const [open, setOpen] = React.useState(false)
  const [inventory, setInventory] = React.useState<InventoryVehicle[]>([])
  const [inventoryLoading, setInventoryLoading] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const valueRef = React.useRef(value)
  valueRef.current = value

  // Manual mode — VIN lookup when 17 chars
  React.useEffect(() => {
    if (mode !== "manual") return
    if (value.vin.length !== 17) { setVinStatus("idle"); return }
    let cancelled = false
    setVinStatus("loading")
    lookupVin(value.vin)
      .then((data) => {
        if (cancelled) return
        const cur = valueRef.current
        onChange({ ...cur, year: String(data.year), make: data.make, model: data.model, color: data.color || cur.color, condition: data.condition })
        setVinStatus("found")
      })
      .catch(() => { if (!cancelled) setVinStatus("not-found") })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.vin, mode])

  // Inventory mode — fetch on open + debounced search
  React.useEffect(() => {
    if (mode !== "inventory" || !open) return
    const t = setTimeout(() => {
      setInventoryLoading(true)
      getInventoryVehicles(searchQuery || undefined)
        .then((data) => setInventory(data))
        .catch(() => setInventory([]))
        .finally(() => setInventoryLoading(false))
    }, searchQuery ? 300 : 0)
    return () => clearTimeout(t)
  }, [mode, open, searchQuery])

  const applyInventoryVehicle = (v: InventoryVehicle) => {
    onChange({
      ...valueRef.current,
      vin: v.vin,
      year: String(v.year),
      make: v.make,
      model: v.model,
      color: v.color,
      condition: v.condition,
    })
    setVinStatus("found")
    setOpen(false)
  }

  const switchMode = (next: VinMode) => {
    setMode(next)
    setVinStatus("idle")
    setSearchQuery("")
    if (next === "inventory") setOpen(true)
  }

  return (
    <Field label="VIN">
      {/* Mode toggle */}
      <div className="flex gap-1 mb-1.5">
        {([
          { id: "manual" as VinMode, icon: PenLine, label: "Manual" },
          { id: "inventory" as VinMode, icon: BookOpen, label: "From Inventory" },
        ]).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => switchMode(id)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${mode === id
                ? "bg-green-500 text-white border-green-500"
                : "bg-muted text-muted-foreground border-border hover:text-foreground"
              }`}
          >
            <Icon className="size-2.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Manual input */}
      {mode === "manual" && (
        <div className="relative">
          <Input
            placeholder="1HGCM82633A123456"
            value={value.vin}
            onChange={(e) => onChange({ ...value, vin: e.target.value })}
            maxLength={17}
            className="h-9 text-sm font-mono pr-8"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            {vinStatus === "loading" && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
            {vinStatus === "found" && <CheckCircle2 className="size-3.5 text-green-500" />}
            {vinStatus === "not-found" && <AlertCircle className="size-3.5 text-destructive" />}
          </div>
        </div>
      )}

      {/* From Inventory — searchable combobox */}
      {mode === "inventory" && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="h-9 w-full justify-between text-sm font-mono font-normal border-border"
            >
              <span className={value.vin ? "text-foreground" : "text-muted-foreground"}>
                {value.vin || "Select from inventory…"}
              </span>
              <ChevronsUpDown className="size-3.5 ml-2 shrink-0 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-2rem)] sm:w-85 p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Search VIN, make, or model…"
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                {inventoryLoading ? (
                  <div className="flex items-center justify-center py-4 gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    Loading inventory…
                  </div>
                ) : (
                  <>
                    <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
                      No vehicles found in inventory
                    </CommandEmpty>
                    <CommandGroup heading="Inventory Vehicles">
                      {inventory.map((v) => (
                        <CommandItem
                          key={v.vin}
                          value={`${v.vin} ${v.make} ${v.model}`}
                          onSelect={() => applyInventoryVehicle(v)}
                          className="flex flex-col items-start gap-0.5 py-2"
                        >
                          <span className="font-mono text-xs font-medium">{v.vin}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {v.year} {v.make} {v.model}{v.color ? ` · ${v.color}` : ""} · {v.condition}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {/* Status messages */}
      {vinStatus === "not-found" && mode === "manual" && (
        <p className="text-[10px] text-destructive mt-1">Not in inventory — fill details manually</p>
      )}
      {vinStatus === "found" && (
        <p className="text-[10px] text-green-600 dark:text-green-400 mt-1">Auto-filled from inventory</p>
      )}
    </Field>
  )
}

// ─── Vehicle Form ─────────────────────────────────────────────────────────────

interface VehicleFormProps {
  value: LoadVehicle
  onChange: (updated: LoadVehicle) => void
  errors?: Record<string, string>
}

function VehicleForm({ value, onChange, errors = {} }: VehicleFormProps) {
  const set = (key: keyof LoadVehicle) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => onChange({ ...value, [key]: e.target.value })

  const setSelect = (key: keyof LoadVehicle) => (val: string) =>
    onChange({ ...value, [key]: val })

  return (
    <div className="space-y-3 pt-3">
      {/* Trailer Type + Condition */}
      <div className="grid grid-cols-1 gap-3">
        <Field label="Condition" required>
          <Select value={value.condition} onValueChange={setSelect("condition")}>
            <SelectTrigger className={`h-9 text-sm ${errors.condition ? "border-destructive focus:ring-destructive/20" : ""}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VEHICLE_CONDITIONS.map((c) => (
                <SelectItem key={c} value={c} className="text-sm">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError error={errors.condition} />
        </Field>
      </div>

      {/* Year / Make / Model */}
      <div className="grid grid-cols-3 gap-3">
        <Field label="Year" required>
          <Input
            placeholder="2022"
            value={value.year}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 4)
              onChange({ ...value, year: digits })
            }}
            inputMode="numeric"
            maxLength={4}
            className={`h-9 text-sm ${errors.year ? "border-destructive focus-visible:ring-destructive/20" : ""}`}
          />
          <FieldError error={errors.year} />
        </Field>
        <Field label="Make" required>
          <Input 
            placeholder="Toyota" 
            value={value.make} 
            onChange={set("make")} 
            maxLength={20} 
            className={`h-9 text-sm ${errors.make ? "border-destructive focus-visible:ring-destructive/20" : ""}`} 
          />
          <FieldError error={errors.make} />
        </Field>
        <Field label="Model" required>
          <Input 
            placeholder="Camry" 
            value={value.model} 
            onChange={set("model")} 
            maxLength={20} 
            className={`h-9 text-sm ${errors.model ? "border-destructive focus-visible:ring-destructive/20" : ""}`} 
          />
          <FieldError error={errors.model} />
        </Field>
      </div>

      {/* VIN (3-mode picker) + Color */}
      <div className="grid grid-cols-2 gap-3">
        <VinPicker value={value} onChange={onChange} />
        <Field label="Color">
          <Input 
            placeholder="Silver" 
            value={value.color} 
            onChange={set("color")} 
            maxLength={20} 
            className={`h-9 text-sm ${errors.color ? "border-destructive focus-visible:ring-destructive/20" : ""}`} 
          />
          <FieldError error={errors.color} />
        </Field>
      </div>
      {value.vin && errors.vin && <FieldError error={errors.vin} />}
    </div>
  )
}

// ─── Tab label helper ─────────────────────────────────────────────────────────

function tabLabel(v: LoadVehicle, index: number): string {
  if (v.make && v.model) {
    const label = `${v.make} ${v.model}`
    return label.length > 14 ? label.slice(0, 13) + "…" : label
  }
  return `Vehicle ${index + 1}`
}

// ─── Vehicle Section ──────────────────────────────────────────────────────────

interface VehicleSectionProps {
  vehicles: LoadVehicle[]
  onChange: (vehicles: LoadVehicle[]) => void
  trailerType?: string
  errors?: import("zod").ZodIssue[]
}

export function VehicleSection({ vehicles, onChange, trailerType = "open_3car_wedge", errors = [] }: VehicleSectionProps) {
  const [activeIndex, setActiveIndex] = React.useState(0)

  // Calculate capacity constraints
  const maxCapacity = TRAILER_CAPACITY[trailerType] || 1;
  const canAddMore = vehicles.length < maxCapacity;
  
  // Check for duplicate VINs
  const usedVins = vehicles
    .map(v => v.vin)
    .filter(Boolean);
  const vinCounts = new Map<string, number>();
  usedVins.forEach(vin => {
    vinCounts.set(vin, (vinCounts.get(vin) || 0) + 1);
  });
  const duplicateVins = new Set([...vinCounts.entries()].filter(([, count]) => count > 1).map(([vin]) => vin));

  const addVehicle = () => {
    if (vehicles.length >= maxCapacity) return
    const next = [...vehicles, emptyVehicle()]
    onChange(next)
    setActiveIndex(next.length - 1)
  }

  const removeVehicle = (index: number) => {
    if (vehicles.length <= 1) return
    const next = vehicles.filter((__, i) => i !== index)
    onChange(next)
    setActiveIndex(Math.min(activeIndex, next.length - 1))
  }

  const updateVehicle = (index: number, updated: LoadVehicle) => {
    const next = [...vehicles]
    next[index] = updated
    onChange(next)
  }

  const active = vehicles[activeIndex] ?? vehicles[0]

  return (
    <div>
      {/* ── Tab strip ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {vehicles.map((v, i) => (
          <div
            key={v.id}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer border transition-colors ${i === activeIndex
                ? "bg-green-500 text-white border-green-500"
                : "bg-muted text-muted-foreground border-border hover:text-foreground"
              } ${v.vin && duplicateVins.has(v.vin) ? "border-destructive ring-1 ring-destructive/20" : ""}`}
            onClick={() => setActiveIndex(i)}
          >
            <span>{tabLabel(v, i)}</span>
            {v.vin && duplicateVins.has(v.vin) && (
              <AlertCircle className="size-3 text-destructive animate-pulse" />
            )}
            {vehicles.length > 1 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeVehicle(i) }}
                className={`ml-0.5 rounded-full p-0.5 transition-colors ${i === activeIndex
                    ? "hover:bg-green-600"
                    : "hover:bg-muted-foreground/20"
                  }`}
                aria-label={`Remove vehicle ${i + 1}`}
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        ))}

        {canAddMore && (
          <button
            type="button"
            onClick={addVehicle}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-muted-foreground border border-dashed border-border hover:text-foreground hover:border-border transition-colors"
          >
            <Plus className="size-3" />
            Add
          </button>
        )}

        {!canAddMore && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-muted-foreground border border-dashed border-border bg-muted/50">
            <span>Max {maxCapacity} vehicles</span>
          </div>
        )}

        <span className="ml-auto text-[10px] text-muted-foreground">
          {vehicles.length} / {maxCapacity}
        </span>
      </div>

      {/* ── Duplicate VIN Warning ────────────────────────────────────────── */}
      {active.vin && duplicateVins.has(active.vin) && (
        <div className="mt-3 p-2 rounded bg-destructive/10 border border-destructive/20 flex items-center gap-2">
          <AlertCircle className="size-4 text-destructive" />
          <p className="text-xs text-destructive font-medium">
            This VIN is already used by another vehicle in this load.
          </p>
        </div>
      )}

      {/* ── Active vehicle form ──────────────────────────────────────────── */}
      <VehicleForm
        key={active.id}
        value={active}
        onChange={(updated) => updateVehicle(activeIndex, updated)}
        errors={errors.filter(e => e.path?.[0] === "vehicles" && e.path?.[1] === activeIndex).reduce((acc: Record<string, string>, curr) => ({ ...acc, [String(curr.path[2])]: curr.message }), {})}
      />
    </div>
  )
}

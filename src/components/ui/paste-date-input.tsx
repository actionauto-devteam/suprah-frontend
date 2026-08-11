"use client"

import * as React from "react"
import { CalendarDays } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface PasteDateInputProps {
  value: string // YYYY-MM-DD or ""
  onChange: (isoDate: string) => void
  className?: string
  placeholder?: string
}

// Accepts pasted/typed dates in common formats (MM/DD/YYYY, YYYY-MM-DD, "Aug 15, 1990", etc.)
// and normalizes to YYYY-MM-DD. Falls back to the browser's Date parser for anything
// not explicitly handled below.
function parseFlexibleDate(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return isNaN(new Date(trimmed + "T12:00:00Z").getTime()) ? null : trimmed
  }

  const slashMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (slashMatch) {
    const month = parseInt(slashMatch[1], 10)
    const day = parseInt(slashMatch[2], 10)
    const year = slashMatch[3]
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    }
  }

  const parsed = new Date(trimmed)
  if (!isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`
  }

  return null
}

function formatDisplay(iso: string): string {
  if (!iso) return ""
  const d = new Date(iso + "T12:00:00Z")
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
}

export function PasteDateInput({ value, onChange, className, placeholder }: PasteDateInputProps) {
  const [text, setText] = React.useState(formatDisplay(value))
  const [invalid, setInvalid] = React.useState(false)
  const hiddenDateRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    setText(formatDisplay(value))
    setInvalid(false)
  }, [value])

  const commit = (raw: string) => {
    if (!raw.trim()) {
      setInvalid(false)
      onChange("")
      return
    }
    const parsed = parseFlexibleDate(raw)
    if (parsed) {
      setInvalid(false)
      onChange(parsed)
    } else {
      setInvalid(true)
    }
  }

  return (
    <div className="relative">
      <Input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            commit(text)
            ;(e.target as HTMLInputElement).blur()
          }
        }}
        placeholder={placeholder || "MM/DD/YYYY or paste any date"}
        className={cn("pr-9", invalid && "border-red-400 focus-visible:ring-red-400/30", className)}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => hiddenDateRef.current?.showPicker?.()}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      >
        <CalendarDays className="h-4 w-4" />
      </button>
      {/* Hidden native picker — calendar icon fallback for anyone who prefers clicking through dates */}
      <input
        ref={hiddenDateRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        className="sr-only"
      />
      {invalid && (
        <p className="absolute -bottom-4 left-0 text-[10px] text-red-500">Couldn&apos;t read that date — try MM/DD/YYYY</p>
      )}
    </div>
  )
}

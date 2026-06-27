"use client"

import React from "react"
import { FileText, Download, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

interface Highlight {
  label: string
  value: string | number
  color: string
}

interface StatMeta {
  icon: React.ReactNode
  label: string
}

interface ReportCardProps {
  title: string
  subtitle: string
  description: string
  category: string
  categoryClass: string
  stats: StatMeta[]
  highlights: Highlight[]
  isSelected: boolean
  isDownloading: boolean
  onToggle: () => void
  onDownload: () => void
  onPreview: () => void
}

export function ReportCard({
  title,
  subtitle,
  description,
  category,
  categoryClass,
  stats,
  highlights,
  isSelected,
  isDownloading,
  onToggle,
  onDownload,
  onPreview,
}: ReportCardProps) {
  return (
    <div
      onClick={onPreview}
      className={`relative bg-card rounded-xl border shadow-sm cursor-pointer transition-all duration-150 p-5 space-y-4 group ${
        isSelected
          ? "border-primary ring-2 ring-primary/20"
          : "border-border hover:border-primary/40 hover:shadow-md"
      }`}
    >
      {/* Checkbox top-right */}
      <div className="absolute top-3.5 right-3.5">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          onClick={e => e.stopPropagation()}
        />
      </div>

      {/* File icon */}
      <div className="size-11 bg-muted rounded-lg flex items-center justify-center text-muted-foreground border border-border group-hover:text-primary transition-colors">
        <FileText className="size-5" />
      </div>

      {/* Title block */}
      <div className="space-y-0.5 pr-6">
        <h3 className="font-bold text-sm text-foreground leading-snug">{title}</h3>
        <p className="text-xs font-semibold text-primary">{subtitle}</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">{description}</p>
      </div>

      {/* Category badge */}
      <Badge variant="outline" className={`text-[10px] font-semibold px-2 py-0.5 ${categoryClass}`}>
        {category}
      </Badge>

      {/* Live stat highlights */}
      <div className="flex items-center gap-3">
        {highlights.map(h => (
          <div
            key={h.label}
            className="bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 text-center"
          >
            <p className="text-[9px] text-muted-foreground font-medium">{h.label}</p>
            <p className={`text-sm font-bold ${h.color}`}>{h.value}</p>
          </div>
        ))}
      </div>

      {/* Meta row */}
      <div className="flex items-center flex-wrap gap-3 text-[11px] text-muted-foreground">
        {stats.map((s, i) => (
          <span key={i} className="flex items-center gap-1">
            {s.icon}
            {s.label}
          </span>
        ))}
        <span className="font-semibold">• PDF</span>
      </div>

      {/* Individual download — shows on card hover */}
      <button
        onClick={e => {
          e.stopPropagation()
          onDownload()
        }}
        disabled={isDownloading}
        className="absolute bottom-3.5 right-3.5 size-8 flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity rounded-md hover:bg-muted text-muted-foreground hover:text-primary disabled:opacity-50"
      >
        {isDownloading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
      </button>
    </div>
  )
}

"use client"

import * as React from "react"
import {
  MapPin, ArrowRight, Truck, DollarSign,
  Calendar, Globe, Lock, ClipboardList, Car, Trash2, Loader2,
  FileText, Edit3, MoreHorizontal, User, Mail, Phone, ExternalLink
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Load, LoadStatus } from "@/types/load"
import { useRouter } from "next/navigation"
import { generateLoadPDF } from "@/utils/pdfGenerator"
import { EditLoadModal } from "@/components/EditLoadModal"
import { ConfirmationModal } from "@/components/ui/confirmation-modal"
import { cn } from "@/lib/utils"

interface LoadCardProps {
  load: Load
  onDelete?: (loadId: string) => void
  onUpdate?: (id: string, updatedLoad: Partial<Load>) => Promise<void>
  isDeleting?: boolean
}

function formatCurrency(n?: number) {
  if (n == null) return "—"
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)
}

function formatDate(d?: string | Date) {
  if (!d) return "—"
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function getStatusTheme(status: LoadStatus) {
  switch (status) {
    case "Posted":
      return {
        bg: "bg-green-500/10 text-green-600 border-green-200 dark:border-green-800",
        indicator: "bg-green-500"
      }
    case "Assigned":
      return {
        bg: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800",
        indicator: "bg-blue-500"
      }
    case "In-Transit":
    case "Picked Up":
      return {
        bg: "bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800",
        indicator: "bg-purple-500"
      }
    case "Delivered":
      return {
        bg: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800",
        indicator: "bg-emerald-500"
      }
    case "Cancelled":
      return {
        bg: "bg-red-500/10 text-red-600 border-red-200 dark:border-red-800",
        indicator: "bg-red-500"
      }
    default:
      return {
        bg: "bg-muted text-muted-foreground border-border",
        indicator: "bg-muted-foreground"
      }
  }
}

export function LoadCard({ load, onDelete, onUpdate, isDeleting }: LoadCardProps) {
  const router = useRouter()
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false)
  const [isExporting, setIsExporting] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)

  const pickup = load.pickupLocation
  const delivery = load.deliveryLocation
  const vehicles = load.vehicles ?? []
  const vCount = vehicles.length
  const isPublic = load.additionalInfo?.visibility !== "private"
  const isLoadBoard = load.postType === "load-board"

  // Try to find a hero image
  const heroImage = vehicles.find(v => v.imageUrl)?.imageUrl || "https://images.unsplash.com/photo-1586191552066-d52dd1e3af86?auto=format&fit=crop&q=80&w=1000"

  const theme = getStatusTheme(load.status)

  const handleExportPDF = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setIsExporting(true)
    try {
      generateLoadPDF(load)
    } finally {
      setIsExporting(false)
    }
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setIsEditModalOpen(true)
  }

  const handleCardClick = () => {
    router.push("/transportation/load/" + load._id)
  }

  return (
    <>
      <Card
        onClick={handleCardClick}
        className="group border-border overflow-hidden p-0 transition-all duration-300 cursor-pointer bg-card relative"
      >
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row">
            {/* Hero Image Section */}
            <div className="relative w-full md:w-64 lg:w-72 h-48 md:h-auto overflow-hidden shrink-0">
              <img
                src={heroImage}
                alt="Load Vehicle"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              <div className="absolute bottom-3 left-3 flex flex-col gap-1">
                <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">Load Number</span>
                <span className="text-sm font-black text-white font-mono">{load.loadNumber}</span>
              </div>

              <div className="absolute top-3 left-3">
                <Badge className={cn("px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border shadow-sm", theme.bg)}>
                  {load.status}
                </Badge>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-5 lg:p-6 flex flex-col justify-between min-w-0">
              <div className="space-y-4">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className={cn("size-2 rounded-full animate-pulse", theme.indicator)} />
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                      {isLoadBoard ? "Public Load Board" : "Assigned Shipment"}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50">·</span>
                    <span className="text-[10px] text-muted-foreground/80 font-bold">{formatDate(load.createdAt)}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/5"
                      onClick={handleEdit}
                      title="Edit Load"
                    >
                      <Edit3 className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/5"
                      onClick={handleExportPDF}
                      disabled={isExporting}
                      title="Export PDF"
                    >
                      {isExporting ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                    </Button>
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          setIsDeleteDialogOpen(true)
                        }}
                        disabled={isDeleting || load.status === "In-Transit" || load.status === "Delivered"}
                      >
                        {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Route Section */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4 lg:gap-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <div className="size-5 rounded-full bg-green-500/10 flex items-center justify-center">
                        <MapPin className="size-3 text-green-600" />
                      </div>
                      <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Origin</span>
                    </div>
                    <p className="text-base font-black text-foreground truncate">
                      {pickup.city}, {pickup.state}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                      <User className="size-2.5" /> {pickup.contactName || "No contact"}
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-1 py-2 md:py-0">
                    <div className="h-px w-full md:w-12 bg-border relative">
                      <ArrowRight className="absolute -right-1 -top-1.5 size-3 text-muted-foreground" />
                    </div>
                    {load.pricing?.miles != null && (
                      <span className="text-[10px] font-black text-muted-foreground whitespace-nowrap bg-muted px-2 py-0.5 rounded-full">
                        {Math.round(load.pricing.miles)} MI
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <div className="size-5 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <MapPin className="size-3 text-blue-600" />
                      </div>
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Destination</span>
                    </div>
                    <p className="text-base font-black text-foreground truncate">
                      {delivery.city}, {delivery.state}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                      <User className="size-2.5" /> {delivery.contactName || "No contact"}
                    </p>
                  </div>
                </div>

                {/* Info Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-border/50 mt-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Vehicles</span>
                    <div className="flex items-center gap-1.5">
                      <Car className="size-3 text-primary" />
                      <span className="text-xs font-black">{vCount} UNIT{vCount !== 1 ? "S" : ""}</span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Carrier Pay</span>
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <DollarSign className="size-3" />
                      <span className="text-xs font-black">{formatCurrency(load.pricing?.carrierPayAmount)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Pickup Date</span>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="size-3 text-amber-500" />
                      <span className="text-xs font-black">{load.dates?.firstAvailable ? formatDate(load.dates.firstAvailable) : "ASAP"}</span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Visibility</span>
                    <div className="flex items-center gap-1.5">
                      {isPublic ? <Globe className="size-3 text-sky-500" /> : <Lock className="size-3 text-muted-foreground" />}
                      <span className="text-xs font-black">{isPublic ? "PUBLIC" : "PRIVATE"}</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar (Mini Timeline) */}
                {load.status !== 'Posted' && load.status !== 'Cancelled' && (
                  <div className="pt-4 mt-2 border-t border-border/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Journey Progress</span>
                      <span className="text-[9px] font-bold text-primary px-1.5 py-0.5 rounded-full bg-primary/5 uppercase">{load.status}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[
                        { key: 'assignedAt', label: 'Assigned' },
                        { key: 'driverAcceptedAt', label: 'Accepted' },
                        { key: 'pickedUpAt', label: 'Picked Up' },
                        { key: 'inTransitAt', label: 'In Transit' },
                        { key: 'deliveredAt', label: 'Delivered' }
                      ].map((step, idx, arr) => {
                        const isDone = !!(load as any)[step.key]
                        const isLastDone = idx === 0 ? true : !!(load as any)[arr[idx - 1].key]
                        return (
                          <React.Fragment key={step.key}>
                            <div className={cn(
                              "h-1.5 flex-1 rounded-full transition-colors duration-500",
                              isDone ? "bg-primary" : "bg-muted"
                            )} />
                          </React.Fragment>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Bar / Hover State Indicator */}
            <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="flex items-center gap-1 text-[10px] font-black text-primary uppercase tracking-widest">
                View Details <ExternalLink className="size-3" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {onUpdate && (
        <EditLoadModal
          load={load}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={onUpdate}
        />
      )}

      <ConfirmationModal
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={() => {
          if (onDelete) {
            onDelete(load._id)
            setIsDeleteDialogOpen(false)
          }
        }}
        title="Delete Load"
        description={`Are you sure you want to delete load ${load.loadNumber}? This action cannot be undone.`}
        confirmText="Yes, Delete Load"
        variant="danger"
      />
    </>
  )
}

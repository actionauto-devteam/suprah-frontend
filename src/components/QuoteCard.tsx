"use client"

import * as React from "react"
import { useState } from "react"
import {
    Check, MapPin, Calendar, Clock, Trash2, User, Building2, Truck,
    Car, Edit3, DollarSign, Gauge, Layers, ShieldCheck, Container
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Quote } from "@/types/transportation"
import { useAlert, AlertDialog } from "@/components/AlertDialog"
import { EditQuoteModal } from "./EditQuoteModal"
import { resolveImageUrl, cn } from "@/lib/utils"

interface QuoteCardProps {
    quote: Quote
    onConvertToLoad: (id: string) => Promise<boolean | void>
    onDelete: (id: string) => void
    onUpdate: (id: string, updatedQuote: Partial<Quote>) => Promise<void>
}

/** HUD-style stat tile — matches the LoadCard info row */
function StatTile({
    label,
    icon,
    children,
}: {
    label: string
    icon: React.ReactNode
    children: React.ReactNode
}) {
    return (
        <div className="rounded-xl border border-border/50 bg-background/40 px-3 py-2.5 min-w-0">
            <span className="block text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 truncate">
                {label}
            </span>
            <div className="flex items-center gap-1.5 min-w-0">
                {icon}
                <span className="text-sm font-black tracking-tight truncate">{children}</span>
            </div>
        </div>
    )
}

export function QuoteCard({ quote, onConvertToLoad, onDelete, onUpdate }: QuoteCardProps) {
    const [isDeleting, setIsDeleting] = useState(false)
    const [isConvertingToLoad, setIsConvertingToLoad] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [imageFailed, setImageFailed] = useState(false)
    const { showAlert, alert, hideAlert } = useAlert()

    const vehicle = quote.vehicleId

    const vehicleName = vehicle
        ? `${vehicle.year} ${vehicle.make} ${vehicle.modelName}`
        : quote.vehicleName || "Vehicle not linked"

    const vinDisplay = vehicle?.vin || quote.vin
    const stockDisplay = vehicle?.stockNumber || quote.stockNumber

    const isAlreadyConverted = quote.status === "booked"
    const busy = isConvertingToLoad || isDeleting

    const heroImage = !imageFailed ? resolveImageUrl(quote.vehicleImage) : undefined

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            timeZone: "America/Denver",
        })
    }

    const handleConvertToLoad = async () => {
        if (isAlreadyConverted) {
            showAlert({
                type: "success",
                title: "Already Converted",
                message: "This quote has already been converted into a load.",
            })
            return
        }

        showAlert({
            type: "confirm",
            title: "Convert to Load",
            message: `Convert this quote for ${quote.firstName} ${quote.lastName} into a dispatchable load? The quote will remain in your history.`,
            confirmText: "Yes, Convert to Load",
            cancelText: "No, Cancel",
            onConfirm: async () => {
                setIsConvertingToLoad(true)

                try {
                    await onConvertToLoad(quote._id)
                } catch (error) {
                    console.error("Error converting quote to load:", error)
                    throw error
                } finally {
                    setIsConvertingToLoad(false)
                }
            },
        })
    }

    const handleDelete = async () => {
        if (isDeleting) return

        showAlert({
            type: "confirm",
            title: "Delete Quote",
            message: `Are you sure you want to delete this quote for ${quote.firstName} ${quote.lastName}? This action cannot be undone.`,
            confirmText: "Yes, Delete",
            cancelText: "No, Keep Quote",
            onConfirm: async () => {
                if (isDeleting) return

                setIsDeleting(true)

                try {
                    await onDelete(quote._id)
                    hideAlert()
                } catch (error) {
                    console.error("Error deleting quote:", error)
                    throw error
                } finally {
                    setIsDeleting(false)
                }
            },
        })
    }

    const handleSaveEdit = async (updatedQuote: Partial<Quote>) => {
        await onUpdate(quote._id, updatedQuote)
        showAlert({
            type: "success",
            title: "Quote Updated",
            message: "The quote has been successfully updated.",
        })
    }

    return (
        <>
            <Card className="group relative overflow-hidden p-0 rounded-2xl border-border/60 bg-card/40 backdrop-blur-md transition-all duration-300 hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/5">
                {/* Cockpit hairline — matches LoadCard */}
                <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-emerald-500/60 to-transparent z-10" />

                <AlertDialog {...alert} onOpenChange={hideAlert} />

                <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row md:min-h-72">
                        {/* ── Hero: vehicle photo + identity overlay ── */}
                        <div className="relative w-full md:w-80 lg:w-96 h-56 md:h-auto overflow-hidden shrink-0 bg-muted/30">
                            {heroImage ? (
                                <img
                                    src={heroImage}
                                    alt={vehicleName}
                                    loading="lazy"
                                    onError={() => setImageFailed(true)}
                                    className="w-full h-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
                                />
                            ) : (
                                /* Schematic placeholder — same treatment as LoadCard */
                                <div className="w-full h-full flex flex-col items-center justify-center gap-2.5 bg-linear-to-br from-emerald-950/40 via-card to-cyan-950/30 dark:from-emerald-950/60 dark:to-cyan-950/40">
                                    <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] bg-[size:24px_24px]" />
                                    <div className="size-14 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 flex items-center justify-center">
                                        <Car className="size-7 text-emerald-500/70" />
                                    </div>
                                    <p className="text-xs font-black tracking-tight text-muted-foreground text-center px-4 truncate max-w-full">
                                        {vehicleName}
                                    </p>
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">No photo on file</span>
                                </div>
                            )}

                            <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/10 to-transparent pointer-events-none" />

                            {/* HUD corner ticks */}
                            <div className="absolute top-3 right-3 size-4 border-t border-r border-white/25 rounded-tr pointer-events-none" />
                            <div className="absolute bottom-3 right-3 size-4 border-b border-r border-white/25 rounded-br pointer-events-none" />

                            <div className="absolute top-3 left-3">
                                <Badge
                                    className={cn(
                                        "px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border backdrop-blur-sm",
                                        isAlreadyConverted
                                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30"
                                            : "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30",
                                    )}
                                >
                                    {isAlreadyConverted ? "Converted" : "Pending"}
                                </Badge>
                            </div>

                            <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-0.5 min-w-0">
                                <span className="text-[9px] font-black text-white/60 uppercase tracking-[0.25em]">Vehicle</span>
                                <span className="text-base font-black text-white tracking-tight drop-shadow truncate">{vehicleName}</span>
                                {(vinDisplay || stockDisplay) && (
                                    <span className="text-[10px] font-mono text-white/70 truncate">
                                        {vinDisplay ?? ""}{vinDisplay && stockDisplay ? " · " : ""}{stockDisplay ? `STK ${stockDisplay}` : ""}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* ── Content ── */}
                        <div className="flex-1 p-5 sm:p-6 lg:p-7 flex flex-col justify-between min-w-0">
                            <div className="space-y-5">
                                {/* Header row */}
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                        <div
                                            className={cn(
                                                "size-2 rounded-full shrink-0 motion-safe:animate-pulse",
                                                isAlreadyConverted
                                                    ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                                    : "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]",
                                            )}
                                        />
                                        <span className="text-[10px] lg:text-[11px] font-black text-muted-foreground uppercase tracking-widest truncate">
                                            Transport Quote
                                        </span>
                                        <span className="text-[10px] text-muted-foreground/50 hidden xs:inline">·</span>
                                        <span className="text-[10px] lg:text-[11px] text-muted-foreground/80 font-bold hidden xs:inline flex items-center gap-1">
                                            <Calendar className="size-2.5 inline" /> {formatDate(quote.createdAt)}
                                        </span>
                                        {quote.organization && (
                                            <>
                                                <span className="text-[10px] text-muted-foreground/50 hidden sm:inline">·</span>
                                                <span className="text-[10px] lg:text-[11px] text-muted-foreground/80 font-bold hidden sm:inline-flex items-center gap-1">
                                                    <Building2 className="size-2.5" /> {quote.organization.name}
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    {/* Icon actions — Convert stays a primary CTA below */}
                                    <div className="flex items-center gap-1 rounded-xl border border-border/50 bg-background/40 backdrop-blur-sm p-1 shrink-0">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-9 w-9 p-0 text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10"
                                            onClick={() => setIsEditModalOpen(true)}
                                            disabled={busy}
                                            title="Edit quote"
                                        >
                                            <Edit3 className="size-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-9 w-9 p-0 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 disabled:opacity-30"
                                            onClick={handleDelete}
                                            disabled={busy}
                                            title="Delete quote"
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Customer + Route */}
                                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-3">
                                    {/* Customer panel */}
                                    <div className="rounded-xl border border-border/50 bg-background/40 p-3.5 min-w-0">
                                        <span className="block text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                                            Customer
                                        </span>
                                        <p className="text-sm font-black tracking-tight text-foreground truncate">
                                            {quote.firstName} {quote.lastName}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{quote.email}</p>
                                        <p className="text-[11px] text-muted-foreground truncate">{quote.phone}</p>
                                        {quote.createdBy && (
                                            <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-border/40 min-w-0">
                                                {quote.createdBy.avatar ? (
                                                    <img
                                                        src={quote.createdBy.avatar}
                                                        alt={quote.createdBy.name || quote.createdBy.email || "User"}
                                                        className="size-4 rounded-full object-cover shrink-0"
                                                    />
                                                ) : (
                                                    <div className="size-4 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                                                        <User className="size-2.5 text-emerald-500" />
                                                    </div>
                                                )}
                                                <span className="text-[10px] text-muted-foreground truncate">
                                                    By <span className="font-bold text-foreground">{quote.createdBy.name || quote.createdBy.email || "Unknown"}</span>
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Route panel — vertical telemetry for full addresses */}
                                    <div className="rounded-xl border border-border/50 bg-background/40 p-3.5 min-w-0">
                                        <span className="block text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                                            Route
                                        </span>
                                        <div className="flex items-start gap-2.5 min-w-0">
                                            <MapPin className="size-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-foreground truncate">{quote.fromAddress}</p>
                                                <p className="text-[10px] font-mono text-muted-foreground">{quote.fromZip}</p>
                                            </div>
                                        </div>
                                        <div className="ml-[6px] my-1 h-4 w-px bg-linear-to-b from-emerald-500/60 to-cyan-500/60" />
                                        <div className="flex items-start gap-2.5 min-w-0">
                                            <MapPin className="size-3.5 text-cyan-500 mt-0.5 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-foreground truncate">{quote.toAddress}</p>
                                                <p className="text-[10px] font-mono text-muted-foreground">{quote.toZip}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Rate readout + HUD tiles */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                                    {/* Featured rate — the number this card exists for */}
                                    <div className="col-span-2 sm:col-span-1 rounded-xl border border-emerald-500/30 bg-linear-to-br from-emerald-500/10 to-cyan-500/5 px-3 py-2.5 relative overflow-hidden min-w-0">
                                        <span className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-emerald-500/60 to-transparent" />
                                        <span className="block text-[9px] font-black text-emerald-600/80 dark:text-emerald-400/80 uppercase tracking-widest mb-1">
                                            Quote Rate
                                        </span>
                                        <span className="text-lg font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
                                            ${quote.rate.toLocaleString()}
                                        </span>
                                    </div>
                                    <StatTile label="ETA" icon={<Clock className="size-3.5 text-cyan-500 shrink-0" />}>
                                        {quote.eta.min}–{quote.eta.max} DAYS
                                    </StatTile>
                                    <StatTile label="Distance" icon={<Gauge className="size-3.5 text-amber-500 shrink-0" />}>
                                        {quote.miles.toLocaleString()} MI
                                    </StatTile>
                                    <StatTile label="Trailer" icon={<Container className="size-3.5 text-violet-500 shrink-0" />}>
                                        {quote.enclosedTrailer ? "ENCLOSED" : "OPEN"}
                                    </StatTile>
                                    <StatTile label="Condition" icon={<ShieldCheck className={cn("size-3.5 shrink-0", quote.vehicleInoperable ? "text-rose-500" : "text-emerald-500")} />}>
                                        {quote.vehicleInoperable ? "INOP" : "OPERABLE"}
                                    </StatTile>
                                </div>

                                {quote.units > 1 && (
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                        <Layers className="size-3 text-emerald-500" /> {quote.units} units in this quote
                                    </div>
                                )}
                            </div>

                            {/* Primary CTA */}
                            <div className="pt-5">
                                <Button
                                    className={cn(
                                        "w-full h-11 gap-2 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all",
                                        isAlreadyConverted
                                            ? "bg-muted text-muted-foreground cursor-not-allowed hover:bg-muted"
                                            : "bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/20",
                                    )}
                                    onClick={handleConvertToLoad}
                                    disabled={isAlreadyConverted || busy}
                                >
                                    {isAlreadyConverted ? (
                                        <Check className="size-4" />
                                    ) : (
                                        <Truck className="size-4" />
                                    )}
                                    {isAlreadyConverted
                                        ? "Converted to Load"
                                        : isConvertingToLoad
                                            ? "Converting…"
                                            : "Convert to Load"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <EditQuoteModal
                quote={quote}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleSaveEdit}
            />
        </>
    )
}
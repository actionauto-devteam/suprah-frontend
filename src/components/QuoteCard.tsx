"use client"

import * as React from "react"
import { useState } from "react"
import {
    Check, MapPin, Calendar, Clock, Trash2, User, Building2, Truck,
    Car, Edit3, DollarSign, Gauge, Layers, ShieldCheck, Container, ChevronRight
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { getQuoteLoadRouteDraft } from "@/types/transportation"
import type {
    Quote,
    QuoteLoadRouteDetails,
} from "@/types/transportation"
import { useAlert, AlertDialog } from "@/components/AlertDialog"
import { EditQuoteModal } from "./EditQuoteModal"
import { resolveImageUrl, cn } from "@/lib/utils"
import { QuoteLoadRouteCompletionDialog } from "./QuoteLoadRouteCompletionDialog"

interface QuoteCardProps {
    quote: Quote
    onConvertToLoad: (id: string, routeDetails?: QuoteLoadRouteDetails) => Promise<boolean | void>
    onDelete: (id: string) => void
    onUpdate: (id: string, updatedQuote: Partial<Quote>) => Promise<void>
}

/** HUD-style stat tile — matches the LoadCard info row.
 *  Only selected high-value quote tiles receive onClick handlers.
 */
function StatTile({
    label,
    icon,
    children,
    onClick,
    hint = "View details",
}: {
    label: string
    icon: React.ReactNode
    children: React.ReactNode
    onClick?: () => void
    hint?: string
}) {
    const content = (
        <>
            <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="block text-[10px] sm:text-[11px] lg:text-xs font-black text-muted-foreground uppercase tracking-widest truncate">
                    {label}
                </span>
                {onClick && (
                    <ChevronRight className="size-3.5 text-muted-foreground/60 transition-transform duration-200 group-hover/stat:translate-x-0.5 group-hover/stat:text-emerald-500" />
                )}
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
                {icon}
                <span className="text-sm lg:text-[15px] font-black tracking-tight truncate">{children}</span>
            </div>
        </>
    )

    if (!onClick) {
        return (
            <div className="rounded-xl border border-border/50 bg-background/40 px-3 py-2.5 min-w-0">
                {content}
            </div>
        )
    }

    return (
        <button
            type="button"
            aria-haspopup="dialog"
            title={hint}
            onClick={(event) => {
                event.stopPropagation()
                event.preventDefault()
                onClick()
            }}
            className={cn(
                "group/stat w-full min-w-0 rounded-xl border border-border/50 bg-background/40 px-3 py-2.5 text-left",
                "transition-all duration-200 hover:border-emerald-500/35 hover:bg-emerald-500/4 hover:shadow-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500/40",
            )}
        >
            {content}
        </button>
    )
}

function ModalMetric({
    label,
    value,
    icon,
    emphasis = false,
}: {
    label: string
    value: React.ReactNode
    icon: React.ReactNode
    emphasis?: boolean
}) {
    return (
        <div
            className={cn(
                "rounded-xl border px-3.5 py-3",
                emphasis
                    ? "border-emerald-500/45 bg-emerald-500/6"
                    : "border-slate-300/90 bg-background/45 dark:border-white/15",
            )}
        >
            <div className="mb-1.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                {icon}
                {label}
            </div>
            <div
                className={cn(
                    "text-sm font-black tracking-tight text-foreground",
                    emphasis && "text-base text-emerald-600 dark:text-emerald-400",
                )}
            >
                {value}
            </div>
        </div>
    )
}

type QuoteInfoModal = "financials" | "eta" | null

const QUOTE_STATUS_META: Record<
    string,
    { label: string; badge: string; dot: string }
> = {
    pending: {
        label: "Pending",
        badge: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30",
        dot: "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]",
    },
    accepted: {
        label: "Accepted",
        badge: "bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/30",
        dot: "bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]",
    },
    booked: {
        label: "Booked",
        badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
        dot: "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]",
    },
    rejected: {
        label: "Rejected",
        badge: "bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30",
        dot: "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]",
    },
}

export function QuoteCard({ quote, onConvertToLoad, onDelete, onUpdate }: QuoteCardProps) {
    const [isDeleting, setIsDeleting] = useState(false)
    const [isConvertingToLoad, setIsConvertingToLoad] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isRouteCompletionOpen, setIsRouteCompletionOpen] = useState(false)
    const [activeInfoModal, setActiveInfoModal] = useState<QuoteInfoModal>(null)
    const [imageFailed, setImageFailed] = useState(false)
    const { showAlert, alert, hideAlert } = useAlert()

    const vehicle = quote.vehicleId

    const vehicleName = vehicle
        ? `${vehicle.year} ${vehicle.make} ${vehicle.modelName}`
        : quote.vehicleName || "Vehicle not linked"

    const vinDisplay = vehicle?.vin || quote.vin
    const stockDisplay = vehicle?.stockNumber || quote.stockNumber

    const normalizedStatus = String(quote.status || "pending").toLowerCase()
    const statusMeta = QUOTE_STATUS_META[normalizedStatus] ?? QUOTE_STATUS_META.pending
    const isAlreadyConverted = normalizedStatus === "booked"
    const isRejected = normalizedStatus === "rejected"
    const routeDraft = React.useMemo(
        () =>
            getQuoteLoadRouteDraft({
                fromAddress: quote.fromAddress,
                fromZip: quote.fromZip,
                toAddress: quote.toAddress,
                toZip: quote.toZip,
                fromLocation: quote.fromLocation,
                toLocation: quote.toLocation,
            }),
        [
            quote.fromAddress,
            quote.fromZip,
            quote.toAddress,
            quote.toZip,
            quote.fromLocation,
            quote.toLocation,
        ],
    )
    const conversionUnavailable = isAlreadyConverted || isRejected
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

    const performConversion = async (
        routeDetails: QuoteLoadRouteDetails,
    ) => {
        setIsConvertingToLoad(true)

        try {
            await onConvertToLoad(quote._id, routeDetails)
            setIsRouteCompletionOpen(false)
        } catch (error) {
            console.error("Error converting quote to load:", error)
            showAlert({
                type: "error",
                title: "Conversion Failed",
                message:
                    error instanceof Error
                        ? error.message
                        : "Could not convert this quote into a load. Please try again.",
            })
            throw error
        } finally {
            setIsConvertingToLoad(false)
        }
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

        if (isRejected) {
            showAlert({
                type: "error",
                title: "Rejected Quote",
                message: "Rejected quotes cannot be converted into loads.",
            })
            return
        }

        // Flexible conversion: a quote does not have to embed "City, ST" in
        // its free-form address. If structured Load details are missing, ask
        // for only those details at conversion time.
        if (routeDraft.needsCompletion) {
            setIsRouteCompletionOpen(true)
            return
        }

        showAlert({
            type: "confirm",
            title: "Convert to Load",
            message: `Convert this quote for ${quote.firstName} ${quote.lastName} into a dispatchable load? The quote will remain in your history.`,
            confirmText: "Yes, Convert to Load",
            cancelText: "No, Cancel",
            onConfirm: async () => {
                await performConversion(routeDraft.routeDetails)
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
                    <div className="flex flex-col 2xl:flex-row 2xl:min-h-80">
                        {/* ── Hero: vehicle photo + identity overlay ── */}
                        <div className="relative w-full aspect-4/3 min-h-44 2xl:aspect-auto 2xl:min-h-0 2xl:h-auto 2xl:w-80 overflow-hidden shrink-0 bg-muted/30">
                            {heroImage ? (
                                <img
                                    src={heroImage}
                                    alt={vehicleName}
                                    loading="lazy"
                                    onError={() => setImageFailed(true)}
                                    className="w-full h-full object-contain object-center transition-transform duration-500 motion-safe:group-hover:scale-105"
                                />
                            ) : (
                                /* Schematic placeholder — same treatment as LoadCard */
                                <div className="w-full h-full flex flex-col items-center justify-center gap-2.5 bg-linear-to-br from-emerald-950/40 via-card to-cyan-950/30 dark:from-emerald-950/60 dark:to-cyan-950/40">
                                    <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] bg-size-[24px_24px]" />
                                    <div className="size-14 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 flex items-center justify-center">
                                        <Car className="size-7 text-emerald-500/70" />
                                    </div>
                                    <p className="text-xs font-black tracking-tight text-muted-foreground text-center px-4 truncate max-w-full">
                                        {vehicleName}
                                    </p>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">No photo on file</span>
                                </div>
                            )}

                            <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/10 to-transparent pointer-events-none" />

                            {/* HUD corner ticks */}
                            <div className="absolute top-3 right-3 size-4 border-t border-r border-white/25 rounded-tr pointer-events-none" />
                            <div className="absolute bottom-3 right-3 size-4 border-b border-r border-white/25 rounded-br pointer-events-none" />

                            <div className="absolute top-3 left-3">
                                <Badge
                                    className={cn(
                                        "px-2.5 py-1 text-[11px] font-black uppercase tracking-wider border backdrop-blur-sm",
                                        statusMeta.badge,
                                    )}
                                >
                                    {statusMeta.label}
                                </Badge>
                            </div>

                            <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-0.5 min-w-0">
                                <span className="text-[10px] font-black text-white/70 uppercase tracking-[0.25em]">Vehicle</span>
                                <span className="text-base font-black text-white tracking-tight drop-shadow truncate">{vehicleName}</span>
                                {(vinDisplay || stockDisplay) && (
                                    <span className="text-[11px] font-mono text-white/80 truncate">
                                        {vinDisplay ?? ""}{vinDisplay && stockDisplay ? " · " : ""}{stockDisplay ? `STK ${stockDisplay}` : ""}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* ── Content ── */}
                        <div className="flex-1 p-5 sm:p-6 lg:p-7 2xl:p-8 flex flex-col justify-between min-w-0">
                            <div className="space-y-5">
                                {/* Header row */}
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                        <div
                                            className={cn(
                                                "size-2 rounded-full shrink-0 motion-safe:animate-pulse",
                                                statusMeta.dot,
                                            )}
                                        />
                                        <span className="text-[11px] lg:text-xs font-black text-muted-foreground uppercase tracking-widest truncate">
                                            Transport Quote
                                        </span>
                                        <span className="text-[11px] text-muted-foreground/60 hidden xs:inline">·</span>
                                        <span className="text-[11px] lg:text-xs text-muted-foreground/90 font-bold hidden xs:inline items-center gap-1">
                                            <Calendar className="size-2.5 inline" /> {formatDate(quote.createdAt)}
                                        </span>
                                        {quote.organization && (
                                            <>
                                                <span className="text-[11px] text-muted-foreground/60 hidden sm:inline">·</span>
                                                <span className="text-[11px] lg:text-xs text-muted-foreground/90 font-bold hidden sm:inline-flex items-center gap-1">
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
                                    <div className="rounded-xl border border-border/50 bg-background/40 p-3.5 min-w-0 h-full flex flex-col">
                                        <span className="block text-[10px] sm:text-[11px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                                            Customer
                                        </span>
                                        <div className="flex-1 flex flex-col justify-center min-w-0">
                                            <p className="text-sm font-black tracking-tight text-foreground truncate">
                                                {quote.firstName} {quote.lastName}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate mt-0.5">{quote.email}</p>
                                            <p className="text-xs text-muted-foreground truncate">{quote.phone}</p>
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
                                                    <span className="text-[11px] text-muted-foreground truncate">
                                                        By <span className="font-bold text-foreground">{quote.createdBy.name || quote.createdBy.email || "Unknown"}</span>
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Route panel — vertical telemetry for full addresses */}
                                    <div className="rounded-xl border border-border/50 bg-background/40 p-3.5 min-w-0 h-full flex flex-col">
                                        <span className="block text-[10px] sm:text-[11px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                                            Route
                                        </span>
                                        <div className="flex-1 flex flex-col justify-center min-w-0">
                                            <div className="flex items-start gap-2.5 min-w-0">
                                                <MapPin className="size-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-foreground truncate">{quote.fromAddress}</p>
                                                    <p className="text-[11px] font-mono text-muted-foreground">{quote.fromZip}</p>
                                                </div>
                                            </div>
                                            <div className="ml-1.5 my-1 h-4 w-px bg-linear-to-b from-emerald-500/60 to-cyan-500/60" />
                                            <div className="flex items-start gap-2.5 min-w-0">
                                                <MapPin className="size-3.5 text-cyan-500 mt-0.5 shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-foreground truncate">{quote.toAddress}</p>
                                                    <p className="text-[11px] font-mono text-muted-foreground">{quote.toZip}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Keep the exact existing quote values and order.
                                    Only Quote Rate and ETA are interactive because they
                                    are the two highest-value quote decisions. */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 2xl:grid-cols-5 gap-2.5">
                                    {/* Featured rate — unchanged value/presentation, now clickable */}
                                    <button
                                        type="button"
                                        aria-haspopup="dialog"
                                        title="View quote financial information"
                                        onClick={(event) => {
                                            event.stopPropagation()
                                            event.preventDefault()
                                            setActiveInfoModal("financials")
                                        }}
                                        className={cn(
                                            "group/stat col-span-2 sm:col-span-4 2xl:col-span-1 rounded-xl border border-border/50 bg-background/40 px-3 py-2.5 relative overflow-hidden min-w-0 text-left",
                                            "transition-all duration-200 hover:border-border/70 hover:bg-muted/20 hover:shadow-sm",
                                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
                                        )}
                                    >
                                        <span className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                                            <span>Quote Rate</span>
                                            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60 transition-transform duration-200 group-hover/stat:translate-x-0.5" />
                                        </span>
                                        <span className="text-xl font-black font-mono tracking-tight text-foreground tabular-nums">
                                            ${quote.rate.toLocaleString()}
                                        </span>
                                    </button>

                                    <StatTile
                                        label="ETA"
                                        icon={<Clock className="size-3.5 text-muted-foreground shrink-0" />}
                                        onClick={() => setActiveInfoModal("eta")}
                                        hint="View quote transit estimate"
                                    >
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
                                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                        <Layers className="size-3 text-emerald-500" /> {quote.units} units in this quote
                                    </div>
                                )}
                            </div>

                            {/* Primary CTA */}
                            <div className="pt-5">
                                <Button
                                    className={cn(
                                        "w-full h-11 gap-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                                        conversionUnavailable
                                            ? "bg-muted text-muted-foreground cursor-not-allowed hover:bg-muted"
                                            : "bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/20",
                                    )}
                                    onClick={handleConvertToLoad}
                                    disabled={conversionUnavailable || busy}
                                >
                                    {isAlreadyConverted ? (
                                        <Check className="size-4" />
                                    ) : (
                                        <Truck className="size-4" />
                                    )}
                                    {isAlreadyConverted
                                        ? "Converted to Load"
                                        : isRejected
                                            ? "Rejected Quote"
                                            : isConvertingToLoad
                                                ? "Converting…"
                                                : "Convert to Load"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Dialog
                open={activeInfoModal !== null}
                onOpenChange={(open) => {
                    if (!open) setActiveInfoModal(null)
                }}
            >
                <DialogContent className="max-h-[90vh] overflow-hidden border border-slate-300/95 bg-card/95 p-0 shadow-2xl backdrop-blur-xl dark:border-white/20 sm:max-w-2xl">
                    {activeInfoModal === "financials" && (
                        <>
                            <DialogHeader className="border-b border-slate-300/90 bg-linear-to-r from-emerald-500/9 via-background to-cyan-500/5 px-5 py-4 dark:border-white/15 sm:px-6">
                                <div className="flex items-start gap-3">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10">
                                        <DollarSign className="size-5 text-emerald-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <DialogTitle className="text-lg font-black tracking-tight">
                                            Quote Financials
                                        </DialogTitle>
                                        <DialogDescription className="mt-1 text-xs sm:text-sm">
                                            Saved quote pricing and the key context behind this amount.
                                        </DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="max-h-[68vh] overflow-y-auto px-5 py-4 sm:px-6">
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <ModalMetric
                                        label="Quote Rate"
                                        value={`$${quote.rate.toLocaleString()}`}
                                        icon={<DollarSign className="size-3.5" />}
                                        emphasis
                                    />
                                    <ModalMetric
                                        label="Distance"
                                        value={`${quote.miles.toLocaleString()} mi`}
                                        icon={<Gauge className="size-3.5" />}
                                    />
                                    <ModalMetric
                                        label="Trailer"
                                        value={quote.enclosedTrailer ? "Enclosed" : "Open"}
                                        icon={<Container className="size-3.5" />}
                                    />
                                    <ModalMetric
                                        label="Condition"
                                        value={quote.vehicleInoperable ? "Inoperable" : "Operable"}
                                        icon={<ShieldCheck className="size-3.5" />}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {activeInfoModal === "eta" && (
                        <>
                            <DialogHeader className="border-b border-slate-300/90 bg-linear-to-r from-cyan-500/9 via-background to-blue-500/4 px-5 py-4 dark:border-white/15 sm:px-6">
                                <div className="flex items-start gap-3">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-cyan-500/25 bg-cyan-500/10">
                                        <Clock className="size-5 text-cyan-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <DialogTitle className="text-lg font-black tracking-tight">
                                            Transit Estimate
                                        </DialogTitle>
                                        <DialogDescription className="mt-1 text-xs sm:text-sm">
                                            Current estimated transit window and route for this quote.
                                        </DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="max-h-[68vh] overflow-y-auto px-5 py-4 sm:px-6">
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <ModalMetric
                                        label="ETA"
                                        value={`${quote.eta.min}–${quote.eta.max} days`}
                                        icon={<Clock className="size-3.5" />}
                                        emphasis
                                    />
                                    <ModalMetric
                                        label="Distance"
                                        value={`${quote.miles.toLocaleString()} mi`}
                                        icon={<Gauge className="size-3.5" />}
                                    />
                                </div>

                                <div className="mt-4 rounded-2xl border border-slate-300/90 bg-background/45 p-4 dark:border-white/15">
                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                                        Route
                                    </p>
                                    <div className="mt-3 space-y-3">
                                        <div className="flex items-start gap-2.5">
                                            <MapPin className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                                            <div className="min-w-0">
                                                <p className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                                    Origin
                                                </p>
                                                <p className="mt-1 break-words text-sm font-bold text-foreground">
                                                    {quote.fromAddress}
                                                </p>
                                                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                                                    {quote.fromZip}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="ml-1.5 h-5 w-px bg-linear-to-b from-emerald-500/60 to-cyan-500/60" />

                                        <div className="flex items-start gap-2.5">
                                            <MapPin className="mt-0.5 size-3.5 shrink-0 text-cyan-500" />
                                            <div className="min-w-0">
                                                <p className="text-xs font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                                                    Destination
                                                </p>
                                                <p className="mt-1 break-words text-sm font-bold text-foreground">
                                                    {quote.toAddress}
                                                </p>
                                                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                                                    {quote.toZip}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <EditQuoteModal
                quote={quote}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleSaveEdit}
            />

            <QuoteLoadRouteCompletionDialog
                open={isRouteCompletionOpen}
                onOpenChange={setIsRouteCompletionOpen}
                quote={quote}
                isSubmitting={isConvertingToLoad}
                onConfirm={performConversion}
            />
        </>
    )
}
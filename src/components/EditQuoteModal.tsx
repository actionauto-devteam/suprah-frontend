"use client"

import { useState } from "react"
import { X, User, Car, MapPin, DollarSign, SlidersHorizontal, Loader2, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getQuoteLoadRouteDraft } from "@/types/transportation"
import type { Quote } from "@/types/transportation"
import { US_STATES } from "@/components/create-load/types"

interface EditQuoteModalProps {
    quote: Quote
    isOpen: boolean
    onClose: () => void
    onSave: (updatedQuote: Partial<Quote>) => Promise<void>
}

export function EditQuoteModal({ quote, isOpen, onClose, onSave }: EditQuoteModalProps) {
    const routeDraft = getQuoteLoadRouteDraft(quote)
    const [isSaving, setIsSaving] = useState(false)
    const [formData, setFormData] = useState({
        firstName: quote.firstName,
        lastName: quote.lastName,
        email: quote.email,
        phone: quote.phone,
        fromLocationName: quote.fromLocation?.name || routeDraft.routeDetails.pickupLocation.name || "",
        fromStreetAddress: quote.fromLocation?.streetAddress || routeDraft.routeDetails.pickupLocation.address || "",
        fromCity: quote.fromLocation?.city || routeDraft.routeDetails.pickupLocation.city || "",
        fromState: quote.fromLocation?.state || routeDraft.routeDetails.pickupLocation.state || "",
        fromZip: quote.fromLocation?.zip || quote.fromZip,

        toLocationName: quote.toLocation?.name || routeDraft.routeDetails.deliveryLocation.name || "",
        toStreetAddress: quote.toLocation?.streetAddress || routeDraft.routeDetails.deliveryLocation.address || "",
        toCity: quote.toLocation?.city || routeDraft.routeDetails.deliveryLocation.city || "",
        toState: quote.toLocation?.state || routeDraft.routeDetails.deliveryLocation.state || "",
        toZip: quote.toLocation?.zip || quote.toZip,
        rate: quote.rate,
        miles: quote.miles,
        units: quote.units,
        enclosedTrailer: quote.enclosedTrailer,
        vehicleInoperable: quote.vehicleInoperable,
        vehicleName: quote.vehicleName || '',
        vin: quote.vin || '',
        stockNumber: quote.stockNumber || '',
        vehicleLocation: quote.vehicleLocation || '',
        etaMin: quote.eta.min,
        etaMax: quote.eta.max,
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value,
        }))
    }

    const handleSubmit = async (e: { preventDefault: () => void }) => {
        e.preventDefault()
        setIsSaving(true)
        try {
            await onSave({
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                phone: formData.phone,
                fromAddress: [
                    formData.fromStreetAddress.trim(),
                    [formData.fromCity.trim(), formData.fromState.trim()].filter(Boolean).join(", "),
                ].filter(Boolean).join(", "),
                fromZip: formData.fromZip,
                toAddress: [
                    formData.toStreetAddress.trim(),
                    [formData.toCity.trim(), formData.toState.trim()].filter(Boolean).join(", "),
                ].filter(Boolean).join(", "),
                toZip: formData.toZip,
                fromLocation: {
                    name: formData.fromLocationName.trim(),
                    streetAddress: formData.fromStreetAddress.trim(),
                    city: formData.fromCity.trim(),
                    state: formData.fromState.trim().toUpperCase(),
                    zip: formData.fromZip.trim(),
                    country: "US",
                },
                toLocation: {
                    name: formData.toLocationName.trim(),
                    streetAddress: formData.toStreetAddress.trim(),
                    city: formData.toCity.trim(),
                    state: formData.toState.trim().toUpperCase(),
                    zip: formData.toZip.trim(),
                    country: "US",
                },
                rate: formData.rate,
                miles: formData.miles,
                units: formData.units,
                enclosedTrailer: formData.enclosedTrailer,
                vehicleInoperable: formData.vehicleInoperable,
                vehicleName: formData.vehicleName,
                vin: formData.vin,
                stockNumber: formData.stockNumber,
                vehicleLocation: formData.vehicleLocation,
                eta: { min: formData.etaMin, max: formData.etaMax },
            })
            onClose()
        } catch (error) {
            console.error('Error saving quote:', error)
        } finally {
            setIsSaving(false)
        }
    }

    if (!isOpen) return null

    const fieldClass = "w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    const labelClass = "block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider"
    const sectionClass = "rounded-xl border border-border/60 bg-muted/20 p-3.5 sm:p-5 space-y-4"

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="bg-card text-card-foreground rounded-2xl shadow-2xl max-w-3xl w-full max-h-[95dvh] sm:max-h-[90dvh] overflow-hidden border border-border">
                {/* Header */}
                <div className="p-4 sm:p-6 pb-3 sm:pb-4 flex items-start justify-between gap-3 border-b border-border bg-muted/10">
                    <div className="min-w-0">
                        <h2 className="text-base sm:text-xl font-black flex items-center gap-2">
                            <FileText className="size-4 sm:size-5 text-primary shrink-0" />
                            EDIT QUOTE
                        </h2>
                        <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 font-medium">
                            Update customer, vehicle, and route information
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(95dvh-132px)] sm:max-h-[calc(90dvh-140px)] custom-scrollbar">
                    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">

                        {/* Customer Information */}
                        <div className={sectionClass}>
                            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-2">
                                <User className="size-4 text-primary" /> Customer Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>First Name</label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        className={fieldClass}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Last Name</label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        className={fieldClass}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className={fieldClass}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Phone</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className={fieldClass}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Vehicle Information */}
                        <div className={sectionClass}>
                            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-2">
                                <Car className="size-4 text-primary" /> Vehicle Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Vehicle Name</label>
                                    <input
                                        type="text"
                                        name="vehicleName"
                                        value={formData.vehicleName}
                                        onChange={handleChange}
                                        className={fieldClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>VIN</label>
                                    <input
                                        type="text"
                                        name="vin"
                                        value={formData.vin}
                                        onChange={handleChange}
                                        className={fieldClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Stock Number</label>
                                    <input
                                        type="text"
                                        name="stockNumber"
                                        value={formData.stockNumber}
                                        onChange={handleChange}
                                        className={fieldClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Vehicle Location</label>
                                    <input
                                        type="text"
                                        name="vehicleLocation"
                                        value={formData.vehicleLocation}
                                        onChange={handleChange}
                                        className={fieldClass}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Route Information */}
                        <div className={sectionClass}>
                            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-2">
                                <MapPin className="size-4 text-primary" /> Route Information
                            </h3>

                            <p className="text-[11px] text-muted-foreground">
                                City, State, and ZIP are required for quoting. Street Address is recommended and can be completed before dispatch.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <p className="text-[10px] font-bold text-primary uppercase">Origin</p>

                                    <div>
                                        <label className={labelClass}>Location Name — Optional</label>
                                        <input
                                            type="text"
                                            name="fromLocationName"
                                            value={formData.fromLocationName}
                                            onChange={handleChange}
                                            className={fieldClass}
                                        />
                                    </div>

                                    <div>
                                        <label className={labelClass}>Street Address — Recommended</label>
                                        <input
                                            type="text"
                                            name="fromStreetAddress"
                                            value={formData.fromStreetAddress}
                                            onChange={handleChange}
                                            className={fieldClass}
                                        />
                                    </div>

                                    <div>
                                        <label className={labelClass}>City *</label>
                                        <input
                                            type="text"
                                            name="fromCity"
                                            value={formData.fromCity}
                                            onChange={handleChange}
                                            className={fieldClass}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className={labelClass}>State *</label>
                                        <select
                                            name="fromState"
                                            value={formData.fromState}
                                            onChange={(e) =>
                                                setFormData(prev => ({
                                                    ...prev,
                                                    fromState: e.target.value,
                                                }))
                                            }
                                            className={fieldClass}
                                            required
                                        >
                                            <option value="">Select…</option>
                                            {US_STATES.map((state) => (
                                                <option key={state} value={state}>{state}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className={labelClass}>ZIP Code *</label>
                                        <input
                                            type="text"
                                            name="fromZip"
                                            value={formData.fromZip}
                                            onChange={handleChange}
                                            className={fieldClass}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[10px] font-bold text-rose-500 uppercase">Destination</p>

                                    <div>
                                        <label className={labelClass}>Location Name — Optional</label>
                                        <input
                                            type="text"
                                            name="toLocationName"
                                            value={formData.toLocationName}
                                            onChange={handleChange}
                                            className={fieldClass}
                                        />
                                    </div>

                                    <div>
                                        <label className={labelClass}>Street Address — Recommended</label>
                                        <input
                                            type="text"
                                            name="toStreetAddress"
                                            value={formData.toStreetAddress}
                                            onChange={handleChange}
                                            className={fieldClass}
                                        />
                                    </div>

                                    <div>
                                        <label className={labelClass}>City *</label>
                                        <input
                                            type="text"
                                            name="toCity"
                                            value={formData.toCity}
                                            onChange={handleChange}
                                            className={fieldClass}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className={labelClass}>State *</label>
                                        <select
                                            name="toState"
                                            value={formData.toState}
                                            onChange={(e) =>
                                                setFormData(prev => ({
                                                    ...prev,
                                                    toState: e.target.value,
                                                }))
                                            }
                                            className={fieldClass}
                                            required
                                        >
                                            <option value="">Select…</option>
                                            {US_STATES.map((state) => (
                                                <option key={state} value={state}>{state}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className={labelClass}>ZIP Code *</label>
                                        <input
                                            type="text"
                                            name="toZip"
                                            value={formData.toZip}
                                            onChange={handleChange}
                                            className={fieldClass}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quote Details */}
                        <div className={sectionClass}>
                            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-2">
                                <DollarSign className="size-4 text-primary" /> Quote Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className={labelClass}>Rate ($)</label>
                                    <input
                                        type="number"
                                        name="rate"
                                        value={formData.rate}
                                        onChange={handleChange}
                                        className={fieldClass}
                                        required
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Miles</label>
                                    <input
                                        type="number"
                                        name="miles"
                                        value={formData.miles}
                                        onChange={handleChange}
                                        className={fieldClass}
                                        required
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Units</label>
                                    <input
                                        type="number"
                                        name="units"
                                        value={formData.units}
                                        onChange={handleChange}
                                        className={fieldClass}
                                        required
                                        min="1"
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>ETA Min (days)</label>
                                    <input
                                        type="number"
                                        name="etaMin"
                                        value={formData.etaMin}
                                        onChange={handleChange}
                                        className={fieldClass}
                                        required
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>ETA Max (days)</label>
                                    <input
                                        type="number"
                                        name="etaMax"
                                        value={formData.etaMax}
                                        onChange={handleChange}
                                        className={fieldClass}
                                        required
                                        min="0"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Transport Options */}
                        <div className={sectionClass}>
                            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-2">
                                <SlidersHorizontal className="size-4 text-primary" /> Transport Options
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                                    <div>
                                        <p className="text-sm font-bold">Enclosed Trailer</p>
                                        <p className="text-[10px] text-muted-foreground font-medium">Ship vehicle in an enclosed trailer</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, enclosedTrailer: !prev.enclosedTrailer }))}
                                        className={cn(
                                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                                            formData.enclosedTrailer ? "bg-primary" : "bg-muted-foreground/30"
                                        )}
                                    >
                                        <span className={cn(
                                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                            formData.enclosedTrailer ? "translate-x-6" : "translate-x-1"
                                        )} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                                    <div>
                                        <p className="text-sm font-bold">Vehicle Inoperable</p>
                                        <p className="text-[10px] text-muted-foreground font-medium">Vehicle cannot be driven onto the carrier</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, vehicleInoperable: !prev.vehicleInoperable }))}
                                        className={cn(
                                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                                            formData.vehicleInoperable ? "bg-primary" : "bg-muted-foreground/30"
                                        )}
                                    >
                                        <span className={cn(
                                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                            formData.vehicleInoperable ? "translate-x-6" : "translate-x-1"
                                        )} />
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="px-4 sm:px-6 py-3 sm:py-4 flex flex-col-reverse sm:flex-row items-center justify-end gap-2 sm:gap-3 border-t border-border bg-muted/10">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSaving} className="w-full sm:w-auto">
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSaving}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold w-full sm:w-auto sm:min-w-30"
                        >
                            {isSaving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                            {isSaving ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
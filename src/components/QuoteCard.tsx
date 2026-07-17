import { Check, MapPin, Calendar, Package, Clock, Trash2, User, Building2, Truck } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Quote } from "@/types/transportation"
import { useState } from "react"
import { useAlert, AlertDialog } from "@/components/AlertDialog"
import { EditQuoteModal } from "./EditQuoteModal"

interface QuoteCardProps {
    quote: Quote
    onConvertToLoad: (id: string) => Promise<boolean | void>
    onDelete: (id: string) => void
    onUpdate: (id: string, updatedQuote: Partial<Quote>) => Promise<void>
}

export function QuoteCard({ quote, onConvertToLoad, onDelete, onUpdate }: QuoteCardProps) {
    const [isDeleting, setIsDeleting] = useState(false)
    const [isConvertingToLoad, setIsConvertingToLoad] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const { showAlert, alert, hideAlert } = useAlert()

    const vehicle = quote.vehicleId

    const vehicleName = vehicle
        ? `${vehicle.year} ${vehicle.make} ${vehicle.modelName}`
        : quote.vehicleName || 'N/A'

    const isAlreadyConverted = quote.status === "booked"

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'America/Denver',
        })
    }


    const handleConvertToLoad = async () => {
        if (isAlreadyConverted) {
            showAlert({
                type: "success",
                title: "Already Converted",
                message:
                    "This quote has already been converted into a load."
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
        showAlert({
            type: "confirm",
            title: "Delete Quote",
            message: `Are you sure you want to delete this quote for ${quote.firstName} ${quote.lastName}? This action cannot be undone.`,
            confirmText: "Yes, Delete",
            cancelText: "No, Keep Quote",
            onConfirm: async () => {
                setIsDeleting(true)
                try {
                    await onDelete(quote._id)
                } catch (error) {
                    console.error('Error deleting quote:', error)
                    setIsDeleting(false)
                    throw error
                }
            }
        })
    }

    const handleSaveEdit = async (updatedQuote: Partial<Quote>) => {
        await onUpdate(quote._id, updatedQuote)
        showAlert({
            type: "success",
            title: "Quote Updated",
            message: "The quote has been successfully updated."
        })
    }

    return (
        <>
            <Card className="border border-border p-0 hover:shadow-lg transition-shadow duration-300 overflow-hidden">
                <AlertDialog {...alert} onOpenChange={hideAlert} />
                <CardContent className="p-0">
                    <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-border">
                        {/* Left Section - Vehicle Info */}
                        <div className="w-full lg:w-1/3 bg-linear-to-br from-muted/40 to-card p-4 sm:p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-bold text-muted-foreground tracking-wider uppercase">Vehicle Info</h3>
                                <Badge variant="outline" className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700 text-xs">
                                    <Check className="w-3 h-3 mr-1" />
                                    Ready
                                </Badge>
                            </div>

                            {quote.vehicleImage && (
                                <div className="mb-4 relative group">
                                    <img
                                        src={quote.vehicleImage}
                                        alt={vehicleName}
                                        className="w-full h-40 object-cover rounded-lg shadow-sm group-hover:shadow-md transition-shadow"
                                    />
                                    <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                </div>
                            )}

                            <div className="space-y-3">
                                <div>
                                    <p className="text-base font-semibold text-foreground">{vehicleName}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        {quote.vehicleLocation && (
                                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                <MapPin className="w-3 h-3" />
                                                {quote.vehicleLocation}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1.5 pt-3 border-t border-border">
                                    {(vehicle?.vin || quote.vin) && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-muted-foreground">VIN</span>
                                            <span className="text-xs font-medium text-foreground">{vehicle?.vin || quote.vin}</span>
                                        </div>
                                    )}
                                    {(vehicle?.stockNumber || quote.stockNumber) && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-muted-foreground">Stock #</span>
                                            <span className="text-xs font-medium text-foreground">{vehicle?.stockNumber || quote.stockNumber}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-3 border-t border-border">
                                    <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 space-y-1">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-muted-foreground">Quote Rate</span>
                                            <span className="text-lg font-bold text-green-700 dark:text-green-400">${quote.rate.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-muted-foreground">ETA</span>
                                            <span className="text-xs font-medium text-foreground">{quote.eta.min}-{quote.eta.max} days</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-xs text-muted-foreground flex items-center gap-1 pt-2">
                                    <Calendar className="w-3 h-3" />
                                    Added {formatDate(quote.createdAt)}
                                </div>

                                {quote.createdBy && (
                                    <div className="flex items-center gap-1.5 pt-1">
                                        {quote.createdBy.avatar ? (
                                            <img
                                                src={quote.createdBy.avatar}
                                                alt={quote.createdBy.name || quote.createdBy.email}
                                                className="w-4 h-4 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-4 h-4 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                                                <User className="w-2.5 h-2.5 text-green-600 dark:text-green-400" />
                                            </div>
                                        )}
                                        <span className="text-xs text-muted-foreground">
                                            By{" "}
                                            <span className="font-medium text-foreground">
                                                {quote.createdBy.name || quote.createdBy.email || "Unknown"}
                                            </span>
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Section - Shipment Details */}
                        <div className="w-full lg:w-2/3 p-4 sm:p-6 bg-card">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-xs font-bold text-muted-foreground tracking-wider uppercase">Shipment Details</h3>
                                <div className="flex items-center gap-2">
                                    {quote.organization && (
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Building2 className="w-3 h-3" />
                                            <span className="font-medium text-foreground">{quote.organization.name}</span>
                                        </div>
                                    )}
                                    <Badge
                                        className={
                                            isAlreadyConverted
                                                ? "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-700"
                                                : "bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-700"
                                        }
                                    >
                                        {isAlreadyConverted ? "Converted to Load" : "Pending Assignment"}   
                                    </Badge>
                                </div>
                            </div>

                            <div className="space-y-5">
                                {/* Customer & Route Info */}
                                <div className="bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                                <Package className="w-3 h-3" />
                                                Customer
                                            </p>
                                            <p className="text-sm font-semibold text-foreground">{quote.firstName} {quote.lastName}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{quote.email}</p>
                                            <p className="text-xs text-muted-foreground">{quote.phone}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                Route
                                            </p>
                                            <div className="space-y-1">
                                                <div className="flex items-start gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5"></div>
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground">{quote.fromAddress}</p>
                                                        <p className="text-xs text-muted-foreground">{quote.fromZip}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 ml-1">
                                                    <div className="w-px h-4 bg-border"></div>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5"></div>
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground">{quote.toAddress}</p>
                                                        <p className="text-xs text-muted-foreground">{quote.toZip}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Shipment Options */}
                                <div className="grid grid-cols-1 xs:grid-cols-3 gap-2 sm:gap-3">
                                    <div className="bg-muted/40 rounded-lg p-2 sm:p-3 border border-border">
                                        <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Transport Type</p>
                                        <p className="text-xs sm:text-sm font-semibold text-foreground">
                                            {quote.enclosedTrailer ? 'Enclosed' : 'Open'}
                                        </p>
                                    </div>
                                    <div className="bg-muted/40 rounded-lg p-2 sm:p-3 border border-border">
                                        <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Status</p>
                                        <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                                            {quote.vehicleInoperable ? 'Inoperable' : 'Operable'}
                                        </p>
                                    </div>
                                    <div className="bg-muted/40 rounded-lg p-2 sm:p-3 border border-border">
                                        <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Units</p>
                                        <p className="text-xs sm:text-sm font-semibold text-foreground">{quote.units}</p>
                                    </div>
                                </div>

                                {/* Timeline Status */}
                                <div className="bg-muted/40 rounded-lg p-4 border border-border">
                                    <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Shipment Timeline
                                    </p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Requested Pickup</p>
                                            <p className="text-xs font-medium text-foreground">{formatDate(quote.createdAt)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Scheduled Pickup</p>
                                            <p className="text-xs font-medium text-muted-foreground/60">Pending</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Scheduled Delivery</p>
                                            <p className="text-xs font-medium text-muted-foreground/60">Pending</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Estimated Miles</p>
                                            <p className="text-xs font-medium text-foreground">{quote.miles} mi</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 pt-2">
                                    <Button
                                        className={`flex-1 shadow-sm h-9 sm:h-10 text-xs sm:text-sm ${
                                            isAlreadyConverted
                                                ? "bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-not-allowed"
                                                : "bg-green-500 hover:bg-green-600 text-white"
                                        }`}
                                        onClick={handleConvertToLoad}
                                        disabled={
                                            isAlreadyConverted ||
                                            isConvertingToLoad ||
                                            isDeleting
                                        }
                                    >
                                        {isAlreadyConverted ? (
                                            <Check className="w-3.5 h-3.5 mr-1.5" />
                                        ) : (
                                            <Truck className="w-3.5 h-3.5 mr-1.5" />
                                        )}

                                        {isAlreadyConverted
                                            ? "Converted to Load"
                                            : isConvertingToLoad
                                                ? "Converting..."
                                                : "Convert to Load"}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="border-border hover:bg-muted h-9 sm:h-10 text-xs sm:text-sm"
                                        onClick={() => setIsEditModalOpen(true)}
                                        disabled={isConvertingToLoad || isConvertingToLoad || isDeleting}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950 h-9 sm:h-10 text-xs sm:text-sm px-3"
                                        onClick={handleDelete}
                                        disabled={isDeleting || isConvertingToLoad || isConvertingToLoad}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
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

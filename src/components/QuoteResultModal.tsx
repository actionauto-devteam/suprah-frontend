import * as React from "react"
import { CheckCircle, MapPin, Truck, Clock, DollarSign, Package, ArrowRight } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Quote } from "@/types/transportation"

interface QuoteResultModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quote: Quote | null
  onConvertToLoad: () => void
  onViewQuote: () => void
}

export function QuoteResultModal({
  open,
  onOpenChange,
  quote,
  onConvertToLoad,
  onViewQuote
}: QuoteResultModalProps) {
  if (!quote) return null

  const vehicle = quote.vehicleId
  const vehicleName = vehicle
    ? `${vehicle.year} ${vehicle.make} ${vehicle.modelName}`
    : quote.vehicleName || 'Vehicle'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90dvh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <div className="flex items-start sm:items-center gap-3 mb-2 sm:mb-4">
            <div className="shrink-0 rounded-full p-2.5 sm:p-3 bg-green-50 dark:bg-green-950 border-2 border-green-200 dark:border-green-800">
              <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-2xl font-bold text-foreground">
                Quote Calculated Successfully
              </DialogTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Your shipping quote is ready for review
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 mt-2 sm:mt-4">
          {/* Vehicle Information */}
          {quote.vehicleImage && (
            <div className="relative rounded-lg overflow-hidden">
              <img
                src={quote.vehicleImage}
                alt={vehicleName}
                className="w-full h-36 sm:h-48 object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-3 sm:p-4">
                <h3 className="text-white font-semibold text-base sm:text-lg truncate">{vehicleName}</h3>
                {quote.vehicleLocation && (
                  <div className="flex items-center gap-1 text-white/90 text-xs sm:text-sm mt-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{quote.vehicleLocation}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Customer Information */}
          <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2 text-sm sm:text-base">
              <Package className="w-4 h-4 text-primary" />
              Customer Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Name</p>
                <p className="font-medium text-foreground">{quote.firstName} {quote.lastName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium text-foreground break-all">{quote.email}</p>
              </div>
              <div className="col-span-1 sm:col-span-2">
                <p className="text-muted-foreground">Phone</p>
                <p className="font-medium text-foreground">{quote.phone}</p>
              </div>
            </div>
          </div>

          {/* Route Information */}
          <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
            <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-sm sm:text-base">
              <MapPin className="w-4 h-4 text-primary" />
              Route Details
            </h4>
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-2 mt-1 shrink-0">
                <div className="w-3 h-3 rounded-full bg-green-500 ring-4 ring-green-100 dark:ring-green-900"></div>
                <div className="w-0.5 h-12 bg-linear-to-b from-green-500 to-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-red-500 ring-4 ring-red-100 dark:ring-red-900"></div>
              </div>
              <div className="flex-1 space-y-6 min-w-0">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Origin</p>
                  <p className="font-semibold text-foreground truncate">{quote.fromAddress}</p>
                  <p className="text-sm text-muted-foreground">{quote.fromZip}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Destination</p>
                  <p className="font-semibold text-foreground truncate">{quote.toAddress}</p>
                  <p className="text-sm text-muted-foreground">{quote.toZip}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground mb-1">Distance</p>
                <p className="text-lg font-bold text-foreground">{quote.miles} mi</p>
              </div>
            </div>
          </div>

          {/* Pricing and Timeline */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-linear-to-br from-primary/50 to-primary/10 border border-primary/20 rounded-lg p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                <h4 className="font-semibold text-foreground text-xs sm:text-base truncate">Transport Rate</h4>
              </div>
              <p className="text-xl sm:text-3xl font-bold text-primary truncate">${quote.rate.toLocaleString()}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Total shipping cost</p>
            </div>

            <div className="bg-linear-to-br from-primary/50 to-primary/10 border border-primary/20 rounded-lg p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                <h4 className="font-semibold text-foreground text-xs sm:text-base truncate">Estimated Time</h4>
              </div>
              <p className="text-xl sm:text-3xl font-bold text-primary">{quote.eta.min}-{quote.eta.max}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">days</p>
            </div>
          </div>

          {/* Transport Options */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="bg-card rounded-lg p-2.5 sm:p-3 border border-border">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Transport Type</p>
              <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                {quote.enclosedTrailer ? 'Enclosed' : 'Open'}
              </p>
            </div>
            <div className="bg-card rounded-lg p-2.5 sm:p-3 border border-border">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Vehicle Status</p>
              <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                {quote.vehicleInoperable ? 'Inoperable' : 'Operable'}
              </p>
            </div>
            <div className="bg-card rounded-lg p-2.5 sm:p-3 border border-border">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Units</p>
              <p className="text-xs sm:text-sm font-semibold text-foreground">{quote.units}</p>
            </div>
          </div>

          {/* VIN and Stock Info */}
          {(quote.vin || quote.stockNumber) && (
            <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quote.vin && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">VIN Number</p>
                    <p className="text-sm font-semibold text-foreground break-all">{quote.vin}</p>
                  </div>
                )}
                {quote.stockNumber && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Stock Number</p>
                    <p className="text-sm font-semibold text-foreground">{quote.stockNumber}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
            <Button
              onClick={onConvertToLoad}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white shadow-lg h-11 sm:h-12 text-sm sm:text-base font-semibold"
            >
              <Truck className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Convert to Load
            </Button>
            <Button
              onClick={onViewQuote}
              variant="outline"
              className="flex-1 border-2 border-green-500 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950 h-11 sm:h-12 text-sm sm:text-base font-semibold"
            >
              View Draft
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

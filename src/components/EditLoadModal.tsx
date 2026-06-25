"use client"

import * as React from "react"
import { X, Lock, Megaphone, DollarSign, Phone, FileText, Loader2, Truck, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Load, LoadStatus } from "@/types/load"
import { trailerTypeOptions } from "@/components/driver-profile/driver-profile-constants"
import { cn } from "@/lib/utils"

interface EditLoadModalProps {
  load: Load;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updatedLoad: Partial<Load>) => Promise<void>;
}

export function EditLoadModal({ load, isOpen, onClose, onSave }: EditLoadModalProps) {
  const [isSaving, setIsSaving] = React.useState(false)
  const [formData, setFormData] = React.useState({
    status: load.status,
    pickupLocation: {
      city: load.pickupLocation?.city || '',
      state: load.pickupLocation?.state || '',
      contactName: load.pickupLocation?.contactName || '',
      email: load.pickupLocation?.email || '',
      phone: load.pickupLocation?.phone || '',
    },
    deliveryLocation: {
      city: load.deliveryLocation?.city || '',
      state: load.deliveryLocation?.state || '',
      contactName: load.deliveryLocation?.contactName || '',
      email: load.deliveryLocation?.email || '',
      phone: load.deliveryLocation?.phone || '',
    },
    dates: {
      firstAvailable: load.dates?.firstAvailable || '',
      pickupDeadline: load.dates?.pickupDeadline || '',
      deliveryDeadline: load.dates?.deliveryDeadline || '',
    },
    pickedUpAt: load.pickedUpAt || '',
    deliveredAt: load.deliveredAt || '',
    visibility: load.additionalInfo?.visibility || 'private',
    trailerTypeRequired: load.trailerType || '',
    pricing: {
      carrierPayAmount: load.pricing?.carrierPayAmount || 0,
      copCodAmount: load.pricing?.copCodAmount || 0,
    },
    additionalInfo: {
      notes: load.additionalInfo?.notes || '',
      instructions: load.additionalInfo?.instructions || '',
    },
    loadNumber: load.loadNumber || '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (name.includes('.')) {
      const [parent, child] = name.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev as any)[parent],
          [child]: value
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const payload: Partial<Load> = {
        status: formData.status as LoadStatus,
        pickupLocation: {
          ...load.pickupLocation,
          ...formData.pickupLocation
        },
        deliveryLocation: {
          ...load.deliveryLocation,
          ...formData.deliveryLocation
        },
        dates: {
          ...load.dates,
          ...formData.dates
        },
        pickedUpAt: formData.pickedUpAt,
        deliveredAt: formData.deliveredAt,
        additionalInfo: {
          ...load.additionalInfo,
          visibility: formData.visibility as any,
          notes: formData.additionalInfo.notes,
          instructions: formData.additionalInfo.instructions,
        },
        trailerType: formData.trailerTypeRequired,
        pricing: {
          ...load.pricing,
          carrierPayAmount: Number(formData.pricing.carrierPayAmount),
          copCodAmount: Number(formData.pricing.copCodAmount),
        }
      }
      await onSave(load._id, payload)
      onClose()
    } catch (error) {
      console.error('Error saving load:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  const statusOptions: LoadStatus[] = [
    "Posted",
    "Assigned",
    "Accepted",
    "Picked Up",
    "In-Transit",
    "Delivered",
    "Cancelled"
  ]

  const fieldClass = "w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
  const dateFieldClass = cn(fieldClass, "dark:scheme-dark")
  const labelClass = "block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider"
  const sectionClass = "rounded-xl border border-border/60 bg-muted/20 p-3.5 sm:p-5 space-y-4"

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-card text-card-foreground rounded-2xl shadow-2xl max-w-3xl w-full max-h-[95dvh] sm:max-h-[90dvh] overflow-hidden border border-border">
        {/* Header */}
        <div className="p-4 sm:p-6 pb-3 sm:pb-4 flex items-start justify-between gap-3 border-b border-border bg-muted/10">
          <div className="min-w-0">
            <h2 className="text-base sm:text-xl font-black flex items-center gap-2 flex-wrap">
              <Truck className="size-4 sm:size-5 text-primary shrink-0" />
              EDIT LOAD <span className="text-primary font-mono break-all">#{load.loadNumber}</span>
            </h2>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 font-medium">
              Manage status, timeline, routing, and financials
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(95dvh-132px)] sm:max-h-[calc(90dvh-140px)] custom-scrollbar">
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Status & ID */}
            <div className={sectionClass}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Current Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className={fieldClass}
                    required
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Load ID (Internal)</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={load.loadNumber}
                      disabled
                      className="w-full h-10 px-3 py-2 text-sm rounded-md border border-border bg-muted/50 text-muted-foreground cursor-not-allowed font-mono"
                    />
                    <Lock className="absolute right-3 top-3 size-4 text-muted-foreground/50" />
                  </div>
                </div>
              </div>
            </div>

            {/* Route Information */}
            <div className={sectionClass}>
              <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-2">
                <MapPin className="size-4 text-primary" /> Route Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-primary uppercase">Pickup</p>
                  <div>
                    <label className={labelClass}>City & State</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" name="pickupLocation.city" value={formData.pickupLocation.city} onChange={handleChange} placeholder="City" className={fieldClass} />
                      <input type="text" name="pickupLocation.state" value={formData.pickupLocation.state} onChange={handleChange} placeholder="ST" className={fieldClass} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Contact Name</label>
                    <input type="text" name="pickupLocation.contactName" value={formData.pickupLocation.contactName} onChange={handleChange} className={fieldClass} />
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-rose-500 uppercase">Delivery</p>
                  <div>
                    <label className={labelClass}>City & State</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" name="deliveryLocation.city" value={formData.deliveryLocation.city} onChange={handleChange} placeholder="City" className={fieldClass} />
                      <input type="text" name="deliveryLocation.state" value={formData.deliveryLocation.state} onChange={handleChange} placeholder="ST" className={fieldClass} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Contact Name</label>
                    <input type="text" name="deliveryLocation.contactName" value={formData.deliveryLocation.contactName} onChange={handleChange} className={fieldClass} />
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className={sectionClass}>
              <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-2">
                <FileText className="size-4 text-primary" /> Shipment Timeline
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Pickup Deadline</label>
                  <input type="date" name="dates.pickupDeadline" value={formData.dates.pickupDeadline} onChange={handleChange} className={dateFieldClass} />
                </div>
                <div>
                  <label className={labelClass}>Delivery Deadline</label>
                  <input type="date" name="dates.deliveryDeadline" value={formData.dates.deliveryDeadline} onChange={handleChange} className={dateFieldClass} />
                </div>
                <div>
                  <label className={labelClass}>Actual Picked Up</label>
                  <input type="date" name="pickedUpAt" value={formData.pickedUpAt} onChange={handleChange} className={dateFieldClass} />
                </div>
                <div>
                  <label className={labelClass}>Actual Delivered</label>
                  <input type="date" name="deliveredAt" value={formData.deliveredAt} onChange={handleChange} className={dateFieldClass} />
                </div>
              </div>
            </div>

            {/* Financials & Logic */}
            <div className={sectionClass}>
              <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-2">
                <DollarSign className="size-4 text-primary" /> Financials & Visibility
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Carrier Pay ($)</label>
                  <input type="number" name="pricing.carrierPayAmount" value={formData.pricing.carrierPayAmount} onChange={handleChange} className={fieldClass} />
                </div>
                <div>
                  <label className={labelClass}>Trailer Requirement</label>
                  <select name="trailerTypeRequired" value={formData.trailerTypeRequired} onChange={handleChange} className={fieldClass}>
                    <option value="">Any trailer</option>
                    {trailerTypeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                <div>
                  <p className="text-sm font-bold">Post to Driver Board</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Visible to all available drivers</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, visibility: prev.visibility === 'public' ? 'private' : 'public' }))}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                    formData.visibility === 'public' ? "bg-emerald-600" : "bg-muted-foreground/30"
                  )}
                >
                  <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", formData.visibility === 'public' ? "translate-x-6" : "translate-x-1")} />
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className={sectionClass}>
              <label className={labelClass}>Dispatch Notes</label>
              <textarea
                name="additionalInfo.notes"
                value={formData.additionalInfo.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Internal dispatcher notes..."
                className={cn(fieldClass, "h-auto py-3 resize-none")}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 flex flex-col-reverse sm:flex-row items-center justify-end gap-2 sm:gap-3 border-t border-border bg-muted/10">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving} className="w-full sm:w-auto">Cancel</Button>
            <Button type="submit" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold w-full sm:w-auto sm:min-w-30">
              {isSaving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

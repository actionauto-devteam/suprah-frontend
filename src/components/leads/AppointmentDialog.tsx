import * as React from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog"

interface AppointmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: any
  apptForm: { 
    date: string; 
    time: string; 
    notes: string; 
    locationOrVehicle: string;
    title: string;
    type: string;
    duration: string;
  }
  setApptForm: (form: any) => void
  onSave: () => void
  isSubmitting?: boolean
}

export const AppointmentDialog = React.memo(({
  open,
  onOpenChange,
  lead,
  apptForm,
  setApptForm,
  onSave,
  isSubmitting = false
}: AppointmentDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl bg-card border border-border/40 text-foreground shadow-2xl shadow-black/70">
        <DialogHeader>
          <DialogTitle className="text-foreground text-base font-semibold">Schedule Appointment</DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            {lead?.firstName} {lead?.lastName}
            {lead?.phone && <span className="ml-2 font-mono">{lead.phone}</span>}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div>
            <label className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground block mb-1.5">Appointment Title *</label>
            <input
              type="text"
              placeholder="e.g. Test Drive, Vehicle Delivery…"
              value={apptForm.title || ''}
              onChange={e => setApptForm({ ...apptForm, title: e.target.value })}
              className="w-full h-9 px-3 rounded-lg bg-background border border-border/40 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-emerald-700/60 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground block mb-1.5">Date *</label>
              <input
                type="date"
                value={apptForm.date}
                onChange={e => setApptForm({ ...apptForm, date: e.target.value })}
                className="w-full h-9 px-3 rounded-lg bg-background border border-border/40 text-sm text-foreground outline-none focus:border-emerald-700/60 transition-colors"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground block mb-1.5">Time *</label>
              <input
                type="time"
                value={apptForm.time}
                onChange={e => setApptForm({ ...apptForm, time: e.target.value })}
                className="w-full h-9 px-3 rounded-lg bg-background border border-border/40 text-sm text-foreground outline-none focus:border-emerald-700/60 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground block mb-1.5">Type *</label>
              <select
                value={apptForm.type || 'in-person'}
                onChange={e => setApptForm({ ...apptForm, type: e.target.value })}
                className="w-full h-9 px-3 rounded-lg bg-background border border-border/40 text-sm text-foreground outline-none focus:border-emerald-700/60 transition-colors appearance-none"
              >
                <option value="in-person">In-Person</option>
                <option value="phone">Phone Call</option>
                <option value="video">Video Meet</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground block mb-1.5">Duration</label>
              <select
                value={apptForm.duration || '30'}
                onChange={e => setApptForm({ ...apptForm, duration: e.target.value })}
                className="w-full h-9 px-3 rounded-lg bg-background border border-border/40 text-sm text-foreground outline-none focus:border-emerald-700/60 transition-colors appearance-none"
              >
                <option value="15">15 mins</option>
                <option value="30">30 mins</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground block mb-1.5">Location / Vehicle</label>
            <input
              type="text"
              placeholder="e.g. Orem Showroom, Test Drive…"
              value={apptForm.locationOrVehicle}
              onChange={e => setApptForm({ ...apptForm, locationOrVehicle: e.target.value })}
              className="w-full h-9 px-3 rounded-lg bg-background border border-border/40 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-emerald-700/60 transition-colors"
            />
          </div>

          <div>
            <label className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground block mb-1.5">Notes</label>
            <textarea
              placeholder="Additional details…"
              value={apptForm.notes}
              onChange={e => setApptForm({ ...apptForm, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border/40 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-emerald-700/60 transition-colors resize-none"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 pt-1">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 h-8 rounded-lg text-xs text-muted-foreground border border-border hover:text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!apptForm.date || !apptForm.time || !apptForm.title || isSubmitting}
            className="px-4 h-8 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {isSubmitting ? 'Saving...' : 'Save & Schedule'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})

AppointmentDialog.displayName = "AppointmentDialog"

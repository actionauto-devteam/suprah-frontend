"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Calendar, CalendarClock, MapPin, Phone, Video } from "lucide-react";
import { Appointment } from "@/types/appointment";
import { fmtLongDateTimeMDT } from "@/lib/timezone";

interface ReschedulePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointments: Appointment[];
  onSelect: (appointment: Appointment) => void;
}

function typeIcon(type: Appointment["type"]) {
  switch (type) {
    case "video":
      return <Video className="h-4 w-4" />;
    case "phone":
      return <Phone className="h-4 w-4" />;
    case "in-person":
      return <MapPin className="h-4 w-4" />;
    default:
      return <Calendar className="h-4 w-4" />;
  }
}

export function ReschedulePickerDialog({
  open,
  onOpenChange,
  appointments,
  onSelect,
}: ReschedulePickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Which appointment?
          </DialogTitle>
          <DialogDescription>
            This lead has more than one upcoming appointment. Pick the one to reschedule.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {appointments.map((appointment) => (
            <button
              key={appointment._id}
              type="button"
              onClick={() => onSelect(appointment)}
              className="flex items-start gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left transition hover:border-emerald-500/40 hover:bg-emerald-500/[0.06] dark:border-emerald-400/15 dark:hover:bg-emerald-400/10"
            >
              <span className="mt-0.5 text-slate-400 dark:text-slate-500">
                {typeIcon(appointment.type)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {appointment.title}
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {fmtLongDateTimeMDT(appointment.startTime)}
                </span>
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

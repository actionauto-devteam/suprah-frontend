"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { fetchAvailableSlots, fetchMonthAvailability } from "@/lib/api/serviceSlots";
import type { SlotAvailability } from "@/lib/api/serviceSlots";
import type { OwnedVehicle } from "@/lib/api/vehicles";
import { Wrench, Clock, Loader2, CalendarX } from "lucide-react";
import { cn } from "@/lib/utils";

const SERVICE_TYPES = [
  { value: "Oil Change", label: "Oil Change" },
  { value: "Tire Rotation", label: "Tire Rotation" },
  { value: "Inspection", label: "Full Inspection" },
  { value: "Brake Service", label: "Brake Service" },
  { value: "Battery Check", label: "Battery Check" },
  { value: "Transmission Service", label: "Transmission Service" },
  { value: "Air Filter Replacement", label: "Air Filter Replacement" },
  { value: "Other", label: "Other" },
];

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toMonthStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

interface BookServiceModalProps {
  vehicle: OwnedVehicle | null;
  vehicles?: OwnedVehicle[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BookServiceModal({
  vehicle,
  vehicles,
  isOpen,
  onOpenChange,
  onSuccess,
}: BookServiceModalProps) {
  const queryClient = useQueryClient();

  const [selectedVehicleId, setSelectedVehicleId] = React.useState<string>("");
  const [serviceType, setServiceType] = React.useState("Oil Change");
  const [preferredDate, setPreferredDate] = React.useState<Date | undefined>(undefined);
  const [selectedSlotId, setSelectedSlotId] = React.useState<string>("");
  const [notes, setNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Track the current viewed month to fetch availability
  const [viewMonth, setViewMonth] = React.useState<string>(() => toMonthStr(new Date()));

  const hasMultiple = vehicles && vehicles.length > 1;

  const activeVehicle = React.useMemo(() => {
    if (hasMultiple && selectedVehicleId) {
      return vehicles?.find((v) => v.id === selectedVehicleId || v._id === selectedVehicleId) ?? vehicle;
    }
    return vehicle;
  }, [hasMultiple, selectedVehicleId, vehicles, vehicle]);

  React.useEffect(() => {
    if (vehicle) setSelectedVehicleId(vehicle.id || vehicle._id);
  }, [vehicle]);

  // Reset slot when date changes
  React.useEffect(() => {
    setSelectedSlotId("");
  }, [preferredDate]);

  // ─── Month availability (which dates have any open slots) ─────────────────
  const { data: availableDates = [] } = useQuery<string[]>({
    queryKey: ["slotCalendar", viewMonth],
    queryFn: () => fetchMonthAvailability(viewMonth),
    enabled: isOpen,
    staleTime: 60_000,
  });

  // ─── Slots for the selected date ─────────────────────────────────────────
  const selectedDateStr = preferredDate ? toLocalDateStr(preferredDate) : "";
  const { data: slots = [], isFetching: slotsLoading } = useQuery<SlotAvailability[]>({
    queryKey: ["slots", selectedDateStr],
    queryFn: () => fetchAvailableSlots(selectedDateStr),
    enabled: !!selectedDateStr && isOpen,
    staleTime: 30_000,
  });

  // ─── Disabled dates: past + dates with no available slots ────────────────
  const availableDateSet = React.useMemo(() => new Set(availableDates), [availableDates]);

  const disabledDates = React.useCallback(
    (d: Date): boolean => {
      // If we have fetched availability data, disable dates not in the set
      if (availableDates.length === 0) return false;
      const str = toLocalDateStr(d);
      return !availableDateSet.has(str);
    },
    [availableDates, availableDateSet]
  );

  const vehicleName = activeVehicle
    ? `${activeVehicle.year} ${activeVehicle.make} ${activeVehicle.model}`
    : "your vehicle";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preferredDate || !selectedSlotId) return;

    const slot = slots.find((s) => s._id === selectedSlotId);
    if (!slot) return;

    const [hours, minutes] = slot.time.split(":").map(Number);
    const startTime = new Date(preferredDate);
    startTime.setHours(hours, minutes, 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 2);

    setIsSubmitting(true);
    try {
      await apiClient.post("/api/appointments", {
        title: `Service — ${vehicleName}`,
        type: "service",
        entryType: "appointment",
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        notes: `Service type: ${serviceType}.${notes ? " " + notes : ""}`,
        slotId: selectedSlotId,
        participants: [],
        guestEmails: [],
      });

      toast.success("Service appointment booked! We'll confirm soon.");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["slots", selectedDateStr] });
      queryClient.invalidateQueries({ queryKey: ["slotCalendar", viewMonth] });

      onOpenChange(false);
      onSuccess?.();
      setPreferredDate(undefined);
      setSelectedSlotId("");
      setNotes("");
      setServiceType("Oil Change");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to book appointment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = !!preferredDate && !!selectedSlotId && !isSubmitting;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Wrench className="h-4 w-4 text-primary" />
            </div>
            <DialogTitle className="text-lg font-bold">Book Service Appointment</DialogTitle>
          </div>
          {vehicleName && (
            <DialogDescription className="text-sm font-medium text-foreground">
              {vehicleName}
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Vehicle picker */}
          {hasMultiple && vehicles && (
            <div className="space-y-1.5">
              <Label>Select Vehicle</Label>
              <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id || v._id} value={v.id || v._id}>
                      {v.year} {v.make} {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Service Type</Label>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_TYPES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date picker — grays out dates with no available slots */}
          <div className="space-y-1.5">
            <Label>
              Preferred Date
              {availableDates.length > 0 && (
                <span className="ml-1.5 text-[10px] text-muted-foreground font-normal">
                  (gray = unavailable)
                </span>
              )}
            </Label>
            <DatePicker
              value={preferredDate}
              onChange={(d) => {
                setPreferredDate(d);
                if (d) setViewMonth(toMonthStr(d));
              }}
              placeholder="Select an available date"
              disablePastDates
              disabledDates={availableDates.length > 0 ? disabledDates : undefined}
            />
          </div>

          {/* Time slot picker */}
          {preferredDate && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Available Times
              </Label>

              {slotsLoading ? (
                <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading available times…
                </div>
              ) : slots.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/50 bg-muted/20 py-5 px-3 text-center">
                  <CalendarX className="h-6 w-6 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">
                    No time slots available on this date.
                  </p>
                  <p className="text-[11px] text-muted-foreground/60">
                    Please select a different date.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {slots.map((slot) => {
                    const full = slot.isFull;
                    const selected = selectedSlotId === slot._id;
                    return (
                      <button
                        key={slot._id}
                        type="button"
                        disabled={full}
                        onClick={() => !full && setSelectedSlotId(slot._id)}
                        className={cn(
                          "relative rounded-xl border px-3 py-2.5 text-left text-sm transition-all",
                          full
                            ? "cursor-not-allowed border-border/30 bg-muted/20 opacity-40"
                            : selected
                            ? "border-primary bg-primary/8 ring-1 ring-primary/30"
                            : "border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
                        )}
                      >
                        <p className={cn("font-semibold text-xs", full ? "text-muted-foreground" : selected ? "text-primary" : "text-foreground")}>
                          {slot.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {full
                            ? "Full"
                            : `${slot.maxBookings - slot.currentBookings} spot${slot.maxBookings - slot.currentBookings === 1 ? "" : "s"} left`}
                        </p>
                        {selected && (
                          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe any symptoms, concerns, or special requests..."
              className="resize-none h-20"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={!canSubmit}>
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Booking…</>
              ) : (
                "Book Appointment"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

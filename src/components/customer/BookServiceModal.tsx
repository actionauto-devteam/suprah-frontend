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
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type { OwnedVehicle } from "@/lib/api/vehicles";
import { Wrench } from "lucide-react";

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

const TIME_SLOTS = [
  { value: "08:00", label: "Morning — 8:00 AM" },
  { value: "10:00", label: "Late Morning — 10:00 AM" },
  { value: "12:00", label: "Noon — 12:00 PM" },
  { value: "14:00", label: "Afternoon — 2:00 PM" },
  { value: "16:00", label: "Late Afternoon — 4:00 PM" },
];

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
  const [selectedVehicleId, setSelectedVehicleId] = React.useState<string>("");
  const [serviceType, setServiceType] = React.useState("Oil Change");
  const [preferredDate, setPreferredDate] = React.useState<Date | undefined>(undefined);
  const [timeSlot, setTimeSlot] = React.useState("10:00");
  const [notes, setNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Determine the active vehicle to book for
  const hasMultiple = vehicles && vehicles.length > 1;
  const activeVehicle = React.useMemo(() => {
    if (hasMultiple && selectedVehicleId) {
      return vehicles?.find((v) => v.id === selectedVehicleId || v._id === selectedVehicleId) ?? vehicle;
    }
    return vehicle;
  }, [hasMultiple, selectedVehicleId, vehicles, vehicle]);

  React.useEffect(() => {
    if (vehicle) {
      setSelectedVehicleId(vehicle.id || vehicle._id);
    }
  }, [vehicle]);

  const vehicleName = activeVehicle
    ? `${activeVehicle.year} ${activeVehicle.make} ${activeVehicle.model}`
    : "your vehicle";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preferredDate) return;

    const [hours, minutes] = timeSlot.split(":").map(Number);
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
        participants: [],
        guestEmails: [],
      });
      toast.success("Service appointment booked! We'll confirm soon.");
      onOpenChange(false);
      onSuccess?.();
      setPreferredDate(undefined);
      setNotes("");
      setServiceType("Oil Change");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to book appointment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
          {/* Vehicle picker — only shown when multiple vehicles */}
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

          <div className="space-y-1.5">
            <Label>Preferred Date</Label>
            <DatePicker
              value={preferredDate}
              onChange={setPreferredDate}
              placeholder="Select a date"
              disablePastDates
            />
          </div>

          <div className="space-y-1.5">
            <Label>Preferred Time</Label>
            <Select value={timeSlot} onValueChange={setTimeSlot}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map((slot) => (
                  <SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
            <Button type="submit" className="flex-1" disabled={!preferredDate || isSubmitting}>
              {isSubmitting ? "Booking..." : "Book Appointment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

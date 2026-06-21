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
import type { Vehicle } from "@/types/inventory";
import { Car } from "lucide-react";

interface BookTestDriveModalProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIME_SLOTS = [
  { value: "09:00", label: "Morning — 9:00 AM" },
  { value: "11:00", label: "Late Morning — 11:00 AM" },
  { value: "13:00", label: "Afternoon — 1:00 PM" },
  { value: "15:00", label: "Late Afternoon — 3:00 PM" },
  { value: "17:00", label: "Evening — 5:00 PM" },
];

export function BookTestDriveModal({ vehicle, isOpen, onOpenChange }: BookTestDriveModalProps) {
  const [preferredDate, setPreferredDate] = React.useState<Date | undefined>(undefined);
  const [timeSlot, setTimeSlot] = React.useState("10:00");
  const [notes, setNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const vehicleName = vehicle
    ? `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ` ${vehicle.trim}` : ""}`
    : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle || !preferredDate) return;

    const [hours, minutes] = timeSlot.split(":").map(Number);
    const startTime = new Date(preferredDate);
    startTime.setHours(hours, minutes, 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);

    setIsSubmitting(true);
    try {
      await apiClient.post("/api/appointments", {
        title: `Test Drive — ${vehicleName}`,
        type: "test-drive",
        entryType: "appointment",
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        notes,
        participants: [],
        guestEmails: [],
      });
      toast.success("Test drive booked! We'll confirm your appointment shortly.");
      onOpenChange(false);
      setPreferredDate(undefined);
      setTimeSlot("10:00");
      setNotes("");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to book test drive. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Car className="h-4 w-4 text-primary" />
            </div>
            <DialogTitle className="text-lg font-bold">Book a Test Drive</DialogTitle>
          </div>
          <DialogDescription className="text-sm">
            {vehicleName && (
              <span className="font-medium text-foreground">{vehicleName}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
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
                <SelectValue placeholder="Select a time" />
              </SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map((slot) => (
                  <SelectItem key={slot.value} value={slot.value}>
                    {slot.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requests or questions..."
              className="resize-none h-20"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={!preferredDate || isSubmitting}
            >
              {isSubmitting ? "Booking..." : "Book Test Drive"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

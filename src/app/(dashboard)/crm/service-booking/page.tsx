"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  EyeOff,
  Eye,
  Loader2,
  ArrowLeft,
  Clock,
  Users,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { cn, resolveImageUrl } from "@/lib/utils";
import {
  fetchCrmSlots,
  createCrmSlot,
  updateCrmSlot,
  deleteCrmSlot,
  fetchDateBookings,
  updateBookingStatus,
} from "@/lib/api/serviceSlots";
import type { CrmSlot, DateBooking } from "@/lib/api/serviceSlots";
import { fetchCustomerVehiclesForService, checkInVehicleForService } from "@/lib/api/garageReview";
import { initializeCrmSocket } from "@/lib/crmSocket.client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function toMonthStr(y: number, m: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}
function toDayStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function slotDateStr(slot: CrmSlot) {
  const d = new Date(slot.date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}
function ini(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const BOOKING_STATUS_META: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  scheduled:  { label: "Scheduled",  icon: Clock,         cls: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-200/60 dark:border-amber-700/40" },
  confirmed:  { label: "On Queue",   icon: CheckCircle2,  cls: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200/60 dark:border-blue-700/40" },
  cancelled:  { label: "Cancelled",  icon: XCircle,       cls: "text-rose-600 bg-rose-50 dark:bg-rose-900/20 border-rose-200/60 dark:border-rose-700/40" },
  completed:  { label: "Completed",  icon: CheckCircle2,  cls: "text-zinc-500 bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200/60 dark:border-zinc-700/40" },
  "no-show":  { label: "No Show",    icon: AlertCircle,   cls: "text-orange-600 bg-orange-50 dark:bg-orange-900/20 border-orange-200/60 dark:border-orange-700/40" },
};

const STATUS_OPTIONS = [
  { value: "scheduled",  label: "Scheduled" },
  { value: "confirmed",  label: "On Queue" },
  { value: "completed",  label: "Completed" },
  { value: "cancelled",  label: "Cancelled" },
  { value: "no-show",    label: "No Show" },
];


const GARAGE_SERVICE_TYPES = [
  { value: "OIL_CHANGE", label: "Oil Change" },
  { value: "TIRES",      label: "Tire Rotation" },
  { value: "BRAKES",     label: "Brake Service" },
  { value: "INSPECTION", label: "Vehicle Inspection" },
  { value: "OTHER",      label: "Other / General" },
];

const BOOKING_TO_SERVICE_TYPE: Record<string, string> = {
  "Oil Change":              "OIL_CHANGE",
  "Tire Rotation":           "TIRES",
  "Inspection":              "INSPECTION",
  "Full Inspection":         "INSPECTION",
  "Brake Service":           "BRAKES",
  "Battery Check":           "OTHER",
  "Transmission Service":    "OTHER",
  "Air Filter Replacement":  "OTHER",
  "Other":                   "OTHER",
};

const COMMON_TIMES = [
  { value: "08:00", label: "8 AM" },
  { value: "09:00", label: "9 AM" },
  { value: "10:00", label: "10 AM" },
  { value: "11:00", label: "11 AM" },
  { value: "12:00", label: "12 PM" },
  { value: "13:00", label: "1 PM" },
  { value: "14:00", label: "2 PM" },
  { value: "15:00", label: "3 PM" },
  { value: "16:00", label: "4 PM" },
  { value: "17:00", label: "5 PM" },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ServiceBookingPage() {
  const router = useRouter();
  const [token, setToken] = React.useState("");
  const [isAuth, setIsAuth] = React.useState(false);

  const now = new Date();
  const [calYear, setCalYear] = React.useState(now.getFullYear());
  const [calMonth, setCalMonth] = React.useState(now.getMonth());
  const [selectedDay, setSelectedDay] = React.useState<string | null>(null);

  const [slots, setSlots] = React.useState<CrmSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = React.useState(false);

  const [bookings, setBookings] = React.useState<DateBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = React.useState(false);

  const [addTime, setAddTime] = React.useState("08:00");
  const [addMax, setAddMax] = React.useState(1);
  const [adding, setAdding] = React.useState(false);

  // ── Inline check-in state ──
  const [checkinLoadingId, setCheckinLoadingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const t = localStorage.getItem("crm_token");
    if (!t) { router.replace("/crm"); return; }
    setToken(t);
    setIsAuth(true);
  }, [router]);

  const monthStr = toMonthStr(calYear, calMonth);

  const loadSlots = React.useCallback(async () => {
    if (!token) return;
    setLoadingSlots(true);
    try {
      const data = await fetchCrmSlots(token, monthStr);
      setSlots(data);
    } catch {
      toast.error("Failed to load slots");
    } finally {
      setLoadingSlots(false);
    }
  }, [token, monthStr]);

  React.useEffect(() => {
    if (isAuth) loadSlots();
  }, [isAuth, loadSlots]);

  // Real-time socket listeners for CRM service booking
  React.useEffect(() => {
    if (!token) return;
    const socket = initializeCrmSocket(token);

    const onAppointmentNew = () => {
      if (selectedDay) {
        fetchDateBookings(token, selectedDay)
          .then(setBookings)
          .catch(() => {});
      }
    };

    const onSlotChanged = () => { loadSlots(); };

    const onSlotAvailabilityChanged = (data: { _id: string; currentBookings: number; maxBookings: number; isFull: boolean }) => {
      setSlots((prev) =>
        prev.map((s) =>
          s._id === data._id
            ? { ...s, currentBookings: data.currentBookings, maxBookings: data.maxBookings }
            : s
        )
      );
    };

    const onAppointmentStatusUpdated = () => {
      if (selectedDay) {
        fetchDateBookings(token, selectedDay)
          .then(setBookings)
          .catch(() => {});
      }
    };

    socket.on('appointment:new', onAppointmentNew);
    socket.on('slot:created', onSlotChanged);
    socket.on('slot:updated', onSlotChanged);
    socket.on('slot:deleted', onSlotChanged);
    socket.on('slot:availability_changed', onSlotAvailabilityChanged);
    socket.on('appointment:status_updated', onAppointmentStatusUpdated);

    return () => {
      socket.off('appointment:new', onAppointmentNew);
      socket.off('slot:created', onSlotChanged);
      socket.off('slot:updated', onSlotChanged);
      socket.off('slot:deleted', onSlotChanged);
      socket.off('slot:availability_changed', onSlotAvailabilityChanged);
      socket.off('appointment:status_updated', onAppointmentStatusUpdated);
    };
  }, [token, selectedDay, loadSlots]);

  // Load bookings whenever selected day changes
  React.useEffect(() => {
    if (!selectedDay || !token) { setBookings([]); return; }
    setLoadingBookings(true);
    fetchDateBookings(token, selectedDay)
      .then(setBookings)
      .catch(() => setBookings([]))
      .finally(() => setLoadingBookings(false));
  }, [selectedDay, token]);

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDow = new Date(calYear, calMonth, 1).getDay();

  const slotsByDate = React.useMemo(() => {
    const map: Record<string, CrmSlot[]> = {};
    slots.forEach((s) => {
      const key = slotDateStr(s);
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return map;
  }, [slots]);

  const daySlots = selectedDay ? (slotsByDate[selectedDay] ?? []) : [];

  const prevMonth = () => {
    setCalMonth((m) => { if (m === 0) { setCalYear((y) => y - 1); return 11; } return m - 1; });
    setSelectedDay(null);
  };
  const nextMonth = () => {
    setCalMonth((m) => { if (m === 11) { setCalYear((y) => y + 1); return 0; } return m + 1; });
    setSelectedDay(null);
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDay || !addTime) return;
    setAdding(true);
    try {
      const newSlot = await createCrmSlot(token, { date: selectedDay, time: addTime, maxBookings: addMax });
      setSlots((prev) => [...prev, newSlot]);
      toast.success(`Slot ${newSlot.label} added for ${selectedDay}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to add slot");
    } finally {
      setAdding(false);
    }
  };

  const handleToggleBlock = async (slot: CrmSlot) => {
    try {
      const updated = await updateCrmSlot(token, slot._id, { isBlocked: !slot.isBlocked });
      setSlots((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
      toast.success(updated.isBlocked ? "Slot blocked" : "Slot unblocked");
    } catch { toast.error("Failed to update slot"); }
  };

  const handleDeleteSlot = async (slot: CrmSlot) => {
    try {
      await deleteCrmSlot(token, slot._id);
      setSlots((prev) => prev.filter((s) => s._id !== slot._id));
      toast.success(`Slot ${slot.label} deleted`);
    } catch { toast.error("Failed to delete slot"); }
  };

  const handleStatusUpdate = async (bookingId: string, newStatus: string, currentStatus: string) => {
    if (newStatus === currentStatus) return;
    let outcomeNotes: string | undefined;
    if (newStatus === "completed" || newStatus === "no-show") {
      const note = window.prompt(`Add a note for "${newStatus}" (required):`);
      if (note === null) return; // user cancelled
      outcomeNotes = note.trim() || `Marked as ${newStatus} by staff`;
    }
    try {
      await updateBookingStatus(token, bookingId, newStatus, outcomeNotes);
      setBookings((prev) =>
        prev.map((b) => (b._id === bookingId ? { ...b, status: newStatus } : b))
      );
      toast.success(`Status updated to ${newStatus}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update status");
    }
  };

  const handleUpdateMax = async (slot: CrmSlot, max: number) => {
    if (max < 1 || max < slot.currentBookings) return;
    try {
      const updated = await updateCrmSlot(token, slot._id, { maxBookings: max });
      setSlots((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
    } catch { toast.error("Failed to update slot"); }
  };

  const handleDirectCheckin = async (booking: DateBooking) => {
    if (!booking.customer?._id) { toast.error("No customer linked to this booking"); return; }
    if (checkinLoadingId) return; // prevent double-tap
    setCheckinLoadingId(booking._id);
    try {
      const vehicles = await fetchCustomerVehiclesForService(token, booking.customer._id);
      if (vehicles.length === 0) {
        toast.error("No vehicles found in this customer's garage.");
        return;
      }
      // Match vehicle from booking title ("Service Type — Year MAKE MODEL")
      const titleParts = booking.title.split(" — ");
      const vehicleLabel = titleParts.length > 1 ? titleParts.slice(1).join(" — ").trim() : "";
      const matchedVehicle = vehicles.find(v => {
        const vLabel = `${v.year} ${v.make} ${v.model}`.trim().toLowerCase();
        return vLabel === vehicleLabel.toLowerCase();
      }) ?? vehicles[0];
      const serviceLabel = booking.notes?.match(/Service type: ([^.]+)/)?.[1]?.trim() ?? "";
      const serviceType = BOOKING_TO_SERVICE_TYPE[serviceLabel] ?? "OTHER";
      await checkInVehicleForService(token, {
        vehicleId: matchedVehicle._id,
        serviceType,
        locationName: "Action Auto Utah — Jiffy Lube",
        mileageAtService: matchedVehicle.currentMileage,
      });
      // Auto-advance booking status to "On Queue" so both CRM and customer see the live state
      try {
        await updateBookingStatus(token, booking._id, "confirmed");
        setBookings((prev) => prev.map((b) => b._id === booking._id ? { ...b, status: "confirmed" } : b));
      } catch { /* non-fatal — check-in itself succeeded */ }
      toast.success("Vehicle checked in! Status updated to On Queue.");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Check-in failed";
      if (msg.toLowerCase().includes("already has an active service")) {
        toast.info("This vehicle is already checked in and being tracked.");
      } else {
        toast.error(msg);
      }
    } finally {
      setCheckinLoadingId(null);
    }
  };

  if (!isAuth) return null;

  const selectedDayLabel = selectedDay
    ? new Date(selectedDay + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric",
      })
    : null;

  return (
    <div className="min-h-full bg-background flex flex-col">
      {/* ── Header ── */}
      <div className="sticky top-0 z-30 border-b border-border/50 bg-background/95 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3 px-4 sm:px-6 h-14">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/crm/dashboard")}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Button>
          <div className="h-4 w-px bg-border/50" />
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CalendarDays className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none">Service Booking</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Manage appointment availability</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-6 py-5 space-y-5">

        {/* ── Top: Calendar + Slot Management ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-5">

          {/* ── Calendar ── */}
          <div className="rounded-2xl border border-border/50 bg-card p-3 sm:p-5 flex flex-col">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-4 sm:mb-5 shrink-0">
              <button
                onClick={prevMonth}
                className="h-9 w-9 rounded-xl border border-border/50 bg-muted/30 flex items-center justify-center hover:bg-muted/60 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h2 className="text-base font-bold">
                {MONTH_NAMES[calMonth]} {calYear}
              </h2>
              <button
                onClick={nextMonth}
                className="h-9 w-9 rounded-xl border border-border/50 bg-muted/30 flex items-center justify-center hover:bg-muted/60 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Day of week header */}
            <div className="grid grid-cols-7 mb-2 shrink-0">
              {DAY_NAMES.map((d) => (
                <div key={d} className="text-center text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground py-1.5">
                  <span className="hidden xs:inline">{d}</span>
                  <span className="xs:hidden">{d[0]}</span>
                </div>
              ))}
            </div>

            {/* Calendar grid — flex-1 fills leftover height, rows expand equally */}
            <div className="flex-1 min-h-0">
              {loadingSlots ? (
                <div className="flex items-center justify-center h-full text-muted-foreground gap-2 text-sm py-16">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </div>
              ) : (
                <div
                  className="grid grid-cols-7 gap-1 sm:gap-1.5 h-full"
                  style={{ gridAutoRows: "1fr" }}
                >
                  {Array.from({ length: firstDow }).map((_, i) => <div key={`empty-${i}`} />)}
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                    const dateStr = toDayStr(calYear, calMonth, day);
                    const daySlotList = slotsByDate[dateStr] ?? [];
                    const blocked = daySlotList.filter((s) => s.isBlocked).length;
                    const available = daySlotList.filter((s) => !s.isBlocked && s.currentBookings < s.maxBookings).length;
                    const isSelected = selectedDay === dateStr;
                    const isToday =
                      day === now.getDate() && calMonth === now.getMonth() && calYear === now.getFullYear();

                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(dateStr)}
                        className={cn(
                          "relative flex flex-col items-center rounded-xl p-0.5 sm:p-1 pt-1.5 sm:pt-2 pb-1 sm:pb-1.5 min-h-[60px] h-full transition-all hover:bg-muted/60 text-sm",
                          isSelected
                            ? "bg-emerald-500/10 border border-emerald-500/40 hover:bg-emerald-500/15"
                            : "border border-transparent hover:border-border/40",
                          isToday && !isSelected && "ring-1 ring-emerald-500/50"
                        )}
                      >
                        <span
                          className={cn(
                            "text-xs sm:text-sm font-bold",
                            isSelected
                              ? "text-emerald-700 dark:text-emerald-400"
                              : isToday
                              ? "text-emerald-600"
                              : "text-foreground"
                          )}
                        >
                          {day}
                        </span>
                        <div className="mt-1 sm:mt-1.5 flex flex-col items-center gap-0.5 sm:gap-1 w-full px-0.5">
                          {available > 0 && (
                            <span className="w-full text-center text-[10px] sm:text-[11px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-md px-1 py-0.5 leading-tight">
                              {available} open
                            </span>
                          )}
                          {blocked > 0 && (
                            <span className="w-full text-center text-[10px] sm:text-[11px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-md px-1 py-0.5 leading-tight">
                              {blocked} off
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Legend — always at the bottom of the card */}
            <div className="mt-4 pt-4 border-t border-border/30 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground shrink-0">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                Open slots
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-zinc-400 inline-block" />
                Blocked
              </span>
              <span className="flex items-center gap-1.5 ml-auto text-[10px]">
                Click a date to manage its slots
              </span>
            </div>
          </div>

          {/* ── Right: Slot Management ── */}
          <div className="space-y-4">
            {!selectedDay ? (
              <div className="rounded-2xl border border-dashed border-border/50 bg-muted/10 p-10 text-center flex flex-col items-center gap-3">
                <CalendarDays className="h-10 w-10 text-muted-foreground/20" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Select a day</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click any date on the calendar to manage its time slots
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Day header */}
                <div className="rounded-2xl border border-border/50 bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Selected Date</p>
                      <p className="text-base font-bold mt-0.5">{selectedDayLabel}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">Slots</p>
                      <p className="text-2xl font-black text-emerald-600">{daySlots.length}</p>
                    </div>
                  </div>
                </div>

                {/* Existing slots */}
                {daySlots.length > 0 && (
                  <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Time Slots</p>
                    {daySlots
                      .sort((a, b) => a.time.localeCompare(b.time))
                      .map((slot) => (
                        <div
                          key={slot._id}
                          className={cn(
                            "flex items-center gap-3 rounded-xl border p-3 transition-all",
                            slot.isBlocked
                              ? "border-zinc-200/60 dark:border-zinc-700/40 bg-zinc-50/50 dark:bg-zinc-900/30 opacity-60"
                              : "border-border/50 bg-muted/20"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              <span className={cn("text-sm font-bold", slot.isBlocked && "line-through text-muted-foreground")}>
                                {slot.label}
                              </span>
                              {slot.isBlocked && (
                                <span className="text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-full px-1.5 py-0.5">Blocked</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              <span className="text-[11px] text-muted-foreground">{slot.currentBookings} booked /</span>
                              <input
                                type="number"
                                min={Math.max(1, slot.currentBookings)}
                                value={slot.maxBookings}
                                onChange={(e) => handleUpdateMax(slot, Number(e.target.value))}
                                className="w-12 text-[11px] text-center rounded-md border border-border/50 bg-background px-1 py-0.5 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                              />
                              <span className="text-[11px] text-muted-foreground">max</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleToggleBlock(slot)}
                              title={slot.isBlocked ? "Unblock" : "Block"}
                              className="h-7 w-7 rounded-lg border border-border/40 bg-muted/30 flex items-center justify-center hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
                            >
                              {slot.isBlocked ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              onClick={() => handleDeleteSlot(slot)}
                              disabled={slot.currentBookings > 0}
                              title={slot.currentBookings > 0 ? "Has bookings — can't delete" : "Delete"}
                              className="h-7 w-7 rounded-lg border border-border/40 bg-muted/30 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300/50 hover:text-red-600 transition-colors text-muted-foreground disabled:opacity-30 disabled:pointer-events-none"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {/* Add slot form */}
                <div className="rounded-2xl border border-border/50 bg-card p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Add Time Slot</p>
                  <form onSubmit={handleAddSlot} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Time</Label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {COMMON_TIMES.map((t) => (
                          <button
                            key={t.value}
                            type="button"
                            onClick={() => setAddTime(t.value)}
                            className={cn(
                              "text-[10px] font-bold rounded-lg px-2 py-1 border transition-all",
                              addTime === t.value
                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                : "border-border/40 bg-muted/20 text-muted-foreground hover:bg-muted/50"
                            )}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                      <Input type="time" value={addTime} onChange={(e) => setAddTime(e.target.value)} className="h-9 text-sm rounded-xl" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Max Bookings per Slot</Label>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setAddMax((m) => Math.max(1, m - 1))}
                          className="h-9 w-9 rounded-xl border border-border/50 bg-muted/30 flex items-center justify-center hover:bg-muted/60 font-bold text-lg transition-colors">−</button>
                        <span className="text-lg font-black w-8 text-center">{addMax}</span>
                        <button type="button" onClick={() => setAddMax((m) => m + 1)}
                          className="h-9 w-9 rounded-xl border border-border/50 bg-muted/30 flex items-center justify-center hover:bg-muted/60 font-bold text-lg transition-colors">+</button>
                        <span className="text-xs text-muted-foreground ml-1">customer{addMax !== 1 ? "s" : ""} per slot</span>
                      </div>
                    </div>
                    <Button type="submit" disabled={adding || !addTime} className="w-full h-9 rounded-xl gap-1.5 font-semibold">
                      {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      {adding ? "Adding…" : "Add Slot"}
                    </Button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Bottom: Customer Bookings for Selected Day ── */}
        {selectedDay && (
          <div className="rounded-2xl border border-border/50 bg-card p-5">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold">Customer Bookings</p>
                <p className="text-[11px] text-muted-foreground">{selectedDayLabel}</p>
              </div>
              {!loadingBookings && (
                <span className="ml-auto text-[11px] font-semibold text-muted-foreground">
                  {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {loadingBookings ? (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading bookings…
              </div>
            ) : bookings.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <User className="h-8 w-8 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">No customer bookings on this date yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full min-w-[640px] text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border/40">
                      <th className="text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground pb-3 pr-4">Customer</th>
                      <th className="text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground pb-3 pr-4">Vehicle</th>
                      <th className="text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground pb-3 pr-4">Service Type</th>
                      <th className="text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground pb-3 pr-4">Date & Time</th>
                      <th className="text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => {
                      const statusMeta = BOOKING_STATUS_META[booking.status] ?? BOOKING_STATUS_META.scheduled;
                      const StatusIcon = statusMeta.icon;
                      const serviceType = booking.notes?.match(/Service type: ([^.]+)/)?.[1]
                        ?? booking.title.split(" — ")[0]
                        ?? "Service";
                      const titleParts = booking.title.split(" — ");
                      const vehicle = titleParts.length > 1 ? titleParts.slice(1).join(" — ") : "—";
                      const scheduledAt = new Date(booking.startTime);
                      const isTerminal = ["cancelled", "no-show"].includes(booking.status);
                      return (
                        <React.Fragment key={booking._id}>
                          {/* ── Main data row ── */}
                          <tr className="hover:bg-muted/20 transition-colors">
                            {/* Customer */}
                            <td className="pt-3 pb-1 pr-4">
                              <div className="flex items-center gap-2.5">
                                <Avatar className="h-8 w-8 rounded-xl shrink-0">
                                  <AvatarImage src={resolveImageUrl(booking.customer?.avatar || "")} />
                                  <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-xs font-bold">
                                    {booking.customer ? ini(booking.customer.name) : "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="font-semibold text-foreground truncate max-w-[160px]">
                                    {booking.customer?.name ?? "Unknown"}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                                    {booking.customer?.email ?? ""}
                                  </p>
                                </div>
                              </div>
                            </td>
                            {/* Vehicle */}
                            <td className="pt-3 pb-1 pr-4">
                              <span className="text-foreground/80 truncate max-w-[160px] block">{vehicle}</span>
                            </td>
                            {/* Service Type */}
                            <td className="pt-3 pb-1 pr-4">
                              <span className="font-medium text-foreground">{serviceType}</span>
                            </td>
                            {/* Date & Time */}
                            <td className="pt-3 pb-1 pr-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium text-foreground">
                                  {scheduledAt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                                </span>
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3 shrink-0" />
                                  {fmtTime(booking.startTime)}
                                </span>
                              </div>
                            </td>
                            {/* Status badge */}
                            <td className="pt-3 pb-1">
                              <span className={cn(
                                "inline-flex items-center gap-1 text-[11px] font-bold rounded-full border px-2 py-1",
                                statusMeta.cls
                              )}>
                                <StatusIcon className="h-3 w-3 shrink-0" />
                                {statusMeta.label}
                              </span>
                            </td>
                          </tr>

                          {/* ── Status flow row ── */}
                          <tr className="border-b border-border/20">
                            <td colSpan={5} className="pb-3 pt-0.5">
                              {isTerminal ? (
                                <div className="flex items-center gap-3">
                                  <span className={cn(
                                    "inline-flex items-center gap-1 text-[10px] font-bold rounded-full border px-2.5 py-1",
                                    statusMeta.cls
                                  )}>
                                    <StatusIcon className="h-3 w-3 shrink-0" />
                                    {statusMeta.label}
                                  </span>
                                  <button
                                    onClick={() => handleStatusUpdate(booking._id, "scheduled", booking.status)}
                                    className="text-[10px] text-muted-foreground hover:text-foreground underline transition-colors"
                                  >
                                    Reopen as Scheduled
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                  {booking.status === "confirmed" && (
                                    <button
                                      onClick={() => handleStatusUpdate(booking._id, "no-show", booking.status)}
                                      className="text-xs font-medium text-orange-500/80 hover:text-orange-600 transition-colors"
                                    >
                                      No Show
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleStatusUpdate(booking._id, "cancelled", booking.status)}
                                    className="text-xs font-medium text-rose-500/70 hover:text-rose-600 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleDirectCheckin(booking)}
                                    disabled={checkinLoadingId === booking._id}
                                    className="ml-auto text-xs font-semibold border border-emerald-500/50 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                                  >
                                    {checkinLoadingId === booking._id
                                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking in…</>
                                      : "→ Check In"}
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>

                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

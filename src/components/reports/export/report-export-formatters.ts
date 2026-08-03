import type { DriverPayout } from "@/types/driver-payout";
import type { Lead } from "@/types/lead";
import type { Load, LoadLocation, LoadVehicleItem } from "@/types/load";
import type { Quote } from "@/types/transportation";
import { getLoadReportRate } from "@/lib/report-filter-engine";

export function displayText(value: unknown, fallback = "—"): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

export function formatCurrencyValue(value: unknown): string {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(number) ? number : 0);
}

export function formatNumberValue(value: unknown, decimals = 0): string {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(number) ? number : 0);
}

export function formatPercentValue(value: number, decimals = 1): string {
  return `${Number.isFinite(value) ? value.toFixed(decimals) : (0).toFixed(decimals)}%`;
}

export function formatDateValue(value: unknown): string {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Denver",
  });
}

export function formatDateTimeValue(value: unknown): string {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Denver",
  });
}

export function formatLocation(location?: LoadLocation): string {
  if (!location) return "—";
  return [
    location.companyName,
    location.contactName ||
      [location.firstName, location.lastName].filter(Boolean).join(" "),
    location.street,
    [location.city, location.state, location.zip].filter(Boolean).join(", "),
    location.country,
  ]
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .join("\n") || "—";
}

export function formatLocationShort(location?: LoadLocation): string {
  if (!location) return "—";
  return [location.city, location.state, location.zip]
    .filter(Boolean)
    .join(", ") || "—";
}

export function loadPrimaryContact(load: Load): string {
  const pickup = load.pickupLocation;
  const delivery = load.deliveryLocation;
  return (
    pickup.companyName ||
    pickup.contactName ||
    [pickup.firstName, pickup.lastName].filter(Boolean).join(" ") ||
    pickup.email ||
    delivery.companyName ||
    delivery.contactName ||
    [delivery.firstName, delivery.lastName].filter(Boolean).join(" ") ||
    delivery.email ||
    "—"
  );
}

export function loadPrimaryContactDetails(load: Load): string {
  const pickup = load.pickupLocation;
  const delivery = load.deliveryLocation;
  const chosen =
    pickup.companyName ||
    pickup.contactName ||
    pickup.email ||
    pickup.phone ||
    pickup.cellPhone
      ? pickup
      : delivery;
  return [
    chosen.contactName ||
      [chosen.firstName, chosen.lastName].filter(Boolean).join(" "),
    chosen.companyName,
    chosen.email,
    chosen.phone || chosen.cellPhone,
  ]
    .filter(Boolean)
    .join("\n") || "—";
}

export function formatVehicleItem(vehicle: LoadVehicleItem): string {
  return (
    [vehicle.year, vehicle.make, vehicle.model]
      .filter(Boolean)
      .join(" ") ||
    vehicle.vin ||
    "—"
  );
}

export function formatLoadVehicles(load: Load): string {
  return load.vehicles.length
    ? load.vehicles.map((vehicle, index) => `${index + 1}. ${formatVehicleItem(vehicle)}`).join("\n")
    : "—";
}

export function formatLoadVins(load: Load): string {
  return load.vehicles.length
    ? load.vehicles.map((vehicle, index) => `${index + 1}. ${displayText(vehicle.vin)}`).join("\n")
    : "—";
}

export function loadDriverName(load: Load): string {
  const driver = load.assignedDriverId;
  if (!driver) return "Unassigned";
  if (typeof driver === "string") return driver;
  return driver.name || driver.email || driver._id || "Assigned";
}

export function loadDriverId(load: Load): string {
  const driver = load.assignedDriverId;
  if (!driver) return "";
  return typeof driver === "string" ? driver : driver._id;
}

export function loadPodStatus(load: Load): string {
  if (load.proofOfDelivery?.confirmedAt) return "Approved";
  if (load.proofOfDelivery?.submittedAt) return "Pending Approval";
  return "Not Submitted";
}

export function loadRateValue(load: Load): number {
  return getLoadReportRate(load);
}

export function quoteCustomerName(quote: Quote): string {
  return [quote.firstName, quote.lastName].filter(Boolean).join(" ") || "—";
}

export function quoteContact(quote: Quote): string {
  return [quote.email, quote.phone].filter(Boolean).join("\n") || "—";
}

export function quoteVehicleDescription(quote: Quote): string {
  const populated = quote.vehicleId
    ? [quote.vehicleId.year, quote.vehicleId.make, quote.vehicleId.modelName]
        .filter(Boolean)
        .join(" ")
    : "";
  return quote.vehicleName || populated || quote.vin || quote.vehicleId?.vin || "—";
}

export function quoteVin(quote: Quote): string {
  return quote.vin || quote.vehicleId?.vin || "—";
}

export function quoteStockNumber(quote: Quote): string {
  return quote.stockNumber || quote.vehicleId?.stockNumber || "—";
}

export function quoteTrailer(quote: Quote): string {
  return quote.enclosedTrailer ? "Enclosed" : "Open";
}

export function quoteCondition(quote: Quote): string {
  return quote.vehicleInoperable ? "Inoperable" : "Operable";
}

export function quoteEta(quote: Quote): string {
  return quote.eta ? `${quote.eta.min}–${quote.eta.max} days` : "—";
}

export function leadName(lead: Lead): string {
  return [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.senderName || "Unnamed Lead";
}

export function leadVehicle(lead: Lead): string {
  return [lead.vehicle?.year, lead.vehicle?.make, lead.vehicle?.model]
    .filter(Boolean)
    .join(" ") || "—";
}

export function leadAppointment(lead: Lead): string {
  if (!lead.appointment) return "No Appointment";
  return [
    formatDateValue(lead.appointment.date),
    lead.appointment.time,
    lead.appointment.location,
    lead.appointment.notes,
  ]
    .filter(Boolean)
    .join("\n");
}

export function leadReadStatus(lead: Lead): string {
  return lead.isRead === true ? "Read" : "Unread";
}

export function leadPendingStatus(lead: Lead): string {
  return lead.isPending === true ? "Pending Reply" : "Not Pending";
}

export function payoutLoadNumber(payout: DriverPayout): string {
  if (typeof payout.loadId === "string") return displayText(payout.loadId);
  return payout.loadId.loadNumber || payout.loadId.trackingNumber || payout.loadId._id || "—";
}

export function payoutRoute(payout: DriverPayout): string {
  if (typeof payout.loadId === "string") return "—";
  return [payout.loadId.origin, payout.loadId.destination].filter(Boolean).join(" → ") || "—";
}

export function countBy<T>(
  records: T[],
  value: (record: T) => string,
): Array<{ label: string; count: number; percentage: number }> {
  const counts = records.reduce<Record<string, number>>((result, record) => {
    const label = displayText(value(record), "Unknown");
    result[label] = (result[label] ?? 0) + 1;
    return result;
  }, {});

  return Object.entries(counts)
    .map(([label, count]) => ({
      label,
      count,
      percentage: records.length > 0 ? (count / records.length) * 100 : 0,
    }))
    .sort((first, second) => second.count - first.count || first.label.localeCompare(second.label));
}
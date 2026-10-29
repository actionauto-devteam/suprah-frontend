/**
 * Which cars the dealership is already shipping, so staff don't put the same
 * car on two loads (decided 2026-10-29): a load that isn't delivered or
 * cancelled, or a shipping quote still waiting. Inventory tags its cars with
 * it, Create Load warns before saving, and Convert to Load warns after. It
 * never blocks anything.
 */

export interface VehicleShippingLoad {
  _id: string;
  loadNumber: string;
  status: string;
  vehicleIds?: string[];
  vins?: string[];
}

export interface VehicleShippingQuote {
  _id: string;
  status: string;
  vehicleId?: string;
  vin?: string;
}

export interface VehicleShippingResult {
  loads: VehicleShippingLoad[];
  quotes: VehicleShippingQuote[];
}

/** The most cars one lookup checks; the server keeps the same cap. */
export const VEHICLE_SHIPPING_LOOKUP_MAX = 100;

/** A VIN as loads store it: letters and digits only, uppercase, at most 17. */
export function cleanVin(value: unknown): string {
  return typeof value === "string" ? value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 17) : "";
}

/** VINs worth checking: 11 to 17 letters and digits (older cars have shorter VINs). */
export function checkableVins(values: unknown[]): string[] {
  return [...new Set(values.map(cleanVin))].filter((vin) => vin.length >= 11);
}

const LOAD_STATUS_WORDS: Record<string, string> = {
  Draft: "Draft",
  Posted: "Posted",
  Assigned: "Assigned",
  Accepted: "Accepted",
  "Picked Up": "Picked up",
  "In-Transit": "In transit",
};

/** A load's status in plain words. */
export function loadStatusWords(status: string): string {
  return LOAD_STATUS_WORDS[status] ?? status;
}

/** Where an inventory car stands: on a live load first, then a waiting quote. */
export type InventoryShippingState =
  | { kind: "load"; load: VehicleShippingLoad; moreLoads: number }
  | { kind: "quote"; quote: VehicleShippingQuote };

/** Each inventory car's shipping state, keyed by its id. Cars with none are left out. */
export function inventoryShippingStates(
  result: VehicleShippingResult | null | undefined,
  vehicles: Array<{ id: string; vin?: string }>,
): Map<string, InventoryShippingState> {
  const states = new Map<string, InventoryShippingState>();
  if (!result) return states;
  for (const vehicle of vehicles) {
    const vin = cleanVin(vehicle.vin);
    const loads = result.loads.filter(
      (load) => (load.vehicleIds ?? []).includes(vehicle.id) || (vin !== "" && (load.vins ?? []).includes(vin)),
    );
    if (loads.length > 0) {
      states.set(vehicle.id, { kind: "load", load: loads[0], moreLoads: loads.length - 1 });
      continue;
    }
    const quote = result.quotes.find((item) => item.vehicleId === vehicle.id || (vin !== "" && item.vin === vin));
    if (quote) states.set(vehicle.id, { kind: "quote", quote });
  }
  return states;
}

/** The live loads that already have this VIN. */
export function loadsWithVin(result: VehicleShippingResult | null | undefined, vin: unknown): VehicleShippingLoad[] {
  const clean = cleanVin(vin);
  if (!result || !clean) return [];
  return result.loads.filter((load) => (load.vins ?? []).includes(clean));
}

const loadList = (loads: VehicleShippingLoad[]) =>
  loads.map((load) => `${load.loadNumber} (${loadStatusWords(load.status)})`).join(", ");

/** The Create Load warning for one VIN that's already on a live load. */
export function sameVinWarning(vin: string, loads: VehicleShippingLoad[]): string {
  return `VIN ${vin} is already on ${loads.length === 1 ? "load" : "loads"} ${loadList(loads)}. Check it isn't the same shipment before you save.`;
}

/** The warning after Convert to Load when the car was already on a live load. */
export function convertedSameVehicleWarning(loads: VehicleShippingLoad[]): string {
  return `This car is also on ${loads.length === 1 ? "load" : "loads"} ${loadList(loads)}. Check it isn't the same shipment. The new load is a draft, so you can delete it if it's a duplicate.`;
}

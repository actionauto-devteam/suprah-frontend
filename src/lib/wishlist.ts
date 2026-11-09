import type { Vehicle } from "@/types/inventory";

/*
 * The customer's Wishlist (2026-11-09). The backend lists cars still for sale
 * in Shop's format (available: true, with the member price) and cars that were
 * sold or taken off sale with just their name and photo (available: false), so
 * they can be removed instead of failing when opened.
 */

export type WishlistVehicle = Vehicle & { available?: boolean };

/** Cars to show as normal cards, and cars to list as no longer available. */
export function splitWishlist(list: readonly WishlistVehicle[] | null | undefined): {
  available: WishlistVehicle[];
  unavailable: WishlistVehicle[];
} {
  const available: WishlistVehicle[] = [];
  const unavailable: WishlistVehicle[] = [];
  for (const vehicle of list ?? []) {
    (vehicle.available === false ? unavailable : available).push(vehicle);
  }
  return { available, unavailable };
}

/** The list with this car added at the top (once), shown straight away while it saves. */
export function withSaved(list: readonly WishlistVehicle[] | null | undefined, vehicle: Vehicle): WishlistVehicle[] {
  const current = list ?? [];
  if (current.some((item) => item.id === vehicle.id)) return [...current];
  return [{ ...vehicle, available: true }, ...current];
}

/** The list without this car, shown straight away while it's removed. */
export function withoutSaved(list: readonly WishlistVehicle[] | null | undefined, vehicleId: string): WishlistVehicle[] {
  return (list ?? []).filter((item) => item.id !== vehicleId);
}

/** "2021 Toyota Camry SE" for a Wishlist row or a button label. */
export function wishlistCarName(vehicle: Pick<Vehicle, "year" | "make" | "model" | "trim">): string {
  return [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(" ") || "This car";
}

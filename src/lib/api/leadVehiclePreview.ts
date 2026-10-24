import { apiClient } from "../api-client";

export type VehiclePreviewState = "matched" | "not_found" | "unconfirmed";
export type VehiclePreviewMatch = "linked" | "vin" | "stock";
export type VehiclePreviewReason = "vin" | "stock" | "linked" | "duplicate_stock" | "not_verified" | "no_identifier";
export type VehicleAvailability = "listed" | "recon" | "in_transit" | "sold" | "archived" | "unknown";

export interface RequestedVehicle {
  year?: string;
  make?: string;
  model?: string;
  trim?: string;
  vin?: string;
  stock?: string;
}

export interface InventoryVehicleSummary {
  id: string;
  year: number | null;
  make: string;
  model: string;
  trim: string | null;
  vin: string;
  stockNumber: string | null;
  mileage: number | null;
  price: number | null;
  exteriorColor: string | null;
  photoUrl: string | null;
  status: string | null;
  availability: VehicleAvailability;
  archivedAt: string | null;
  inventoryPath: string;
}

export interface VehiclePreviewEntry {
  key: string;
  origin: "lead" | "inquiry";
  receivedAt: string | null;
  label: string;
  requested: RequestedVehicle;
  state: VehiclePreviewState;
  match: VehiclePreviewMatch | null;
  reason: VehiclePreviewReason | null;
  similarCount: number | null;
  searchPath: string | null;
  vehicle: InventoryVehicleSummary | null;
}

export interface LeadVehiclePreview {
  leadId: string;
  primary: VehiclePreviewEntry | null;
  others: VehiclePreviewEntry[];
}

export async function fetchLeadVehiclePreview(leadId: string): Promise<LeadVehiclePreview> {
  const res = await apiClient.get(`/api/leads/${leadId}/vehicle-preview`);
  return res.data?.data as LeadVehiclePreview;
}

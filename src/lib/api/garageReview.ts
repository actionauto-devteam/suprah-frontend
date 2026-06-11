import { apiClient } from "../api-client";

const BASE = "/api/crm/garage-review";
const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });
const unwrap = (res: { data?: { data?: unknown } }) =>
  (res.data?.data ?? res.data) as unknown;

export interface InventoryVehicle {
  id: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  color?: string;
  stockNumber?: string;
  mileage: number;
  price: number;
  status: string;
  image: string | null;
  images: string[];
}

export interface CustomerLite {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  organizationId: string | null;
}

export interface TransferableDeal {
  _id: string;
  title: string;
  company?: string;
  contactName?: string;
  value?: number | null;
  currency?: string;
  stage: string;
  tags: string[];
}

export interface GarageTransferRecord {
  _id: string;
  vin: string;
  vehicleLabel: string;
  customerName: string;
  customerEmail: string;
  mileageAtTransfer: number;
  vehicleMarkedSold: boolean;
  performedByName: string;
  status: "transferred" | "already_in_garage";
  createdAt: string;
}

export interface TransferPayload {
  vehicleId: string;
  customerId: string;
  dealId?: string;
  mileageOverride?: number | string;
  purchaseDate?: string;
  markVehicleSold?: boolean;
}

export const searchInventory = async (
  token: string,
  search = "",
): Promise<InventoryVehicle[]> => {
  const res = await apiClient.get(`${BASE}/inventory`, {
    ...auth(token),
    params: search ? { search } : undefined,
  });
  return unwrap(res) as InventoryVehicle[];
};

export const searchCustomers = async (
  token: string,
  search = "",
): Promise<CustomerLite[]> => {
  const res = await apiClient.get(`${BASE}/customers`, {
    ...auth(token),
    params: search ? { search } : undefined,
  });
  return unwrap(res) as CustomerLite[];
};

export const fetchTransferableDeals = async (
  token: string,
): Promise<TransferableDeal[]> => {
  const res = await apiClient.get(`${BASE}/deals`, auth(token));
  return unwrap(res) as TransferableDeal[];
};

export const fetchTransfers = async (
  token: string,
): Promise<GarageTransferRecord[]> => {
  const res = await apiClient.get(`${BASE}/transfers`, auth(token));
  return unwrap(res) as GarageTransferRecord[];
};

export const transferVehicleToGarage = async (
  token: string,
  payload: TransferPayload,
): Promise<{ transfer: GarageTransferRecord; ownedVehicle: unknown }> => {
  const res = await apiClient.post(`${BASE}/transfer`, payload, auth(token));
  return unwrap(res) as { transfer: GarageTransferRecord; ownedVehicle: unknown };
};

// ─── Service Queue ────────────────────────────────────────────────────────────

export type ServiceStatus = "received" | "in_service" | "quality_check" | "ready" | "completed";

export interface ActiveServiceRecord {
  _id: string;
  serviceType: "OIL_CHANGE" | "TIRES" | "BRAKES" | "INSPECTION" | "OTHER";
  serviceStatus: ServiceStatus;
  statusUpdatedAt?: string;
  statusUpdatedBy?: string;
  locationName: string;
  mileageAtService: number;
  date: string;
  notes?: string;
  vehicle: {
    _id: string;
    make: string;
    model: string;
    year: string;
    vin: string;
    licensePlate?: string;
    color?: string;
  };
  customer: {
    _id: string;
    name: string;
    email: string;
    avatar?: string | null;
  } | null;
}

export interface OwnedVehicleLite {
  _id: string;
  make: string;
  model: string;
  year: string;
  vin: string;
  licensePlate?: string;
  color?: string;
  currentMileage: number;
}

export const fetchServiceQueue = async (token: string): Promise<ActiveServiceRecord[]> => {
  const res = await apiClient.get(`${BASE}/service/queue`, auth(token));
  return (unwrap(res) ?? []) as ActiveServiceRecord[];
};

export const fetchCustomerVehiclesForService = async (
  token: string,
  customerId: string,
): Promise<OwnedVehicleLite[]> => {
  const res = await apiClient.get(`${BASE}/service/customer-vehicles/${customerId}`, auth(token));
  return (unwrap(res) ?? []) as OwnedVehicleLite[];
};

export const checkInVehicleForService = async (
  token: string,
  payload: { vehicleId: string; serviceType: string; locationName: string; mileageAtService: number },
): Promise<ActiveServiceRecord> => {
  const res = await apiClient.post(`${BASE}/service/checkin`, payload, auth(token));
  return unwrap(res) as ActiveServiceRecord;
};

export const advanceServiceStatus = async (
  token: string,
  serviceId: string,
  status: ServiceStatus,
): Promise<ActiveServiceRecord> => {
  const res = await apiClient.patch(`${BASE}/service/status/${serviceId}`, { status }, auth(token));
  return unwrap(res) as ActiveServiceRecord;
};
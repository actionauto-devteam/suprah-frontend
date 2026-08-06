export type DriverStatus = "on-route" | "idle" | "on-break" | "waiting" | "offline";

export interface DriverTrackingItem {
  id: string;
  status: DriverStatus;
  organizationId?: string;
  coords: {
    lat: number;
    lng: number;
  } | null;
  lastSeenAt: string | null;
  isSharing: boolean;
  assignable: boolean;
  warnings: string[];
  remainingCapacity: number | null;
  driver: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    avatar?: string | null;
    messagingAvailable: boolean;
    crmUserId?: string | null;
    messagingUnavailableReason?: string | null;
  } | null;
  equipment?: {
    trailerType?: string;
    maxVehicleCapacity?: number;
    operationalStatus?: string;
    truckMake?: string;
    truckModel?: string;
    isComplianceExpired?: boolean;
    profileCompletionScore?: number;
  } | null;
  shipments: {
    id: string;
    trackingNumber?: string;
    status?: string;
    origin?: string;
    destination?: string;
    vehicleCount?: number;
    trailerType?: string | null;
  }[];
}
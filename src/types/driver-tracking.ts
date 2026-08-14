export type DriverStatus = "on-route" | "idle" | "on-break" | "waiting" | "offline";
export type DriverOperationalStatus = "active" | "on_leave" | "maintenance";
export type DriverStatusRequestPriority = "standard" | "emergency";
export type DriverStatusRequestState =
  | "pending"
  | "approved_awaiting_reassignment"
  | "completed"
  | "rejected"
  | "cancelled";

export interface DriverStatusRequestSummary {
  id: string;
  requestedStatus: "on_leave" | "maintenance";
  priority: DriverStatusRequestPriority;
  status: DriverStatusRequestState;
  reason?: string | null;
  message?: string | null;
  submittedAt?: string | Date | null;
}

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
  statusRequest?: DriverStatusRequestSummary | null;
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
    operationalStatus?: DriverOperationalStatus;
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
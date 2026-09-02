export type DriverStatus = "on-route" | "idle" | "on-break" | "waiting" | "offline";
export type DriverOperationalStatus = "active" | "on_leave" | "maintenance";
export type DriverStatusRequestPriority = "standard" | "emergency";
export type DriverStatusRequestState =
  | "pending"
  | "approved_awaiting_reassignment"
  | "completed"
  | "rejected"
  | "cancelled";

export type AvailabilityCompatibilityStatus =
  | "match"
  | "off_schedule"
  | "unknown";
export type CapacityCompatibilityStatus = "match" | "exceeded" | "unknown";
export type TrailerCompatibilityStatus = "match" | "mismatch" | "unknown";
export type ServiceAreaCompatibilityStatus = "within" | "outside" | "unknown";
export type PreferredRouteCompatibilityStatus =
  | "preferred"
  | "not_preferred"
  | "unknown";
export type ProximityCompatibilitySource = "live_gps" | "home_base" | null;

export interface DriverLoadCompatibility {
  availability: {
    status: AvailabilityCompatibilityStatus;
    pickupDate: string | null;
    pickupDay: string | null;
    availableDays: string[];
  };
  capacity: {
    status: CapacityCompatibilityStatus;
    requiredVehicles: number;
    maxVehicles: number | null;
  };
  trailer: {
    status: TrailerCompatibilityStatus;
    requiredTrailerType: string | null;
    driverTrailerType: string | null;
  };
  // Optional during rolling deployment so the frontend remains compatible
  // with an older backend response that only has availability/capacity/trailer.
  serviceArea?: {
    status: ServiceAreaCompatibilityStatus;
    serviceRadiusMiles: number | null;
    distanceFromHomeBaseToPickupMiles: number | null;
    homeBaseLabel: string | null;
  };
  preferredRoute?: {
    status: PreferredRouteCompatibilityStatus;
    originState: string | null;
    originCity?: string | null;
    destinationState: string | null;
    destinationCity?: string | null;
    matchedRoute: string | null;
    matchLevel?: "city" | "mixed" | "state" | null;
    preferredRoutes: string[];
  };
  proximity?: {
    distanceToPickupMiles: number | null;
    source: ProximityCompatibilitySource;
    lastSeenAt: string | null;
  };
  requiresAvailabilityOverride: boolean;
  requiresCapacityOverride: boolean;
  driverRequestAllowed: boolean;
  recommended: boolean;
  warnings: string[];
}

export interface DriverStatusRequestSummary {
  id: string;
  requestedStatus: "on_leave" | "maintenance";
  priority: DriverStatusRequestPriority;
  status: DriverStatusRequestState;
  reason?: string | null;
  message?: string | null;
  submittedAt?: string | Date | null;
}


export interface LoadReleaseRequestSummary {
  id: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  priority: "standard" | "emergency";
  reason: string;
  message?: string | null;
  requestedAt?: string | Date | null;
  dispatcherId?: string | null;
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
  /** @deprecated Vehicle capacity is per load, not activeLoadCount subtraction. */
  remainingCapacity: number | null;
  activeLoadCount?: number;
  availability?: {
    availableDays: string[];
  };
  logistics?: {
    serviceRadiusMiles: number | null;
    preferredRoutes: string[];
    homeBase: {
      city: string | null;
      state: string | null;
      zip: string | null;
      coordinates: { lat: number; lng: number } | null;
    };
  };
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
    pickupDate?: string | Date | null;
    pickupLocation?: {
      city?: string | null;
      state?: string | null;
      zip?: string | null;
      coordinates?: { lat: number; lng: number } | null;
    };
    deliveryLocation?: {
      city?: string | null;
      state?: string | null;
      zip?: string | null;
    };
    releaseRequest?: LoadReleaseRequestSummary | null;
  }[];
}
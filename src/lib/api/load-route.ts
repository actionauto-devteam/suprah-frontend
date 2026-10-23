import { apiClient } from "@/lib/api-client";

// The best route and arrival time to a load's next stop, with live traffic
// (suprah-backend/src/services/loadRoute.service.ts). Nothing shows until
// Amazon Location is switched on for the server.

export type LoadRouteAudience = "staff" | "driver";

/** [longitude, latitude], the order maps draw them in. */
export type RouteCoordinate = [number, number];

export type LoadRouteLines = {
  /** Where the route starts: the driver's position when it was planned. */
  origin: { lat: number; lng: number };
  /** From the driver to the next stop. */
  ahead: RouteCoordinate[];
  /** Before pickup, the rest of the trip: from the pickup to the delivery. */
  later: { line: RouteCoordinate[]; distanceMeters: number; durationSeconds: number } | null;
  stops: { pickup: { lat: number; lng: number } | null; delivery: { lat: number; lng: number } | null };
};

export type AvailableLoadRoute = {
  available: true;
  stop: "pickup" | "delivery";
  /** Which route was planned: the fastest drive time or the shortest distance (server setting). */
  optimizedFor?: "fastest" | "shortest";
  /** Seconds from computedAt, including the driver-pace adjustment. */
  durationSeconds: number;
  arrivalAt: string;
  distanceMeters: number;
  traffic: {
    level: "light" | "moderate" | "heavy";
    /** Extra time compared with free-flowing roads. */
    delaySeconds: number;
    /** Compared with the usual traffic for this time of day. */
    comparedWithUsual: "better" | "usual" | "worse" | null;
  };
  incidents: { description: string; severity: string | null }[];
  paceAdjustmentSeconds: number;
  driver: {
    speedMph: number | null;
    stoppedMinutes: number | null;
    positionAgeMinutes: number;
    positionStale: boolean;
    /** How precise the starting location is, in metres (null when unknown). */
    positionAccuracyMeters?: number | null;
    /**
     * The route starts from an approximate location (off by more than 1 km),
     * the same cut-off as the Driver Tracker's "Approximate GPS" label.
     */
    positionApproximate?: boolean;
  };
  /**
   * The server's second check against the truck's limits. "check": a limit
   * may apply on the way to the next stop. restOfTripUnsafe: the part from
   * the pickup to the delivery breaks a limit, so it isn't drawn.
   */
  safety?: { status: "ok" | "check"; limits: string[]; restOfTripUnsafe: boolean; restOfTripLimits: string[] };
  /**
   * The rig size the route was planned for (null for car routes): each part
   * from the driver's Equipment page, or the company default when missing.
   */
  truck?: { heightInches: number; lengthFeet: number; fromEquipment: { height: boolean; length: boolean } } | null;
  deadline: { day: string; status: "on_time" | "at_risk" | "late" } | null;
  /** Null when no road line came back; the arrival time still stands. */
  route: LoadRouteLines | null;
  computedAt: string;
};

export type LoadRoute =
  | AvailableLoadRoute
  | {
      available: false;
      /** no_safe_route: every route found breaks one of the truck's limits, so none is shown. */
      reason: "routes_off" | "not_tracked" | "no_driver_position" | "no_destination" | "unavailable" | "no_safe_route";
      message: string;
    };

type TokenGetter = () => Promise<string | null>;

export const loadRouteApi = {
  async get(getToken: TokenGetter, audience: LoadRouteAudience, loadId: string) {
    const token = await getToken();
    if (!token) throw new Error("Your session has ended. Please sign in again.");
    const path = audience === "driver" ? "my-loads" : "loads";
    const response = await apiClient.get(`/api/driver-tracking/${path}/${encodeURIComponent(loadId)}/route`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return (response.data as { data: LoadRoute }).data;
  },
};

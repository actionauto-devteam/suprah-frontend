import { apiClient } from "@/lib/api-client";

// Arrival time at a load's next stop, with live traffic
// (suprah-backend/src/services/loadEta.service.ts).

export type LoadEtaAudience = "staff" | "driver";

export type AvailableLoadEta = {
  available: true;
  stop: "pickup" | "delivery";
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
  };
  deadline: { day: string; status: "on_time" | "at_risk" | "late" } | null;
  computedAt: string;
};

export type LoadEta =
  | AvailableLoadEta
  | {
      available: false;
      reason: "eta_off" | "not_tracked" | "no_driver_position" | "no_destination" | "unavailable";
      message: string;
    };

type TokenGetter = () => Promise<string | null>;

export const loadEtaApi = {
  async get(getToken: TokenGetter, audience: LoadEtaAudience, loadId: string) {
    const token = await getToken();
    if (!token) throw new Error("Your session has ended. Please sign in again.");
    const path = audience === "driver" ? "my-loads" : "loads";
    const response = await apiClient.get(`/api/driver-tracking/${path}/${encodeURIComponent(loadId)}/eta`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return (response.data as { data: LoadEta }).data;
  },
};

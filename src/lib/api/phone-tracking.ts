import { apiClient } from "@/lib/api-client";

// Phone tracking with Traccar Client (suprah-backend/src/controllers/driverTrackingDevice.controller.ts).

export type PhoneTrackingReminder = "turn_on" | "keep_on" | "not_receiving" | "turn_off" | null;

export type DriverPhoneTracking = {
  /** The company has switched the integration on and configured it. */
  available: boolean;
  /** Address the driver enters once in Traccar Client. */
  serverUrl: string | null;
  device: {
    status: "pending" | "active" | "revoked";
    /** The identifier to enter in Traccar Client (only ever shown to the driver). */
    identifier: string | null;
    requestedAt: string;
    approvedAt: string | null;
    lastPositionAt: string | null;
  } | null;
  reminder: PhoneTrackingReminder;
};

export type ReviewerPhoneTracking = {
  available: boolean;
  device: {
    status: "pending" | "active" | "revoked";
    /** Last 4 characters, to match with what the driver sees. */
    identifierEndsWith: string;
    requestedAt: string;
    approvedAt: string | null;
    approvedByName: string | null;
    lastPositionAt: string | null;
    traccarSyncStatus: "not_synced" | "synced" | "failed";
    traccarSyncError: string | null;
  } | null;
};

type TokenGetter = () => Promise<string | null>;

async function headers(getToken: TokenGetter) {
  const token = await getToken();
  if (!token) throw new Error("Your session has ended. Please sign in again.");
  return { Authorization: `Bearer ${token}` };
}

const data = <T,>(response: { data?: unknown }): T => (response.data as { data: T }).data;
const MINE = "/api/driver-tracking/tracking-device";
const forDriver = (driverId: string, rest = "") =>
  `/api/driver-tracking/drivers/${encodeURIComponent(driverId)}/tracking-device${rest}`;

export const phoneTrackingApi = {
  async mine(getToken: TokenGetter) {
    return data<DriverPhoneTracking>(await apiClient.get(MINE, { headers: await headers(getToken) }));
  },
  async start(getToken: TokenGetter) {
    return data<DriverPhoneTracking>(await apiClient.post(MINE, {}, { headers: await headers(getToken) }));
  },
  async remove(getToken: TokenGetter) {
    return data<DriverPhoneTracking>(await apiClient.delete(MINE, { headers: await headers(getToken) }));
  },
  async forDriver(getToken: TokenGetter, driverId: string) {
    return data<ReviewerPhoneTracking>(await apiClient.get(forDriver(driverId), { headers: await headers(getToken) }));
  },
  async approve(getToken: TokenGetter, driverId: string) {
    return data<ReviewerPhoneTracking>(await apiClient.post(forDriver(driverId, "/approve"), {}, { headers: await headers(getToken) }));
  },
  async revoke(getToken: TokenGetter, driverId: string) {
    return data<ReviewerPhoneTracking>(await apiClient.post(forDriver(driverId, "/revoke"), {}, { headers: await headers(getToken) }));
  },
  async retry(getToken: TokenGetter, driverId: string) {
    return data<ReviewerPhoneTracking>(await apiClient.post(forDriver(driverId, "/sync"), {}, { headers: await headers(getToken) }));
  },
};

export function formatPhoneTrackingTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

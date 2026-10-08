import { apiClient } from "@/lib/api-client";

// Phone tracking with the Suprah Driver Tracker app or Traccar Client
// (suprah-backend/src/controllers/driverTrackingDevice.controller.ts).

export type PhoneTrackingReminder = "turn_on" | "keep_on" | "not_receiving" | "turn_off" | null;

/** "app": the Suprah Driver Tracker app. "traccar": Traccar Client. */
export type PhoneTrackingProvider = "app" | "traccar";

export type DriverPhoneTracking = {
  /** The company has switched phone tracking on. */
  available: boolean;
  /** What a new setup uses. */
  provider: PhoneTrackingProvider | null;
  /** Traccar: address the driver enters once in Traccar Client. */
  serverUrl: string | null;
  /** App: where to install it, if the company set a link. */
  downloadUrl: string | null;
  /** App: the one-time pairing code, only in the response that created it. */
  pairingCode: string | null;
  device: {
    provider: PhoneTrackingProvider;
    status: "pending" | "active" | "revoked";
    /** The identifier to enter in Traccar Client (only ever shown to the driver). */
    identifier: string | null;
    requestedAt: string;
    approvedAt: string | null;
    lastPositionAt: string | null;
    /** App: the app has paired with the code. */
    paired: boolean | null;
    /** App: when the current pairing code stops working. */
    pairingCodeExpiresAt: string | null;
    /** App: the phone model it reported. */
    deviceName: string | null;
  } | null;
  reminder: PhoneTrackingReminder;
};

export type ReviewerPhoneTracking = {
  available: boolean;
  provider: PhoneTrackingProvider | null;
  device: {
    provider: PhoneTrackingProvider;
    status: "pending" | "active" | "revoked";
    /** Last 4 characters, to match with what the driver sees. */
    identifierEndsWith: string;
    requestedAt: string;
    approvedAt: string | null;
    approvedByName: string | null;
    lastPositionAt: string | null;
    paired: boolean | null;
    deviceName: string | null;
    appVersion: string | null;
    traccarSyncStatus: "not_synced" | "synced" | "failed" | null;
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
  /** App: a fresh pairing code before the app has paired. */
  async renewCode(getToken: TokenGetter) {
    return data<DriverPhoneTracking>(await apiClient.post(`${MINE}/pairing-code`, {}, { headers: await headers(getToken) }));
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

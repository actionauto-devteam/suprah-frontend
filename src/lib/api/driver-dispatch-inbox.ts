import { apiClient } from "@/lib/api-client";
import type { DispatchChatThreadSummary } from "@/components/dispatch-chat/DispatchChatDialog";

// The driver's Dispatch Chat page (suprah-backend dispatchChat.controller
// getMyLoadContacts / openMyLoadThread, dispatchChatPin.controller).

/** A dispatcher of one of the driver's current or recently delivered loads. */
export type DispatchContact = {
  dispatcher: { id: string; name: string; avatar: string | null };
  /** The driver has one of this dispatcher's loads right now. */
  current: boolean;
  /** The current load, or the latest delivered one. */
  load: { id: string; loadNumber: string; status: string; origin: string; destination: string };
  loadCount: number;
  /** The private conversation with this dispatcher, when one exists. */
  threadId: string | null;
};

export type DispatchChatPinKind = "thread" | "channel";
export type DispatchChatPin = { kind: DispatchChatPinKind; id: string; pinnedAt: string };

type TokenGetter = () => Promise<string | null>;

async function headers(getToken: TokenGetter) {
  const token = await getToken();
  if (!token) throw new Error("Your session has ended. Please sign in again.");
  return { Authorization: `Bearer ${token}` };
}

const data = <T,>(response: { data?: unknown }): T => {
  const body = response.data as { data?: T } | undefined;
  return (body?.data ?? body) as T;
};
const base = "/api/driver-tracking/dispatch-chat";

export const driverDispatchInboxApi = {
  async threads(getToken: TokenGetter) {
    const result = data<{ threads?: DispatchChatThreadSummary[] }>(
      await apiClient.get(`${base}/threads`, { headers: await headers(getToken) }),
    );
    return Array.isArray(result?.threads) ? result.threads : [];
  },
  async contacts(getToken: TokenGetter) {
    const result = data<{ contacts?: DispatchContact[] }>(
      await apiClient.get(`${base}/contacts`, { headers: await headers(getToken) }),
    );
    return Array.isArray(result?.contacts) ? result.contacts : [];
  },
  async pins(getToken: TokenGetter) {
    const result = data<{ pins?: DispatchChatPin[] }>(
      await apiClient.get(`${base}/pins`, { headers: await headers(getToken) }),
    );
    return Array.isArray(result?.pins) ? result.pins : [];
  },
  async setPin(getToken: TokenGetter, kind: DispatchChatPinKind, id: string, pinned: boolean) {
    const result = data<{ pins?: DispatchChatPin[] }>(
      await apiClient.put(`${base}/pins`, { kind, id, pinned }, { headers: await headers(getToken) }),
    );
    return Array.isArray(result?.pins) ? result.pins : [];
  },
  /** Opens (or reuses) the conversation with the dispatcher of one of my loads. */
  async openFromLoad(getToken: TokenGetter, loadId: string) {
    const result = data<{ thread: DispatchChatThreadSummary }>(
      await apiClient.post(`${base}/my-loads/${encodeURIComponent(loadId)}/open`, {}, { headers: await headers(getToken) }),
    );
    return result.thread;
  },
};

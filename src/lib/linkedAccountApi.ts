import { apiClient } from "@/lib/api-client";

export type LinkedProvider = "wise" | "paypal";

export interface LinkedBalance {
  currency: string;
  amount: number;
  reservedAmount: number;
  lastUpdated?: string;
}

export interface LinkedProfile {
  id: string;
  type: "personal" | "business";
  fullName: string;
  email: string;
  avatarInitials: string;
}

export interface LinkedConnection {
  provider: LinkedProvider;
  profile: LinkedProfile;
  balances: LinkedBalance[];
  isPrimary: boolean;
  lastSyncedAt?: string;
}

export interface LinkedStatus {
  connected: boolean;
  primary: LinkedConnection | null;
  accounts: LinkedConnection[];
}

export interface LinkedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  type: "credit" | "debit";
  status: "completed" | "pending" | "cancelled";
  recipient?: string;
}

const unwrap = (res: any) => res?.data?.data ?? res?.data;

export const linkedAccountApi = {
  /**
   * Get the provider authorize URL to send the browser to. When the provider
   * isn't set up on this site, authUrl is null and message says so.
   */
  async startConnect(provider: LinkedProvider): Promise<{ authUrl: string | null; message?: string }> {
    const res = await apiClient.get(`/api/linked-accounts/${provider}/connect`);
    const data = unwrap(res);
    return {
      authUrl: typeof data?.authUrl === "string" && data.authUrl ? data.authUrl : null,
      message: typeof data?.message === "string" ? data.message : undefined,
    };
  },

  async getStatus(): Promise<LinkedStatus> {
    const res = await apiClient.get(`/api/linked-accounts/status`);
    return unwrap(res) as LinkedStatus;
  },

  async sync(): Promise<LinkedBalance[]> {
    const res = await apiClient.post(`/api/linked-accounts/sync`);
    return (unwrap(res)?.balances ?? []) as LinkedBalance[];
  },

  async getTransactions(currency = "USD"): Promise<LinkedTransaction[]> {
    const res = await apiClient.get(`/api/linked-accounts/transactions`, {
      params: { currency },
    });
    return (unwrap(res)?.transactions ?? []) as LinkedTransaction[];
  },

  async transfer(payload: {
    amount: number;
    currency?: string;
    recipient: string;
    recipientEmail?: string;
    reference?: string;
    targetCurrency?: string;
  }): Promise<{ transferId: string; status: string }> {
    const res = await apiClient.post(`/api/linked-accounts/transfer`, payload);
    return unwrap(res) as { transferId: string; status: string };
  },

  async disconnect(provider?: LinkedProvider): Promise<void> {
    await apiClient.post(`/api/linked-accounts/disconnect`, { provider });
  },
};
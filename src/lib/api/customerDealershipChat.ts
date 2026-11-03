import { apiClient } from "@/lib/api-client";

/** The signed-in customer's own dealership chat (its AI Agent). */
export interface DealershipChat {
  available: boolean;
  orgKey?: string;
  dealerName?: string;
  agentName?: string;
}

export async function getDealershipChat(token: string | null): Promise<DealershipChat> {
  const response = await apiClient.get("/api/customer/dealership-chat", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = response.data?.data ?? {};
  return {
    available: data.available === true && typeof data.orgKey === "string" && data.orgKey !== "",
    orgKey: typeof data.orgKey === "string" ? data.orgKey : undefined,
    dealerName: typeof data.dealerName === "string" ? data.dealerName : undefined,
    agentName: typeof data.agentName === "string" ? data.agentName : undefined,
  };
}

/** "Chat with Anna", or the dealership's name when the AI Agent has none. */
export function dealershipChatTitle(chat: Pick<DealershipChat, "agentName" | "dealerName">): string {
  const name = chat.agentName?.trim() || chat.dealerName?.trim();
  return name ? `Chat with ${name}` : "Chat with your dealership";
}

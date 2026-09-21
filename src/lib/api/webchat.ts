import { apiClient } from "../api-client";

export interface WebChatVisitorMessage {
  _id: string;
  fromVisitor: boolean;
  body: string;
  createdAt: string;
  agentName?: string;
}

export interface StartWebChatPayload {
  vehicleId?: string;
  orgKey?: string;
  name: string;
  email?: string;
  phone?: string;
  message: string;
  pageUrl?: string;
}

export interface StartWebChatResult {
  sessionId: string;
  token: string;
  messages: WebChatVisitorMessage[];
}

export const startWebChat = async (
  payload: StartWebChatPayload,
): Promise<StartWebChatResult> => {
  const res = await apiClient.post("/api/webchat/public/sessions", payload);
  return res.data.data;
};

export const sendWebChatMessage = async (
  sessionId: string,
  token: string,
  message: string,
): Promise<WebChatVisitorMessage> => {
  const res = await apiClient.post(`/api/webchat/public/sessions/${sessionId}/messages`, {
    token,
    message,
  });
  return res.data.data.message;
};

export const syncWebChat = async (
  sessionId: string,
  token: string,
  after?: string,
): Promise<WebChatVisitorMessage[]> => {
  const res = await apiClient.post(`/api/webchat/public/sessions/${sessionId}/sync`, {
    token,
    after,
  });
  return res.data.data.messages;
};

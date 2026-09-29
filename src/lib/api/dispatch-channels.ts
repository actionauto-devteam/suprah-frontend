import { apiClient } from "@/lib/api-client";

// Dispatch Chat channels (suprah-backend/src/controllers/dispatchChannel.controller.ts).

export type ChannelPerson = {
  id: string;
  name: string;
  avatar: string | null;
  kind: "driver" | "staff";
  /** Staff only. Members never see each other's email or phone. */
  organizationName: string | null;
};

export type ChannelMember = ChannelPerson & {
  role: "admin" | "member";
  isCreator: boolean;
  joinedAt: string;
};

export type ChannelSuggestion = {
  id: string;
  person: ChannelPerson;
  suggestedBy: ChannelPerson;
  createdAt: string;
};

export type ChannelSummary = {
  id: string;
  name: string;
  description: string;
  status: "open" | "closed";
  closedAt: string | null;
  myRole: "admin" | "member";
  isCreator: boolean;
  memberCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string;
  unreadCount: number;
  pendingSuggestionCount: number;
};

export type ChannelDetail = ChannelSummary & {
  createdBy: string;
  members: ChannelMember[];
  suggestions: ChannelSuggestion[];
};

/** A photo or file. `url` is a short-lived private link, empty when unavailable. */
export type ChannelAttachment = {
  url: string;
  available: boolean;
  originalName: string;
  mimeType: string;
  size: number;
};

export type ChannelMessage = {
  id: string;
  channelId: string;
  messageType: "message" | "system";
  content: string;
  attachments: ChannelAttachment[];
  clientMessageId: string | null;
  createdAt: string;
  /** Set when the sender changed the text. */
  editedAt: string | null;
  /** A deleted message keeps its place with no text or files. */
  deletedAt: string | null;
  /** Deleted by a channel administrator rather than the sender. */
  deletedByAdmin: boolean;
  sender: ChannelPerson;
};

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
const base = "/api/dispatch-channels";
const path = (channelId: string, rest = "") => `${base}/${encodeURIComponent(channelId)}${rest}`;

export const dispatchChannelsApi = {
  async list(getToken: TokenGetter) {
    return data<{ channels: ChannelSummary[]; unreadTotal: number }>(
      await apiClient.get(base, { headers: await headers(getToken) }),
    );
  },
  async create(getToken: TokenGetter, body: { name: string; description?: string; memberIds: string[] }) {
    return data<ChannelDetail>(await apiClient.post(base, body, { headers: await headers(getToken) }));
  },
  async get(getToken: TokenGetter, channelId: string) {
    return data<ChannelDetail>(await apiClient.get(path(channelId), { headers: await headers(getToken) }));
  },
  async update(getToken: TokenGetter, channelId: string, body: { name?: string; description?: string }) {
    return data<ChannelDetail>(await apiClient.patch(path(channelId), body, { headers: await headers(getToken) }));
  },
  async close(getToken: TokenGetter, channelId: string) {
    return data<ChannelDetail>(await apiClient.post(path(channelId, "/close"), {}, { headers: await headers(getToken) }));
  },
  async leave(getToken: TokenGetter, channelId: string) {
    await apiClient.post(path(channelId, "/leave"), {}, { headers: await headers(getToken) });
  },
  async addMembers(getToken: TokenGetter, channelId: string, userIds: string[]) {
    return data<ChannelDetail>(
      await apiClient.post(path(channelId, "/members"), { userIds }, { headers: await headers(getToken) }),
    );
  },
  async removeMember(getToken: TokenGetter, channelId: string, userId: string) {
    return data<ChannelDetail | null>(
      await apiClient.delete(path(channelId, `/members/${encodeURIComponent(userId)}`), { headers: await headers(getToken) }),
    );
  },
  async changeRole(getToken: TokenGetter, channelId: string, userId: string, role: "admin" | "member") {
    return data<ChannelDetail>(
      await apiClient.patch(path(channelId, `/members/${encodeURIComponent(userId)}/role`), { role }, { headers: await headers(getToken) }),
    );
  },
  async suggest(getToken: TokenGetter, channelId: string, userId: string) {
    return data<ChannelDetail>(
      await apiClient.post(path(channelId, "/suggestions"), { userId }, { headers: await headers(getToken) }),
    );
  },
  async decideSuggestion(getToken: TokenGetter, channelId: string, suggestionId: string, approve: boolean) {
    return data<ChannelDetail>(
      await apiClient.post(
        path(channelId, `/suggestions/${encodeURIComponent(suggestionId)}/${approve ? "approve" : "decline"}`),
        {},
        { headers: await headers(getToken) },
      ),
    );
  },
  async messages(getToken: TokenGetter, channelId: string, before?: { createdAt: string; id: string }) {
    return data<{ messages: ChannelMessage[]; hasMore: boolean }>(
      await apiClient.get(path(channelId, "/messages"), {
        params: before ? { before: before.createdAt, beforeId: before.id } : {},
        headers: await headers(getToken),
      }),
    );
  },
  async send(getToken: TokenGetter, channelId: string, content: string, clientMessageId: string) {
    return data<ChannelMessage>(
      await apiClient.post(path(channelId, "/messages"), { content, clientMessageId }, { headers: await headers(getToken) }),
    );
  },
  /** Photos and files, with optional text: up to 5 files of 25 MB each. */
  async sendFiles(getToken: TokenGetter, channelId: string, files: File[], content: string, clientMessageId: string) {
    const form = new FormData();
    for (const file of files) form.append("files", file);
    if (content) form.append("content", content);
    form.append("clientMessageId", clientMessageId);
    return data<ChannelMessage>(await apiClient.post(path(channelId, "/attachments"), form, { headers: await headers(getToken) }));
  },
  async editMessage(getToken: TokenGetter, channelId: string, messageId: string, content: string) {
    return data<ChannelMessage>(
      await apiClient.patch(path(channelId, `/messages/${encodeURIComponent(messageId)}`), { content }, { headers: await headers(getToken) }),
    );
  },
  async deleteMessage(getToken: TokenGetter, channelId: string, messageId: string) {
    return data<ChannelMessage>(
      await apiClient.delete(path(channelId, `/messages/${encodeURIComponent(messageId)}`), { headers: await headers(getToken) }),
    );
  },
  async markRead(getToken: TokenGetter, channelId: string, readUpTo?: string) {
    await apiClient.post(path(channelId, "/read"), readUpTo ? { readUpTo } : {}, { headers: await headers(getToken) });
  },
  async searchPeople(getToken: TokenGetter, search: string) {
    return data<{ people: ChannelPerson[] }>(
      await apiClient.get(`${base}/people`, { params: { search }, headers: await headers(getToken) }),
    ).people;
  },
};

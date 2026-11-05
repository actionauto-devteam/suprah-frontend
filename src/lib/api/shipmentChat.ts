import { apiClient } from "@/lib/api-client";

/*
 * The customer chats on a shipment: the customer who follows it on My
 * Shipments talks privately with the load's current driver ("driver") and
 * with its current dispatcher ("dispatcher"). Customers reach a chat by
 * shipment; the driver and the dispatcher reach theirs from the load.
 */

export type ShipmentChatKind = "driver" | "dispatcher";

/** Mirrors the server's ShipmentChatView. */
export interface ShipmentChatView {
  kind: ShipmentChatKind;
  /** False when no customer follows this load in the portal: no chat. */
  available: boolean;
  threadId: string | null;
  /** Messages can be sent. */
  open: boolean;
  /** Why it's closed, and what to do instead. */
  note: string | null;
  /** Driver chat after delivery: when it closes. */
  closesAt: string | null;
  /** The viewer is in this chat (other staff only see who handles it). */
  isParticipant: boolean;
  /** The other person in the chat. */
  withName: string | null;
  /** Staff who aren't the dispatcher: who handles this chat. */
  handledBy: string | null;
  vehicleName: string;
  loadNumber: string;
  dealerName: string;
  unread: number;
  canClose: boolean;
  canReopen: boolean;
}

export interface ShipmentChatPhoto {
  url: string;
  name: string;
  /** False when the photo can't be shown right now. */
  available: boolean;
}

export interface ShipmentChatMessage {
  id: string;
  /** The viewer sent it. */
  mine: boolean;
  senderRole: "customer" | "driver" | "dispatcher";
  senderName: string;
  content: string;
  photos: ShipmentChatPhoto[];
  createdAt: string;
  /** The other person has read it (the viewer's own messages). */
  seen: boolean;
}

export interface ShipmentChatPage {
  chat: ShipmentChatView;
  messages: ShipmentChatMessage[];
  /** There are older messages (load them with `before`). */
  hasMore: boolean;
}

/** One chat's address: by shipment for customers, by load for drivers and dispatchers. */
export type ShipmentChatSource =
  | { side: "customer"; shipmentId: string; kind: ShipmentChatKind }
  | { side: "load"; loadId: string };

/** Live updates the server sends to both people in a chat. */
export interface ShipmentChatSocketEvent {
  threadId: string;
  loadId: string;
  quoteId: string;
  kind: ShipmentChatKind;
  message?: ShipmentChatMessage;
  readerId?: string;
}

export const SHIPMENT_CHAT_EVENTS = {
  message: "shipment-chat:message",
  read: "shipment-chat:read",
  changed: "shipment-chat:changed",
} as const;

/** Whether a live update is about this chat. */
export function eventIsFor(source: ShipmentChatSource, event: ShipmentChatSocketEvent | null | undefined): boolean {
  if (!event) return false;
  return source.side === "customer"
    ? event.quoteId === source.shipmentId && event.kind === source.kind
    : event.loadId === source.loadId;
}

const basePath = (source: ShipmentChatSource) =>
  source.side === "customer"
    ? `/api/quote-requests/${encodeURIComponent(source.shipmentId)}/chats/${source.kind}`
    : `/api/driver-tracking/loads/${encodeURIComponent(source.loadId)}/customer-chat`;

const auth = (token: string | null) => ({ headers: token ? { Authorization: `Bearer ${token}` } : {} });

/** Whether a load has a customer chat, and unread messages (drivers and dispatchers). */
export async function getLoadCustomerChat(loadId: string, token: string | null): Promise<ShipmentChatView> {
  const response = await apiClient.get(basePath({ side: "load", loadId }), auth(token));
  return response.data?.data as ShipmentChatView;
}

/** The chat with its latest messages, or older ones with `before`. */
export async function getShipmentChatPage(source: ShipmentChatSource, token: string | null, before?: string): Promise<ShipmentChatPage> {
  const path = source.side === "customer" ? basePath(source) : `${basePath(source)}/messages`;
  const response = await apiClient.get(path, { ...auth(token), params: before ? { before } : undefined });
  const data = response.data?.data as Partial<ShipmentChatPage> | undefined;
  return {
    chat: data?.chat as ShipmentChatView,
    messages: Array.isArray(data?.messages) ? data.messages : [],
    hasMore: Boolean(data?.hasMore),
  };
}

export async function sendShipmentChatMessage(
  source: ShipmentChatSource,
  input: { content: string; clientMessageId: string },
  token: string | null,
): Promise<ShipmentChatMessage> {
  const response = await apiClient.post(`${basePath(source)}/messages`, input, auth(token));
  return response.data?.data as ShipmentChatMessage;
}

export async function sendShipmentChatPhotos(
  source: ShipmentChatSource,
  input: { photos: File[]; content: string; clientMessageId: string },
  token: string | null,
): Promise<ShipmentChatMessage> {
  const form = new FormData();
  input.photos.forEach((photo) => form.append("photos", photo));
  if (input.content) form.append("content", input.content);
  form.append("clientMessageId", input.clientMessageId);
  const response = await apiClient.post(`${basePath(source)}/photos`, form, auth(token));
  return response.data?.data as ShipmentChatMessage;
}

/** Marks the messages on screen (up to `readUpTo`) as read. */
export async function markShipmentChatRead(source: ShipmentChatSource, readUpTo: string, token: string | null): Promise<void> {
  await apiClient.post(`${basePath(source)}/read`, { readUpTo }, auth(token));
}

/** The dispatcher closes (or reopens) their chat with the customer. */
export async function setLoadCustomerChatClosed(loadId: string, close: boolean, token: string | null): Promise<ShipmentChatView> {
  const response = await apiClient.post(`${basePath({ side: "load", loadId })}/${close ? "close" : "reopen"}`, {}, auth(token));
  return response.data?.data as ShipmentChatView;
}

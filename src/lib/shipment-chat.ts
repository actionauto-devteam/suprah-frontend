import type { CustomerChatInboxItem, ShipmentChatMessage } from "@/lib/api/shipmentChat"

// ─── Shipment chats: words, times and photo checks ────────────────────────────
// The customer's private chats with the driver carrying their car and with the
// load's dispatcher (decided 2026-11-05). Times are in Mountain Time, the
// dealership's time zone, like the rest of My Shipments.

const DENVER = "America/Denver"

/** Photos a chat can send: same limits as the server. */
export const CHAT_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const
export const CHAT_PHOTO_ACCEPT = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
export const MAX_CHAT_PHOTOS = 5
export const MAX_CHAT_PHOTO_BYTES = 10 * 1024 * 1024
export const MAX_CHAT_MESSAGE_LENGTH = 4000

/** How often an open chat checks for messages when live updates aren't connected. */
export const CHAT_FALLBACK_REFRESH_MS = 30_000

function zoneOf(date: Date): string {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: DENVER, timeZoneName: "short" })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName")
  return part?.value ?? "MT"
}

const denverDay = (date: Date) => date.toLocaleDateString("en-CA", { timeZone: DENVER })

/** "3:40 PM": a message's time in Mountain Time. "" when the time isn't valid. */
export function chatTime(iso: string): string {
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return ""
  return date.toLocaleTimeString("en-US", { timeZone: DENVER, hour: "numeric", minute: "2-digit" })
}

/** The day a message belongs to in Mountain Time ("2026-11-05"), to group messages by day. */
export function chatDayKey(iso: string): string {
  const date = new Date(iso)
  return Number.isFinite(date.getTime()) ? denverDay(date) : ""
}

/** "Today", "Yesterday" or "Wed, Nov 4", for the line above each day's messages. */
export function chatDayLabel(iso: string, nowMs = Date.now()): string {
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return ""
  const day = denverDay(date)
  if (day === denverDay(new Date(nowMs))) return "Today"
  if (day === denverDay(new Date(nowMs - 24 * 60 * 60 * 1000))) return "Yesterday"
  const sameYear = day.slice(0, 4) === denverDay(new Date(nowMs)).slice(0, 4)
  return date.toLocaleDateString("en-US", {
    timeZone: DENVER,
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  })
}

/** "Times are in Mountain Time (MST)." for the chat's footer. */
export function chatZoneNote(nowMs = Date.now()): string {
  return `Times are in Mountain Time (${zoneOf(new Date(nowMs))}).`
}

/** "This chat closes Fri, Nov 6 at 3:40 PM MST." for the driver chat after delivery. */
export function closesAtLine(closesAt: string | null | undefined): string {
  if (!closesAt) return ""
  const date = new Date(closesAt)
  if (!Number.isFinite(date.getTime())) return ""
  const day = date.toLocaleDateString("en-US", { timeZone: DENVER, weekday: "short", month: "short", day: "numeric" })
  return `This chat closes ${day} at ${chatTime(closesAt)} ${zoneOf(date)}.`
}

/** "2 new" on a chat button; "9+ new" past nine. "" when there's nothing new. */
export function unreadLabel(count: number | null | undefined): string {
  const n = Math.max(0, Math.floor(Number(count) || 0))
  if (n === 0) return ""
  return n > 9 ? "9+ new" : `${n} new`
}

/**
 * Checks photos before sending: the type, the size and how many. Returns the
 * photos to send, or what to fix in plain English.
 */
export function checkChatPhotos(files: Array<{ name: string; type: string; size: number }>): { ok: true } | { ok: false; error: string } {
  if (files.length > MAX_CHAT_PHOTOS) return { ok: false, error: `You can send up to ${MAX_CHAT_PHOTOS} photos at once.` }
  for (const file of files) {
    if (!(CHAT_PHOTO_TYPES as readonly string[]).includes(file.type)) {
      return { ok: false, error: `${file.name || "This file"} isn't a photo we can send. Send photos as JPG, PNG or WebP.` }
    }
    if (file.size > MAX_CHAT_PHOTO_BYTES) {
      return { ok: false, error: `${file.name || "This photo"} is larger than 10 MB. Choose a smaller photo.` }
    }
  }
  return { ok: true }
}

/** Adds messages to the list once each (live updates and sends can overlap), oldest first. */
export function mergeChatMessages(existing: ShipmentChatMessage[], incoming: ShipmentChatMessage[]): ShipmentChatMessage[] {
  const byId = new Map(existing.map((message) => [message.id, message]))
  for (const message of incoming) byId.set(message.id, { ...byId.get(message.id), ...message })
  return [...byId.values()].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id.localeCompare(b.id))
}

/** The newest message's time, for "read up to". */
export function newestMessageAt(messages: ShipmentChatMessage[]): string | null {
  return messages.length ? messages[messages.length - 1].createdAt : null
}

// ─── Dispatch Chat's Customers section ────────────────────────────────────────
// Drivers and dispatchers see their customer chats in Dispatch Chat, in their
// own section, apart from dispatcher↔driver chats and channels.

type InboxChat = Pick<
  CustomerChatInboxItem,
  "customerName" | "vehicleName" | "loadNumber" | "dealerName" | "lastMessagePreview" | "lastMessageMine"
>

/** "2021 Toyota Camry · Load L-1001 · Action Auto Utah": what the chat is about. */
export function customerChatAbout(chat: Pick<InboxChat, "vehicleName" | "loadNumber" | "dealerName">, withDealer = true): string {
  return [chat.vehicleName, chat.loadNumber ? `Load ${chat.loadNumber}` : "", withDealer ? chat.dealerName : ""]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(" · ")
}

/** The row's last line: "You: On my way" when you wrote last. */
export function customerChatPreview(chat: Pick<InboxChat, "lastMessagePreview" | "lastMessageMine">): string {
  const preview = (chat.lastMessagePreview ?? "").trim() || "No messages yet"
  return chat.lastMessageMine ? `You: ${preview}` : preview
}

/** Search across the customer's name, the car, the load and the last message. */
export function customerChatMatches(chat: InboxChat, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [chat.customerName, chat.vehicleName, chat.loadNumber, chat.dealerName, chat.lastMessagePreview]
    .join(" ")
    .toLowerCase()
    .includes(needle)
}

/** "1 new customer message" / "3 new customer messages" / "9+ …" on a load card; "" when none. */
export function customerMessagesLabel(count: number | null | undefined): string {
  const n = Math.max(0, Math.floor(Number(count) || 0))
  if (n === 0) return ""
  return `${n > 9 ? "9+" : n} new customer message${n === 1 ? "" : "s"}`
}

/** The load page with its customer chat open (as a notification link opens it). */
export const loadCustomerChatHref = (loadId: string) => `/transportation/load/${encodeURIComponent(loadId)}?chat=customer`

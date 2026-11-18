export const AI_HANDOFF_TOPICS = [
  { key: "availability", label: "Vehicle availability", hint: "Is it still here, can you hold it" },
  { key: "pricing", label: "Price and deals", hint: "Best price, negotiating, discounts" },
  { key: "financing", label: "Financing and credit", hint: "Approvals, payments, credit" },
  { key: "trade_in", label: "Trade-in", hint: "Trade value, payoff" },
  { key: "appointment", label: "Test drive and appointments", hint: "Booking a visit or test drive" },
  { key: "media", label: "Photos and videos", hint: "Walk-around videos, more pictures" },
  { key: "shipping", label: "Shipping and delivery", hint: "Delivery quotes, shipping out of state" },
  { key: "person", label: "Wants a call or a person", hint: "Asked for a call back or a real person" },
  { key: "other", label: "Other", hint: "Anything else the AI hands off" },
] as const

export type AiHandoffTopicKey = (typeof AI_HANDOFF_TOPICS)[number]["key"]

export type AiHandoffTopicTeams = Partial<Record<AiHandoffTopicKey, string>>

export function cleanTopicTeams(raw: unknown): AiHandoffTopicTeams {
  const result: AiHandoffTopicTeams = {}
  if (!raw || typeof raw !== "object") return result
  for (const topic of AI_HANDOFF_TOPICS) {
    const value = String((raw as Record<string, unknown>)[topic.key] ?? "").trim()
    if (value) result[topic.key] = value
  }
  return result
}

export function sameTopicTeams(a: AiHandoffTopicTeams, b: AiHandoffTopicTeams): boolean {
  return AI_HANDOFF_TOPICS.every((topic) => (a[topic.key] || "") === (b[topic.key] || ""))
}

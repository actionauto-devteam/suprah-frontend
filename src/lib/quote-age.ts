/**
 * How long a pending quote has been waiting for the dealership, e.g.
 * "Waiting 3 days". Null for quotes that aren't pending or have no date.
 */
export function quoteWaitingLabel(status: unknown, createdAt: unknown, nowMs: number = Date.now()): string | null {
  if (String(status ?? "").toLowerCase() !== "pending") return null
  const created = new Date(String(createdAt ?? "")).getTime()
  if (!Number.isFinite(created)) return null
  const minutes = Math.max(0, Math.floor((nowMs - created) / 60_000))
  if (minutes < 60) return "Waiting less than an hour"
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Waiting ${hours} h`
  const days = Math.floor(hours / 24)
  return `Waiting ${days} day${days === 1 ? "" : "s"}`
}

/**
 * The Quotes tab counts (2026-11-16): the server now counts every quote of the
 * dealership by status. An older server sends no counts, so they're worked out
 * from the newest quotes downloaded, as before.
 */
export type QuoteTabCounts = { all: number; pending: number; accepted: number; booked: number; rejected: number }

const STATUSES = ["pending", "accepted", "booked", "rejected"] as const

const count = (value: unknown): number | null => {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
}

export function quoteTabCounts(statusCounts: unknown, items: Array<{ status?: unknown }>, total: number): QuoteTabCounts {
  const fromServer = statusCounts && typeof statusCounts === "object" ? (statusCounts as Record<string, unknown>) : null
  if (fromServer && count(fromServer.all) !== null && STATUSES.every((status) => count(fromServer[status]) !== null)) {
    return {
      all: count(fromServer.all)!,
      pending: count(fromServer.pending)!,
      accepted: count(fromServer.accepted)!,
      booked: count(fromServer.booked)!,
      rejected: count(fromServer.rejected)!,
    }
  }
  const counts: QuoteTabCounts = { all: Math.max(0, Math.floor(Number(total) || 0)), pending: 0, accepted: 0, booked: 0, rejected: 0 }
  for (const item of items) {
    const status = String(item?.status ?? "").toLowerCase()
    if ((STATUSES as readonly string[]).includes(status)) counts[status as (typeof STATUSES)[number]] += 1
  }
  return counts
}

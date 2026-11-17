/**
 * The driver's Earnings page (2026-11-16): the server sends the number of
 * completed loads, the number waiting for pay and the newest loads waiting for
 * pay, instead of every load the driver ever had. An older server sends the
 * full load list, so the same numbers are worked out from it as before.
 * "Waiting for pay" = delivered, with no paid or processing payout.
 */
export const EARNINGS_LOADS_URL = "/api/driver-tracking/my-loads?view=earnings"

type LoadLike = { _id: string; status?: string }

export type EarningsLoads<T extends LoadLike = LoadLike> = {
  completedCount: number
  unpaidCount: number
  unpaidLoads: T[]
}

const whole = (value: unknown): number | null => {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
}

export function earningsLoadsFrom<T extends LoadLike>(data: unknown, settledLoadIds: Set<string>): EarningsLoads<T> {
  const summary = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : null
  if (summary && Array.isArray(summary.unpaidLoads) && whole(summary.completedCount) !== null && whole(summary.unpaidCount) !== null) {
    return {
      completedCount: whole(summary.completedCount)!,
      unpaidCount: whole(summary.unpaidCount)!,
      unpaidLoads: summary.unpaidLoads as T[],
    }
  }
  const loads: T[] = Array.isArray(data)
    ? (data as T[])
    : summary && Array.isArray(summary.loads)
      ? (summary.loads as T[])
      : []
  const completed = loads.filter((load) => load?.status === "Delivered")
  const unpaid = completed.filter((load) => !settledLoadIds.has(String(load._id)))
  return { completedCount: completed.length, unpaidCount: unpaid.length, unpaidLoads: unpaid }
}

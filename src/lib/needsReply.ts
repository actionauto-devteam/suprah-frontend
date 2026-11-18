export function needsReplyTime(since: unknown): number {
  if (!since) return 0
  const time = new Date(since as string).getTime()
  return Number.isFinite(time) && time > 0 ? time : 0
}

function waitedMinutes(since: unknown, now: number): number {
  const time = needsReplyTime(since)
  if (!time) return -1
  return Math.max(0, Math.floor((now - time) / 60000))
}

export function waitingLabel(since: unknown, now: number = Date.now()): string {
  const minutes = waitedMinutes(since, now)
  if (minutes < 0) return ""
  if (minutes < 1) return "now"
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

function countOf(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? "" : "s"}`
}

export function needsReplyBannerLabel(since: unknown, now: number = Date.now()): string {
  const minutes = waitedMinutes(since, now)
  if (minutes < 0) return ""
  if (minutes < 1) return "The customer just wrote and has no answer yet."
  const hours = Math.floor(minutes / 60)
  const waited = minutes < 60 ? countOf(minutes, "minute") : hours < 24 ? countOf(hours, "hour") : countOf(Math.floor(hours / 24), "day")
  return `The customer has been waiting ${waited} for an answer.`
}

export function needsReplyHint(since: unknown): string {
  const time = needsReplyTime(since)
  if (!time) return ""
  const when = new Date(time).toLocaleString("en-US", {
    timeZone: "America/Denver",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).replace(/\s+/g, " ")
  return `The customer's last message has no answer yet. Waiting since ${when}.`
}

export function needsReplyCountLabel(count: number): string {
  if (!count || count < 1) return ""
  return count === 1 ? "1 customer needs your reply" : `${count > 99 ? "99+" : count} customers need your reply`
}

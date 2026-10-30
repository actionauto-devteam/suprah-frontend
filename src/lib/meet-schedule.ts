/** Meet schedules use the company calendar, including Mountain DST changes. */
export const meetCalendarDay = (value: string | number) =>
  new Date(value).toLocaleDateString("en-CA", { timeZone: "America/Denver" });

export function isTodaysMeetSchedule(scheduledAt: string | null, nowMs: number): boolean {
  return Boolean(scheduledAt && meetCalendarDay(scheduledAt) === meetCalendarDay(nowMs)
    && new Date(scheduledAt).getTime() >= nowMs - 15 * 60_000);
}

/** Accept invite text/URLs without ever navigating to a pasted external address. */
export function extractMeetCode(value: string): string | null {
  let text = value.trim();
  try { text = decodeURIComponent(text); } catch { /* keep literal clipboard text */ }
  if (/^\d{4}$/.test(text)) return `MEET-${text}`;
  const match = text.match(/(?:^|[^a-z0-9])meet[-\s]?(\d{4})(?![a-z0-9])/i);
  return match ? `MEET-${match[1]}` : null;
}

export const formatMeetDateTime = (iso: string) => new Date(iso).toLocaleString("en-US", {
  timeZone: "America/Denver", weekday: "short", month: "short", day: "numeric",
  hour: "numeric", minute: "2-digit", timeZoneName: "short",
});

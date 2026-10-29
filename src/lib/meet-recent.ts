export interface RecentMeet {
  code: string;
  title: string;
  joinedAt: number;
}

export const RECENT_MEET_KEY = "suprah-meet-recent";

export function rememberRecentMeet(meeting: { code: string; title?: string | null }): void {
  if (typeof window === "undefined") return;
  const code = meeting.code.trim().toUpperCase();
  if (!code) return;
  const value: RecentMeet = {
    code,
    title: meeting.title?.trim() || code,
    joinedAt: Date.now(),
  };
  try { window.localStorage.setItem(RECENT_MEET_KEY, JSON.stringify(value)); } catch { /* storage may be blocked */ }
}

export function readRecentMeet(): RecentMeet | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_MEET_KEY) || "null") as Partial<RecentMeet> | null;
    const code = typeof parsed?.code === "string" ? parsed.code.trim().toUpperCase() : "";
    if (!code) return null;
    return {
      code,
      title: typeof parsed?.title === "string" && parsed.title.trim() ? parsed.title.trim() : code,
      joinedAt: typeof parsed?.joinedAt === "number" ? parsed.joinedAt : 0,
    };
  } catch {
    return null;
  }
}

export function forgetRecentMeet(code?: string): void {
  if (typeof window === "undefined") return;
  try {
    if (code) {
      const recent = readRecentMeet();
      if (recent && recent.code !== code.trim().toUpperCase()) return;
    }
    window.localStorage.removeItem(RECENT_MEET_KEY);
  } catch { /* storage may be blocked */ }
}

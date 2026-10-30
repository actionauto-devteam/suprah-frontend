import { formatMeetDateTime } from "./meet-schedule";

export interface ShareableMeeting {
  code: string;
  title: string;
  scheduledAt: string | null;
  status?: "scheduled" | "live" | "ended";
}

export interface MeetInvite {
  subject: string;
  text: string;
  textWithoutLink: string;
  url: string;
}

export type ShareTargetKey =
  | "gmail" | "outlook" | "email" | "messenger" | "whatsapp"
  | "telegram" | "teams" | "viber" | "sms";

/**
 * Build a guest URL without assuming a browser is available. Components that
 * render on the server can pass an empty origin first, then provide the
 * browser origin after mount for a shareable absolute URL.
 */
export const meetGuestUrl = (code: string, origin = "") =>
  `${origin}/meet/${encodeURIComponent(code)}`;

const mdtLabel = formatMeetDateTime;

export function buildMeetInvite(meetings: ShareableMeeting[], origin = ""): MeetInvite {
  const first = meetings[0];
  const title = first.title?.trim() || "Suprah Meet";
  const url = meetGuestUrl(first.code, origin);

  if (meetings.length > 1) {
    const lines = meetings.map((m) =>
      `• ${m.scheduledAt ? mdtLabel(m.scheduledAt) : "Anytime"} — ${meetGuestUrl(m.code, origin)}`);
    const header = [
      `You're invited to a Suprah Meet series: ${title}`,
      `${meetings.length} sessions, each with its own join link:`,
    ];
    const footer = "Open your session's link in any browser to join — no Suprah account needed.";
    const text = [...header, ...lines, "", footer].join("\n");
    return { subject: `Suprah Meet invite: ${title}`, text, textWithoutLink: text, url };
  }

  const when = first.status === "live" || !first.scheduledAt
    ? "Happening now"
    : mdtLabel(first.scheduledAt);
  const textWithoutLink = [
    `You're invited to a Suprah Meet: ${title}`,
    `When: ${when}`,
    `Meeting code: ${first.code}`,
    "Open the link in any browser to join — no Suprah account needed.",
  ].join("\n");
  return {
    subject: `Suprah Meet invite: ${title}`,
    text: `${textWithoutLink}\n\nJoin: ${url}`,
    textWithoutLink,
    url,
  };
}

export const isMobileDevice = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return true;
  return /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
};

export const canNativeShare = () =>
  typeof navigator !== "undefined" && typeof navigator.share === "function";

export async function nativeShareInvite(invite: MeetInvite, multi: boolean): Promise<"shared" | "cancelled" | "failed"> {
  const data: ShareData = multi
    ? { title: invite.subject, text: invite.text }
    : { title: invite.subject, text: invite.textWithoutLink, url: invite.url };
  try {
    if (navigator.canShare && !navigator.canShare(data)) return "failed";
    await navigator.share(data);
    return "shared";
  } catch (err) {
    return (err as DOMException)?.name === "AbortError" ? "cancelled" : "failed";
  }
}

export async function copyText(value: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    const ok = await navigator.clipboard.writeText(value).then(() => true, () => false);
    if (ok) return true;
  }
  try {
    const el = document.createElement("textarea");
    el.value = value;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    el.setSelectionRange(0, value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

export function shareTargetUrl(key: ShareTargetKey, invite: MeetInvite, mobile: boolean): string {
  const s = encodeURIComponent(invite.subject);
  const t = encodeURIComponent(invite.text);
  const u = encodeURIComponent(invite.url);
  switch (key) {
    case "gmail":
      return `https://mail.google.com/mail/?view=cm&fs=1&su=${s}&body=${t}`;
    case "outlook":
      return `https://outlook.office.com/mail/deeplink/compose?subject=${s}&body=${t}`;
    case "email":
      return `mailto:?subject=${s}&body=${t}`;
    case "messenger":
      return mobile ? `fb-messenger://share/?link=${u}` : "https://www.messenger.com/";
    case "whatsapp":
      return `https://wa.me/?text=${t}`;
    case "telegram":
      return `https://t.me/share/url?url=${u}&text=${encodeURIComponent(invite.textWithoutLink)}`;
    case "teams":
      return `https://teams.microsoft.com/share?href=${u}&msgText=${t}`;
    case "viber":
      return `viber://forward?text=${t}`;
    case "sms":
      return `sms:?&body=${t}`;
  }
}

export function openShareUrl(url: string) {
  if (/^https?:/i.test(url)) {
    const win = window.open(url, "_blank");
    if (win) win.opener = null;
    else window.location.href = url;
    return;
  }
  window.location.href = url;
}

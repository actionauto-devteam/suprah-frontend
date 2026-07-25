/** UA-based mobile/desktop split, shared by the presence heartbeat and the Locator's
 * location ping — both want to tag "was this device a phone" the same way. */
export function getDeviceType(): "mobile" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? "mobile" : "desktop";
}

export type NotificationPlatform = "ios" | "android" | "desktop";

/** Finer-grained split for push-notification setup instructions, where iOS
 * needs its own (very different) enablement path from Android/desktop. */
export function getNotificationPlatform(): NotificationPlatform {
  if (typeof navigator === "undefined") return "desktop";
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  if (isIOS) return "ios";
  if (/Android/i.test(navigator.userAgent)) return "android";
  return "desktop";
}

/** True once the site is actually running as an installed PWA (standalone
 * window, no browser chrome) rather than a normal browser tab. */
export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
}

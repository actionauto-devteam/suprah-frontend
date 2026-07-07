/** UA-based mobile/desktop split, shared by the presence heartbeat and the Locator's
 * location ping — both want to tag "was this device a phone" the same way. */
export function getDeviceType(): "mobile" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? "mobile" : "desktop";
}

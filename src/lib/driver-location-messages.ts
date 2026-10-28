import { isNativeApp } from "@/lib/native-app";
import { SUPPORT_EMAIL } from "@/lib/support-contact";

/**
 * Driver Portal location help. On the website, location is allowed in the
 * browser; in the iPhone app, it's allowed in iPhone Settings → Suprah AI.
 */

const IPHONE_STEPS = `open iPhone Settings, tap Suprah AI, then Location, and choose While Using the App. If Location isn't listed there, contact Suprah AI support at ${SUPPORT_EMAIL}.`;

/**
 * Why location is needed and how to allow it.
 * - retained: Dispatch kept a load with the driver after they went off duty
 * - accepted: the driver has an accepted load
 * - optional: no load needs it right now
 */
export function locationBlockedMessage(reason: "retained" | "accepted" | "optional"): string {
  if (!isNativeApp()) {
    if (reason === "retained") return "Location is blocked for this site. Dispatch kept a load with you and needs your location. Allow location for this site in your browser settings.";
    if (reason === "accepted") return "Location is blocked for this site. You have an accepted load, so Dispatch needs your location. Allow location for this site in your browser settings.";
    return "Location is blocked for this site. Allow it in your browser settings if you want to share your location.";
  }
  if (reason === "retained") return `Location is blocked for the Suprah AI app. Dispatch kept a load with you and needs your location. To allow it, ${IPHONE_STEPS}`;
  if (reason === "accepted") return `Location is blocked for the Suprah AI app. You have an accepted load, so Dispatch needs your location. To allow it, ${IPHONE_STEPS}`;
  return `Location is blocked for the Suprah AI app. If you want to share your location, ${IPHONE_STEPS}`;
}

/** The short label on the Driver Portal map's GPS chip. */
export function locationBlockedChip(inNativeApp: boolean): string {
  return inNativeApp
    ? "Location blocked. Allow it in iPhone Settings → Suprah AI."
    : "Location blocked. Allow it in your browser settings.";
}

"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import type { ToasterProps } from "sonner"
import { ToastDeck } from "@/components/ui/toast-deck"

/**
 * The app's toasts. Every screen keeps calling sonner's toast(); since
 * 2026-11-13 they appear as one card at a time, with a button on the card's
 * right that steps through the open toasts (see ToastDeck).
 */
const Toaster = ({ position = "top-right", duration, closeButton }: ToasterProps) => {
  return (
    <ToastDeck
      position={position}
      duration={duration}
      closeButton={closeButton}
      // A toast pinned to the literal top of the viewport renders straight
      // under the Dynamic Island / notch on an installed iOS PWA (no browser
      // chrome there to naturally push it down) — max() keeps the same
      // default spacing on devices with no safe-area-inset-top at all.
      // SystemStatusBanner (fixed top, z-100) publishes its live height to
      // --suprah-status-banner-h while visible so toasts sit below it
      // instead of overlapping its dismiss button during an outage.
      offset={{
        top: "calc(max(env(safe-area-inset-top), 1rem) + var(--suprah-status-banner-h, 0px))",
        bottom: "max(env(safe-area-inset-bottom), 1rem)",
        left: "1rem",
        right: "1rem",
      }}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
    />
  )
}

export { Toaster }

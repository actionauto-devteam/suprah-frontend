import { SUPPORT_EMAIL } from "@/lib/support-contact"

// ─── Customer portal: sections still under development ──────────────────────
// Marked in the sidebar and with a notice at the top of the page (decided
// 2026-11-05), so customers know what works today and what to do for the
// rest. Remove a section here once it's finished.

export const IN_DEVELOPMENT_LABEL = "In development"

export interface InDevelopmentNotice {
  /** The section's name, as the sidebar shows it. */
  name: string
  /** What customers can already rely on. */
  worksNow: string
  /** What isn't ready yet, and what to do meanwhile. */
  notReady: string
}

export const IN_DEVELOPMENT_SECTIONS: Record<string, InDevelopmentNotice> = {
  "/customer/aftermarket": {
    name: "Aftermarket",
    worksNow: "Browse parts and accessories and ask about any product.",
    notReady: "Paying online at checkout isn't ready yet, so orders aren't charged or shipped automatically. To buy something now, ask about the product and the team will help you.",
  },
  "/customer/membership": {
    name: "Membership",
    worksNow: "See your tier, your membership card and your points.",
    notReady: "There are only a few ways to earn points so far, and more perks are on the way.",
  },
  "/customer/payments": {
    name: "Suprah Pay",
    worksNow: "Pay the payment requests your dealership sends you.",
    notReady: "Suprah Pay is new and still being finished, so some screens and options may change.",
  },
  "/customer/network": {
    name: "Service Network",
    worksNow: "Find partner service locations near you, with their address and phone number.",
    notReady: "Booking a service appointment online isn't available yet. Call the location to book.",
  },
  "/customer/refer": {
    name: "Refer & Earn",
    worksNow: "Share your referral link and see what you've earned.",
    notReady: "Rewards and payouts are still being finished, so our team checks each payout request before it's paid.",
  },
  "/customer/support": {
    name: "Support",
    worksNow: "Send a message to your dealership's support team.",
    notReady: `Support is moving to the Suprah AI team. If your account isn't linked to a dealership yet, messages can't be sent here; email ${SUPPORT_EMAIL} instead.`,
  },
  "/customer/call-center": {
    name: "Call Center",
    worksNow: "Ask for a voice or video call with your dealership.",
    notReady: `The Call Center is moving to the Suprah AI team. If your account isn't linked to a dealership yet, calls can't start here; email ${SUPPORT_EMAIL} instead.`,
  },
}

/**
 * Inside the iPhone app, sections still in development are left out of the
 * menus and their pages go back to My Garage: Apple rejects apps that show
 * unfinished features (2026-11-11). The website still shows them with their
 * notice.
 */
export function shownInApp(pathname: string | null | undefined): boolean {
  return inDevelopmentFor(pathname) === null
}

/** The notice for this page (or one of its sub-pages), or null when the section is finished. */
export function inDevelopmentFor(pathname: string | null | undefined): InDevelopmentNotice | null {
  const path = String(pathname ?? "").split(/[?#]/)[0].replace(/\/+$/, "")
  if (!path) return null
  for (const [section, notice] of Object.entries(IN_DEVELOPMENT_SECTIONS)) {
    if (path === section || path.startsWith(`${section}/`)) return notice
  }
  return null
}

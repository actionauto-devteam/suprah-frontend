// ─── Driver and customer invite links (/join/<code>) (2026-11-11) ────────────
// Each link only sets up its own kind of account: a driver goes on to finish
// the driver application, a customer goes to that dealership's customer
// portal. Someone already signed in is asked to sign out first, so the new
// account is never mixed up with theirs. The new account confirms its email
// with the 6-digit code first, like every other sign-up.

export type JoinAccountType = "customer" | "driver"

/** Where the new account goes after signing in. */
export const joinNextPath = (accountType: JoinAccountType) => (accountType === "driver" ? "/driver/pending" : "/customer")

/** Sign-in with the new email filled in, then straight to the next step. */
export const joinSignInHref = (accountType: JoinAccountType, email: string) =>
  `/sign-in?email=${encodeURIComponent(email.trim())}&redirect_url=${encodeURIComponent(joinNextPath(accountType))}`

/**
 * After creating the account: the page for the 6-digit code from the email.
 * The code confirms the person owns the email; it then signs them in and
 * opens the driver application or the customer portal.
 */
export const joinVerifyHref = (email: string) => `/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`

/** What the link creates and what comes next, shown above the form (2026-11-11). */
export function joinFormNote(accountType: JoinAccountType, orgName: string): string {
  if (accountType === "driver") {
    return "This creates a driver account. Next, you'll confirm your email with a 6-digit code, then finish your application (documents and agreement). The Suprah AI team reviews it before you can take loads."
  }
  return `This creates a customer account with ${orgName}, where you can shop cars, save favorites and follow shipments. Next, you'll confirm your email with a 6-digit code.`
}

/** Shown instead of the form when someone is already signed in. */
export function joinSignedInNote(accountType: JoinAccountType, signedInEmail: string): string {
  const who = signedInEmail.trim() || "another account"
  const kind = accountType === "driver" ? "driver" : "customer"
  return `You're signed in as ${who}. This link creates a new ${kind} account, so sign out first to continue.`
}

/** The server answers 409 when the email already has an account. */
export const EMAIL_ALREADY_HAS_ACCOUNT_STATUS = 409

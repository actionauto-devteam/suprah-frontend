// ─── Driver and customer invite links (/join/<code>) (2026-11-11) ────────────
// Each link only sets up its own kind of account: a driver goes on to finish
// the driver application, a customer goes to that dealership's customer
// portal. Someone already signed in is asked to sign out first, so the new
// account is never mixed up with theirs.

export type JoinAccountType = "customer" | "driver"

/** Where the new account goes after signing in. */
export const joinNextPath = (accountType: JoinAccountType) => (accountType === "driver" ? "/driver/pending" : "/customer")

/** Sign-in with the new email filled in, then straight to the next step. */
export const joinSignInHref = (accountType: JoinAccountType, email: string) =>
  `/sign-in?email=${encodeURIComponent(email.trim())}&redirect_url=${encodeURIComponent(joinNextPath(accountType))}`

export function joinSuccess(accountType: JoinAccountType, orgName: string): { title: string; message: string; button: string } {
  if (accountType === "driver") {
    return {
      title: "Driver account created",
      message:
        "Next, sign in and finish your application: upload your documents and sign the driver agreement. The Suprah AI team reviews it and emails you once you're approved.",
      button: "Continue to your application",
    }
  }
  return {
    title: "Account created!",
    message: `Your customer account with ${orgName} is ready. Sign in to start shopping.`,
    button: "Continue",
  }
}

/** Shown instead of the form when someone is already signed in. */
export function joinSignedInNote(accountType: JoinAccountType, signedInEmail: string): string {
  const who = signedInEmail.trim() || "another account"
  const kind = accountType === "driver" ? "driver" : "customer"
  return `You're signed in as ${who}. This link creates a new ${kind} account, so sign out first to continue.`
}

/** The server answers 409 when the email already has an account. */
export const EMAIL_ALREADY_HAS_ACCOUNT_STATUS = 409

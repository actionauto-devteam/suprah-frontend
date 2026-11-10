import { SUPPORT_EMAIL } from "@/lib/support-contact"
import { userErrorMessage } from "@/lib/user-error"

// ─── Deleting your own account (2026-11-11) ──────────────────────────────────
// Apple requires apps that let people sign up to let them delete their account
// in the app. Drivers (also while waiting for approval) and customers can;
// staff accounts are removed by their dealership.

export type DeletingAccount = "driver" | "customer"

/** Drivers use the Driver Portal's address, which works before approval too. */
export const ACCOUNT_DELETION_ENDPOINT: Record<DeletingAccount, string> = {
  driver: "/api/driver-profile/account",
  customer: "/api/profile/delete-account",
}

export const DELETE_CONFIRM_WORD = "DELETE"

/** The confirm button works once DELETE is typed (any letter case, spaces ignored). */
export function deletionConfirmed(text: string): boolean {
  return text.trim().toUpperCase() === DELETE_CONFIRM_WORD
}

// The sign-in check can refuse before the deletion is even looked at. Its
// messages are about features in general, so they're said again in terms of
// deleting the account, with what to do (2026-11-11).
const SIGN_IN_CHECK_REASONS: Array<[RegExp, string]> = [
  [
    /verify your email/i,
    "Your email address isn't verified yet, so your account can't be deleted. Open the verification link we emailed you (check your spam folder too), then try again.",
  ],
  [
    /setup isn't finished|complete onboarding/i,
    "Your account setup isn't finished yet, so it can't be deleted. Finish setting up your account, then try again.",
  ],
  [
    /account has been suspended/i,
    `This account is suspended, so it can't be deleted here. Email Suprah AI support at ${SUPPORT_EMAIL} and they'll remove it.`,
  ],
]

/**
 * Why the account couldn't be deleted, in plain words: the reason the server
 * gave (a load or shipment in progress, an unpaid payout), what the sign-in
 * check needs first, or what went wrong with the connection.
 */
export function deletionErrorMessage(error: unknown): string {
  const status = (error as { response?: { status?: number } })?.response?.status
  const serverMessage = String((error as { response?: { data?: { message?: unknown } } })?.response?.data?.message ?? "")
  if (status === 403) {
    for (const [pattern, reason] of SIGN_IN_CHECK_REASONS) {
      if (pattern.test(serverMessage)) return reason
    }
  }
  return userErrorMessage(error, "delete your account")
}

export const ACCOUNT_DELETION_TEXT: Record<DeletingAccount, { removed: string; kept: string; blockedWhen: string }> = {
  driver: {
    removed:
      "Your sign-in, name, email, phone, photo, saved signature, documents, equipment, location history and tracking phone.",
    kept: "Past loads, delivery photos, payouts and dispatch chats, for the dealerships' records. They show \"Former driver\" instead of your name.",
    blockedWhen: "You can't delete your account while a load is in progress or a payout hasn't been paid yet.",
  },
  customer: {
    removed: "Your sign-in, name, email, phone, photo, Wishlist, My Garage cars, shopping chats and membership points.",
    kept: "Shipping requests, shipments, finance applications, chats and reviews, for the dealerships' records. They show \"Former customer\" instead of your name.",
    blockedWhen: "You can't delete your account while a car is being shipped to you.",
  },
}

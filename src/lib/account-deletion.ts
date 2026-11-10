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

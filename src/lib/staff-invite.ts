// ─── Staff (team) invitations (2026-11-11) ───────────────────────────────────
// An invited staff member is only ever taken through staff account setup:
// "Create my account" opens the staff sign-up form for the invited email, and
// "I already have an account" signs in and comes back to the invitation. The
// invitation is only accepted by the account it was sent to, never by a
// driver account (the server checks this too).

export type StaffInvite = {
  organizationName: string
  inviterName: string
  email: string
  role: string
  isAlreadyAccepted?: boolean
}

/** Where to come back to after signing in, out or up. */
export const staffInvitePath = (token: string) => `/accept-invite?token=${encodeURIComponent(token)}`

/** The staff sign-up form, which fills in and locks the invited email. */
export const staffSignUpHref = (token: string) =>
  `/sign-up?token=${encodeURIComponent(token)}&redirect_url=${encodeURIComponent(staffInvitePath(token))}`

/** Sign-in with the invited email filled in, back to the invitation afterwards. */
export const staffSignInHref = (token: string, email: string) =>
  `/sign-in?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}&redirect_url=${encodeURIComponent(staffInvitePath(token))}`

export function inviteRoleLabel(role: string | null | undefined): string {
  const value = String(role ?? "").trim()
  if (value === "member") return "Member"
  if (value === "admin") return "Admin"
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Member"
}

export type StaffInviteVisitor = "signed-out" | "invited-account" | "other-account" | "driver-account"

/** Who is looking at the invitation, which decides what the page offers. */
export function staffInviteVisitor(input: {
  isSignedIn: boolean
  inviteEmail: string
  signedInEmail?: string | null
  signedInRole?: string | null
}): StaffInviteVisitor {
  if (!input.isSignedIn) return "signed-out"
  const invited = input.inviteEmail.trim().toLowerCase()
  const signedIn = String(input.signedInEmail ?? "").trim().toLowerCase()
  if (!invited || invited !== signedIn) return "other-account"
  if (input.signedInRole === "driver") return "driver-account"
  return "invited-account"
}

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
  /** What kind of account the invited email already has (2026-11-11). */
  accountStatus?: InvitedAccountStatus | null
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

/** What kind of account the invited email already has (from the server). */
export type InvitedAccountStatus = "none" | "customer" | "driver" | "team" | "other-dealership-staff"

export type StaffInviteAction = "create" | "sign-in" | "accept" | "sign-out"

export type StaffInviteGuide = {
  /** What will happen, in plain words, shown before any button is pressed. */
  note: string
  tone: "info" | "warning"
  actions: StaffInviteAction[]
  acceptLabel: string
  signInLabel: string
}

/**
 * The note and buttons for a staff invitation (2026-11-11): every case says
 * what pressing the button will do. A customer account turns into staff (and
 * loses the customer portal on that email), staff at another dealership move
 * here, and a driver account can't be used at all.
 */
export function staffInviteGuide(input: {
  visitor: StaffInviteVisitor
  invite: Pick<StaffInvite, "email" | "organizationName" | "inviterName" | "role" | "isAlreadyAccepted"> & {
    accountStatus?: InvitedAccountStatus | null
  }
  signedInEmail?: string | null
}): StaffInviteGuide {
  const { visitor, invite } = input
  const email = invite.email
  const org = invite.organizationName
  const inviter = invite.inviterName || "the person who invited you"
  const role = inviteRoleLabel(invite.role)
  const status = invite.accountStatus ?? "none"
  const base = { acceptLabel: "Accept invitation", signInLabel: "I already have an account" }
  const driverNote = `${email} is registered as a driver account, so it can't be used for a staff account. Ask ${inviter} to send the invitation to a different email.`
  const customerNote = `Accepting turns ${email} from a customer account into a staff account at ${org}. My Garage, Wishlist and My Shipments won't be available with this email any more. To keep shopping as a customer, ask ${inviter} to invite a different email instead.`
  const movingNote = `Accepting moves ${email} to ${org}'s team. You won't have access to your current dealership any more.`

  if (visitor === "other-account") {
    return {
      ...base,
      note: `This invitation is for ${email}, but you're signed in as ${input.signedInEmail || "another account"}. Sign out to continue with the invited email.`,
      tone: "warning",
      actions: ["sign-out"],
    }
  }
  if (visitor === "driver-account" || status === "driver") {
    return { ...base, note: driverNote, tone: "warning", actions: visitor === "signed-out" ? [] : ["sign-out"] }
  }

  if (visitor === "signed-out") {
    if (invite.isAlreadyAccepted || status === "team") {
      return { ...base, note: `${email} is already on ${org}'s team. Sign in to continue.`, tone: "info", actions: ["sign-in"], signInLabel: "Sign in" }
    }
    if (status === "customer") {
      return { ...base, note: `${email} already has a customer account. Sign in to accept. ${customerNote}`, tone: "warning", actions: ["sign-in"], signInLabel: "Sign in to accept" }
    }
    if (status === "other-dealership-staff") {
      return { ...base, note: `${email} already has a staff account at another dealership. Sign in to accept. ${movingNote}`, tone: "warning", actions: ["sign-in"], signInLabel: "Sign in to accept" }
    }
    return {
      ...base,
      note: `Create your account with ${email}: choose a password and confirm your email with a code, then you'll go straight to ${org}'s dashboard as ${role}. Already have an account with this email? Sign in instead.`,
      tone: "info",
      actions: ["create", "sign-in"],
    }
  }

  // Signed in with the invited email.
  if (status === "customer") {
    return { ...base, note: customerNote, tone: "warning", actions: ["accept"], acceptLabel: "Accept and switch to staff" }
  }
  if (status === "other-dealership-staff") {
    return { ...base, note: movingNote, tone: "warning", actions: ["accept"], acceptLabel: `Accept and move to ${org}` }
  }
  return { ...base, note: `You'll join ${org} as ${role}.`, tone: "info", actions: ["accept"] }
}

/** Why the staff sign-up form can't be used for this email, or null (2026-11-11). */
export function staffSignUpBlocker(invite: Pick<StaffInvite, "email" | "inviterName"> & { accountStatus?: InvitedAccountStatus | null }): string | null {
  const status = invite.accountStatus ?? "none"
  if (status === "driver") {
    return `${invite.email} is registered as a driver account, so it can't be used for a staff account. Ask ${invite.inviterName || "the person who invited you"} to send the invitation to a different email.`
  }
  if (status !== "none") return `${invite.email} already has an account. Sign in instead to accept the invitation.`
  return null
}

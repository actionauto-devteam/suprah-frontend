// ─── Staff account deletion requests (2026-11-12) ────────────────────────────
// Staff can't delete their account straight away like drivers and customers:
// they send a request, and an admin of their dealership approves it (the
// account is deleted) or rejects it with a reason they see.

export const STAFF_DELETION_ENDPOINT = "/api/account-deletion-requests"
export const STAFF_DELETION_MINE_ENDPOINT = `${STAFF_DELETION_ENDPOINT}/mine`

export const NOTE_MAX_LENGTH = 500
export const REASON_MIN_LENGTH = 5
export const REASON_MAX_LENGTH = 500

export type MyStaffDeletionRequest = {
  id: string
  status: "pending" | "rejected"
  createdAt: string
  decidedAt?: string
  rejectionReason?: string
} | null

export type StaffDeletionReviewItem = {
  id: string
  status: "pending" | "approved" | "rejected"
  createdAt: string
  decidedAt?: string
  note?: string
  rejectionReason?: string
  person: { id: string; name: string; email: string; role: string }
}

/** Members and admins of a dealership send a request; the Suprah AI team doesn't. */
export function canRequestStaffDeletion(user: { role?: string | null; organizationId?: string | null } | null | undefined): boolean {
  return Boolean(user?.organizationId) && (user?.role === "employee" || user?.role === "admin")
}

/** Sent with the request: they ticked what Suprah AI keeps, plus their optional note. */
export function staffDeletionRequestBody(note: string): { acknowledgedRetention: true; note?: string } {
  const trimmed = note.trim().slice(0, NOTE_MAX_LENGTH)
  return trimmed ? { acknowledgedRetention: true, note: trimmed } : { acknowledgedRetention: true }
}

/** Why the admin's reason can't be sent yet, or null. */
export function rejectionReasonProblem(text: string): string | null {
  const reason = text.trim()
  if (reason.length < REASON_MIN_LENGTH) return `Write why you're rejecting it (at least ${REASON_MIN_LENGTH} characters), so they know what to do next.`
  if (reason.length > REASON_MAX_LENGTH) return `Keep the reason to ${REASON_MAX_LENGTH} characters or fewer.`
  return null
}

export const STAFF_DELETION_TEXT = {
  removed: "Your sign-in, name, email, phone, photo, notifications and passkeys on your Suprah AI account. Your CRM sign-in stops working too.",
  keptByDealership:
    "Your dealership keeps its business and employee records, such as leads, deals, loads, chats and time records. Your unfinished loads are removed, and loads you dispatch move to the admin who approves.",
  howItWorks:
    "An admin of your dealership reviews your request. If they approve it, your account is deleted and you're signed out. If they reject it, you'll see their reason here and by email.",
}

export function formatRequestDate(iso: string | undefined): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

/** What the staff member's card says about their request. */
export function myRequestSummary(request: MyStaffDeletionRequest, dealership: string): { title: string; message: string } | null {
  if (!request) return null
  const where = dealership.trim() || "your dealership"
  if (request.status === "pending") {
    const sent = formatRequestDate(request.createdAt)
    return {
      title: "Deletion request sent",
      message: `Waiting for an admin of ${where} to review it${sent ? ` (sent ${sent})` : ""}. You can keep using your account until then.`,
    }
  }
  const decided = formatRequestDate(request.decidedAt)
  return {
    title: "Your deletion request was declined",
    message: `An admin of ${where} declined it${decided ? ` on ${decided}` : ""}. Their reason: ${String(request.rejectionReason ?? "").trim() || "none given"}`,
  }
}

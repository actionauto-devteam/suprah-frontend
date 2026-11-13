/** Dealership staff and Suprah AI super admins (not customers or drivers). */
export const STAFF_ROLES = ["employee", "admin", "super_admin"] as const;

export function isStaffRole(role: string | null | undefined): boolean {
  return Boolean(role && (STAFF_ROLES as readonly string[]).includes(role));
}

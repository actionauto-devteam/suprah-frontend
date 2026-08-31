export interface RoleHomeUser {
  role?: string;
  organizationId?: string | null;
}

export function getRoleHome(user: RoleHomeUser | null | undefined): string {
  if (!user?.role) return "/sign-in";
  switch (user.role) {
    case "customer":
      return "/customer";
    case "driver":
      return "/driver";
    case "super_admin":
      return "/admin/dashboard";
    case "admin":
      return user.organizationId ? "/" : "/org-selection";
    default:
      return "/";
  }
}

// space.suprah-app.com is a genuinely separate origin from the main app, so
// a post-login return trip there can only ever be a full absolute URL, never
// a same-origin relative path. This is the one deliberate, narrowly-scoped
// exception to the "relative path only" rule below — it's a first-party
// subdomain we control, not an open redirect: nothing else with "://" gets
// through.
const SUPRASPACE_ORIGIN = "https://space.suprah-app.com";

export function sanitizeRedirectUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let decoded = url.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {}
  if (decoded === SUPRASPACE_ORIGIN || decoded.startsWith(`${SUPRASPACE_ORIGIN}/`)) {
    return decoded;
  }
  if (!decoded.startsWith("/")) return null;
  if (decoded.startsWith("//") || decoded.startsWith("/\\")) return null;
  if (decoded.includes("://")) return null;
  if (decoded.startsWith("/sign-in") || decoded.startsWith("/sign-up")) return null;
  return decoded;
}

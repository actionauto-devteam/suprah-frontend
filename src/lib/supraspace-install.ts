// Cross-subdomain signal for "has this device already installed SupraSpace
// as its own PWA". Set by the SupraSpace subdomain itself once installed,
// read by the main Suprah AI app (a different origin) so it can offer
// "open SupraSpace" instead of "install SupraSpace" there. There's no
// cross-origin localStorage or JS API for this — a cookie scoped to the
// shared parent domain (suprah-app.com) is the only thing both origins
// can see. This is a per-device signal, not per-account: it only reflects
// whether install actually happened in THIS browser.
const COOKIE_NAME = "ss_installed";
const PARENT_DOMAIN = ".suprah-app.com";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function markSupraSpaceInstalled() {
    if (typeof document === "undefined") return;
    const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
    // Domain=.suprah-app.com is rejected by the browser on any host that
    // isn't actually a suprah-app.com subdomain (e.g. localhost) — harmless
    // no-op there, not an error.
    document.cookie = `${COOKIE_NAME}=1; Domain=${PARENT_DOMAIN}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`;
}

export function isSupraSpaceInstalled(): boolean {
    if (typeof document === "undefined") return false;
    return document.cookie.split("; ").some((c) => c === `${COOKIE_NAME}=1`);
}

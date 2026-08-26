import { NextResponse, NextRequest } from "next/server";

const publicRoutes = [
    '/sign-in',
    '/sign-up',
    '/verify-email',
    '/auth/callback',
    '/upgrade',
    '/api/uploadthing',
    '/.well-known'
];

// SupraSpace's dedicated PWA lives on its own subdomain so it can be
// installed as a genuinely separate app alongside the main Suprah AI PWA
// (installing two PWAs from the same origin conflicts on Android/iOS — see
// the SupraSpace deep-dive memory for the full story). The subdomain has no
// routes of its own — everything it serves is actually the existing
// (chat)/supraspace page.tsx, just reached through a different hostname.
const SUPRASPACE_SUBDOMAIN = 'space.suprah-app.com';

export async function proxy(request: any) {
    const hostname: string = (request.headers.get('host') || '').split(':')[0];

    if (hostname === SUPRASPACE_SUBDOMAIN) {
        const url = request.nextUrl.clone();
        const isPublicRoute = publicRoutes.some((route) => url.pathname === route || url.pathname.startsWith(`${route}/`));
        // A trailing "*.ext" segment means this is a request for a root-level
        // public/ file (sw.js, /sounds/*.wav, /supra-space/icon-*.png, the
        // favicon, etc.) — those live at the SAME path on every origin this
        // app serves, there's no "/supraspace/sounds/..." equivalent, so they
        // must never get the /supraspace prefix. manifest.webmanifest is the
        // one deliberate exception: SupraSpace's own manifest really does
        // live nested at /supraspace/manifest.webmanifest.
        const isStaticAssetPath = /\.[a-zA-Z0-9]+$/.test(url.pathname) && url.pathname !== '/manifest.webmanifest';
        // Never rewrite: API calls (already have their own rewrite in
        // next.config.ts to the backend), anything already under
        // /supraspace (avoids a rewrite loop if this ever runs twice),
        // internal Next.js paths (HMR/RSC/etc — most are already excluded by
        // the matcher below, this is defense in depth), root-level static
        // files, or the shared public routes like /sign-in — a visitor with
        // no session on this origin yet still needs a real, working sign-in
        // page, not a 404.
        if (
            !url.pathname.startsWith('/api')
            && !url.pathname.startsWith('/supraspace')
            && !url.pathname.startsWith('/_next')
            && !isStaticAssetPath
            && !isPublicRoute
        ) {
            url.pathname = url.pathname === '/' ? '/supraspace' : `/supraspace${url.pathname}`;
            return NextResponse.rewrite(url);
        }
        return NextResponse.next();
    }

    // The previous authentication logic here was checking for a 'refreshToken' cookie.
    // In production, the backend is on a separate domain (e.g. api.actionauto.com),
    // so Next.js Middleware cannot see the HttpOnly cookies set by the backend.
    //
    // All authentication routing guards are now safely managed by the AuthProvider.tsx
    // running on the client-side which can make cross-origin API verify requests.
    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder files (images, variants, themes, logos, etc.)
         *
         * manifest.webmanifest is deliberately NOT excluded (unlike before) —
         * the subdomain needs its own rewrite of that exact path too, so
         * space.suprah-app.com/manifest.webmanifest serves SupraSpace's
         * manifest instead of falling through to the main app's root one.
         */
        '/((?!_next/static|_next/image|favicon.ico|images|variants|themes|logos|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)',
    ],
};

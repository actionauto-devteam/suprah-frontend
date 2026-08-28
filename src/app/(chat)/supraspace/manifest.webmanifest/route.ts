import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export function GET() {
    return NextResponse.json(
        {
            id: 'suprah-space',
            name: 'SupraSpace',
            short_name: 'SupraSpace',
            description: 'Team messaging, calls, and status for Suprah.AI',
            // Absolute, pointing at SupraSpace's own subdomain rather than a
            // path on the main app's origin — this is what actually makes
            // it a genuinely separate installable PWA (distinct origin),
            // not just a differently-scoped path on the same one. This same
            // manifest is also reachable at /supraspace/manifest.webmanifest
            // on the main domain (dashboard-embedded route); start_url/scope
            // being absolute means it still resolves correctly either way.
            start_url: 'https://space.suprah-app.com/',
            scope: 'https://space.suprah-app.com/',
            display: 'standalone',
            // Matches --bg-base (the app's own actual dark-theme background,
            // page.tsx's injected ss4 stylesheet) rather than an arbitrary
            // greener shade. iOS uses this for the standalone launch screen
            // and, more importantly, as the fallback paint for any safe-area
            // strip (bottom home-indicator zone, etc.) the actual page
            // content doesn't visibly extend into — a mismatch there reads
            // as a stray colored box that doesn't correspond to any real
            // element, which is exactly what was reported.
            background_color: '#0e0f11',
            theme_color: '#16a34a',
            icons: [
                { src: '/supra-space/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
                { src: '/supra-space/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                { src: '/supra-space/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                { src: '/supra-space/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            ],
        },
        { headers: { 'Content-Type': 'application/manifest+json' } }
    );
}

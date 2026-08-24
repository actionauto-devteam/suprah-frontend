import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export function GET() {
    return NextResponse.json(
        {
            id: 'suprah-space',
            name: 'SupraSpace',
            short_name: 'SupraSpace',
            description: 'Team messaging, calls, and status for Suprah.AI',
            start_url: '/supraspace',
            scope: '/supraspace/',
            display: 'standalone',
            background_color: '#0b1f14',
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

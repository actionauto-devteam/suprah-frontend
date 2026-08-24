import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export function GET() {
    return NextResponse.json(
        {
            id: 'suprah-timeproof-widget',
            name: 'TimeProof',
            short_name: 'TimeProof',
            description: 'Quick TimeProof timer — check hours, take a break, or end shift without opening Suprah AI.',
            start_url: '/timeproof-widget',
            scope: '/timeproof-widget/',
            display: 'standalone',
            background_color: '#000000',
            theme_color: '#000000',
            icons: [
                { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
                { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            ],
        },
        { headers: { 'Content-Type': 'application/manifest+json' } }
    );
}

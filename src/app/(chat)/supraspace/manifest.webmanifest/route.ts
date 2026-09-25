import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const requestHost = (request.headers.get('x-forwarded-host') || request.headers.get('host') || requestUrl.host)
        .split(',')[0]
        .trim()
        .toLowerCase();
    const isSupraSpaceHost = requestHost.split(':')[0] === 'space.suprah-app.com';
    const startUrl = isSupraSpaceHost ? '/' : '/supraspace/';
    const scope = isSupraSpaceHost ? '/' : '/supraspace/';
    const shareTargetAction = isSupraSpaceHost ? '/share-target' : '/supraspace/share-target';
    return NextResponse.json(
        {
            id: 'suprah-space',
            name: 'SupraSpace',
            short_name: 'SupraSpace',
            description: 'Team messaging and status for Suprah.AI',
            // Relative values always resolve to the origin that served this
            // manifest, including a reverse-proxied SupraSpace subdomain.
            start_url: startUrl,
            scope,
            display: 'standalone',
            background_color: '#0e0f11',
            theme_color: '#16a34a',
            share_target: {
                action: shareTargetAction,
                method: 'POST',
                enctype: 'multipart/form-data',
                params: {
                    title: 'title',
                    text: 'text',
                    url: 'url',
                    files: [
                        {
                            name: 'media',
                            accept: [
                                'image/*',
                                'video/*',
                                '.jpg',
                                '.jpeg',
                                '.png',
                                '.gif',
                                '.webp',
                                '.heic',
                                '.heif',
                                '.mp4',
                                '.mov',
                                '.webm',
                                '.m4v',
                                '.3gp',
                            ],
                        },
                    ],
                },
            },
            icons: [
                { src: '/supra-space/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
                { src: '/supra-space/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                { src: '/supra-space/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                { src: '/supra-space/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            ],
        },
        { headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'no-store' } }
    );
}

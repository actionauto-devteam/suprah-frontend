import { NextRequest, NextResponse } from 'next/server';

// Allowed R2 hostname suffix — prevents this endpoint from being used as a generic open proxy
const ALLOWED_HOST_SUFFIX = '.r2.cloudflarestorage.com';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  if (!parsed.hostname.endsWith(ALLOWED_HOST_SUFFIX)) {
    return NextResponse.json({ error: 'Disallowed origin' }, { status: 403 });
  }

  try {
    const upstream = await fetch(url, { cache: 'no-store' });
    if (!upstream.ok) {
      return NextResponse.json({ error: 'Upstream error' }, { status: upstream.status });
    }
    const buffer = await upstream.arrayBuffer();
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
  }
}

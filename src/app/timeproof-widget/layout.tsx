import type { Metadata } from 'next';
import { TimeproofWidgetServiceWorkerRegistration } from './TimeproofWidgetServiceWorkerRegistration';

export const metadata: Metadata = {
    title: 'TimeProof',
    manifest: '/timeproof-widget/manifest.webmanifest',
    icons: {
        icon: '/icon-192x192.png',
        apple: '/icon-192x192.png',
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'TimeProof',
    },
};

export default function TimeproofWidgetLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <TimeproofWidgetServiceWorkerRegistration />
        </>
    );
}

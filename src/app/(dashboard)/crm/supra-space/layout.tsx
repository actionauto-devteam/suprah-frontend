import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'SupraSpace',
    manifest: '/crm/supra-space/manifest.webmanifest',
    icons: {
        icon: '/supra-space/icon-192.png',
        apple: '/supra-space/apple-touch-icon.png',
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'SupraSpace',
    },
};

export default function SupraSpaceLayout({ children }: { children: React.ReactNode }) {
    return children;
}

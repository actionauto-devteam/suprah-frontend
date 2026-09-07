'use client';

import React from 'react';
import { WifiOff } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6 text-center">
            <div className="mb-8 p-6 bg-zinc-900 rounded-full">
                <WifiOff size={64} className="text-blue-500 animate-pulse" />
            </div>
            <h1 className="text-4xl font-bold mb-4 tracking-tight">You&apos;re Offline</h1>
            <p className="text-zinc-400 max-w-md mb-8">
                It looks like you&apos;ve lost your connection. Don&apos;t worry, you can still access some parts of the Suprah.AI Dashboard that were previously loaded.
            </p>
            <div className="flex flex-col gap-4 w-full max-w-xs">
                <Link
                    href="/"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all"
                >
                    Retry Connection
                </Link>
            </div>
            <div className="mt-12 text-zinc-500 text-sm">
                Suprah.AI • Offline Mode
            </div>
        </div>
    );
}

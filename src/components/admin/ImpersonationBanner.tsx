'use client';

import React from 'react';
import { adminStore } from '@/store/admin-store';
import { Button } from '@/components/ui/button';
import { XCircle, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function ImpersonationBanner() {
    const { isImpersonating, stopImpersonation, impersonatedOrgId } = adminStore.useStore();
    const router = useRouter();

    if (!isImpersonating) return null;

    const handleExit = () => {
        stopImpersonation();
        router.push('/admin/dashboard');
    };

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-9999 flex items-center gap-4 rounded-full border border-amber-500/25 bg-amber-500/15 px-6 py-3 text-amber-700 shadow-lg backdrop-blur-sm animate-in slide-in-from-bottom-5 dark:text-amber-400">
            <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span className="text-sm font-medium">
                    Impersonating Organization ({impersonatedOrgId})
                </span>
            </div>
            <Button
                variant="secondary"
                size="sm"
                className="h-7 border-none bg-amber-500/20 text-xs text-amber-700 hover:bg-amber-500/30 dark:text-amber-400"
                onClick={handleExit}
            >
                <XCircle className="mr-1 h-3 w-3" />
                Exit View
            </Button>
        </div>
    );
}

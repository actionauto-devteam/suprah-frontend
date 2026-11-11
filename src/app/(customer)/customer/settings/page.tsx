'use client';

import { Suspense } from 'react';
import { ProfileView } from '@/components/profile/ProfileView';
import { DeleteAccountCard } from '@/components/account/DeleteAccountCard';
import './customer-profile.css';

export default function CustomerSettingsPage() {
    return (
        // The profile card takes the Driver Portal's compact layout here (see customer-profile.css).
        <div className="customer-profile-page">
            <Suspense>
                <ProfileView />
            </Suspense>
            {/* Customers can delete their own account (2026-11-11). */}
            <div className="mx-auto max-w-7xl px-3 pb-8 sm:px-4 md:px-6">
                <DeleteAccountCard account="customer" />
            </div>
        </div>
    );
}

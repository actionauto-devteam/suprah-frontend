'use client';

import { Suspense } from 'react';
import { ProfileView } from '@/components/profile/ProfileView';
import './customer-profile.css';

export default function CustomerSettingsPage() {
    return (
        // The profile card takes the Driver Portal's compact layout here (see customer-profile.css).
        <div className="customer-profile-page">
            <Suspense>
                <ProfileView />
            </Suspense>
        </div>
    );
}

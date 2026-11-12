'use client';

import { Suspense } from 'react';
import { ProfileView } from '@/components/profile/ProfileView';
import { StaffDeletionRequestCard } from '@/components/account/StaffDeletionRequestCard';

export default function ProfilePage() {
  return (
    <Suspense>
      <ProfileView />
      {/* Staff ask their dealership admin to delete their account (2026-11-12). */}
      <div className="mx-auto max-w-7xl px-3 pb-8 sm:px-4 md:px-6">
        <StaffDeletionRequestCard />
      </div>
    </Suspense>
  );
}

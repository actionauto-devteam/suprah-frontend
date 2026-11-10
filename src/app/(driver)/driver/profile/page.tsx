'use client';

import { Suspense } from 'react';
import { DriverProfileView } from '@/components/driver-profile/DriverProfileView';
import { PageLoadingState } from '@/components/shared/EmptyLoadingState';
import { DeleteAccountCard } from '@/components/account/DeleteAccountCard';

export default function DriverProfilePage() {
  return (
    <Suspense fallback={<PageLoadingState />}>
      <DriverProfileView />
      {/* Drivers can delete their own account (2026-11-11). */}
      <div className="mx-auto max-w-7xl px-3 pb-8 sm:px-4 md:px-6">
        <DeleteAccountCard account="driver" />
      </div>
    </Suspense>
  );
}
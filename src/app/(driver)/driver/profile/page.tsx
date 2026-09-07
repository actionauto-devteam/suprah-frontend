'use client';

import { Suspense } from 'react';
import { DriverProfileView } from '@/components/driver-profile/DriverProfileView';
import { PageLoadingState } from '@/components/shared/EmptyLoadingState';

export default function DriverProfilePage() {
  return (
    <Suspense fallback={<PageLoadingState />}>
      <DriverProfileView />
    </Suspense>
  );
}
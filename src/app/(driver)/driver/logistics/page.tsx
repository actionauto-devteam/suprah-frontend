'use client';

import { Suspense } from 'react';
import { LogisticsPage } from '@/components/driver-profile/LogisticsPage';
import { PageLoadingState } from '@/components/shared/EmptyLoadingState';

export default function DriverLogisticsPage() {
  return (
    <Suspense fallback={<PageLoadingState />}>
      <LogisticsPage />
    </Suspense>
  );
}

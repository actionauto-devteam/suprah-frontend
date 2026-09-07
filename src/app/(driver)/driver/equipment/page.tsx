'use client';

import { Suspense } from 'react';
import { EquipmentPage } from '@/components/driver-profile/EquipmentPage';
import { PageLoadingState } from '@/components/shared/EmptyLoadingState';

export default function DriverEquipmentPage() {
  return (
    <Suspense fallback={<PageLoadingState />}>
      <EquipmentPage />
    </Suspense>
  );
}

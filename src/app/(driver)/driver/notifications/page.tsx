'use client';

import { Suspense } from 'react';
import { NotificationPage } from '@/components/notifications';
import { PageLoadingState } from '@/components/shared/EmptyLoadingState';

export default function DriverNotificationsPage() {
  return (
    <Suspense fallback={<PageLoadingState />}>
      <NotificationPage />
    </Suspense>
  );
}

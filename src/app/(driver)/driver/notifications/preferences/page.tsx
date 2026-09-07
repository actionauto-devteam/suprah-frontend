'use client';

import { Suspense } from 'react';
import { NotificationPreferencesPage } from '@/components/notifications/NotificationPreferencesPage';
import { PageLoadingState } from '@/components/shared/EmptyLoadingState';

export default function DriverNotificationsPreferencesRoute() {
  return (
    <Suspense fallback={<PageLoadingState />}>
      <NotificationPreferencesPage />
    </Suspense>
  );
}

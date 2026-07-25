'use client';

import { Suspense } from 'react';
import { NotificationPreferencesPage } from '@/components/notifications/NotificationPreferencesPage';

export default function NotificationsPreferencesRoute() {
  return (
    <Suspense fallback={null}>
      <NotificationPreferencesPage />
    </Suspense>
  );
}

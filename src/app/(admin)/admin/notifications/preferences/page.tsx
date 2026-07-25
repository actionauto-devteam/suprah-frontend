'use client';

import { Suspense } from 'react';
import { NotificationPreferencesPage } from '@/components/notifications/NotificationPreferencesPage';

export default function AdminNotificationsPreferencesRoute() {
  return (
    <Suspense fallback={null}>
      <NotificationPreferencesPage />
    </Suspense>
  );
}

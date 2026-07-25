'use client';

import { Suspense } from 'react';
import { NotificationPreferencesPage } from '@/components/notifications/NotificationPreferencesPage';

export default function CrmNotificationsPreferencesRoute() {
  return (
    <Suspense fallback={null}>
      <NotificationPreferencesPage />
    </Suspense>
  );
}

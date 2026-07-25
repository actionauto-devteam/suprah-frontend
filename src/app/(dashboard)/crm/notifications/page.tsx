'use client';

import { Suspense } from 'react';
import { NotificationPage } from '@/components/notifications/NotificationPage';

export default function CrmNotificationsPage() {
  return (
    <Suspense fallback={null}>
      <NotificationPage mode="crm" />
    </Suspense>
  );
}

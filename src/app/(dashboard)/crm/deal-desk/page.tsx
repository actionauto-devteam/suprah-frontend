'use client';

import { Suspense } from 'react';
import { QueueView } from '@/components/deal-desk/QueueView';

export default function DealDeskPage() {
  return (
    <Suspense fallback={null}>
      <QueueView />
    </Suspense>
  );
}

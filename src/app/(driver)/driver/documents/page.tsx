'use client';

import { Suspense } from 'react';
import { DocumentsPage } from '@/components/driver-profile/DocumentsPage';
import { PageLoadingState } from '@/components/shared/EmptyLoadingState';

export default function DriverDocumentsPage() {
  return (
    <Suspense fallback={<PageLoadingState />}>
      <DocumentsPage />
    </Suspense>
  );
}

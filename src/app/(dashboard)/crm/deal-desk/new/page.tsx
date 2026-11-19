'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DealForm } from '@/components/deal-desk/DealForm';

function NewDeal() {
  const params = useSearchParams();
  // Read once: the form updates the URL with ?edit=<id> after the first save
  // and must not remount when that happens.
  const [dealId] = useState(() => params.get('edit') || undefined);
  return <DealForm dealId={dealId} />;
}

export default function NewDealPage() {
  return (
    <Suspense fallback={null}>
      <NewDeal />
    </Suspense>
  );
}

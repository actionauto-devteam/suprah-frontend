'use client';

import { useParams } from 'next/navigation';
import { DealWorkspace } from '@/components/deal-desk/DealWorkspace';

export default function DealPage() {
  const params = useParams<{ id: string }>();
  return <DealWorkspace key={params.id} id={params.id} />;
}

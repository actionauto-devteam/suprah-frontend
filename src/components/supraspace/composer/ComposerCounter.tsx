'use client';

import { useSyncExternalStore } from 'react';
import type { ComposerMetrics } from './composer-metrics';

export function ComposerCounter({ metrics }: { metrics: ComposerMetrics }) {
  const count = useSyncExternalStore(metrics.subscribe, metrics.getSnapshot, () => 0);
  const atLimit = count >= 10000;
  const nearLimit = count >= 9500;
  const label = atLimit ? 'Limit reached - ' : nearLimit ? 'Near limit - ' : '';
  return (
    <span className="font-semibold" style={{ fontSize: 10.5, color: atLimit ? 'var(--danger)' : nearLimit ? '#f59e0b' : 'var(--text-tertiary)' }}>
      {label}{count.toLocaleString()} / 10,000
    </span>
  );
}

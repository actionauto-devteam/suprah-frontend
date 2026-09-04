'use client';

import { cn } from '@/lib/utils';

interface Stage { stage: string; count: number }

export function DriverFunnel({ stages }: { stages: Stage[] }) {
  const peak = Math.max(...stages.map(s => s.count), 1);

  return (
    <div className="space-y-2.5">
      {stages.map((stage, index) => {
        const previous = index > 0 ? stages[index - 1].count : null;
        const dropOff = previous && previous > 0 ? Math.round(((previous - stage.count) / previous) * 100) : null;

        return (
          <div key={stage.stage} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs text-muted-foreground">{stage.stage}</span>
              <div className="flex items-baseline gap-2">
                {dropOff !== null && dropOff > 0 && (
                  <span className="text-[11px] tabular-nums text-muted-foreground">-{dropOff}%</span>
                )}
                <span className="text-sm font-medium tabular-nums">{stage.count}</span>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  index === stages.length - 1 ? 'bg-emerald-500' : 'bg-primary/70',
                )}
                style={{ width: `${(stage.count / peak) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

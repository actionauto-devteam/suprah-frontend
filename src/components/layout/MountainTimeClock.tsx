'use client';

import * as React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MDT_TZ } from '@/lib/timezone';
import { cn } from '@/lib/utils';

type MountainTimeClockProps = {
  className?: string;
  compact?: boolean;
};

export function MountainTimeClock({ className, compact = false }: MountainTimeClockProps) {
  const [now, setNow] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const time = now?.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: MDT_TZ,
  }) ?? '--:--:-- --';
  const mobileTime = now?.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: MDT_TZ,
  }) ?? '--:-- --';

  const date = now?.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: MDT_TZ,
  }) ?? 'Mountain Time';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'inline-flex shrink-0 select-none items-center rounded-full border border-emerald-500/25 bg-emerald-500/8 text-emerald-600 dark:text-emerald-400',
              compact ? 'gap-1.5 px-2 py-1.5' : 'gap-1.5 px-2 py-1.5 sm:gap-2 sm:px-3.5 sm:py-2',
              className,
            )}
            aria-label={`${time} Mountain Time`}
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
            </span>
            <span className={cn('min-w-15 whitespace-nowrap text-center font-mono font-bold tabular-nums sm:min-w-23', compact ? 'text-[10px]' : 'text-[10px] sm:text-xs')}>
              <span className="sm:hidden">{mobileTime}</span>
              <span className="hidden sm:inline">{time}</span>
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">{date} (Mountain Time)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

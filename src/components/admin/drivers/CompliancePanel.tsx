'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ShieldCheck, ChevronRight, RefreshCw } from 'lucide-react';
import { EmptyState } from '@/components/admin/primitives';
import { AdminErrorState } from '@/components/admin/AdminErrorState';
import { cn } from '@/lib/utils';

interface ExpiringItem {
  driverId: string;
  driverName: string;
  kind: string;
  expiresAt: string;
  daysRemaining: number;
  expired: boolean;
}

const WINDOWS = [30, 60, 90] as const;

const fmtDate = (value: string) =>
  new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function CompliancePanel() {
  const { getToken } = useAuth();
  const [days, setDays] = React.useState<number>(30);
  const [search, setSearch] = React.useState('');

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-compliance-expiring', days],
    queryFn: async () => {
      const token = await getToken();
      const res = await apiClient.get(`/api/admin/compliance/expiring?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data?.data as { items: ExpiringItem[]; total: number; expired: number };
    },
  });

  const items = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = data?.items || [];
    return term
      ? list.filter(i => i.driverName.toLowerCase().includes(term) || i.kind.toLowerCase().includes(term))
      : list;
  }, [data, search]);

  if (isError) {
    return (
      <AdminErrorState
        message={error instanceof Error ? error.message : 'Failed to load compliance data.'}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1">
          {WINDOWS.map(w => (
            <button
              key={w}
              type="button"
              onClick={() => setDays(w)}
              className={cn(
                'rounded-md px-2.5 py-1.5 text-sm transition-colors',
                days === w ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:bg-accent/50',
              )}
            >
              Next {w} days
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter by driver or item…"
              className="h-9 pl-8"
            />
          </div>
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn('size-3.5', isFetching && 'animate-spin')} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {data && data.total > 0 && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span><span className="font-medium tabular-nums text-foreground">{data.total}</span> expiring within {days} days</span>
          {data.expired > 0 && (
            <span className="text-red-600 dark:text-red-400">
              <span className="font-medium tabular-nums">{data.expired}</span> already expired
            </span>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3.5">
                <Skeleton className="h-3.5 flex-1" />
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3.5 w-20" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title={search ? 'No matches' : 'Everything current'}
            description={
              search
                ? 'No expiring items match that search.'
                : `No driver credentials or documents expire in the next ${days} days.`
            }
          />
        ) : (
          <div className="divide-y divide-border">
            {items.map((item, i) => (
              <Link
                key={`${item.driverId}-${item.kind}-${i}`}
                href={`/admin/drivers/${item.driverId}`}
                className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40"
              >
                <span
                  className={cn(
                    'size-1.5 shrink-0 rounded-full',
                    item.expired ? 'bg-red-500' : item.daysRemaining <= 7 ? 'bg-amber-500' : 'bg-muted-foreground/40',
                  )}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.driverName}</span>
                <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">{item.kind}</span>
                <span className="hidden w-28 shrink-0 text-right text-xs tabular-nums text-muted-foreground md:block">
                  {fmtDate(item.expiresAt)}
                </span>
                <span
                  className={cn(
                    'w-24 shrink-0 text-right text-xs font-medium tabular-nums',
                    item.expired
                      ? 'text-red-600 dark:text-red-400'
                      : item.daysRemaining <= 7
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-muted-foreground',
                  )}
                >
                  {item.expired ? `${Math.abs(item.daysRemaining)}d overdue` : `${item.daysRemaining}d left`}
                </span>
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

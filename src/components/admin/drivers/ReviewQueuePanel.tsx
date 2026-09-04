'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ClipboardList, UserRoundCheck, X, ChevronRight, AlertTriangle, Inbox, Search, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminErrorState } from '@/components/admin/AdminErrorState';
import { EmptyState } from '@/components/admin/primitives';
import { cn } from '@/lib/utils';

interface ReviewQueueItem {
  id: string;
  entityType: 'driver-request' | 'driver-profile' | 'driver-status-request';
  driverId: string;
  driverName: string;
  submittedAt: string;
  claimedBy: { id: string; name: string } | null;
  claimedAt: string | null;
  priority: 'standard' | 'emergency';
  summary: string;
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'driver-request', label: 'Applications' },
  { id: 'driver-profile', label: 'Verification' },
  { id: 'driver-status-request', label: 'Availability' },
] as const;

const ENTITY_LABEL: Record<ReviewQueueItem['entityType'], string> = {
  'driver-request': 'Application',
  'driver-profile': 'Verification',
  'driver-status-request': 'Availability',
};

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
};

const ageOf = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days >= 1) return { label: `${days}d waiting`, stale: days >= 3 };
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  return { label: hours >= 1 ? `${hours}h waiting` : 'just now', stale: false };
};

export function ReviewQueuePanel() {
  const { getToken, userId } = useAuth();
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');
  const [search, setSearch] = useState('');

  const { data, error, isError, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-review-queue'],
    queryFn: async () => {
      const token = await getToken();
      const res = await apiClient.get('/api/admin/review-queue', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return (res.data?.data?.items || []) as ReviewQueueItem[];
    },
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
  });

  const items = useMemo(() => data || [], [data]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter(item => {
      if (filter !== 'all' && item.entityType !== filter) return false;
      if (!term) return true;
      return item.driverName.toLowerCase().includes(term) || item.summary.toLowerCase().includes(term);
    });
  }, [items, filter, search]);

  const counts = useMemo(() => ({
    all: items.length,
    'driver-request': items.filter(i => i.entityType === 'driver-request').length,
    'driver-profile': items.filter(i => i.entityType === 'driver-profile').length,
    'driver-status-request': items.filter(i => i.entityType === 'driver-status-request').length,
  }), [items]);

  const act = async (item: ReviewQueueItem, action: 'claim' | 'release') => {
    setBusyId(item.id);
    try {
      const token = await getToken();
      await apiClient.post(
        `/api/admin/review-queue/${item.entityType}/${item.id}/${action}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      queryClient.invalidateQueries({ queryKey: ['admin-review-queue'] });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || `Failed to ${action} this item`);
    } finally {
      setBusyId(null);
    }
  };

  if (isError) {
    return (
      <AdminErrorState
        message={error instanceof Error ? error.message : 'The review queue request failed.'}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1">
          {FILTERS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                filter === tab.id
                  ? 'bg-accent font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-accent/50',
              )}
            >
              {tab.label}
              <span className="text-xs tabular-nums text-muted-foreground">{counts[tab.id]}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter by driver…"
              className="h-9 pl-8"
            />
          </div>
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn('size-3.5', isFetching && 'animate-spin')} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={items.length === 0 ? Inbox : Search}
            title={items.length === 0 ? 'Queue is clear' : 'No matches'}
            description={
              items.length === 0
                ? 'Nothing is waiting on a decision right now.'
                : 'Try a different filter or search term.'
            }
          />
        ) : (
          <div className="divide-y divide-border">
            {visible.map(item => {
              const mine = item.claimedBy?.id === userId;
              const takenByOther = Boolean(item.claimedBy) && !mine;
              const age = ageOf(item.submittedAt);

              return (
                <div
                  key={`${item.entityType}-${item.id}`}
                  className="group flex flex-wrap items-center gap-3 p-3 transition-colors hover:bg-accent/40 sm:flex-nowrap sm:px-4"
                >
                  <Avatar className="size-9 shrink-0">
                    <AvatarFallback className="text-[11px] font-medium">
                      {initials(item.driverName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="truncate text-sm font-medium text-foreground">
                        {item.driverName}
                      </span>
                      <span className="rounded border border-border px-1.5 py-px text-[10px] text-muted-foreground">
                        {ENTITY_LABEL[item.entityType]}
                      </span>
                      {item.priority === 'emergency' && (
                        <span className="inline-flex items-center gap-1 rounded border border-red-500/30 bg-red-500/10 px-1.5 py-px text-[10px] font-medium text-red-600 dark:text-red-400">
                          <AlertTriangle className="size-2.5" /> Emergency
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{item.summary}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'hidden w-24 shrink-0 text-right text-xs tabular-nums sm:block',
                        age.stale ? 'font-medium text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
                      )}
                    >
                      {age.label}
                    </span>

                    <div className="w-32 shrink-0 text-right">
                      {item.claimedBy ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <UserRoundCheck className="size-3" />
                          {mine ? 'You' : item.claimedBy.name}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unclaimed</span>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {mine ? (
                        <Button size="sm" variant="ghost" className="h-8" disabled={busyId === item.id} onClick={() => act(item, 'release')}>
                          <X className="size-3.5" /> Release
                        </Button>
                      ) : (
                        <Button
                          size="sm" variant="outline" className="h-8"
                          disabled={busyId === item.id || takenByOther}
                          onClick={() => act(item, 'claim')}
                        >
                          Claim
                        </Button>
                      )}
                      <Button size="sm" className="h-8 gap-1" asChild>
                        <Link href={`/admin/drivers/${item.driverId}`}>
                          Review <ChevronRight className="size-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!isLoading && items.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ClipboardList className="size-3.5" />
          Showing {visible.length} of {items.length} open items · refreshes automatically
        </p>
      )}
    </div>
  );
}

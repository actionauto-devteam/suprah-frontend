'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ClipboardList, UserRoundCheck, X, ChevronRight, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, PageHeaderPill } from '@/components/admin/PageHeader';
import { AdminErrorState } from '@/components/admin/AdminErrorState';
import { ADMIN_PANEL_CLASS } from '@/components/admin/theme';
import { TableLoadingSkeleton } from '@/components/shared/EmptyLoadingState';
import { StatusBadge } from '@/components/shared/StatusBadge';
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

const ENTITY_LABEL: Record<ReviewQueueItem['entityType'], string> = {
  'driver-request': 'Application',
  'driver-profile': 'Verification',
  'driver-status-request': 'Availability Change',
};

export default function AdminReviewQueuePage() {
  const { getToken, userId } = useAuth();
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, error, isError, isLoading, refetch } = useQuery({
    queryKey: ['admin-review-queue'],
    queryFn: async () => {
      const token = await getToken();
      const res = await apiClient.get('/api/admin/review-queue', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return (res.data?.data?.items || []) as ReviewQueueItem[];
    },
    // Push satisfies "visible on refresh" without new socket infra for v1 —
    // see admin/review-queue backend notes on the claim-changed socket event
    // as a fast-follow.
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
  });

  const claim = async (item: ReviewQueueItem) => {
    setBusyId(item.id);
    try {
      const token = await getToken();
      await apiClient.post(
        `/api/admin/review-queue/${item.entityType}/${item.id}/claim`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      queryClient.invalidateQueries({ queryKey: ['admin-review-queue'] });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || 'Failed to claim this item');
    } finally {
      setBusyId(null);
    }
  };

  const release = async (item: ReviewQueueItem) => {
    setBusyId(item.id);
    try {
      const token = await getToken();
      await apiClient.post(
        `/api/admin/review-queue/${item.entityType}/${item.id}/release`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      queryClient.invalidateQueries({ queryKey: ['admin-review-queue'] });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || 'Failed to release this item');
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 container mx-auto">
        <TableLoadingSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 container mx-auto">
        <PageHeader eyebrow="Platform" title="Review" accent="Queue" />
        <AdminErrorState
          message={error instanceof Error ? error.message : 'The review queue request failed. Please try again.'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const items = data || [];

  return (
    <div className="space-y-6 container mx-auto">
      <PageHeader
        eyebrow="Platform"
        title="Review"
        accent="Queue"
        meta={<PageHeaderPill><ClipboardList className="h-3 w-3" /> {items.length} awaiting review</PageHeaderPill>}
      />

      <Card className={cn(ADMIN_PANEL_CLASS, 'overflow-hidden py-0')}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Claim</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Nothing awaiting review right now.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => {
                  const isMine = item.claimedBy?.id === userId;
                  const isClaimedByOther = Boolean(item.claimedBy) && !isMine;
                  return (
                    <TableRow key={`${item.entityType}-${item.id}`} className="group hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{item.driverName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] font-semibold">{ENTITY_LABEL[item.entityType]}</Badge>
                        {item.priority === 'emergency' && (
                          <Badge variant="outline" className="ml-1.5 gap-1 text-[10px] border-red-200 bg-red-500/10 text-red-600 dark:border-red-500/30 dark:text-red-400">
                            <AlertTriangle className="size-2.5" /> Emergency
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.summary}</TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {new Date(item.submittedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {item.claimedBy ? (
                          <Badge variant="outline" className="gap-1 text-[10px] font-semibold">
                            <UserRoundCheck className="size-2.5" /> {isMine ? 'You' : item.claimedBy.name}
                          </Badge>
                        ) : (
                          <StatusBadge status="pending" domain="documentReview" className="text-[10px]" />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isMine ? (
                            <Button size="sm" variant="outline" className="gap-1.5" disabled={busyId === item.id} onClick={() => release(item)}>
                              <X className="size-3.5" /> Release
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" className="gap-1.5" disabled={busyId === item.id || isClaimedByOther} onClick={() => claim(item)}>
                              <UserRoundCheck className="size-3.5" /> Claim
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" asChild className="gap-1">
                            <Link href={`/admin/drivers/${item.driverId}`}>
                              Open <ChevronRight className="size-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

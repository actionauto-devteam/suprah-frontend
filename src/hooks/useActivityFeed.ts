"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

export type ActivityEventType =
  | 'online' | 'offline' | 'away' | 'busy' | 'idle' | 'do_not_disturb'
  | 'break_start' | 'break_end' | 'custom_status'
  | 'geofence_enter' | 'geofence_exit'
  | 'sos_triggered' | 'sos_resolved'
  | 'driving_session_start' | 'driving_session_end'
  | 'possible_incident'
  | 'location_sharing_started' | 'location_sharing_paused' | 'location_sharing_resumed' | 'location_sharing_stopped';

export interface ActivityEvent {
  _id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  type: ActivityEventType;
  description: string;
  meta?: Record<string, any>;
  createdAt: string;
}

const FEED_PAGE_SIZE = 80;

/**
 * Paginated so a busy org (many people changing status at once) doesn't quietly evict
 * your own older events off the end of a single fixed-size fetch — "Load older" walks
 * back further using the backend's existing `before` cursor, which used to sit unused.
 */
export function useActivityFeed() {
  const { isSignedIn, getToken } = useAuth();
  return useInfiniteQuery<ActivityEvent[]>({
    queryKey: ['team-activity-feed'],
    queryFn: async ({ pageParam }) => {
      const token = await getToken();
      const res = await apiClient.get('/api/team-pulse/activity-feed', {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: FEED_PAGE_SIZE, before: pageParam || undefined },
      });
      return res.data.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.length === FEED_PAGE_SIZE ? lastPage[lastPage.length - 1].createdAt : undefined,
    enabled: !!isSignedIn,
    refetchInterval: 60_000,
    staleTime: 15_000,
  });
}

export function useStartBreak() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const res = await apiClient.post('/api/team-pulse/break/start', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-pulse-members'] });
      toast.success('Break started — enjoy your rest!');
    },
    onError: () => toast.error('Could not start break'),
  });
}

export function useEndBreak() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const res = await apiClient.post('/api/team-pulse/break/end', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['team-pulse-members'] });
      const min = data?.durationMin ?? 0;
      toast.success(`Welcome back! Break was ${min}m`);
    },
    onError: () => toast.error('Could not end break'),
  });
}

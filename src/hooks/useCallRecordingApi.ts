"use client";

import { useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/providers/AuthProvider';

export type RecordingPermission = 'view' | 'download' | 'share' | 'review' | 'control' | 'delete';
export type Recording = { _id: string; callLogId: string; direction: string; state: string; manualPaused: boolean; incomplete: boolean; error?: string; startedAt?: string; endedAt?: string; expiresAt?: string; reviewedAt?: string; reviewedByName?: string; files: { _id: string; bytes: number; startedAt: string; endedAt: string }[] };
export type RecordingListItem = { _id: string; callLogId: string; leadId: string | null; customerName: string; customerPhone: string; repId: string; repName: string; direction: string; line: string; durationSec: number | null; startedAt: string; endedAt?: string; state: string; incomplete: boolean; reviewedAt: string | null; reviewedByName: string };
export type RecordingList = { items: RecordingListItem[]; total: number; page: number; pageSize: number; reps: { id: string; name: string }[] };
export type RecordingAccess = { permissions: RecordingPermission[]; admin: boolean };
export function recordingError(error: unknown) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Recording request failed';
}
export function useCallRecordingApi() {
  const { getToken, orgId, userId } = useAuth();
  let authKey = userId || 'none';
  if (typeof window !== 'undefined') {
    try { const token = localStorage.getItem('crm_token'); if (token) authKey = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).id || authKey; } catch { authKey = userId || 'none'; }
  }
  const request = useCallback(async <T,>(method: 'get' | 'post' | 'put' | 'delete', path: string, body?: unknown): Promise<T> => {
    const token = localStorage.getItem('crm_token') || await getToken();
    const config = { headers: { Authorization: `Bearer ${token}` }, withCredentials: true };
    const url = `/api/crm/communications${path}`;
    const response = method === 'get' || method === 'delete' ? await apiClient[method](url, config) : await apiClient[method](url, body, config);
    return response.data.data as T;
  }, [getToken]);
  const mediaUrl = useCallback((path: string) => new URL(path, process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').toString(), []);
  return { request, mediaUrl, orgId, authKey };
}

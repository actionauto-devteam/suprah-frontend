"use client";

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { initializeSocket, getSocket } from '@/lib/socket.client';
import { useAuth } from '@/providers/AuthProvider';
import type { ActiveEmployeeLocation, SharingState } from './useLocator';

export function useLocatorSocket() {
    const { getToken, isSignedIn } = useAuth();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!isSignedIn) return;

        let cleanup = false;

        const setup = async () => {
            const token = await getToken();
            if (!token || cleanup) return;

            const socket = initializeSocket(token);

            socket.on('locator:location_update', (data: Partial<ActiveEmployeeLocation> & { userId: string }) => {
                const prev = queryClient.getQueryData<ActiveEmployeeLocation[]>(['locator-active']);
                const idx = prev?.findIndex((l) => l.userId === data.userId) ?? -1;
                if (idx === -1) {
                    // Someone sharing for the first time isn't in the cached list yet (no prior
                    // EmployeeLocation doc) — refetch instead of silently dropping the update, so
                    // they appear on the map right away instead of waiting for the next 15s poll.
                    queryClient.invalidateQueries({ queryKey: ['locator-active'] });
                    return;
                }
                queryClient.setQueryData<ActiveEmployeeLocation[]>(['locator-active'], (list) => {
                    if (!list) return list;
                    const updated = [...list];
                    updated[idx] = { ...updated[idx], ...data };
                    return updated;
                });
            });

            socket.on('locator:sharing_state_changed', (data: { userId: string; sharingState: SharingState }) => {
                queryClient.setQueryData<ActiveEmployeeLocation[]>(['locator-active'], (prev) => {
                    if (!prev) return prev;
                    return prev.map((l) => (l.userId === data.userId ? { ...l, sharingState: data.sharingState } : l));
                });
                queryClient.invalidateQueries({ queryKey: ['locator-my-status'] });
            });

            socket.on('team-pulse:member_updated', () => {
                queryClient.invalidateQueries({ queryKey: ['team-pulse-members'] });
                queryClient.invalidateQueries({ queryKey: ['locator-active'] });
            });

            socket.on('locator:place_created', () => queryClient.invalidateQueries({ queryKey: ['locator-places'] }));
            socket.on('locator:place_updated', () => queryClient.invalidateQueries({ queryKey: ['locator-places'] }));
            socket.on('locator:place_deleted', () => queryClient.invalidateQueries({ queryKey: ['locator-places'] }));

            // Also refresh the live locations list so the map/roster's "Driving now" badge
            // appears/disappears promptly instead of waiting for the next 15s poll.
            socket.on('locator:driving_session_start', () => {
                queryClient.invalidateQueries({ queryKey: ['locator-driving-sessions'] });
                queryClient.invalidateQueries({ queryKey: ['locator-active'] });
            });
            socket.on('locator:driving_session_end', () => {
                queryClient.invalidateQueries({ queryKey: ['locator-driving-sessions'] });
                queryClient.invalidateQueries({ queryKey: ['locator-active'] });
            });

            socket.on('locator:possible_incident', (data: { userName: string }) => {
                queryClient.invalidateQueries({ queryKey: ['locator-driving-sessions'] });
                toast.error(`⚠️ Possible incident — ${data.userName}`, {
                    description: 'Detected during a test drive. Check the Driving tab in Locator.',
                    duration: 10000,
                });
            });

            socket.on('locator:incident_resolved', (data: { confirmed: boolean }) => {
                queryClient.invalidateQueries({ queryKey: ['locator-driving-sessions'] });
                if (data.confirmed) {
                    toast.error('🚨 Incident confirmed by driver', { duration: 8000 });
                }
            });

            socket.on('locator:sos_triggered', (data: { userName: string }) => {
                queryClient.invalidateQueries({ queryKey: ['locator-sos-active'] });
                toast.error(`🆘 SOS from ${data.userName}`, { duration: 15000, description: 'Check the Live Map immediately.' });
            });

            socket.on('locator:sos_resolved', () => {
                queryClient.invalidateQueries({ queryKey: ['locator-sos-active'] });
            });
        };

        setup();

        return () => {
            cleanup = true;
            const socket = getSocket();
            if (socket) {
                socket.off('locator:location_update');
                socket.off('locator:sharing_state_changed');
                socket.off('team-pulse:member_updated');
                socket.off('locator:place_created');
                socket.off('locator:place_updated');
                socket.off('locator:place_deleted');
                socket.off('locator:driving_session_start');
                socket.off('locator:driving_session_end');
                socket.off('locator:possible_incident');
                socket.off('locator:incident_resolved');
                socket.off('locator:sos_triggered');
                socket.off('locator:sos_resolved');
            }
        };
    }, [isSignedIn, getToken, queryClient]);
}

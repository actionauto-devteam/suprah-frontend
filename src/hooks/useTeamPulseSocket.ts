"use client";

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { initializeSocket, getSocket } from '@/lib/socket.client';
import { useAuth } from '@/providers/AuthProvider';
import type { ActivityEvent } from './useActivityFeed';

export function useTeamPulseSocket() {
    const { getToken, isSignedIn } = useAuth();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!isSignedIn) return;

        let cleanup = false;

        const setup = async () => {
            const token = await getToken();
            if (!token || cleanup) return;

            const socket = initializeSocket(token);

            socket.on('board:new_note', (data: { _id: string; title?: string; content: string; announcementType: string; userName: string }) => {
                queryClient.invalidateQueries({ queryKey: ['team-pulse-board'] });

                const preview = data.title || data.content.slice(0, 60);
                if (data.announcementType === 'urgent') {
                    toast.error(`🚨 ${data.userName}: ${preview}`, { duration: 8000, description: 'Urgent board note' });
                } else if (data.announcementType === 'important') {
                    toast.warning(`⚠️ ${data.userName}: ${preview}`, { duration: 6000, description: 'Important board note' });
                } else {
                    toast(`📌 ${data.userName} posted a note`, { description: preview, duration: 4000 });
                }
            });

            socket.on('board:acked', () => {
                queryClient.invalidateQueries({ queryKey: ['team-pulse-board'] });
            });

            socket.on('board:reaction_added', (data: { noteId: string }) => {
                queryClient.invalidateQueries({ queryKey: ['board-note-reactions', data.noteId] });
            });

            socket.on('board:reaction_removed', (data: { noteId: string }) => {
                queryClient.invalidateQueries({ queryKey: ['board-note-reactions', data.noteId] });
            });

            socket.on('absence:approved', () => {
                queryClient.invalidateQueries({ queryKey: ['team-pulse-absences'] });
                toast.success('Your absence request was approved ✓', { duration: 5000 });
            });

            socket.on('absence:rejected', () => {
                queryClient.invalidateQueries({ queryKey: ['team-pulse-absences'] });
                toast.error('Your absence request was not approved', { duration: 5000 });
            });

            socket.on('absence:status_changed', () => {
                queryClient.invalidateQueries({ queryKey: ['team-pulse-absences'] });
            });

            socket.on('deal:created', () => queryClient.invalidateQueries({ queryKey: ['team-deals'] }));
            socket.on('deal:updated', () => queryClient.invalidateQueries({ queryKey: ['team-deals'] }));
            socket.on('deal:moved',   () => queryClient.invalidateQueries({ queryKey: ['team-deals'] }));
            socket.on('deal:deleted', () => queryClient.invalidateQueries({ queryKey: ['team-deals'] }));

            socket.on('shift:created', () => queryClient.invalidateQueries({ queryKey: ['team-shifts'] }));
            socket.on('shift:updated', () => queryClient.invalidateQueries({ queryKey: ['team-shifts'] }));
            socket.on('shift:deleted', () => queryClient.invalidateQueries({ queryKey: ['team-shifts'] }));

            socket.on('activity:new', (event: ActivityEvent) => {
                queryClient.setQueryData<ActivityEvent[]>(['team-activity-feed'], (prev) =>
                    prev ? [event, ...prev].slice(0, 150) : [event]
                );
            });
        };

        setup();

        return () => {
            cleanup = true;
            const socket = getSocket();
            if (socket) {
                socket.off('board:new_note');
                socket.off('board:acked');
                socket.off('board:reaction_added');
                socket.off('board:reaction_removed');
                socket.off('absence:approved');
                socket.off('absence:rejected');
                socket.off('absence:status_changed');
                socket.off('deal:created');
                socket.off('deal:updated');
                socket.off('deal:moved');
                socket.off('deal:deleted');
                socket.off('shift:created');
                socket.off('shift:updated');
                socket.off('shift:deleted');
                socket.off('activity:new');
            }
        };
    }, [isSignedIn, getToken, queryClient]);
}

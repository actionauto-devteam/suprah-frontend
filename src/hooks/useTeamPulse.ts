import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api-client';
import { useCallback, useMemo } from 'react';

export type OnlineStatus = 'online' | 'idle' | 'away' | 'busy' | 'offline' | 'do_not_disturb';
export type AbsenceType = 'absence' | 'day_off' | 'vacation' | 'sick' | 'other';
export type NoteColor =
  | 'yellow' | 'blue' | 'green' | 'pink' | 'purple' | 'orange'
  | 'red' | 'teal' | 'indigo' | 'lime' | 'rose' | 'sky';
export type AnnouncementType = 'general' | 'important' | 'urgent' | 'reminder' | 'event';

export interface TeamMember {
    _id: string;
    name: string;
    avatar?: string;
    onlineStatus: OnlineStatus;
    customStatus?: string;
    lastActive?: string;
    role: string;
    personalInfo?: {
        jobTitle?: string;
        department?: string;
        bio?: string;
        phone?: string;
        location?: string;
    };
}

export interface Absence {
    _id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    date: string;
    type: AbsenceType;
    title?: string;
    note?: string;
    otherText?: string;
}

export interface BoardNote {
    _id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    title?: string;
    content: string;
    color: NoteColor;
    pinned: boolean;
    announcementType: AnnouncementType;
    emoji?: string;
    durationDays?: number | null;
    expiresAt?: string | null;
    sortOrder?: number;
    createdAt: string;
    updatedAt: string;
}

function useAuthHeaders() {
    const { getToken } = useAuth();
    return useCallback(async () => {
        const token = await getToken();
        return { headers: { Authorization: `Bearer ${token}` } };
    }, [getToken]);
}

// ── Members ───────────────────────────────────────────────────────────────────

export function useTeamMembers() {
    const { isLoaded, isSignedIn } = useAuth();
    const getHeaders = useAuthHeaders();

    return useQuery<TeamMember[]>({
        queryKey: ['team-pulse-members'],
        queryFn: async () => {
            const headers = await getHeaders();
            const response = await apiClient.getTeamMembers(headers);
            return response.data?.data || response.data || [];
        },
        enabled: !!isLoaded && !!isSignedIn,
        refetchInterval: 30_000,   // live: every 30s
        staleTime: 10_000,
    });
}

// ── Absences ──────────────────────────────────────────────────────────────────

export function useTeamAbsences(year: number, month: number) {
    const { isLoaded, isSignedIn } = useAuth();
    const getHeaders = useAuthHeaders();

    return useQuery<Absence[]>({
        queryKey: ['team-pulse-absences', year, month],
        queryFn: async () => {
            const headers = await getHeaders();
            const response = await apiClient.getTeamAbsences({ year, month }, headers);
            return response.data?.data || response.data || [];
        },
        enabled: !!isLoaded && !!isSignedIn,
        refetchInterval: 30_000,  // live: every 30s
        staleTime: 15_000,
    });
}

export function useCreateAbsence() {
    const queryClient = useQueryClient();
    const getHeaders = useAuthHeaders();

    return useMutation({
        mutationFn: async (data: { date: string; type: AbsenceType; title?: string; note?: string; otherText?: string }) => {
            const headers = await getHeaders();
            const response = await apiClient.createAbsence(data, headers);
            return response.data?.data || response.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-pulse-absences'] }),
    });
}

export function useUpdateAbsence() {
    const queryClient = useQueryClient();
    const getHeaders = useAuthHeaders();

    return useMutation({
        mutationFn: async ({ id, ...data }: { id: string; title?: string; note?: string; otherText?: string }) => {
            const headers = await getHeaders();
            const response = await apiClient.updateAbsence(id, data, headers);
            return response.data?.data || response.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-pulse-absences'] }),
    });
}

export function useDeleteAbsence() {
    const queryClient = useQueryClient();
    const getHeaders = useAuthHeaders();

    return useMutation({
        mutationFn: async (id: string) => {
            const headers = await getHeaders();
            await apiClient.deleteAbsence(id, headers);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-pulse-absences'] }),
    });
}

// ── Board Notes ───────────────────────────────────────────────────────────────

export function useBoardNotes() {
    const { isLoaded, isSignedIn } = useAuth();
    const getHeaders = useAuthHeaders();

    return useQuery<BoardNote[]>({
        queryKey: ['team-pulse-board'],
        queryFn: async () => {
            const headers = await getHeaders();
            const response = await apiClient.getBoardNotes(headers);
            return response.data?.data || response.data || [];
        },
        enabled: !!isLoaded && !!isSignedIn,
        refetchInterval: 20_000,  // live: every 20s
        staleTime: 10_000,
    });
}

export function useCreateBoardNote() {
    const queryClient = useQueryClient();
    const getHeaders = useAuthHeaders();

    return useMutation({
        mutationFn: async (data: {
            content: string; color?: NoteColor; title?: string;
            durationDays?: number | null; announcementType?: AnnouncementType; emoji?: string;
        }) => {
            const headers = await getHeaders();
            const response = await apiClient.createBoardNote(data, headers);
            return response.data?.data || response.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-pulse-board'] }),
    });
}

export function useUpdateBoardNote() {
    const queryClient = useQueryClient();
    const getHeaders = useAuthHeaders();

    return useMutation({
        mutationFn: async ({ id, ...data }: { id: string; title?: string; content?: string; color?: NoteColor; emoji?: string }) => {
            const headers = await getHeaders();
            const response = await apiClient.updateBoardNote(id, data, headers);
            return response.data?.data || response.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-pulse-board'] }),
    });
}

export function useDeleteBoardNote() {
    const queryClient = useQueryClient();
    const getHeaders = useAuthHeaders();

    return useMutation({
        mutationFn: async (id: string) => {
            const headers = await getHeaders();
            await apiClient.deleteBoardNote(id, headers);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-pulse-board'] }),
    });
}

export function useTogglePinNote() {
    const queryClient = useQueryClient();
    const getHeaders = useAuthHeaders();

    return useMutation({
        mutationFn: async (id: string) => {
            const headers = await getHeaders();
            const response = await apiClient.togglePinBoardNote(id, headers);
            return response.data?.data || response.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-pulse-board'] }),
    });
}

export function useReorderBoardNotes() {
    const queryClient = useQueryClient();
    const getHeaders = useAuthHeaders();

    return useMutation({
        mutationFn: async (orderedIds: string[]) => {
            const headers = await getHeaders();
            await apiClient.reorderBoardNotes(orderedIds, headers);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-pulse-board'] }),
    });
}

// ── My status ─────────────────────────────────────────────────────────────────

export function useUpdateMyStatus() {
    const queryClient = useQueryClient();
    const getHeaders = useAuthHeaders();

    return useMutation({
        mutationFn: async (data: { status: OnlineStatus; customStatus?: string }) => {
            const headers = await getHeaders();
            const response = await apiClient.updateOnlineStatus(data, headers);
            return response.data?.data || response.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-pulse-members'] }),
    });
}

// ── Member profile (click-through) ────────────────────────────────────────────

export function useCurrentMember(fullName: string | undefined | null) {
    const { data: members = [] } = useTeamMembers();
    return useMemo(() => {
        if (!fullName) return undefined;
        return members.find((m) => m.name.toLowerCase() === fullName.toLowerCase());
    }, [members, fullName]);
}

export function useTeamMemberProfile(userId: string | null) {
    const { isLoaded, isSignedIn, getToken } = useAuth();
    const getHeaders = useAuthHeaders();

    return useQuery({
        queryKey: ['team-member-profile', userId],
        queryFn: async () => {
            const headers = await getHeaders();
            const response = await apiClient.getTeamMemberProfile(userId!, headers);
            return response.data?.data || response.data;
        },
        enabled: !!isLoaded && !!isSignedIn && !!userId,
        staleTime: 60_000,
    });
}

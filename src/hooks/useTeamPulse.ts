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
    profileImage: string | Blob | undefined;
    _id: string;
    name: string;
    avatar?: string;
    onlineStatus: OnlineStatus;
    customStatus?: string;
    lastActive?: string;
    lastDeviceType?: 'mobile' | 'desktop';
    role: string;
    personalInfo?: {
        jobTitle?: string;
        department?: string;
        bio?: string;
        phone?: string;
        location?: string;
    };
    breakStatus?: {
        isOnBreak: boolean;
        startedAt?: string;
    };
    statusExpiresAt?: string | null;
    employmentLocationType?: 'onsite' | 'remote';
    locationConsent?: {
        granted: boolean;
        grantedAt?: string;
        deviceHint?: string;
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
    status?: 'pending' | 'approved' | 'rejected';
    approvedBy?: string | null;
    approvedAt?: string | null;
    rejectedReason?: string | null;
    proofAttachments?: { url: string; originalName: string; mimeType: string; size: number }[];
}

export interface BoardNoteAttachment {
    url: string;
    fileKey?: string;
    originalName: string;
    mimeType: string;
    size: number;
}

export interface BoardNoteReaction {
    _id: string;
    userId: string;
    authorName: string;
    reaction: string;
}

export type DealStage = 'lead' | 'contacted' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';

export interface Deal {
    _id: string;
    title: string;
    company?: string;
    contactName?: string;
    value?: number | null;
    currency: string;
    stage: DealStage;
    probability?: number | null;
    assignedTo?: string | null;
    assignedName?: string | null;
    assignedAvatar?: string | null;
    expectedCloseDate?: string | null;
    note?: string;
    tags: string[];
    sortOrder: number;
    createdBy: string;
    createdByName: string;
    createdAt: string;
    updatedAt: string;
}

export interface Shift {
    _id: string;
    userId: string;
    userName: string;
    userAvatar?: string | null;
    date: string;
    startTime: string;
    endTime: string;
    shiftType: 'morning' | 'afternoon' | 'evening' | 'night' | 'custom';
    role?: string;
    location?: string;
    note?: string;
    createdAt: string;
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
    postedAt?: string | null;
    attachments?: BoardNoteAttachment[];
    requiresAck: boolean;
    ackedBy?: string[];
    ackedByDetails?: { name: string; avatar?: string }[];
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
        mutationFn: async (data: { date: string; endDate?: string; type: AbsenceType; title?: string; note?: string; otherText?: string }) => {
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
            durationDays?: number | null; announcementType?: AnnouncementType; emoji?: string; requiresAck?: boolean;
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
        mutationFn: async ({ id, ...data }: { id: string; title?: string; content?: string; color?: NoteColor; emoji?: string; postedAt?: string }) => {
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
        mutationFn: async (data: { status: OnlineStatus; customStatus?: string; expiresIn?: number | null }) => {
            const headers = await getHeaders();
            const response = await apiClient.updateOnlineStatus(data, headers);
            return response.data?.data || response.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-pulse-members'] }),
    });
}

// ── Member profile (click-through) ────────────────────────────────────────────

export function useCurrentMember(userId: string | undefined | null) {
    const { data: members = [] } = useTeamMembers();
    return useMemo(() => {
        if (!userId) return undefined;
        return members.find((m) => m._id === userId);
    }, [members, userId]);
}

export function useTeamMemberProfile(userId: string | null) {
    const { isLoaded, isSignedIn } = useAuth();
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

// ── Board Note Ack ────────────────────────────────────────────────────────────

export function useAckBoardNote() {
    const queryClient = useQueryClient();
    const getHeaders = useAuthHeaders();

    return useMutation({
        mutationFn: async (id: string) => {
            const headers = await getHeaders();
            const response = await apiClient.ackBoardNote(id, headers);
            return response.data?.data || response.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-pulse-board'] }),
    });
}

// ── Board Note Reactions ──────────────────────────────────────────────────────

export function useBoardNoteReactions(noteId: string | null) {
    const { isLoaded, isSignedIn } = useAuth();
    const getHeaders = useAuthHeaders();

    return useQuery<BoardNoteReaction[]>({
        queryKey: ['board-note-reactions', noteId],
        queryFn: async () => {
            const headers = await getHeaders();
            const response = await apiClient.getBoardNoteReactions(noteId!, headers);
            return response.data?.data || response.data || [];
        },
        enabled: !!isLoaded && !!isSignedIn && !!noteId,
        staleTime: 10_000,
    });
}

export function useToggleBoardNoteReaction() {
    const queryClient = useQueryClient();
    const getHeaders = useAuthHeaders();

    return useMutation({
        mutationFn: async ({ noteId, reaction }: { noteId: string; reaction: string }) => {
            const headers = await getHeaders();
            const response = await apiClient.toggleBoardNoteReaction(noteId, reaction, headers);
            return response.data?.data || response.data;
        },
        onSuccess: (_data, { noteId }) => {
            queryClient.invalidateQueries({ queryKey: ['board-note-reactions', noteId] });
        },
    });
}

// ── Board Note Attachments ────────────────────────────────────────────────────

export function useUploadBoardNoteAttachments() {
    const queryClient = useQueryClient();
    const getHeaders = useAuthHeaders();

    return useMutation({
        mutationFn: async ({ id, files }: { id: string; files: File[] }) => {
            const headers = await getHeaders();
            const formData = new FormData();
            files.forEach(f => formData.append('images', f));
            const response = await apiClient.uploadBoardNoteAttachments(id, formData, headers);
            return response.data?.data || response.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-pulse-board'] }),
    });
}

// ── Absence Approval ──────────────────────────────────────────────────────────

export function usePendingAbsences() {
    const { isLoaded, isSignedIn } = useAuth();
    const getHeaders = useAuthHeaders();

    return useQuery<Absence[]>({
        queryKey: ['team-pulse-absences-pending'],
        queryFn: async () => {
            const headers = await getHeaders();
            const response = await apiClient.getTeamAbsences({ status: 'pending' } as any, headers);
            return response.data?.data || response.data || [];
        },
        enabled: !!isLoaded && !!isSignedIn,
        refetchInterval: 30_000,
        staleTime: 15_000,
    });
}

export function useApproveAbsence() {
    const queryClient = useQueryClient();
    const getHeaders = useAuthHeaders();

    return useMutation({
        mutationFn: async (id: string) => {
            const headers = await getHeaders();
            const response = await apiClient.approveAbsence(id, headers);
            return response.data?.data || response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['team-pulse-absences'] });
            queryClient.invalidateQueries({ queryKey: ['team-pulse-absences-pending'] });
        },
    });
}

export function useRejectAbsence() {
    const queryClient = useQueryClient();
    const getHeaders = useAuthHeaders();

    return useMutation({
        mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
            const headers = await getHeaders();
            const response = await apiClient.rejectAbsence(id, { reason }, headers);
            return response.data?.data || response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['team-pulse-absences'] });
            queryClient.invalidateQueries({ queryKey: ['team-pulse-absences-pending'] });
        },
    });
}

export function useUploadAbsenceProof() {
    const queryClient = useQueryClient();
    const getHeaders = useAuthHeaders();

    return useMutation({
        mutationFn: async ({ id, files }: { id: string; files: File[] }) => {
            const headers = await getHeaders();
            const formData = new FormData();
            files.forEach(f => formData.append('files', f));
            const response = await apiClient.uploadAbsenceProof(id, formData, headers);
            return response.data?.data || response.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-pulse-absences'] }),
    });
}

// ── Ping ──────────────────────────────────────────────────────────────────────

export function usePingMember() {
    const getHeaders = useAuthHeaders();

    return useMutation({
        mutationFn: async ({ userId, message }: { userId: string; message?: string }) => {
            const headers = await getHeaders();
            const response = await apiClient.pingMember(userId, message, headers);
            return response.data?.data || response.data;
        },
    });
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export function useTeamLeaderboard(period: 'today' | 'week' | 'month') {
    const { isLoaded, isSignedIn } = useAuth();
    const getHeaders = useAuthHeaders();

    return useQuery({
        queryKey: ['team-leaderboard', period],
        queryFn: async () => {
            const headers = await getHeaders();
            const response = await apiClient.getTeamLeaderboard(period, headers);
            return response.data?.data || response.data || [];
        },
        enabled: !!isLoaded && !!isSignedIn,
        staleTime: 60_000,
    });
}

// ── Deals ─────────────────────────────────────────────────────────────────────

export function useDeals() {
    const { isLoaded, isSignedIn } = useAuth();
    const getHeaders = useAuthHeaders();

    return useQuery<Deal[]>({
        queryKey: ['team-deals'],
        queryFn: async () => {
            const headers = await getHeaders();
            const response = await apiClient.getDeals(headers);
            return response.data?.data || response.data || [];
        },
        enabled: !!isLoaded && !!isSignedIn,
        refetchInterval: 30_000,
        staleTime: 15_000,
    });
}

export function useCreateDeal() {
    const queryClient = useQueryClient();
    const getHeaders = useAuthHeaders();

    return useMutation({
        mutationFn: async (data: Partial<Deal>) => {
            const headers = await getHeaders();
            const response = await apiClient.createDeal(data as Record<string, any>, headers);
            return response.data?.data || response.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-deals'] }),
    });
}

export function useUpdateDeal() {
    const queryClient = useQueryClient();
    const getHeaders = useAuthHeaders();

    return useMutation({
        mutationFn: async ({ id, ...data }: { id: string } & Partial<Deal>) => {
            const headers = await getHeaders();
            const response = await apiClient.updateDeal(id, data as Record<string, any>, headers);
            return response.data?.data || response.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-deals'] }),
    });
}

export function useMoveDeal() {
    const queryClient = useQueryClient();
    const getHeaders = useAuthHeaders();

    return useMutation({
        mutationFn: async ({ id, stage, sortOrder }: { id: string; stage: DealStage; sortOrder?: number }) => {
            const headers = await getHeaders();
            const response = await apiClient.moveDeal(id, { stage, sortOrder }, headers);
            return response.data?.data || response.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-deals'] }),
    });
}

export function useDeleteDeal() {
    const queryClient = useQueryClient();
    const getHeaders = useAuthHeaders();

    return useMutation({
        mutationFn: async (id: string) => {
            const headers = await getHeaders();
            await apiClient.deleteDeal(id, headers);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-deals'] }),
    });
}

// ── Shifts / Schedules ────────────────────────────────────────────────────────

export function useShifts(params: { year?: number; month?: number; week?: string }) {
    const { isLoaded, isSignedIn } = useAuth();
    const getHeaders = useAuthHeaders();
    const key = params.week || `${params.year}-${params.month}`;

    return useQuery<Shift[]>({
        queryKey: ['team-shifts', key],
        queryFn: async () => {
            const headers = await getHeaders();
            const response = await apiClient.getShifts(params, headers);
            return response.data?.data || response.data || [];
        },
        enabled: !!isLoaded && !!isSignedIn,
        staleTime: 20_000,
    });
}

export function useCreateShift() {
    const queryClient = useQueryClient();
    const getHeaders = useAuthHeaders();

    return useMutation({
        mutationFn: async (data: Partial<Shift> & { date: string; startTime: string; endTime: string }) => {
            const headers = await getHeaders();
            const response = await apiClient.createShift(data as Record<string, any>, headers);
            return response.data?.data || response.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-shifts'] }),
    });
}

export function useUpdateShift() {
    const queryClient = useQueryClient();
    const getHeaders = useAuthHeaders();

    return useMutation({
        mutationFn: async ({ id, ...data }: { id: string } & Partial<Shift>) => {
            const headers = await getHeaders();
            const response = await apiClient.updateShift(id, data as Record<string, any>, headers);
            return response.data?.data || response.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-shifts'] }),
    });
}

export function useDeleteShift() {
    const queryClient = useQueryClient();
    const getHeaders = useAuthHeaders();

    return useMutation({
        mutationFn: async (id: string) => {
            const headers = await getHeaders();
            await apiClient.deleteShift(id, headers);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-shifts'] }),
    });
}

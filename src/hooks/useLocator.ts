"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api-client';
import { withMinDuration } from '@/lib/utils';
import { useCallback } from 'react';

export type SharingState =
    | 'sharing' | 'paused_break' | 'paused_manual' | 'declined_permission' | 'off_duty';

export interface MyLocatorStatus {
    employmentLocationType: 'onsite' | 'remote';
    locationConsent: { granted: boolean; grantedAt?: string; deviceHint?: string };
    sharingState: SharingState;
    coords: { lat: number; lng: number } | null;
    lastSeenAt: string | null;
}

export interface Place {
    _id: string;
    organizationId: string;
    name: string;
    coords: { lat: number; lng: number };
    radiusM: number;
    icon?: string;
    color?: string;
    address?: string;
    isActive: boolean;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface ActiveEmployeeLocation {
    userId: string;
    userName: string;
    userAvatar?: string;
    jobTitle?: string;
    department?: string;
    employmentLocationType?: 'onsite' | 'remote';
    coords: { lat: number; lng: number };
    heading?: number;
    speedMph?: number;
    accuracyM?: number;
    sharingState: SharingState;
    batteryLevel?: number;
    isCharging?: boolean;
    connectivity: 'online' | 'offline';
    deviceType?: 'mobile' | 'desktop';
    connectionType?: string;
    effectiveType?: string;
    downlinkMbps?: number;
    currentPlaceId?: string;
    drivingSessionId?: string;
    lastSeenAt: string;
    sharingSince?: string;
    stationarySince?: string;
}

function useAuthHeaders() {
    const { getToken } = useAuth();
    return useCallback(async () => {
        const token = await getToken();
        return { headers: { Authorization: `Bearer ${token}` } };
    }, [getToken]);
}

export function useMyLocatorStatus() {
    const { isLoaded, isSignedIn } = useAuth();
    const getHeaders = useAuthHeaders();

    return useQuery<MyLocatorStatus>({
        queryKey: ['locator-my-status'],
        queryFn: async () => {
            const headers = await getHeaders();
            const response = await apiClient.getMyLocatorStatus(headers);
            return response.data?.data || response.data;
        },
        enabled: !!isLoaded && !!isSignedIn,
        staleTime: 30_000,
    });
}

export function useSetLocationConsent() {
    const queryClient = useQueryClient();
    const getHeaders = useAuthHeaders();

    return useMutation({
        mutationFn: async (data: { granted: boolean; deviceHint?: string }) => {
            const headers = await getHeaders();
            const response = await withMinDuration(apiClient.setLocationConsent(data, headers));
            return response.data?.data || response.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['locator-my-status'] }),
    });
}

export function useActiveEmployeeLocations(enabled = true) {
    const { isLoaded, isSignedIn } = useAuth();
    const getHeaders = useAuthHeaders();

    return useQuery<ActiveEmployeeLocation[]>({
        queryKey: ['locator-active'],
        queryFn: async () => {
            const headers = await getHeaders();
            const response = await apiClient.getActiveEmployeeLocations(headers);
            return response.data?.data || response.data || [];
        },
        enabled: !!isLoaded && !!isSignedIn && enabled,
        refetchInterval: 15_000,
        staleTime: 10_000,
    });
}

export function usePlaces() {
    const { isLoaded, isSignedIn } = useAuth();
    const getHeaders = useAuthHeaders();

    return useQuery<Place[]>({
        queryKey: ['locator-places'],
        queryFn: async () => {
            const headers = await getHeaders();
            const response = await apiClient.getPlaces(headers);
            return response.data?.data || response.data || [];
        },
        enabled: !!isLoaded && !!isSignedIn,
        staleTime: 30_000,
    });
}

export function useCreatePlace() {
    const queryClient = useQueryClient();
    const getHeaders = useAuthHeaders();

    return useMutation({
        mutationFn: async (data: { name: string; lat: number; lng: number; radiusM?: number; icon?: string; color?: string; address?: string }) => {
            const headers = await getHeaders();
            const response = await apiClient.createPlace(data, headers);
            return response.data?.data || response.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['locator-places'] }),
    });
}

export function useUpdatePlace() {
    const queryClient = useQueryClient();
    const getHeaders = useAuthHeaders();

    return useMutation({
        mutationFn: async ({ id, ...data }: { id: string } & Partial<Place>) => {
            const headers = await getHeaders();
            const response = await apiClient.updatePlace(id, data, headers);
            return response.data?.data || response.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['locator-places'] }),
    });
}

export function useDeletePlace() {
    const queryClient = useQueryClient();
    const getHeaders = useAuthHeaders();

    return useMutation({
        mutationFn: async (id: string) => {
            const headers = await getHeaders();
            await apiClient.deletePlace(id, headers);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['locator-places'] }),
    });
}

export function useManualCheckIn() {
    const queryClient = useQueryClient();
    const getHeaders = useAuthHeaders();

    return useMutation({
        mutationFn: async (placeId: string) => {
            const headers = await getHeaders();
            const response = await apiClient.manualCheckIn(placeId, headers);
            return response.data?.data || response.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-activity-feed'] }),
    });
}

export interface LocationHistoryPoint {
    _id: string;
    userId: string;
    coords: { lat: number; lng: number };
    speedMph?: number;
    recordedAt: string;
}

export interface TimeAtPlaceEntry {
    userId: string;
    userName: string;
    placeId: string;
    placeName: string;
    visits: number;
    totalMin: number;
}

export function useLocationHistory(userId: string | null, from?: string, to?: string) {
    const { isLoaded, isSignedIn } = useAuth();
    const getHeaders = useAuthHeaders();

    return useQuery<LocationHistoryPoint[]>({
        queryKey: ['locator-history', userId, from, to],
        queryFn: async () => {
            const headers = await getHeaders();
            const response = await apiClient.getLocationHistory(userId!, { from, to }, headers);
            return response.data?.data || response.data || [];
        },
        enabled: !!isLoaded && !!isSignedIn && !!userId,
        staleTime: 30_000,
    });
}

export function useTimeAtPlaceReport(params: { from?: string; to?: string; userId?: string; placeId?: string }) {
    const { isLoaded, isSignedIn } = useAuth();
    const getHeaders = useAuthHeaders();

    return useQuery<TimeAtPlaceEntry[]>({
        queryKey: ['locator-time-at-place', params],
        queryFn: async () => {
            const headers = await getHeaders();
            const response = await apiClient.getTimeAtPlaceReport(params, headers);
            return response.data?.data || response.data || [];
        },
        enabled: !!isLoaded && !!isSignedIn && !!params.userId,
        staleTime: 30_000,
    });
}

export interface DrivingSession {
    _id: string;
    organizationId: string;
    userId: string;
    userName: string;
    appointmentId: string;
    vehicleId?: string;
    startedAt: string;
    endedAt?: string;
    topSpeedMph: number;
    harshBrakingEvents: number;
    speedingEvents: number;
    distanceMi: number;
    possibleIncident?: {
        detectedAt: string;
        speedBeforeMph: number;
        confirmed?: boolean;
        respondedAt?: string;
    };
    status: 'active' | 'completed' | 'aborted';
}

export function useDrivingSessions(params: { userId?: string; from?: string; to?: string }) {
    const { isLoaded, isSignedIn } = useAuth();
    const getHeaders = useAuthHeaders();

    return useQuery<DrivingSession[]>({
        queryKey: ['locator-driving-sessions', params],
        queryFn: async () => {
            const headers = await getHeaders();
            const response = await apiClient.getDrivingSessions(params, headers);
            return response.data?.data || response.data || [];
        },
        enabled: !!isLoaded && !!isSignedIn,
        staleTime: 20_000,
    });
}

export function useDrivingSessionDetail(id: string | null) {
    const { isLoaded, isSignedIn } = useAuth();
    const getHeaders = useAuthHeaders();

    return useQuery<{ session: DrivingSession; route: LocationHistoryPoint[] }>({
        queryKey: ['locator-driving-session-detail', id],
        queryFn: async () => {
            const headers = await getHeaders();
            const response = await apiClient.getDrivingSessionDetail(id!, headers);
            return response.data?.data || response.data;
        },
        enabled: !!isLoaded && !!isSignedIn && !!id,
        staleTime: 20_000,
    });
}

export function useRespondToIncident() {
    const queryClient = useQueryClient();
    const getHeaders = useAuthHeaders();

    return useMutation({
        mutationFn: async ({ id, confirmed }: { id: string; confirmed: boolean }) => {
            const headers = await getHeaders();
            const response = await apiClient.respondToIncident(id, confirmed, headers);
            return response.data?.data || response.data;
        },
        onSuccess: (_data, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['locator-driving-sessions'] });
            queryClient.invalidateQueries({ queryKey: ['locator-driving-session-detail', id] });
        },
    });
}

export interface SosAlert {
    _id: string;
    organizationId: string;
    userId: string;
    userName: string;
    coords: { lat: number; lng: number };
    status: 'active' | 'resolved' | 'false_alarm';
    resolvedBy?: string;
    resolvedAt?: string;
    resolutionNote?: string;
    createdAt: string;
}

export function useTriggerSos() {
    const getHeaders = useAuthHeaders();

    return useMutation({
        mutationFn: async (data: { lat: number; lng: number }) => {
            const headers = await getHeaders();
            const response = await apiClient.triggerSos(data, headers);
            return response.data?.data || response.data;
        },
    });
}

export function useResolveSos() {
    const queryClient = useQueryClient();
    const getHeaders = useAuthHeaders();

    return useMutation({
        mutationFn: async ({ id, status, note }: { id: string; status: 'resolved' | 'false_alarm'; note?: string }) => {
            const headers = await getHeaders();
            const response = await apiClient.resolveSos(id, { status, note }, headers);
            return response.data?.data || response.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['locator-sos-active'] }),
    });
}

export function useActiveSosAlerts(enabled: boolean) {
    const { isLoaded, isSignedIn } = useAuth();
    const getHeaders = useAuthHeaders();

    return useQuery<SosAlert[]>({
        queryKey: ['locator-sos-active'],
        queryFn: async () => {
            const headers = await getHeaders();
            const response = await apiClient.getActiveSosAlerts(headers);
            return response.data?.data || response.data || [];
        },
        enabled: !!isLoaded && !!isSignedIn && enabled,
        refetchInterval: 10_000,
        staleTime: 5_000,
    });
}

export function useSetEmploymentLocationType() {
    const queryClient = useQueryClient();
    const getHeaders = useAuthHeaders();

    return useMutation({
        mutationFn: async ({ userId, employmentLocationType }: { userId: string; employmentLocationType: 'onsite' | 'remote' }) => {
            const headers = await getHeaders();
            const response = await apiClient.setEmploymentLocationType(userId, employmentLocationType, headers);
            return response.data?.data || response.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-pulse-members'] }),
    });
}

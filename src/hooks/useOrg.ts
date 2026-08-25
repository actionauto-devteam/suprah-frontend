import { useState, useEffect, useCallback } from 'react';
import { useAuth, useUser } from "@/providers/AuthProvider";
import { apiClient } from '@/lib/api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Organization } from '@/types/organization';

export function useOrg() {
    const { isLoaded, isSignedIn, getToken } = useAuth();
    const { user } = useUser();
    const router = useRouter();
    const queryClient = useQueryClient();

    // Helper to get auth headers
    const getAuthHeaders = useCallback(async () => {

        const token = await getToken();

        return {
            headers: {
                Authorization: `Bearer ${token}`
            }
        };
    }, [getToken]);

    // Fetch current user's organization context
    // This assumes your backend /api/users/me or similar endpoint 
    // returns the active organizationId for the user
    const {
        data: orgContext,
        isLoading: isLoadingOrgContext,
        error: orgContextError
    } = useQuery({
        queryKey: ['org-context', user?.id],
        queryFn: async () => {
            const headers = await getAuthHeaders();
            const response = await apiClient.get('/api/users/me', headers);
            return response.data;
        },
        enabled: !!isLoaded && !!isSignedIn,
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: 1
    });

    const organizationId = orgContext?.data?.organizationId;
    // Prioritize organization-specific role, fallback to global role if valid 'admin' (though usually they are distinct)
    const orgRole = orgContext?.data?.organizationRole;

    // Fetch full organization details if we have an ID
    const {
        data: organization,
        isLoading: isLoadingOrgDetails
    } = useQuery({
        queryKey: ['organization', organizationId],
        queryFn: async () => {
            const headers = await getAuthHeaders();
            const response = await apiClient.getOrganization(organizationId, headers);
            return response.data?.data || response.data;
        },
        enabled: !!organizationId,
        staleTime: 1000 * 60 * 60, // 1 hour
    });

    // List User Organizations
    const {
        data: userOrgsData,
        isLoading: isLoadingUserOrgs
    } = useQuery({
        queryKey: ['user-organizations', user?.id],
        queryFn: async () => {
            const headers = await getAuthHeaders();
            const response = await apiClient.getUserOrganizations(headers);
            return response.data?.data || response.data;
        },
        enabled: !!isLoaded && !!isSignedIn,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Create Organization Mutation
    const createOrgMutation = useMutation({
        mutationFn: async (data: { name: string; slug: string }) => {
            const headers = await getAuthHeaders();
            return apiClient.createOrganization(data, headers);
        },
        onSuccess: (response) => {
            const newOrg = response.data?.data || response.data;
            queryClient.invalidateQueries({ queryKey: ['org-context'] });
            queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
            queryClient.setQueryData(['organization', newOrg._id], newOrg);
        }
    });

    // Select Organization Mutation
    const selectOrgMutation = useMutation({
        mutationFn: async (orgId: string) => {
            const headers = await getAuthHeaders();
            return apiClient.selectOrganization(orgId, headers);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['org-context'] });
            router.refresh(); // Refresh to update server components if any
        }
    });

    const realUserRole = orgContext?.data?.role as 'customer' | 'employee' | 'admin' | 'super_admin' | 'driver' | undefined;

    // Dev-only: DevRoleSwitcher writes this to preview other roles' shells
    // without changing the real backend role. Keep in sync with the same
    // NEXT_PUBLIC_ENABLE_DEV_TOOLS gate used there and in AuthProvider.
    const devRoleOverride =
        process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS === 'true' && typeof window !== 'undefined'
            ? (localStorage.getItem('dev_role_override') as typeof realUserRole | null)
            : null;
    const userRole = devRoleOverride || realUserRole;

    return {
        isLoaded: isLoaded && !isLoadingOrgContext && (!organizationId || !isLoadingOrgDetails),
        organization: organization as Organization | undefined,
        organizationId: organizationId as string | undefined,
        role: orgRole as 'admin' | 'member' | 'driver' | undefined,
        userRole,
        isCustomer: userRole === 'customer',
        isAdmin: orgRole === 'admin',
        isDriver: userRole === 'driver',
        isSuperAdmin: userRole === 'super_admin',
        createOrganization: createOrgMutation.mutateAsync,
        isCreating: createOrgMutation.isPending,
        userOrganizations: (userOrgsData as Organization[]) || [],
        isLoadingUserOrgs,
        selectOrganization: selectOrgMutation.mutateAsync,
        isSelecting: selectOrgMutation.isPending,
    };
}

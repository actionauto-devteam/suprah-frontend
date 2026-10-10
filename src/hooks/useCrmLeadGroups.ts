import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";

export interface CrmLeadGroup {
  _id: string;
  organizationId: string;
  name: string;
  description?: string;
  color?: string;
  memberIds: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export function useCrmLeadGroups() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  const getAuthHeaders = async () => {
    const token = await getToken();
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const query = useQuery<CrmLeadGroup[]>({
    queryKey: ["crm-lead-groups"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await apiClient.get("/api/crm/lead-groups", headers);
      return response.data?.data || response.data || [];
    },
    enabled: !!isLoaded && !!isSignedIn,
    staleTime: 60_000,
  });

  const createGroup = useMutation({
    mutationFn: async (payload: { name: string; description?: string; color?: string; memberIds?: string[] }) => {
      const headers = await getAuthHeaders();
      const response = await apiClient.post("/api/crm/lead-groups", payload, headers);
      return response.data?.data || response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["crm-lead-groups"] }),
  });

  const updateGroup = useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: { id: string; name?: string; description?: string; color?: string; memberIds?: string[] }) => {
      const headers = await getAuthHeaders();
      const response = await apiClient.patch(`/api/crm/lead-groups/${id}`, payload, headers);
      return response.data?.data || response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["crm-lead-groups"] }),
  });

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const headers = await getAuthHeaders();
      const response = await apiClient.delete(`/api/crm/lead-groups/${id}`, headers);
      return response.data?.data || response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["crm-lead-groups"] }),
  });

  return {
    groups: query.data || [],
    isLoading: query.isLoading,
    createGroup: createGroup.mutateAsync,
    isCreatingGroup: createGroup.isPending,
    updateGroup: updateGroup.mutateAsync,
    isUpdatingGroup: updateGroup.isPending,
    deleteGroup: deleteGroup.mutateAsync,
    isDeletingGroup: deleteGroup.isPending,
  };
}

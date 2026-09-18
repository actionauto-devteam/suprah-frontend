import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";

export interface CannedReply {
  _id: string;
  organizationId: string;
  title: string;
  body: string;
  category?: string;
  createdBy: string;
  isShared: boolean;
  usageCount: number;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export const useCannedReplies = () => {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const getAuthHeaders = async () => {
    const token = await getToken();
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const { data, isLoading } = useQuery({
    queryKey: ["canned-replies"],

    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await apiClient.get("/api/crm/canned-replies", headers);
      const resData = response.data?.data || response.data;
      return (resData || []) as CannedReply[];
    },

    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["canned-replies"] });

  const createMutation = useMutation({
    mutationFn: async (payload: { title: string; body: string; category?: string }) => {
      const headers = await getAuthHeaders();
      const response = await apiClient.post("/api/crm/canned-replies", payload, headers);
      return response.data;
    },
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      ...changes
    }: {
      id: string;
      title?: string;
      body?: string;
      category?: string;
    }) => {
      const headers = await getAuthHeaders();
      const response = await apiClient.patch(`/api/crm/canned-replies/${id}`, changes, headers);
      return response.data;
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const headers = await getAuthHeaders();
      const response = await apiClient.delete(`/api/crm/canned-replies/${id}`, headers);
      return response.data;
    },
    onSuccess: invalidate,
  });

  const recordUsage = (id: string) => {
    void getAuthHeaders().then((headers) =>
      apiClient.post(`/api/crm/canned-replies/${id}/use`, {}, headers).catch(() => {}),
    );
  };

  return {
    replies: data || [],
    isLoading,

    createReply: createMutation.mutateAsync,
    isCreating: createMutation.isPending,

    updateReply: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,

    deleteReply: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,

    recordUsage,
  };
};

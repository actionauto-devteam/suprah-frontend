import { useQuery, type QueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import {
  AI_AGENT_IDENTITY_QUERY_KEY,
  aiAgentDisplayName,
  configuredAiAgentName,
} from "@/lib/aiAgentIdentity";

export interface AiAgentIdentityState {
  name: string | null;
  configured: boolean;
  displayName: string;
  loading: boolean;
  failed: boolean;
}

export function useAiAgentIdentity(): AiAgentIdentityState {
  const { getToken, isLoaded, isSignedIn, orgId, userId } = useAuth();
  const query = useQuery<string | null>({
    queryKey: [...AI_AGENT_IDENTITY_QUERY_KEY, orgId || "", userId || ""],
    queryFn: async () => {
      const token = await getToken();
      const res = await apiClient.get("/api/crm/org-settings", { headers: { Authorization: `Bearer ${token}` } });
      const data = res.data?.data || res.data;
      return configuredAiAgentName(data?.aiAgentName);
    },
    enabled: Boolean(isLoaded && isSignedIn),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  const name = query.data ?? null;
  return {
    name,
    configured: Boolean(name),
    displayName: aiAgentDisplayName(name),
    loading: query.isLoading,
    failed: query.isError,
  };
}

export function refreshAiAgentIdentity(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: AI_AGENT_IDENTITY_QUERY_KEY });
}

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";

export interface ActiveLeadCall {
  callId: string;
  leadId: string;
  status: string;
  direction: "inbound" | "outbound";
  number: string | null;
  customerNumber: string | null;
  lineLabel: string | null;
  since: string;
}

export const ACTIVE_CALLS_KEY = ["crm-active-calls"];
const ACTIVE_CALLS_REFRESH_MS = 8000;

export function useActiveCalls() {
  const { isLoaded, isSignedIn } = useAuth();
  const query = useQuery<ActiveLeadCall[]>({
    queryKey: ACTIVE_CALLS_KEY,
    enabled: Boolean(isLoaded && isSignedIn),
    refetchInterval: ACTIVE_CALLS_REFRESH_MS,
    staleTime: 0,
    retry: false,
    queryFn: async () => {
      const response = await apiClient.get("/api/crm/communications/calls/active");
      return response.data?.data?.items || [];
    },
  });
  return React.useMemo(() => {
    const byLead = new Map<string, ActiveLeadCall>();
    for (const call of query.data || []) if (!byLead.has(call.leadId)) byLead.set(call.leadId, call);
    return byLead;
  }, [query.data]);
}

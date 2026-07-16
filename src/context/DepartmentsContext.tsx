"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { setDepartments, DepartmentEntry } from "@/lib/departments";

// Departments are now admin-managed data (Team Engagement -> Manage Departments) instead of
// a hardcoded list. This provider fetches the org's active list once per mount and mirrors it
// into lib/departments.ts's live DEPARTMENTS array, so the many existing components that call
// DEPARTMENTS.map(...) / deptLabel(...) / deptColorHex(...) directly keep working unchanged.
// Reactivity tradeoff: components don't re-render the instant an admin edits the list — they
// pick it up on this query's own refetch (or their own next unrelated re-render), which is
// fine for a rarely-changed reference list.
export function useDepartmentsQuery() {
  return useQuery<DepartmentEntry[]>({
    queryKey: ["departments"],
    queryFn: async () => {
      const response = await apiClient.get("/api/departments");
      return response.data?.data || response.data || [];
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}

export function DepartmentsProvider({ children }: { children: React.ReactNode }) {
  const { data } = useDepartmentsQuery();

  React.useEffect(() => {
    if (data && data.length > 0) {
      setDepartments(data);
    }
  }, [data]);

  return <>{children}</>;
}

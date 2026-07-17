"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { apiClient } from "@/lib/api-client";
import { setDepartments, DepartmentEntry } from "@/lib/departments";

type DepartmentsApiResponse =
  | DepartmentEntry[]
  | {
      data?: DepartmentEntry[];
      message?: string;
    };

function extractDepartments(payload: DepartmentsApiResponse): DepartmentEntry[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return Array.isArray(payload?.data) ? payload.data : [];
}

export function useDepartmentsQuery() {
  return useQuery<DepartmentEntry[]>({
    queryKey: ["departments"],

    queryFn: async () => {
      try {
        const response =
          await apiClient.get<DepartmentsApiResponse>("/api/departments");

        return extractDepartments(response.data);
      } catch (error) {
        const axiosError = error as AxiosError;

        /*
         * A 404 means the backend does not currently expose:
         * GET /api/departments
         *
         * Returning an empty array prevents the Departments provider from
         * crashing the page while the backend route is being added.
         */
        if (axiosError.response?.status === 404) {
          console.warn(
            "[Departments] GET /api/departments is not registered on the backend."
          );
          return [];
        }

        throw error;
      }
    },

    staleTime: 60_000,
    refetchInterval: 120_000,

    /*
     * Do not repeatedly retry a missing backend route.
     * Retry other temporary errors up to two times.
     */
    retry: (failureCount, error) => {
      const axiosError = error as AxiosError;

      if (axiosError.response?.status === 404) {
        return false;
      }

      return failureCount < 2;
    },
  });
}

export function DepartmentsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data } = useDepartmentsQuery();

  React.useEffect(() => {
    if (data) {
      setDepartments(data);
    }
  }, [data]);

  return <>{children}</>;
}

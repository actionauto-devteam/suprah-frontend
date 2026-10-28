"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { fetchCustomerCatchUpStatus } from "@/lib/api/customerRecords";

export function CustomerCatchUpNote() {
  const { getToken } = useAuth();
  const status = useQuery({
    queryKey: ["customer-records", "catch-up-status"],
    queryFn: async () => fetchCustomerCatchUpStatus(await getToken()),
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: false,
  });

  const data = status.data;
  if (!data?.canView || (data.ready && data.remaining === 0)) return null;

  return (
    <div role="status" className="flex items-start gap-3 rounded-xl border bg-card p-3 text-sm">
      <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
      <p className="min-w-0 text-muted-foreground">
        {data.ready
          ? `Connecting older leads to customer records in the background: ${data.remaining.toLocaleString()} left. This page updates by itself.`
          : "Older leads will be connected to customer records once a one-time database step is finished."}
      </p>
    </div>
  );
}

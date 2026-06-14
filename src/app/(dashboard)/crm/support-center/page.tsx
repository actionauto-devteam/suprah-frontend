"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Headset, MessageCircle, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomersConcernTab } from "@/components/CustomersConcernTab";
import { CustomerCallsTab } from "@/components/CustomerCallsTab";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type SupportTab = "concerns" | "calls";

export default function SupportCenterPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [activeTab, setActiveTab] = React.useState<SupportTab>("concerns");

  const getAuthHeaders = async () => {
    const token = await getToken();
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const { data: concernUnread = 0 } = useQuery({
    queryKey: ["concern-unread"],
    queryFn: async () => {
      try {
        const headers = await getAuthHeaders();
        const r = await apiClient.get("/api/customer-concern/crm/conversations", headers);
        const convs: any[] = r.data?.data || [];
        return convs.reduce((n: number, c: any) => n + (c.unreadCount || 0), 0);
      } catch {
        return 0;
      }
    },
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  const { data: callsPending = 0 } = useQuery({
    queryKey: ["calls-pending"],
    queryFn: async () => {
      try {
        const headers = await getAuthHeaders();
        const r = await apiClient.get("/api/customer-call/crm/conversations", headers);
        const convs: any[] = r.data?.data || [];
        return convs.filter(
          (c: any) =>
            !c.metadata?.resolved &&
            ["requested", "preparing", "about_to_start"].includes(c.metadata?.callStatus)
        ).length;
      } catch {
        return 0;
      }
    },
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  const tabs: Array<{
    id: SupportTab;
    label: string;
    icon: React.ReactNode;
    count: number;
  }> = [
    { id: "concerns", label: "Concerns", icon: <MessageCircle className="h-4 w-4" />, count: concernUnread },
    { id: "calls", label: "Calls", icon: <PhoneCall className="h-4 w-4" />, count: callsPending },
  ];

  return (
    <TooltipProvider>
      <div className="relative flex h-full min-h-screen w-full flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-950 transition-colors duration-300">
        {/* Decorative background blobs */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -top-64 -left-64 h-150 w-150 rounded-full bg-emerald-500/4 dark:bg-emerald-500/3 blur-3xl" />
          <div className="absolute top-1/3 -right-48 h-125 w-125 rounded-full bg-blue-500/5 dark:bg-blue-500/4 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-100 w-100 rounded-full bg-emerald-400/3 dark:bg-emerald-400/2 blur-3xl" />
        </div>

        <div className="relative z-10 flex w-full flex-1 flex-col gap-4 px-4 py-6 sm:px-6 sm:py-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/crm/dashboard")}
                className="h-9 w-9 shrink-0 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 hover:border-emerald-500/40 hover:bg-emerald-500/5 p-0 transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-900/20 dark:shadow-emerald-900/50">
                <Headset className="h-5 w-5 text-white" />
                <div className="absolute inset-0 rounded-2xl ring-1 ring-emerald-400/30" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Support Center</h1>
                <p className="text-sm text-muted-foreground">
                  Manage customer concerns and call requests in one place
                </p>
              </div>
            </div>

            {/* Segmented tab switcher */}
            <div className="flex w-full gap-1 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/50 backdrop-blur-sm p-1 sm:w-auto">
              {tabs.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "relative flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-300 sm:flex-none sm:px-5",
                      active
                        ? "bg-linear-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-900/20 dark:shadow-emerald-900/40"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                    )}
                  >
                    {tab.icon}
                    {tab.label}
                    {tab.count > 0 && (
                      <span
                        className={cn(
                          "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums transition-colors",
                          active
                            ? "bg-white/20 text-white"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        )}
                      >
                        {tab.count > 99 ? "99+" : tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab content */}
          <div
            className="min-h-0 flex-1 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/60 bg-zinc-50/90 dark:bg-zinc-900/50 backdrop-blur-sm p-3 shadow-[0_10px_30px_rgba(0,0,0,0.04)] dark:shadow-none sm:p-4"
            style={{ height: "calc(100vh - 12.5rem)", minHeight: 480 }}
          >
            {activeTab === "concerns" ? <CustomersConcernTab /> : <CustomerCallsTab />}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

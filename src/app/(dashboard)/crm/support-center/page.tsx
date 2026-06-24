"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Headset, MessageCircle, PhoneCall, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomersConcernTab } from "@/components/CustomersConcernTab";
import { CustomerCallsTab } from "@/components/CustomerCallsTab";
import { AftermarketInquiriesTab } from "@/components/AftermarketInquiriesTab";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type SupportTab = "concerns" | "calls" | "aftermarket";

const VALID_TABS: SupportTab[] = ["concerns", "calls", "aftermarket"];

function SupportCenterView() {
  const router = useRouter();
  const params = useSearchParams();
  const { getToken } = useAuth();

  // Honor ?tab=aftermarket deep-links (aftermarket inquiry notifications route here).
  const initialTab = (params.get("tab") as SupportTab) || "concerns";
  const [activeTab, setActiveTab] = React.useState<SupportTab>(
    VALID_TABS.includes(initialTab) ? initialTab : "concerns"
  );

  React.useEffect(() => {
    const t = params.get("tab") as SupportTab | null;
    if (t && VALID_TABS.includes(t)) setActiveTab(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

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

  const { data: openConcerns = 0 } = useQuery({
    queryKey: ["concern-open-count"],
    queryFn: async () => {
      try {
        const headers = await getAuthHeaders();
        const r = await apiClient.get("/api/customer-concern/crm/conversations", headers);
        const convs: any[] = r.data?.data || [];
        return convs.filter((c: any) => !c.metadata?.resolved).length;
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

  const { data: aftermarketOpen = 0 } = useQuery({
    queryKey: ["aftermarket-open-count"],
    queryFn: async () => {
      try {
        const headers = await getAuthHeaders();
        const r = await apiClient.get("/api/crm/aftermarket/inquiries/unread-count", headers);
        return (r.data?.data?.openCount ?? 0) as number;
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
    { id: "concerns", label: "Concerns", icon: <MessageCircle className="h-3.5 w-3.5" />, count: concernUnread },
    { id: "calls", label: "Calls", icon: <PhoneCall className="h-3.5 w-3.5" />, count: callsPending },
    { id: "aftermarket", label: "Aftermarket", icon: <Package className="h-3.5 w-3.5" />, count: aftermarketOpen },
  ];

  return (
    <TooltipProvider>
      <div className="flex h-full w-full flex-col overflow-hidden bg-background">
        <div className="flex w-full min-h-0 flex-1 flex-col gap-4 px-4 py-5 sm:px-6">
          {/* Console header */}
          <div className="shrink-0 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/crm/dashboard")}
                className="h-9 w-9 shrink-0 rounded-[10px] border border-border p-0 hover:border-primary/40 hover:bg-primary/5"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary/10">
                <Headset className="h-4.5 w-4.5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-mono">
                  support console
                </p>
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl leading-tight">Support Center</h1>
              </div>
            </div>

            {/* Live stat strip */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-chart-2/60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-chart-2" />
                </span>
                <span className="text-[11px] text-muted-foreground">
                  <span className="font-bold text-foreground">{openConcerns}</span> open
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  {callsPending > 0 && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-chart-4/60" />
                  )}
                  <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", callsPending > 0 ? "bg-chart-4" : "bg-muted-foreground/40")} />
                </span>
                <span className="text-[11px] text-muted-foreground">
                  <span className="font-bold text-foreground">{callsPending}</span> pending calls
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  {aftermarketOpen > 0 && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                  )}
                  <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", aftermarketOpen > 0 ? "bg-primary" : "bg-muted-foreground/40")} />
                </span>
                <span className="text-[11px] text-muted-foreground">
                  <span className="font-bold text-foreground">{aftermarketOpen}</span> inquiries
                </span>
              </div>
            </div>
          </div>

          {/* Tab nav — underline style */}
          <div className="shrink-0 flex gap-6 overflow-x-auto border-b border-border -mt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative flex shrink-0 items-center gap-2 whitespace-nowrap py-3 text-sm font-bold transition-colors border-b-2 -mb-px",
                    active
                      ? "text-foreground border-primary"
                      : "text-muted-foreground border-transparent hover:text-foreground/80"
                  )}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.count > 0 && (
                    <span
                      className={cn(
                        "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums font-mono",
                        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {tab.count > 99 ? "99+" : tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="min-h-0 flex-1">
            {activeTab === "concerns" && <CustomersConcernTab />}
            {activeTab === "calls" && <CustomerCallsTab />}
            {activeTab === "aftermarket" && <AftermarketInquiriesTab />}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default function SupportCenterPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SupportCenterView />
    </React.Suspense>
  );
}
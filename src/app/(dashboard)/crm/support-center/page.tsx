"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Package, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { CustomersConcernTab } from "@/components/CustomersConcernTab";
import { AftermarketInquiriesTab } from "@/components/AftermarketInquiriesTab";

type TabKey = "concerns" | "aftermarket";

export default function SupportCenterPage() {
  const router = useRouter();
  const params = useSearchParams();

  const initial = (params.get("tab") as TabKey) || "concerns";
  const [tab, setTab] = React.useState<TabKey>(initial);

  // Keep tab in sync if the URL changes (e.g. clicking a notification).
  React.useEffect(() => {
    const t = params.get("tab") as TabKey | null;
    if (t && (t === "concerns" || t === "aftermarket")) setTab(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const changeTab = (t: TabKey) => {
    setTab(t);
    router.replace(`/crm/support-center?tab=${t}`);
  };

  // Open-inquiry badge for the Aftermarket tab.
  const { data: openCount = 0 } = useQuery({
    queryKey: ["aftermarket-open-count"],
    queryFn: async () => {
      const r = await apiClient.get("/api/crm/aftermarket/inquiries/unread-count");
      return (r.data?.data?.openCount ?? 0) as number;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const TABS: Array<{ key: TabKey; label: string; icon: any; badge?: number }> = [
    { key: "concerns", label: "Concerns", icon: MessageCircle },
    { key: "aftermarket", label: "Aftermarket", icon: Package, badge: openCount },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] min-h-0">
      {/* Page header */}
      <div className="flex items-center gap-2.5 px-4 md:px-6 pt-4 pb-3 shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Headphones className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-tight">Support Center</h1>
          <p className="text-xs text-muted-foreground">Customer concerns & aftermarket inquiries</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-5 px-4 md:px-6 border-b border-border shrink-0">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => changeTab(t.key)}
              className={cn(
                "pb-2.5 -mb-px text-sm font-bold uppercase tracking-wide border-b-2 transition-colors inline-flex items-center gap-2",
                active ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
              {!!t.badge && t.badge > 0 && (
                <span className="h-4.5 min-w-4.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold px-1.5 flex items-center justify-center">
                  {t.badge > 99 ? "99+" : t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Panel */}
      <div className="flex-1 min-h-0 p-4 md:p-6">
        {tab === "concerns" && <CustomersConcernTab />}
        {tab === "aftermarket" && (
          <AftermarketInquiriesTab
            onRespond={() => changeTab("concerns")}
          />
        )}
      </div>
    </div>
  );
}
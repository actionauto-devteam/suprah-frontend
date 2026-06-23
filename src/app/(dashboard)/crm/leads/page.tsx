"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { LeadsTab } from "@/components/LeadsTab";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export default function LeadsPage() {
  const router = useRouter();
  const [convoActive, setConvoActive] = React.useState(false);

  // LeadsTab dispatches this whenever a lead conversation opens/closes. On
  // mobile/tablet we collapse this page header too, since the conversation
  // shows its own header — on desktop (lg+) the list and conversation are
  // shown side by side, so this header always stays visible there.
  React.useEffect(() => {
    const handler = (e: Event) => {
      setConvoActive((e as CustomEvent<{ active: boolean }>).detail.active);
    };
    window.addEventListener("crm-leads:convo-state", handler);
    return () => window.removeEventListener("crm-leads:convo-state", handler);
  }, []);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full min-h-0 overflow-hidden">
        {/* Page header */}
        <div
          className={cn(
            "shrink-0 flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-border/60 bg-card",
            convoActive && "hidden lg:flex",
          )}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/crm/dashboard")}
            className="h-8 w-8 shrink-0 rounded-lg border border-border/60 hover:border-primary/50 hover:bg-primary/5 p-0 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-tight">Leads</h1>
            <p className="text-xs text-muted-foreground">Manage and respond to incoming lead inquiries</p>
          </div>
        </div>

        {/* Full-height LeadsTab */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <LeadsTab />
        </div>
      </div>
    </TooltipProvider>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DealBoard } from "@/components/deals/DealBoard";

export default function DealsPage() {
  const router = useRouter();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-3 border-b border-border/60 bg-card px-4 py-3 sm:px-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/crm/dashboard")}
          aria-label="Back to the dashboard"
          className="h-10 w-10 shrink-0 rounded-lg border border-border/60 p-0 transition-all hover:border-primary/50 hover:bg-primary/5"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold leading-tight tracking-tight">Deal Board</h1>
          <p className="text-xs text-muted-foreground">Follow each deal from first offer to Won or Lost</p>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <DealBoard />
      </div>
    </div>
  );
}

"use client";

import { LeadsTab } from "@/components/LeadsTab";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function LeadsPage() {
  return (
    <TooltipProvider>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <LeadsTab />
      </div>
    </TooltipProvider>
  );
}
"use client";

import * as React from "react";
import { MessageSquare, MessagesSquare, Phone, Plus, ScanBarcode } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export type NewLeadAction = "scan" | "sms" | "call" | "bulk";

const ACTIONS: Array<{ action: NewLeadAction; label: string; hint: string; Icon: React.ComponentType<{ className?: string }> }> = [
  { action: "scan", label: "Scan License", hint: "Scan a driver's license to add a lead", Icon: ScanBarcode },
  { action: "sms", label: "Message", hint: "Add a customer and message them", Icon: MessageSquare },
  { action: "call", label: "Call", hint: "Call any phone number", Icon: Phone },
  { action: "bulk", label: "Bulk Message", hint: "Send one text to several leads", Icon: MessagesSquare },
];

export function NewLeadMenu({ onSelect }: { onSelect: (action: NewLeadAction) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="ss4-pill-btn flex h-9 w-9 items-center justify-center p-0 text-[12px] font-medium transition-all sm:h-8 sm:w-8 lg:w-auto lg:gap-1.5 lg:px-2.5"
          title="New"
          aria-label="New"
        >
          <Plus className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
          <span className="hidden lg:inline">New</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(18rem,calc(100vw-2rem))] p-1.5">
        {ACTIONS.map(({ action, label, hint, Icon }) => (
          <DropdownMenuItem key={action} onSelect={() => onSelect(action)} className="items-start gap-3 rounded-lg px-2.5 py-2">
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{label}</span>
              <span className="block text-xs text-muted-foreground">{hint}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

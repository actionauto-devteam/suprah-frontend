"use client";

import * as React from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUpdateMyStatus, type OnlineStatus } from "@/hooks/useTeamPulse";
import { onlineStatusOptions } from "@/components/profile/profile-constants";

/**
 * Compact inline status changer used on the current user's roster card.
 * Mirrors the header status popover but scoped to a single quick action.
 */
export function MyStatusQuickSet({
  currentStatus,
  currentCustom,
}: {
  currentStatus: OnlineStatus;
  currentCustom?: string;
}) {
  const update = useUpdateMyStatus();
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<OnlineStatus>(currentStatus);
  const [custom, setCustom] = React.useState(currentCustom ?? "");

  React.useEffect(() => {
    if (open) {
      setDraft(currentStatus);
      setCustom(currentCustom ?? "");
    }
  }, [open, currentStatus, currentCustom]);

  async function apply() {
    setOpen(false);
    try {
      await update.mutateAsync({ status: draft, customStatus: custom.trim() || undefined });
      const label = onlineStatusOptions.find((o) => o.value === draft)?.label ?? draft;
      toast.success(`Status set to ${label}`);
    } catch {
      toast.error("Failed to update status");
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 text-[10px] font-bold shrink-0 rounded-lg gap-1 border-border/50"
        >
          <span className={cn("size-2 rounded-full", onlineStatusOptions.find((o) => o.value === currentStatus)?.color ?? "bg-gray-400")} />
          Status
          <ChevronDown className="size-2.5 text-muted-foreground/60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-0 rounded-xl overflow-hidden">
        <div className="px-3 pt-3 pb-1">
          <p className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest">Set My Status</p>
        </div>
        <div className="px-1.5 space-y-0.5 pb-1">
          {onlineStatusOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => setDraft(opt.value as OnlineStatus)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-all",
                  draft === opt.value ? "bg-primary/8 text-foreground" : "hover:bg-muted/60 text-muted-foreground hover:text-foreground",
                )}
              >
                <div className="flex items-center justify-center size-6 rounded-md shrink-0 bg-black/5 dark:bg-white/10">
                  <Icon className={cn("size-3", opt.color.replace("bg-", "text-"))} />
                </div>
                <span className="flex-1 text-xs font-semibold">{opt.label}</span>
                {draft === opt.value && <Check className="size-3.5 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
        <div className="border-t border-border/40 px-3 pt-2.5 pb-2 space-y-2">
          <Input
            value={custom}
            onChange={(e) => setCustom(e.target.value.slice(0, 60))}
            placeholder="What are you working on?"
            className="h-8 text-xs bg-background border-border/50"
            onKeyDown={(e) => e.key === "Enter" && apply()}
          />
          <Button size="sm" className="w-full h-8 text-xs font-bold" onClick={apply} disabled={update.isPending}>
            {update.isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Apply"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

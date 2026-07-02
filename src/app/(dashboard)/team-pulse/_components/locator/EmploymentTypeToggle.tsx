"use client";

import * as React from "react";
import { Building2, Home, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSetEmploymentLocationType } from "@/hooks/useLocator";
import { toast } from "sonner";

interface Props {
  userId: string;
  employmentLocationType?: "onsite" | "remote";
}

export function EmploymentTypeToggle({ userId, employmentLocationType = "remote" }: Props) {
  const { mutate, isPending } = useSetEmploymentLocationType();

  function toggle(next: "onsite" | "remote") {
    if (next === employmentLocationType || isPending) return;
    mutate(
      { userId, employmentLocationType: next },
      {
        onSuccess: () => toast.success(`Marked as ${next === "onsite" ? "on-site" : "remote"}`),
        onError: () => toast.error("Could not update employment location type"),
      },
    );
  }

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-border/40 p-0.5 shrink-0">
      {(
        [
          { key: "onsite" as const, label: "On-site", Icon: Building2 },
          { key: "remote" as const, label: "Remote", Icon: Home },
        ]
      ).map(({ key, label, Icon }) => (
        <button
          key={key}
          onClick={() => toggle(key)}
          disabled={isPending}
          title={label}
          className={cn(
            "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold transition-all",
            employmentLocationType === key
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground/60 hover:text-foreground",
          )}
        >
          {isPending && employmentLocationType !== key ? (
            <Loader2 className="size-2.5 animate-spin" />
          ) : (
            <Icon className="size-2.5" />
          )}
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}

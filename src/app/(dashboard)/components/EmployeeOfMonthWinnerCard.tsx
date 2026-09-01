"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveImageUrl } from "@/lib/utils";
import { ini } from "./DashboardPanel";

export interface EotmEmployee {
  _id: string;
  fullName: string;
  avatar?: string;
  department?: string;
}

export function EmployeeOfMonthWinnerCard({
  label,
  employee,
  children,
}: {
  label: string;
  employee: EotmEmployee | null;
  /** Optional overlay content (e.g. an admin edit button), rendered absolutely positioned. */
  children?: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-1 flex-col items-center gap-2 rounded-2xl border border-border/30 bg-background/40 p-4 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60">{label}</p>

      {employee ? (
        <>
          <Avatar className="size-16 ring-2 ring-amber-500/40">
            <AvatarImage src={resolveImageUrl(employee.avatar)} />
            <AvatarFallback className="bg-amber-500 text-white text-lg font-bold">
              {ini(employee.fullName)}
            </AvatarFallback>
          </Avatar>
          <p className="text-sm font-black truncate max-w-full">{employee.fullName}</p>
          {employee.department && (
            <p className="text-[11px] text-muted-foreground/60 truncate max-w-full">{employee.department}</p>
          )}
        </>
      ) : (
        <>
          <div className="flex size-16 items-center justify-center rounded-full bg-muted/50 text-muted-foreground/40">
            <Star className="size-6" />
          </div>
          <p className="text-xs text-muted-foreground/50">Not selected yet</p>
        </>
      )}

      {children}
    </div>
  );
}

export function monthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, (m || 1) - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

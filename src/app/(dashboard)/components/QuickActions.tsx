"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Rss, ClipboardList, Target, CalendarPlus, Clock, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ACTIONS: { label: string; href: string; icon: LucideIcon; tone: string }[] = [
  { label: "New Post", href: "/crm/feeds", icon: Rss, tone: "text-emerald-500 bg-emerald-500/10 group-hover:bg-emerald-500/20" },
  { label: "New Task", href: "/project", icon: ClipboardList, tone: "text-violet-500 bg-violet-500/10 group-hover:bg-violet-500/20" },
  { label: "New Lead", href: "/crm/leads", icon: Target, tone: "text-primary bg-primary/10 group-hover:bg-primary/20" },
  { label: "My Calendar", href: "/crm/suprah-calendar", icon: CalendarPlus, tone: "text-cyan-500 bg-cyan-500/10 group-hover:bg-cyan-500/20" },
  { label: "Clock In/Out", href: "/crm/timeproof-clock", icon: Clock, tone: "text-amber-500 bg-amber-500/10 group-hover:bg-amber-500/20" },
];

export function QuickActions() {
  const router = useRouter();
  return (
    <div className="rounded-3xl border border-border/40 bg-card/40 backdrop-blur-md shadow-sm px-4 py-3 sm:px-5">
      <div className="mb-2 flex items-center gap-1.5">
        <Zap className="size-3.5 text-amber-500" />
        <h2 className="text-xs font-black tracking-tight">Quick Actions</h2>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {ACTIONS.map((a) => (
          <button
            key={a.label}
            onClick={() => router.push(a.href)}
            className="group flex flex-col items-center gap-1.5 rounded-2xl border border-border/30 bg-background/40 py-3 hover:border-border/60 active:scale-95 transition-all"
          >
            <div className={`flex size-8 items-center justify-center rounded-xl transition-colors ${a.tone}`}>
              <a.icon className="size-4" />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground/75 text-center leading-tight px-0.5">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, CalendarDays } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Panel, PanelSkeleton } from "./DashboardPanel";

interface MyTask {
  _id: string;
  title: string;
  deadline?: string | null;
  groupName: string;
}

function fmtDue(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return `Today ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function MyTasksSummary() {
  const router = useRouter();
  const [tasks, setTasks] = React.useState<MyTask[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const controller = new AbortController();
    apiClient
      .get("/api/crm/projects/my-tasks", { params: { view: "active", page: 1, limit: 5 }, signal: controller.signal })
      .then((res) => {
        const d = res.data?.data;
        setTasks(d?.tasks || []);
        setTotal(d?.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const now = Date.now();
  const overdueCount = tasks.filter((t) => t.deadline && new Date(t.deadline).getTime() < now).length;

  return (
    <Panel title="My Tasks" icon={ClipboardList} accent="text-violet-500" action="Open Project Board" onAction={() => router.push("/project")}>
      {loading ? (
        <PanelSkeleton rows={3} />
      ) : total === 0 ? (
        <p className="text-xs text-muted-foreground/60 text-center py-6">You're all caught up — nothing assigned.</p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-border/30 bg-background/40 p-2.5 text-center">
              <p className="text-xl font-black tabular-nums">{total}</p>
              <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground/60">Active</p>
            </div>
            <div className="rounded-2xl border border-border/30 bg-background/40 p-2.5 text-center">
              <p className={`text-xl font-black tabular-nums ${overdueCount > 0 ? "text-rose-500" : ""}`}>{overdueCount}</p>
              <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground/60">Overdue</p>
            </div>
          </div>
          <div className="space-y-1.5">
            {tasks.slice(0, 4).map((t) => {
              const overdue = t.deadline && new Date(t.deadline).getTime() < now;
              return (
                <button
                  key={t._id}
                  onClick={() => router.push("/project")}
                  className="w-full flex items-center gap-2 rounded-xl border border-border/30 bg-background/40 px-2.5 py-2 text-left hover:border-violet-500/30 hover:bg-violet-500/4 transition-all"
                >
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">{t.title}</span>
                  {t.deadline && (
                    <span className={`flex items-center gap-1 text-[10px] shrink-0 ${overdue ? "font-semibold text-rose-500" : "text-muted-foreground/50"}`}>
                      <CalendarDays className="size-3" /> {fmtDue(t.deadline)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Panel>
  );
}

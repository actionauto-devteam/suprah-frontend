"use client";

import * as React from "react";
import { Bot, Check, Loader2, X } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { fmtLongDateTimeMDT } from "@/lib/timezone";

interface AiAgentTask {
  id: string;
  channel: "webchat" | "sms";
  question: string;
  waitingSince: string;
}

export function AiAgentTasksSection({ leadId }: { leadId?: string }) {
  const { getToken } = useAuth();
  const [tasks, setTasks] = React.useState<AiAgentTask[]>([]);
  const [busyId, setBusyId] = React.useState("");

  const loadTasks = React.useCallback(async () => {
    if (!leadId) return;
    try {
      const t = await getToken();
      const res = await apiClient.get("/api/crm/ai-agent-tasks", {
        params: { status: "pending", leadId },
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = res.data?.data || res.data;
      setTasks(data?.data || []);
    } catch {
      // Non-critical panel — fail silently rather than surface an error on the whole lead view.
    }
  }, [leadId, getToken]);

  React.useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const handleAction = async (id: string, action: "resolve" | "dismiss") => {
    setBusyId(id);
    try {
      const t = await getToken();
      await apiClient.post(`/api/crm/ai-agent-tasks/${id}/${action}`, {}, { headers: { Authorization: `Bearer ${t}` } });
      setTasks((prev) => prev.filter((task) => task.id !== id));
    } catch {
      // leave the task visible if the action failed
    } finally {
      setBusyId("");
    }
  };

  if (tasks.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="rounded-xl border p-3"
          style={{ borderColor: "var(--border-1)", background: "var(--bg-subtle)" }}
        >
          <div className="flex items-start gap-2">
            <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fuchsia-500" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold">Alex needs help</p>
              <p className="mt-0.5 break-words text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {task.question}
              </p>
              <p className="mt-1 text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                Waiting since {fmtLongDateTimeMDT(task.waitingSince)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => handleAction(task.id, "resolve")}
                disabled={busyId === task.id}
                className="flex h-6 w-6 items-center justify-center rounded-md text-emerald-600 transition hover:bg-emerald-500/10 disabled:opacity-50"
                title="Mark resolved"
              >
                {busyId === task.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => handleAction(task.id, "dismiss")}
                disabled={busyId === task.id}
                className="flex h-6 w-6 items-center justify-center rounded-md transition hover:bg-muted disabled:opacity-50"
                style={{ color: "var(--text-tertiary)" }}
                title="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

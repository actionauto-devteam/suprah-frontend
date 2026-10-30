"use client";

import { Bot, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { aiModeIndicatorLabel, type AiMode } from "@/lib/aiOperatingModes";

export interface AiAgentChipStatus {
  paused: boolean;
  pausedBy?: string;
  autoPausedUntil?: string;
  mode?: AiMode;
}

interface AiAgentStatusChipProps {
  status: AiAgentChipStatus;
  agentName: string;
  onToggle?: () => void;
}

export function AiAgentStatusChip({ status, agentName, onToggle }: AiAgentStatusChipProps) {
  const isAutoPaused =
    !status.paused &&
    Boolean(status.autoPausedUntil) &&
    new Date(status.autoPausedUntil as string) > new Date();
  const isPausedForDisplay = status.paused || isAutoPaused;
  const aiNotSending = Boolean(status.mode) && status.mode !== "live";

  return aiNotSending ? (
    <span
      role="status"
      title={aiModeIndicatorLabel(status.mode as AiMode, agentName)}
      data-testid="ai-agent-status"
      className="flex min-w-0 shrink-0 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 shadow-sm dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300"
    >
      <Bot className="h-3.5 w-3.5 shrink-0" />
      <span className="hidden max-w-[14rem] truncate sm:inline">{aiModeIndicatorLabel(status.mode as AiMode, agentName)}</span>
      <span className="sm:hidden">{status.mode === "off" ? "AI off" : "Training"}</span>
    </span>
  ) : (
    <button
      type="button"
      data-testid="ai-agent-status"
      onClick={onToggle}
      title={
        isPausedForDisplay
          ? `${agentName} is paused — click to resume`
          : `${agentName} is replying live — click to pause`
      }
      aria-label={
        isPausedForDisplay
          ? `${agentName} is paused — resume`
          : `${agentName} is replying live — pause`
      }
      className={cn(
        "flex min-w-0 shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm transition",
        isPausedForDisplay
          ? "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400"
          : "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-600 hover:bg-fuchsia-100 dark:border-fuchsia-400/20 dark:bg-fuchsia-400/10 dark:text-fuchsia-300",
      )}
    >
      <Bot className="h-3.5 w-3.5 shrink-0" />
      <span className="hidden max-w-[12rem] truncate sm:inline">
        {status.paused
          ? status.pausedBy
            ? `Paused by ${status.pausedBy}`
            : `${agentName} paused`
          : isAutoPaused
            ? "Auto-paused"
            : `${agentName} live`}
      </span>
      {isPausedForDisplay ? (
        <Play className="h-3 w-3 shrink-0" />
      ) : (
        <Pause className="h-3 w-3 shrink-0" />
      )}
    </button>
  );
}

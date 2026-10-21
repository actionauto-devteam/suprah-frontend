"use client";

import * as React from "react";
import { Bot, Check, Loader2, Trash2, XCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { useCrmUser } from "@/hooks/useCrmUser";

interface CoachAiPopoverProps {
  leadId: string;
  messageId: string;
  channel: "sms" | "webchat";
}

interface CoachingRule {
  id: string;
  instruction: string;
  createdByName?: string;
  updatedAt?: string;
}

const errorMessageOf = (error: unknown, fallback: string) => {
  const candidate = error as { response?: { data?: { message?: unknown } } };
  return typeof candidate.response?.data?.message === "string"
    ? candidate.response.data.message
    : fallback;
};

export function CoachAiPopover({ leadId, messageId, channel }: CoachAiPopoverProps) {
  const { getToken } = useAuth();
  const { user } = useCrmUser();
  const [open, setOpen] = React.useState(false);
  const [instruction, setInstruction] = React.useState("");
  const [rules, setRules] = React.useState<CoachingRule[]>([]);
  const [isLoadingRules, setIsLoadingRules] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const canManage = user?.role === "admin" || user?.role === "manager";

  const authHeaders = React.useCallback(async () => {
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}` } : undefined;
  }, [getToken]);

  const loadRules = React.useCallback(async () => {
    setIsLoadingRules(true);
    try {
      const headers = await authHeaders();
      const response = await apiClient.get("/api/crm/ai-coaching", {
        headers,
        params: { status: "active" },
      });
      const data = response.data?.data?.data || response.data?.data || [];
      setRules(Array.isArray(data) ? data : []);
    } catch {
      setRules([]);
    } finally {
      setIsLoadingRules(false);
    }
  }, [authHeaders]);

  React.useEffect(() => {
    if (open) void loadRules();
  }, [open, loadRules]);

  const submit = async () => {
    const text = instruction.trim();
    if (!text || isSubmitting) return;
    setIsSubmitting(true);
    setMessage(null);
    try {
      const headers = await authHeaders();
      const response = await apiClient.post(
        "/api/crm/ai-coaching",
        { leadId, messageId, channel, instruction: text },
        { headers },
      );
      const created = response.data?.data || response.data;
      setInstruction("");
      if (created?.pending) {
        setMessage("Sent to a manager for review. It won't change Alex's replies unless it's approved.");
      } else {
        setRules((current) => [created, ...current].filter(Boolean));
        setMessage("Saved for future Alex replies.");
      }
    } catch (error: unknown) {
      setMessage(errorMessageOf(error, "Could not save coaching."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (id: string, status: "disabled" | "deleted") => {
    try {
      const headers = await authHeaders();
      if (status === "deleted") {
        await apiClient.delete(`/api/crm/ai-coaching/${id}`, { headers });
      } else {
        await apiClient.patch(`/api/crm/ai-coaching/${id}`, { status }, { headers });
      }
      setRules((current) => current.filter((rule) => rule.id !== id));
    } catch (error: unknown) {
      setMessage(errorMessageOf(error, "Could not update coaching."));
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="underline underline-offset-2 transition hover:text-fuchsia-600 dark:hover:text-fuchsia-300"
          style={{ color: "inherit" }}
        >
          Coach your AI
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="z-200 w-[min(32rem,calc(100vw-1rem))] p-0"
        sideOffset={6}
      >
        <div className="max-h-[min(82dvh,36rem)] overflow-y-auto rounded-xl border border-amber-300 bg-amber-50 p-3 text-slate-900 shadow-xl dark:border-amber-400/40 dark:bg-[#2a2110] dark:text-amber-50">
          <div className="mb-2 flex items-center gap-2">
            <Bot className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
            <div className="min-w-0">
              <p className="text-[13px] font-bold">Coach your AI</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-200/80">
                {canManage
                  ? "Applies to future Alex replies for this dealership."
                  : "Your suggestion goes to a manager for review before it can change Alex."}
              </p>
            </div>
          </div>

          <textarea
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            placeholder="Next time, ask for the customer's preferred appointment time before offering a schedule."
            maxLength={800}
            className="min-h-24 w-full resize-none rounded-lg border border-amber-300 bg-white px-3 py-2 text-[13px] outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-amber-400/30 dark:border-amber-400/30 dark:bg-black/20 dark:placeholder:text-amber-100/40"
          />

          <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-amber-800 transition hover:bg-amber-100 dark:text-amber-100 dark:hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!instruction.trim() || isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-[12px] font-bold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Submit feedback
            </button>
          </div>

          {message && (
            <p className="mt-2 rounded-lg bg-amber-100 px-2.5 py-1.5 text-[11px] text-amber-800 dark:bg-white/10 dark:text-amber-100">
              {message}
            </p>
          )}

          <div className="mt-3 border-t border-amber-200 pt-3 dark:border-amber-400/20">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="text-[12px] font-bold">Active coaching</p>
              {isLoadingRules && <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />}
            </div>
            {rules.length === 0 ? (
              <p className="rounded-lg bg-white/60 px-2.5 py-2 text-[12px] text-amber-800 dark:bg-black/10 dark:text-amber-100/80">
                No active coaching yet.
              </p>
            ) : (
              <div className="space-y-1.5">
                {rules.slice(0, 8).map((rule) => (
                  <div key={rule.id} className="rounded-lg bg-white/70 p-2 text-[12px] dark:bg-black/15">
                    <p className="whitespace-pre-wrap break-words leading-relaxed">{rule.instruction}</p>
                    <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-amber-700 dark:text-amber-200/75">
                      <span className="truncate">{rule.createdByName || "Team member"}</span>
                      {canManage && (
                        <span className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateStatus(rule.id, "disabled")}
                            className="inline-flex items-center gap-1 rounded px-1.5 py-1 hover:bg-amber-100 dark:hover:bg-white/10"
                          >
                            <XCircle className="h-3 w-3" />
                            Disable
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStatus(rule.id, "deleted")}
                            className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-400/10"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </button>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

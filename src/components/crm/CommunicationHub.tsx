"use client";

import * as React from "react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { useLeads, Lead } from "@/hooks/useLeads";
import { cn } from "@/lib/utils";
import { getDashboardSocket } from "@/lib/dashboardSocket";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Phone,
  MessageSquare,
  PhoneIncoming,
  PhoneOutgoing,
  RefreshCw,
  Send,
} from "lucide-react";

type CommChannel = "sms" | "call";
type CommDirection = "inbound" | "outbound";

interface CommLog {
  _id: string;
  leadId?: string;
  channel: CommChannel;
  direction: CommDirection;
  status: string;
  from?: string;
  to?: string;
  body?: string;
  durationSeconds?: number;
  provider?: string;
  createdAt: string;
}

function formatDuration(seconds?: number) {
  if (!seconds || seconds <= 0) return "0m 00s";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export function CommunicationHub() {
  const { getToken } = useAuth();
  const { leads, isLoading: leadsLoading } = useLeads({ page: 1, limit: 100 });

  const [selectedLeadId, setSelectedLeadId] = React.useState<string>("");
  const [logs, setLogs] = React.useState<CommLog[]>([]);
  const [loadingLogs, setLoadingLogs] = React.useState(false);

  const [smsBody, setSmsBody] = React.useState("");
  const [smsBusy, setSmsBusy] = React.useState(false);

  const [callDirection, setCallDirection] =
    React.useState<CommDirection>("outbound");
  const [callStatus, setCallStatus] = React.useState("completed");
  const [callDuration, setCallDuration] = React.useState<number>(180);
  const [callNotes, setCallNotes] = React.useState("");
  const [callBusy, setCallBusy] = React.useState(false);

  const [inboundBody, setInboundBody] = React.useState("");
  const [inboundBusy, setInboundBusy] = React.useState(false);

  const selectedLead = React.useMemo(
    () => leads.find((lead) => lead._id === selectedLeadId) || null,
    [leads, selectedLeadId],
  );

  const loadLogs = React.useCallback(async () => {
    if (!selectedLeadId) {
      setLogs([]);
      return;
    }
    setLoadingLogs(true);
    try {
      const token = await getToken();
      const res = await apiClient.get(
        `/api/appointments/dashboard/communications?leadId=${selectedLeadId}&limit=120`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setLogs(res.data?.data?.logs || []);
    } catch {
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  }, [getToken, selectedLeadId]);

  React.useEffect(() => {
    if (!selectedLeadId && leads.length > 0) {
      setSelectedLeadId(leads[0]._id);
    }
  }, [leads, selectedLeadId]);

  React.useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  React.useEffect(() => {
    let socket: ReturnType<typeof getDashboardSocket> | null = null;
    let cancelled = false;

    const setupSocket = async () => {
      const token = await getToken();
      if (!token || cancelled) return;

      socket = getDashboardSocket(token);
      socket.on("communications:new", (payload: CommLog) => {
        if (payload?.leadId && payload.leadId === selectedLeadId) {
          setLogs((prev) => [payload, ...prev].slice(0, 120));
        }
      });
    };

    setupSocket();

    return () => {
      cancelled = true;
      if (socket) {
        socket.off("communications:new");
      }
    };
  }, [getToken, selectedLeadId]);

  const sendSms = async () => {
    if (!selectedLeadId || !smsBody.trim()) return;
    setSmsBusy(true);
    try {
      const token = await getToken();
      await apiClient.post(
        "/api/appointments/dashboard/communications/sms",
        {
          leadId: selectedLeadId,
          body: smsBody.trim(),
          to: selectedLead?.phone,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setSmsBody("");
      await loadLogs();
    } finally {
      setSmsBusy(false);
    }
  };

  const logCall = async () => {
    if (!selectedLeadId) return;
    setCallBusy(true);
    try {
      const token = await getToken();
      await apiClient.post(
        "/api/appointments/dashboard/communications/calls",
        {
          leadId: selectedLeadId,
          direction: callDirection,
          status: callStatus,
          to: selectedLead?.phone,
          durationSeconds: callDuration,
          notes: callNotes,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setCallNotes("");
      await loadLogs();
    } finally {
      setCallBusy(false);
    }
  };

  const logInboundSms = async () => {
    if (!selectedLeadId || !inboundBody.trim()) return;
    setInboundBusy(true);
    try {
      const token = await getToken();
      await apiClient.post(
        "/api/appointments/dashboard/communications/sms/inbound",
        {
          leadId: selectedLeadId,
          from: selectedLead?.phone,
          body: inboundBody.trim(),
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setInboundBody("");
      await loadLogs();
    } finally {
      setInboundBusy(false);
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col gap-3 p-3 sm:p-4 bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="space-y-1 min-w-0">
          <p className="text-xs uppercase tracking-widest text-[var(--text-tertiary)] font-semibold">
            Communication Hub
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            Built-in CRM messaging and call logging to replace external
            switching.
          </p>
        </div>
        <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto">
          <Select
            value={selectedLeadId}
            onValueChange={setSelectedLeadId}
            disabled={leadsLoading || leads.length === 0}
          >
            <SelectTrigger className="h-9 w-full sm:w-[340px] max-w-[100%] border border-[var(--border-primary)] bg-[var(--bg-input)] text-sm text-left">
              <SelectValue placeholder="Select a lead" />
            </SelectTrigger>
            <SelectContent align="end" position="popper" className="z-[80]">
              {leads.length === 0 ? (
                <SelectItem value="__empty__" disabled>
                  No leads found
                </SelectItem>
              ) : (
                leads.map((lead: Lead) => (
                  <SelectItem key={lead._id} value={lead._id}>
                    {`${lead.firstName || "Unknown"} ${lead.lastName || ""}`.trim()}{" "}
                    • {lead.phone || lead.email || "No contact"}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <button
            onClick={loadLogs}
            className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-md border border-[var(--border-primary)] hover:bg-[var(--bg-hover)]"
            title="Refresh timeline"
          >
            <RefreshCw
              className={cn("h-4 w-4", loadingLogs && "animate-spin")}
            />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 min-h-0 flex-1">
        <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] p-3 sm:p-4 space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-emerald-400" />
            <p className="text-sm font-semibold">Outbound SMS</p>
          </div>
          <textarea
            className="w-full min-h-[96px] rounded-md border border-[var(--border-primary)] bg-[var(--bg-input)] p-2 text-sm"
            placeholder="Write SMS reply to customer..."
            value={smsBody}
            onChange={(event) => setSmsBody(event.target.value)}
          />
          <button
            onClick={sendSms}
            disabled={smsBusy || !smsBody.trim() || !selectedLeadId}
            className="h-9 px-3 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 inline-flex items-center gap-2 text-sm font-medium"
          >
            <Send className="h-3.5 w-3.5" />
            {smsBusy ? "Sending..." : "Send SMS"}
          </button>

          <div className="pt-2 border-t border-[var(--border-primary)] space-y-2">
            <p className="text-xs uppercase tracking-widest text-[var(--text-tertiary)] font-semibold">
              Inbound SMS
            </p>
            <textarea
              className="w-full min-h-[72px] rounded-md border border-[var(--border-primary)] bg-[var(--bg-input)] p-2 text-sm"
              placeholder="Log inbound customer SMS text..."
              value={inboundBody}
              onChange={(event) => setInboundBody(event.target.value)}
            />
            <button
              onClick={logInboundSms}
              disabled={inboundBusy || !inboundBody.trim() || !selectedLeadId}
              className="h-9 px-3 rounded-md border border-[var(--border-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 text-sm font-medium"
            >
              {inboundBusy ? "Saving..." : "Log Inbound SMS"}
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] p-3 sm:p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-sky-400" />
            <p className="text-sm font-semibold">Calls</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={callDirection}
              onValueChange={(value) =>
                setCallDirection(value as CommDirection)
              }
            >
              <SelectTrigger className="h-9 w-full border border-[var(--border-primary)] bg-[var(--bg-input)] text-sm z-[50]">
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent align="start" position="popper" className="z-[80]">
                <SelectItem value="outbound">Outbound</SelectItem>
                <SelectItem value="inbound">Inbound</SelectItem>
              </SelectContent>
            </Select>

            <Select value={callStatus} onValueChange={setCallStatus}>
              <SelectTrigger className="h-9 w-full border border-[var(--border-primary)] bg-[var(--bg-input)] text-sm z-[50]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent align="start" position="popper" className="z-[80]">
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="missed">Missed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="text-xs text-[var(--text-tertiary)] mb-1">
              Duration (seconds)
            </p>
            <input
              type="number"
              min={0}
              className="w-full h-9 rounded-md border border-[var(--border-primary)] bg-[var(--bg-input)] px-2 text-sm"
              value={callDuration}
              onChange={(event) =>
                setCallDuration(Number(event.target.value) || 0)
              }
            />
          </div>

          <textarea
            className="w-full min-h-[96px] rounded-md border border-[var(--border-primary)] bg-[var(--bg-input)] p-2 text-sm"
            placeholder="Add call notes..."
            value={callNotes}
            onChange={(event) => setCallNotes(event.target.value)}
          />

          <button
            onClick={logCall}
            disabled={callBusy || !selectedLeadId}
            className="h-9 px-3 rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-sm font-medium"
          >
            {callBusy ? "Saving..." : "Log Call"}
          </button>
        </div>

        <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] p-3 sm:p-4 min-h-[360px] flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">Communication Timeline</p>
            <p className="text-xs text-[var(--text-tertiary)]">
              {logs.length} events
            </p>
          </div>
          <div className="flex-1 overflow-auto space-y-2 pr-1">
            {loadingLogs ? (
              <p className="text-sm text-[var(--text-tertiary)]">
                Loading timeline...
              </p>
            ) : logs.length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)]">
                No communication history yet.
              </p>
            ) : (
              logs.map((log) => (
                <div
                  key={log._id}
                  className="rounded-md border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
                      {log.channel === "sms" ? (
                        <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                      ) : log.direction === "inbound" ? (
                        <PhoneIncoming className="h-3.5 w-3.5 text-sky-400" />
                      ) : (
                        <PhoneOutgoing className="h-3.5 w-3.5 text-sky-400" />
                      )}
                      <span>{log.direction}</span>
                      <span className="text-[var(--text-tertiary)]">
                        {log.channel}
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Status: {log.status}
                    {log.durationSeconds !== undefined
                      ? ` · Duration: ${formatDuration(log.durationSeconds)}`
                      : ""}
                  </p>
                  {log.body ? (
                    <p className="text-sm mt-1.5 whitespace-pre-wrap">
                      {log.body}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CommunicationHub;

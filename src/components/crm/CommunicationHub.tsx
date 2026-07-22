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
  Clock,
  Car,
  Tag,
  Mail,
  Copy,
  Check,
  LayoutTemplate,
} from "lucide-react";
import { StatusPill } from "@/components/leads/atomic/StatusPill";

type CommChannel = "sms" | "call";
type CommDirection = "inbound" | "outbound";
type MobilePanel = "sms" | "calls" | "timeline";

const MOBILE_PANELS: { id: MobilePanel; label: string; icon: React.ElementType }[] = [
  { id: "sms", label: "SMS", icon: MessageSquare },
  { id: "calls", label: "Calls", icon: Phone },
  { id: "timeline", label: "Timeline", icon: Clock },
];

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

function formatRelativeTime(dateStr?: string) {
  if (!dateStr) return "No activity yet";
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function vehicleLabel(lead: Lead | null) {
  const v = lead?.vehicle;
  const text = [v?.year, v?.make, v?.model].filter(Boolean).join(" ");
  return text || "No vehicle on file";
}

const SMS_TEMPLATES: { label: string; text: (lead: Lead | null) => string }[] = [
  {
    label: "Follow-up",
    text: (lead) =>
      `Hi ${lead?.firstName || "there"}, just following up on your interest in the ${vehicleLabel(lead)}. Let me know if you have any questions!`,
  },
  {
    label: "Appt Reminder",
    text: (lead) =>
      `Hi ${lead?.firstName || "there"}, this is a reminder about your upcoming appointment. Looking forward to seeing you!`,
  },
  {
    label: "Test Drive",
    text: (lead) =>
      `Hi ${lead?.firstName || "there"}, would you like to schedule a test drive for the ${vehicleLabel(lead)}? Let me know a time that works.`,
  },
  {
    label: "Thank You",
    text: (lead) =>
      `Thank you, ${lead?.firstName || "there"}! It was great speaking with you. Don't hesitate to reach out with any questions.`,
  },
  {
    label: "Pricing Info",
    text: (lead) =>
      `Hi ${lead?.firstName || "there"}, I have pricing details ready for the ${vehicleLabel(lead)}. Want me to send them over?`,
  },
];

export function CommunicationHub() {
  const { getToken } = useAuth();
  const { leads, isLoading: leadsLoading, updateLeadStatus } = useLeads({
    page: 1,
    limit: 100,
  });

  const [selectedLeadId, setSelectedLeadId] = React.useState<string>("");
  const [mobilePanel, setMobilePanel] = React.useState<MobilePanel>("sms");
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

  const [contactBusy, setContactBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

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

  const markContacted = async () => {
    if (!selectedLeadId || selectedLead?.status === "Contacted") return;
    setContactBusy(true);
    try {
      await updateLeadStatus({ id: selectedLeadId, status: "Contacted" });
    } finally {
      setContactBusy(false);
    }
  };

  const copyPhone = async () => {
    if (!selectedLead?.phone) return;
    await navigator.clipboard.writeText(selectedLead.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const lastActivityAt = logs[0]?.createdAt;
  const smsSegments = smsBody.length === 0 ? 0 : Math.ceil(smsBody.length / 160);

  return (
    <div className="h-full min-h-0 flex flex-col gap-3 p-3 sm:p-4 bg-(--bg-base) text-(--text-primary)">
      <div className="rounded-lg border border-(--border-1) bg-(--bg-elevated) p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="space-y-1 min-w-0">
          <p className="text-xs uppercase tracking-widest text-(--text-tertiary) font-semibold truncate">
            Communication Hub
          </p>
          <p className="text-sm text-(--text-secondary)">
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
            <SelectTrigger className="h-10 sm:h-9 w-full sm:w-85 max-w-full border border-(--border-1) bg-(--input-bg) text-sm text-left">
              <SelectValue placeholder="Select a lead" />
            </SelectTrigger>
            <SelectContent align="end" position="popper" className="z-80">
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
            className="h-10 w-10 sm:h-9 sm:w-9 shrink-0 inline-flex items-center justify-center rounded-md border border-(--border-1) hover:bg-(--bg-hover)"
            title="Refresh timeline"
          >
            <RefreshCw
              className={cn("h-4 w-4", loadingLogs && "animate-spin")}
            />
          </button>
        </div>
      </div>

      {/* Mobile panel switcher — replaces the 3-up grid below `lg` */}
      <div
        className="flex gap-1.5 lg:hidden overflow-x-auto -mx-1 px-1"
        style={{ scrollbarWidth: "none" } as React.CSSProperties}
      >
        {MOBILE_PANELS.map((panel) => (
          <button
            key={panel.id}
            onClick={() => setMobilePanel(panel.id)}
            className={cn(
              "shrink-0 flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors",
              mobilePanel === panel.id
                ? "border-emerald-500/40 bg-emerald-500/10 text-(--accent-text)"
                : "border-(--border-1) text-(--text-secondary) hover:text-(--text-primary)",
            )}
          >
            <panel.icon className="h-3.5 w-3.5" />
            {panel.label}
            {panel.id === "timeline" && logs.length > 0 && (
              <span className="text-[10px] opacity-60">({logs.length})</span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 min-h-0 flex-1">
        <div
          className={cn(
            "rounded-lg border border-(--border-1) bg-(--bg-elevated) p-3 sm:p-4 space-y-3",
            mobilePanel === "sms" ? "block" : "hidden",
            "lg:block",
          )}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-emerald-400" />
            <p className="text-sm font-semibold">Outbound SMS</p>
          </div>

          {/* Conversation context */}
          <div className="rounded-md border border-(--border-1) bg-(--surface-2) p-2.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              {selectedLead?.status ? (
                <StatusPill status={selectedLead.status} />
              ) : (
                <span className="text-xs text-(--text-tertiary)">No lead selected</span>
              )}
              <span className="text-[11px] text-(--text-tertiary)">
                {formatRelativeTime(lastActivityAt)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-(--text-secondary)">
              <Car className="h-3.5 w-3.5 shrink-0 text-(--text-tertiary)" />
              <span className="truncate">{vehicleLabel(selectedLead)}</span>
            </div>
            {selectedLead?.source && (
              <div className="flex items-center gap-1.5 text-xs text-(--text-secondary)">
                <Tag className="h-3.5 w-3.5 shrink-0 text-(--text-tertiary)" />
                <span className="truncate">{selectedLead.source}</span>
              </div>
            )}
          </div>

          {/* Customer interaction shortcuts */}
          <div className="flex flex-wrap gap-1.5">
            <a
              href={selectedLead?.phone ? `tel:${selectedLead.phone}` : undefined}
              aria-disabled={!selectedLead?.phone}
              className={cn(
                "h-8 px-2.5 inline-flex items-center gap-1.5 rounded-md border border-(--border-1) text-xs font-medium hover:bg-(--bg-hover)",
                !selectedLead?.phone && "pointer-events-none opacity-40",
              )}
            >
              <Phone className="h-3.5 w-3.5" />
              Call
            </a>
            <a
              href={selectedLead?.email ? `mailto:${selectedLead.email}` : undefined}
              aria-disabled={!selectedLead?.email}
              className={cn(
                "h-8 px-2.5 inline-flex items-center gap-1.5 rounded-md border border-(--border-1) text-xs font-medium hover:bg-(--bg-hover)",
                !selectedLead?.email && "pointer-events-none opacity-40",
              )}
            >
              <Mail className="h-3.5 w-3.5" />
              Email
            </a>
            <button
              onClick={copyPhone}
              disabled={!selectedLead?.phone}
              className="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-md border border-(--border-1) text-xs font-medium hover:bg-(--bg-hover) disabled:opacity-40"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy #"}
            </button>
            <button
              onClick={markContacted}
              disabled={contactBusy || !selectedLeadId || selectedLead?.status === "Contacted"}
              className="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-md border border-(--border-1) text-xs font-medium hover:bg-(--bg-hover) disabled:opacity-40"
            >
              <Check className="h-3.5 w-3.5" />
              {contactBusy ? "Updating..." : "Mark Contacted"}
            </button>
          </div>

          {/* Message templates */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-(--text-tertiary) font-semibold">
              <LayoutTemplate className="h-3.5 w-3.5" />
              Templates
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SMS_TEMPLATES.map((template) => (
                <button
                  key={template.label}
                  onClick={() => setSmsBody(template.text(selectedLead))}
                  className="h-7 px-2.5 rounded-full border border-(--border-1) text-[11px] font-medium text-(--text-secondary) hover:bg-(--bg-hover) hover:text-(--text-primary)"
                >
                  {template.label}
                </button>
              ))}
            </div>
          </div>

          <textarea
            className="w-full min-h-24 rounded-md border border-(--border-1) bg-(--input-bg) p-2 text-sm"
            placeholder="Write SMS reply to customer..."
            value={smsBody}
            onChange={(event) => setSmsBody(event.target.value)}
          />
          <div className="flex items-center justify-between text-[11px] text-(--text-tertiary)">
            <span>{smsBody.length} chars</span>
            <span>{smsSegments > 1 ? `${smsSegments} segments` : "1 segment"}</span>
          </div>
          <button
            onClick={sendSms}
            disabled={smsBusy || !smsBody.trim() || !selectedLeadId}
            className="h-10 sm:h-9 px-3 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 inline-flex items-center gap-2 text-sm font-medium text-white w-full sm:w-auto justify-center sm:justify-start"
          >
            <Send className="h-3.5 w-3.5" />
            {smsBusy ? "Sending..." : "Send SMS"}
          </button>

          <div className="pt-2 border-t border-(--border-1) space-y-2">
            <p className="text-xs uppercase tracking-widest text-(--text-tertiary) font-semibold">
              Inbound SMS
            </p>
            <textarea
              className="w-full min-h-18 rounded-md border border-(--border-1) bg-(--input-bg) p-2 text-sm"
              placeholder="Log inbound customer SMS text..."
              value={inboundBody}
              onChange={(event) => setInboundBody(event.target.value)}
            />
            <button
              onClick={logInboundSms}
              disabled={inboundBusy || !inboundBody.trim() || !selectedLeadId}
              className="h-10 sm:h-9 px-3 rounded-md border border-(--border-1) hover:bg-(--bg-hover) disabled:opacity-50 text-sm font-medium w-full sm:w-auto"
            >
              {inboundBusy ? "Saving..." : "Log Inbound SMS"}
            </button>
          </div>
        </div>

        <div
          className={cn(
            "rounded-lg border border-(--border-1) bg-(--bg-elevated) p-3 sm:p-4 space-y-3",
            mobilePanel === "calls" ? "block" : "hidden",
            "lg:block",
          )}
        >
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
              <SelectTrigger className="h-10 sm:h-9 w-full border border-(--border-1) bg-(--input-bg) text-sm z-50">
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent align="start" position="popper" className="z-80">
                <SelectItem value="outbound">Outbound</SelectItem>
                <SelectItem value="inbound">Inbound</SelectItem>
              </SelectContent>
            </Select>

            <Select value={callStatus} onValueChange={setCallStatus}>
              <SelectTrigger className="h-10 sm:h-9 w-full border border-(--border-1) bg-(--input-bg) text-sm z-50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent align="start" position="popper" className="z-80">
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="missed">Missed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="text-xs text-(--text-tertiary) mb-1">
              Duration (seconds)
            </p>
            <input
              type="number"
              min={0}
              className="w-full h-10 sm:h-9 rounded-md border border-(--border-1) bg-(--input-bg) px-2 text-sm"
              value={callDuration}
              onChange={(event) =>
                setCallDuration(Number(event.target.value) || 0)
              }
            />
          </div>

          <textarea
            className="w-full min-h-24 rounded-md border border-(--border-1) bg-(--input-bg) p-2 text-sm"
            placeholder="Add call notes..."
            value={callNotes}
            onChange={(event) => setCallNotes(event.target.value)}
          />

          <button
            onClick={logCall}
            disabled={callBusy || !selectedLeadId}
            className="h-10 sm:h-9 px-3 rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-sm font-medium text-white w-full sm:w-auto"
          >
            {callBusy ? "Saving..." : "Log Call"}
          </button>
        </div>

        <div
          className={cn(
            "rounded-lg border border-(--border-1) bg-(--bg-elevated) p-3 sm:p-4 min-h-90 lg:min-h-0",
            mobilePanel === "timeline" ? "flex flex-col" : "hidden",
            "lg:flex lg:flex-col",
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">Communication Timeline</p>
            <p className="text-xs text-(--text-tertiary)">
              {logs.length} events
            </p>
          </div>
          <div className="flex-1 overflow-auto space-y-2 pr-1">
            {loadingLogs ? (
              <p className="text-sm text-(--text-tertiary)">
                Loading timeline...
              </p>
            ) : logs.length === 0 ? (
              <p className="text-sm text-(--text-tertiary)">
                No communication history yet.
              </p>
            ) : (
              logs.map((log) => (
                <div
                  key={log._id}
                  className="rounded-md border border-(--border-1) bg-(--surface-2) p-2.5"
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
                      <span className="text-(--text-tertiary)">
                        {log.channel}
                      </span>
                    </div>
                    <span className="text-[10px] text-(--text-tertiary)">
                      {new Date(log.createdAt).toLocaleString('en-US', { timeZone: 'America/Denver' })}
                    </span>
                  </div>
                  <p className="text-xs text-(--text-secondary) mt-1">
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

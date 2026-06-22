"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  Video,
  Gift,
  Loader2,
  RefreshCw,
  UserPlus,
  CheckCircle2,
  Clock,
  PhoneCall,
  X,
  AlertCircle,
  User,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { getDashboardSocket } from "@/lib/dashboardSocket";
import { JitsiMeet } from "@/app/(dashboard)/crm/supra-space/JitsiMeet";

// ─── Types ────────────────────────────────────────────────────────────────────

type LeadStatus = "pending" | "contacted" | "converted" | "closed";
type CallType = "voice" | "video";

interface CallData {
  domain: string;
  room: string;
  jitsiRoom: string;
  jwt: string;
  publicJoinUrl: string;
  callType: CallType;
  leadName: string;
  leadPhone: string;
  leadEmail: string | null;
}

interface ReferralLead {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  requestType: CallType;
  referralCode: string;
  status: LeadStatus;
  notes?: string;
  createdAt: string;
  referrerId?: {
    _id: string;
    name: string;
    email: string;
    referralCode: string;
    avatarUrl?: string;
  };
  convertedUserId?: {
    _id: string;
    name: string;
    email: string;
  };
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Pending",
    color:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    icon: <Clock className="h-3 w-3" />,
  },
  contacted: {
    label: "Contacted",
    color:
      "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    icon: <PhoneCall className="h-3 w-3" />,
  },
  converted: {
    label: "Converted",
    color:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  closed: {
    label: "Closed",
    color:
      "bg-zinc-500/10 text-zinc-500 dark:text-zinc-500 border-zinc-500/20",
    icon: <X className="h-3 w-3" />,
  },
};

const FILTER_TABS: { key: "all" | LeadStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "contacted", label: "Contacted" },
  { key: "converted", label: "Converted" },
  { key: "closed", label: "Closed" },
];

function ini(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Convert Modal ────────────────────────────────────────────────────────────

interface ConvertModalProps {
  lead: ReferralLead;
  token: string;
  onClose: () => void;
  onConverted: (lead: ReferralLead) => void;
}

function ConvertModal({ lead, token, onClose, onConverted }: ConvertModalProps) {
  const [email, setEmail] = React.useState(lead.email || "");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [result, setResult] = React.useState<{
    name: string;
    email: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await apiClient.post(
        `/api/referral-leads/crm-leads/${lead._id}/convert`,
        { email: email.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = res.data?.data;
      setResult(data);
      onConverted({ ...lead, status: "converted" });
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Failed to create account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <UserPlus className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Create Customer Account</p>
              <p className="text-[11px] text-zinc-500">{lead.name} · {lead.phone}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">
          {result ? (
            // Success state
            <div className="space-y-5 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              </div>
              <div>
                <p className="text-base font-bold text-white mb-1">Account Created!</p>
                <p className="text-sm text-zinc-400">{result.name}</p>
                <p className="text-sm text-zinc-400">{result.email}</p>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">
                  Email Sent to Customer
                </p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Login credentials have been sent directly to <span className="text-white font-medium">{result.email}</span>. The customer can log in using their email and the temporary password provided in the email.
                </p>
              </div>
              <Button
                onClick={onClose}
                className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold"
              >
                Done
              </Button>
            </div>
          ) : (
            // Form state
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-zinc-500 leading-relaxed">
                Verify the customer email below and click <strong className="text-zinc-300">Create Account</strong>. A temporary password will be sent directly to the customer via email — you won't see it.
              </p>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  Customer Email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@email.com"
                  required
                  className="h-10 rounded-xl bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:border-emerald-500/50 focus-visible:ring-0"
                />
              </div>

              <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Password</p>
                <p className="text-xs text-zinc-400">A temporary password will be auto-generated and sent <strong className="text-zinc-300">directly to the customer's email</strong> for security. You will not see it.</p>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2.5">
                  <AlertCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 h-10 rounded-xl border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Pre-Call Modal ───────────────────────────────────────────────────────────

interface PreCallModalProps {
  lead: ReferralLead;
  token: string;
  onClose: () => void;
  onStartJitsi: (data: CallData) => void;
}

function PreCallModal({ lead, token, onClose, onStartJitsi }: PreCallModalProps) {
  const [step, setStep] = React.useState<"setup" | "loading" | "ready" | "error">("setup");
  const [callData, setCallData] = React.useState<CallData | null>(null);
  const [error, setError] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  const prepareCall = async () => {
    setStep("loading");
    setError("");
    try {
      const res = await apiClient.post(
        `/api/referral-leads/crm-leads/${lead._id}/start-call`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCallData(res.data?.data);
      setStep("ready");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create call room.");
      setStep("error");
    }
  };

  const copyLink = () => {
    if (!callData) return;
    navigator.clipboard.writeText(callData.publicJoinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center border",
              lead.requestType === "voice"
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-blue-500/10 border-blue-500/20"
            )}>
              {lead.requestType === "voice"
                ? <Phone className="h-4 w-4 text-emerald-400" />
                : <Video className="h-4 w-4 text-blue-400" />}
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                {lead.requestType === "voice" ? "Voice" : "Video"} Call
              </p>
              <p className="text-[11px] text-zinc-500">{lead.name} · {lead.phone}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">

          {/* ── Step 1: Setup ───────────────────────────── */}
          {step === "setup" && (
            <>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                You&apos;re about to call <span className="font-semibold text-zinc-300">{lead.name}</span> at {lead.phone}.
                Click Start Call to prepare the room.
              </p>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 h-10 rounded-xl border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={prepareCall}
                  className={cn(
                    "flex-1 h-10 rounded-xl font-bold text-sm gap-2 text-white",
                    lead.requestType === "voice"
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "bg-blue-600 hover:bg-blue-500"
                  )}
                >
                  {lead.requestType === "voice"
                    ? <Phone className="h-3.5 w-3.5" />
                    : <Video className="h-3.5 w-3.5" />}
                  Start Call
                </Button>
              </div>
            </>
          )}

          {/* ── Step 2: Loading ─────────────────────────── */}
          {step === "loading" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-7 w-7 text-primary animate-spin" />
              <p className="text-xs text-zinc-500">Preparing call room…</p>
            </div>
          )}

          {/* ── Step 3: Error ───────────────────────────── */}
          {step === "error" && (
            <>
              <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2.5">
                <AlertCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setStep("setup")}
                className="w-full h-10 rounded-xl border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                Back
              </Button>
            </>
          )}

          {/* ── Step 4: Ready ───────────────────────────── */}
          {step === "ready" && callData && (
            <>
              {/* Email sent notice */}
              {callData.leadEmail ? (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-emerald-400 leading-relaxed">
                    Invitation email sent to <span className="font-semibold">{callData.leadEmail}</span>
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-amber-400 leading-relaxed">
                    No email on file — share the link manually.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  Share this link with {lead.name}
                </p>
                <div className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5">
                  <p className="text-xs text-zinc-300 flex-1 truncate font-mono">
                    {callData.publicJoinUrl}
                  </p>
                  <button
                    onClick={copyLink}
                    className="shrink-0 text-zinc-400 hover:text-white transition-colors"
                  >
                    {copied
                      ? <Check className="h-4 w-4 text-emerald-400" />
                      : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-zinc-600">
                  Call {lead.name} at {lead.phone}, then share this link so they can join.
                </p>
              </div>

              <Button
                onClick={() => onStartJitsi(callData)}
                className={cn(
                  "w-full h-11 rounded-xl font-bold text-sm gap-2 text-white shadow-lg",
                  lead.requestType === "voice"
                    ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40"
                    : "bg-blue-600 hover:bg-blue-500 shadow-blue-900/40"
                )}
              >
                {lead.requestType === "voice"
                  ? <Phone className="h-4 w-4" />
                  : <Video className="h-4 w-4" />}
                Join Call Now
              </Button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Lead Card ────────────────────────────────────────────────────────────────

interface LeadCardProps {
  lead: ReferralLead;
  token: string;
  onStatusChange: (id: string, status: LeadStatus) => void;
  onOpenConvert: (lead: ReferralLead) => void;
  onOpenCall: (lead: ReferralLead) => void;
}

function LeadCard({ lead, token, onStatusChange, onOpenConvert, onOpenCall }: LeadCardProps) {
  const [marking, setMarking] = React.useState(false);
  const cfg = STATUS_CONFIG[lead.status];

  const markContacted = async () => {
    setMarking(true);
    try {
      await apiClient.patch(
        `/api/referral-leads/crm-leads/${lead._id}/status`,
        { status: "contacted" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onStatusChange(lead._id, "contacted");
    } catch {
      // silent — UI stays unchanged
    } finally {
      setMarking(false);
    }
  };

  const formattedDate = new Date(lead.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const formattedTime = new Date(lead.createdAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/60 p-5 space-y-4 transition-shadow hover:shadow-md dark:hover:shadow-none">
      {/* Top row: avatar + info + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
            <span className="text-sm font-black text-violet-500">{ini(lead.name)}</span>
          </div>

          <div className="min-w-0">
            <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">{lead.name}</p>
            <p className="text-xs text-zinc-500">{lead.phone}</p>
            {lead.email && (
              <p className="text-[11px] text-zinc-500 truncate">{lead.email}</p>
            )}
          </div>
        </div>

        {/* Status badge */}
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border shrink-0",
            cfg.color
          )}
        >
          {cfg.icon}
          {cfg.label}
        </span>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Call type */}
        <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
          {lead.requestType === "voice" ? (
            <Phone className="h-3 w-3" />
          ) : (
            <Video className="h-3 w-3" />
          )}
          {lead.requestType === "voice" ? "Voice Call" : "Video Call"}
        </span>

        <span className="text-zinc-300 dark:text-zinc-700">·</span>

        {/* Date */}
        <span className="text-[11px] text-zinc-400">
          {formattedDate} at {formattedTime}
        </span>
      </div>

      {/* Referrer */}
      {lead.referrerId && (
        <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-500">
          <User className="h-3 w-3 shrink-0" />
          <span>
            Referred by{" "}
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              {lead.referrerId.name}
            </span>{" "}
            <span className="text-zinc-400">·</span>{" "}
            <span className="font-mono">{lead.referrerId.referralCode}</span>
          </span>
        </div>
      )}

      {/* Converted account */}
      {lead.convertedUserId && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            Account created — {lead.convertedUserId.name} ({lead.convertedUserId.email})
          </p>
        </div>
      )}

      {/* Notes */}
      {lead.notes && (
        <p className="text-xs text-zinc-500 italic border-l-2 border-zinc-300 dark:border-zinc-700 pl-3">
          {lead.notes}
        </p>
      )}

      {/* Actions */}
      {(lead.status === "pending" || lead.status === "contacted") && (
        <div className="flex flex-col gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/60 mt-1">
          {/* Primary: Call button — full width */}
          <Button
            size="sm"
            onClick={() => onOpenCall(lead)}
            className={cn(
              "w-full h-9 rounded-xl text-xs font-semibold text-white gap-1.5",
              lead.requestType === "voice"
                ? "bg-emerald-600 hover:bg-emerald-500"
                : "bg-blue-600 hover:bg-blue-500"
            )}
          >
            {lead.requestType === "voice"
              ? <Phone className="h-3.5 w-3.5" />
              : <Video className="h-3.5 w-3.5" />}
            {lead.requestType === "voice" ? "Start Voice Call" : "Start Video Call"}
          </Button>

          {/* Secondary actions side by side */}
          <div className="flex gap-2">
            {lead.status === "pending" && (
              <Button
                size="sm"
                variant="outline"
                onClick={markContacted}
                disabled={marking}
                className="flex-1 h-8 rounded-xl text-xs border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
              >
                {marking
                  ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  : <PhoneCall className="h-3 w-3 mr-1" />}
                Contacted
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenConvert(lead)}
              className="flex-1 h-8 rounded-xl text-xs border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <UserPlus className="h-3 w-3 mr-1" />
              Create Account
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReferralsPage() {
  const router = useRouter();

  const [token, setToken] = React.useState<string | null>(null);
  const [leads, setLeads] = React.useState<ReferralLead[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [filter, setFilter] = React.useState<"all" | LeadStatus>("all");
  const [convertTarget, setConvertTarget] = React.useState<ReferralLead | null>(null);
  const [callTarget, setCallTarget] = React.useState<ReferralLead | null>(null);
  const [activeCall, setActiveCall] = React.useState<CallData | null>(null);
  const [mounted, setMounted] = React.useState(false);

  // Auth check
  React.useEffect(() => {
    const t = localStorage.getItem("crm_token");
    if (!t) {
      router.replace("/crm");
      return;
    }
    setToken(t);
    setMounted(true);
  }, [router]);

  const fetchLeads = React.useCallback(
    async (isRefresh = false) => {
      if (!token) return;
      if (isRefresh) setRefreshing(true);
      try {
        const res = await apiClient.get("/api/referral-leads/crm-leads", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLeads(res.data?.data || []);
      } catch {
        // silent
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  React.useEffect(() => {
    if (token) fetchLeads();
  }, [token, fetchLeads]);

  // Real-time: listen for new referral leads emitted by the backend
  React.useEffect(() => {
    if (!token) return;

    const socket = getDashboardSocket(token);

    const onNewLead = (lead: ReferralLead) => {
      setLeads((prev) => {
        // Avoid duplicates if REST and socket race
        if (prev.some((l) => l._id === lead._id)) return prev;
        return [lead, ...prev];
      });
    };

    socket.on("referral:new_lead", onNewLead);

    return () => {
      socket.off("referral:new_lead", onNewLead);
    };
  }, [token]);

  const handleStatusChange = (id: string, status: LeadStatus) => {
    setLeads((prev) =>
      prev.map((l) => (l._id === id ? { ...l, status } : l))
    );
  };

  const handleConverted = (updatedLead: ReferralLead) => {
    setLeads((prev) =>
      prev.map((l) => (l._id === updatedLead._id ? updatedLead : l))
    );
  };

  const filtered = filter === "all" ? leads : leads.filter((l) => l.status === filter);

  const counts: Record<string, number> = {
    all: leads.length,
    pending: leads.filter((l) => l.status === "pending").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    converted: leads.filter((l) => l.status === "converted").length,
    closed: leads.filter((l) => l.status === "closed").length,
  };

  return (
    <>
      <div
        className={cn(
          "min-h-full w-full bg-zinc-100 dark:bg-zinc-950 flex flex-col transition-all duration-700",
          mounted ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-zinc-800/60 bg-zinc-100/85 dark:bg-zinc-950/80 backdrop-blur-xl">
          <div className="flex items-center gap-3 h-14 sm:h-16 px-4 sm:px-6 max-w-6xl mx-auto">
            <button
              onClick={() => router.push("/crm/dashboard")}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                <Gift className="h-4 w-4 text-violet-500" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-zinc-900 dark:text-white tracking-tight">
                  Referral Leads
                </p>
                <p className="text-[10px] text-zinc-500 hidden sm:block">
                  {counts.all} total · {counts.pending} pending
                </p>
              </div>
            </div>

            <button
              onClick={() => fetchLeads(true)}
              disabled={refreshing}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">

          {/* Filter tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150",
                  filter === tab.key
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent"
                    : "bg-white dark:bg-zinc-900/60 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-200"
                )}
              >
                {tab.label}
                {counts[tab.key] > 0 && (
                  <span
                    className={cn(
                      "text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-4.5 text-center",
                      filter === tab.key
                        ? "bg-white/20 text-white dark:bg-black/20 dark:text-zinc-900"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                    )}
                  >
                    {counts[tab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="h-7 w-7 text-violet-500 animate-spin" />
              <p className="text-xs text-zinc-500">Loading referral leads…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Gift className="h-6 w-6 text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                  {filter === "all" ? "No referral leads yet" : `No ${filter} leads`}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {filter === "all"
                    ? "Leads will appear here when customers use a referral link."
                    : "Change the filter to see other leads."}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((lead) => (
                <LeadCard
                  key={lead._id}
                  lead={lead}
                  token={token!}
                  onStatusChange={handleStatusChange}
                  onOpenConvert={setConvertTarget}
                  onOpenCall={setCallTarget}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {convertTarget && (
        <ConvertModal
          lead={convertTarget}
          token={token!}
          onClose={() => setConvertTarget(null)}
          onConverted={(updated) => {
            handleConverted(updated);
            setConvertTarget(null);
          }}
        />
      )}

      {callTarget && !activeCall && (
        <PreCallModal
          lead={callTarget}
          token={token!}
          onClose={() => setCallTarget(null)}
          onStartJitsi={(data) => {
            setActiveCall(data);
            setCallTarget(null);
          }}
        />
      )}

      {activeCall && (
        <JitsiMeet
          roomName={activeCall.jitsiRoom}
          displayName="Representative"
          jwt={activeCall.jwt}
          domain={activeCall.domain}
          onClose={() => setActiveCall(null)}
        />
      )}

    </>
  );
}

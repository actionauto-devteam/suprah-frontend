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
  Link2,
  Users,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Trash2,
  Car,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { getDashboardSocket } from "@/lib/dashboardSocket";
import { JitsiMeet } from "@/app/(dashboard)/crm/supra-space/JitsiMeet";


type LeadStatus = "pending" | "contacted" | "converted" | "closed";
type CallType = "voice" | "video";
type AccountType = "customer" | "driver";

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = error as { response?: { data?: { message?: string } } };
    return response.response?.data?.message || fallback;
  }
  return error instanceof Error ? error.message || fallback : fallback;
}

function acctLabel(t: AccountType) {
  return t === "driver" ? "Driver" : "Customer";
}

interface RegisteredUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

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


// ─── Account type toggle (Customer / Driver) — dark modal variant ─────────────

interface AccountTypeToggleProps {
  value: AccountType;
  onChange: (t: AccountType) => void;
  disabled?: boolean;
}

function AccountTypeToggle({ value, onChange, disabled }: AccountTypeToggleProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(["customer", "driver"] as AccountType[]).map((t) => {
        const active = value === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            disabled={disabled}
            className={cn(
              "flex items-center justify-center gap-1.5 h-10 rounded-xl border text-xs font-bold transition-colors disabled:opacity-50",
              active
                ? t === "customer"
                  ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                  : "bg-orange-500/10 border-orange-500/50 text-orange-400"
                : "border-zinc-700 bg-zinc-800/40 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
            )}
          >
            {t === "customer"
              ? <User className="h-3.5 w-3.5" />
              : <Car className="h-3.5 w-3.5" />}
            {acctLabel(t)}
          </button>
        );
      })}
    </div>
  );
}


interface ConvertModalProps {
  lead: ReferralLead;
  token: string;
  onClose: () => void;
  onConverted: (lead: ReferralLead) => void;
}

function ConvertModal({ lead, token, onClose, onConverted }: ConvertModalProps) {
  const [email, setEmail] = React.useState(lead.email || "");
  const [accountType, setAccountType] = React.useState<AccountType>("customer");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [result, setResult] = React.useState<{
    name: string;
    email: string;
    accountType?: AccountType;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await apiClient.post(
        `/api/referral-leads/crm-leads/${lead._id}/convert`,
        { email: email.trim(), accountType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = res.data?.data;
      setResult(data);
      onConverted({ ...lead, status: "converted" });
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to create account. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        { }
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-5 border-b border-zinc-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn(
              "w-8 h-8 rounded-lg border flex items-center justify-center shrink-0",
              accountType === "driver"
                ? "bg-orange-500/10 border-orange-500/20"
                : "bg-emerald-500/10 border-emerald-500/20"
            )}>
              <UserPlus className={cn(
                "h-4 w-4",
                accountType === "driver" ? "text-orange-400" : "text-emerald-400"
              )} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">
                Create {acctLabel(accountType)} Account
              </p>
              <p className="text-[11px] text-zinc-500 truncate">{lead.name} · {lead.phone}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {result ? (
            <div className="space-y-5 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              </div>
              <div>
                <p className="text-base font-bold text-white mb-1">
                  {acctLabel(accountType)} Account Created!
                </p>
                <p className="text-sm text-zinc-400">{result.name}</p>
                <p className="text-sm text-zinc-400">{result.email}</p>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">
                  Email Sent to {acctLabel(accountType)}
                </p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Login credentials have been sent directly to <span className="text-white font-medium">{result.email}</span>. The {acctLabel(accountType).toLowerCase()} can log in using their email and the temporary password provided in the email.
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-zinc-500 leading-relaxed">
                Choose the account type, verify the email below, and click <strong className="text-zinc-300">Create Account</strong>. A temporary password will be sent directly to the {acctLabel(accountType).toLowerCase()} via email — you won&apos;t see it.
              </p>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  Account Type
                </label>
                <AccountTypeToggle
                  value={accountType}
                  onChange={setAccountType}
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  {acctLabel(accountType)} Email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={accountType === "driver" ? "driver@email.com" : "customer@email.com"}
                  required
                  className={cn(
                    "h-10 rounded-xl bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:ring-0",
                    accountType === "driver"
                      ? "focus-visible:border-orange-500/50"
                      : "focus-visible:border-emerald-500/50"
                  )}
                />
              </div>

              <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Password</p>
                <p className="text-xs text-zinc-400">A temporary password will be auto-generated and sent <strong className="text-zinc-300">directly to the {acctLabel(accountType).toLowerCase()}&apos;s email</strong> for security. You will not see it.</p>
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
                  className={cn(
                    "flex-1 h-10 rounded-xl text-white text-sm font-semibold disabled:opacity-50",
                    accountType === "driver"
                      ? "bg-orange-600 hover:bg-orange-500"
                      : "bg-emerald-600 hover:bg-emerald-500"
                  )}
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
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to create call room."));
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
      <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">

        { }
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-5 border-b border-zinc-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center border shrink-0",
              lead.requestType === "voice"
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-blue-500/10 border-blue-500/20"
            )}>
              {lead.requestType === "voice"
                ? <Phone className="h-4 w-4 text-emerald-400" />
                : <Video className="h-4 w-4 text-blue-400" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">
                {lead.requestType === "voice" ? "Voice" : "Video"} Call
              </p>
              <p className="text-[11px] text-zinc-500 truncate">{lead.name} · {lead.phone}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">

          { }
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

          { }
          {step === "loading" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-7 w-7 text-primary animate-spin" />
              <p className="text-xs text-zinc-500">Preparing call room…</p>
            </div>
          )}

          { }
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

          { }
          {step === "ready" && callData && (
            <>
              { }
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
                    className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
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
      { }
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          { }
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

        { }
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

      { }
      <div className="flex items-center gap-3 flex-wrap">
        { }
        <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
          {lead.requestType === "voice" ? (
            <Phone className="h-3 w-3" />
          ) : (
            <Video className="h-3 w-3" />
          )}
          {lead.requestType === "voice" ? "Voice Call" : "Video Call"}
        </span>

        <span className="text-zinc-300 dark:text-zinc-700">·</span>

        { }
        <span className="text-[11px] text-zinc-400">
          {formattedDate} at {formattedTime}
        </span>
      </div>

      { }
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

      { }
      {lead.convertedUserId && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            Account created — {lead.convertedUserId.name} ({lead.convertedUserId.email})
          </p>
        </div>
      )}

      { }
      {lead.notes && (
        <p className="text-xs text-zinc-500 italic border-l-2 border-zinc-300 dark:border-zinc-700 pl-3">
          {lead.notes}
        </p>
      )}

      { }
      {(lead.status === "pending" || lead.status === "contacted") && (
        <div className="flex flex-col gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/60 mt-1">
          { }
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

          { }
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


interface InviteLinkModalProps {
  token: string;
  onClose: () => void;
}

const INVITE_SHARE_PLATFORMS = [
  {
    name: "WhatsApp",
    bg: "bg-[#25D366] hover:bg-[#1da851]",
    getUrl: (link: string) =>
      `https://wa.me/?text=${encodeURIComponent(`You're invited! Click the link below to create your account:\n\n${link}\n\nThis link expires in 24 hours.`)}`,
  },
  {
    name: "Messenger",
    bg: "bg-[#0084FF] hover:bg-[#006fd4]",
    getUrl: (link: string) =>
      `fb-messenger://share?link=${encodeURIComponent(link)}`,
  },
  {
    name: "Viber",
    bg: "bg-[#7360F2] hover:bg-[#5d4dd4]",
    getUrl: (link: string) =>
      `viber://forward?text=${encodeURIComponent(`You're invited! Click the link below to create your account:\n\n${link}\n\nThis link expires in 24 hours.`)}`,
  },
  {
    name: "Telegram",
    bg: "bg-[#229ED9] hover:bg-[#1a8abf]",
    getUrl: (link: string) =>
      `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("You're invited! Create your account using this link.")}`,
  },
  {
    name: "Gmail",
    bg: "bg-[#EA4335] hover:bg-[#d33829]",
    getUrl: (link: string) =>
      `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent("You're invited!")}&body=${encodeURIComponent(`You're invited to create an account!\n\nClick the link below to get started:\n${link}\n\nThis link expires in 24 hours.`)}`,
  },
];

function InviteLinkModal({ token, onClose }: InviteLinkModalProps) {
  const [accountType, setAccountType] = React.useState<AccountType>("customer");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [invite, setInvite] = React.useState<{ shortCode: string; link: string; expiresAt: string; accountType?: AccountType } | null>(null);
  const [copied, setCopied] = React.useState(false);

  const handleTypeChange = (t: AccountType) => {
    setAccountType(t);
    // A generated link is locked to its type — clear it when switching
    setInvite(null);
    setError("");
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setInvite(null);
    try {
      const res = await apiClient.post(
        "/api/crm/customer-invites/generate",
        { count: 1, multiUse: true, accountType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const list = res.data?.data?.invites ?? [];
      if (list.length > 0) setInvite(list[0]);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to generate invite link."));
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (!invite) return;
    navigator.clipboard.writeText(invite.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (!invite) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "You're invited!",
          text: `Click the link below to create your ${acctLabel(accountType).toLowerCase()} account.`,
          url: invite.link,
        });
      } catch { }
    } else {
      copyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[85dvh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        { }
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "w-8 h-8 rounded-lg border flex items-center justify-center shrink-0",
              accountType === "driver"
                ? "bg-orange-500/10 border-orange-500/20"
                : "bg-emerald-500/10 border-emerald-500/20"
            )}>
              <Link2 className={cn(
                "h-4 w-4",
                accountType === "driver" ? "text-orange-400" : "text-emerald-400"
              )} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Generate Invite Link</p>
              <p className="text-xs text-zinc-400">Multi-use · expires in 24 hours</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          { }
          <div className="space-y-1.5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              Account Type
            </p>
            <AccountTypeToggle
              value={accountType}
              onChange={handleTypeChange}
              disabled={loading}
            />
            <p className="text-[11px] text-zinc-600">
              {accountType === "driver"
                ? "People who open this link will sign up with a driver account."
                : "People who open this link will sign up with a customer account."}
            </p>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading}
            className={cn(
              "w-full h-11 text-sm text-white font-semibold",
              accountType === "driver"
                ? "bg-orange-600 hover:bg-orange-500"
                : "bg-emerald-600 hover:bg-emerald-500"
            )}
          >
            {loading
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</>
              : `Generate ${acctLabel(accountType)} Link`}
          </Button>

          {error && (
            <p className="text-sm text-red-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </p>
          )}

          {invite && (
            <div className="space-y-4">
              { }
              <div className="flex items-center gap-2">
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-widest",
                  accountType === "driver"
                    ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                )}>
                  {accountType === "driver"
                    ? <Car className="h-3 w-3" />
                    : <User className="h-3 w-3" />}
                  {acctLabel(accountType)} Invite
                </span>
              </div>

              { }
              <div className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3">
                <span className="flex-1 text-xs text-zinc-300 truncate font-mono">{invite.link}</span>
                <button
                  onClick={copyLink}
                  className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 transition-colors"
                  title="Copy link"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>

              { }
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">Share via</p>
                <div className="grid grid-cols-3 gap-2">
                  {INVITE_SHARE_PLATFORMS.map((p) => (
                    <a
                      key={p.name}
                      href={p.getUrl(invite.link)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "flex items-center justify-center py-2.5 rounded-xl text-xs font-semibold text-white transition-colors",
                        p.bg
                      )}
                    >
                      {p.name}
                    </a>
                  ))}
                  <button
                    onClick={handleNativeShare}
                    className="flex items-center justify-center py-2.5 rounded-xl text-xs font-semibold text-zinc-300 bg-zinc-700 hover:bg-zinc-600 transition-colors"
                  >
                    More…
                  </button>
                </div>
              </div>

              <p className="text-xs text-zinc-400 font-medium text-center">
                Multiple users can use this link — it expires 24 hours from now.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


interface BulkCreateModalProps {
  token: string;
  onClose: () => void;
}

type BulkResult = { email: string; status: "created" | "already_exists" | "error"; reason?: string };

function BulkCreateModal({ token, onClose }: BulkCreateModalProps) {
  const [accountType, setAccountType] = React.useState<AccountType>("customer");
  const [emailsRaw, setEmailsRaw] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [results, setResults] = React.useState<BulkResult[]>([]);
  const [summary, setSummary] = React.useState<{ created: number; skipped: number; failed: number } | null>(null);

  const handleCreate = async () => {
    const emails = emailsRaw
      .split(/[\n,]+/)
      .map((e) => e.trim())
      .filter(Boolean);

    if (emails.length === 0) { setError("Please enter at least one email."); return; }
    if (emails.length > 50) { setError("Maximum 50 emails at once."); return; }

    setLoading(true);
    setError("");
    setResults([]);
    setSummary(null);

    try {
      const res = await apiClient.post(
        "/api/crm/customer-invites/bulk-create",
        { emails, accountType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = res.data?.data;
      setResults(data?.results ?? []);
      setSummary({ created: data?.created ?? 0, skipped: data?.skipped ?? 0, failed: data?.failed ?? 0 });
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to create accounts."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        { }
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "w-8 h-8 rounded-lg border flex items-center justify-center shrink-0",
              accountType === "driver"
                ? "bg-orange-500/10 border-orange-500/20"
                : "bg-violet-500/10 border-violet-500/20"
            )}>
              {accountType === "driver"
                ? <Car className="h-4 w-4 text-orange-400" />
                : <Users className="h-4 w-4 text-violet-400" />}
            </div>
            <div>
              <p className="text-sm font-bold text-white">Bulk Create Accounts</p>
              <p className="text-[11px] text-zinc-500">
                Create {acctLabel(accountType).toLowerCase()} accounts for existing {accountType === "driver" ? "drivers" : "customers"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!summary ? (
            <>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-zinc-400">Account type</p>
                <AccountTypeToggle
                  value={accountType}
                  onChange={setAccountType}
                  disabled={loading}
                />
              </div>

              <div>
                <p className="text-xs font-semibold text-zinc-400 mb-1.5">
                  {acctLabel(accountType)} emails
                </p>
                <p className="text-[11px] text-zinc-600 mb-2">One email per line (max 50). A temporary password will be sent to each.</p>
                <textarea
                  value={emailsRaw}
                  onChange={(e) => setEmailsRaw(e.target.value)}
                  placeholder={
                    accountType === "driver"
                      ? "driver1@email.com\ndriver2@email.com\ndriver3@email.com"
                      : "customer1@email.com\ncustomer2@email.com\ncustomer3@email.com"
                  }
                  rows={8}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 text-white text-sm placeholder:text-zinc-700 p-3 resize-none focus:outline-none focus:border-zinc-500 transition-colors"
                  disabled={loading}
                />
              </div>

              {error && (
                <p className="text-sm text-red-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />{error}
                </p>
              )}

              <Button
                onClick={handleCreate}
                disabled={loading || !emailsRaw.trim()}
                className={cn(
                  "w-full text-white font-semibold",
                  accountType === "driver"
                    ? "bg-orange-600 hover:bg-orange-500"
                    : "bg-violet-600 hover:bg-violet-500"
                )}
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating accounts…</>
                  : `Create ${acctLabel(accountType).toLowerCase()} accounts & send emails`}
              </Button>

              <p className="text-[10px] text-zinc-600 text-center">
                Each {acctLabel(accountType).toLowerCase()} will receive an email with their login credentials. Temporary password: <strong className="text-zinc-500">customersaccount</strong>
              </p>
            </>
          ) : (
            <div className="space-y-4">
              { }
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Created", value: summary.created, color: "text-emerald-400" },
                  { label: "Skipped", value: summary.skipped, color: "text-amber-400" },
                  { label: "Failed", value: summary.failed, color: "text-red-400" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-center">
                    <p className={cn("text-2xl font-black", s.color)}>{s.value}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              { }
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {results.map((r) => (
                  <div key={r.email} className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950">
                    <span className={cn("shrink-0 text-xs font-bold", {
                      "text-emerald-400": r.status === "created",
                      "text-amber-400": r.status === "already_exists",
                      "text-red-400": r.status === "error",
                    })}>
                      {r.status === "created" ? "✓" : r.status === "already_exists" ? "—" : "✗"}
                    </span>
                    <span className="flex-1 text-xs text-zinc-300 truncate">{r.email}</span>
                    {r.reason && <span className="text-[10px] text-zinc-600 shrink-0">{r.reason}</span>}
                  </div>
                ))}
              </div>

              <Button
                onClick={onClose}
                className="w-full bg-zinc-700 hover:bg-zinc-600 text-white"
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


type SortField = "createdAt" | "name" | "email";
type SortOrder = "asc" | "desc";
type RoleFilter = "all" | "customer" | "driver";

const ROLE_TABS: { key: RoleFilter; label: string; icon?: React.ReactNode }[] = [
  { key: "all", label: "All" },
  { key: "customer", label: "Customers", icon: <User className="h-3 w-3" /> },
  { key: "driver", label: "Drivers", icon: <Car className="h-3 w-3" /> },
];

interface RegisteredUsersViewProps {
  token: string;
}

function RegisteredUsersView({ token }: RegisteredUsersViewProps) {
  const [users, setUsers] = React.useState<RegisteredUser[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<RoleFilter>("all");
  const [sortBy, setSortBy] = React.useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("desc");
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const fetchUsers = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError("");
    try {
      const params = new URLSearchParams({
        sortBy,
        sortOrder,
        limit: "100",
        role: roleFilter,
        ...(search.trim() && { search: search.trim() }),
      });
      const res = await apiClient.get(
        `/api/crm/customer-invites/customers?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers(res.data?.data?.customers || []);
      setTotal(res.data?.data?.total ?? 0);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load accounts."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, sortBy, sortOrder, search, roleFilter]);

  React.useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const handleDelete = React.useCallback(async (userId: string) => {
    setDeletingId(userId);
    try {
      await apiClient.delete(
        `/api/crm/customer-invites/customers/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      setTotal((t) => t - 1);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to delete account."));
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }, [token]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    return sortOrder === "asc"
      ? <ArrowUp className="h-3 w-3 text-violet-400" />
      : <ArrowDown className="h-3 w-3 text-violet-400" />;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-7 w-7 text-violet-500 animate-spin" />
        <p className="text-xs text-zinc-500">Loading accounts…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <AlertCircle className="h-6 w-6 text-red-400" />
        <p className="text-sm text-zinc-500">{error}</p>
        <button
          onClick={() => fetchUsers(true)}
          className="text-xs text-violet-400 hover:text-violet-300 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      { }
      <div className="flex gap-1.5 flex-wrap">
        {ROLE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setRoleFilter(tab.key)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all duration-150",
              roleFilter === tab.key
                ? tab.key === "driver"
                  ? "bg-orange-500/10 border-orange-500/40 text-orange-600 dark:text-orange-400"
                  : tab.key === "customer"
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                    : "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent"
                : "bg-white dark:bg-zinc-900/60 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-200"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      { }
      <div className="flex items-center gap-2 flex-wrap">
        { }
        <div className="relative flex-1 min-w-45">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-8 pr-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/60 text-xs text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:border-violet-400 dark:focus:border-violet-500 transition-colors"
          />
        </div>

        { }
        <div className="flex items-center gap-1">
          {(["name", "email", "createdAt"] as SortField[]).map((field) => (
            <button
              key={field}
              onClick={() => toggleSort(field)}
              className={cn(
                "inline-flex items-center gap-1 h-9 px-3 rounded-xl border text-xs font-semibold transition-colors",
                sortBy === field
                  ? "border-violet-500/50 bg-violet-500/10 text-violet-600 dark:text-violet-400"
                  : "border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900/60"
              )}
            >
              {field === "createdAt" ? "Date" : field.charAt(0).toUpperCase() + field.slice(1)}
              <SortIcon field={field} />
            </button>
          ))}
        </div>

        { }
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <p className="text-xs text-zinc-500 hidden sm:block">
            {total} account{total !== 1 ? "s" : ""}
          </p>
          <button
            onClick={() => fetchUsers(true)}
            disabled={refreshing}
            className="h-9 w-9 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            {roleFilter === "driver"
              ? <Car className="h-6 w-6 text-violet-400" />
              : <Users className="h-6 w-6 text-violet-400" />}
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
              {search
                ? "No results found"
                : roleFilter === "driver"
                  ? "No driver accounts yet"
                  : roleFilter === "customer"
                    ? "No customer accounts yet"
                    : "No accounts yet"}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {search
                ? "Try a different name or email."
                : "Accounts created via invite link or bulk create will appear here."}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/60 overflow-hidden">
          { }
          <div className="hidden sm:grid grid-cols-[2fr_2fr_1fr_110px_40px] gap-3 px-5 py-2.5 border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/60 dark:bg-zinc-900/40">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Name</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Email</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Type / Status</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Joined</span>
            <span />
          </div>

          {users.map((u, i) => {
            const date = new Date(u.createdAt).toLocaleDateString("en-US", {
              month: "short", day: "numeric", year: "numeric",
            });
            const time = new Date(u.createdAt).toLocaleTimeString("en-US", {
              hour: "2-digit", minute: "2-digit", hour12: true,
            });
            const initials = u.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
            const isDriver = u.role === "driver";
            const isConfirming = confirmDeleteId === u._id;
            const isDeleting = deletingId === u._id;
            return (
              <div key={u._id} className={cn(i !== 0 && "border-t border-zinc-100 dark:border-zinc-800/60")}>
                <div
                  className={cn(
                    "flex items-center gap-3 sm:grid sm:grid-cols-[2fr_2fr_1fr_110px_40px] sm:gap-3 px-5 py-3.5 transition-colors",
                    !isConfirming && "hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                  )}
                >
                  { }
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn(
                      "w-8 h-8 rounded-lg border flex items-center justify-center shrink-0",
                      isDriver
                        ? "bg-orange-500/10 border-orange-500/20"
                        : "bg-violet-500/10 border-violet-500/20"
                    )}>
                      <span className={cn(
                        "text-[11px] font-black",
                        isDriver ? "text-orange-500" : "text-violet-500"
                      )}>{initials}</span>
                    </div>
                    <span className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{u.name}</span>
                  </div>

                  { }
                  <p className="text-xs text-zinc-500 truncate hidden sm:block">{u.email}</p>

                  { }
                  <div className="flex flex-wrap items-center gap-1 shrink-0">
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border w-fit",
                      isDriver
                        ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
                        : "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20"
                    )}>
                      {isDriver ? <Car className="h-3 w-3" /> : <User className="h-3 w-3" />}
                      {isDriver ? "Driver" : "Customer"}
                    </span>
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border w-fit",
                      u.isActive
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                    )}>
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  { }
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">{date}</p>
                    <p className="text-[11px] text-zinc-500">{time}</p>
                  </div>

                  { }
                  <div className="flex justify-end shrink-0">
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                    ) : isConfirming ? (
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
                        title="Cancel"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(u._id)}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete account"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                { }
                {isConfirming && (
                  <div className="flex items-center justify-between gap-3 px-5 py-2.5 bg-red-50/60 dark:bg-red-950/20 border-t border-red-200/50 dark:border-red-500/15">
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 flex-1">
                      Delete <strong className="text-zinc-900 dark:text-white">{u.name}</strong>&apos;s {isDriver ? "driver" : "customer"} account? This is permanent and cannot be undone.
                    </p>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="h-7 px-3 rounded-lg text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDelete(u._id)}
                        disabled={isDeleting}
                        className="h-7 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


export default function ReferralsPage() {
  const router = useRouter();

  const [token, setToken] = React.useState<string | null>(null);
  const [userRole, setUserRole] = React.useState<string>("");
  const [leads, setLeads] = React.useState<ReferralLead[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [filter, setFilter] = React.useState<"all" | LeadStatus>("all");
  const [viewMode, setViewMode] = React.useState<"leads" | "registered">("leads");
  const isAdmin = userRole === "admin";
  const [convertTarget, setConvertTarget] = React.useState<ReferralLead | null>(null);
  const [callTarget, setCallTarget] = React.useState<ReferralLead | null>(null);
  const [activeCall, setActiveCall] = React.useState<CallData | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const [showInviteModal, setShowInviteModal] = React.useState(false);
  const [showBulkModal, setShowBulkModal] = React.useState(false);

  React.useEffect(() => {
    const t = localStorage.getItem("crm_token");
    if (!t) {
      router.replace("/crm");
      return;
    }
    setToken(t);
    setMounted(true);
    apiClient
      .get("/api/crm/me", { headers: { Authorization: `Bearer ${t}` } })
      .then((res) => {
        const data = res.data?.data || res.data;
        setUserRole(data?.role ?? "");
      })
      .catch(() => {
        try {
          const u = JSON.parse(localStorage.getItem("crm_user") || "{}");
          setUserRole(u.role ?? "");
        } catch { }
      });
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

  React.useEffect(() => {
    if (!token) return;

    const socket = getDashboardSocket(token);

    const onNewLead = (lead: ReferralLead) => {
      setLeads((prev) => {
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
        { }
        <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-zinc-800/60 bg-zinc-100/85 dark:bg-zinc-950/80 backdrop-blur-xl">
          <div className="flex items-center gap-3 h-14 sm:h-16 px-4 sm:px-6 max-w-7xl mx-auto">
            <button
              onClick={() => router.push("/crm/dashboard")}
              className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
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

            {userRole === "admin" && (
              <>
                <button
                  onClick={() => setShowBulkModal(true)}
                  title="Bulk create customer or driver accounts"
                  className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-violet-400 hover:text-violet-500 dark:hover:border-violet-500 dark:hover:text-violet-400 bg-white dark:bg-zinc-900/60 hover:bg-violet-50 dark:hover:bg-violet-500/5 transition-colors shrink-0"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Bulk Create</span>
                </button>
                <button
                  onClick={() => setShowInviteModal(true)}
                  title="Generate customer or driver invite link"
                  className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-emerald-400 hover:text-emerald-500 dark:hover:border-emerald-500 dark:hover:text-emerald-400 bg-white dark:bg-zinc-900/60 hover:bg-emerald-50 dark:hover:bg-emerald-500/5 transition-colors shrink-0"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Invite Link</span>
                </button>
              </>
            )}

            <button
              onClick={() => fetchLeads(true)}
              disabled={refreshing}
              className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">

          { }
          <div className="flex gap-1.5 flex-wrap">
            { }
            {viewMode === "leads" && FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-150",
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

            { }
            {viewMode === "registered" && (
              <button
                onClick={() => setViewMode("leads")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-150 bg-white dark:bg-zinc-900/60 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                Leads
              </button>
            )}

            { }
            {isAdmin && (
              <button
                onClick={() => setViewMode("registered")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-150",
                  viewMode === "registered"
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent"
                    : "bg-white dark:bg-zinc-900/60 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-200"
                )}
              >
                <Users className="h-3.5 w-3.5" />
                Registered
              </button>
            )}
          </div>

          { }
          {viewMode === "registered" && token && (
            <RegisteredUsersView token={token} />
          )}

          { }
          {viewMode === "leads" && (
            loading ? (
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
            )
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

      {showInviteModal && token && (
        <InviteLinkModal token={token} onClose={() => setShowInviteModal(false)} />
      )}

      {showBulkModal && token && (
        <BulkCreateModal token={token} onClose={() => setShowBulkModal(false)} />
      )}

    </>
  );
}
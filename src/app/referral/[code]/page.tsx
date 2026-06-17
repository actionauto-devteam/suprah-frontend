"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import {
  Phone,
  Video,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Car,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Step = "loading" | "invalid" | "form" | "success" | "duplicate";
type CallType = "voice" | "video";

interface ReferralInfo {
  referrerName: string;
  referrerFirstName: string;
  referralCode: string;
}

export default function ReferralLandingPage() {
  const { code } = useParams<{ code: string }>();

  const [step, setStep] = React.useState<Step>("loading");
  const [info, setInfo] = React.useState<ReferralInfo | null>(null);

  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [callType, setCallType] = React.useState<CallType>("voice");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState("");

  // Validate referral code on mount
  React.useEffect(() => {
    if (!code) { setStep("invalid"); return; }

    fetch(`/api/referral-leads/info/${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((body) => {
        if (body?.data?.valid) {
          setInfo(body.data as ReferralInfo);
          setStep("form");
        } else {
          setStep("invalid");
        }
      })
      .catch(() => setStep("invalid"));
  }, [code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!name.trim() || !phone.trim() || !email.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/referral-leads/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:         name.trim(),
          phone:        phone.trim(),
          email:        email.trim(),
          requestType:  callType,
          referralCode: code,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setStep("duplicate");
        } else {
          setError(body?.message || "Something went wrong. Please try again.");
        }
        return;
      }

      setStep("success");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center p-4 sm:p-6">

      {/* Brand */}
      <div className="mb-10 text-center select-none">
        <div className="inline-flex items-center gap-1.5 mb-1">
          <Car className="h-5 w-5 text-primary" />
          <span className="text-white font-black text-lg tracking-tight">ACTION AUTO</span>
        </div>
        <p className="text-[9px] text-zinc-600 tracking-[0.35em] uppercase font-semibold">
          Powered by Suprah AI
        </p>
      </div>

      <div className="w-full max-w-[420px]">

        {/* ── Loading ───────────────────────────────────────────────── */}
        {step === "loading" && (
          <div className="flex flex-col items-center gap-3 py-20">
            <Loader2 className="h-7 w-7 text-primary animate-spin" />
            <p className="text-xs text-zinc-500 tracking-wide">Verifying invitation…</p>
          </div>
        )}

        {/* ── Invalid ───────────────────────────────────────────────── */}
        {step === "invalid" && (
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-10 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <h1 className="text-lg font-black text-white">Invalid Invitation</h1>
            <p className="text-sm text-zinc-500 leading-relaxed">
              This referral link is invalid or has expired.
              Please ask your friend to share a new link.
            </p>
          </div>
        )}

        {/* ── Form ──────────────────────────────────────────────────── */}
        {step === "form" && info && (
          <div className="space-y-4">

            {/* Invitation header */}
            <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] p-7 text-center">
              {/* Glow */}
              <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 h-28 w-28 rounded-full bg-primary/25 blur-3xl" />

              <div className="relative space-y-3">
                {/* Avatar initial */}
                <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                  <span className="text-xl font-black text-primary">
                    {info.referrerFirstName.charAt(0).toUpperCase()}
                  </span>
                </div>

                <div>
                  <p className="text-[11px] text-zinc-500 font-medium tracking-widest uppercase mb-1">
                    Personal Invitation from
                  </p>
                  <h1 className="text-2xl font-black text-white">
                    {info.referrerName}
                  </h1>
                </div>

                <p className="text-xs text-zinc-500 leading-relaxed max-w-xs mx-auto">
                  Connect with one of our representatives to find your next vehicle.
                  No account needed — just share your contact below.
                </p>
              </div>
            </div>

            {/* Request form */}
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-white/5 bg-white/[0.03] p-6 space-y-5"
            >
              <h2 className="text-sm font-bold text-white">Request a Call</h2>

              {/* Full name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  Your Full Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Smith"
                  required
                  className={cn(
                    "h-11 rounded-xl bg-white/[0.04] border-white/8 text-white placeholder:text-zinc-700 focus-visible:border-primary/50 focus-visible:ring-0",
                    !name.trim() && submitted && "border-red-500/60 focus-visible:border-red-500/60",
                  )}
                />
                {!name.trim() && submitted && (
                  <p className="text-[11px] text-red-400">Full name is required.</p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d+\-()\s]/g, ""))}
                  placeholder="(801) 555-0100"
                  type="tel"
                  inputMode="tel"
                  required
                  className={cn(
                    "h-11 rounded-xl bg-white/[0.04] border-white/8 text-white placeholder:text-zinc-700 focus-visible:border-primary/50 focus-visible:ring-0",
                    !phone.trim() && submitted && "border-red-500/60 focus-visible:border-red-500/60",
                  )}
                />
                {!phone.trim() && submitted && (
                  <p className="text-[11px] text-red-400">Phone number is required.</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  type="email"
                  inputMode="email"
                  required
                  className={cn(
                    "h-11 rounded-xl bg-white/[0.04] border-white/8 text-white placeholder:text-zinc-700 focus-visible:border-primary/50 focus-visible:ring-0",
                    !email.trim() && submitted && "border-red-500/60 focus-visible:border-red-500/60",
                  )}
                />
                {!email.trim() && submitted && (
                  <p className="text-[11px] text-red-400">Email address is required.</p>
                )}
                <p className="text-[10px] text-zinc-600">
                  We&apos;ll send your call invitation link here so you can join with one tap.
                </p>
              </div>

              {/* Call type selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  Preferred Contact Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["voice", "video"] as CallType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setCallType(type)}
                      className={cn(
                        "flex items-center justify-center gap-2 h-11 rounded-xl border text-sm font-semibold transition-all duration-150",
                        callType === type
                          ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                          : "bg-white/[0.03] border-white/8 text-zinc-400 hover:border-white/15 hover:text-white",
                      )}
                    >
                      {type === "voice"
                        ? <Phone className="h-4 w-4" />
                        : <Video className="h-4 w-4" />}
                      {type === "voice" ? "Voice Call" : "Video Call"}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={submitting || !name.trim() || !phone.trim() || !email.trim()}
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm gap-2 shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Request {callType === "voice" ? "Voice" : "Video"} Call
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-[10px] text-zinc-700 text-center">
                A representative will contact you within 1 business day.
              </p>
            </form>
          </div>
        )}

        {/* ── Duplicate ─────────────────────────────────────────────── */}
        {step === "duplicate" && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-10 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/25 flex items-center justify-center mx-auto">
              <AlertCircle className="h-8 w-8 text-amber-400" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-black text-white">Already Submitted</h1>
              <p className="text-sm text-zinc-400 leading-relaxed">
                We already have a pending request with the phone number or email you provided.
                Our representative will be in touch with you soon — no need to submit again.
              </p>
            </div>
            <div className="pt-4 border-t border-white/5">
              <p className="text-[10px] text-zinc-600">
                Action Auto Utah · Powered by Suprah AI
              </p>
            </div>
          </div>
        )}

        {/* ── Success ───────────────────────────────────────────────── */}
        {step === "success" && (
          <div className="rounded-2xl border border-primary/20 bg-primary/[0.05] p-10 text-center space-y-5">
            {/* Glow */}
            <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 h-24 w-24 rounded-full bg-primary/30 blur-3xl" />

            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-black text-white">You&apos;re All Set!</h1>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Your request has been received. One of our representatives
                will call you at the number you provided — usually within 1 business day.
              </p>
              {email.trim() && (
                <p className="text-xs text-primary/80 leading-relaxed">
                  When your rep starts the call, we&apos;ll send a join link to{" "}
                  <span className="font-semibold text-primary">{email.trim()}</span>.
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-white/5">
              <p className="text-[10px] text-zinc-600">
                Action Auto Utah · Powered by Suprah AI
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <p className="mt-12 text-[10px] text-zinc-800">
        © {new Date().getFullYear()} Action Auto Utah. All rights reserved.
      </p>
    </div>
  );
}

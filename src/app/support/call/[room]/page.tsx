"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Car, Loader2, Phone, Video, AlertCircle, ChevronRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { JitsiMeet } from "@/app/(dashboard)/crm/supra-space/JitsiMeet";

type Step = "form" | "loading" | "call" | "error";

export default function SupportCallPage() {
  const { room } = useParams<{ room: string }>();
  const decodedRoom = decodeURIComponent(room || "");

  const [step, setStep]         = React.useState<Step>("form");
  const [email, setEmail]       = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const [jitsiData, setJitsiData] = React.useState<{
    domain: string;
    room: string;
    jitsiRoom: string;
    jwt: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = React.useState("");

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!email.trim()) return;

    setStep("loading");
    try {
      const res = await fetch(
        `/api/referral-leads/call/${encodeURIComponent(decodedRoom)}/guest-token?email=${encodeURIComponent(email.trim())}`
      );
      const body = await res.json();

      if (!res.ok) {
        const msg = res.status === 403
          ? "This email doesn't match our records for this call. Please use the same email you submitted on the referral form."
          : body?.message || "Failed to join the call. Please try again.";
        setErrorMsg(msg);
        setStep("error");
        return;
      }

      setDisplayName(body.data?.displayName || email.trim());
      setJitsiData(body.data);
      setStep("call");
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setStep("error");
    }
  };

  // Jitsi full-screen call
  if (step === "call" && jitsiData) {
    return (
      <JitsiMeet
        roomName={jitsiData.jitsiRoom}
        displayName={displayName}
        jwt={jitsiData.jwt}
        domain={jitsiData.domain}
        onClose={() => setStep("form")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center p-4 sm:p-6">

      {/* Brand */}
      <div className="mb-10 text-center select-none">
        <div className="inline-flex items-center gap-1.5 mb-1">
          <Car className="h-5 w-5 text-primary" />
          <span className="text-white font-black text-lg tracking-tight">ACTION AUTO</span>
        </div>
        <p className="text-[9px] text-zinc-600 tracking-[0.35em] uppercase font-semibold">
          Support Center
        </p>
      </div>

      <div className="w-full max-w-[400px]">

        {/* Loading */}
        {step === "loading" && (
          <div className="flex flex-col items-center gap-3 py-20">
            <Loader2 className="h-7 w-7 text-primary animate-spin" />
            <p className="text-xs text-zinc-500 tracking-wide">Verifying and connecting…</p>
          </div>
        )}

        {/* Error */}
        {step === "error" && (
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-10 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <h1 className="text-lg font-black text-white">Unable to Join</h1>
            <p className="text-sm text-zinc-500 leading-relaxed">{errorMsg}</p>
            <Button
              onClick={() => setStep("form")}
              variant="outline"
              className="border-white/10 text-zinc-300 hover:bg-white/5"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Join form */}
        {step === "form" && (
          <div className="space-y-4">

            {/* Header card */}
            <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] p-7 text-center">
              <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 h-28 w-28 rounded-full bg-primary/20 blur-3xl" />
              <div className="relative space-y-3">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Video className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-zinc-500 font-medium tracking-widest uppercase mb-1">
                    You&apos;ve been invited to a call
                  </p>
                  <h1 className="text-xl font-black text-white">
                    Action Auto Support
                  </h1>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  A representative is ready to speak with you.
                  Enter the email you used when you submitted your request to join.
                </p>
              </div>
            </div>

            {/* Email form */}
            <form
              onSubmit={handleJoin}
              className="rounded-2xl border border-white/5 bg-white/[0.03] p-6 space-y-5"
            >
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  Your Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 pointer-events-none" />
                  <Input
                    type="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className={cn(
                      "h-11 rounded-xl bg-white/[0.04] border-white/8 text-white placeholder:text-zinc-700 focus-visible:border-primary/50 focus-visible:ring-0 pl-9",
                      !email.trim() && submitted && "border-red-500/60 focus-visible:border-red-500/60"
                    )}
                  />
                </div>
                {!email.trim() && submitted && (
                  <p className="text-[11px] text-red-400">Please enter your email to join.</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm gap-2 shadow-lg shadow-primary/20"
              >
                Join Call
                <ChevronRight className="h-4 w-4" />
              </Button>

              <p className="text-[10px] text-zinc-700 text-center">
                Your call is private and secure.
              </p>
            </form>
          </div>
        )}

      </div>

      <p className="mt-12 text-[10px] text-zinc-800">
        © {new Date().getFullYear()} Action Auto Utah. All rights reserved.
      </p>
    </div>
  );
}

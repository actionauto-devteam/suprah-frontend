"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type Step = "loading" | "invalid" | "form" | "submitting" | "success";
type InvalidReason = "not_found" | "used" | "expired";

interface OrgInfo {
  orgName: string;
  orgLogo: string | null;
  expiresAt: string;
  accountType: "customer" | "driver";
}

const REASON_MSG: Record<InvalidReason, string> = {
  not_found: "This invite link doesn't exist.",
  used: "This invite link has already been used.",
  expired: "This invite link has expired.",
};

export default function JoinPage() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const router = useRouter();

  const [step, setStep] = React.useState<Step>("loading");
  const [invalidReason, setInvalidReason] = React.useState<InvalidReason>("not_found");
  const [org, setOrg] = React.useState<OrgInfo | null>(null);

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState("");

  // Validate the invite link on mount
  React.useEffect(() => {
    if (!shortCode) return;
    apiClient
      .get(`/api/auth/invite/${shortCode}`)
      .then((res) => {
        const data = res.data?.data ?? res.data;
        if (data?.valid) {
          setOrg({
            orgName: data.orgName,
            orgLogo: data.orgLogo,
            expiresAt: data.expiresAt,
            accountType: data.accountType === "driver" ? "driver" : "customer",
          });
          setStep("form");
        } else {
          setInvalidReason(data?.reason ?? "not_found");
          setStep("invalid");
        }
      })
      .catch(() => {
        setInvalidReason("not_found");
        setStep("invalid");
      });
  }, [shortCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!email.trim()) { setError("Please enter your email."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }

    setStep("submitting");
    try {
      await apiClient.post(`/api/auth/invite/${shortCode}/register`, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      setStep("success");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Something went wrong. Please try again.";
      setError(msg);
      setStep("form");
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-8 bg-[#050505] overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_45%_45%,rgba(16,185,129,0.06),transparent_52%)]" />
      <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-emerald-500/5 blur-[120px]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 shadow-2xl">

          {/* Loading */}
          {step === "loading" && (
            <div className="flex flex-col items-center gap-3 py-10 text-white/60">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm">Validating invite link…</p>
            </div>
          )}

          {/* Invalid */}
          {step === "invalid" && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Link unavailable</h2>
                <p className="mt-1 text-sm text-white/50">
                  {REASON_MSG[invalidReason]}
                </p>
              </div>
              <p className="text-xs text-white/30">
                Please contact the dealership for a new invite link.
              </p>
            </div>
          )}

          {/* Registration form */}
          {(step === "form" || step === "submitting") && org && (
            <>
              {/* Org header */}
              <div className="flex flex-col items-center gap-3 mb-8">
                {org.orgLogo ? (
                  <img
                    src={org.orgLogo}
                    alt={org.orgName}
                    className="w-16 h-16 rounded-xl object-contain bg-white/10 p-1"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-emerald-400" />
                  </div>
                )}
                <div className="text-center">
                  <p className="text-xs text-white/40 uppercase tracking-widest">
                    {org.accountType === "driver" ? "Apply to drive with" : "You've been invited by"}
                  </p>
                  <h1 className="text-xl font-bold text-white mt-0.5">{org.orgName}</h1>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-white/70 text-sm">Full name</Label>
                  <Input
                    id="name"
                    placeholder="Juan dela Cruz"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/25"
                    disabled={step === "submitting"}
                    autoComplete="name"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-white/70 text-sm">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/25"
                    disabled={step === "submitting"}
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-white/70 text-sm">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/25 pr-10"
                      disabled={step === "submitting"}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={step === "submitting"}
                  className={cn(
                    "w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium mt-2",
                    step === "submitting" && "opacity-70 cursor-not-allowed"
                  )}
                >
                  {step === "submitting" ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating account…</>
                  ) : (
                    "Create account"
                  )}
                </Button>
              </form>
            </>
          )}

          {/* Success */}
          {step === "success" && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {org?.accountType === "driver" ? "Application submitted!" : "Account created!"}
                </h2>
                <p className="mt-1 text-sm text-white/50">
                  {org?.accountType === "driver"
                    ? "SUPRAH.AI will review your application and email you once it's approved."
                    : "Check your email — we sent your login details."}
                </p>
              </div>
              <Button
                onClick={() => router.push("/sign-in")}
                className="mt-2 bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                Go to sign in
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

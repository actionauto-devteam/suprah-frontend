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
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type Step = "loading" | "invalid" | "form" | "submitting" | "success";
type InvalidReason = "not_found" | "used" | "expired";

interface DealershipInviteInfo {
  email: string;
  expiresAt: string;
}

const REASON_MSG: Record<InvalidReason, string> = {
  not_found: "This setup link doesn't exist.",
  used: "This setup link has already been used.",
  expired: "This setup link has expired.",
};

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function DealershipSetupPage() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const router = useRouter();

  const [step, setStep] = React.useState<Step>("loading");
  const [invalidReason, setInvalidReason] = React.useState<InvalidReason>("not_found");
  const [invite, setInvite] = React.useState<DealershipInviteInfo | null>(null);

  const [name, setName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [dealershipName, setDealershipName] = React.useState("");
  const [dealershipSlug, setDealershipSlug] = React.useState("");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!shortCode) return;
    apiClient
      .get(`/api/auth/invite/${shortCode}`)
      .then((res) => {
        const data = res.data?.data ?? res.data;
        if (data?.valid && data?.accountType === "dealership") {
          setInvite({ email: data.email, expiresAt: data.expiresAt });
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
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (!dealershipName.trim()) { setError("Please enter your dealership name."); return; }
    if (!dealershipSlug.trim()) { setError("Please enter a dealership URL slug."); return; }

    setStep("submitting");
    try {
      await apiClient.post(`/api/auth/invite/${shortCode}/register`, {
        name: name.trim(),
        email: invite?.email,
        password,
        dealershipName: dealershipName.trim(),
        dealershipSlug: dealershipSlug.trim(),
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
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_45%_45%,rgba(16,185,129,0.06),transparent_52%)]" />
      <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-emerald-500/5 blur-[120px]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 shadow-2xl">

          {step === "loading" && (
            <div className="flex flex-col items-center gap-3 py-10 text-white/60">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm">Validating setup link…</p>
            </div>
          )}

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
                Contact Suprah.AI for a new setup link.
              </p>
            </div>
          )}

          {(step === "form" || step === "submitting") && invite && (
            <>
              <div className="flex flex-col items-center gap-3 mb-8">
                <div className="w-16 h-16 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-emerald-400" />
                </div>
                <div className="text-center">
                  <p className="text-xs text-white/40 uppercase tracking-widest">
                    Set up your dealership
                  </p>
                  <h1 className="text-xl font-bold text-white mt-0.5">{invite.email}</h1>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-white/70 text-sm">Your full name</Label>
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

                <div className="space-y-1.5">
                  <Label htmlFor="dealershipName" className="text-white/70 text-sm">Dealership name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
                    <Input
                      id="dealershipName"
                      placeholder="e.g. Suprah Motors"
                      value={dealershipName}
                      onChange={(e) => {
                        setDealershipName(e.target.value);
                        if (!dealershipSlug) setDealershipSlug(generateSlug(e.target.value));
                      }}
                      className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/25"
                      disabled={step === "submitting"}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dealershipSlug" className="text-white/70 text-sm">Dealership URL slug</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
                    <Input
                      id="dealershipSlug"
                      placeholder="suprah-motors"
                      value={dealershipSlug}
                      onChange={(e) => setDealershipSlug(generateSlug(e.target.value))}
                      className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/25"
                      disabled={step === "submitting"}
                    />
                  </div>
                  <p className="text-[10px] text-white/30">
                    This will be used for your organization&apos;s unique URL.
                  </p>
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
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Setting up…</>
                  ) : (
                    "Finish registration"
                  )}
                </Button>
              </form>
            </>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Dealership registered!</h2>
                <p className="mt-1 text-sm text-white/50">
                  Check your email for a verification code to finish signing in.
                </p>
              </div>
              <Button
                onClick={() => router.push(`/verify-email?email=${encodeURIComponent(invite?.email ?? "")}`)}
                className="mt-2 bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                Verify email
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

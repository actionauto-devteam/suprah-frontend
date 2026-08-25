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
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import {
  AUTH_INPUT_CLASS,
  AUTH_KICKER_CLASS,
  AUTH_LABEL_CLASS,
  AUTH_PRIMARY_BUTTON_CLASS,
} from "@/components/auth/theme";

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
    <AuthSplitLayout>
      <div className="w-full">
        {step === "loading" && (
          <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm">Validating setup link…</p>
          </div>
        )}

        {step === "invalid" && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="w-14 h-14 rounded-md bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Link unavailable</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {REASON_MSG[invalidReason]}
              </p>
            </div>
            <p className="text-xs text-muted-foreground/70">
              Contact Suprah.AI for a new setup link.
            </p>
          </div>
        )}

        {(step === "form" || step === "submitting") && invite && (
          <>
            <div className="mb-7 space-y-2">
              <span className={AUTH_KICKER_CLASS}>
                <Building2 className="h-3.5 w-3.5" />
                Setup Link
              </span>
              <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                {invite.email}
              </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className={AUTH_LABEL_CLASS}>Your full name</Label>
                <Input
                  id="name"
                  placeholder="Juan dela Cruz"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`h-12 ${AUTH_INPUT_CLASS}`}
                  disabled={step === "submitting"}
                  autoComplete="name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className={AUTH_LABEL_CLASS}>Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`h-12 pr-10 ${AUTH_INPUT_CLASS}`}
                    disabled={step === "submitting"}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dealershipName" className={AUTH_LABEL_CLASS}>Dealership name</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="dealershipName"
                    placeholder="e.g. Suprah Motors"
                    value={dealershipName}
                    onChange={(e) => {
                      setDealershipName(e.target.value);
                      if (!dealershipSlug) setDealershipSlug(generateSlug(e.target.value));
                    }}
                    className={`pl-10 h-12 ${AUTH_INPUT_CLASS}`}
                    disabled={step === "submitting"}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dealershipSlug" className={AUTH_LABEL_CLASS}>Dealership URL slug</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="dealershipSlug"
                    placeholder="suprah-motors"
                    value={dealershipSlug}
                    onChange={(e) => setDealershipSlug(generateSlug(e.target.value))}
                    className={`pl-10 h-12 ${AUTH_INPUT_CLASS}`}
                    disabled={step === "submitting"}
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={step === "submitting"}
                className={`${AUTH_PRIMARY_BUTTON_CLASS} h-13 text-base`}
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
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="w-14 h-14 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Dealership registered!</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Check your email for a verification code to finish signing in.
              </p>
            </div>
            <Button
              onClick={() => router.push(`/verify-email?email=${encodeURIComponent(invite?.email ?? "")}`)}
              className={`${AUTH_PRIMARY_BUTTON_CLASS} mt-2 w-auto px-6`}
            >
              Verify email
            </Button>
          </div>
        )}
      </div>
    </AuthSplitLayout>
  );
}

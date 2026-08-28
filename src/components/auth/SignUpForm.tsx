"use client";

import React, { useState } from "react";
import { useSignUp } from "@/providers/AuthProvider";
import { AuthLogo } from "./AuthLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  ArrowRight,
  AlertCircle,
  Truck,
  Building2,
  Users,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import {
  AUTH_INPUT_CLASS,
  AUTH_KICKER_CLASS,
  AUTH_LABEL_CLASS,
  AUTH_LINK_CLASS,
  AUTH_PRIMARY_BUTTON_CLASS,
} from "./theme";

type SignUpStep = "details" | "identity";

export function SignUpForm({ onToggleMode }: { onToggleMode?: () => void }) {
  const { signUp } = useSignUp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("token");

  // Invited team members (org staff) already have a role from the invite
  // itself, so they skip straight to the details form. Everyone else lands
  // on the identity step — the only self-serve account type left is driver;
  // customer and dealership accounts are invite-only now.
  const [step] = useState<SignUpStep>(inviteToken ? "details" : "identity");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dealershipOpen, setDealershipOpen] = useState(false);

  // Submit for the "details" (name/email/password) form — only reachable via
  // an org team-member invite link now.
  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !inviteToken) return;
    setError(null);
    setIsLoading(true);

    try {
      const firstName = name.split(" ")[0] || "";
      const lastName = name.split(" ").slice(1).join(" ") || "";

      const result = await (signUp as any).create({
        emailAddress: email,
        password: password,
        firstName,
        lastName,
        inviteToken,
      });

      if (result.status === "needs_verification") {
        toast.success("Account created! Please verify your email.");
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      }
    } catch (err: any) {
      const errorMessage =
        err.errors?.[0]?.longMessage || "Failed to create account";
      setError(errorMessage);
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  const containerVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: 0.4, ease: "easeOut" } as const,
  };

  return (
    <div className="w-full">
      <div className="mb-1.5 flex justify-center">
        <AuthLogo />
      </div>
      <AnimatePresence mode="wait">
        {step === "identity" ? (
          <motion.div
            key="step-identity"
            {...containerVariants}
            className="space-y-5"
          >
            <div className="space-y-0.5 text-center">
              <span className={`${AUTH_KICKER_CLASS} justify-center`}>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Get Started
              </span>
              <h1 className="text-xl font-black tracking-tight text-foreground sm:text-2xl">
                Sign up
              </h1>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
                Choose an account type
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <IdentityCard
                index="01"
                icon={<Truck className="h-6 w-6" />}
                title="Driver"
                onClick={() => router.push("/sign-up/driver")}
              />

              <IdentityCard
                index="02"
                icon={<Users className="h-6 w-6" />}
                title="Customer"
                locked
                onClick={() =>
                  toast.info("Ask your dealership for an invite link.")
                }
              />

              <div
                className={`group relative flex flex-col overflow-hidden rounded-md border bg-card transition-colors ${
                  dealershipOpen ? "border-emerald-500/50" : "border-border hover:border-emerald-500/50"
                }`}
              >
                <button
                  onClick={() => setDealershipOpen((v) => !v)}
                  className="flex w-full items-center gap-4 p-5 text-left transition-transform active:scale-[0.98]"
                >
                  <span className="w-5 shrink-0 font-mono text-xs font-semibold text-muted-foreground/50">
                    03
                  </span>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-emerald-500/10 group-hover:text-emerald-500">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <h3 className="flex-1 text-foreground font-bold text-lg transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                    Dealership
                  </h3>
                  <ArrowRight
                    className={`h-5 w-5 shrink-0 text-muted-foreground/50 transition-transform group-hover:text-emerald-500 ${
                      dealershipOpen ? "rotate-90" : ""
                    }`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {dealershipOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                    >
                      <div className="border-t border-border px-5 pb-5 pt-4">
                        <DealershipInlineForm />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-4 text-sm font-medium bg-destructive/10 text-destructive rounded-md border border-destructive/20"
              >
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="step-details"
            {...containerVariants}
            className="space-y-6"
          >
            <div className="space-y-0.5 text-center">
              <span className={`${AUTH_KICKER_CLASS} justify-center`}>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Team Invite
              </span>
              <h1 className="text-xl font-black tracking-tight text-foreground sm:text-2xl">
                Create account
              </h1>
            </div>

            <form onSubmit={handleDetailsSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className={AUTH_LABEL_CLASS}>Full Name</Label>
                  <Input
                    type="text"
                    placeholder="John Doe"
                    className={`${AUTH_INPUT_CLASS} h-13`}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className={AUTH_LABEL_CLASS}>Email Address</Label>
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    className={`${AUTH_INPUT_CLASS} h-13`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className={AUTH_LABEL_CLASS}>Password</Label>
                  <PasswordInput
                    placeholder="Minimum 8 characters"
                    className={`${AUTH_INPUT_CLASS} h-13`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-4 text-sm font-medium bg-destructive/10 text-destructive rounded-md border border-destructive/20"
                >
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className={`${AUTH_PRIMARY_BUTTON_CLASS} h-13 text-base transition-all active:scale-[0.98]`}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    Create Account <ArrowRight className="h-5 w-5" />
                  </span>
                )}
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-center pt-8">
        <p className="text-muted-foreground text-sm">
          Already have an account?{" "}
          <button onClick={onToggleMode} className={`${AUTH_LINK_CLASS} ml-1`}>
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}

function DealershipInlineForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await apiClient.post("/api/auth/dealership-inquiries", { email });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to submit");
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        We&apos;ll email you a setup link.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
      <Input
        type="email"
        placeholder="admin@dealership.com"
        className={`${AUTH_INPUT_CLASS} h-11 flex-1`}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        onClick={(e) => e.stopPropagation()}
      />
      <Button
        type="submit"
        disabled={isLoading}
        className={`${AUTH_PRIMARY_BUTTON_CLASS} h-11 w-full sm:w-auto sm:px-6`}
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Request invite"}
      </Button>
      {error && <p className="text-xs text-destructive sm:hidden">{error}</p>}
    </form>
  );
}

function IdentityCard({
  index,
  icon,
  title,
  onClick,
  locked,
}: {
  index: string;
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  locked?: boolean;
}) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-md border border-border bg-card transition-all hover:border-emerald-500/50">
      <button
        onClick={onClick}
        className="flex w-full items-center gap-4 p-5 text-left transition-transform active:scale-[0.98]"
      >
        <span className="w-5 shrink-0 font-mono text-xs font-semibold text-muted-foreground/50">
          {index}
        </span>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-emerald-500/10 group-hover:text-emerald-500">
          {icon}
        </div>
        <h3 className="flex-1 text-foreground font-bold text-lg transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
          {title}
        </h3>
        {locked ? (
          <span className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
            <Lock className="h-3 w-3" />
            Invite Only
          </span>
        ) : (
          <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground/50 transition-all group-hover:translate-x-1 group-hover:text-emerald-500" />
        )}
      </button>
    </div>
  );
}

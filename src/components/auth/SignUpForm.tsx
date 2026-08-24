"use client";

import React, { useState } from "react";
import { useSignUp } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Car,
  Building2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  AUTH_INPUT_CLASS,
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
      <AnimatePresence mode="wait">
        {step === "identity" ? (
          <motion.div
            key="step-identity"
            {...containerVariants}
            className="space-y-8"
          >
            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight text-white flex items-center gap-3">
                Create Account <Sparkles className="h-8 w-8 text-emerald-500" />
              </h1>
              <p className="text-zinc-500 text-lg font-light leading-relaxed">
                Sign up as a driver, or find your invite link below.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <IdentityCard
                icon={<Car className="h-6 w-6" />}
                title="I am a Driver"
                description="I want to sign up as a transportation provider."
                onClick={() => router.push("/sign-up/driver")}
              />
            </div>

            <div className="space-y-3 rounded-2xl border border-white/5 bg-white/[0.02] p-6">
              <p className="text-zinc-400 text-sm font-light leading-relaxed">
                <span className="text-white font-medium">Customer?</span>{" "}
                Accounts are created by invitation from your dealership only —
                ask them for your invite link.
              </p>
              <p className="text-zinc-400 text-sm font-light leading-relaxed flex items-center gap-2">
                <Building2 className="h-4 w-4 text-zinc-500 shrink-0" />
                <span className="text-white font-medium">Dealership?</span>{" "}
                <Link href="/sign-up/dealership" className={AUTH_LINK_CLASS}>
                  Request an invite to register
                </Link>
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-4 text-sm font-medium bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20"
              >
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <p className="text-center text-zinc-600 text-[11px] px-8 leading-relaxed">
              By clicking an option, you agree to our Terms of Service.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="step-details"
            {...containerVariants}
            className="space-y-8"
          >
            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight text-white flex items-center gap-3">
                Create Account <Sparkles className="h-8 w-8 text-emerald-500" />
              </h1>
              <p className="text-zinc-500 text-lg font-light">
                Let&apos;s get you started with Suprah.AI.
              </p>
            </div>

            <form onSubmit={handleDetailsSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className={AUTH_LABEL_CLASS}>Full Name</Label>
                  <Input
                    type="text"
                    placeholder="John Doe"
                    className={`${AUTH_INPUT_CLASS} h-14 rounded-2xl`}
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
                    className={`${AUTH_INPUT_CLASS} h-14 rounded-2xl`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className={AUTH_LABEL_CLASS}>Password</Label>
                  <PasswordInput
                    placeholder="Minimum 8 characters"
                    className={`${AUTH_INPUT_CLASS} h-14 rounded-2xl`}
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
                  className="flex items-center gap-2 p-4 text-sm font-medium bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20"
                >
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className={`${AUTH_PRIMARY_BUTTON_CLASS} h-14 rounded-2xl text-lg transition-all active:scale-[0.98] shadow-[0_20px_40px_-10px_rgba(16,185,129,0.3)]`}
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
        <p className="text-zinc-500 text-sm font-light">
          Already have an account?{" "}
          <button onClick={onToggleMode} className={`${AUTH_LINK_CLASS} ml-1`}>
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}

function IdentityCard({
  icon,
  title,
  description,
  onClick,
  disabled,
}: any) {
  return (
    <div className="group relative flex flex-col bg-white/[0.02] border border-white/5 hover:border-emerald-500/50 hover:bg-emerald-500/[0.03] transition-all rounded-[1.5rem] overflow-hidden">
      <button
        onClick={onClick}
        disabled={disabled}
        className="flex items-center gap-6 p-6 text-left w-full active:scale-[0.98] transition-transform"
      >
        <div className="h-12 w-12 rounded-xl bg-white/[0.05] group-hover:bg-emerald-500/10 flex items-center justify-center text-zinc-400 group-hover:text-emerald-500 transition-colors shrink-0">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-white font-bold text-lg group-hover:text-emerald-400 transition-colors">
            {title}
          </h3>
          <p className="text-zinc-500 text-sm font-light leading-relaxed group-hover:text-zinc-400 transition-colors">
            {description}
          </p>
        </div>
        <ArrowRight className="h-5 w-5 text-zinc-700 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
      </button>
    </div>
  );
}

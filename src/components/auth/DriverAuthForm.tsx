"use client";

import * as React from "react";
import { useSignUp } from "@/providers/AuthProvider";
import { DriverVerificationForm } from "@/components/driver-profile/DriverVerificationForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  ArrowLeft,
  Check,
  X,
  Mail,
  Lock,
  User,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  AUTH_INPUT_CLASS,
  AUTH_KICKER_CLASS,
  AUTH_LABEL_CLASS,
  AUTH_LINK_CLASS,
  AUTH_PRIMARY_BUTTON_CLASS,
} from "./theme";

const passwordRules = [
  {
    key: "length",
    label: "At least 8 characters",
    test: (p: string) => p.length >= 8,
  },
  {
    key: "uppercase",
    label: "One uppercase letter",
    test: (p: string) => /[A-Z]/.test(p),
  },
  { key: "number", label: "One number", test: (p: string) => /[0-9]/.test(p) },
  {
    key: "special",
    label: "One special character",
    test: (p: string) => /[^A-Za-z0-9]/.test(p),
  },
];

export function DriverAuthForm() {
  const {
    signUp,
    setActive: setSignUpActive,
    isLoaded: isSignUpLoaded,
  } = useSignUp();

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [regName, setRegName] = React.useState("");
  const [regEmail, setRegEmail] = React.useState("");
  const [regPassword, setRegPassword] = React.useState("");
  const [regConfirmPassword, setRegConfirmPassword] = React.useState("");
  const [pendingVerification, setPendingVerification] = React.useState(false);
  const [verificationCode, setVerificationCode] = React.useState("");
  const [showApplication, setShowApplication] = React.useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignUpLoaded || !signUp) return;
    setError(null);
    const failedRules = passwordRules.filter((r) => !r.test(regPassword));
    if (failedRules.length > 0) {
      setError(
        "Password must have: " +
          failedRules.map((r) => r.label.toLowerCase()).join(", "),
      );
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setIsSubmitting(true);
    try {
      const nameParts = regName.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      const result = await signUp.create({
        emailAddress: regEmail,
        password: regPassword,
        firstName,
        lastName,
        role: "driver",
      });

      if (result?.status === "complete") {
        await setSignUpActive({ session: result.createdSessionId });
        setShowApplication(true);
        return;
      }

      await signUp.prepareEmailAddressVerification({
        email: regEmail,
        strategy: "email_code",
      });
      setPendingVerification(true);
    } catch (err: any) {
      const msg =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        "Registration failed";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignUpLoaded || !signUp) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });
      if (result.status === "complete" && result.createdSessionId) {
        await setSignUpActive({ session: result.createdSessionId });
        setShowApplication(true);
      }
    } catch (err: any) {
      const msg =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        "Invalid verification code.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showApplication) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-background px-4 py-10 sm:px-8">
        <DriverVerificationForm
          onComplete={() => {
            window.location.href = "/driver/pending";
          }}
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <Link
        href="/sign-up"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Exit
      </Link>

      <div className="mb-7 space-y-2">
        <span className={AUTH_KICKER_CLASS}>
          <ShieldCheck className="h-3.5 w-3.5" />
          Driver Application
        </span>
        <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">
          Start hauling.
        </h1>
      </div>

      <AnimatePresence mode="wait">
        {pendingVerification ? (
          <motion.div
            key="verify"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="text-sm text-muted-foreground">
              Code sent to{" "}
              <span className="text-foreground font-medium">{regEmail}</span>
            </div>
            <form onSubmit={handleVerifyEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="sr-only">
                  Verification Code
                </Label>
                <Input
                  id="code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="XXXXXX"
                  className={`text-center text-2xl tracking-[0.5em] font-mono h-14 ${AUTH_INPUT_CLASS}`}
                  maxLength={6}
                  required
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 p-3 text-xs font-medium bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}
              <Button
                type="submit"
                className={`${AUTH_PRIMARY_BUTTON_CLASS} h-12`}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Verify & Start Working"
                )}
              </Button>
              <button
                type="button"
                className={`text-xs ${AUTH_LINK_CLASS} w-full text-center`}
                onClick={() => {
                  setPendingVerification(false);
                  setVerificationCode("");
                  setError(null);
                }}
              >
                Wrong email? Go back
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.form
            key="register"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onSubmit={handleRegister}
            className="space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="reg-name" className={AUTH_LABEL_CLASS}>
                Full Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reg-name"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="John Doe"
                  className={`pl-10 h-12 ${AUTH_INPUT_CLASS}`}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-email" className={AUTH_LABEL_CLASS}>
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reg-email"
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="driver@example.com"
                  className={`pl-10 h-12 ${AUTH_INPUT_CLASS}`}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password" className={AUTH_LABEL_CLASS}>
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <PasswordInput
                  id="reg-password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`pl-10 h-12 ${AUTH_INPUT_CLASS}`}
                  required
                />
              </div>
              {regPassword.length > 0 && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {passwordRules.map((rule) => {
                    const passed = rule.test(regPassword);
                    return (
                      <div
                        key={rule.key}
                        className={cn(
                          "flex items-center gap-1.5 text-[10px] font-medium transition-colors",
                          passed
                            ? "text-emerald-500"
                            : "text-muted-foreground",
                        )}
                      >
                        {passed ? (
                          <Check className="size-3.5" />
                        ) : (
                          <X className="size-3.5 opacity-50" />
                        )}
                        {rule.label}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-confirm" className={AUTH_LABEL_CLASS}>
                Confirm Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <PasswordInput
                  id="reg-confirm"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`pl-10 h-12 ${AUTH_INPUT_CLASS}`}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 text-xs font-medium bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className={`${AUTH_PRIMARY_BUTTON_CLASS} h-13 text-base`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                "Apply as Driver"
              )}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

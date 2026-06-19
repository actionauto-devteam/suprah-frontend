"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Loader2,
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  AUTH_INPUT_CLASS,
  AUTH_LABEL_CLASS,
  AUTH_LINK_CLASS,
  AUTH_PANEL_CLASS,
  AUTH_PRIMARY_BUTTON_CLASS,
} from "./theme";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordChecks = {
    minLength: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    number: /\d/.test(newPassword),
    symbol: /[^A-Za-z0-9]/.test(newPassword),
  };

  const isPasswordValid = Object.values(passwordChecks).every(Boolean);
  const passwordsMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;

  const getReadableError = (err: any, fallback: string) => {
    const responseData = err?.response?.data;
    const message = responseData?.message;

    if (typeof message === "string") {
      if (
        message.toLowerCase().includes("too_small") &&
        message.toLowerCase().includes("otp")
      ) {
        return "Reset code must be 6 digits";
      }
      return message;
    }

    if (Array.isArray(message) && message.length > 0) {
      const first = message[0];
      if (typeof first === "string") return first;
      if (typeof first?.message === "string") return first.message;
    }

    const firstError = responseData?.errors?.[0];
    if (typeof firstError === "string") return firstError;
    if (typeof firstError?.message === "string") return firstError.message;

    if (typeof message === "object" && message?.message) {
      return message.message;
    }

    return fallback;
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await apiClient.post("/api/auth/forgot-password", { email });
      setStep("reset");
      toast.success("Reset code sent to your email");
    } catch (err: any) {
      setError(
        getReadableError(err, "Something went wrong. Please try again."),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) {
      setError(
        "Password must be at least 8 characters and include uppercase, number, and symbol.",
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await apiClient.post("/api/auth/reset-password", {
        email,
        otp,
        newPassword,
      });
      toast.success("Password reset successfully!");
      router.push("/sign-in");
    } catch (err: any) {
      setError(getReadableError(err, "Invalid code or reset failed."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto max-h-[calc(100dvh-16px)] sm:max-h-[calc(100dvh-24px)]"
    >
      <Card className={`${AUTH_PANEL_CLASS} h-full`}>
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <CardHeader className="space-y-1 pb-5 sm:pb-6">
          <div className="flex justify-center mb-2 sm:mb-3">
            <div className="bg-primary/10 p-2.5 sm:p-3 rounded-2xl">
              <KeyRound className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-center text-zinc-100">
            {step === "email" ? "Forgot Password?" : "Reset Password"}
          </CardTitle>
          <CardDescription className="text-center text-zinc-400 text-sm px-3 sm:px-4">
            {step === "email"
              ? "No worries! Enter your email and we'll send you a reset code."
              : "Enter the 6-digit code we sent to your email and set a new password."}
          </CardDescription>
        </CardHeader>

        <CardContent className="pb-4 sm:pb-5">
          <AnimatePresence mode="wait">
            {step === "email" ? (
              <motion.form
                key="email-step"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleRequestOtp}
                className="space-y-3"
              >
                <div className="space-y-2">
                  <Label htmlFor="email" className={AUTH_LABEL_CLASS}>
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      className={`pl-10 ${AUTH_INPUT_CLASS}`}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                  className={`${AUTH_PRIMARY_BUTTON_CLASS} h-11`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Send Reset Code"
                  )}
                </Button>
              </motion.form>
            ) : (
              <motion.form
                key="reset-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleResetPassword}
                className="space-y-3"
              >
                <div className="space-y-2">
                  <Label htmlFor="otp" className={AUTH_LABEL_CLASS}>
                    Reset Code
                  </Label>
                  <Input
                    id="otp"
                    placeholder="XXXXXX"
                    className={`text-center text-base sm:text-lg tracking-[0.35em] font-mono ${AUTH_INPUT_CLASS}`}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    maxLength={6}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword" className={AUTH_LABEL_CLASS}>
                    New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <PasswordInput
                      id="newPassword"
                      placeholder="••••••••"
                      className={`pl-10 ${AUTH_INPUT_CLASS}`}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/2 p-2.5 sm:p-3 space-y-2">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Password Requirements
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5">
                      <div className="flex items-center gap-2 text-xs">
                        {passwordChecks.minLength ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 text-muted-foreground/70" />
                        )}
                        <span
                          className={
                            passwordChecks.minLength
                              ? "text-emerald-500"
                              : "text-muted-foreground"
                          }
                        >
                          At least 8 characters
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {passwordChecks.uppercase ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 text-muted-foreground/70" />
                        )}
                        <span
                          className={
                            passwordChecks.uppercase
                              ? "text-emerald-500"
                              : "text-muted-foreground"
                          }
                        >
                          One uppercase letter (A-Z)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {passwordChecks.number ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 text-muted-foreground/70" />
                        )}
                        <span
                          className={
                            passwordChecks.number
                              ? "text-emerald-500"
                              : "text-muted-foreground"
                          }
                        >
                          One number (0-9)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {passwordChecks.symbol ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 text-muted-foreground/70" />
                        )}
                        <span
                          className={
                            passwordChecks.symbol
                              ? "text-emerald-500"
                              : "text-muted-foreground"
                          }
                        >
                          One special character (!@#$...)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className={AUTH_LABEL_CLASS}>
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <PasswordInput
                      id="confirmPassword"
                      placeholder="••••••••"
                      className={`pl-10 ${AUTH_INPUT_CLASS}`}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  {passwordsMismatch && (
                    <p className="text-xs text-destructive font-medium">
                      Passwords do not match
                    </p>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 text-xs font-medium bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  className={`${AUTH_PRIMARY_BUTTON_CLASS} h-11`}
                  disabled={isLoading || !isPasswordValid || passwordsMismatch}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Update Password"
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className={`text-xs ${AUTH_LINK_CLASS} text-center w-full`}
                >
                  Didn't get a code? Try again
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </CardContent>

        <CardFooter className="pb-5 sm:pb-6 pt-0">
          <Link
            href="/sign-in"
            className={`flex items-center justify-center gap-2 text-sm ${AUTH_LINK_CLASS} w-full`}
          >
            <ArrowLeft className="h-4 w-4" /> Back to Sign In
          </Link>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

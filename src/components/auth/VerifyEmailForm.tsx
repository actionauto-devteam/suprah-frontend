"use client";

import React, { useState, useEffect } from "react";
import { useSignUp } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck, Mail, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function VerifyEmailForm() {
    const { signUp, isLoaded, signUpState } = useSignUp();
    const router = useRouter();
    const searchParams = useSearchParams();
    const emailFromQuery = searchParams.get("email") || "";
    const emailToDisplay = emailFromQuery || signUpState?.emailAddress || "your email";

    const [otp, setOtp] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    const handleResend = async () => {
        if (cooldown > 0 || !isLoaded) return;

        try {
            const finalEmail = emailFromQuery || signUpState?.emailAddress;
            if (!finalEmail) {
                toast.error("Email is missing. Cannot resend code.");
                return;
            }

            await (signUp as any).prepareEmailAddressVerification({ email: finalEmail });
            setCooldown(60);
            toast.success("Verification code resent! Check your inbox.");
        } catch (err: any) {
            const errorMessage = err.errors?.[0]?.longMessage || "Failed to resend code";
            toast.error(errorMessage);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded) return;

        setIsLoading(true);
        setError(null);

        try {
            const finalEmail = emailFromQuery || signUpState?.emailAddress;
            if (!finalEmail) {
                toast.error("Email is missing. Please try signing up again.");
                setIsLoading(false);
                return;
            }

            const result = await (signUp as any).attemptEmailAddressVerification({
                email: finalEmail,
                code: otp
            });

            if (result.status === "complete") {
                setIsSuccess(true);
                toast.success("Email verified successfully! Welcome to Suprah.AI.");
                setTimeout(() => {
                    window.location.href = "/";
                }, 2000);
            }
        } catch (err: any) {
            const errorMessage = err.errors?.[0]?.longMessage || "Invalid verification code";
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md mx-auto"
        >
            <Card className="border-white/10 bg-[#0a0a0a]/60 backdrop-blur-2xl shadow-[0_0_50px_-12px_rgba(16,185,129,0.2)] relative overflow-hidden">
                {/* Visual accents */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

                <CardHeader className="space-y-1 pb-8 flex flex-col items-center">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20">
                        <ShieldCheck className="h-8 w-8 text-emerald-500" />
                    </div>
                    <CardTitle className="text-3xl font-bold tracking-tight text-center bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                        Verify Email
                    </CardTitle>
                    <CardDescription className="text-center text-zinc-400">
                        We sent a 6-digit code to <span className="text-emerald-400 font-medium">{emailToDisplay}</span>
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    <AnimatePresence mode="wait">
                        {!isSuccess ? (
                            <motion.form
                                key="verify-form"
                                initial={{ opacity: 1 }}
                                exit={{ opacity: 0, y: -20 }}
                                onSubmit={handleSubmit}
                                className="space-y-6"
                            >
                                <div className="space-y-4">
                                    <div className="flex justify-center">
                                        <div className="relative group">
                                            <Input
                                                id="otp"
                                                type="text"
                                                inputMode="numeric"
                                                autoComplete="one-time-code"
                                                maxLength={6}
                                                placeholder="000000"
                                                className="w-48 text-center text-3xl font-mono tracking-[0.5em] h-16 bg-white/5 border-white/10 focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-all rounded-xl"
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                                                required
                                                autoFocus
                                            />
                                            <div className="absolute -inset-0.5 bg-emerald-500 opacity-0 group-focus-within:opacity-10 rounded-xl transition-opacity blur-lg pointer-events-none" />
                                        </div>
                                    </div>

                                    <p className="text-xs text-center text-zinc-500">
                                        Didn&apos;t receive it?{" "}
                                        <button
                                            type="button"
                                            onClick={handleResend}
                                            disabled={cooldown > 0}
                                            className={`font-medium transition-colors ${cooldown > 0 ? 'text-zinc-600 cursor-not-allowed' : 'text-emerald-500 hover:text-emerald-400'}`}
                                        >
                                            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Code"}
                                        </button>
                                    </p>
                                </div>

                                <AnimatePresence>
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="flex items-center gap-2 p-3 text-xs font-medium bg-red-500/10 text-red-400 rounded-lg border border-red-500/20"
                                        >
                                            <AlertCircle className="h-4 w-4 shrink-0" />
                                            <span>{error}</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <Button
                                    type="submit"
                                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)] transition-all active:scale-[0.98] rounded-xl"
                                    disabled={isLoading || otp.length !== 6}
                                >
                                    {isLoading ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            Verify & Continue <ArrowRight className="h-4 w-4" />
                                        </span>
                                    )}
                                </Button>
                            </motion.form>
                        ) : (
                            <motion.div
                                key="success-state"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center py-8 space-y-4"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", damping: 12, stiffness: 200 }}
                                    className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center border-2 border-emerald-500"
                                >
                                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                                </motion.div>
                                <h3 className="text-xl font-bold text-white">Email Verified!</h3>
                                <p className="text-zinc-400 text-center">Your account is now secure. Redirecting you...</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardContent>

                <CardFooter className="pb-8 justify-center border-t border-white/5 pt-6 bg-white/[0.02]">
                    <button
                        onClick={() => router.push("/sign-in")}
                        className="text-sm text-zinc-500 hover:text-white transition-colors flex items-center gap-2"
                    >
                        Back to login
                    </button>
                </CardFooter>
            </Card>
        </motion.div>
    );
}

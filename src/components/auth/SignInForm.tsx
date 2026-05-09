"use client";

import React, { useState } from "react";
import { useSignIn } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Lock, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  AUTH_INPUT_CLASS,
  AUTH_LABEL_CLASS,
  AUTH_LINK_CLASS,
  AUTH_PRIMARY_BUTTON_CLASS,
  AUTH_SECONDARY_BUTTON_CLASS,
} from "./theme";

type SignInResult = {
  status: string;
  targetUrl?: string;
};

type SignInClient = {
  create: (params: {
    identifier: string;
    password: string;
  }) => Promise<SignInResult>;
};

type SignInError = {
  errors?: Array<{
    longMessage?: string;
  }>;
};

export function SignInForm({ onToggleMode }: { onToggleMode?: () => void }) {
  const { signIn, isLoaded } = useSignIn();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await (signIn as SignInClient).create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        toast.success("Welcome back to Action Auto!");
        const searchParamRedirect = searchParams.get("redirect_url");
        const finalUrl = searchParamRedirect || result.targetUrl || "/";
        window.location.href = finalUrl;
      } else if (result.status === "needs_upgrade") {
        router.push(`/upgrade?email=${encodeURIComponent(email)}`);
      }
    } catch (err: unknown) {
      const signInError = err as SignInError;
      const errorMessage =
        signInError.errors?.[0]?.longMessage || "Invalid email or password";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      "https://xj3pd14h-5000.asse.devtunnels.ms";
    const redirectUrl = searchParams.get("redirect_url");
    const token = searchParams.get("token");
    let url = `${backendUrl}/api/auth/google`;

    const params = new URLSearchParams();
    if (redirectUrl) params.append("redirect_url", redirectUrl);
    if (token) params.append("inviteToken", token);

    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;

    window.location.href = url;
  };

  return (
    <div className="w-full space-y-7">
      <div className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-400/80">
          Action Auto Utah
        </p>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Welcome back <span className="text-2xl sm:text-3xl">{"\uD83D\uDC4B"}</span>
        </h1>
        <p className="max-w-md text-sm font-normal leading-6 text-zinc-400 sm:text-base sm:leading-7">
          Sign in to manage deals, inventory, reports, and team activity from
          one workspace.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className={AUTH_LABEL_CLASS}>
              Email
            </Label>
            <div className="relative group">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-emerald-400" />
              <Input
                id="email"
                type="email"
                placeholder="Example@email.com"
                className={`${AUTH_INPUT_CLASS} pl-10`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="ml-1 flex items-center justify-between">
              <Label
                htmlFor="password"
                className={AUTH_LABEL_CLASS.replace(" ml-1", "")}
              >
                Password
              </Label>
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-emerald-400 transition-colors hover:text-emerald-300"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative group">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-emerald-400" />
              <PasswordInput
                id="password"
                placeholder="At least 8 characters"
                className={`${AUTH_INPUT_CLASS} pl-10 pr-11`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-medium leading-5 text-red-300"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          type="submit"
          className={`${AUTH_PRIMARY_BUTTON_CLASS} h-13 text-base transition-all active:scale-[0.98]`}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign In"}
        </Button>
      </form>

      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-white/8" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[#0a0a0a] px-4 font-semibold tracking-widest text-zinc-500">
            Or
          </span>
        </div>
      </div>

      <Button
        variant="outline"
        type="button"
        className={`flex h-12 items-center justify-center gap-3 font-semibold transition-all ${AUTH_SECONDARY_BUTTON_CLASS}`}
        onClick={handleGoogleLogin}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Sign in with Google
      </Button>

      <div className="text-center pt-1">
        <p className="text-sm font-normal text-zinc-500">
          Need an account?{" "}
          <button onClick={onToggleMode} className={`${AUTH_LINK_CLASS} ml-1`}>
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}

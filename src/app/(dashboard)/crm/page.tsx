"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Car,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  Fingerprint,
  ScanFace,
  Terminal,
  Copy,
  Check,
  KeyRound,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { apiClient } from "@/lib/api-client";
import { isWebAuthnSupported, startAuthentication } from "@/lib/webauthn";

type LoginMode = "password" | "biometric" | "ssh";
type ForgotStep = "email" | "otp";

export default function CrmLoginPage() {
  const router = useRouter();

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [isCheckingAuth, setIsCheckingAuth] = React.useState(true);

  const [loginMode, setLoginMode] = React.useState<LoginMode>("password");

  const [forgotOpen, setForgotOpen] = React.useState(false);
  const [forgotStep, setForgotStep] = React.useState<ForgotStep>("email");
  const [forgotEmail, setForgotEmail] = React.useState("");
  const [forgotOtp, setForgotOtp] = React.useState("");
  const [forgotNewPw, setForgotNewPw] = React.useState("");
  const [showNewPw, setShowNewPw] = React.useState(false);
  const [forgotLoading, setForgotLoading] = React.useState(false);
  const [forgotError, setForgotError] = React.useState("");
  const [forgotSuccess, setForgotSuccess] = React.useState(false);
  const [resendCooldown, setResendCooldown] = React.useState(0);
  const cooldownRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const [biometricAvailable, setBiometricAvailable] = React.useState(false);
  const [biometricLoading, setBiometricLoading] = React.useState(false);

  const [sshChallenge, setSshChallenge] = React.useState("");
  const [sshStoreKey, setSshStoreKey] = React.useState("");
  const [sshSignature, setSshSignature] = React.useState("");
  const [sshLoading, setSshLoading] = React.useState(false);
  const [sshCopied, setSshCopied] = React.useState(false);
  const [sshChallengeReady, setSshChallengeReady] = React.useState(false);

  React.useEffect(() => {
    const token = localStorage.getItem("crm_token");
    if (token) {
      apiClient
        .get("/api/crm/me", { headers: { Authorization: `Bearer ${token}` } })
        .then(() => router.replace("/crm/dashboard"))
        .catch(() => {
          localStorage.removeItem("crm_token");
          localStorage.removeItem("crm_user");
          setIsCheckingAuth(false);
        });
    } else {
      setIsCheckingAuth(false);
    }

    isWebAuthnSupported().then(setBiometricAvailable);
  }, [router]);

  /* ── Password Login ──────────────────────────────────────────────────────── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Please enter both Employee ID and password.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiClient.post("/api/crm/login", {
        username: username.trim(),
        password,
      });
      const data = res.data?.data || res.data;
      if (data.token && data.user) {
        localStorage.setItem("crm_token", data.token);
        localStorage.setItem("crm_user", JSON.stringify(data.user));
        router.push("/crm/dashboard");
      } else {
        setError("Login failed. Please try again.");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        err?.response?.data?.data?.message ||
        "Invalid Employee ID or password.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Biometric Login ─────────────────────────────────────────────────────── */
  const handleBiometricLogin = async () => {
    setError("");
    setBiometricLoading(true);

    try {
      const optRes = await apiClient.post("/api/crm/biometric/auth/options", {
        username: username.trim() || undefined,
      });
      const { options, storeKey } = optRes.data?.data;

      const credential = await startAuthentication(options);

      const verifyRes = await apiClient.post("/api/crm/biometric/auth/verify", {
        credential,
        storeKey,
      });

      const data = verifyRes.data?.data;
      if (data.token && data.user) {
        localStorage.setItem("crm_token", data.token);
        localStorage.setItem("crm_user", JSON.stringify(data.user));
        router.push("/crm/dashboard");
      } else {
        setError("Biometric authentication failed.");
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Biometric authentication failed. Try password login.";

      if (!msg.toLowerCase().includes("cancel")) {
        setError(msg);
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  /* ── SSH Key Login ───────────────────────────────────────────────────────── */

  // Step 1: Request challenge from server
  const handleSshRequestChallenge = async () => {
    setError("");
    setSshLoading(true);
    setSshChallengeReady(false);
    setSshSignature("");

    if (!username.trim()) {
      setError("Enter your Employee ID first to request an SSH challenge.");
      setSshLoading(false);
      return;
    }

    try {
      const res = await apiClient.post("/api/crm/biometric/ssh/challenge", {
        username: username.trim(),
      });
      const data = res.data?.data;
      setSshChallenge(data.challenge);
      setSshStoreKey(data.storeKey);
      setSshChallengeReady(true);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        "Failed to get SSH challenge. Do you have an SSH key registered?",
      );
    } finally {
      setSshLoading(false);
    }
  };

  // Copy the terminal command
  const copySshCommand = () => {
    const cmd = `echo "${sshChallenge}" | ssh-keygen -Y sign -f ~/.ssh/id_ed25519 -n crm-login`;
    navigator.clipboard.writeText(cmd);
    setSshCopied(true);
    setTimeout(() => setSshCopied(false), 2000);
  };

  // Step 2: Submit signature for verification
  const handleSshVerify = async () => {
    setError("");
    if (!sshSignature.trim()) {
      setError("Please paste the signature output from your terminal.");
      return;
    }

    setSshLoading(true);
    try {
      const res = await apiClient.post("/api/crm/biometric/ssh/verify", {
        username: username.trim(),
        storeKey: sshStoreKey,
        signature: sshSignature.trim(),
      });

      const data = res.data?.data;
      if (data.token && data.user) {
        localStorage.setItem("crm_token", data.token);
        localStorage.setItem("crm_user", JSON.stringify(data.user));
        router.push("/crm/dashboard");
      } else {
        setError("SSH authentication failed.");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "SSH signature verification failed.",
      );
    } finally {
      setSshLoading(false);
    }
  };

  /* ── Resend cooldown cleanup ─────────────────────────────────────────────── */
  React.useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startResendCooldown = () => {
    setResendCooldown(50);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  /* ── Forgot Password ─────────────────────────────────────────────────────── */
  const openForgot = () => {
    setForgotOpen(true);
    setForgotStep("email");
    setForgotEmail("");
    setForgotOtp("");
    setForgotNewPw("");
    setForgotError("");
    setForgotSuccess(false);
  };

  const closeForgot = () => {
    if (forgotLoading) return;
    setForgotOpen(false);
    setResendCooldown(0);
    if (cooldownRef.current) {
      clearInterval(cooldownRef.current);
      cooldownRef.current = null;
    }
  };

  const handleForgotSendOtp = async () => {
    setForgotError("");
    if (!forgotEmail.trim()) {
      setForgotError("Enter your email address.");
      return;
    }
    setForgotLoading(true);
    try {
      await apiClient.post("/api/crm/forgot-password", {
        email: forgotEmail.trim(),
      });
      setForgotStep("otp");
      startResendCooldown();
    } catch (err: any) {
      setForgotError(
        err?.response?.data?.message || "Something went wrong. Try again.",
      );
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotReset = async () => {
    setForgotError("");
    if (!forgotOtp.trim()) {
      setForgotError("Enter the 6-digit code from your email.");
      return;
    }
    if (!forgotNewPw || forgotNewPw.length < 8) {
      setForgotError("Password must be at least 8 characters.");
      return;
    }
    setForgotLoading(true);
    try {
      await apiClient.post("/api/crm/reset-password", {
        email: forgotEmail.trim(),
        otp: forgotOtp.trim(),
        newPassword: forgotNewPw,
      });
      setForgotSuccess(true);
    } catch (err: any) {
      setForgotError(
        err?.response?.data?.message || "Invalid or expired code.",
      );
    } finally {
      setForgotLoading(false);
    }
  };

  /* ── Mode switch ─────────────────────────────────────────────────────────── */
  const switchMode = (mode: LoginMode) => {
    setError("");
    setLoginMode(mode);
    setSshChallengeReady(false);
    setSshChallenge("");
    setSshSignature("");
  };

  /* ── Auth check loader ───────────────────────────────────────────────────── */
  if (isCheckingAuth) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-600/10 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
          </div>
          <p className="text-xs text-muted-foreground/50 tracking-wide">
            Checking session…
          </p>
        </div>
      </div>
    );
  }

  /* ── Login Page ──────────────────────────────────────────────────────────── */
  return (
    <div className="h-full w-full flex flex-col items-center justify-center px-4 py-8 sm:py-10 bg-background overflow-y-auto overflow-x-hidden">
      <div className="w-full max-w-100 space-y-5">
        {/* ── Brand ── */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="h-14 w-14 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20">
              <Car className="h-7 w-7 text-white" />
            </div>
            <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-background flex items-center justify-center">
              <span className="h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background" />
            </span>
          </div>
          <div className="text-center leading-tight py-0.5">
            <p className="text-base font-bold tracking-tight">Action Auto</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-emerald-600 mt-1">
              CRM System
            </p>
          </div>
        </div>

        {/* ── Card ── */}
        <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-5 shadow-sm">
          <div className="space-y-0.5">
            <h1 className="text-xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to your employee portal
            </p>
          </div>

          {/* ── Auth Method Tabs ── */}
          <div className="flex rounded-xl border border-border/40 bg-muted/20 p-0.5 gap-0.5">
            <button
              onClick={() => switchMode("password")}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-medium transition-all ${loginMode === "password"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground/70 hover:text-foreground"
                }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              Password
            </button>
            {biometricAvailable && (
              <button
                onClick={() => switchMode("biometric")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-medium transition-all ${loginMode === "biometric"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground/70 hover:text-foreground"
                  }`}
              >
                <Fingerprint className="h-3.5 w-3.5" />
                Biometric
              </button>
            )}
            <button
              onClick={() => switchMode("ssh")}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-medium transition-all ${loginMode === "ssh"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground/70 hover:text-foreground"
                }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              SSH Key
            </button>
          </div>

          {/* ── Error ── */}
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 px-3.5 py-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
              <p className="text-xs text-rose-600 dark:text-rose-400">
                {error}
              </p>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/*  PASSWORD MODE                                                 */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {loginMode === "password" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="eid"
                  className="text-xs font-medium text-foreground/75"
                >
                  Employee ID
                </Label>
                <Input
                  id="eid"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. 2026-00001"
                  autoComplete="username"
                  disabled={isLoading}
                  className="h-10 rounded-xl border-border/70 bg-background text-sm focus-visible:ring-emerald-500/30"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="pwd"
                  className="text-xs font-medium text-foreground/75"
                >
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="pwd"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={isLoading}
                    className="h-10 rounded-xl border-border/70 bg-background text-sm pr-10 focus-visible:ring-emerald-500/30"
                  />
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                    disabled={isLoading}
                    className="absolute right-0 top-0 h-10 w-10 flex items-center justify-center text-zinc-500 dark:text-zinc-400 transition-opacity disabled:opacity-50"
                  >
                    <span className="relative block h-4 w-4">
                      <Eye
                        className={`absolute inset-0 h-4 w-4 transition-opacity ${showPassword ? "opacity-0" : "opacity-100"}`}
                      />
                      <EyeOff
                        className={`absolute inset-0 h-4 w-4 transition-opacity ${showPassword ? "opacity-100" : "opacity-0"}`}
                      />
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={openForgot}
                  className="text-xs text-muted-foreground/70 hover:text-emerald-600 transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium gap-2 mt-1 transition-all"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4 ml-auto" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/*  BIOMETRIC MODE                                                */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {loginMode === "biometric" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-foreground/75">
                  Employee ID (optional)
                </Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. 2026-00001"
                  disabled={biometricLoading}
                  className="h-10 rounded-xl border-border/70 bg-background text-sm focus-visible:ring-emerald-500/30"
                />
                <p className="text-xs text-muted-foreground/60">
                  Leave blank to use discoverable credentials
                </p>
              </div>

              <Button
                type="button"
                onClick={handleBiometricLogin}
                disabled={biometricLoading || isLoading}
                className="w-full h-12 rounded-xl border-2 border-emerald-600/30 bg-emerald-600/5 hover:bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 text-sm font-medium gap-3 transition-all"
                variant="ghost"
              >
                {biometricLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <div className="flex items-center gap-2">
                    <Fingerprint className="h-5 w-5" />
                    <span className="text-muted-foreground/30">/</span>
                    <ScanFace className="h-5 w-5" />
                  </div>
                )}
                {biometricLoading
                  ? "Verifying biometric…"
                  : "Authenticate with Biometrics"}
              </Button>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/*  SSH KEY MODE                                                  */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {loginMode === "ssh" && (
            <div className="space-y-4">
              {/* Step 1: Employee ID + Get Challenge */}
              {!sshChallengeReady && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-foreground/75">
                      Employee ID
                    </Label>
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. 2026-00001"
                      disabled={sshLoading}
                      className="h-10 rounded-xl border-border/70 bg-background text-sm focus-visible:ring-emerald-500/30"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={handleSshRequestChallenge}
                    disabled={sshLoading}
                    className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium gap-2 transition-all"
                  >
                    {sshLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Terminal className="h-4 w-4" />
                    )}
                    {sshLoading ? "Requesting…" : "Get SSH Challenge"}
                  </Button>

                  <div className="rounded-xl bg-muted/20 border border-border/30 px-3.5 py-2.5 space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      How it works
                    </p>
                    <ol className="text-xs text-muted-foreground/70 space-y-1 list-decimal pl-4">
                      <li>
                        Enter your Employee ID and click &quot;Get SSH
                        Challenge&quot;
                      </li>
                      <li>Copy the sign command and run it in your terminal</li>
                      <li>Paste the signature output back here to sign in</li>
                    </ol>
                  </div>
                </>
              )}

              {/* Step 2: Show challenge + collect signature */}
              {sshChallengeReady && (
                <>
                  {/* Challenge display */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-foreground/75">
                      Step 1 — Run this in your terminal
                    </p>
                    <div className="relative rounded-xl bg-zinc-950 dark:bg-zinc-900 border border-border/30 p-3 group">
                      <code className="text-[10px] text-emerald-400 font-mono break-all leading-relaxed block pr-8">
                        echo &quot;{sshChallenge}&quot; | ssh-keygen -Y sign -f
                        ~/.ssh/id_ed25519 -n crm-login
                      </code>
                      <button
                        onClick={copySshCommand}
                        className="absolute top-2.5 right-2.5 h-7 w-7 rounded-md flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                        title="Copy command"
                      >
                        {sshCopied ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground/60">
                      Using a different key? Replace{" "}
                      <code className="text-xs bg-muted/40 rounded px-1 py-0.5">
                        id_ed25519
                      </code>{" "}
                      with your key file name.
                    </p>
                  </div>

                  {/* Signature input */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-foreground/75">
                      Step 2 — Paste the signature output
                    </p>
                    <textarea
                      value={sshSignature}
                      onChange={(e) => setSshSignature(e.target.value)}
                      placeholder={
                        "-----BEGIN SSH SIGNATURE-----\n...\n-----END SSH SIGNATURE-----"
                      }
                      rows={5}
                      disabled={sshLoading}
                      className="w-full rounded-xl border border-border/70 bg-background text-xs font-mono p-3 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30 placeholder:text-muted-foreground/40"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={handleSshVerify}
                      disabled={sshLoading || !sshSignature.trim()}
                      className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium gap-2 transition-all"
                    >
                      {sshLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Terminal className="h-4 w-4" />
                      )}
                      {sshLoading ? "Verifying…" : "Verify & Sign In"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setSshChallengeReady(false);
                        setSshChallenge("");
                        setSshSignature("");
                        setSshStoreKey("");
                      }}
                      className="h-10 rounded-xl text-xs text-muted-foreground"
                    >
                      Reset
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Footer separator ── */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border/40" />
            <p className="text-xs text-muted-foreground/50 font-medium">
              Authorized personnel only
            </p>
            <div className="flex-1 h-px bg-border/40" />
          </div>
        </div>

        {/* ── Footer ── */}
        <p className="text-center text-xs text-muted-foreground/50">
          Action Auto CRM v1.0 &middot; Customer Lifecycle Management
        </p>
      </div>

      {/* ── Forgot Password Modal ── */}
      <Dialog open={forgotOpen} onOpenChange={closeForgot}>
        <DialogContent className="sm:max-w-sm rounded-2xl p-0 overflow-hidden gap-0">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-5 border-b border-border/40 space-y-2">
            <div className="flex items-center gap-3">
              <div
                className={`h-9 w-9 rounded-xl flex items-center justify-center ${forgotSuccess ? "bg-emerald-500/10" : "bg-emerald-500/10"}`}
              >
                {forgotSuccess ? (
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                ) : forgotStep === "email" ? (
                  <Mail className="h-4 w-4 text-emerald-500" />
                ) : (
                  <KeyRound className="h-4 w-4 text-emerald-500" />
                )}
              </div>
              <div>
                <DialogTitle className="text-sm font-bold">
                  {forgotSuccess
                    ? "Password Reset!"
                    : forgotStep === "email"
                      ? "Forgot Password"
                      : "Enter Reset Code"}
                </DialogTitle>
                <DialogDescription className="text-[11px] text-muted-foreground/50 mt-0.5">
                  {forgotSuccess
                    ? "Your password has been updated."
                    : forgotStep === "email"
                      ? "We'll send a 6-digit code to your email."
                      : `Code sent to ${forgotEmail}`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            {/* Success state */}
            {forgotSuccess && (
              <div className="text-center py-4 space-y-3">
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
                  <ShieldCheck className="h-7 w-7 text-emerald-500" />
                </div>
                <p className="text-sm text-muted-foreground/60">
                  You can now sign in with your new password.
                </p>
                <Button
                  onClick={closeForgot}
                  className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold"
                >
                  Back to Sign In
                </Button>
              </div>
            )}

            {/* Step 1 — Email */}
            {!forgotSuccess && forgotStep === "email" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
                    Email Address
                  </Label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={forgotEmail}
                    onChange={(e) => {
                      setForgotEmail(e.target.value);
                      setForgotError("");
                    }}
                    disabled={forgotLoading}
                    className="h-10 rounded-xl text-sm border-border/50 focus-visible:ring-emerald-500/30"
                  />
                </div>
                {forgotError && (
                  <p className="text-[11px] text-red-500">{forgotError}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    onClick={closeForgot}
                    disabled={forgotLoading}
                    className="flex-1 h-10 rounded-xl text-sm border-border/50"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleForgotSendOtp}
                    disabled={forgotLoading}
                    className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold gap-2"
                  >
                    {forgotLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                    {forgotLoading ? "Sending…" : "Send Code"}
                  </Button>
                </div>
              </>
            )}

            {/* Step 2 — OTP + New Password */}
            {!forgotSuccess && forgotStep === "otp" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
                    6-Digit Code
                  </Label>
                  <Input
                    placeholder="e.g. 482910"
                    value={forgotOtp}
                    onChange={(e) => {
                      setForgotOtp(
                        e.target.value.replace(/\D/g, "").slice(0, 6),
                      );
                      setForgotError("");
                    }}
                    disabled={forgotLoading}
                    maxLength={6}
                    className="h-10 rounded-xl text-sm border-border/50 font-mono tracking-widest focus-visible:ring-emerald-500/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      type={showNewPw ? "text" : "password"}
                      placeholder="Minimum 8 characters"
                      value={forgotNewPw}
                      onChange={(e) => {
                        setForgotNewPw(e.target.value);
                        setForgotError("");
                      }}
                      disabled={forgotLoading}
                      className="h-10 rounded-xl text-sm border-border/50 pr-10 focus-visible:ring-emerald-500/30"
                    />
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => setShowNewPw((prev) => !prev)}
                      aria-label={showNewPw ? "Hide password" : "Show password"}
                      aria-pressed={showNewPw}
                      disabled={forgotLoading}
                      className="absolute right-3 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center text-zinc-500 dark:text-zinc-400 transition-opacity disabled:opacity-50"
                    >
                      <span className="relative block h-4 w-4">
                        <Eye
                          className={`absolute inset-0 h-4 w-4 transition-opacity ${showNewPw ? "opacity-0" : "opacity-100"}`}
                        />
                        <EyeOff
                          className={`absolute inset-0 h-4 w-4 transition-opacity ${showNewPw ? "opacity-100" : "opacity-0"}`}
                        />
                      </span>
                    </button>
                  </div>
                </div>
                {forgotError && (
                  <p className="text-[11px] text-red-500">{forgotError}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setForgotStep("email");
                      setForgotError("");
                      setResendCooldown(0);
                      if (cooldownRef.current) {
                        clearInterval(cooldownRef.current);
                        cooldownRef.current = null;
                      }
                    }}
                    disabled={forgotLoading}
                    className="flex-1 h-10 rounded-xl text-sm border-border/50"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleForgotReset}
                    disabled={forgotLoading}
                    className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold gap-2"
                  >
                    {forgotLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <KeyRound className="h-4 w-4" />
                    )}
                    {forgotLoading ? "Resetting…" : "Reset Password"}
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={handleForgotSendOtp}
                  disabled={forgotLoading || resendCooldown > 0}
                  className="w-full text-center text-[11px] text-muted-foreground/40 hover:text-emerald-600 transition-colors disabled:pointer-events-none disabled:opacity-50"
                >
                  {resendCooldown > 0
                    ? `Resend available in ${resendCooldown}s`
                    : "Didn't receive a code? Resend"}
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

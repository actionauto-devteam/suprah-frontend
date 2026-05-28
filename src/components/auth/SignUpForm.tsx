"use client";

import React, { useState, useEffect } from "react";
import { useSignUp } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Mail,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Car,
  ShieldCheck,
  UserCheck,
  Briefcase,
  Building2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  AUTH_INPUT_CLASS,
  AUTH_LABEL_CLASS,
  AUTH_LINK_CLASS,
  AUTH_PRIMARY_BUTTON_CLASS,
  AUTH_SECONDARY_BUTTON_CLASS,
} from "./theme";

type SignUpStep = "details" | "identity" | "dealership";
type UserRole = "customer" | "driver" | "dealership";

interface PublicOrg {
  _id: string;
  name: string;
}

export function SignUpForm({ onToggleMode }: { onToggleMode?: () => void }) {
  const { signUp, isLoaded } = useSignUp();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<SignUpStep>("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dealership selection (customers)
  const [orgs, setOrgs] = useState<PublicOrg[]>([]);
  const [organizationId, setOrganizationId] = useState("");

  // Load the public dealership list once, for the customer signup picker.
  useEffect(() => {
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      "https://xj3pd14h-5000.asse.devtunnels.ms";
    fetch(`${backendUrl}/api/organizations/public`)
      .then((r) => r.json())
      .then((j) => setOrgs(Array.isArray(j?.data) ? j.data : []))
      .catch(() => setOrgs([]));
  }, []);

  const handleNextStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;

    // If we have an invite token, we can skip the role selection step
    const token = searchParams.get("token");
    if (token) {
      setIsLoading(true);
      try {
        const firstName = name.split(" ")[0] || "";
        const lastName = name.split(" ").slice(1).join(" ") || "";

        const result = await (signUp as any).create({
          emailAddress: email,
          password: password,
          firstName,
          lastName,
          inviteToken: token,
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
    } else {
      setStep("identity");
    }
  };

  // Decide whether a customer needs to pick a dealership first.
  const handleSelectRole = (role: UserRole) => {
    setError(null);
    if (role === "customer" && orgs.length > 1) {
      setSelectedRole("customer");
      setStep("dealership");
      return;
    }
    // Single dealership (backend auto-assigns) or non-customer role.
    handleSubmit(role);
  };

  const handleSubmit = async (role: UserRole, orgId?: string) => {
    if (!isLoaded) return;
    setSelectedRole(role);
    setIsLoading(true);
    setError(null);

    try {
      const firstName = name.split(" ")[0] || "";
      const lastName = name.split(" ").slice(1).join(" ") || "";
      const token = searchParams.get("token");

      const result = await (signUp as any).create({
        emailAddress: email,
        password: password,
        firstName,
        lastName,
        role: role, // 'customer', 'driver', or 'dealership'
        inviteToken: token || undefined,
        organizationId: orgId || undefined, // dealership the customer chose
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

  const handleGoogleSignUp = (role: UserRole, orgId?: string) => {
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      "https://xj3pd14h-5000.asse.devtunnels.ms";
    const redirectUrl = searchParams.get("redirect_url");
    const token = searchParams.get("token");
    let url = `${backendUrl}/api/auth/google?role=${role}`;
    if (redirectUrl) {
      url += `&redirect_url=${encodeURIComponent(redirectUrl)}`;
    }
    if (token) {
      url += `&inviteToken=${token}`;
    }
    if (orgId) {
      url += `&organizationId=${orgId}`;
    }
    window.location.href = url;
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
        {step === "details" ? (
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
                Let&apos;s get you started with Action Auto Utah.
              </p>
            </div>

            <form onSubmit={handleNextStep} className="space-y-6">
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

              <Button
                type="submit"
                className={`${AUTH_PRIMARY_BUTTON_CLASS} h-14 rounded-2xl text-lg transition-all active:scale-[0.98] shadow-[0_20px_40px_-10px_rgba(16,185,129,0.3)]`}
              >
                <span className="flex items-center gap-2">
                  Select Account Type <ArrowRight className="h-5 w-5" />
                </span>
              </Button>
            </form>
          </motion.div>
        ) : step === "dealership" ? (
          <motion.div
            key="step-dealership"
            {...containerVariants}
            className="space-y-8"
          >
            <div className="space-y-3">
              <button
                onClick={() => {
                  setStep("identity");
                  setError(null);
                }}
                className="text-emerald-500 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all mb-4"
              >
                ← Back to account type
              </button>
              <h1 className="text-4xl font-bold tracking-tight text-white flex items-center gap-3">
                Choose Your Dealership
              </h1>
              <p className="text-zinc-500 text-lg font-light leading-relaxed">
                Select the dealership you&apos;re signing up with.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className={AUTH_LABEL_CLASS}>Dealership</Label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500 pointer-events-none" />
                  <select
                    value={organizationId}
                    onChange={(e) => setOrganizationId(e.target.value)}
                    className={`${AUTH_INPUT_CLASS} h-14 rounded-2xl w-full pl-12 appearance-none bg-transparent`}
                    required
                  >
                    <option value="" disabled>
                      Select your dealership
                    </option>
                    {orgs.map((o) => (
                      <option key={o._id} value={o._id} className="bg-zinc-900">
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Button
                onClick={() => handleSubmit("customer", organizationId)}
                disabled={!organizationId || isLoading}
                className={`${AUTH_PRIMARY_BUTTON_CLASS} h-14 rounded-2xl text-lg w-full transition-all active:scale-[0.98] shadow-[0_20px_40px_-10px_rgba(16,185,129,0.3)]`}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    Create Account <ArrowRight className="h-5 w-5" />
                  </span>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => handleGoogleSignUp("customer", organizationId)}
                disabled={!organizationId || isLoading}
                className={`w-full h-12 text-sm font-semibold gap-2 ${AUTH_SECONDARY_BUTTON_CLASS}`}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
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
                Sign up with Google
              </Button>
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
          </motion.div>
        ) : (
          <motion.div
            key="step-identity"
            {...containerVariants}
            className="space-y-8"
          >
            <div className="space-y-3">
              <button
                onClick={() => setStep("details")}
                className="text-emerald-500 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all mb-4"
              >
                ← Back to details
              </button>
              <h1 className="text-4xl font-bold tracking-tight text-white flex items-center gap-3">
                Almost There
              </h1>
              <p className="text-zinc-500 text-lg font-light leading-relaxed">
                Choose how you want to use the platform.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* Role Cards */}
              <IdentityCard
                icon={<UserCheck className="h-6 w-6" />}
                title="I am a Customer"
                description="I want to browse vehicles and manage my appointments."
                onClick={() => handleSelectRole("customer")}
                onGoogleClick={() =>
                  orgs.length > 1
                    ? handleSelectRole("customer")
                    : handleGoogleSignUp("customer")
                }
                isLoading={isLoading && selectedRole === "customer"}
                disabled={isLoading}
              />
              {/* <IdentityCard
                                icon={<Car className="h-6 w-6" />}
                                title="I am a Driver"
                                description="I want to sign up as a transportation provider."
                                onClick={() => handleSubmit("driver")}
                                onGoogleClick={() => handleGoogleSignUp("driver")}
                                isLoading={isLoading && selectedRole === "driver"}
                                disabled={isLoading}
                            /> */}
              <IdentityCard
                icon={<Briefcase className="h-6 w-6" />}
                title="I am a Dealer"
                description="I want to manage my dealership and inventory."
                onClick={() => handleSubmit("dealership")}
                onGoogleClick={() => handleGoogleSignUp("dealership")}
                isLoading={isLoading && selectedRole === "dealership"}
                disabled={isLoading}
              />
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
              By clicking an option, you agree to our Terms of Service. <br />A
              6-digit verification code will be sent to{" "}
              <span className="text-zinc-400">{email}</span>.
            </p>
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
  onGoogleClick,
  isLoading,
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
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : icon}
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

      <div className="px-6 pb-6 pt-0">
        <Button
          variant="outline"
          onClick={onGoogleClick}
          disabled={disabled}
          className={`w-full h-10 text-xs font-semibold gap-2 ${AUTH_SECONDARY_BUTTON_CLASS}`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
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
          Sign up with Google
        </Button>
      </div>
    </div>
  );
}
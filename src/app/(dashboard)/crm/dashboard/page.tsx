"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Car,
  Sun,
  Moon,
  Sunset,
  CalendarCheck,
  Activity,
  Trophy,
  Users,
  Tag,
  Headset,
  Gift,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { apiClient } from "@/lib/api-client";
import { SupraLeoAI } from "@/components/supra-leo-ai/SupraLeoAI";
import { DashboardNotifications } from "@/components/crm/DashboardNotifications";
import { AutrixWelcomeGate } from "@/components/supra-leo-ai/AutrixWelcomeSystem";
import { CrmPushPrompt } from "@/components/crm/CrmPushPrompt";
import { cn, resolveImageUrl } from "@/lib/utils";

interface CrmUserData {
  _id: string;
  fullName: string;
  username: string;
  email: string;
  avatar?: string;
  avatarUrl?: string;
  role: string;
}

const MDT_OFFSET_MS = -6 * 60 * 60 * 1000;
const toMDT = (d: Date) => new Date(d.getTime() + MDT_OFFSET_MS);

function getGreeting(name: string) {
  const h = toMDT(new Date()).getUTCHours();
  if (h >= 5 && h < 12) return { text: `Good Morning, ${name}`, icon: <Sun className="h-5 w-5 text-amber-400" />, period: "morning" };
  if (h >= 12 && h < 18) return { text: `Good Afternoon, ${name}`, icon: <Sunset className="h-5 w-5 text-orange-400" />, period: "afternoon" };
  return { text: `Good Evening, ${name}`, icon: <Moon className="h-5 w-5 text-indigo-400" />, period: "evening" };
}

function ini(n: string) {
  return n.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function withAvatarCacheBust(avatar?: string | null) {
  if (!avatar) return undefined;
  return `${avatar}${avatar.includes("?") ? "&" : "?"}v=${Date.now()}`;
}

function QuickAction({ icon, label, onClick, accent = "emerald" }: {
  icon: React.ReactNode; label: string; onClick: () => void; accent?: "emerald" | "amber" | "violet";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex h-full w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl p-3 min-h-22 sm:gap-2.5 sm:p-4 sm:min-h-25",
        "border border-zinc-200/80 bg-white/60 backdrop-blur-sm dark:border-white/6 dark:bg-zinc-900/40",
        "cursor-pointer transition-all duration-300 hover:bg-white dark:hover:bg-zinc-800/50",
        "hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] motion-reduce:transform-none",
        accent === "amber"
          ? "hover:border-amber-500/30 hover:shadow-[0_0_22px_-6px_rgba(245,158,11,0.35)]"
          : accent === "violet"
            ? "hover:border-violet-500/30 hover:shadow-[0_0_22px_-6px_rgba(139,92,246,0.35)]"
            : "hover:border-emerald-500/30 hover:shadow-[0_0_22px_-6px_rgba(16,185,129,0.35)]",
      )}
    >
      <span className={cn(
        "absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100",
        accent === "amber" ? "bg-amber-400" : accent === "violet" ? "bg-violet-400" : "bg-emerald-400",
      )} />
      <div className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/6 to-transparent transition-transform duration-700 ease-in-out group-hover:translate-x-full motion-reduce:hidden dark:via-white/3" />
      <div className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 sm:h-11 sm:w-11",
        "bg-zinc-100 group-hover:scale-110 dark:bg-zinc-800/80",
        accent === "amber"
          ? "group-hover:bg-amber-500/10 group-hover:shadow-[0_0_16px_-4px_rgba(245,158,11,0.4)]"
          : accent === "violet"
            ? "group-hover:bg-violet-500/10 group-hover:shadow-[0_0_16px_-4px_rgba(139,92,246,0.4)]"
            : "group-hover:bg-emerald-500/10 group-hover:shadow-[0_0_16px_-4px_rgba(16,185,129,0.4)]",
      )}>
        {icon}
      </div>
      <span className="line-clamp-2 text-center text-[10px] font-bold uppercase leading-tight tracking-wide text-zinc-500 transition-colors duration-300 group-hover:text-zinc-800 dark:text-zinc-400 dark:group-hover:text-zinc-200 sm:text-[11px]">
        {label}
      </span>
    </button>
  );
}

function StatChip({ label, value, copyable, breakMode = "words", capitalize }: {
  label: string; value: string; copyable?: boolean; breakMode?: "all" | "words"; capitalize?: boolean;
}) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = React.useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [value]);

  return (
    <div className="min-w-0 rounded-xl border border-zinc-200/60 bg-white/50 px-4 py-3 backdrop-blur-sm transition-colors duration-200 hover:border-emerald-500/20 dark:border-white/5 dark:bg-zinc-900/40 dark:hover:border-emerald-500/20">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600">{label}</p>
        {copyable && (
          <button type="button" onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-200/80 bg-zinc-100/85 px-2 py-1 text-[10px] font-bold text-zinc-500 transition-colors hover:text-emerald-600 dark:border-zinc-700/70 dark:bg-zinc-800/70 dark:text-zinc-300 dark:hover:text-emerald-400">
            {copied ? "✓" : "Copy"}
          </button>
        )}
      </div>
      <p className={cn("text-sm font-bold leading-snug text-zinc-700 dark:text-zinc-200",
        breakMode === "all" ? "break-all" : "wrap-break-word", capitalize && "capitalize")}>
        {value}
      </p>
    </div>
  );
}

export default function CrmDashboardPage() {
  const router = useRouter();
  const [user, setUser] = React.useState<CrmUserData | null>(null);
  const [token, setToken] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    const check = async () => {
      const t = localStorage.getItem("crm_token");
      if (!t) { router.replace("/crm"); return; }
      try {
        const res = await apiClient.get("/api/crm/me", { headers: { Authorization: `Bearer ${t}` } });
        const data = res.data?.data || res.data;
        const profileRes = await apiClient.get("/api/profile").catch(() => null);
        const profile = profileRes?.data?.data || profileRes?.data;
        const profileAvatar = profile?.avatarUrl || profile?.avatar;
        setUser({ ...data, avatar: withAvatarCacheBust(profileAvatar || data.avatarUrl || data.avatar) });
        setToken(t);
      } catch {
        localStorage.removeItem("crm_token");
        localStorage.removeItem("crm_user");
        router.replace("/crm");
      } finally {
        setIsLoading(false);
      }
    };
    check();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-zinc-100 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-14 w-14">
            <div className="absolute inset-0 animate-ping rounded-2xl bg-emerald-500/10 motion-reduce:animate-none" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-zinc-50 dark:bg-zinc-900">
              <Car className="h-6 w-6 text-emerald-500" />
            </div>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-600">Loading workspace</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const userAvatarSrc = resolveImageUrl(user.avatar || user.avatarUrl);
  const greeting = getGreeting(user.fullName.split(" ")[0]);
  const todayStr = toMDT(new Date()).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  });

  const quickActions = [
    { icon: <Users className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />, label: "Leads", route: "/crm/leads" },
    { icon: <Activity className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />, label: "Service Hub", route: "/crm/appointments/dashboard" },
    { icon: <CalendarCheck className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />, label: "Appointments", route: "/crm/appointments" },

    { icon: <Tag className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />, label: "Finance Line", route: "/crm/aftermarket" },
    { icon: <Car className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />, label: "Garage Review", route: "/crm/garage-review" },
    { icon: <Headset className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />, label: "Support Center", route: "/crm/support-center" },
    { icon: <Star className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />, label: "Reviews", route: "/crm/reviews" },
    { icon: <Trophy className="h-5 w-5 text-amber-500 dark:text-amber-400" />, label: "Leaderboard", route: "/crm/leaderboard", accent: "amber" as const },
    { icon: <Gift className="h-5 w-5 text-violet-500 dark:text-violet-400" />, label: "Referrals", route: "/crm/referrals", accent: "violet" as const },
  ];

  return (
    <TooltipProvider>
      <div className="relative flex min-h-full w-full flex-col overflow-hidden bg-zinc-100 transition-colors duration-300 dark:bg-zinc-950">
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -left-64 -top-64 h-150 w-150 rounded-full bg-emerald-500/4 blur-3xl dark:bg-emerald-500/3" />
          <div className="absolute -right-48 top-1/3 h-125 w-125 rounded-full bg-emerald-600/5 blur-3xl dark:bg-emerald-600/4" />
          <div className="absolute bottom-0 left-1/3 h-100 w-100 rounded-full bg-emerald-400/3 blur-3xl dark:bg-emerald-400/2" />
          <div className="absolute inset-0" style={{
            backgroundImage: "linear-gradient(to right, rgba(16,185,129,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(16,185,129,0.05) 1px, transparent 1px)",
            backgroundSize: "46px 46px",
            maskImage: "radial-gradient(ellipse 75% 55% at 50% 0%, black, transparent 78%)",
            WebkitMaskImage: "radial-gradient(ellipse 75% 55% at 50% 0%, black, transparent 78%)",
          }} />
        </div>

        <main className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-6 sm:space-y-7 flex-1 min-h-0 overflow-y-auto">

          {/* Greeting */}
          <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 transition-all duration-700 motion-reduce:transition-none",
            mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0")}>
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200/80 bg-zinc-100 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900">
                {greeting.icon}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-black tracking-tight text-zinc-900 dark:text-white sm:text-xl">{greeting.text}</h1>
                <p className="mt-0.5 truncate font-mono text-xs text-zinc-400 dark:text-zinc-500">{todayStr}</p>
              </div>
            </div>
            <Badge className="hidden h-5 rounded-full border-emerald-200 bg-emerald-50 px-2.5 text-[10px] font-bold capitalize text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 sm:inline-flex">
              {user.role}
            </Badge>
          </div>

          {/* Profile + Quick Actions */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">

            {/* My Profile */}
            <div className={cn(
              "relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/70 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl sm:p-6 dark:border-white/6 dark:bg-zinc-900/40 dark:shadow-none lg:col-span-2",
              "transition-all duration-700 delay-100 motion-reduce:transition-none",
              mounted ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
            )}>
              <div className="absolute right-0 top-0 h-48 w-48 rounded-bl-[100px] bg-linear-to-bl from-emerald-500/5 to-transparent" />
              <p className="mb-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600">My Profile</p>
              <div className="flex items-center gap-4 border-b border-zinc-100 pb-5 dark:border-zinc-800/60 sm:gap-5">
                <div className="relative shrink-0">
                  <div className="absolute -inset-1 animate-[spin_6s_linear_infinite] rounded-full bg-linear-to-br from-emerald-500/30 to-emerald-700/10 motion-reduce:animate-none" />
                  <Avatar className="relative h-16 w-16 ring-2 ring-zinc-200 dark:ring-zinc-800">
                    <AvatarImage src={userAvatarSrc} />
                    <AvatarFallback className="bg-linear-to-br from-emerald-600 to-emerald-800 text-lg font-black text-white">{ini(user.fullName)}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-black leading-tight text-zinc-900 dark:text-white">{user.fullName}</p>
                  <p className="mt-0.5 truncate font-mono text-sm text-zinc-400 dark:text-zinc-500">{user.email}</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <Badge className="h-5 rounded-full border-zinc-200 bg-zinc-100 px-2.5 text-[10px] font-bold text-zinc-600 dark:border-zinc-700/60 dark:bg-zinc-800 dark:text-zinc-300">{user.username}</Badge>
                    <Badge className="h-5 rounded-full border-emerald-200 bg-emerald-50 px-2.5 text-[10px] font-bold capitalize text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">{user.role}</Badge>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2">
                <StatChip label="Full Name" value={user.fullName} />
                <StatChip label="Employee ID" value={user.username} breakMode="all" copyable />
                <StatChip label="Role" value={user.role} capitalize />
                <StatChip label="Email" value={user.email} breakMode="all" />
              </div>
            </div>

            {/* Quick Actions */}
            <div className={cn(
              "flex-1 rounded-2xl border border-zinc-200/80 bg-white/70 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl sm:p-6 dark:border-white/6 dark:bg-zinc-900/40 dark:shadow-none lg:col-span-3",
              "transition-all duration-700 delay-200 motion-reduce:transition-none",
              mounted ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
            )}>
              <p className="mb-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600">Quick Actions</p>
              <div className="grid auto-rows-fr grid-cols-3 gap-2.5 sm:gap-3 lg:grid-cols-5">
                {quickActions.map((action, i) => (
                  <div key={action.label} className="h-full transition-all duration-500 motion-reduce:transition-none"
                    style={{ transitionDelay: mounted ? `${200 + i * 50}ms` : "0ms", opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(12px)" }}>
                    <QuickAction icon={action.icon} label={action.label} onClick={() => router.push(action.route)} accent={action.accent ?? "emerald"} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

      <SupraLeoAI />
      <DashboardNotifications user={user} token={token} hasClockedIn={true} />
      <AutrixWelcomeGate userName={user.fullName} isReady={!isLoading && !!user} />
      <CrmPushPrompt role={user.role} />
    </TooltipProvider>
  );
}

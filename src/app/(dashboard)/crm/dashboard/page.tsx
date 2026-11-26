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
  Copy,
  Check,
  RefreshCw,
  TrendingDown,
  Mail,
  Bot,
  BarChart3,
  Contact,
  Handshake,
  Settings,
  GripVertical,
  ArrowUpDown,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { apiClient } from "@/lib/api-client";
import { DashboardNotifications } from "@/components/crm/DashboardNotifications";
import { AutrixWelcomeGate } from "@/components/supra-leo-ai/AutrixWelcomeSystem";
import { CrmPushPrompt } from "@/components/crm/CrmPushPrompt";
import { cn, resolveImageUrl } from "@/lib/utils";
import type { DenverDayPeriod } from "@/lib/timezone";
import { useDenverDayPeriod } from "@/hooks/useDenverDayPeriod";

interface CrmUserData {
  _id: string;
  fullName: string;
  username: string;
  email: string;
  avatar?: string;
  avatarUrl?: string;
  role: string;
}


function getGreeting(name: string, period: DenverDayPeriod) {
  if (period === "morning") return { text: `Good Morning, ${name}`, icon: <Sun className="h-5 w-5 text-amber-400" />, period: "morning" };
  if (period === "afternoon") return { text: `Good Afternoon, ${name}`, icon: <Sunset className="h-5 w-5 text-orange-400" />, period: "afternoon" };
  return { text: `Good Evening, ${name}`, icon: <Moon className="h-5 w-5 text-indigo-400" />, period: "evening" };
}

function ini(n: string) {
  return n.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function withAvatarCacheBust(avatar?: string | null) {
  if (!avatar) return undefined;
  return `${avatar}${avatar.includes("?") ? "&" : "?"}v=${Date.now()}`;
}

type QuickActionAccent = "emerald" | "amber" | "violet";

interface QuickActionItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  route: string;
  accent?: QuickActionAccent;
}

const QUICK_ICON = "h-5 w-5 text-emerald-500 dark:text-emerald-400";

const QUICK_ACTIONS: QuickActionItem[] = [
  { key: "leads", icon: <Users className={QUICK_ICON} />, label: "Leads", route: "/crm/leads" },
  { key: "customer-records", icon: <Contact className={QUICK_ICON} />, label: "Customer Records", route: "/crm/customers" },
  { key: "deal-board", icon: <Handshake className={QUICK_ICON} />, label: "Deal Board", route: "/crm/deals" },
  { key: "service-hub", icon: <Activity className={QUICK_ICON} />, label: "Service Hub", route: "/crm/appointments/dashboard" },
  { key: "appointments", icon: <CalendarCheck className={QUICK_ICON} />, label: "Appointments", route: "/crm/appointments" },
  { key: "finance-line", icon: <Tag className={QUICK_ICON} />, label: "Finance Line", route: "/crm/aftermarket" },
  { key: "garage-review", icon: <Car className={QUICK_ICON} />, label: "Garage Review", route: "/crm/garage-review" },
  { key: "re-engagement", icon: <RefreshCw className={QUICK_ICON} />, label: "Re-engagement", route: "/crm/vehicle-reengagement" },
  { key: "price-drop-emails", icon: <TrendingDown className={QUICK_ICON} />, label: "Price Drop Emails", route: "/crm/price-drop-emails" },
  { key: "campaigns", icon: <Mail className={QUICK_ICON} />, label: "Campaigns", route: "/crm/email-campaigns" },
  { key: "ai-agent-tasks", icon: <Bot className={QUICK_ICON} />, label: "AI Agent Tasks", route: "/crm/ai-tasks" },
  { key: "reports", icon: <BarChart3 className={QUICK_ICON} />, label: "Reports", route: "/crm/reports" },
  { key: "support-center", icon: <Headset className={QUICK_ICON} />, label: "Support Center", route: "/crm/support-center" },
  { key: "reviews", icon: <Star className={QUICK_ICON} />, label: "Reviews", route: "/crm/reviews" },
  { key: "leaderboard", icon: <Trophy className="h-5 w-5 text-amber-500 dark:text-amber-400" />, label: "Leaderboard", route: "/crm/leaderboard", accent: "amber" },
  { key: "referrals", icon: <Gift className="h-5 w-5 text-violet-500 dark:text-violet-400" />, label: "Referrals", route: "/crm/referrals", accent: "violet" },
  { key: "settings", icon: <Settings className={QUICK_ICON} />, label: "Settings", route: "/crm/settings" },
];

const DEFAULT_QUICK_ORDER = QUICK_ACTIONS.map((action) => action.key);

function orderQuickActions(order: string[]): QuickActionItem[] {
  const byKey = new Map(QUICK_ACTIONS.map((action) => [action.key, action]));
  const seen = new Set<string>();
  const list: QuickActionItem[] = [];
  for (const key of order) {
    const action = byKey.get(key);
    if (action && !seen.has(key)) {
      seen.add(key);
      list.push(action);
    }
  }
  for (const action of QUICK_ACTIONS) if (!seen.has(action.key)) list.push(action);
  return list;
}

function SortableQuickAction({ action }: { action: QuickActionItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: action.key });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "relative h-full cursor-grab touch-manipulation select-none rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 active:cursor-grabbing",
        isDragging && "z-10 opacity-80 shadow-lg",
      )}
      {...attributes}
      {...listeners}
      aria-label={`Move ${action.label}`}
    >
      <GripVertical className="pointer-events-none absolute left-2 top-2 z-10 h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
      <div className="pointer-events-none h-full">
        <QuickAction icon={action.icon} label={action.label} onClick={() => {}} accent={action.accent ?? "emerald"} tabIndex={-1} />
      </div>
    </div>
  );
}

function QuickAction({ icon, label, onClick, accent = "emerald", tabIndex }: {
  icon: React.ReactNode; label: string; onClick: () => void; accent?: QuickActionAccent; tabIndex?: number;
}) {
  return (
    <button
      type="button"
      tabIndex={tabIndex}
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
      toast.success(`${label} copied!`);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error("Couldn't copy. Please try again.");
    });
  }, [value, label]);

  const chipClassName = "min-w-0 rounded-xl border border-zinc-200/60 bg-white/50 px-4 py-3 backdrop-blur-sm transition-colors duration-200 hover:border-emerald-500/20 dark:border-white/5 dark:bg-zinc-900/40 dark:hover:border-emerald-500/20";

  const content = (
    <>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600">{label}</p>
        {copyable && (
          copied ? (
            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-600" />
          )
        )}
      </div>
      <p className={cn("text-sm font-bold leading-snug text-zinc-700 dark:text-zinc-200",
        breakMode === "all" ? "break-all" : "wrap-break-word", capitalize && "capitalize")}>
        {value}
      </p>
    </>
  );

  if (copyable) {
    return (
      <button
        type="button"
        onClick={handleCopy}
        className={cn(chipClassName, "w-full text-left cursor-pointer active:bg-emerald-500/5 dark:active:bg-emerald-500/10")}
      >
        {content}
      </button>
    );
  }

  return <div className={chipClassName}>{content}</div>;
}

export default function CrmDashboardPage() {
  const router = useRouter();
  const [user, setUser] = React.useState<CrmUserData | null>(null);
  const [token, setToken] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [mounted, setMounted] = React.useState(false);
  const [quickOrder, setQuickOrder] = React.useState<string[]>(DEFAULT_QUICK_ORDER);
  const [arrangeDraft, setArrangeDraft] = React.useState<string[] | null>(null);
  const [savingOrder, setSavingOrder] = React.useState(false);
  const denverToday = useDenverDayPeriod();
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleArrangeEnd = React.useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setArrangeDraft((current) => {
      if (!current) return current;
      const from = current.indexOf(String(active.id));
      const to = current.indexOf(String(over.id));
      return from < 0 || to < 0 ? current : arrayMove(current, from, to);
    });
  }, []);

  const saveQuickOrder = React.useCallback(async () => {
    if (!arrangeDraft) return;
    setSavingOrder(true);
    try {
      const order = arrangeDraft.join(",") === DEFAULT_QUICK_ORDER.join(",") ? [] : arrangeDraft;
      await apiClient.put("/api/crm/me/quick-actions", { order }, { headers: { Authorization: `Bearer ${token}` } });
      setQuickOrder(arrangeDraft);
      setArrangeDraft(null);
      toast.success("Quick actions saved.");
    } catch {
      toast.error("Couldn't save your quick actions. Please try again.");
    } finally {
      setSavingOrder(false);
    }
  }, [arrangeDraft, token]);

  React.useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    const check = async () => {
      const t = localStorage.getItem("crm_token");
      if (!t) { router.replace("/crm"); return; }
      try {
        const [res, profileRes, quickRes] = await Promise.all([
          apiClient.get("/api/crm/me", { headers: { Authorization: `Bearer ${t}` } }),
          apiClient.get("/api/profile").catch(() => null),
          apiClient.get("/api/crm/me/quick-actions", { headers: { Authorization: `Bearer ${t}` } }).catch(() => null),
        ]);
        const savedOrder = quickRes?.data?.data?.order;
        if (Array.isArray(savedOrder)) setQuickOrder(orderQuickActions(savedOrder).map((action) => action.key));
        const data = res.data?.data || res.data;
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
  const greeting = getGreeting(user.fullName.split(" ")[0], denverToday.period);
  const todayStr = `${new Date(`${denverToday.day}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  })} · ${denverToday.zone}`;

  const quickActions = orderQuickActions(arrangeDraft ?? quickOrder);
  const arranging = arrangeDraft !== null;
  const smallButton = "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors disabled:opacity-50";

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

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">

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

            <div className={cn(
              "flex-1 rounded-2xl border border-zinc-200/80 bg-white/70 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl sm:p-6 dark:border-white/6 dark:bg-zinc-900/40 dark:shadow-none lg:col-span-3",
              "transition-all duration-700 delay-200 motion-reduce:transition-none",
              mounted ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
            )}>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600">Quick Actions</p>
                {arranging ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setArrangeDraft([...DEFAULT_QUICK_ORDER])}
                      disabled={savingOrder}
                      className={cn(smallButton, "border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800")}
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setArrangeDraft(null)}
                      disabled={savingOrder}
                      className={cn(smallButton, "border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800")}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveQuickOrder}
                      disabled={savingOrder}
                      className={cn(smallButton, "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700")}
                    >
                      {savingOrder ? "Saving..." : "Done"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setArrangeDraft(quickActions.map((action) => action.key))}
                    className={cn(smallButton, "border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800")}
                  >
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    Arrange
                  </button>
                )}
              </div>
              {arranging && (
                <p className="-mt-2 mb-4 text-xs text-zinc-500 dark:text-zinc-400">
                  Drag the buttons into the order you like. On a phone, press and hold a button, then drag. Only you will see this order.
                </p>
              )}
              {arranging ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleArrangeEnd}>
                  <SortableContext items={quickActions.map((action) => action.key)} strategy={rectSortingStrategy}>
                    <div className="grid auto-rows-fr grid-cols-3 gap-2.5 sm:gap-3 lg:grid-cols-5">
                      {quickActions.map((action) => (
                        <SortableQuickAction key={action.key} action={action} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="grid auto-rows-fr grid-cols-3 gap-2.5 sm:gap-3 lg:grid-cols-5">
                  {quickActions.map((action, i) => (
                    <div key={action.key} className="h-full transition-all duration-500 motion-reduce:transition-none"
                      style={{ transitionDelay: mounted ? `${200 + i * 50}ms` : "0ms", opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(12px)" }}>
                      <QuickAction icon={action.icon} label={action.label} onClick={() => router.push(action.route)} accent={action.accent ?? "emerald"} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <DashboardNotifications user={user} token={token} hasClockedIn={true} />
      <AutrixWelcomeGate userName={user.fullName} isReady={!isLoading && !!user} />
      <CrmPushPrompt role={user.role} />
    </TooltipProvider>
  );
}

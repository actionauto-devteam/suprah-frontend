"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Car,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Loader2,
  ArrowLeft,
  UserPlus,
  Users,
  ShieldCheck,
  ChevronRight,
  Lock,
  Moon,
  Sun,
  HeartHandshake,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiClient } from "@/lib/api-client";
import { CreateUserModal } from "@/components/crm/CreateUserModal";
import { UsersTable } from "@/components/crm/UsersTable";
import { useTheme } from "@/context/ThemeContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CrmUserData {
  _id: string;
  fullName: string;
  username: string;
  email: string;
  avatar?: string;
  role: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ini(n: string) {
  return n
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CrmSettingsPage() {
  const router = useRouter();
  const [user, setUser] = React.useState<CrmUserData | null>(null);
  const [token, setToken] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [createdCount, setCreatedCount] = React.useState(0);

  React.useEffect(() => {
    const check = async () => {
      const t = localStorage.getItem("crm_token");
      if (!t) {
        router.replace("/crm");
        return;
      }
      try {
        const res = await apiClient.get("/api/crm/me", {
          headers: { Authorization: `Bearer ${t}` },
        });
        const data = res.data?.data || res.data;
        setUser(data);
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

  const handleExit = async () => {
    try {
      await apiClient.post(
        "/api/crm/logout",
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch {}
    localStorage.removeItem("crm_token");
    localStorage.removeItem("crm_user");
    router.push("/");
  };

  const handleUserCreated = () => {
    setCreatedCount((c) => c + 1);
  };

  const isAdmin = user?.role === "admin";
  const { theme, setTheme } = useTheme();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
          </div>
          <p className="text-xs text-muted-foreground/40 tracking-widest uppercase">
            Loading
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen w-full bg-background">
      {/* ── Topbar ── */}
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/90 backdrop-blur-xl">
        <div className="flex items-center justify-between h-14 px-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-sm">
              <Car className="h-4 w-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold leading-none">Action Auto</p>
              <p className="text-[9px] uppercase tracking-[0.25em] text-emerald-600 mt-0.5 font-bold">
                Workspace
              </p>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 gap-2 pl-1.5 pr-3 rounded-full border border-border/40 hover:bg-muted/50"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="bg-emerald-600 text-white text-[9px] font-bold">
                      {ini(user.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-xs font-medium max-w-25 truncate">
                    {user.fullName}
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground/40" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 rounded-2xl p-0 overflow-hidden shadow-xl border-border/40"
              >
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="bg-emerald-600 text-white text-xs font-bold">
                        {ini(user.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">
                        {user.fullName}
                      </p>
                      <p className="text-[11px] text-muted-foreground/50 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </div>
                <DropdownMenuSeparator className="m-0" />
                <div className="p-1.5">
                  <DropdownMenuItem
                    onClick={() => router.push("/crm/profile")}
                    className="rounded-xl text-xs h-9 gap-2.5 cursor-pointer"
                  >
                    <User className="h-3.5 w-3.5 text-muted-foreground" /> My
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/crm/settings")}
                    className="rounded-xl text-xs h-9 gap-2.5 cursor-pointer bg-muted/30"
                  >
                    <Settings className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-emerald-600 font-semibold">
                      Settings
                    </span>
                  </DropdownMenuItem>
                </div>
                <DropdownMenuSeparator className="m-0" />
                <div className="p-1.5">
                  <DropdownMenuItem
                    onClick={handleExit}
                    className="rounded-xl text-xs h-9 gap-2.5 cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/5"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Exit CRM
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ── Page Content ── */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Page header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/crm/dashboard")}
            className="h-8 w-8 p-0 rounded-xl border border-border/40 hover:bg-muted/50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Settings</h1>
            <p className="text-xs text-muted-foreground/40 mt-0.5">
              Manage your CRM workspace
            </p>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] h-5 px-2 rounded-full capitalize font-semibold ml-auto hidden sm:inline-flex"
          >
            {user.role}
          </Badge>
        </div>

        {/* Layout: sidebar + content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ─── Sidebar nav ─── */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border/30">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                  Navigation
                </p>
              </div>
              <div className="p-2 space-y-1">
                <button
                  onClick={() => router.push("/crm/settings")}
                  className="w-full flex items-center justify-between gap-2.5 rounded-xl px-3 h-9 text-xs font-semibold bg-emerald-500/10 text-emerald-600"
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="h-3.5 w-3.5" />
                    User Management
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3 w-3 text-emerald-500/40" />
                    <ChevronRight className="h-3 w-3 text-emerald-500/40" />
                  </div>
                </button>
                <button
                  onClick={() => router.push("/crm/settings/integrations")}
                  className="w-full flex items-center justify-between gap-2.5 rounded-xl px-3 h-9 text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Lock className="h-3.5 w-3.5" />
                    Lead Integrations
                  </div>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                </button>
                <button
                  onClick={() => router.push("/crm/hr")}
                  className="w-full flex items-center justify-between gap-2.5 rounded-xl px-3 h-9 text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <HeartHandshake className="h-3.5 w-3.5" />
                    HR &amp; People
                  </div>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                </button>
              </div>
            </div>
          </div>

          {/* ─── Main panel ─── */}
          <div className="lg:col-span-9 space-y-4">
            {/* User Management card */}
            <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
              {/* Card header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Users className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">User Management</p>
                    <p className="text-[11px] text-muted-foreground/40 mt-0.5">
                      Create and manage CRM user accounts
                    </p>
                  </div>
                </div>

                {/* Only admins can create users */}
                {isAdmin && (
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs gap-2 shadow-sm shadow-emerald-600/20"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Create User
                  </Button>
                )}
              </div>

              {/* Body */}
              {isAdmin ? (
                <UsersTable token={token} refreshKey={createdCount} />
              ) : (
                /* Non-admin — restricted view */
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
                    <Lock className="h-6 w-6 text-muted-foreground/20" />
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground/40">
                    Restricted
                  </p>
                  <p className="text-xs text-muted-foreground/25 mt-1 max-w-xs">
                    User management is only available to admins. Contact your
                    administrator if you need access.
                  </p>
                </div>
              )}
            </div>

            {/* Admin-only notice */}
            <div className="rounded-2xl border border-border/30 bg-muted/1.5 px-6 py-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-4 w-4 text-emerald-500/60 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground/50">
                    Admin only
                  </p>
                  <p className="text-[11px] text-muted-foreground/30 mt-0.5 leading-relaxed">
                    Only users with the Admin role can create, edit, or
                    deactivate CRM accounts. All changes are logged for security
                    purposes.
                  </p>
                </div>
              </div>
            </div>

            {/* Appearance card */}
            <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    {theme === "dark" ? (
                      <Moon className="h-4 w-4 text-violet-500" />
                    ) : (
                      <Sun className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold">Appearance</p>
                    <p className="text-[11px] text-muted-foreground/40 mt-0.5">
                      Customize your display preferences
                    </p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="crm-dark-mode"
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <Moon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-sm font-semibold">Dark Mode</span>
                      <p className="text-[11px] text-muted-foreground/40 mt-0.5">
                        Switch between light and dark themes
                      </p>
                    </div>
                  </Label>
                  <Switch
                    id="crm-dark-mode"
                    checked={theme === "dark"}
                    onCheckedChange={(checked) =>
                      setTheme(checked ? "dark" : "light")
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Modals ── */}
      {isAdmin && (
        <CreateUserModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          token={token}
          onCreated={handleUserCreated}
        />
      )}
    </div>
  );
}

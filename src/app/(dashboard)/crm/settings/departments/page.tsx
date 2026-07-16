"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, ArrowLeft,
  Users, ShieldCheck, ChevronRight, Lock, HeartHandshake, Building2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { DepartmentsManager } from "@/components/crm/DepartmentsManager";

interface CrmUserData {
  _id: string;
  fullName: string;
  username: string;
  email: string;
  avatar?: string;
  role: string;
}

export default function DepartmentsSettingsPage() {
  const router = useRouter();
  const [user, setUser] = React.useState<CrmUserData | null>(null);
  const [token, setToken] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const init = async () => {
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
    init();
  }, [router]);

  const isAdmin = user?.role === "admin";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
          </div>
          <p className="text-xs text-muted-foreground/70 tracking-widest uppercase">Loading</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen w-full bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/crm/dashboard")} className="h-9 w-9 p-0 rounded-xl border border-border/40 hover:bg-muted/50 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">Settings</h1>
            <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">Manage your CRM workspace</p>
          </div>
          <Badge variant="outline" className="text-[10px] h-5 px-2 rounded-full capitalize font-semibold ml-auto hidden sm:inline-flex shrink-0">
            {user.role}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border/30">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Navigation</p>
              </div>
              <div className="p-2 space-y-1">
                <button
                  onClick={() => router.push("/crm/settings")}
                  className="w-full flex items-center justify-between gap-2.5 rounded-xl px-3 h-9 text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="h-3.5 w-3.5" />
                    User Management
                  </div>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                </button>
                <button
                  onClick={() => router.push("/crm/settings/departments")}
                  className="w-full flex items-center justify-between gap-2.5 rounded-xl px-3 h-9 text-xs font-semibold bg-emerald-500/10 text-emerald-600"
                >
                  <div className="flex items-center gap-2.5">
                    <Building2 className="h-3.5 w-3.5" />
                    Departments
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
                    Team Engagement
                  </div>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-9 space-y-4">
            <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
              {isAdmin ? (
                <DepartmentsManager token={token} />
              ) : (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
                    <Lock className="h-6 w-6 text-muted-foreground/20" />
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground/80">Restricted</p>
                  <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs">
                    Department management is only available to admins. Contact your administrator if you need access.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border/30 bg-muted/1.5 px-4 sm:px-6 py-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-4 w-4 text-emerald-500/60 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground/80">Admin only</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5 leading-relaxed">
                    Departments assigned here are what employees see everywhere else in the app — Beacon, Team Pulse,
                    TimeProof, and their own profile. Deactivating a department hides it from new assignments but
                    keeps it visible for anyone already on it.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

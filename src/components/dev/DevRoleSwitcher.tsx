"use client";

import { useState, useEffect, useContext } from "react";
import { Shield, ChevronDown, Loader2, X } from "lucide-react";
import { AuthContext } from "@/providers/AuthProvider";

type Role = "admin" | "super_admin" | "employee" | "driver" | "customer";

const ROLES: { value: Role; label: string; color: string }[] = [
  { value: "super_admin", label: "Super Admin", color: "bg-red-500" },
  { value: "admin", label: "Admin / Org Owner", color: "bg-violet-500" },
  { value: "employee", label: "Employee", color: "bg-blue-500" },
  { value: "driver", label: "Driver", color: "bg-emerald-500" },
  { value: "customer", label: "Customer", color: "bg-amber-500" },
];

const ORIGINAL_ROLE_KEY = "dev_original_role";
const OVERRIDE_ROLE_KEY = "dev_role_override";

export function DevRoleSwitcher() {
  const context = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [originalRole, setOriginalRole] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOriginalRole(localStorage.getItem(ORIGINAL_ROLE_KEY));
    }
  }, []);

  if (!context) return null;

  const { user, isSignedIn } = context;
  const canSwitch = user?.role === "admin" || user?.role === "super_admin" || !!originalRole;

  if (!isSignedIn || !canSwitch) return null;

  const switchTo = (role: Role) => {
    if (switching) return;
    setSwitching(true);
    if (!originalRole && user?.role) {
      localStorage.setItem(ORIGINAL_ROLE_KEY, user.role);
      setOriginalRole(user.role);
    }
    localStorage.setItem(OVERRIDE_ROLE_KEY, role);
    window.location.href = role === "driver" ? "/driver" : role === "customer" ? "/customer" : "/";
  };

  const restore = () => {
    if (!originalRole || switching) return;
    setSwitching(true);
    localStorage.removeItem(OVERRIDE_ROLE_KEY);
    localStorage.removeItem(ORIGINAL_ROLE_KEY);
    setOriginalRole(null);
    window.location.href = "/";
  };

  const currentRole = ROLES.find((r) => r.value === user?.role);

  return (
    <div className="fixed bottom-4 right-4 z-9999">
      {open && (
        <div className="mb-2 w-56 rounded-xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
          <div className="px-3 py-2.5 border-b border-border/30 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Switch Role
            </span>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="size-3.5" />
            </button>
          </div>
          <div className="p-1.5 space-y-0.5">
            {ROLES.map((role) => (
              <button
                key={role.value}
                disabled={switching || role.value === user?.role}
                onClick={() => switchTo(role.value)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all text-xs font-medium
                  ${role.value === user?.role ? "bg-primary/10 text-primary font-bold" : "hover:bg-accent/60 text-foreground/80"}
                  disabled:opacity-40`}
              >
                <div className={`size-2 rounded-full ${role.color} ${role.value === user?.role ? "ring-2 ring-primary/30 ring-offset-1 ring-offset-card" : ""}`} />
                {role.label}
                {role.value === user?.role && (
                  <span className="ml-auto text-[9px] font-bold text-primary/60 uppercase">Current</span>
                )}
              </button>
            ))}
          </div>
          {originalRole && originalRole !== user?.role && (
            <div className="px-1.5 pb-1.5">
              <button
                onClick={restore}
                disabled={switching}
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-amber-500/10 text-amber-600 text-[11px] font-bold hover:bg-amber-500/20 transition-all"
              >
                {switching ? <Loader2 className="size-3 animate-spin" /> : <Shield className="size-3" />}
                Restore Original ({originalRole})
              </button>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 rounded-full shadow-lg border border-border/30 backdrop-blur-xl transition-all duration-200 hover:shadow-xl hover:scale-105 text-xs font-bold
          ${originalRole && originalRole !== user?.role ? "bg-amber-500 text-white border-amber-400" : "bg-card/90 text-foreground"}`}
      >
        {switching ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <div className={`size-2 rounded-full ${currentRole?.color || "bg-muted"}`} />
        )}
        {currentRole?.label || user?.role || "Unknown"}
        <ChevronDown className={`size-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
    </div>
  );
}

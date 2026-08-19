"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useOrg } from "@/hooks/useOrg";
import { adminStore } from "@/store/admin-store";
import { apiClient } from "@/lib/api-client";
import { SupraSpaceMessengerProvider } from "@/context/SupraSpaceMessengerContext";

/**
 * Minimal shell for routes meant to feel like their own dedicated app rather
 * than a tab inside the main Suprah dashboard (currently just SupraSpace) —
 * see the "Dedicated SupraSpace PWA" plan. Deliberately does NOT include
 * (dashboard)/layout.tsx's SidebarProvider/AppSidebar, ProfileProvider,
 * NotificationProvider/CrmNotificationProvider, or its usePresence()/
 * usePresenceSocket()/useCrmWebPush() calls — none of those are needed here:
 * SupraSpaceMessengerContext only depends on useCrmToken() -> useAuth(), and
 * SupraSpace's own page already renders its own <CrmPushPrompt/> (which
 * calls useCrmWebPush() itself), so nothing is lost by skipping the
 * dashboard's copies of that machinery.
 *
 * The role-redirect logic below IS copied from (dashboard)/layout.tsx,
 * deliberately — unlike the chrome/hooks above, this is a real access-control
 * boundary (keeps customers/drivers/orgless employees off CRM-only pages),
 * not dashboard-specific weight.
 */
export default function ChatLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const { organization, isLoaded: isOrgLoaded, isSuperAdmin, isDriver, userRole } = useOrg();
  const { isImpersonating } = adminStore.useStore();
  const [isRedirecting, setIsRedirecting] = React.useState(false);
  const [hasResolvedOrgAccess, setHasResolvedOrgAccess] = React.useState(false);

  React.useEffect(() => {
    if (isOrgLoaded) setHasResolvedOrgAccess(true);
  }, [isOrgLoaded]);

  React.useEffect(() => {
    if (!isOrgLoaded) return;

    if (isSuperAdmin && !isImpersonating) return;

    if (isDriver) {
      setIsRedirecting(true);
      router.push("/driver");
      return;
    }

    const isCustomer = userRole === "customer";
    const isEmployee = userRole === "employee";

    if (isCustomer) {
      setIsRedirecting(true);
      router.push("/customer");
      return;
    }

    if (!organization && isEmployee) {
      setIsRedirecting(true);
      router.push("/org-selection");
      return;
    }
  }, [isOrgLoaded, organization, isSuperAdmin, isDriver, router, isImpersonating, userRole]);

  // Same 10h proactive CRM JWT refresh (dashboard) layout.tsx) does — a chat
  // tab kept open all shift is exactly the "long-lived session" case this
  // guards against (12h token expiry, see crmAuth.middleware.ts).
  React.useEffect(() => {
    const TOKEN_REFRESH_INTERVAL_MS = 10 * 60 * 60 * 1000;
    const refresh = async () => {
      const t = localStorage.getItem("crm_token");
      if (!t) return;
      try {
        const res = await apiClient.post("/api/crm/token-refresh", {}, { headers: { Authorization: `Bearer ${t}` } });
        const newToken = res.data?.data?.token;
        if (newToken) localStorage.setItem("crm_token", newToken);
      } catch {
        // Best-effort — same as the dashboard's copy of this logic.
      }
    };
    const id = setInterval(refresh, TOKEN_REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const { isLoaded, isSignedIn } = useAuth();
  if (isLoaded && !isSignedIn) return null;

  const isCustomer = userRole === "customer";
  const isEmployee = userRole === "employee";

  if (
    !hasResolvedOrgAccess ||
    isCustomer ||
    isDriver ||
    (!organization && isEmployee && !isSuperAdmin) ||
    isRedirecting
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <SupraSpaceMessengerProvider>
      {children}
    </SupraSpaceMessengerProvider>
  );
}

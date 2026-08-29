"use client";

import * as React from "react";

import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser, useAuthActions, useAuth } from "@/providers/AuthProvider";
import { NotificationBell } from "@/components/notifications";
import { NotificationProvider } from "@/context/NotificationContext";
import { CrmNotificationProvider } from "@/context/CrmNotificationContext";
import { CalendarNotificationProvider } from "@/context/CalendarNotificationContext";
import { useCalendarSocket } from "@/hooks/useCalendarSocket";
import { SupraSpaceMessengerProvider } from "@/context/SupraSpaceMessengerContext";
import { MessengerDropdown } from "@/components/supraspace/MessengerDropdown";
import { ChatPopupManager } from "@/components/supraspace/ChatPopupManager";
// Suprah Pulse360 — global alert popup. Mounted once here so productivity and
// deadline alerts surface on every route without any page opting in. The store
// behind it is a module-level singleton, so there is no provider to add.
import { Pulse360Popup } from "@/components/crm/pulse360/Pulse360Popup";
import { Pulse360Bell } from "@/components/crm/pulse360/Pulse360Bell";
// Suprah YapLine — global floating PTT dock. Mounted once here (like
// Pulse360Popup) so incoming voice broadcasts are received on EVERY route.
// Module-level singleton store — no provider needed.
import { YapLineDock } from "@/components/yapline/YapLineDock";
import { ProfileProvider, useProfileContext } from "@/context/ProfileContext";
import { ProfileToastProvider } from "@/components/ProfileToast";
import { resolveImageUrl, cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useOrg } from "@/hooks/useOrg";
import { adminStore } from "@/store/admin-store";
import { usePresence } from "@/hooks/usePresence";
import { usePresenceSocket } from "@/hooks/usePresenceSocket";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { dealershipNav } from "@/components/layout/mobile-nav-config";
import { ThemeModeToggle } from "@/components/layout/ThemeModeToggle";
import { DashboardSearch } from "@/components/layout/DashboardSearch";
import { CrmHeader } from "@/components/layout/CrmHeader";
import { MountainTimeClock } from "@/components/layout/MountainTimeClock";
import { CrmPushPrompt } from "@/components/crm/CrmPushPrompt";
import { DebugConsole } from "@/components/pwa/DebugConsole";
import { useCrmWebPush } from "@/hooks/useCrmWebPush";
import { apiClient } from "@/lib/api-client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/* ────────────────────────────────────────────────────────────────────────────
 * Public routes
 *
 * Paths listed here are rendered COMPLETELY BARE: no auth providers, no
 * sign-in checks, no org redirects, no sidebar/header chrome, no presence
 * sockets. Anyone — logged in or not, including automated compliance
 * crawlers (10DLC/TCR carrier review) — gets the page content directly.
 *
 * The bypass happens in DashboardLayout (bottom of file) BEFORE any provider
 * or DashboardLayoutContent mounts, so none of the auth logic ever runs for
 * these paths.
 * ──────────────────────────────────────────────────────────────────────────── */
const PUBLIC_PATHS = ["/privacy-policy", "/terms"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function DashboardLayoutContent({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = useUser();
  const { signOut } = useAuthActions();
  const { avatarUrl } = useProfileContext();
  useCrmWebPush();
  usePresence();
  usePresenceSocket();
  const { organization, isLoaded: isOrgLoaded, isSuperAdmin, isDriver, userRole } = useOrg();
  const router = useRouter();
  const pathname = usePathname();
  const { isImpersonating } = adminStore.useStore();
  const isCrmRoute = pathname === "/crm" || pathname.startsWith("/crm/");
  // SupraSpace renders its own top bar + push prompt already (same component
  // whether reached here, inside the dashboard, or at the separate /supraspace
  // standalone-app route) — showing the dashboard's copies too would duplicate
  // that chrome.
  const isSupraSpaceRoute =
    pathname === "/crm/supra-space" || pathname.startsWith("/crm/supra-space/");
  const isStandaloneCrmShell = pathname === "/crm";
  const showCrmHeader = isCrmRoute && !isStandaloneCrmShell && !isSupraSpaceRoute;
  const showCrmMessenger =
    pathname === "/crm/dashboard" ||
    pathname === "/crm/conversations" ||
    pathname === "/crm/feeds" ||
    pathname === "/crm/hr";
  const showCrmPushPrompt =
    isCrmRoute &&
    !isSupraSpaceRoute &&
    pathname !== "/crm/dashboard" &&
    !pathname.startsWith("/crm/timeproof-clock");
  const [logoutOpen, setLogoutOpen] = React.useState(false);
  const [leadConvoActive, setLeadConvoActive] = React.useState(false);
  const [mailWorkspaceActive, setMailWorkspaceActive] = React.useState(false);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = React.useState(false);

  React.useEffect(() => {
    const handler = (e: Event) => {
      setLeadConvoActive((e as CustomEvent<{ active: boolean }>).detail.active);
    };
    window.addEventListener("crm-leads:convo-state", handler);
    return () => window.removeEventListener("crm-leads:convo-state", handler);
  }, []);

  React.useEffect(() => {
    const handler = (e: Event) => {
      setMailWorkspaceActive(
        Boolean((e as CustomEvent<{ active?: boolean }>).detail?.active),
      );
    };
    window.addEventListener("suprah-mail:workspace-state", handler);
    return () => window.removeEventListener("suprah-mail:workspace-state", handler);
  }, []);

  React.useEffect(() => {
    if (pathname !== "/crm/suprah-mail" && !pathname.startsWith("/crm/suprah-mail/")) {
      setMailWorkspaceActive(false);
    }
  }, [pathname]);

  React.useEffect(() => {
    // A notification click can navigate between modules. Close the drawer on
    // route changes so the destination always opens with its full workspace.
    setNotificationDrawerOpen(false);
  }, [pathname]);

  const [isRedirecting, setIsRedirecting] = React.useState(false);
  const [hasResolvedOrgAccess, setHasResolvedOrgAccess] = React.useState(false);

  React.useEffect(() => {
    router.prefetch("/profile");
    router.prefetch("/settings");
  }, [router]);

  // Proactively renews the CRM JWT (12h expiry — see crmAuth.middleware.ts)
  // before it can expire. The tray-app already does this for its own,
  // separate token copy every 10h, but the BROWSER's copy in localStorage
  // was never refreshed anywhere — a tab left open past 12h (completely
  // normal for a TimeProof Clock page kept open all shift) silently started
  // getting 401s on every poll, with all those calls caught and swallowed,
  // so the displayed Work Time/screenshots/etc. just froze at whatever they
  // last were — while the tray's own, still-valid session kept the real
  // TimeLog data correct underneath. Mirrors the tray's own 10h cadence.
  React.useEffect(() => {
    if (!isCrmRoute) return;
    const TOKEN_REFRESH_INTERVAL_MS = 10 * 60 * 60 * 1000; // 10 hours
    const refresh = async () => {
      const t = localStorage.getItem("crm_token");
      if (!t) return;
      try {
        const res = await apiClient.post("/api/crm/token-refresh", {}, { headers: { Authorization: `Bearer ${t}` } });
        const newToken = res.data?.data?.token;
        if (newToken) localStorage.setItem("crm_token", newToken);
      } catch {
        // Best-effort — if this fails, the existing token just carries on
        // until it actually expires, same as before this fix existed.
      }
    };
    const id = setInterval(refresh, TOKEN_REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isCrmRoute]);

  React.useEffect(() => {
    if (isOrgLoaded) {
      setHasResolvedOrgAccess(true);
    }
  }, [isOrgLoaded]);

  React.useEffect(() => {
    if (!isOrgLoaded) return;

    if (isSuperAdmin && !isImpersonating) {
      if (
        window.location.pathname === "/" ||
        window.location.pathname === "/org-selection"
      ) {
        setIsRedirecting(true);
        router.push("/admin/dashboard");
      }
      return;
    }

    if (isDriver) {
      router.push("/driver");
      return;
    }

    const isCustomer = userRole === "customer";
    const isEmployee = userRole === "employee";

    if (isCustomer) {
      router.push("/customer");
      return;
    }

    if (!organization && isEmployee) {
      router.push("/org-selection");
      return;
    }
  }, [
    isOrgLoaded,
    organization,
    isSuperAdmin,
    isDriver,
    router,
    isImpersonating,
    userRole,
  ]);

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
          <p className="text-sm text-muted-foreground animate-pulse">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider className="h-dvh overflow-hidden">
      <AppSidebar />
      {/* min-w-0 + w-full: lets this flex child shrink below its content's
          intrinsic width instead of forcing the whole page wider than the
          viewport (the classic flex-child overflow bug). */}
      <SidebarInset
        className={cn(
          "min-w-0 w-full min-h-0 overflow-hidden transition-[padding] duration-300 ease-out",
          notificationDrawerOpen && "lg:pr-85 xl:pr-95",
        )}
      >
        {showCrmHeader && (
          <CrmHeader
            showMessenger={showCrmMessenger}
            notificationDrawerOpen={notificationDrawerOpen}
            onNotificationDrawerOpenChange={setNotificationDrawerOpen}
          />
        )}
        {!isCrmRoute && (
          <header className="flex h-16 shrink-0 items-center justify-between px-2 sm:px-4 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
            <div className="flex items-center justify-between gap-2 sm:gap-4 flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm text-muted-foreground border-r pr-4 h-8">
                <SidebarTrigger className="-ml-1" />
                <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground border-r pr-4 h-8">
                  <span className="font-medium whitespace-nowrap">Location:</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 font-normal"
                      >
                        All Locations <ChevronDown className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem>All Locations</DropdownMenuItem>
                      <DropdownMenuItem>Lehi, UT</DropdownMenuItem>
                      <DropdownMenuItem>Orem, UT</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <React.Suspense
                  fallback={
                    <div className="w-10 h-9 bg-muted animate-pulse rounded-md" />
                  }
                >
                  <DashboardSearch />
                </React.Suspense>
              </div>

              <div className="flex items-center gap-1 sm:gap-3">
                <MountainTimeClock compact />

                <ThemeModeToggle compact />

                { }
                <Pulse360Bell />

                { }
                <NotificationBell
                  open={notificationDrawerOpen}
                  onOpenChange={setNotificationDrawerOpen}
                />

                { }
                <MessengerDropdown />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-8 w-8 rounded-full"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={resolveImageUrl(
                            avatarUrl !== null ? avatarUrl : user?.imageUrl,
                          )}
                          alt={user?.fullName || ""}
                        />
                        <AvatarFallback>
                          {user?.firstName?.substring(0, 1).toUpperCase() || "AA"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {user?.fullName}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user?.primaryEmailAddress?.emailAddress}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push("/profile")}>
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/settings")}>
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setLogoutOpen(true); }}>
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>
        )}
        <main
          className={cn(
            // min-w-0 + overflow-x-hidden keep wide children (grids, charts)
            // contained to the content column instead of pushing the page
            // horizontally.
            "relative bg-background md:pb-0 min-w-0 overflow-x-hidden",
            (leadConvoActive || mailWorkspaceActive) ? "pb-0" : "pb-24",
            // Same fixed-viewport-shell + internally-scrolling-main treatment for every
            // route, not just /crm/* — this was previously CRM-only, which left every
            // other page (Team Pulse/Locator, Reports, etc.) with an unbounded page that
            // either overflowed or, worse, had overflow-hidden with no scroll at all,
            // making tall content unreachable.
            "flex-1 min-h-0 overflow-y-auto " +
            "[scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] " +
            "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5 " +
            "[&::-webkit-scrollbar-track]:bg-transparent " +
            "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/50 " +
            "[&::-webkit-scrollbar-thumb:hover]:bg-border"
          )}
        >
          {isStandaloneCrmShell && (
            <div className="absolute left-3 top-3 z-40">
              <SidebarTrigger className="h-8 w-8 rounded-lg border border-border/50 bg-card/95 p-0 shadow-sm backdrop-blur hover:bg-card" />
            </div>
          )}
          {children}
        </main>
        <MobileBottomNav items={dealershipNav} />
      </SidebarInset>

      { }
      <ChatPopupManager />
      <React.Suspense fallback={null}>
        <DebugConsole />
      </React.Suspense>

      { /* Suprah Pulse360 — renders above everything, on every route. */}
      <Pulse360Popup />

      { /* Suprah YapLine — always-on PTT dock, every route. Incoming voice
           broadcasts, the LIVE join pills, and the mini-player all survive
           navigation because this single mount keeps the store's socket and
           WebRTC peers alive across the whole dashboard shell. */}
      <YapLineDock />

      {showCrmPushPrompt && <CrmPushPrompt role={userRole || "employee"} />}

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be signed out of your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => signOut()}>
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}

/**
 * Owns the shared calendar socket + notification provider at the layout
 * level (not page-scoped) so both AppSidebar's badge and the Suprah
 * Calendar page itself read from one live instance.
 */
function CalendarNotificationsGate({ children }: { children: React.ReactNode }) {
  const socket = useCalendarSocket();
  return (
    <CalendarNotificationProvider socket={socket}>
      {children}
    </CalendarNotificationProvider>
  );
}

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  // ── Public-route bypass ──
  // Must come before any provider or DashboardLayoutContent mounts so that
  // no auth check, org redirect, socket, or dashboard chrome runs for these
  // paths. Logged-out visitors (and carrier compliance crawlers) see the
  // page content directly.
  if (isPublicPath(pathname)) {
    return <>{children}</>;
  }

  const isCrmRoute = pathname === "/crm" || pathname.startsWith("/crm/");

  const content = (
    <SupraSpaceMessengerProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SupraSpaceMessengerProvider>
  );

  return (
    <ProfileProvider>
      <ProfileToastProvider>
        <NotificationProvider>
          {/* Keep both notification identities available in the shared drawer.
              CrmNotificationProvider is safe outside CRM routes: without a
              crm_token it remains idle and exposes an empty CRM feed. */}
          <CrmNotificationProvider>
            <CalendarNotificationsGate>{content}</CalendarNotificationsGate>
          </CrmNotificationProvider>
        </NotificationProvider>
      </ProfileToastProvider>
    </ProfileProvider>
  );
}
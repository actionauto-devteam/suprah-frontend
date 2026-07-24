"use client";

import * as React from "react";

import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser, useAuthActions, useAuth } from "@/providers/AuthProvider";
import { NotificationBell } from "@/components/notifications";
import { NotificationProvider } from "@/context/NotificationContext";
import { SupraSpaceMessengerProvider } from "@/context/SupraSpaceMessengerContext";
import { MessengerDropdown } from "@/components/supraspace/MessengerDropdown";
import { ChatPopupManager } from "@/components/supraspace/ChatPopupManager";
// Suprah Pulse360 — global alert popup. Mounted once here so productivity and
// deadline alerts surface on every route without any page opting in. The store
// behind it is a module-level singleton, so there is no provider to add.
import { Pulse360Popup } from "@/components/pulse360/Pulse360Popup";
import { Pulse360Bell } from "@/components/pulse360/Pulse360Bell";

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
  const { organization, isLoaded, isSuperAdmin, isDriver, userRole } = useOrg();
  const router = useRouter();
  const pathname = usePathname();
  const { isImpersonating } = adminStore.useStore();
  const isCrmRoute = pathname === "/crm" || pathname.startsWith("/crm/");
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

  React.useEffect(() => {
    const handler = (e: Event) => {
      setLeadConvoActive((e as CustomEvent<{ active: boolean }>).detail.active);
    };
    window.addEventListener("crm-leads:convo-state", handler);
    return () => window.removeEventListener("crm-leads:convo-state", handler);
  }, []);

  const [isRedirecting, setIsRedirecting] = React.useState(false);
  const [hasResolvedOrgAccess, setHasResolvedOrgAccess] = React.useState(false);

  React.useEffect(() => {
    router.prefetch("/profile");
    router.prefetch("/settings");
  }, [router]);

  React.useEffect(() => {
    if (isLoaded) {
      setHasResolvedOrgAccess(true);
    }
  }, [isLoaded]);

  React.useEffect(() => {
    if (!isLoaded) return;

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
    isLoaded,
    organization,
    isSuperAdmin,
    isDriver,
    router,
    isImpersonating,
    userRole,
  ]);

  const { isSignedIn } = useAuth();
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
    <SidebarProvider className={cn(isCrmRoute && "h-dvh overflow-hidden")}>
      <AppSidebar />
      <SidebarInset className={cn(isCrmRoute && "min-h-0 overflow-hidden")}>
        {showCrmHeader && <CrmHeader showMessenger={showCrmMessenger} />}
        {!isCrmRoute && (
          <header className="flex h-16 shrink-0 items-center justify-between px-2 sm:px-4 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
            <div className="flex items-center justify-between gap-2 sm:gap-4 flex-1">
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
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                >
                  <Plus className="size-5" />
                </Button>

                <ThemeModeToggle compact />

                { }
                <Pulse360Bell />

                { }
                <NotificationBell />

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
            "relative bg-background md:pb-0",
            leadConvoActive ? "pb-0" : "pb-24",
            isCrmRoute
              ? "flex-1 min-h-0 overflow-y-auto " +
                "[scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] " +
                "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5 " +
                "[&::-webkit-scrollbar-track]:bg-transparent " +
                "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/50 " +
                "[&::-webkit-scrollbar-thumb:hover]:bg-border"
              : "flex-1 overflow-hidden"
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

      { /* Suprah Pulse360 — renders above everything, on every route. */ }
      <Pulse360Popup />

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

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
  <ProfileProvider>
    <ProfileToastProvider>
      <NotificationProvider>
        <SupraSpaceMessengerProvider>
          <DashboardLayoutContent>{children}</DashboardLayoutContent>
        </SupraSpaceMessengerProvider>
      </NotificationProvider>
    </ProfileToastProvider>
  </ProfileProvider>
);
}

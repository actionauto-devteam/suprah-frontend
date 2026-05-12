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

import { ProfileProvider, useProfileContext } from "@/context/ProfileContext";
import { ProfileToastProvider } from "@/components/ProfileToast";
import { resolveImageUrl } from "@/lib/utils";
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
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { dealershipNav } from "@/components/layout/mobile-nav-config";
import { ThemeModeToggle } from "@/components/layout/ThemeModeToggle";
import { DashboardSearch } from "@/components/layout/DashboardSearch";

function DashboardLayoutContent({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = useUser();
  const { signOut } = useAuthActions();
  const { avatarUrl } = useProfileContext();
  usePresence(); // Heartbeat — keeps onlineStatus accurate across the whole app
  // Use custom hook for organization context
  const { organization, isLoaded, isSuperAdmin, isDriver, userRole } = useOrg();
  const router = useRouter();
  const pathname = usePathname();
  const { isImpersonating } = adminStore.useStore();
  const isCrmRoute = pathname === "/crm" || pathname.startsWith("/crm/");

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
    // Wait until org context is fully loaded before making routing decisions
    if (!isLoaded) return;

    // Bypass & Redirect for Super Admin
    // FAILSAFE: If impersonating, DO NOT redirect to admin dashboard
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

    // Drivers don't belong to an org — send them to their own dashboard
    if (isDriver) {
      router.push("/driver");
      return;
    }

    const isCustomer = userRole === "customer";
    const isEmployee = userRole === "employee";

    // Strict isolation: Customers must never view the organization/employee layout
    if (isCustomer) {
      router.push("/customer");
      return;
    }

    // If employee has no organization, they must go to org-selection
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

  // Prevent flashing the dealer dashboard to unauthorized roles while redirecting
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
            Loading workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
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

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                >
                  <Plus className="size-5" />
                </Button>

                <ThemeModeToggle compact />

                {/* Notification Bell */}
                <NotificationBell />

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
                    <DropdownMenuItem onClick={() => signOut()}>
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>
        )}
        <main className="relative flex-1 overflow-hidden bg-background pb-24 md:pb-0">
          {isCrmRoute && (
            <div className="absolute left-3 top-3 z-40">
              <SidebarTrigger className="h-8 w-8 rounded-lg border border-border/50 bg-card/95 p-0 shadow-sm backdrop-blur hover:bg-card" />
            </div>
          )}
          {children}
        </main>
        <MobileBottomNav items={dealershipNav} />
      </SidebarInset>
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
          <DashboardLayoutContent>{children}</DashboardLayoutContent>
        </NotificationProvider>
      </ProfileToastProvider>
    </ProfileProvider>
  );
}

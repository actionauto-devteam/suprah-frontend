"use client";

import * as React from "react";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { DriverSidebar } from "@/components/driver-sidebar";
import { NotificationBell } from "@/components/notifications";
import { NotificationProvider } from "@/context/NotificationContext";

import { useRouter } from "next/navigation";
import { useUser, useAuthActions, useAuth } from "@/providers/AuthProvider";
import { useOrg } from "@/hooks/useOrg";
import { apiClient } from "@/lib/api-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProfileProvider } from "@/context/ProfileContext";
import { useProfileContext } from "@/context/ProfileContext";
import { ProfileToastProvider } from "@/components/ProfileToast";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { driverNav } from "@/components/layout/mobile-nav-config";
import { ThemeModeToggle } from "@/components/layout/ThemeModeToggle";
import { resolveImageUrl } from "@/lib/utils";
import { MountainTimeClock } from "@/components/layout/MountainTimeClock";
import { DriverLocationSharingProvider } from "@/context/DriverLocationSharingContext";
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

function DriverLayoutContent({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user } = useUser();
  const { signOut } = useAuthActions();
  const { getToken } = useAuth();
  const { avatarUrl } = useProfileContext();
  const { isLoaded, isDriver, userRole } = useOrg();
  const router = useRouter();
  const [guardPassed, setGuardPassed] = React.useState(false);
  const [logoutOpen, setLogoutOpen] = React.useState(false);

  React.useEffect(() => {
    const checkApproval = async () => {
      if (!isLoaded) return;

      // Wait until role data has resolved
      if (userRole === undefined) return;

      // If not a driver role, redirect to dealer dashboard
      if (!isDriver) {
        router.push("/");
        return;
      }

      try {
        const token = await getToken();
        // The backend now creates the DriverRequest automatically in authService.completeOnboarding
        // or during Google Sign-Up. We just need to check the status here.
        const response = await apiClient.get("/api/driver-requests/my-status", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const requestData = response.data?.data;

        if (!requestData || requestData.status !== "approved") {
          router.push("/driver/pending");
          return;
        }

        // Driver is approved — grant access
        setGuardPassed(true);
      } catch (err) {
        console.error("[DriverLayout] Approval check failed:", err);
        router.push("/driver/pending");
      }
    };

    checkApproval();
  }, [isLoaded, isDriver, userRole, router, getToken]);

  const { isSignedIn } = useAuth();
  if (isLoaded && !isSignedIn) return null;

  // Show loading while guard is checking
  if (!guardPassed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#050505]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-emerald-600/60 dark:text-emerald-500/60 font-medium uppercase tracking-widest italic animate-pulse">
            Verifying Credentials...
          </p>
        </div>
      </div>
    );
  }

  return (
    <DriverLocationSharingProvider>
      <SidebarProvider>
        <DriverSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between px-2 sm:px-4 border-b border-gray-200 dark:border-white/5 bg-white/80 dark:bg-[#050505]/80 backdrop-blur-xl sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            <MountainTimeClock compact />
            <ThemeModeToggle compact />
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-xl overflow-hidden border border-gray-200 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={resolveImageUrl(
                        avatarUrl !== null ? avatarUrl : user?.imageUrl,
                      )}
                      alt={user?.fullName || ""}
                    />
                    <AvatarFallback className="bg-emerald-500/10 text-emerald-500 font-bold">
                      {user?.firstName?.substring(0, 1).toUpperCase() || "DR"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-64 mt-2 bg-white dark:bg-[#0a0a0a] border-gray-200 dark:border-white/5 shadow-2xl rounded-2xl"
                align="end"
                forceMount
              >
                <DropdownMenuLabel className="font-normal p-4">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">
                      {user?.fullName}
                    </p>
                    <p className="text-xs leading-none text-zinc-500">
                      {user?.primaryEmailAddress?.emailAddress}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-200 dark:bg-white/5" />
                <DropdownMenuItem
                  onClick={() => router.push("/driver/profile")}
                  className="p-3 text-zinc-600 dark:text-zinc-400 focus:text-gray-900 dark:focus:text-white focus:bg-emerald-500/10 cursor-pointer"
                >
                  Account Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push("/driver/settings")}
                  className="p-3 text-zinc-600 dark:text-zinc-400 focus:text-gray-900 dark:focus:text-white focus:bg-emerald-500/10 cursor-pointer"
                >
                  System Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-200 dark:bg-white/5" />
                <DropdownMenuItem
                  onSelect={(e) => { e.preventDefault(); setLogoutOpen(true); }}
                  className="p-3 text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer font-medium"
                >
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#020202] p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
          {children}
        </main>
        <MobileBottomNav items={driverNav} />
      </SidebarInset>
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
    </DriverLocationSharingProvider>
  );
}

export default function DriverLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ProfileProvider>
      <ProfileToastProvider>
        <NotificationProvider>
          <DriverLayoutContent>{children}</DriverLayoutContent>
        </NotificationProvider>
      </ProfileToastProvider>
    </ProfileProvider>
  );
}
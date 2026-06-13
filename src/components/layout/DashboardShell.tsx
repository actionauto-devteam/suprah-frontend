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
import { useRouter } from "next/navigation";
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
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { dealershipNav } from "@/components/layout/mobile-nav-config";
import { ThemeModeToggle } from "@/components/layout/ThemeModeToggle";
import { DashboardSearch } from "@/components/layout/DashboardSearch";
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

interface DashboardShellProps {
  children: React.ReactNode;
}

function DashboardShellContent({ children }: DashboardShellProps) {
  const { user } = useUser();
  const { signOut } = useAuthActions();
  const { avatarUrl } = useProfileContext();
  const { organization, isLoaded, isSuperAdmin, userRole } = useOrg();
  const router = useRouter();
  const { isImpersonating } = adminStore.useStore();
  const [logoutOpen, setLogoutOpen] = React.useState(false);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
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
              <NotificationBell />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={avatarUrl !== null ? avatarUrl : user?.imageUrl}
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
        <main className="flex-1 overflow-hidden bg-background pb-24 md:pb-0">
          {children}
        </main>
        <MobileBottomNav items={dealershipNav} />
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
  );
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <ProfileProvider>
      <ProfileToastProvider>
        <NotificationProvider>
          <DashboardShellContent>{children}</DashboardShellContent>
        </NotificationProvider>
      </ProfileToastProvider>
    </ProfileProvider>
  );
}

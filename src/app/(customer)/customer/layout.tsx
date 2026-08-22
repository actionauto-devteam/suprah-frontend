"use client";

import * as React from "react";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { CustomerSidebar } from "@/components/customer/CustomerSidebar";
import { NotificationBell } from "@/components/notifications";
import { NotificationProvider } from "@/context/NotificationContext";

import { ProfileProvider } from "@/context/ProfileContext";
import { useProfileContext } from "@/context/ProfileContext";
import { ProfileToastProvider } from "@/components/ProfileToast";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { customerNav } from "@/components/layout/mobile-nav-config";
import { ThemeModeToggle } from "@/components/layout/ThemeModeToggle";
import { useRouter } from "next/navigation";
import { useAuthActions, useUser } from "@/providers/AuthProvider";
import { useOrg } from "@/hooks/useOrg";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { resolveImageUrl } from "@/lib/utils";
import { Settings, User, LogOut } from "lucide-react";
import { MountainTimeClock } from "@/components/layout/MountainTimeClock";
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

function CustomerLayoutContent({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { signOut } = useAuthActions();
  const { avatarUrl } = useProfileContext();
  const { userRole, isLoaded, organization } = useOrg();
  const { theme } = useTheme();
  const router = useRouter();
  const [logoutOpen, setLogoutOpen] = React.useState(false);

  React.useEffect(() => {
    if (!isLoaded) return;

    // Strict isolation: Employees shouldn't be trapped in customer dashboards
    if (
      userRole === "employee" ||
      userRole === "admin" ||
      userRole === "super_admin"
    ) {
      router.push("/");
    }

    if (userRole === "driver") {
      router.push("/driver");
    }
  }, [isLoaded, userRole, router]);

  return (
    <SidebarProvider>
      <div
        data-theme={theme}
        style={{ colorScheme: theme }}
        className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950 text-slate-900 dark:text-slate-50 overflow-hidden"
      >
        <CustomerSidebar />
        <SidebarInset className="flex-1 flex flex-col min-w-0 bg-transparent">
          <header className="flex h-14 shrink-0 items-center justify-between px-4 lg:px-5 border-b border-border/50 bg-background/90 backdrop-blur-xl z-10 sticky top-0">
            <div className="flex items-center gap-2.5">
              <SidebarTrigger className="-ml-1 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all" />
              <div className="hidden sm:flex items-center gap-2.5">
                <div className="h-4 w-px bg-border/60" />
                <div className="flex flex-col leading-none">
                  <span className="text-[12px] font-black text-foreground tracking-tight">
                    {organization?.name || "Your Dealership"}
                  </span>
                  <span className="text-[9px] text-muted-foreground mt-0.5 font-medium tracking-widest uppercase">
                    Member Portal
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <MountainTimeClock compact />
              <ThemeModeToggle compact />
              <NotificationBell />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full ring-1 ring-border/60 hover:ring-primary/40 transition-all p-0 ml-0.5"
                  >
                    <Avatar className="h-full w-full">
                      <AvatarImage
                        src={resolveImageUrl(avatarUrl !== null ? avatarUrl : user?.imageUrl)}
                        alt={user?.fullName || "User"}
                      />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-black">
                        {user?.firstName?.charAt(0) || "M"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-60 rounded-2xl" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal p-0">
                    <div className="flex items-center gap-3 p-3.5 pb-3">
                      <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                        <AvatarImage
                          src={resolveImageUrl(avatarUrl !== null ? avatarUrl : user?.imageUrl)}
                          alt={user?.fullName || "User"}
                        />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-black">
                          {user?.firstName?.charAt(0) || "M"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <p className="text-sm font-bold text-foreground leading-none truncate">
                          {user?.fullName}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-none truncate">
                          {user?.primaryEmailAddress?.emailAddress}
                        </p>
                        <span className="mt-1.5 inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary w-fit">
                          Member
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => router.push("/customer/settings")}
                    className="cursor-pointer gap-2 rounded-xl mx-1"
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/customer/settings")}
                    className="cursor-pointer gap-2 rounded-xl mx-1"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={(e) => { e.preventDefault(); setLogoutOpen(true); }}
                    className="text-red-500 cursor-pointer gap-2 rounded-xl mx-1 mb-1"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 lg:p-8 pb-24 md:pb-8">
            <div className="w-full">{children}</div>
          </main>
          <MobileBottomNav items={customerNav} />
        </SidebarInset>
      </div>

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

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProfileProvider>
      <ProfileToastProvider>
        <NotificationProvider>
          <CustomerLayoutContent>{children}</CustomerLayoutContent>
        </NotificationProvider>
      </ProfileToastProvider>
    </ProfileProvider>
  );
}

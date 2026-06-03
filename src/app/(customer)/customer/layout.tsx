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

function CustomerLayoutContent({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { signOut } = useAuthActions();
  const { avatarUrl } = useProfileContext();
  const { userRole, isLoaded } = useOrg();
  const { theme } = useTheme();
  const router = useRouter();

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
          <header className="flex h-16 shrink-0 items-center justify-between px-4 lg:px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl z-10 sticky top-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="-ml-1 h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all" />
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700" />
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-zinc-900 dark:text-zinc-50 leading-none tracking-tight">
                    Action Auto
                  </span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-none mt-0.5 font-medium">
                    Member Portal
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <ThemeModeToggle compact />
              <NotificationBell />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full ring-1 ring-zinc-200 dark:ring-zinc-700 hover:ring-green-500 dark:hover:ring-green-500 transition-all p-0"
                  >
                    <Avatar className="h-full w-full">
                      <AvatarImage
                        src={resolveImageUrl(
                          avatarUrl !== null ? avatarUrl : user?.imageUrl,
                        )}
                        alt={user?.fullName || "User"}
                      />
                      <AvatarFallback className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-bold">
                        {user?.firstName?.charAt(0) || "C"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-60" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal p-0">
                    <div className="flex items-center gap-3 p-3 pb-2">
                      <Avatar className="h-9 w-9 ring-2 ring-green-500/20">
                        <AvatarImage
                          src={resolveImageUrl(
                            avatarUrl !== null ? avatarUrl : user?.imageUrl,
                          )}
                          alt={user?.fullName || "User"}
                        />
                        <AvatarFallback className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-bold">
                          {user?.firstName?.charAt(0) || "C"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 leading-none truncate">
                          {user?.fullName}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-none truncate">
                          {user?.primaryEmailAddress?.emailAddress}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => router.push("/customer/settings")}
                    className="cursor-pointer gap-2"
                  >
                    <User className="h-4 w-4 text-zinc-400" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/customer/settings")}
                    className="cursor-pointer gap-2"
                  >
                    <Settings className="h-4 w-4 text-zinc-400" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="text-red-600 dark:text-red-500 cursor-pointer gap-2"
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

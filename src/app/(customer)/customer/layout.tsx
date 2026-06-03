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
          <header className="flex h-16 shrink-0 items-center justify-between px-4 lg:px-8 border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl z-10 sticky top-0">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-2 text-zinc-500 hover:text-foreground" />
              <div className="hidden sm:flex items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight">
                  Action Auto Membership
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <ThemeModeToggle compact />
              <NotificationBell />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-9 w-9 rounded-full ring-2 ring-zinc-200 dark:ring-zinc-800 hover:ring-green-500 dark:hover:ring-green-500 transition-all p-0"
                  >
                    <Avatar className="h-full w-full">
                      <AvatarImage
                        src={resolveImageUrl(
                          avatarUrl !== null ? avatarUrl : user?.imageUrl,
                        )}
                        alt={user?.fullName || "User"}
                      />
                      <AvatarFallback className="bg-green-100 text-green-700">
                        {user?.firstName?.charAt(0) || "C"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal p-3">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.fullName}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground mt-1">
                        {user?.primaryEmailAddress?.emailAddress}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => router.push("/customer/settings")}
                    className="cursor-pointer"
                  >
                    Dashboard Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="text-red-600 cursor-pointer"
                  >
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

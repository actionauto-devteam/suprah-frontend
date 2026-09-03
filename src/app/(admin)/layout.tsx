'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Separator } from "@/components/ui/separator";
import { NotificationProvider } from "@/context/NotificationContext";
import { NotificationBell } from "@/components/notifications";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { adminNav } from "@/components/layout/mobile-nav-config";
import { ThemeModeToggle } from "@/components/layout/ThemeModeToggle";
import { useAuth } from "@/providers/AuthProvider";
import { useOrg } from "@/hooks/useOrg";
import { MountainTimeClock } from "@/components/layout/MountainTimeClock";
import { SupraSpaceMessengerProvider } from "@/context/SupraSpaceMessengerContext";
import { ChatPopupManager } from "@/components/supraspace/ChatPopupManager";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { AdminCommandPalette } from "@/components/admin/AdminCommandPalette";
import { PageLoadingState } from "@/components/shared/EmptyLoadingState";

function AdminLayoutContent({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const { isLoaded, isSignedIn } = useAuth();
    const { isLoaded: isOrgLoaded, isSuperAdmin } = useOrg();
    const router = useRouter();

    // Backend routes are already requireSuperAdmin-gated — this closes the
    // client-side gap where any authenticated user could reach /admin/* and
    // see the shell before their API calls started 403ing. Hooks must run
    // unconditionally on every render, so this stays above the early returns.
    React.useEffect(() => {
        if (isOrgLoaded && !isSuperAdmin) {
            router.replace('/');
        }
    }, [isOrgLoaded, isSuperAdmin, router]);

    if (isLoaded && !isSignedIn) return null;
    if (!isOrgLoaded || !isSuperAdmin) return <PageLoadingState />;

    return (
        <SidebarProvider>
            <AdminSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b px-2 sm:px-4 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
                    <div className="flex min-w-0 items-center gap-2">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-1 h-4 sm:mr-2" />
                        <span className="truncate text-sm text-muted-foreground">Super Admin</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                        <AdminCommandPalette />
                        <MountainTimeClock compact className="hidden xs:inline-flex" />
                        <ThemeModeToggle compact />
                        <NotificationBell />
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4 pt-4 md:p-8 pb-24 md:pb-8">
                    {children}
                </div>
                <MobileBottomNav items={adminNav} />
            </SidebarInset>
            <ImpersonationBanner />
            <ChatPopupManager />
        </SidebarProvider>
    );
}

export default function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <NotificationProvider>
            <SupraSpaceMessengerProvider>
                <AdminLayoutContent>
                    {children}
                </AdminLayoutContent>
            </SupraSpaceMessengerProvider>
        </NotificationProvider>
    );
}

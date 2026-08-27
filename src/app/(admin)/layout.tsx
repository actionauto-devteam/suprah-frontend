'use client';

import React from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Separator } from "@/components/ui/separator";
import { NotificationProvider } from "@/context/NotificationContext";
import { NotificationBell } from "@/components/notifications";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { adminNav } from "@/components/layout/mobile-nav-config";
import { ThemeModeToggle } from "@/components/layout/ThemeModeToggle";
import { useAuth } from "@/providers/AuthProvider";
import { MountainTimeClock } from "@/components/layout/MountainTimeClock";
import { SupraSpaceMessengerProvider } from "@/context/SupraSpaceMessengerContext";
import { ChatPopupManager } from "@/components/supraspace/ChatPopupManager";

function AdminLayoutContent({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const { isLoaded, isSignedIn } = useAuth();
    if (isLoaded && !isSignedIn) return null;

    return (
        <SidebarProvider>
            <AdminSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b px-2 sm:px-4 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
                    <div className="flex min-w-0 items-center gap-2">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-1 h-4 sm:mr-2" />
                        <span className="truncate text-sm text-muted-foreground sm:text-base">Super Admin</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
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

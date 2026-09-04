"use client"

import * as React from "react"
import Image from "next/image"
import {
    LayoutDashboard,
    Users,
    Building2,
    LogOut,
    ChevronRight,
    User2,
    Truck,
    CreditCard,
} from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useAuthActions, useUser } from "@/providers/AuthProvider"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const data = {
    navMain: [
        { title: "Overview", url: "/admin/dashboard", icon: LayoutDashboard },
        { title: "Dealerships", url: "/admin/organizations", icon: Building2 },
        { title: "Users", url: "/admin/users", icon: Users },
        { title: "Drivers", url: "/admin/drivers", icon: Truck },
        { title: "Payouts", url: "/admin/payouts", icon: CreditCard },
    ],
}

// Same signature nav treatment as the dealership-facing AppSidebar: a subtle
// primary tint on the active row plus a glowing rail indicator, instead of a
// flat highlight.
const navItemClass =
    "group/item relative transition-all duration-200 hover:translate-x-0.5 " +
    "data-[active=true]:bg-primary/10 data-[active=true]:text-primary " +
    "data-[active=true]:font-medium data-[active=true]:shadow-sm data-[active=true]:shadow-primary/10";

function ActiveStrip() {
    return (
        <span className="pointer-events-none absolute left-0 top-1/2 h-5 w-0.75 -translate-y-1/2 rounded-full bg-linear-to-b from-primary to-primary/40 shadow-md shadow-primary/50" />
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="mt-4 flex items-center gap-2 px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
            <span className="h-px w-3 bg-linear-to-r from-primary/60 to-transparent" />
            {children}
        </div>
    );
}

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname()
    const { signOut } = useAuthActions()
    const { user } = useUser()
    const [logoutOpen, setLogoutOpen] = React.useState(false)

    return (
        <Sidebar variant="inset" className="border-r bg-sidebar" {...props}>
            <SidebarHeader className="relative flex h-16 items-center justify-center px-6 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-linear-to-r after:from-transparent after:via-border after:to-transparent">
                <div
                    aria-hidden
                    className="pointer-events-none absolute left-1/2 top-1/2 size-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary opacity-[0.10] blur-2xl"
                />
                <Link href="/admin/dashboard" className="relative flex w-full items-center justify-center">
                    <Image
                        src="/favicon.png"
                        alt="Suprah AI"
                        width={300}
                        height={300}
                        className="object-contain dark:invert-0 invert"
                        priority
                    />
                </Link>
            </SidebarHeader>
            <SidebarContent className="p-2">
                <SectionLabel>Super Admin</SectionLabel>
                <SidebarMenu>
                    {data.navMain.map((item) => {
                        const isActive = pathname === item.url || pathname.startsWith(item.url + "/");
                        return (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={isActive}
                                    tooltip={item.title}
                                    className={navItemClass}
                                >
                                    <Link href={item.url}>
                                        {isActive && <ActiveStrip />}
                                        <item.icon className="transition-transform duration-200 group-hover/item:scale-110" />
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    })}
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="border-t bg-sidebar px-2 py-3">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="w-full gap-3 rounded-lg border border-transparent data-[state=open]:border-border data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                >
                                    <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <User2 className="size-4" />
                                    </div>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-semibold">{user?.fullName || 'Admin User'}</span>
                                        <span className="truncate text-xs text-muted-foreground">{user?.primaryEmailAddress?.emailAddress || 'admin@example.com'}</span>
                                    </div>
                                    <ChevronRight className="ml-auto size-4 shrink-0" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                side="top"
                                className="w-[--radix-popper-anchor-width]"
                            >
                                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setLogoutOpen(true) }}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Sign out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>

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
        </Sidebar>
    )
}

"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
    LayoutDashboard,
    Users,
    Building2,
    LogOut,
    ChevronRight,
    User2,
    Truck,
    CreditCard,
    Bell,
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
import { useAuth, useAuthActions, useUser } from "@/providers/AuthProvider"
import { apiClient } from "@/lib/api-client"
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
import { cn } from "@/lib/utils"

const SECTIONS = [
    {
        label: "Overview",
        items: [{ title: "Operations", url: "/admin/dashboard", icon: LayoutDashboard }],
    },
    {
        label: "Operations",
        items: [
            { title: "Drivers", url: "/admin/drivers", icon: Truck, badge: "queue" as const },
            { title: "Payouts", url: "/admin/payouts", icon: CreditCard },
            { title: "Notifications", url: "/admin/notifications", icon: Bell },
        ],
    },
    {
        label: "Platform",
        items: [
            { title: "Dealerships", url: "/admin/organizations", icon: Building2 },
            { title: "Users", url: "/admin/users", icon: Users },
        ],
    },
]

const navItemClass =
    "group/item relative transition-all duration-200 " +
    "data-[active=true]:bg-primary/10 data-[active=true]:text-primary " +
    "data-[active=true]:font-medium"

function ActiveStrip() {
    return (
        <span className="pointer-events-none absolute left-0 top-1/2 h-5 w-0.75 -translate-y-1/2 rounded-full bg-primary" />
    )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60 group-data-[collapsible=icon]/sidebar-wrapper:hidden">
            {children}
        </div>
    )
}

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname()
    const { signOut } = useAuthActions()
    const { user } = useUser()
    const { getToken } = useAuth()
    const [logoutOpen, setLogoutOpen] = React.useState(false)

    const { data: queueCount } = useQuery({
        queryKey: ["admin-review-queue"],
        queryFn: async () => {
            const token = await getToken()
            const res = await apiClient.get("/api/admin/review-queue", {
                headers: { Authorization: `Bearer ${token}` },
            })
            return (res.data?.data?.items || []).length as number
        },
        refetchInterval: 60000,
        refetchOnWindowFocus: true,
    })

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
                        className="object-contain invert dark:invert-0"
                        priority
                    />
                </Link>
            </SidebarHeader>

            <SidebarContent className="p-2">
                {SECTIONS.map((section) => (
                    <div key={section.label}>
                        <SectionLabel>{section.label}</SectionLabel>
                        <SidebarMenu>
                            {section.items.map((item) => {
                                const isActive =
                                    pathname === item.url || pathname.startsWith(item.url + "/")
                                const badge =
                                    "badge" in item && item.badge === "queue" ? queueCount ?? 0 : 0

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
                                                <span className="flex-1">{item.title}</span>
                                                {badge > 0 && (
                                                    <span
                                                        className={cn(
                                                            "ml-auto rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums",
                                                            "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                                                            "group-data-[collapsible=icon]/sidebar-wrapper:hidden",
                                                        )}
                                                    >
                                                        {badge}
                                                    </span>
                                                )}
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
                    </div>
                ))}
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
                                        <span className="truncate font-medium">{user?.fullName || "Admin"}</span>
                                        <span className="truncate text-xs text-muted-foreground">
                                            {user?.primaryEmailAddress?.emailAddress || ""}
                                        </span>
                                    </div>
                                    <ChevronRight className="ml-auto size-4 shrink-0" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width]">
                                <DropdownMenuItem
                                    onSelect={(e) => {
                                        e.preventDefault()
                                        setLogoutOpen(true)
                                    }}
                                >
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

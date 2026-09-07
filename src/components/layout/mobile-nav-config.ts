import {
    Activity,
    Bell,
    Building2,
    Calendar,
    CalendarDays,
    Car,
    ClipboardList,
    Clock,
    CreditCard,
    Crown,
    FolderKanban,
    Gift,
    HeartHandshake,
    LayoutDashboard,
    Mail,
    Megaphone,
    MessageSquare,
    Package,
    PlusSquare,
    Radar,
    RadioTower,
    Rss,
    Settings,
    Truck,
    User,
    Users,
    Wallet,
    Wrench,
} from "lucide-react";

import type { BottomNavItem } from "@/components/layout/MobileBottomNav";

/**
 * Existing five-item dealership nav contract.
 * Keep this stable so old shell detection and callers remain compatible.
 */
export const dealershipNav: BottomNavItem[] = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Inventory", href: "/inventory", icon: Car },
    { label: "CRM", href: "/crm", icon: Users, isCenter: true },
    { label: "Pulse", href: "/team-pulse", icon: Activity },
    { label: "SupraSpace", href: "/crm/supra-space", icon: MessageSquare },
];

/**
 * Full dealership module registry used by the mobile navigation customizer.
 * Routes/icons mirror AppSidebar, but AppSidebar itself is intentionally left
 * untouched to avoid changing its badge, permission, and desktop behavior.
 */
export const dealershipMobileModules: BottomNavItem[] = [
    // Core workspace
    { label: "CRM", href: "/crm", icon: Users },
    { label: "Timeproof Clock", href: "/crm/timeproof-clock", icon: Clock },
    { label: "Team Pulse", href: "/team-pulse", icon: Activity },
    { label: "Team Engagement", href: "/crm/hr", icon: HeartHandshake },
    { label: "Dashboard", href: "/", icon: LayoutDashboard },

    // Apps
    {
        label: "Suprah Calendar",
        href: "/crm/suprah-calendar",
        icon: CalendarDays,
    },
    {
        label: "Suprah Space",
        href: "/crm/supra-space",
        icon: MessageSquare,
    },
    {
        label: "Suprah YapLine",
        href: "/crm/yapline",
        icon: RadioTower,
    },
    {
        label: "Suprah One Desk",
        href: "/crm/suprah-mail",
        icon: Mail,
    },
    {
        label: "Feeds",
        href: "/crm/feeds",
        icon: Rss,
    },
    {
        label: "Conversations",
        href: "/crm/conversations",
        icon: PlusSquare,
    },
    {
        label: "Project Management",
        href: "/project",
        icon: FolderKanban,
    },

    // Services
    {
        label: "All Inventory",
        href: "/inventory",
        icon: Car,
    },
    {
        label: "Transportation",
        href: "/transportation",
        icon: Truck,
    },
    {
        label: "Suprah Radar",
        href: "/suprah-radar",
        icon: Radar,
    },
    {
        label: "Driver Tracker",
        href: "/driver-tracker",
        icon: User,
    },
    {
        label: "SuprahPay",
        href: "/billing",
        icon: CreditCard,
    },
    {
        label: "Reports",
        href: "/reports",
        icon: ClipboardList,
    },

    // Platform / premium / account
    {
        label: "What's New",
        href: "/whats-new",
        icon: Megaphone,
    },
    {
        label: "Subscription",
        href: "/subscription",
        icon: Crown,
    },
    {
        label: "Profile",
        href: "/profile",
        icon: User,
    },
    {
        label: "Settings",
        href: "/settings",
        icon: Settings,
    },
];

export const adminNav: BottomNavItem[] = [
    {
        label: "Overview",
        href: "/admin/dashboard",
        icon: LayoutDashboard,
    },
    {
        label: "Dealers",
        href: "/admin/organizations",
        icon: Building2,
    },
    {
        label: "Users",
        href: "/admin/users",
        icon: Users,
        isCenter: true,
    },
    {
        label: "Drivers",
        href: "/admin/drivers",
        icon: Truck,
    },
    {
        label: "Payouts",
        href: "/admin/payouts",
        icon: CreditCard,
    },
    {
        label: "Alerts",
        href: "/admin/notifications",
        icon: Bell,
    },
];

export const driverNav: BottomNavItem[] = [
    {
        label: "Dashboard",
        href: "/driver",
        icon: LayoutDashboard,
    },
    {
        label: "Loads",
        href: "/driver/loads",
        icon: Truck,
    },
    {
        label: "Available",
        href: "/driver/available-loads",
        icon: Package,
        isCenter: true,
    },
    {
        label: "Schedule",
        href: "/driver/schedule",
        icon: Calendar,
    },
    {
        label: "Profile",
        href: "/driver/profile",
        icon: User,
    },
];

export const customerNav: BottomNavItem[] = [
    {
        label: "Home",
        href: "/customer",
        icon: Wrench,
    },
    {
        label: "Rewards",
        href: "/customer/membership",
        icon: Crown,
    },
    {
        label: "Shop",
        href: "/customer/shop",
        icon: Car,
        isCenter: true,
    },
    {
        label: "Wallet",
        href: "/customer/payments",
        icon: Wallet,
    },
    {
        label: "Refer",
        href: "/customer/refer",
        icon: Gift,
    },
];
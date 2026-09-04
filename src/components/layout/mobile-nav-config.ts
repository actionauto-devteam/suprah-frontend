import {
    Activity,
    LayoutDashboard,
    Car,
    Users,
    Truck,
    CreditCard,
    Building2,
    DollarSign,
    Calendar,
    Wrench,
    Crown,
    Gift,
    Wallet,
    ClipboardList,
    User,
    MessageSquare,
} from "lucide-react";
import type { BottomNavItem } from "@/components/layout/MobileBottomNav";

export const dealershipNav: BottomNavItem[] = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Inventory", href: "/inventory", icon: Car },
    { label: "CRM", href: "/crm", icon: Users, isCenter: true },
    { label: "Pulse", href: "/team-pulse", icon: Activity },
    { label: "SupraSpace", href: "/crm/supra-space", icon: MessageSquare },
];

export const adminNav: BottomNavItem[] = [
    { label: "Overview", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Dealers", href: "/admin/organizations", icon: Building2 },
    { label: "Users", href: "/admin/users", icon: Users, isCenter: true },
    { label: "Drivers", href: "/admin/drivers", icon: Truck },
    { label: "Payouts", href: "/admin/payouts", icon: CreditCard },
    { label: "Queue", href: "/admin/drivers?tab=queue", icon: ClipboardList },
];

export const driverNav: BottomNavItem[] = [
    { label: "Dashboard", href: "/driver", icon: LayoutDashboard },
    { label: "Loads", href: "/driver/loads", icon: Truck },
    { label: "Schedule", href: "/driver/schedule", icon: Calendar, isCenter: true },
    { label: "Earnings", href: "/driver/earnings", icon: DollarSign },
    { label: "Profile", href: "/driver/profile", icon: User },
];

export const customerNav: BottomNavItem[] = [
    { label: "Home", href: "/customer", icon: Wrench },
    { label: "Rewards", href: "/customer/membership", icon: Crown },
    { label: "Shop", href: "/customer/shop", icon: Car, isCenter: true },
    { label: "Wallet", href: "/customer/payments", icon: Wallet },
    { label: "Refer", href: "/customer/refer", icon: Gift },
];

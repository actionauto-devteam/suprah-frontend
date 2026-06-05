"use client";

import {
  LogOut,
  LayoutDashboard,
  CarFront,
  MapIcon,
  Wallet,
  Settings,
  CreditCard,
  ShoppingBag,
  MessageCircle,
  PhoneCall,
} from "lucide-react";
import { useAuthActions } from "@/providers/AuthProvider";
import { usePathname } from "next/navigation";
import Link from "next/link";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

// ─── Nav definition ───────────────────────────────────────────────────────────

const navItems = [
  {
    title: "Shop Vehicles",
    url: "/customer/shop",
    icon: CarFront,
  },
  {
    title: "My Garage",
    url: "/customer",
    icon: LayoutDashboard,
  },
  {
    title: "Aftermarket",
    url: "/customer/aftermarket",
    icon: ShoppingBag,
  },
  {
    title: "Payments",
    url: "/customer/payments",
    icon: CreditCard,
  },
  {
    title: "Service Network",
    url: "/customer/network",
    icon: MapIcon,
  },
  {
    title: "Refer & Earn",
    url: "/customer/refer",
    icon: Wallet,
  },
  // ── Customer Concern / Support Chat ──────────────────────────────────────
  {
    title: "Support",
    url: "/customer/support",
    icon: MessageCircle,
  },
  // ── Call Center / Voice & Video ──────────────────────────────────────────
  {
    title: "Call Center",
    url: "/customer/call-center",
    icon: PhoneCall,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function CustomerSidebar() {
  const { signOut } = useAuthActions();
  const pathname = usePathname();
  const { state } = useSidebar();

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <SidebarHeader className="flex flex-col items-center justify-center p-4">
        <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
          <span className="font-bold text-sm tracking-tight uppercase truncate max-w-35">
            ACTION AUTO UTAH
          </span>
          <span className="text-[9px] font-extrabold text-green-600 uppercase tracking-widest leading-tight">
            Powered by Supra AI
          </span>
        </div>
      </SidebarHeader>

      {/* ── Nav items ───────────────────────────────────────────────────────── */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2 px-2 mt-4">
              {navItems.map((item) => {
                const isActive =
                  item.url === "/customer"
                    ? pathname === item.url
                    : pathname === item.url || pathname.startsWith(item.url + "/");

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={`h-11 rounded-lg transition-all ${
                        isActive
                          ? "bg-green-500/10 text-green-600 font-semibold"
                          : "text-zinc-500 hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <Link href={item.url} className="flex gap-3">
                        <item.icon
                          className={`w-5 h-5 ${
                            isActive ? "text-green-600" : "text-zinc-400"
                          }`}
                        />
                        {item.title}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <SidebarFooter className="border-t p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="h-11 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <Link href="/customer/settings" className="flex gap-3">
                <Settings className="w-5 h-5 text-zinc-400" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => signOut()}
              className="h-11 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 font-medium transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
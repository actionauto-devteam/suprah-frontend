"use client";

import { useState } from "react";
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
  Zap,
  User,
  Star,
  ChevronRight,
  Tag,
  Sparkles,
  Truck,
  Car,
} from "lucide-react";
import { useAuthActions, useUser } from "@/providers/AuthProvider";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useProfileContext } from "@/context/ProfileContext";
import { resolveImageUrl, cn } from "@/lib/utils";

const navSections = [
  {
    label: "Discover",
    items: [
      {
        title: "Shop Vehicles",
        url: "/customer/shop",
        icon: CarFront,
        hoverTooltip: "Browse our premium inventory and take advantage of Member Exclusive pricing.",
      },
      { title: "My Garage", url: "/customer", icon: LayoutDashboard },
    ],
  },
  {
    label: "Manage",
    items: [
      { title: "Aftermarket", url: "/customer/aftermarket", icon: ShoppingBag },
      { title: "Payments", url: "/customer/payments", icon: CreditCard },
    ],
  },
  {
    label: "Connect",
    items: [
      { title: "Service Network", url: "/customer/network", icon: MapIcon },
      { title: "Refer & Earn", url: "/customer/refer", icon: Wallet },
      { title: "Support", url: "/customer/support", icon: MessageCircle },
      { title: "Call Center", url: "/customer/call-center", icon: PhoneCall },
    ],
  },
];

const SHOP_SUB_ITEMS = [
  { title: "Browse All", url: "/customer/shop", icon: Car, params: "" },
  { title: "New Arrivals", url: "/customer/shop", icon: Sparkles, params: "?sortBy=year&sortOrder=desc" },
  { title: "Special Deals", url: "/customer/shop", icon: Tag, params: "?sortBy=price&sortOrder=asc" },
  { title: "In Transit", url: "/customer/shop", icon: Truck, params: "?status=In+Transit" },
];

export function CustomerSidebar() {
  const { signOut } = useAuthActions();
  const { user } = useUser();
  const { avatarUrl } = useProfileContext();
  const pathname = usePathname();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(pathname.startsWith("/customer/shop"));

  const resolvedAvatar = resolveImageUrl(
    avatarUrl !== null ? avatarUrl : user?.imageUrl,
  );
  const initials = user?.firstName?.charAt(0)?.toUpperCase() || "C";
  const displayName = user?.fullName || "Member";

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      {/* ── Brand Header ─────────────────────────────────────────────────────── */}
      <SidebarHeader className="px-3 py-4 border-b border-zinc-100 dark:border-zinc-800/60">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <div className="shrink-0 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8 w-10 h-10 flex items-center justify-center">
            <Image
              src="/favicon.png"
              alt="Action Auto"
              width={40}
              height={40}
              className="object-contain invert dark:invert-0 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8"
              priority
            />
          </div>
          <div className="group-data-[collapsible=icon]:hidden min-w-0">
            <p className="text-[12px] font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-50 leading-none truncate">
              ACTION AUTO UTAH
            </p>
            <div className="flex items-center gap-1 mt-1.5">
              <Zap className="w-2.5 h-2.5 text-green-500 fill-green-500" />
              <span className="text-[9px] font-bold text-green-600 dark:text-green-500 uppercase tracking-widest leading-none">
                Powered by Supra AI
              </span>
            </div>
          </div>
        </div>
      </SidebarHeader>

      {/* ── Profile Card ─────────────────────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-1 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:pt-2 group-data-[collapsible=icon]:pb-1 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <div className="group-data-[collapsible=icon]:hidden relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700/50 bg-zinc-50 dark:bg-zinc-800/40 w-full">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-green-500 via-emerald-400 to-green-600" />
          <div className="flex items-center gap-2.5 p-3 pt-3.5">
            <Avatar className="h-9 w-9 ring-2 ring-green-500/20 ring-offset-1 ring-offset-zinc-50 dark:ring-offset-zinc-800/40 shrink-0">
              <AvatarImage src={resolvedAvatar} alt={displayName} />
              <AvatarFallback className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-50 truncate leading-tight">
                {displayName}
              </p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
              Member
            </span>
          </div>
        </div>
        <div className="hidden group-data-[collapsible=icon]:block">
          <Avatar className="h-8 w-8 ring-2 ring-green-500/20">
            <AvatarImage src={resolvedAvatar} alt={displayName} />
            <AvatarFallback className="bg-green-100 dark:bg-green-900/30 text-green-700 text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="mx-3 my-2 h-px bg-zinc-100 dark:bg-zinc-800 group-data-[collapsible=icon]:mx-2" />

      {/* ── Navigation ───────────────────────────────────────────────────────── */}
      <SidebarContent className="px-2 py-0">
        <TooltipProvider delayDuration={400}>
          {navSections.map((section) => (
            <SidebarGroup key={section.label} className="py-0.5 px-0">
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 h-6 px-2 group-data-[collapsible=icon]:hidden">
                {section.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-px">
                  {section.items.map((item) => {
                    const isActive =
                      item.url === "/customer"
                        ? pathname === item.url
                        : pathname === item.url || pathname.startsWith(item.url + "/");

                    const activeCls = "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 font-medium hover:bg-green-50 dark:hover:bg-green-950/30 hover:text-green-700 dark:hover:text-green-400";
                    const inactiveCls = "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60";

                    if (item.title === "Shop Vehicles") {
                      return (
                        <CollapsiblePrimitive.Root key="Shop Vehicles" open={shopOpen} onOpenChange={setShopOpen}>
                          <SidebarMenuItem className="relative">
                            {isActive && (
                              <span className="absolute left-0 inset-y-1 w-0.5 bg-green-500 rounded-r-full z-10 group-data-[collapsible=icon]:hidden" />
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <CollapsiblePrimitive.Trigger asChild>
                                  <SidebarMenuButton
                                    isActive={isActive}
                                    tooltip="Shop Vehicles"
                                    className={`rounded-lg transition-all ${isActive ? activeCls : inactiveCls}`}
                                  >
                                    <CarFront className={isActive ? "text-green-600 dark:text-green-400" : "text-zinc-400"} />
                                    <span className="text-[13px]">Shop Vehicles</span>
                                    <ChevronRight
                                      className={cn(
                                        "ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-data-[collapsible=icon]:hidden",
                                        shopOpen && "rotate-90",
                                      )}
                                    />
                                  </SidebarMenuButton>
                                </CollapsiblePrimitive.Trigger>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-55 p-3" sideOffset={8}>
                                <div className="flex items-center gap-1.5 mb-1">
                                  <Star className="h-3 w-3 text-primary shrink-0" />
                                  <p className="text-[11px] font-bold">Member Exclusive</p>
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                  Browse our premium inventory and take advantage of Member Exclusive pricing.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </SidebarMenuItem>
                          <CollapsiblePrimitive.Content className="group-data-[collapsible=icon]:hidden">
                            <SidebarMenuSub>
                              {SHOP_SUB_ITEMS.map((subItem) => (
                                <SidebarMenuSubItem key={subItem.title}>
                                  <SidebarMenuSubButton asChild>
                                    <Link href={subItem.url + subItem.params}>
                                      <subItem.icon className="h-3.5 w-3.5 shrink-0" />
                                      <span className="text-[12px]">{subItem.title}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsiblePrimitive.Content>
                        </CollapsiblePrimitive.Root>
                      );
                    }

                    return (
                      <SidebarMenuItem key={item.title} className="relative">
                        {isActive && (
                          <span className="absolute left-0 inset-y-1 w-0.5 bg-green-500 rounded-r-full z-10 group-data-[collapsible=icon]:hidden" />
                        )}
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.title}
                          className={`rounded-lg transition-all ${isActive ? activeCls : inactiveCls}`}
                        >
                          <Link href={item.url}>
                            <item.icon className={isActive ? "text-green-600 dark:text-green-400" : "text-zinc-400"} />
                            <span className="text-[13px]">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </TooltipProvider>
      </SidebarContent>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <SidebarFooter className="px-2 py-3 border-t border-zinc-100 dark:border-zinc-800/60">
        <SidebarMenu className="gap-px">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Profile"
              className="rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-all"
            >
              <Link href="/customer/settings">
                <User className="text-zinc-400" />
                <span className="text-[13px]">Profile</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Settings"
              className="rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-all"
            >
              <Link href="/customer/settings">
                <Settings className="text-zinc-400" />
                <span className="text-[13px]">Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
              <AlertDialogTrigger asChild>
                <SidebarMenuButton
                  tooltip="Log out"
                  className="rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 font-medium transition-all"
                >
                  <LogOut />
                  <span className="text-[13px]">Log out</span>
                </SidebarMenuButton>
              </AlertDialogTrigger>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>Sign out?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You will be signed out of your account.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => signOut()}
                  >
                    Sign out
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

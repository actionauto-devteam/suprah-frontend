"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Car,
  ChevronRight,
  ClipboardList,
  HeartHandshake,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Truck,
  User,
  CreditCard,
  Users,
  Wrench,
  MapPin,
  Gift,
  Wallet,
  LayoutGrid,
  PlusSquare,
  Rss,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useUser, useAuthActions } from "@/providers/AuthProvider";
import { useOrg } from "@/hooks/useOrg";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfileContext } from "@/context/ProfileContext";
import { resolveImageUrl } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LogOut,
  User as UserIcon,
  Settings as SettingsIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type SidebarNavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  isNew?: boolean;
};

const data = {
  navMain: [
    {
      title: "CRM",
      url: "/crm",
      icon: Users,
    },
    {
      title: "Dashboard",
      url: "/",
      icon: LayoutDashboard,
    },
    {
      title: "Team Pulse",
      url: "/team-pulse",
      icon: Activity,
    },
    {
      title: "Suprah Space",
      url: "/crm/supra-space",
      icon: MessageSquare,
    },
    {
      title: "Feeds",
      url: "/crm/feeds",
      icon: Rss,
    },
    {
      title: "Team Engagement",
      url: "/crm/hr",
      icon: HeartHandshake,
    },
    {
      title: "All Inventory",
      url: "/inventory",
      icon: Car,
    },
  ] satisfies SidebarNavItem[],

  premium: [
    {
      title: "Plugins",
      url: "/plugins",
      icon: LayoutGrid,
      isNew: true,
    },
  ] satisfies SidebarNavItem[],

  services: [
    {
      title: "Transportation",
      url: "/transportation",
      icon: Truck,
    },
    {
      title: "Driver Tracker",
      url: "/driver-tracker",
      icon: User,
    },
    {
      title: "Reports",
      url: "/reports",
      icon: ClipboardList,
    },
    {
      title: "SupraPay",
      url: "/billing",
      icon: CreditCard,
    },
  ] satisfies SidebarNavItem[],
  account: [
    {
      title: "Profile",
      url: "/profile",
      icon: User,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
    },
  ] satisfies SidebarNavItem[],
};

const customerData = {
  navMain: [
    {
      title: "My Garage",
      url: "/dashboard/garage",
      icon: Wrench,
    },
    {
      title: "Service Network",
      url: "/dashboard/network",
      icon: MapPin,
    },
    {
      title: "Refer & Earn",
      url: "/dashboard/referrals",
      icon: Gift,
    },
    {
      title: "Digital Wallet",
      url: "/dashboard/wallet",
      icon: Wallet,
    },
  ] satisfies SidebarNavItem[],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useAuthActions();

  const { isCustomer } = useOrg();
  const { avatarUrl } = useProfileContext();

  const activeNavMain: SidebarNavItem[] = isCustomer
    ? customerData.navMain
    : data.navMain;

  React.useEffect(() => {
    router.prefetch("/profile");
    router.prefetch("/settings");
  }, [router]);

  return (
    <Sidebar variant="inset" collapsible="icon" className="border-r" {...props}>
      <SidebarHeader className="h-16 border-b flex items-center justify-center px-6">
        <div className="flex items-center justify-center w-full group-data-[collapsible=icon]:justify-center">
          <Image
            src="/favicon.png"
            alt="Logo"
            width={300}
            height={300}
            className="object-contain group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8 dark:invert-0 invert"
            priority
          />
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {activeNavMain.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={
                  pathname === item.url || pathname.startsWith(item.url + "/")
                }
                className={
                  item.isNew
                    ? "bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary transition-colors"
                    : ""
                }
              >
                <Link href={item.url}>
                  <item.icon className={item.isNew ? "animate-pulse" : ""} />
                  <span className="font-medium">{item.title}</span>
                  {item.isNew && (
                    <Badge
                      variant="secondary"
                      className="ml-auto text-[8px] h-4 px-1 leading-none uppercase tracking-tighter bg-primary text-primary-foreground border-none group-data-[collapsible=icon]:hidden"
                    >
                      New
                    </Badge>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        {!isCustomer && (
          <>
            <div className="px-4 py-2 mt-4 text-[11px] font-semibold uppercase text-muted-foreground tracking-wider group-data-[collapsible=icon]:hidden">
              Services
            </div>

            <SidebarMenu>
              {data.services.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={
                      pathname === item.url ||
                      pathname.startsWith(item.url + "/")
                    }
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </>
        )}

        {!isCustomer && (
          <>
            <div className="px-4 py-2 mt-4 text-[11px] font-semibold uppercase text-muted-foreground tracking-wider group-data-[collapsible=icon]:hidden">
              Premium
            </div>
            <SidebarMenu>
              {data.premium.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={pathname === item.url || pathname.startsWith(item.url + "/")}
                    className={
                      item.isNew
                        ? "bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary transition-colors"
                        : ""
                    }
                  >
                    <Link href={item.url}>
                      <item.icon className={item.isNew ? "animate-pulse" : ""} />
                      <span className="font-medium">{item.title}</span>
                      {item.isNew && (
                        <Badge
                          variant="secondary"
                          className="ml-auto text-[8px] h-4 px-1 leading-none uppercase tracking-tighter bg-primary text-primary-foreground border-none group-data-[collapsible=icon]:hidden"
                        >
                          New
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </>
        )}

        <div className="px-4 py-2 mt-4 text-[11px] font-semibold uppercase text-muted-foreground tracking-wider group-data-[collapsible=icon]:hidden">
          Account
        </div>

        <SidebarMenu>
          {data.account.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={pathname === item.url}
              >
                <Link href={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t group-data-[collapsible=icon]:p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="w-full data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center"
                >
                  <Avatar className="h-8 w-8 rounded-lg group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7">
                    <AvatarImage
                      src={resolveImageUrl(
                        avatarUrl !== null ? avatarUrl : user?.imageUrl,
                      )}
                      alt={user?.fullName || ""}
                    />
                    <AvatarFallback className="rounded-lg">
                      {user?.firstName?.substring(0, 1).toUpperCase() || "US"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-semibold">
                      {user?.fullName}
                    </span>
                    <span className="truncate text-xs">
                      {user?.primaryEmailAddress?.emailAddress}
                    </span>
                  </div>
                  <ChevronRight className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage
                        src={resolveImageUrl(
                          avatarUrl !== null ? avatarUrl : user?.imageUrl,
                        )}
                        alt={user?.fullName || ""}
                      />
                      <AvatarFallback className="rounded-lg">
                        {user?.firstName?.substring(0, 1).toUpperCase() || "US"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {user?.fullName}
                      </span>
                      <span className="truncate text-xs">
                        {user?.primaryEmailAddress?.emailAddress}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/profile")}>
                  <UserIcon className="mr-2 size-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  <SettingsIcon className="mr-2 size-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="mr-2 size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

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
  Clock,
  FolderKanban,
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
  CalendarDays,
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
import { resolveImageUrl, cn } from "@/lib/utils";
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
import { useSupraSpaceMessenger } from "@/context/SupraSpaceMessengerContext";
import { useProjectNotifications } from "@/context/ProjectNotificationContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type SidebarNavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  isNew?: boolean;
};

const data = {
  navMain: [
    {
      title: "Timeproof Clock",
      url: "/crm/timeproof-clock",
      icon: Clock,
    },
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
      title: "Conversations",
      url: "/crm/conversations",
      icon: PlusSquare,
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
      title: "Suprah Calendar",
      url: "/crm/suprah-calendar",
      icon: CalendarDays,
    },
    {
      title: "Project Management",
      url: "/project",
      icon: FolderKanban,
    },
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

// Shared button styling for nav rows: subtle primary tint + glow when active,
// a small lift on hover. All tokens are theme-native.
const navItemClass =
  "group/item relative transition-all duration-200 hover:translate-x-0.5 " +
  "data-[active=true]:bg-primary/10 data-[active=true]:text-primary " +
  "data-[active=true]:font-medium data-[active=true]:shadow-sm data-[active=true]:shadow-primary/10";

// Signature element: a glowing rail indicator on the active row.
function ActiveStrip() {
  return (
    <span className="pointer-events-none absolute left-0 top-1/2 h-5 w-0.75 -translate-y-1/2 rounded-full bg-linear-to-b from-primary to-primary/40 shadow-md shadow-primary/50 group-data-[collapsible=icon]:hidden" />
  );
}

// Section label with a small digital tick; hidden when collapsed to icons.
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex items-center gap-2 px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70 group-data-[collapsible=icon]:hidden">
      <span className="h-px w-3 bg-linear-to-r from-primary/60 to-transparent" />
      {children}
    </div>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useAuthActions();
  const [logoutOpen, setLogoutOpen] = React.useState(false);

  const { isCustomer } = useOrg();
  const { avatarUrl } = useProfileContext();
  const { totalUnread } = useSupraSpaceMessenger();
  const { unreadCount: pmUnread } = useProjectNotifications();

  const activeNavMain: SidebarNavItem[] = isCustomer
    ? customerData.navMain
    : data.navMain;

  React.useEffect(() => {
    router.prefetch("/profile");
    router.prefetch("/settings");
  }, [router]);

  return (
    <Sidebar variant="inset" collapsible="icon" className="border-r" {...props}>
      {/* Greenish digital ambient — animated, reduced-motion aware */}
      <style>{`
        @keyframes green-float   { 0%,100% { transform: translate(0,0); } 50% { transform: translate(8px,-12px); } }
        @keyframes green-float-2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-10px,10px); } }
        @keyframes green-pulse   { 0%,100% { opacity: .07; } 50% { opacity: .16; } }
        @keyframes digital-scan  { 0% { transform: translateY(-25%); opacity: 0; } 12% { opacity: 1; } 88% { opacity: 1; } 100% { transform: translateY(125%); opacity: 0; } }
        .green-glow-a      { animation: green-float 14s ease-in-out infinite, green-pulse 8s ease-in-out infinite; }
        .green-glow-b      { animation: green-float-2 16s ease-in-out infinite, green-pulse 10s ease-in-out infinite; }
        .digital-scan-line { animation: digital-scan 7s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .green-glow-a, .green-glow-b, .digital-scan-line { animation: none; }
        }
      `}</style>

      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* soft green cast over the entire sidebar */}
        <div className="absolute inset-0 bg-linear-to-brfrom-emerald-500/9ia-emerald-500/[0.04] to-emerald-500/12 dark:from-emerald-500/5 dark:via-emerald-500/2 dark:to-emerald-500/[0.07]" />
        {/* digital grid */}
        <div className="absolute inset-0 bg-size-[24px_24px] bg-[linear-gradient(to_right,rgba(16,185,129,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,0.08)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(16,185,129,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,0.05)_1px,transparent_1px)]" />
        {/* drifting green glows */}
        <div className="green-glow-a absolute -left-10 top-16 size-40 rounded-full bg-emerald-400 blur-3xl" />
        <div className="green-glow-b absolute -right-12 bottom-24 size-44 rounded-full bg-emerald-500 blur-3xl" />
        {/* sweeping scanline */}
        <div className="digital-scan-line absolute inset-x-0 top-0 h-20 bg-linear-to-b from-transparent via-emerald-500/[0.14] to-transparent dark:via-emerald-400/10" />
      </div>

      <SidebarHeader className="relative flex h-16 items-center justify-center px-6 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-linear-to-r after:from-transparent after:via-border after:to-transparent">
        {/* soft halo behind the mark */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary opacity-[0.10] blur-2xl"
        />
        <div className="relative flex w-full items-center justify-center group-data-[collapsible=icon]:justify-center">
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

      {/* Subtle, thin scrollbar: faint thumb at rest, firmer on hover. The nav still
          scrolls as before — this just gives a little visibility instead of fully
          hiding the bar.
            Firefox      -> scrollbar-width: thin + faint scrollbar-color
            WebKit/Blink -> 6px bar, transparent track, low-opacity rounded thumb */}
      <SidebarContent className="p-2 [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/50 [&::-webkit-scrollbar-thumb:hover]:bg-border">
        <SidebarMenu>
          {activeNavMain.map((item) => {
            const isActive =
              pathname === item.url || pathname.startsWith(item.url + "/");
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={isActive}
                  className={cn(
                    navItemClass,
                    item.isNew &&
                    "bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary",
                  )}
                >
                  <Link href={item.url}>
                    {isActive && <ActiveStrip />}
                    <item.icon
                      className={cn(
                        "transition-transform duration-200 group-hover/item:scale-110",
                        item.isNew && "animate-pulse",
                      )}
                    />
                    <span className="font-medium tracking-widest">{item.title}</span>
                    {item.isNew && (
                      <Badge
                        variant="secondary"
                        className="ml-auto text-[8px] h-4 px-1 leading-none uppercase tracking-tighter bg-primary text-primary-foreground border-none group-data-[collapsible=icon]:hidden"
                      >
                        New
                      </Badge>
                    )}
                    {item.title === "Suprah Space" && totalUnread > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-auto text-[9px] h-4 min-w-4 px-1 leading-none bg-blue-500 text-white border-none group-data-[collapsible=icon]:hidden"
                      >
                        {totalUnread > 99 ? "99+" : totalUnread}
                      </Badge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>

        {!isCustomer && (
          <>
            <SectionLabel>Services</SectionLabel>

            <SidebarMenu>
              {data.services.map((item) => {
                const isActive =
                  pathname === item.url || pathname.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={isActive}
                      className={navItemClass}
                    >
                      <Link href={item.url}>
                        {isActive && <ActiveStrip />}
                        <item.icon className="transition-transform duration-200 group-hover/item:scale-110" />
                        <span className="tracking-widest">{item.title}</span>
                        {/* Project Management: unread task-activity badge.
                            Count comes from ProjectNotificationContext —
                            assignments, comments, and status changes on the
                            logged-in user's tasks only. */}
                        {item.title === "Project Management" && pmUnread > 0 && (
                          <Badge
                            variant="secondary"
                            className="ml-auto text-[9px] h-4 min-w-4 px-1 leading-none bg-emerald-600 text-white border-none group-data-[collapsible=icon]:hidden"
                          >
                            {pmUnread > 99 ? "99+" : pmUnread}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </>
        )}

        {!isCustomer && (
          <>
            <SectionLabel>Premium</SectionLabel>
            <SidebarMenu>
              {data.premium.map((item) => {
                const isActive =
                  pathname === item.url || pathname.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={isActive}
                      className={cn(
                        navItemClass,
                        item.isNew &&
                        "bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary",
                      )}
                    >
                      <Link href={item.url}>
                        {isActive && <ActiveStrip />}
                        <item.icon
                          className={cn(
                            "transition-transform duration-200 group-hover/item:scale-110",
                            item.isNew && "animate-pulse",
                          )}
                        />
                        <span className="font-medium tracking-widest">{item.title}</span>
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
                );
              })}
            </SidebarMenu>
          </>
        )}

        <SectionLabel>Account</SectionLabel>

        <SidebarMenu>
          {data.account.map((item) => {
            const isActive = pathname === item.url;
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={isActive}
                  className={navItemClass}
                >
                  <Link href={item.url}>
                    {isActive && <ActiveStrip />}
                    <item.icon className="transition-transform duration-200 group-hover/item:scale-110" />
                    <span className="tracking-widest">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t p-4 group-data-[collapsible=icon]:p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="w-full rounded-lg border border-transparent transition-colors data-[state=open]:border-border data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center"
                >
                  <Avatar className="h-8 w-8 rounded-lg ring-1 ring-inset ring-border group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7">
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
                  <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate text-[13px] font-semibold text-sidebar-foreground">
                      {user?.fullName}
                    </span>
                    <span className="truncate text-[12px] font-medium text-sidebar-foreground/80">
                      {user?.primaryEmailAddress?.emailAddress}
                    </span>
                  </div>
                  <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[collapsible=icon]:hidden" />
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
                    <div className="grid flex-1 text-left leading-tight">
                      <span className="truncate text-[13px] font-semibold text-sidebar-foreground">
                        {user?.fullName}
                      </span>
                      <span className="truncate text-[12px] font-medium text-sidebar-foreground/80">
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
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setLogoutOpen(true); }}>
                  <LogOut className="mr-2 size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />

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
  );
}
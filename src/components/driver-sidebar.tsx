"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Truck,
  Calendar,
  DollarSign,
  User,
  Settings,
  ChevronRight,
  Package,
  Wrench,
  FileText,
  MapPin,
} from "lucide-react";

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User as UserIcon, Settings as SettingsIcon } from "lucide-react";
import { useOrg } from "@/hooks/useOrg";
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

const navItems = [
  { title: "Dashboard", url: "/driver", icon: LayoutDashboard },
  { title: "My Loads", url: "/driver/loads", icon: Truck },
  { title: "Available Loads", url: "/driver/available-loads", icon: Package },
  { title: "Equipment", url: "/driver/equipment", icon: Wrench },
  { title: "Schedule", url: "/driver/schedule", icon: Calendar },
  { title: "Earnings", url: "/driver/earnings", icon: DollarSign },
];

const accountItems = [
  { title: "Profile", url: "/driver/profile", icon: User },
  { title: "Documents", url: "/driver/documents", icon: FileText },
  { title: "Settings", url: "/driver/settings", icon: Settings },
];

export function DriverSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useAuthActions();
  const { organization } = useOrg();
  const [logoutOpen, setLogoutOpen] = React.useState(false);

  return (
    <Sidebar variant="inset" collapsible="icon" className="border-r" {...props}>
      <SidebarHeader className="h-16 border-b flex items-center px-6">
        <div className="flex items-center gap-2">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Truck className="size-5" />
          </div>
          <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
            <span className="font-bold text-sm tracking-tight uppercase truncate max-w-35">
              {organization?.name || "ACTION AUTO"}
            </span>
            <span className="text-[9px] font-extrabold text-emerald-500 uppercase tracking-widest leading-tight">
              Driver Portal
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {navItems.map((item) => (
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

        <div className="px-4 py-2 mt-4 text-[11px] font-semibold uppercase text-muted-foreground tracking-wider group-data-[collapsible=icon]:hidden">
          Account
        </div>

        <SidebarMenu>
          {accountItems.map((item) => (
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
                    <AvatarImage src={user?.imageUrl} alt={user?.fullName || ""} />
                    <AvatarFallback className="rounded-lg">
                      {user?.firstName?.substring(0, 1).toUpperCase() || "DR"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-semibold">{user?.fullName}</span>
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
                      <AvatarImage src={user?.imageUrl} alt={user?.fullName || ""} />
                      <AvatarFallback className="rounded-lg">
                        {user?.firstName?.substring(0, 1).toUpperCase() || "DR"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{user?.fullName}</span>
                      <span className="truncate text-xs">
                        {user?.primaryEmailAddress?.emailAddress}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/driver/profile")}>
                  <UserIcon className="mr-2 size-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/driver/settings")}>
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

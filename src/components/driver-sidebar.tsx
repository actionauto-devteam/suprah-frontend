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

/* ------------------------------------------------------------------------ */
/*  DRIVER HUD FX v2 — green digital cockpit. Self-contained, `dsb-` scoped */
/* ------------------------------------------------------------------------ */
const DSB_FX_CSS = `
.dsb-root [data-sidebar="sidebar"] {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(130% 55% at 50% -8%, rgba(16, 185, 129, 0.18), transparent 60%),
    radial-gradient(100% 45% at 50% 112%, rgba(34, 197, 94, 0.10), transparent 60%),
    linear-gradient(180deg, #081511 0%, #050d0a 52%, #06110d 100%);
}

/* animated emerald energy line along the outer border */
.dsb-root [data-sidebar="sidebar"]::after {
  content: "";
  position: absolute;
  top: -60%;
  right: 0;
  width: 2px;
  height: 55%;
  background: linear-gradient(180deg, transparent, rgba(52, 211, 153, 0.9), rgba(16, 185, 129, 0.4), transparent);
  filter: drop-shadow(0 0 6px rgba(52, 211, 153, 0.9));
  z-index: 3;
}

/* ---------- background layers ---------- */
.dsb-fx { position: absolute; inset: 0; pointer-events: none; z-index: 0; }

/* asphalt grid, fading top/bottom */
.dsb-fx::before {
  content: "";
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(16, 185, 129, 0.055) 1px, transparent 1px),
    linear-gradient(90deg, rgba(16, 185, 129, 0.055) 1px, transparent 1px);
  background-size: 26px 26px;
  mask-image: linear-gradient(180deg, transparent, black 12%, black 88%, transparent);
  -webkit-mask-image: linear-gradient(180deg, transparent, black 12%, black 88%, transparent);
}

/* CRT scanlines — very faint, sells the "screen" feel */
.dsb-fx::after {
  content: "";
  position: absolute; inset: 0;
  background: repeating-linear-gradient(
    180deg,
    rgba(16, 185, 129, 0.028) 0 1px,
    transparent 1px 4px
  );
  mix-blend-mode: screen;
}

/* circuit trace on the left with a traveling pulse */
.dsb-circuit { position: absolute; top: 0; bottom: 0; left: 0; width: 30px; opacity: 0.5; }
.dsb-circuit path { stroke: rgba(16, 185, 129, 0.22); stroke-width: 1.25; fill: none; }
.dsb-circuit circle { fill: rgba(52, 211, 153, 0.35); }
.dsb-circuit .dsb-pulse {
  fill: #34d399;
  filter: drop-shadow(0 0 5px #34d399);
}

/* rising data particles */
.dsb-particles { position: absolute; inset: 0; overflow: hidden; }
.dsb-particles span {
  position: absolute;
  bottom: -12px;
  width: 3px; height: 3px;
  border-radius: 999px;
  background: #34d399;
  box-shadow: 0 0 6px rgba(52, 211, 153, 0.9);
  opacity: 0;
}
.dsb-particles span:nth-child(1) { left: 18%; }
.dsb-particles span:nth-child(2) { left: 42%; width: 2px; height: 2px; }
.dsb-particles span:nth-child(3) { left: 63%; }
.dsb-particles span:nth-child(4) { left: 81%; width: 2px; height: 2px; }
.dsb-particles span:nth-child(5) { left: 30%; width: 2px; height: 2px; }

/* headlight sweep */
.dsb-sweep {
  position: absolute; left: -30%; right: -30%; height: 150px; top: -170px;
  background: linear-gradient(180deg, transparent, rgba(74, 222, 128, 0.06) 35%, rgba(16, 185, 129, 0.14) 50%, rgba(74, 222, 128, 0.06) 65%, transparent);
  transform: rotate(-6deg);
}

/* radar ping (logo + status dot) */
.dsb-ping {
  position: absolute; inset: 0; border-radius: 0.5rem;
  border: 1px solid rgba(52, 211, 153, 0.75);
  opacity: 0;
}

/* ---------- motion (reduced-motion safe) ---------- */
@media (prefers-reduced-motion: no-preference) {
  .dsb-root [data-sidebar="sidebar"]::after { animation: dsb-border-run 4.5s linear infinite; }
  .dsb-sweep { animation: dsb-sweep 8s ease-in-out infinite; }
  .dsb-ping { animation: dsb-ping 3s cubic-bezier(0, 0, 0.2, 1) infinite; }
  .dsb-status-dot::after { animation: dsb-ping 2.4s cubic-bezier(0, 0, 0.2, 1) infinite; }
  .dsb-circuit .dsb-pulse { animation: dsb-trace 5s linear infinite; }
  .dsb-particles span { animation: dsb-rise 6s linear infinite; }
  .dsb-particles span:nth-child(2) { animation-delay: 1.4s; animation-duration: 7s; }
  .dsb-particles span:nth-child(3) { animation-delay: 2.8s; animation-duration: 5.5s; }
  .dsb-particles span:nth-child(4) { animation-delay: 4.1s; animation-duration: 8s; }
  .dsb-particles span:nth-child(5) { animation-delay: 5.2s; animation-duration: 6.5s; }
  .dsb-cursor { animation: dsb-blink 1.1s steps(1) infinite; }
  .dsb-root [data-sidebar="menu-button"] { transition: transform 180ms ease, background 180ms ease; }
  .dsb-root [data-sidebar="menu-button"]:hover { transform: translateX(3px); }
  .dsb-root [data-sidebar="menu-button"][data-active="true"]::after { animation: dsb-shimmer 3.2s ease-in-out infinite; }
}

@keyframes dsb-border-run { to { top: 105%; } }
@keyframes dsb-sweep {
  0%, 50% { transform: translateY(0) rotate(-6deg); opacity: 0; }
  56% { opacity: 1; }
  95%, 100% { transform: translateY(calc(100vh + 340px)) rotate(-6deg); opacity: 0; }
}
@keyframes dsb-ping {
  0% { transform: scale(1); opacity: 0.65; }
  75%, 100% { transform: scale(1.9); opacity: 0; }
}
@keyframes dsb-trace {
  0% { transform: translateY(-20px); opacity: 0; }
  8% { opacity: 1; }
  92% { opacity: 1; }
  100% { transform: translateY(660px); opacity: 0; }
}
@keyframes dsb-rise {
  0% { transform: translateY(0); opacity: 0; }
  12% { opacity: 0.9; }
  85% { opacity: 0.5; }
  100% { transform: translateY(-105vh); opacity: 0; }
}
@keyframes dsb-blink { 50% { opacity: 0; } }
@keyframes dsb-shimmer {
  0%, 100% { transform: translateX(-120%); }
  50% { transform: translateX(220%); }
}

/* ---------- nav treatment: HUD targeting style ---------- */
.dsb-root [data-sidebar="menu-button"] {
  position: relative;
  border-radius: 0.35rem;
  color: rgba(209, 250, 229, 0.68);
  overflow: hidden;
}
.dsb-root [data-sidebar="menu-button"]:hover {
  background: rgba(16, 185, 129, 0.10);
  color: #ecfdf5;
}
.dsb-root [data-sidebar="menu-button"][data-active="true"] {
  background: linear-gradient(90deg, rgba(16, 185, 129, 0.20), rgba(34, 197, 94, 0.06));
  color: #d1fae5;
  box-shadow:
    inset 0 0 0 1px rgba(52, 211, 153, 0.30),
    0 0 20px rgba(16, 185, 129, 0.12);
}
/* active item indicator bar */
.dsb-root [data-sidebar="menu-button"][data-active="true"]::before {
  content: "";
  position: absolute; left: 0; top: 16%; bottom: 16%; width: 3px; border-radius: 999px;
  background: linear-gradient(180deg, #4ade80, #10b981);
  box-shadow: 0 0 12px rgba(74, 222, 128, 0.9);
}
/* scanning shimmer across the active item */
.dsb-root [data-sidebar="menu-button"][data-active="true"]::after {
  content: "";
  position: absolute; top: 0; bottom: 0; width: 45%;
  background: linear-gradient(105deg, transparent, rgba(134, 239, 172, 0.14), transparent);
  transform: translateX(-120%);
  pointer-events: none;
}
.dsb-root [data-sidebar="menu-button"][data-active="true"] svg {
  color: #4ade80;
  filter: drop-shadow(0 0 7px rgba(74, 222, 128, 0.65));
}

/* HUD corner brackets on the user card */
.dsb-hud-card { position: relative; }
.dsb-hud-card::before,
.dsb-hud-card::after {
  content: "";
  position: absolute;
  width: 10px; height: 10px;
  border-color: rgba(52, 211, 153, 0.6);
  border-style: solid;
  pointer-events: none;
}
.dsb-hud-card::before { top: -3px; left: -3px; border-width: 1.5px 0 0 1.5px; border-radius: 3px 0 0 0; }
.dsb-hud-card::after { bottom: -3px; right: -3px; border-width: 0 1.5px 1.5px 0; border-radius: 0 0 3px 0; }

/* telemetry strip */
.dsb-telemetry {
  font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  font-size: 8.5px;
  letter-spacing: 0.14em;
  color: rgba(74, 222, 128, 0.65);
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 5px;
}
.dsb-telemetry i {
  font-style: normal;
  width: 5px; height: 5px; border-radius: 999px;
  background: #4ade80;
  box-shadow: 0 0 6px rgba(74, 222, 128, 0.9);
}

/* online status dot */
.dsb-status-dot {
  position: absolute; right: -1px; bottom: -1px;
  width: 10px; height: 10px; border-radius: 999px;
  background: #10b981;
  border: 2px solid #050d0a;
}
.dsb-status-dot::after {
  content: "";
  position: absolute; inset: -2px; border-radius: 999px;
  border: 1px solid rgba(52, 211, 153, 0.85);
}
`;

/** Circuit trace SVG rendered down the left edge with a traveling pulse dot */
function CircuitTrace() {
  return (
    <svg
      className="dsb-circuit"
      viewBox="0 0 30 660"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d="M15 0 V90 L8 104 V210 L20 226 V340 L10 356 V480 L17 496 V660" />
      <circle cx="8" cy="150" r="2" />
      <circle cx="20" cy="280" r="2" />
      <circle cx="10" cy="420" r="2" />
      <circle cx="17" cy="560" r="2" />
      <circle className="dsb-pulse" cx="15" cy="0" r="2.5" />
    </svg>
  );
}

export function DriverSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useAuthActions();
  const { organization } = useOrg();
  const [logoutOpen, setLogoutOpen] = React.useState(false);

  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      className="dsb-root border-r border-emerald-500/15"
      {...props}
    >
      <style dangerouslySetInnerHTML={{ __html: DSB_FX_CSS }} />

      {/* animated background layers */}
      <div className="dsb-fx" aria-hidden="true">
        <CircuitTrace />
        <div className="dsb-sweep" />
        <div className="dsb-particles">
          <span /><span /><span /><span /><span />
        </div>
      </div>

      <SidebarHeader className="relative z-10 h-16 border-b border-emerald-500/15 flex items-center px-5 bg-transparent">
        <div className="flex items-center gap-2.5 w-full">
          <div className="relative flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 via-green-500 to-emerald-700 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)]">
            <span className="dsb-ping" aria-hidden="true" />
            <Truck className="size-5 relative" />
          </div>
          <div className="flex min-w-0 flex-col gap-1 leading-none group-data-[collapsible=icon]:hidden">
            <span className="font-black text-sm tracking-tight uppercase truncate text-emerald-50">
              {organization?.name || "SUPRAH AI"}
            </span>
            <span className="dsb-telemetry">
              <i /> Driver Portal · Online<span className="dsb-cursor">_</span>
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="relative z-10 p-2 bg-transparent">
        <div className="px-4 pt-3 pb-1 font-mono text-[9px] font-bold uppercase text-emerald-400/55 tracking-[0.28em] group-data-[collapsible=icon]:hidden">
          // Operations
        </div>
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
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        <div className="mx-4 mt-4 h-px bg-gradient-to-r from-emerald-400/40 via-green-500/15 to-transparent group-data-[collapsible=icon]:hidden" />

        <div className="px-4 pt-3 pb-1 font-mono text-[9px] font-bold uppercase text-emerald-400/55 tracking-[0.28em] group-data-[collapsible=icon]:hidden">
          // Account
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
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="relative z-10 p-4 border-t border-emerald-500/15 bg-transparent group-data-[collapsible=icon]:p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="dsb-hud-card w-full rounded-lg bg-emerald-500/[0.06] ring-1 ring-emerald-400/20 backdrop-blur-md data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center"
                >
                  <div className="relative">
                    <Avatar className="h-8 w-8 rounded-lg group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7">
                      <AvatarImage src={user?.imageUrl} alt={user?.fullName || ""} />
                      <AvatarFallback className="rounded-lg bg-gradient-to-br from-emerald-600 to-green-800 text-white font-bold">
                        {user?.firstName?.substring(0, 1).toUpperCase() || "DR"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="dsb-status-dot" aria-hidden="true" />
                  </div>
                  <div className="grid flex-1 min-w-0 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-semibold text-emerald-50">
                      {user?.fullName}
                    </span>
                    <span className="truncate text-xs text-emerald-200/45">
                      {user?.primaryEmailAddress?.emailAddress}
                    </span>
                  </div>
                  <ChevronRight className="ml-auto size-4 text-emerald-400/60 group-data-[collapsible=icon]:hidden" />
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
                    <div className="grid flex-1 min-w-0 text-left text-sm leading-tight">
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
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setLogoutOpen(true);
                  }}
                >
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
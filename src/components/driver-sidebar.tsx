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

/* ------------------------------------------------------------------------ *
 *  DRIVER HUD FX v3 — green digital cockpit, light + dark
 *  Self-contained, `dsb-` scoped. Light is the base; `.dark` overrides.
 *  Assumes next-themes / shadcn class strategy (`.dark` on <html>).
 * ------------------------------------------------------------------------ */
const DSB_FX_CSS = `
/* ============ LIGHT (base) ============ */
.dsb-root {
  --dsb-bg-1: #f1fbf6;
  --dsb-bg-2: #ffffff;
  --dsb-bg-3: #eff9f4;
  --dsb-glow-top: rgba(16, 185, 129, 0.14);
  --dsb-glow-bottom: rgba(34, 197, 94, 0.09);

  --dsb-grid: rgba(5, 150, 105, 0.07);
  --dsb-scan: rgba(5, 150, 105, 0.022);
  --dsb-scan-blend: multiply;

  --dsb-trace-line: rgba(5, 150, 105, 0.22);
  --dsb-trace-node: rgba(16, 185, 129, 0.4);
  --dsb-trace-opacity: 0.75;
  --dsb-pulse: #059669;
  --dsb-pulse-glow: rgba(5, 150, 105, 0.55);

  --dsb-particle: #10b981;
  --dsb-particle-glow: rgba(5, 150, 105, 0.45);
  --dsb-particle-opacity: 0.55;

  --dsb-sweep-soft: rgba(16, 185, 129, 0.05);
  --dsb-sweep-core: rgba(16, 185, 129, 0.11);

  --dsb-rail: rgba(5, 150, 105, 0.75);
  --dsb-rail-glow: rgba(5, 150, 105, 0.5);

  --dsb-edge: rgba(16, 185, 129, 0.20);
  --dsb-divider: rgba(5, 150, 105, 0.35);

  --dsb-brand: #052e22;
  --dsb-label: rgba(4, 120, 87, 0.7);
  --dsb-telemetry: rgba(4, 120, 87, 0.85);

  --dsb-nav: rgba(6, 78, 59, 0.72);
  --dsb-nav-hover-bg: rgba(16, 185, 129, 0.11);
  --dsb-nav-hover-text: #064e3b;
  --dsb-nav-active-bg: linear-gradient(90deg, rgba(16, 185, 129, 0.17), rgba(34, 197, 94, 0.05));
  --dsb-nav-active-text: #064e3b;
  --dsb-nav-active-ring: rgba(5, 150, 105, 0.34);
  --dsb-nav-active-glow: rgba(16, 185, 129, 0.14);
  --dsb-nav-bar: linear-gradient(180deg, #22c55e, #059669);
  --dsb-nav-bar-glow: rgba(5, 150, 105, 0.55);
  --dsb-nav-icon: #059669;
  --dsb-nav-icon-glow: rgba(5, 150, 105, 0.4);
  --dsb-shimmer: rgba(255, 255, 255, 0.75);

  --dsb-card-bg: rgba(16, 185, 129, 0.07);
  --dsb-card-ring: rgba(5, 150, 105, 0.22);
  --dsb-card-bracket: rgba(5, 150, 105, 0.55);
  --dsb-user-name: #052e22;
  --dsb-user-sub: rgba(6, 78, 59, 0.55);
  --dsb-chev: rgba(5, 150, 105, 0.6);

  --dsb-dot: #059669;
  --dsb-dot-ring: rgba(5, 150, 105, 0.75);
  --dsb-dot-border: #ffffff;

  --dsb-logo-glow: rgba(16, 185, 129, 0.38);
}

/* ============ DARK ============ */
.dark .dsb-root {
  --dsb-bg-1: #081511;
  --dsb-bg-2: #050d0a;
  --dsb-bg-3: #06110d;
  --dsb-glow-top: rgba(16, 185, 129, 0.18);
  --dsb-glow-bottom: rgba(34, 197, 94, 0.10);

  --dsb-grid: rgba(16, 185, 129, 0.055);
  --dsb-scan: rgba(16, 185, 129, 0.028);
  --dsb-scan-blend: screen;

  --dsb-trace-line: rgba(16, 185, 129, 0.22);
  --dsb-trace-node: rgba(52, 211, 153, 0.35);
  --dsb-trace-opacity: 0.5;
  --dsb-pulse: #34d399;
  --dsb-pulse-glow: rgba(52, 211, 153, 0.9);

  --dsb-particle: #34d399;
  --dsb-particle-glow: rgba(52, 211, 153, 0.9);
  --dsb-particle-opacity: 0.9;

  --dsb-sweep-soft: rgba(74, 222, 128, 0.06);
  --dsb-sweep-core: rgba(16, 185, 129, 0.14);

  --dsb-rail: rgba(52, 211, 153, 0.9);
  --dsb-rail-glow: rgba(52, 211, 153, 0.9);

  --dsb-edge: rgba(16, 185, 129, 0.15);
  --dsb-divider: rgba(52, 211, 153, 0.4);

  --dsb-brand: #ecfdf5;
  --dsb-label: rgba(52, 211, 153, 0.55);
  --dsb-telemetry: rgba(74, 222, 128, 0.65);

  --dsb-nav: rgba(209, 250, 229, 0.68);
  --dsb-nav-hover-bg: rgba(16, 185, 129, 0.10);
  --dsb-nav-hover-text: #ecfdf5;
  --dsb-nav-active-bg: linear-gradient(90deg, rgba(16, 185, 129, 0.20), rgba(34, 197, 94, 0.06));
  --dsb-nav-active-text: #d1fae5;
  --dsb-nav-active-ring: rgba(52, 211, 153, 0.30);
  --dsb-nav-active-glow: rgba(16, 185, 129, 0.12);
  --dsb-nav-bar: linear-gradient(180deg, #4ade80, #10b981);
  --dsb-nav-bar-glow: rgba(74, 222, 128, 0.9);
  --dsb-nav-icon: #4ade80;
  --dsb-nav-icon-glow: rgba(74, 222, 128, 0.65);
  --dsb-shimmer: rgba(134, 239, 172, 0.14);

  --dsb-card-bg: rgba(16, 185, 129, 0.06);
  --dsb-card-ring: rgba(52, 211, 153, 0.20);
  --dsb-card-bracket: rgba(52, 211, 153, 0.6);
  --dsb-user-name: #ecfdf5;
  --dsb-user-sub: rgba(167, 243, 208, 0.45);
  --dsb-chev: rgba(52, 211, 153, 0.6);

  --dsb-dot: #10b981;
  --dsb-dot-ring: rgba(52, 211, 153, 0.85);
  --dsb-dot-border: #050d0a;

  --dsb-logo-glow: rgba(16, 185, 129, 0.5);
}

/* ============ SHELL ============ */
.dsb-root [data-sidebar="sidebar"] {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(130% 55% at 50% -8%, var(--dsb-glow-top), transparent 60%),
    radial-gradient(100% 45% at 50% 112%, var(--dsb-glow-bottom), transparent 60%),
    linear-gradient(180deg, var(--dsb-bg-1) 0%, var(--dsb-bg-2) 52%, var(--dsb-bg-3) 100%);
}

/* energy rail running down the right border */
.dsb-root [data-sidebar="sidebar"]::after {
  content: "";
  position: absolute;
  top: -60%;
  right: 0;
  width: 2px;
  height: 55%;
  background: linear-gradient(180deg, transparent, var(--dsb-rail), transparent);
  filter: drop-shadow(0 0 6px var(--dsb-rail-glow));
  z-index: 3;
}

.dsb-edge { border-color: var(--dsb-edge) !important; }

/* ============ BACKGROUND LAYERS ============ */
.dsb-fx { position: absolute; inset: 0; pointer-events: none; z-index: 0; }

/* asphalt grid */
.dsb-fx::before {
  content: "";
  position: absolute; inset: 0;
  background-image:
    linear-gradient(var(--dsb-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--dsb-grid) 1px, transparent 1px);
  background-size: 26px 26px;
  mask-image: linear-gradient(180deg, transparent, black 12%, black 88%, transparent);
  -webkit-mask-image: linear-gradient(180deg, transparent, black 12%, black 88%, transparent);
}

/* scanlines */
.dsb-fx::after {
  content: "";
  position: absolute; inset: 0;
  background: repeating-linear-gradient(180deg, var(--dsb-scan) 0 1px, transparent 1px 4px);
  mix-blend-mode: var(--dsb-scan-blend);
}

/* circuit trace */
.dsb-circuit {
  position: absolute; top: 0; bottom: 0; left: 0; width: 30px;
  opacity: var(--dsb-trace-opacity);
}
.dsb-circuit path { stroke: var(--dsb-trace-line); stroke-width: 1.25; fill: none; }
.dsb-circuit circle { fill: var(--dsb-trace-node); }
.dsb-circuit .dsb-pulse {
  fill: var(--dsb-pulse);
  filter: drop-shadow(0 0 5px var(--dsb-pulse-glow));
}

/* rising data particles */
.dsb-particles { position: absolute; inset: 0; overflow: hidden; }
.dsb-particles span {
  position: absolute;
  bottom: -12px;
  width: 3px; height: 3px;
  border-radius: 999px;
  background: var(--dsb-particle);
  box-shadow: 0 0 6px var(--dsb-particle-glow);
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
  background: linear-gradient(180deg, transparent, var(--dsb-sweep-soft) 35%, var(--dsb-sweep-core) 50%, var(--dsb-sweep-soft) 65%, transparent);
  transform: rotate(-6deg);
}

/* radar ping */
.dsb-ping {
  position: absolute; inset: 0; border-radius: 0.5rem;
  border: 1px solid var(--dsb-dot-ring);
  opacity: 0;
}

/* ============ MOTION (reduced-motion safe) ============ */
@media (prefers-reduced-motion: no-preference) {
  .dsb-root [data-sidebar="sidebar"]::after { animation: dsb-rail-run 4.5s linear infinite; }
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
  .dsb-root [data-sidebar="menu-button"] { transition: transform 180ms ease, background 180ms ease, color 180ms ease; }
  .dsb-root [data-sidebar="menu-button"]:hover { transform: translateX(3px); }
  .dsb-root [data-sidebar="menu-button"][data-active="true"]::after { animation: dsb-shimmer 3.2s ease-in-out infinite; }
}

@keyframes dsb-rail-run { to { top: 105%; } }
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
  12% { opacity: var(--dsb-particle-opacity); }
  85% { opacity: calc(var(--dsb-particle-opacity) * 0.55); }
  100% { transform: translateY(-105vh); opacity: 0; }
}
@keyframes dsb-blink { 50% { opacity: 0; } }
@keyframes dsb-shimmer {
  0%, 100% { transform: translateX(-120%); }
  50% { transform: translateX(220%); }
}

/* ============ NAV ============ */
.dsb-root [data-sidebar="menu-button"] {
  position: relative;
  border-radius: 0.35rem;
  color: var(--dsb-nav);
  overflow: hidden;
}
.dsb-root [data-sidebar="menu-button"]:hover {
  background: var(--dsb-nav-hover-bg);
  color: var(--dsb-nav-hover-text);
}
.dsb-root [data-sidebar="menu-button"][data-active="true"] {
  background: var(--dsb-nav-active-bg);
  color: var(--dsb-nav-active-text);
  box-shadow:
    inset 0 0 0 1px var(--dsb-nav-active-ring),
    0 0 20px var(--dsb-nav-active-glow);
}
/* active item indicator bar */
.dsb-root [data-sidebar="menu-button"][data-active="true"]::before {
  content: "";
  position: absolute; left: 0; top: 16%; bottom: 16%; width: 3px; border-radius: 999px;
  background: var(--dsb-nav-bar);
  box-shadow: 0 0 12px var(--dsb-nav-bar-glow);
}
/* scanning shimmer across the active item */
.dsb-root [data-sidebar="menu-button"][data-active="true"]::after {
  content: "";
  position: absolute; top: 0; bottom: 0; width: 45%;
  background: linear-gradient(105deg, transparent, var(--dsb-shimmer), transparent);
  transform: translateX(-120%);
  pointer-events: none;
}
.dsb-root [data-sidebar="menu-button"][data-active="true"] svg {
  color: var(--dsb-nav-icon);
  filter: drop-shadow(0 0 7px var(--dsb-nav-icon-glow));
}

/* ============ TYPE + CHROME ============ */
.dsb-brand {
  color: var(--dsb-brand);
  font-weight: 900;
  letter-spacing: -0.02em;
  text-transform: uppercase;
}
.dsb-section-label {
  font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.28em;
  color: var(--dsb-label);
}
.dsb-hr {
  height: 1px;
  background: linear-gradient(90deg, var(--dsb-divider), transparent);
}
.dsb-telemetry {
  font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  font-size: 8.5px;
  letter-spacing: 0.14em;
  color: var(--dsb-telemetry);
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 5px;
}
.dsb-telemetry i {
  font-style: normal;
  width: 5px; height: 5px; border-radius: 999px;
  background: var(--dsb-dot);
  box-shadow: 0 0 6px var(--dsb-dot-ring);
}

.dsb-logo { box-shadow: 0 0 20px var(--dsb-logo-glow); }

/* HUD corner brackets on the user card */
.dsb-hud-card {
  position: relative;
  background: var(--dsb-card-bg) !important;
  box-shadow: inset 0 0 0 1px var(--dsb-card-ring);
}
.dsb-hud-card::before,
.dsb-hud-card::after {
  content: "";
  position: absolute;
  width: 10px; height: 10px;
  border-color: var(--dsb-card-bracket);
  border-style: solid;
  pointer-events: none;
}
.dsb-hud-card::before { top: -3px; left: -3px; border-width: 1.5px 0 0 1.5px; border-radius: 3px 0 0 0; }
.dsb-hud-card::after { bottom: -3px; right: -3px; border-width: 0 1.5px 1.5px 0; border-radius: 0 0 3px 0; }

.dsb-user-name { color: var(--dsb-user-name); }
.dsb-user-sub { color: var(--dsb-user-sub); }
.dsb-chev { color: var(--dsb-chev); }

/* online status dot */
.dsb-status-dot {
  position: absolute; right: -1px; bottom: -1px;
  width: 10px; height: 10px; border-radius: 999px;
  background: var(--dsb-dot);
  border: 2px solid var(--dsb-dot-border);
}
.dsb-status-dot::after {
  content: "";
  position: absolute; inset: -2px; border-radius: 999px;
  border: 1px solid var(--dsb-dot-ring);
}
`;

/** Circuit trace rendered down the left edge with a traveling pulse dot */
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
      className="dsb-root dsb-edge border-r"
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

      <SidebarHeader className="dsb-edge relative z-10 h-16 border-b flex items-center px-5 bg-transparent">
        <div className="flex items-center gap-2.5 w-full">
          <div className="dsb-logo relative flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 via-green-500 to-emerald-700 text-white">
            <span className="dsb-ping" aria-hidden="true" />
            <Truck className="size-5 relative" />
          </div>
          <div className="flex min-w-0 flex-col gap-1 leading-none group-data-[collapsible=icon]:hidden">
            <span className="dsb-brand text-sm truncate">
              {organization?.name || "SUPRAH AI"}
            </span>
            <span className="dsb-telemetry">
              <i /> Driver Portal · Online<span className="dsb-cursor">_</span>
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="relative z-10 p-2 bg-transparent">
        <div className="dsb-section-label px-4 pt-3 pb-1 group-data-[collapsible=icon]:hidden">
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

        <div className="dsb-hr mx-4 mt-4 group-data-[collapsible=icon]:hidden" />

        <div className="dsb-section-label px-4 pt-3 pb-1 group-data-[collapsible=icon]:hidden">
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

      <SidebarFooter className="dsb-edge relative z-10 p-4 border-t bg-transparent group-data-[collapsible=icon]:p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="dsb-hud-card w-full rounded-lg backdrop-blur-md data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center"
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
                    <span className="dsb-user-name truncate font-semibold">
                      {user?.fullName}
                    </span>
                    <span className="dsb-user-sub truncate text-xs">
                      {user?.primaryEmailAddress?.emailAddress}
                    </span>
                  </div>
                  <ChevronRight className="dsb-chev ml-auto size-4 group-data-[collapsible=icon]:hidden" />
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
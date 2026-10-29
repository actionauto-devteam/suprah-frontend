"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  Bot,
  BellRing,
  Building2,
  ChevronRight,
  HeartHandshake,
  Lock,
  MapPin,
  Phone,
  PhoneCall,
  ShieldCheck,
  Smartphone,
  Users,
  type LucideIcon,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { useCallRecordingApi, type RecordingAccess } from "@/hooks/useCallRecordingApi"

type CrmRole = "employee" | "manager" | "admin" | string

interface SettingsNavItem {
  href: string
  label: string
  icon: LucideIcon
  roles?: CrmRole[]
  exact?: boolean
  recordingAccess?: boolean
}

export const CRM_SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  { href: "/crm/settings/phone-numbers", label: "Phone Numbers", icon: PhoneCall, roles: ["admin"] },
  { href: "/crm/settings/call-recording", label: "Call Recordings", icon: Phone, roles: ["admin"], recordingAccess: true },
  { href: "/crm/settings/call-routing", label: "Call Routing", icon: Phone, roles: ["admin"] },
  { href: "/crm/settings/my-calls", label: "My Calls", icon: Smartphone },
  { href: "/crm/settings", label: "User Management", icon: Users, exact: true },
  { href: "/crm/settings/departments", label: "Departments", icon: Building2 },
  { href: "/crm/settings/integrations", label: "Lead Integrations", icon: Lock },
  { href: "/crm/settings/locations", label: "Locations", icon: MapPin, roles: ["admin", "manager"] },
  { href: "/crm/settings/ai-agent", label: "AI Agent & Automation", icon: Bot },
  { href: "/crm/settings/notification-health", label: "Notification Health", icon: BellRing, roles: ["admin", "manager"] },
  { href: "/crm/hr", label: "Team Engagement", icon: HeartHandshake },
]

export function visibleSettingsNavItems(role: CrmRole | undefined, canListenToRecordings = false): SettingsNavItem[] {
  return CRM_SETTINGS_NAV_ITEMS.filter((item) => !item.roles || (role ? item.roles.includes(role) : false) || (item.recordingAccess && canListenToRecordings))
}

function useCanListenToRecordings(role: CrmRole | undefined) {
  const { request, orgId, authKey } = useCallRecordingApi()
  const access = useQuery({
    queryKey: ["call-recording-access", orgId, authKey],
    enabled: Boolean(role) && role !== "admin",
    retry: false,
    staleTime: 60_000,
    queryFn: () => request<RecordingAccess>("get", "/recording-access"),
  })
  return Boolean(access.data?.permissions.includes("view"))
}

function isActive(pathname: string, item: SettingsNavItem): boolean {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export function CrmSettingsNav({ role }: { role: CrmRole | undefined }) {
  const router = useRouter()
  const pathname = usePathname() || ""
  const canListenToRecordings = useCanListenToRecordings(role)
  const items = visibleSettingsNavItems(role, canListenToRecordings)

  return (
    <nav aria-label="Settings" className="rounded-2xl border border-border/40 bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border/30">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Navigation</p>
      </div>
      <div className="p-2 space-y-1">
        {items.map((item) => {
          const active = isActive(pathname, item)
          const Icon = item.icon
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => router.push(item.href)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "w-full flex items-center justify-between gap-2.5 rounded-xl px-3 h-9 text-xs font-semibold transition-colors",
                active ? "bg-emerald-500/10 text-emerald-600" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                {active && <ShieldCheck className="h-3 w-3 text-emerald-500/40" />}
                <ChevronRight className={cn("h-3 w-3", active ? "text-emerald-500/40" : "text-muted-foreground/40")} />
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

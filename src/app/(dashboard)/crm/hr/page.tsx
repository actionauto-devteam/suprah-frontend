"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Car,
  Users,
  Gift,
  Cake,
  PartyPopper,
  UserCheck,
  UserMinus,
  Loader2,
  Calendar,
  Clock,
  ChevronDown,
  ChevronRight,
  LogOut,
  User,
  Settings,
  Lock,
  Search,
  ShieldCheck,
  HeartHandshake,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { apiClient } from "@/lib/api-client"
import { OffboardModal } from "@/components/crm/OffboardModal"
import { toast } from "sonner"

// ─── Types ────────────────────────────────────────────────────────────────────

interface CrmUser {
  _id: string
  fullName: string
  username: string
  email: string
  avatar?: string
  role: "employee" | "manager" | "admin"
  isActive: boolean
  createdAt: string
  birthday?: string
  hireDate?: string
}

interface MilestoneEntry {
  _id: string
  fullName: string
  username: string
  avatar?: string
  role: string
  date: string
  daysUntil: number
  type: "birthday" | "anniversary"
  yearsCount?: number
}

interface MilestonesResponse {
  birthdays: MilestoneEntry[]
  anniversaries: MilestoneEntry[]
}

interface OffboardedUser {
  _id: string
  fullName: string
  username: string
  email: string
  avatar?: string
  role: string
  offboardedAt: string
  hireDate?: string
}

type Tab = "milestones" | "onboarding" | "offboarding"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ini(n: string) {
  return n.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function daysSince(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  return Math.floor(diff / 86_400_000)
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    admin:    { label: "Admin",    cls: "bg-violet-500/10 text-violet-600 border-violet-500/20" },
    manager:  { label: "Manager",  cls: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    employee: { label: "Employee", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  }
  const cfg = map[role] ?? { label: role, cls: "" }
  return (
    <Badge variant="outline" className={`text-[10px] h-5 px-2 rounded-full font-semibold capitalize ${cfg.cls}`}>
      {cfg.label}
    </Badge>
  )
}

// ─── Milestone Card ───────────────────────────────────────────────────────────

function MilestoneCard({ entry }: { entry: MilestoneEntry }) {
  const isToday = entry.daysUntil === 0
  const isBirthday = entry.type === "birthday"

  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
      isToday
        ? isBirthday
          ? "border-pink-500/30 bg-pink-500/5"
          : "border-emerald-500/30 bg-emerald-500/5"
        : "border-border/40 bg-card"
    }`}>
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 text-lg ${
        isToday
          ? isBirthday ? "bg-pink-500/10" : "bg-emerald-500/10"
          : "bg-muted/30"
      }`}>
        {isBirthday ? "🎂" : "🎉"}
      </div>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={entry.avatar} />
        <AvatarFallback className={`text-[9px] font-bold text-white ${
          entry.role === "admin" ? "bg-violet-500" : entry.role === "manager" ? "bg-blue-500" : "bg-emerald-600"
        }`}>
          {ini(entry.fullName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold truncate">{entry.fullName}</p>
        <p className="text-[10px] text-muted-foreground/50 mt-0.5">
          {isBirthday
            ? "Birthday"
            : `${entry.yearsCount} year${entry.yearsCount !== 1 ? "s" : ""} anniversary`}
        </p>
      </div>
      <div className="shrink-0 text-right">
        {isToday ? (
          <span className={`text-[10px] font-black px-2 py-1 rounded-full ${
            isBirthday
              ? "bg-pink-500/15 text-pink-600"
              : "bg-emerald-500/15 text-emerald-600"
          }`}>
            Today!
          </span>
        ) : (
          <span className="text-[11px] font-bold text-muted-foreground/50">
            in {entry.daysUntil}d
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, label, sub }: { icon: React.ElementType; label: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3">
      <div className="h-12 w-12 rounded-2xl border-2 border-dashed border-border/25 flex items-center justify-center">
        <Icon className="h-5 w-5 text-muted-foreground/20" />
      </div>
      <p className="text-sm font-semibold text-muted-foreground/40">{label}</p>
      <p className="text-xs text-muted-foreground/25 max-w-xs text-center">{sub}</p>
    </div>
  )
}

// ─── Milestones Tab ───────────────────────────────────────────────────────────

function MilestonesTab({ token }: { token: string }) {
  const [data, setData] = React.useState<MilestonesResponse | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    apiClient
      .get("/api/crm/hr/milestones?window=30", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setData(res.data?.data ?? res.data))
      .catch(() => setData({ birthdays: [], anniversaries: [] }))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/30" />
      </div>
    )
  }

  const birthdays = data?.birthdays ?? []
  const anniversaries = data?.anniversaries ?? []
  const todayBirthdays = birthdays.filter((e) => e.daysUntil === 0)
  const todayAnniversaries = anniversaries.filter((e) => e.daysUntil === 0)
  const todayAll = [...todayBirthdays, ...todayAnniversaries]
  const upcomingBirthdays = birthdays.filter((e) => e.daysUntil > 0)
  const upcomingAnniversaries = anniversaries.filter((e) => e.daysUntil > 0)

  return (
    <div className="space-y-5">
      {/* Today's celebrations */}
      {todayAll.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <PartyPopper className="h-3.5 w-3.5 text-amber-500" />
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">
              Celebrating Today
            </p>
          </div>
          <div className="space-y-2">
            {todayAll.map((e) => (
              <MilestoneCard key={`${e._id}-${e.type}`} entry={e} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming birthdays */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Cake className="h-3.5 w-3.5 text-pink-500" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
            Upcoming Birthdays
          </p>
          <span className="text-[9px] font-bold text-muted-foreground/30 bg-muted/30 px-1.5 py-0.5 rounded-full">
            next 30 days
          </span>
        </div>
        {upcomingBirthdays.length === 0 ? (
          <EmptyState
            icon={Cake}
            label="No upcoming birthdays"
            sub="Birthdays will appear here once employees add their date of birth."
          />
        ) : (
          <div className="space-y-2">
            {upcomingBirthdays.map((e) => (
              <MilestoneCard key={e._id} entry={e} />
            ))}
          </div>
        )}
      </div>

      {/* Upcoming anniversaries */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Gift className="h-3.5 w-3.5 text-emerald-500" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
            Work Anniversaries
          </p>
          <span className="text-[9px] font-bold text-muted-foreground/30 bg-muted/30 px-1.5 py-0.5 rounded-full">
            next 30 days
          </span>
        </div>
        {upcomingAnniversaries.length === 0 ? (
          <EmptyState
            icon={Gift}
            label="No upcoming anniversaries"
            sub="Work anniversaries will appear here once employees have a hire date recorded."
          />
        ) : (
          <div className="space-y-2">
            {upcomingAnniversaries.map((e) => (
              <MilestoneCard key={e._id} entry={e} />
            ))}
          </div>
        )}
      </div>

      {/* Info note */}
      <div className="rounded-xl border border-border/30 bg-muted/10 px-4 py-3 flex items-start gap-2.5">
        <PartyPopper className="h-3.5 w-3.5 text-muted-foreground/30 mt-0.5 shrink-0" />
        <p className="text-[11px] text-muted-foreground/40 leading-relaxed">
          Birthday and work anniversary announcements are automatically posted in{" "}
          <span className="font-semibold text-muted-foreground/60">Feeds</span> and{" "}
          <span className="font-semibold text-muted-foreground/60">Supra Space</span> on the celebration day.
        </p>
      </div>
    </div>
  )
}

// ─── Onboarding Tab ───────────────────────────────────────────────────────────

function OnboardingTab({ token }: { token: string }) {
  const [users, setUsers] = React.useState<CrmUser[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")

  React.useEffect(() => {
    apiClient
      .get("/api/crm/users?limit=100&sortBy=hireDate&sortOrder=desc&status=active", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const data = res.data?.data || res.data
        setUsers(data?.users ?? data ?? [])
      })
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }, [token])

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const filtered = users.filter((u) =>
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const newThisMonth = filtered.filter(
    (u) => u.hireDate && u.hireDate >= thisMonthStart
  )
  const rest = filtered.filter(
    (u) => !u.hireDate || u.hireDate < thisMonthStart
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/30" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search employees…"
          className="h-9 pl-9 rounded-xl border-border/40 text-xs"
        />
      </div>

      {/* New this month */}
      {newThisMonth.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
              New This Month
            </p>
            <span className="ml-auto text-[10px] text-muted-foreground/40 font-semibold">
              {newThisMonth.length} employee{newThisMonth.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/3 overflow-hidden">
            {newThisMonth.map((u, i) => (
              <OnboardingRow key={u._id} user={u} isLast={i === newThisMonth.length - 1} highlight />
            ))}
          </div>
        </div>
      )}

      {/* All employees */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-muted-foreground/40" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
            All Employees
          </p>
          <span className="ml-auto text-[10px] text-muted-foreground/40 font-semibold">
            {filtered.length} total
          </span>
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={Users} label="No employees found" sub="Try adjusting the search." />
        ) : (
          <div className="rounded-xl border border-border/40 overflow-hidden">
            {filtered.map((u, i) => (
              <OnboardingRow key={u._id} user={u} isLast={i === filtered.length - 1} highlight={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function OnboardingRow({
  user,
  isLast,
  highlight,
}: {
  user: CrmUser
  isLast: boolean
  highlight: boolean
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${!isLast ? "border-b border-border/20" : ""} ${highlight ? "hover:bg-emerald-500/5" : "hover:bg-muted/20"} transition-colors`}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={user.avatar} />
        <AvatarFallback className={`text-[9px] font-bold text-white ${
          user.role === "admin" ? "bg-violet-500" : user.role === "manager" ? "bg-blue-500" : "bg-emerald-600"
        }`}>
          {ini(user.fullName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold truncate">{user.fullName}</p>
        <p className="text-[10px] text-muted-foreground/40 truncate">{user.email}</p>
      </div>
      <div className="hidden sm:flex items-center gap-2 shrink-0">
        <RoleBadge role={user.role} />
      </div>
      <div className="shrink-0 text-right">
        {user.hireDate ? (
          <>
            <p className="text-[11px] font-semibold text-foreground/70">{fmtDate(user.hireDate)}</p>
            <p className="text-[10px] text-muted-foreground/35">{daysSince(user.hireDate)}d tenure</p>
          </>
        ) : (
          <span className="text-[10px] text-muted-foreground/25 italic">No hire date</span>
        )}
      </div>
    </div>
  )
}

// ─── Offboarding Tab ──────────────────────────────────────────────────────────

function OffboardingTab({ token }: { token: string }) {
  const [active, setActive] = React.useState<CrmUser[]>([])
  const [offboarded, setOffboarded] = React.useState<OffboardedUser[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [offboardTarget, setOffboardTarget] = React.useState<CrmUser | null>(null)

  const load = React.useCallback(() => {
    setLoading(true)
    Promise.all([
      apiClient.get("/api/crm/users?limit=100&status=active", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      apiClient
        .get("/api/crm/hr/offboarded", { headers: { Authorization: `Bearer ${token}` } })
        .catch(() => ({ data: { data: [] } })),
    ])
      .then(([activeRes, offRes]) => {
        const activeData = activeRes.data?.data || activeRes.data
        setActive(activeData?.users ?? activeData ?? [])
        const offData = offRes.data?.data || offRes.data
        setOffboarded(Array.isArray(offData) ? offData : [])
      })
      .catch(() => {
        setActive([])
        setOffboarded([])
      })
      .finally(() => setLoading(false))
  }, [token])

  React.useEffect(() => { load() }, [load])

  const filteredActive = active.filter((u) =>
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/30" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-5">
        {/* Active employees — can be offboarded */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
              Active Employees
            </p>
            <span className="ml-auto text-[10px] text-muted-foreground/40 font-semibold">
              {active.length} active
            </span>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search active employees…"
              className="h-9 pl-9 rounded-xl border-border/40 text-xs"
            />
          </div>

          {filteredActive.length === 0 ? (
            <EmptyState icon={UserCheck} label="No active employees found" sub="Try adjusting the search." />
          ) : (
            <div className="rounded-xl border border-border/40 overflow-hidden">
              {filteredActive.map((u, i) => (
                <div
                  key={u._id}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors ${i < filteredActive.length - 1 ? "border-b border-border/20" : ""}`}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={u.avatar} />
                    <AvatarFallback className={`text-[9px] font-bold text-white ${
                      u.role === "admin" ? "bg-violet-500" : u.role === "manager" ? "bg-blue-500" : "bg-emerald-600"
                    }`}>
                      {ini(u.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate">{u.fullName}</p>
                    <p className="text-[10px] text-muted-foreground/40 truncate">{u.email}</p>
                  </div>
                  <div className="hidden sm:block shrink-0">
                    <RoleBadge role={u.role} />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setOffboardTarget(u)}
                    className="h-8 px-3 rounded-xl text-[11px] font-semibold text-amber-600 hover:text-amber-600 hover:bg-amber-500/10 border border-amber-500/20 gap-1.5 shrink-0"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Offboard</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Offboarded employees */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <UserMinus className="h-3.5 w-3.5 text-muted-foreground/40" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
              Offboarded
            </p>
            <span className="ml-auto text-[10px] text-muted-foreground/40 font-semibold">
              {offboarded.length} records
            </span>
          </div>

          {offboarded.length === 0 ? (
            <EmptyState
              icon={UserMinus}
              label="No offboarded employees"
              sub="Records of offboarded employees will appear here for audit and compliance purposes."
            />
          ) : (
            <div className="rounded-xl border border-border/40 overflow-hidden">
              {offboarded.map((u, i) => (
                <div
                  key={u._id}
                  className={`flex items-center gap-3 px-4 py-3 opacity-60 hover:opacity-80 transition-opacity ${i < offboarded.length - 1 ? "border-b border-border/20" : ""}`}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={u.avatar} />
                    <AvatarFallback className="text-[9px] font-bold text-white bg-muted-foreground/40">
                      {ini(u.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate line-through text-muted-foreground/60">{u.fullName}</p>
                    <p className="text-[10px] text-muted-foreground/35 truncate">{u.email}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] text-muted-foreground/40 font-semibold">Offboarded</p>
                    <p className="text-[10px] text-muted-foreground/25">{fmtDate(u.offboardedAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <OffboardModal
        open={!!offboardTarget}
        onClose={() => setOffboardTarget(null)}
        token={token}
        user={offboardTarget}
        onOffboarded={() => {
          setOffboardTarget(null)
          load()
          toast.success("Offboarding complete. Records preserved for audit.")
        }}
      />
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HrPage() {
  const router = useRouter()
  const [tab, setTab] = React.useState<Tab>("milestones")
  const [user, setUser] = React.useState<{ _id: string; fullName: string; email: string; avatar?: string; role: string } | null>(null)
  const [token, setToken] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const t = localStorage.getItem("crm_token")
    if (!t) { router.replace("/crm"); return }
    apiClient
      .get("/api/crm/me", { headers: { Authorization: `Bearer ${t}` } })
      .then((res) => {
        const data = res.data?.data || res.data
        setUser(data)
        setToken(t)
      })
      .catch(() => {
        localStorage.removeItem("crm_token")
        router.replace("/crm")
      })
      .finally(() => setIsLoading(false))
  }, [router])

  const handleExit = async () => {
    try {
      await apiClient.post("/api/crm/logout", {}, { headers: { Authorization: `Bearer ${token}` } })
    } catch {}
    localStorage.removeItem("crm_token")
    localStorage.removeItem("crm_user")
    router.push("/")
  }

  const isAdmin = user?.role === "admin"

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
          </div>
          <p className="text-xs text-muted-foreground/40 tracking-widest uppercase">Loading</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "milestones",  label: "Milestones",  icon: Gift },
    { id: "onboarding",  label: "Onboarding",  icon: UserCheck },
    { id: "offboarding", label: "Offboarding", icon: UserMinus },
  ]

  return (
    <div className="min-h-screen w-full bg-background">

      {/* ── Topbar ── */}
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/90 backdrop-blur-xl">
        <div className="flex items-center justify-between h-14 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-sm">
              <Car className="h-4 w-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold leading-none">Action Auto</p>
              <p className="text-[9px] uppercase tracking-[0.25em] text-emerald-600 mt-0.5 font-bold">
                Workspace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 gap-2 pl-1.5 pr-3 rounded-full border border-border/40 hover:bg-muted/50">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="bg-emerald-600 text-white text-[9px] font-bold">{ini(user.fullName)}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-xs font-medium max-w-[100px] truncate">{user.fullName}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground/40" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1 shadow-xl border-border/40">
                <DropdownMenuItem onClick={() => router.push("/crm/profile")} className="rounded-xl text-xs h-9 gap-2.5 cursor-pointer">
                  <User className="h-3.5 w-3.5 text-muted-foreground" /> My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/crm/settings")} className="rounded-xl text-xs h-9 gap-2.5 cursor-pointer">
                  <Settings className="h-3.5 w-3.5 text-muted-foreground" /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExit} className="rounded-xl text-xs h-9 gap-2.5 cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/5">
                  <LogOut className="h-3.5 w-3.5" /> Exit CRM
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 pb-24 md:pb-8">

        {/* Page header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/crm/dashboard")}
            className="h-8 w-8 p-0 rounded-xl border border-border/40 hover:bg-muted/50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Settings</h1>
            <p className="text-xs text-muted-foreground/40 mt-0.5">
              Manage your CRM workspace
            </p>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] h-5 px-2 rounded-full capitalize font-semibold ml-auto hidden sm:inline-flex"
          >
            {user.role}
          </Badge>
        </div>

        {/* Layout: sidebar + content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ─── Sidebar nav ─── */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border/30">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                  Navigation
                </p>
              </div>
              <div className="p-2 space-y-1">
                <button
                  onClick={() => router.push("/crm/settings")}
                  className="w-full flex items-center justify-between gap-2.5 rounded-xl px-3 h-9 text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="h-3.5 w-3.5" />
                    User Management
                  </div>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                </button>
                <button
                  onClick={() => router.push("/crm/settings/integrations")}
                  className="w-full flex items-center justify-between gap-2.5 rounded-xl px-3 h-9 text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Lock className="h-3.5 w-3.5" />
                    Lead Integrations
                  </div>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                </button>
                <button
                  onClick={() => router.push("/crm/hr")}
                  className="w-full flex items-center justify-between gap-2.5 rounded-xl px-3 h-9 text-xs font-semibold bg-emerald-500/10 text-emerald-600"
                >
                  <div className="flex items-center gap-2.5">
                    <HeartHandshake className="h-3.5 w-3.5" />
                    Team Engagement
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3 w-3 text-emerald-500/40" />
                    <ChevronRight className="h-3 w-3 text-emerald-500/40" />
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* ─── Main panel ─── */}
          <div className="lg:col-span-9 space-y-4">
            {/* HR card */}
            <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
              {/* Card header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <HeartHandshake className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Team Engagement</p>
                    <p className="text-[11px] text-muted-foreground/40 mt-0.5">
                      Employee milestones, onboarding history, and offboarding management.
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="px-6 pt-4">
                <div className="flex gap-1 p-1 rounded-xl border border-border/40 bg-muted/20 w-fit">
                  {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setTab(id)}
                      className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold transition-all ${
                        tab === id
                          ? "bg-background shadow-sm text-foreground border border-border/40"
                          : "text-muted-foreground/60 hover:text-foreground/70"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab content */}
              <div className="px-6 py-5">
                {tab === "milestones" && <MilestonesTab token={token} />}
                {tab === "onboarding" && <OnboardingTab token={token} />}
                {tab === "offboarding" && (
                  isAdmin
                    ? <OffboardingTab token={token} />
                    : (
                      <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="h-14 w-14 rounded-2xl border-2 border-dashed border-border/25 flex items-center justify-center">
                          <Lock className="h-6 w-6 text-muted-foreground/20" />
                        </div>
                        <p className="text-sm font-semibold text-muted-foreground/40">Admin Access Required</p>
                        <p className="text-xs text-muted-foreground/25 max-w-xs text-center">
                          Offboarding actions are restricted to CRM admins. Contact your administrator for access.
                        </p>
                      </div>
                    )
                )}
              </div>

              {/* Stat bar */}
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground/30 px-6 pb-4 border-t border-border/20 pt-3">
                <Calendar className="h-3 w-3" />
                <span>Milestones check 30-day window</span>
                <span className="mx-1">·</span>
                <Clock className="h-3 w-3" />
                <span>Announcements post automatically on event day</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

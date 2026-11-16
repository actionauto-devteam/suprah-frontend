"use client"

import * as React from "react"
import { Loader2, Search } from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { apiClient } from "@/lib/api-client"

interface StaffRow {
  id: string
  kind: "crm" | "main"
  name: string
  email: string
  role: string
  avatar: string
  isAdmin: boolean
  allowed: boolean
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  authHeaders: Record<string, string>
}

function initials(name: string): string {
  return name.split(" ").map((part) => part[0]).join("").toUpperCase().slice(0, 2)
}

export function LeaderboardAccessDialog({ open, onOpenChange, authHeaders }: Props) {
  const [staff, setStaff] = React.useState<StaffRow[]>([])
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState("")

  React.useEffect(() => {
    if (!open) return
    setLoading(true)
    apiClient
      .get("/api/analytics/access/staff", { headers: authHeaders })
      .then((res) => setStaff(res.data?.data?.staff || []))
      .catch(() => toast.error("Could not load the team list"))
      .finally(() => setLoading(false))
  }, [open, authHeaders])

  const toggle = async (row: StaffRow, allowed: boolean) => {
    const rowKey = `${row.kind}:${row.id}`
    setSaving(rowKey)
    setStaff((list) => list.map((item) => (item.id === row.id && item.kind === row.kind ? { ...item, allowed } : item)))
    try {
      await apiClient.put(
        "/api/analytics/access",
        { principalId: row.id, principalKind: row.kind, allowed },
        { headers: authHeaders },
      )
      toast.success(allowed ? `${row.name} can now see the Leaderboard` : `${row.name} can no longer see the Leaderboard`)
    } catch {
      setStaff((list) => list.map((item) => (item.id === row.id && item.kind === row.kind ? { ...item, allowed: !allowed } : item)))
      toast.error("Could not save. Please try again.")
    } finally {
      setSaving(null)
    }
  }

  const q = search.trim().toLowerCase()
  const visible = q ? staff.filter((row) => row.name.toLowerCase().includes(q) || row.email.toLowerCase().includes(q)) : staff
  const allowedCount = staff.filter((row) => row.allowed).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-md max-h-[90dvh] flex flex-col gap-3">
        <DialogHeader>
          <DialogTitle>Who can see the Leaderboard</DialogTitle>
          <DialogDescription>
            Admins can always see it. Turn it on for anyone else who should see the calls and numbers of the whole team.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or email"
            className="h-9 w-full rounded-xl border border-border bg-muted/30 pl-8 pr-3 text-sm focus:outline-none focus:border-ring/50"
          />
        </div>

        <p className="text-[11px] text-muted-foreground">{allowedCount} of {staff.length} can see it</p>

        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
            </div>
          ) : visible.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No team members found</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {visible.map((row) => {
                const rowKey = `${row.kind}:${row.id}`
                return (
                  <li key={rowKey} className="flex items-center gap-3 py-2.5">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={row.avatar || undefined} />
                      <AvatarFallback className="bg-emerald-600 text-[10px] font-bold text-white">{initials(row.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{row.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {row.isAdmin ? "Admin · always has access" : row.email}
                      </p>
                    </div>
                    {saving === rowKey && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                    <Switch
                      checked={row.allowed}
                      disabled={row.isAdmin || saving === rowKey}
                      onCheckedChange={(checked) => toggle(row, checked)}
                      aria-label={`Leaderboard access for ${row.name}`}
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

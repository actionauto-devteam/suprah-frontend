"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Archive, Clock, ShieldAlert, Loader2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { resolveImageUrl } from "@/lib/utils"

interface FormerEmployee {
  _id: string
  fullName: string
  username?: string
  email?: string
  avatar?: string
  role: string
  department?: string
  offboardedAt: string
  accountDeletedAt?: string | null
  autoDeleteEligible?: boolean
}

const ini = (name: string) =>
  name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

const RETENTION_DAYS = 90

const autoDeleteDate = (offboardedAt: string) =>
  new Date(new Date(offboardedAt).getTime() + RETENTION_DAYS * 86_400_000)

export default function FormerEmployeesPage() {
  const router = useRouter()
  const [employees, setEmployees] = React.useState<FormerEmployee[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  const fetchData = React.useCallback(async () => {
    const token = localStorage.getItem("crm_token")
    if (!token) { router.replace("/crm"); return }
    try {
      const res = await apiClient.getFormerEmployees({ headers: { Authorization: `Bearer ${token}` } })
      setEmployees(res.data?.data?.users ?? [])
      setError("")
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err?.response?.data?.message || "Failed to load former employees.")
    } finally {
      setLoading(false)
    }
  }, [router])

  React.useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="min-h-screen bg-background timeproof-scope">
      <div
        className="sticky top-0 z-20 border-b border-border/40 bg-background/85 backdrop-blur-md"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.push("/crm/timeproof/users")}
            className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center hover:bg-muted/50 transition-colors text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <Archive className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-black tracking-tight">Former Employees</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-start gap-2.5">
          <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[12px] text-amber-700 dark:text-amber-400 leading-relaxed">
            Every offboarded or deleted employee's Timeproof history (hours, screenshots, streak) stays here permanently, even after their account is removed. Open a name to view their full record.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-xs text-rose-600">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/30" />
          </div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Archive className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground font-semibold">No former employees yet.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border/40 bg-card divide-y divide-border/20 overflow-hidden">
            {employees.map((emp) => (
              <div key={emp._id} className="flex items-center gap-3 px-4 py-3.5">
                <Avatar className="h-9 w-9 shrink-0">
                  {emp.avatar && <AvatarImage src={resolveImageUrl(emp.avatar) ?? undefined} />}
                  <AvatarFallback className="bg-muted-foreground/20 text-foreground/70 text-[10px] font-bold">
                    {ini(emp.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-semibold truncate">{emp.fullName}</p>
                    {emp.accountDeletedAt && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20 shrink-0">
                        Account Deleted
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground/60 truncate">
                    {emp.email || emp.username} · Offboarded {formatDate(emp.offboardedAt)}
                  </p>
                  {emp.autoDeleteEligible && (
                    <p className="text-[10px] text-amber-600/80 truncate">
                      Auto-deletes {formatDate(autoDeleteDate(emp.offboardedAt).toISOString())}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    try { sessionStorage.setItem("tp-shift-board-url", "/crm/timeproof/former-employees") } catch {}
                    router.push(`/crm/timeproof/users/${emp._id}`)
                  }}
                  className="h-8 shrink-0 rounded-lg text-[11px] font-semibold gap-1.5"
                >
                  <Clock className="h-3 w-3" />
                  <span className="hidden sm:inline">View Timeproof</span>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

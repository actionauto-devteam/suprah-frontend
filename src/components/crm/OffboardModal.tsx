
"use client"

import * as React from "react"
import { UserMinus, Loader2, ShieldOff, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,

} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { apiClient } from "@/lib/api-client"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OffboardUser {
  _id: string
  fullName: string
  email: string
  role: string
  avatar?: string
  username: string
}

interface OffboardModalProps {
  open: boolean
  onClose: () => void
  token: string
  user: OffboardUser | null
  onOffboarded?: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ini(n: string) {
  return n.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
}

const CHECKLIST = [
  "Account access will be immediately revoked",
  "Name removed from active employee lists",
  "Login credentials will be invalidated",
  "Records preserved in audit history",
]

// ─── Component ────────────────────────────────────────────────────────────────

export function OffboardModal({
  open,
  onClose,
  token,
  user,
  onOffboarded,
}: OffboardModalProps) {

  const [submitting, setSubmitting] = React.useState(false)
  const [confirmed, setConfirmed] = React.useState(false)

  React.useEffect(() => {
    if (open) setConfirmed(false)
  }, [open])

  const handleClose = () => {
    if (submitting) return
    onClose()
  }

  const handleOffboard = async () => {
    if (!user || submitting) return
    setSubmitting(true)
    try {
      await apiClient.post(
        `/api/crm/users/${user._id}/offboard`,
        {},

        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success(`${user.fullName} has been offboarded successfully.`)
      onOffboarded?.()
      handleClose()
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to offboard employee. Try again."
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden gap-0">


        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-5 border-b border-border/40 space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <UserMinus className="h-4 w-4 text-amber-500" />
            </div>
            <div>

              <DialogTitle className="text-sm font-bold">Offboard Employee</DialogTitle>
              <DialogDescription className="text-[11px] text-muted-foreground/50 mt-0.5">
                Review the offboarding process before confirming.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">


          {/* Employee card */}
          <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-muted/20 px-4 py-3">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="bg-amber-500/15 text-amber-600 text-[10px] font-bold">
                {ini(user.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate">{user.fullName}</p>
              <p className="text-[11px] text-muted-foreground/50 truncate">{user.email}</p>
            </div>
            <span className="shrink-0 text-[9px] font-mono text-muted-foreground/40 bg-muted/40 px-2 py-1 rounded-md">
              {user.username}
            </span>
          </div>

          {/* What happens */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
              What happens
            </p>
            <div className="space-y-1.5">
              {CHECKLIST.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-2.5 rounded-lg bg-muted/15 border border-border/20 px-3 py-2"
                >
                  <ShieldOff className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                  <span className="text-[11px] text-muted-foreground/70">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Audit note */}
          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
            <AlertTriangle className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
              Employee records are preserved for compliance and audit history. This action can be reviewed by admins at any time.
            </p>
          </div>

          {/* Confirm checkbox */}
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <div
              onClick={() => setConfirmed((v) => !v)}
              className={`h-4 w-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                confirmed
                  ? "bg-amber-500 border-amber-500"
                  : "border-border/50 group-hover:border-amber-400/50"
              }`}
            >
              {confirmed && (
                <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-white">
                  <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground/60 select-none">
              I understand this will revoke{" "}
              <span className="font-semibold text-foreground/80">{user.fullName}</span>&apos;s access immediately.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={submitting}
            className="flex-1 h-10 rounded-xl text-sm font-semibold border-border/50"
          >
            Cancel
          </Button>
          <Button

            onClick={handleOffboard}
            disabled={submitting || !confirmed}
            className="flex-1 h-10 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold shadow-md shadow-amber-600/15 gap-2 disabled:opacity-40"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Offboarding…</>
            ) : (
              <><UserMinus className="h-4 w-4" /> Confirm Offboard</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

  )
}

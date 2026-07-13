"use client"

import * as React from "react"
import { KeyRound, Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { apiClient } from "@/lib/api-client"


interface ResetPasswordModalProps {
  open: boolean
  onClose: () => void
  token: string
  user: {
    _id: string
    fullName: string
  } | null
  onReset?: () => void
}

interface FormErrors {
  newPassword?: string
  confirm?: string
}


export function ResetPasswordModal({ open, onClose, token, user, onReset }: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = React.useState("")
  const [confirm, setConfirm] = React.useState("")
  const [showNew, setShowNew] = React.useState(false)
  const [showConfirm, setShowConfirm] = React.useState(false)
  const [errors, setErrors] = React.useState<FormErrors>({})
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setNewPassword("")
      setConfirm("")
      setErrors({})
      setShowNew(false)
      setShowConfirm(false)
    }
  }, [open])

  const handleClose = () => {
    if (submitting) return
    onClose()
  }

  const validate = (): FormErrors => {
    const e: FormErrors = {}
    if (!newPassword) {
      e.newPassword = "New password is required."
    } else if (newPassword.length < 8) {
      e.newPassword = "Password must be at least 8 characters."
    }
    if (!confirm) {
      e.confirm = "Please confirm the password."
    } else if (newPassword !== confirm) {
      e.confirm = "Passwords do not match."
    }
    return e
  }

  const handleSubmit = async () => {
    if (submitting || !user) return
    const fieldErrors = validate()
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      return
    }
    setSubmitting(true)
    try {
      await apiClient.patch(
        `/api/crm/users/${user._id}/reset-password`,
        { newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success(`Password reset for ${user.fullName}.`)
      onReset?.()
      handleClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to reset password. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden gap-0">

        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-5 border-b border-border/40 space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <KeyRound className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold">Reset Password</DialogTitle>
              <DialogDescription className="text-[11px] text-muted-foreground/50 mt-0.5">
                {user ? `Set a new password for ${user.fullName}.` : "Set a new password."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Form */}
        <div className="px-6 py-5 space-y-4">

          {/* New Password */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
              New Password
            </Label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  if (errors.newPassword) setErrors((p) => ({ ...p, newPassword: undefined }))
                }}
                className={`h-10 rounded-xl text-sm border-border/50 pr-10 focus-visible:ring-amber-500/30 ${errors.newPassword ? "border-red-400 focus-visible:ring-red-400/30" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-[11px] text-red-500">{errors.newPassword}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
              Confirm Password
            </Label>
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                placeholder="Re-enter new password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value)
                  if (errors.confirm) setErrors((p) => ({ ...p, confirm: undefined }))
                }}
                className={`h-10 rounded-xl text-sm border-border/50 pr-10 focus-visible:ring-amber-500/30 ${errors.confirm ? "border-red-400 focus-visible:ring-red-400/30" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirm && (
              <p className="text-[11px] text-red-500">{errors.confirm}</p>
            )}
          </div>

          {/* Warning notice */}
          <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 px-3.5 py-3">
            <p className="text-[11px] text-amber-600 leading-relaxed">
              The user will need to use this new password on their next login. Make sure to share it securely.
            </p>
          </div>

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
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-semibold shadow-md shadow-amber-500/15 gap-2 disabled:opacity-40"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Resetting…</>
            ) : (
              <><KeyRound className="h-4 w-4" /> Reset Password</>
            )}
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  )
}

"use client"

import * as React from "react"
import { UserCog, Loader2 } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { apiClient } from "@/lib/api-client"

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditUserForm {
  fullName: string
  email: string
  role: string

  hireDate: string
  birthday: string
  gender: string
}

interface FormErrors {
  fullName?: string
  email?: string
  role?: string
  birthday?: string
  hireDate?: string
}

interface EditUserModalProps {
  open: boolean
  onClose: () => void
  token: string
  user: {
    _id: string
    fullName: string
    email: string
    role: string

    hireDate?: string
    birthday?: string
    gender?: string | null
  } | null
  onUpdated?: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(form: EditUserForm): FormErrors {
  const errors: FormErrors = {}
  if (!form.fullName.trim()) errors.fullName = "Full name is required."
  if (!form.email.trim()) {
    errors.email = "Email is required."
  } else if (!EMAIL_RE.test(form.email.trim())) {
    errors.email = "Enter a valid email address."
  }
  if (!form.role) errors.role = "Please select a role."
  return errors
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EditUserModal({ open, onClose, token, user, onUpdated }: EditUserModalProps) {
  const [submitting, setSubmitting] = React.useState(false)
  const [errors, setErrors] = React.useState<FormErrors>({})
  const [form, setForm] = React.useState<EditUserForm>({
    fullName: "",
    email: "",
    role: "",

    hireDate: "",
    birthday: "",
    gender: "",
  })

  // Populate form when user changes
  React.useEffect(() => {
    if (user) {
      setForm({
        fullName: user.fullName,
        email: user.email,
        role: user.role,

        hireDate: user.hireDate?.split("T")[0] ?? "",
        birthday: user.birthday?.split("T")[0] ?? "",
        gender: user.gender ?? "",
      })
      setErrors({})
    }
  }, [user])

  const handleClose = () => {
    if (submitting) return
    setErrors({})
    onClose()
  }

  const setField = (k: keyof EditUserForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((p) => ({ ...p, [k]: e.target.value }))
      if (k in errors) setErrors((p) => ({ ...p, [k]: undefined }))
    }

  const setRole = (v: string) => {
    setForm((p) => ({ ...p, role: v }))
    if (errors.role) setErrors((p) => ({ ...p, role: undefined }))
  }

  const handleSubmit = async () => {
    if (submitting || !user) return

    const fieldErrors = validate(form)
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      return
    }

    setSubmitting(true)
    try {
      await apiClient.patch(
        `/api/crm/users/${user._id}`,
        {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          role: form.role,
          hireDate: form.hireDate || undefined,
          birthday: form.birthday || undefined,

          gender: form.gender || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      toast.success("User updated successfully")
      onUpdated?.()
      handleClose()
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to update user. Try again."
      toast.error(msg)
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
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <UserCog className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold">Edit User</DialogTitle>
              <DialogDescription className="text-[11px] text-muted-foreground/50 mt-0.5">
                Update account details and role.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Form */}
        <div className="px-6 py-5 space-y-4">

          {/* Full Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
              Full Name
            </Label>
            <Input
              placeholder="e.g. Juan dela Cruz"
              value={form.fullName}
              onChange={setField("fullName")}
              className={`h-10 rounded-xl text-sm border-border/50 focus-visible:ring-blue-500/30 ${errors.fullName ? "border-red-400 focus-visible:ring-red-400/30" : ""}`}
            />
            {errors.fullName && (
              <p className="text-[11px] text-red-500">{errors.fullName}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
              Email
            </Label>
            <Input
              type="email"
              placeholder="juan@actionauto.com"
              value={form.email}
              onChange={setField("email")}
              className={`h-10 rounded-xl text-sm border-border/50 focus-visible:ring-blue-500/30 ${errors.email ? "border-red-400 focus-visible:ring-red-400/30" : ""}`}
            />
            {errors.email && (
              <p className="text-[11px] text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
              Role
            </Label>
            <Select value={form.role} onValueChange={setRole}>
              <SelectTrigger className={`h-10 rounded-xl text-sm border-border/50 focus:ring-blue-500/30 ${errors.role ? "border-red-400 focus:ring-red-400/30" : ""}`}>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="employee" className="rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Employee
                  </div>
                </SelectItem>
                <SelectItem value="manager" className="rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    Manager
                  </div>
                </SelectItem>
                <SelectItem value="admin" className="rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                    Admin
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-[11px] text-red-500">{errors.role}</p>
            )}
          </div>

          {/* Hire Date + Birthday row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
                Hire Date
              </Label>

              <Input
                type="date"
                value={form.hireDate}
                onChange={setField("hireDate")}
                className="h-10 rounded-xl text-sm border-border/50 focus-visible:ring-blue-500/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1.5">
                Birthday
                <span className="text-[9px] font-bold text-muted-foreground/40 bg-muted/30 px-1.5 py-0.5 rounded-full normal-case tracking-normal">
                  Optional
                </span>
              </Label>
              <Input
                type="date"
                value={form.birthday}
                onChange={setField("birthday")}
                className="h-10 rounded-xl text-sm border-border/50 focus-visible:ring-blue-500/30"
              />
            </div>
          </div>


          {/* Gender */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1.5">
              Gender
              <span className="text-[9px] font-bold text-muted-foreground/40 bg-muted/30 px-1.5 py-0.5 rounded-full normal-case tracking-normal">
                Optional
              </span>
            </Label>
            <Select value={form.gender} onValueChange={(v) => setForm((p) => ({ ...p, gender: v }))}>
              <SelectTrigger className="h-10 rounded-xl text-sm border-border/50 focus:ring-blue-500/30">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="male" className="rounded-lg text-sm">Male</SelectItem>
                <SelectItem value="female" className="rounded-lg text-sm">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Role hint */}
          {form.role && (
            <div className={`rounded-xl p-3 text-xs border ${
              form.role === "admin"
                ? "bg-violet-500/5 border-violet-500/15 text-violet-600"
                : form.role === "manager"
                ? "bg-blue-500/5 border-blue-500/15 text-blue-600"
                : "bg-emerald-500/5 border-emerald-500/15 text-emerald-600"
            }`}>
              {form.role === "admin" && (
                <><p className="font-bold">Admin Access</p><p className="opacity-70 mt-0.5">Full access to settings, user management, and all CRM features.</p></>
              )}
              {form.role === "manager" && (
                <><p className="font-bold">Manager Access</p><p className="opacity-70 mt-0.5">Can manage appointments, leads, and view team performance.</p></>
              )}
              {form.role === "employee" && (
                <><p className="font-bold">Employee Access</p><p className="opacity-70 mt-0.5">Standard access to appointments, time clock, and personal profile.</p></>
              )}
            </div>
          )}
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
            className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md shadow-blue-600/15 gap-2 disabled:opacity-40"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
            ) : (
              <><UserCog className="h-4 w-4" /> Save Changes</>
            )}
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  )
}

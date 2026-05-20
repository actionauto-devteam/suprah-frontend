"use client";

import * as React from "react";
import { UserPlus, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreateUserForm {
  fullName: string;
  email: string;
  password: string;
  role: string;
  birthday: string;
  hireDate: string;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  role?: string;
  hireDate?: string;
}

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
  token: string;
  onCreated?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMAIL_DOMAIN = "@actionautoutah.com";

function validate(form: CreateUserForm): FormErrors {
  const errors: FormErrors = {};

  if (!form.fullName.trim()) {
    errors.fullName = "Full name is required.";
  }
  if (!form.email.trim()) {
    errors.email = "Email username is required.";
  } else if (/\s|@/.test(form.email.trim())) {
    errors.email = "No spaces or @ allowed — just the username part.";
  }
  if (!form.password) {
    errors.password = "Password is required.";
  } else if (form.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }
  if (!form.role) {
    errors.role = "Please select a role.";
  }
  if (!form.hireDate) {
    errors.hireDate = "Hire date is required.";
  }

  return errors;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateUserModal({
  open,
  onClose,
  token,
  onCreated,
}: CreateUserModalProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  const [employeeId, setEmployeeId] = React.useState("");
  const [loadingId, setLoadingId] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [emailTouched, setEmailTouched] = React.useState(false);
  const [passwordTouched, setPasswordTouched] = React.useState(false);
  const [form, setForm] = React.useState<CreateUserForm>({
    fullName: "",
    email: "",
    password: "",
    role: "",
    birthday: "",
    hireDate: "",
  });

  // Fetch next employee ID whenever modal opens
  React.useEffect(() => {
    if (!open || !token) return;

    setLoadingId(true);
    setEmployeeId("");

    apiClient
      .get("/api/crm/next-employee-id", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const data = res.data?.data || res.data;
        setEmployeeId(data.employeeId ?? "");
      })
      .catch(() => setEmployeeId(""))
      .finally(() => setLoadingId(false));
  }, [open, token]);

  const handleClose = () => {
    if (submitting) return;
    setForm({ fullName: "", email: "", password: "", role: "", birthday: "", hireDate: "" });
    setErrors({});
    setShowPassword(false);
    setEmployeeId("");
    setEmailTouched(false);
    setPasswordTouched(false);
    onClose();
  };

  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fullName = e.target.value;
    const firstName = fullName.trim().split(/\s+/)[0].toLowerCase();
    setForm((p) => ({
      ...p,
      fullName,
      email: emailTouched ? p.email : firstName || "",
    }));
    if (errors.fullName) setErrors((p) => ({ ...p, fullName: undefined }));
    if (errors.email && !emailTouched)
      setErrors((p) => ({ ...p, email: undefined }));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailTouched(true);
    // Strip @ and everything after — only allow the local part
    setForm((p) => ({
      ...p,
      email: e.target.value.replace(/@.*/, "").replace(/\s/g, ""),
    }));
    if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordTouched(true);
    setForm((p) => ({ ...p, password: e.target.value }));
    if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
  };

  const setRole = (v: string) => {
    const autoPassword = v === "admin" ? "admin@123!" : "employee@123!";
    setForm((p) => ({
      ...p,
      role: v,
      password: passwordTouched ? p.password : autoPassword,
    }));
    if (errors.role) setErrors((p) => ({ ...p, role: undefined }));
    if (errors.password && !passwordTouched)
      setErrors((p) => ({ ...p, password: undefined }));
  };

  const handleSubmit = async () => {
    if (submitting) return;

    const fieldErrors = validate(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    if (!employeeId) return;

    setSubmitting(true);
    try {
      await apiClient.post(
        "/api/crm/users",
        {
          fullName: form.fullName.trim(),
          email: `${form.email.trim()}${EMAIL_DOMAIN}`,
          password: form.password,
          role: form.role,
          hireDate: form.hireDate || undefined,
          birthday: form.birthday || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      toast.success(`Account created — Employee ID: ${employeeId}`);
      onCreated?.();
      handleClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || "Failed to create user. Try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-5 border-b border-border/40 space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <UserPlus className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold">
                Create New User
              </DialogTitle>
              <DialogDescription className="text-[11px] text-muted-foreground/50 mt-0.5">
                Add a new CRM user and assign their role.
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
              onChange={handleFullNameChange}
              className={`h-10 rounded-xl text-sm border-border/50 focus-visible:ring-emerald-500/30 ${errors.fullName ? "border-red-400 focus-visible:ring-red-400/30" : ""}`}
            />
            {errors.fullName && (
              <p className="text-[11px] text-red-500">{errors.fullName}</p>
            )}
          </div>

          {/* Employee ID + Email row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Employee ID — auto generated, read-only */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1.5">
                Employee ID
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-full normal-case tracking-normal">
                  Auto
                </span>
              </Label>
              <div className="relative">
                <Input
                  readOnly
                  value={loadingId ? "" : employeeId}
                  placeholder="Generating…"
                  className="h-10 rounded-xl text-sm border-border/50 font-mono bg-muted/30 text-muted-foreground cursor-default select-none"
                />
                {loadingId && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground/40" />
                )}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1.5">
                Email
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-full normal-case tracking-normal">
                  Auto
                </span>
              </Label>
              <div
                className={`flex h-10 rounded-xl border text-sm overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/30 ${errors.email ? "border-red-400 focus-within:ring-red-400/30" : "border-border/50"}`}
              >
                <input
                  type="text"
                  placeholder="juan"
                  value={form.email}
                  onChange={handleEmailChange}
                  className="flex-1 min-w-0 bg-transparent px-3 outline-none text-sm placeholder:text-muted-foreground/30"
                />
                <span className="flex items-center pr-3 text-[11px] text-muted-foreground/40 whitespace-nowrap select-none bg-muted/20 pl-2 border-l border-border/30">
                  @actionautoutah.com
                </span>
              </div>
              {errors.email && (
                <p className="text-[11px] text-red-500">{errors.email}</p>
              )}
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1.5">
              Password
              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-full normal-case tracking-normal">
                Auto
              </span>
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={handlePasswordChange}
                className={`h-10 rounded-xl text-sm border-border/50 focus-visible:ring-emerald-500/30 pr-10 ${errors.password ? "border-red-400 focus-visible:ring-red-400/30" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] text-red-500">{errors.password}</p>
            )}
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
              Role
            </Label>
            <Select value={form.role} onValueChange={setRole}>
              <SelectTrigger
                className={`h-10 rounded-xl text-sm border-border/50 focus:ring-emerald-500/30 ${errors.role ? "border-red-400 focus:ring-red-400/30" : ""}`}
              >
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="employee" className="rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Employee
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
              <Label className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1.5">
                Hire Date
                <span className="text-[9px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-full normal-case tracking-normal">
                  Required
                </span>
              </Label>
              <input
                type="date"
                value={form.hireDate}
                onChange={(e) => {
                  setForm((p) => ({ ...p, hireDate: e.target.value }));
                  if (errors.hireDate) setErrors((p) => ({ ...p, hireDate: undefined }));
                }}
                max={new Date().toISOString().split("T")[0]}
                className={`flex h-10 w-full rounded-xl border px-3 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-colors ${errors.hireDate ? "border-red-400 focus:ring-red-400/30" : "border-border/50"}`}
              />
              {errors.hireDate && (
                <p className="text-[11px] text-red-500">{errors.hireDate}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1.5">
                Birthday
                <span className="text-[9px] font-semibold text-muted-foreground/30 bg-muted/30 px-1.5 py-0.5 rounded-full normal-case tracking-normal">
                  Optional
                </span>
              </Label>
              <input
                type="date"
                value={form.birthday}
                onChange={(e) => setForm((p) => ({ ...p, birthday: e.target.value }))}
                max={new Date().toISOString().split("T")[0]}
                className="flex h-10 w-full rounded-xl border border-border/50 px-3 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-colors"
              />
            </div>
          </div>

          {/* Role hint */}
          {form.role && (
            <div
              className={`rounded-xl p-3 text-xs border ${
                form.role === "admin"
                  ? "bg-violet-500/5 border-violet-500/15 text-violet-600"
                  : "bg-emerald-500/5 border-emerald-500/15 text-emerald-600"
              }`}
            >
              {form.role === "admin" && (
                <>
                  <p className="font-bold">Admin Access</p>
                  <p className="opacity-70 mt-0.5">
                    Full access to settings, user management, and all CRM
                    features.
                  </p>
                </>
              )}
              {form.role === "employee" && (
                <>
                  <p className="font-bold">Employee Access</p>
                  <p className="opacity-70 mt-0.5">
                    Standard access to appointments, time clock, and personal
                    profile.
                  </p>
                </>
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
            disabled={submitting || loadingId}
            className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-600/15 gap-2 disabled:opacity-40"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Creating…
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" /> Create User
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

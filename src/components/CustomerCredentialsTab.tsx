"use client";

import * as React from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Search, Plus, User, Mail, Phone, Car, MessageSquare,
  Receipt, ChevronRight, X, Edit2, Trash2,
  ArrowLeft, RefreshCw, Tag, Calendar, Clock,
  AlertCircle, Loader2, FileText,
  Shield, Users, TrendingUp, Inbox,
  CheckCircle2, AlertTriangle, ArrowUpRight,
  MapPin, Activity, Download, CheckCheck,
  WifiOff, Database, Moon, Sun,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  useCustomers,
  Customer,
  CreateCustomerInput,
  DuplicateCheckResult,
} from "@/hooks/useCustomers";

// ─── Types ────────────────────────────────────────────────────────────────────

type SyncStatus = "idle" | "syncing" | "synced" | "error";
type ThemeMode = "light" | "dark";

// ─── Constants ────────────────────────────────────────────────────────────────

const SOURCE_CONFIG: Record<string, { label: string; lightBg: string; darkBg: string; lightText: string; darkText: string; lightBorder: string; darkBorder: string; stripe: string }> = {
  lead:    { label: "Lead",    lightBg: "bg-blue-50", darkBg: "dark:bg-blue-950/30", lightText: "text-blue-700", darkText: "dark:text-blue-300", lightBorder: "border-blue-200", darkBorder: "dark:border-blue-800", stripe: "bg-blue-500 dark:bg-blue-400" },
  manual:  { label: "Manual",  lightBg: "bg-purple-50", darkBg: "dark:bg-purple-950/30", lightText: "text-purple-700", darkText: "dark:text-purple-300", lightBorder: "border-purple-200", darkBorder: "dark:border-purple-800", stripe: "bg-purple-500 dark:bg-purple-400" },
  booking: { label: "Booking", lightBg: "bg-emerald-50", darkBg: "dark:bg-emerald-950/30", lightText: "text-emerald-700", darkText: "dark:text-emerald-300", lightBorder: "border-emerald-200", darkBorder: "dark:border-emerald-800", stripe: "bg-emerald-500 dark:bg-emerald-400" },
  import:  { label: "Import",  lightBg: "bg-amber-50", darkBg: "dark:bg-amber-950/30", lightText: "text-amber-700", darkText: "dark:text-amber-300", lightBorder: "border-amber-200", darkBorder: "dark:border-amber-800", stripe: "bg-amber-500 dark:bg-amber-400" },
};

const TX_STATUS_STYLES: Record<string, { light: string; dark: string }> = {
  pending:   { light: "bg-amber-50 text-amber-700 border-amber-200", dark: "dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800" },
  active:    { light: "bg-blue-50 text-blue-700 border-blue-200", dark: "dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800" },
  completed: { light: "bg-emerald-50 text-emerald-700 border-emerald-200", dark: "dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800" },
  cancelled: { light: "bg-red-50 text-red-700 border-red-200", dark: "dark:bg-red-950/30 dark:text-red-300 dark:border-red-800" },
  failed:    { light: "bg-gray-100 text-gray-600 border-gray-200", dark: "dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700" },
};

const TX_ICONS: Record<string, React.ReactNode> = {
  lead:        <User className="h-3.5 w-3.5" />,
  appointment: <Calendar className="h-3.5 w-3.5" />,
  purchase:    <Receipt className="h-3.5 w-3.5" />,
  quote:       <FileText className="h-3.5 w-3.5" />,
  inquiry:     <MessageSquare className="h-3.5 w-3.5" />,
  other:       <Tag className="h-3.5 w-3.5" />,
};

const SYNC_INTERVAL_MS = 30_000;

// ─── Theme Context ────────────────────────────────────────────────────────────

const ThemeContext = React.createContext<{
  theme: ThemeMode;
  toggleTheme: () => void;
}>({
  theme: "light",
  toggleTheme: () => {},
});

// ─── Avatar ───────────────────────────────────────────────────────────────────

function avatarInitials(c: Customer) {
  return `${c.firstName?.[0] ?? ""}${c.lastName?.[0] ?? ""}`.toUpperCase() || "--";
}

const PALETTES: [string, string][] = [
  ["#0f6e3a", "#1db854"],
  ["#047857", "#34d399"],
  ["#059669", "#6ee7b7"],
  ["#dc2626", "#f87171"],
  ["#0891b2", "#06b6d4"],
  ["#7c2d12", "#ea580c"],
];

function getGradient(id: string): [string, string] {
  const idx = id.split("").reduce((s, c) => s + c.charCodeAt(0), 0) % PALETTES.length;
  return PALETTES[idx];
}

function Avatar({ customer, size = 40 }: { customer: Customer; size?: number }) {
  const [from, to] = getGradient(customer._id);
  const radius = Math.round(size * 0.2);
  const fontSize = Math.round(size * 0.33);
  return (
    <div
      style={{
        width: size, height: size, borderRadius: radius,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "white", fontWeight: 700, fontSize,
        flexShrink: 0, letterSpacing: "0.02em",
        fontFamily: "'Inter', sans-serif",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
      }}
    >
      {avatarInitials(customer)}
    </div>
  );
}

// ─── Sync Status Bar ──────────────────────────────────────────────────────────

function SyncBar({
  status,
  lastSynced,
  onSync,
}: {
  status: SyncStatus;
  lastSynced: Date | null;
  onSync: () => void;
}) {
  const configs = {
    idle: {
      icon: <Database className="h-4 w-4 text-slate-500 dark:text-slate-400" />,
      text: "Synchronization ready",
      sub: lastSynced ? `Last synced ${formatDistanceToNow(lastSynced, { addSuffix: true })}` : "Not yet synchronized",
      barBg: "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800",
      btnHover: "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300",
      btnLabel: "Sync Now",
    },
    syncing: {
      icon: <Loader2 className="h-4 w-4 text-green-600 dark:text-green-400" />,
      text: "Synchronizing records…",
      sub: "Fetching latest lead data",
      barBg: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
      btnHover: "opacity-50 cursor-not-allowed text-green-700 dark:text-green-300",
      btnLabel: "Syncing…",
    },
    synced: {
      icon: <CheckCheck className="h-4 w-4 text-green-600 dark:text-green-400" />,
      text: "All records up to date",
      sub: lastSynced ? `Completed ${formatDistanceToNow(lastSynced, { addSuffix: true })}` : "Sync complete",
      barBg: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
      btnHover: "hover:bg-green-100 dark:hover:bg-green-900/40 text-green-700 dark:text-green-300",
      btnLabel: "Sync Again",
    },
    error: {
      icon: <WifiOff className="h-4 w-4 text-red-500 dark:text-red-400" />,
      text: "Synchronization failed",
      sub: "Check your connection and retry",
      barBg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
      btnHover: "hover:bg-red-100 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300",
      btnLabel: "Retry",
    },
  };

  const c = configs[status];

  return (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-lg border ${c.barBg} transition-all duration-300`}>
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        {c.icon}
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 leading-none mb-0.5">{c.text}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{c.sub}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {lastSynced && status !== "syncing" && (
          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 hidden sm:block">
            {format(lastSynced, "HH:mm:ss")}
          </span>
        )}
        <button
          onClick={onSync}
          disabled={status === "syncing"}
          className={`flex items-center gap-1.5 px-3 h-8 rounded-md border border-current/20 text-xs font-semibold transition-colors ${c.btnHover}`}
        >
          <RefreshCw className={`h-3 w-3 ${status === "syncing" ? "" : ""}`} />
          {c.btnLabel}
        </button>
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, accentLight, accentDark, description, trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accentLight: string;
  accentDark: string;
  description?: string;
  trend?: { value: number; isPositive: boolean };
}) {
  return (
    <div className="flex flex-col p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className={`flex items-center justify-center h-9 w-9 rounded-md ${accentLight} ${accentDark}`}>
          {icon}
        </div>
        {trend && (
          <span className={`flex items-center gap-0.5 text-[11px] font-semibold tabular-nums ${
            trend.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
          }`}>
            <ArrowUpRight className={`h-3 w-3 ${!trend.isPositive ? "rotate-180" : ""}`} />
            {Math.abs(trend.value).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-white font-mono leading-none tabular-nums">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {description && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">{description}</p>}
    </div>
  );
}

// ─── Duplicate Warning ────────────────────────────────────────────────────────

function DuplicateWarning({ result, onViewExisting }: {
  result: DuplicateCheckResult;
  onViewExisting?: () => void;
}) {
  const match: Record<string, string> = {
    email_and_phone: "identical email address and phone number",
    email_only: "the same email address",
    phone_only: "the same phone number",
  };
  if (!result.isDuplicate) return null;
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-amber-800 dark:text-amber-200">Potential Duplicate Detected</p>
        <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
          An existing record shares {match[result.matchType ?? "email_only"]}
          {result.existingCustomer && (
            <> — <strong>{result.existingCustomer.firstName} {result.existingCustomer.lastName}</strong></>
          )}.
        </p>
      </div>
      {onViewExisting && result.existingCustomer && (
        <button
          onClick={onViewExisting}
          className="text-xs font-semibold text-amber-700 dark:text-amber-300 underline underline-offset-2 whitespace-nowrap hover:no-underline"
        >
          View Record
        </button>
      )}
    </div>
  );
}

// ─── Customer Form Modal ──────────────────────────────────────────────────────

const EMPTY_FORM: CreateCustomerInput = {
  firstName: "", lastName: "", email: "", phone: "",
  alternatePhone: "", notes: "", tags: [],
  preferredContactMethod: "email",
  vehicleInterest: { year: "", make: "", model: "", condition: "used" },
  address: { street: "", city: "", state: "", postalCode: "", country: "" },
};

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
      {children}{required && <span className="text-red-500 dark:text-red-400 ml-0.5">*</span>}
    </Label>
  );
}

function CustomerFormModal({
  open, onOpenChange, initial, onSave, isSaving, checkDuplicate, onSelectExisting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<Customer>;
  onSave: (data: CreateCustomerInput) => Promise<void>;
  isSaving: boolean;
  checkDuplicate?: (email: string, phone: string, excludeId?: string) => Promise<DuplicateCheckResult>;
  onSelectExisting?: (id: string) => void;
}) {
  const [form, setForm] = React.useState<CreateCustomerInput>({ ...EMPTY_FORM });
  const [error, setError] = React.useState("");
  const [dupResult, setDupResult] = React.useState<DuplicateCheckResult | null>(null);
  const [isCheckingDup, setIsCheckingDup] = React.useState(false);
  const dupTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (open) {
      setForm(initial ? { ...EMPTY_FORM, ...initial } : { ...EMPTY_FORM });
      setError("");
      setDupResult(null);
    }
  }, [open, initial]);

  const set = (k: keyof CreateCustomerInput, v: any) => setForm(p => ({ ...p, [k]: v }));
  const setVehicle = (k: string, v: string) =>
    setForm(p => ({ ...p, vehicleInterest: { ...p.vehicleInterest, [k]: v } }));
  const setAddr = (k: string, v: string) =>
    setForm(p => ({ ...p, address: { ...p.address, [k]: v } }));

  const triggerDupCheck = React.useCallback((email: string, phone: string) => {
    if (!checkDuplicate || initial?._id) return;
    if (dupTimer.current) clearTimeout(dupTimer.current);
    if (!email && !phone) { setDupResult(null); return; }
    dupTimer.current = setTimeout(async () => {
      setIsCheckingDup(true);
      try {
        const r = await checkDuplicate(email, phone, initial?._id);
        setDupResult(r);
      } catch { setDupResult(null); }
      finally { setIsCheckingDup(false); }
    }, 600);
  }, [checkDuplicate, initial]);

  const handleSubmit = async () => {
    setError("");
    if (!form.firstName.trim() || !form.email.trim() || !form.phone.trim()) {
      setError("First name, email address, and phone number are required."); return;
    }
    try {
      await onSave(form);
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to save customer record.");
    }
  };

  const isEditing = !!initial?._id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-[#1DB854] dark:bg-[#1DB854] flex items-center justify-center">
              {isEditing
                ? <Edit2 className="h-4 w-4 text-white" />
                : <Plus className="h-4 w-4 text-white" />
              }
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                {isEditing ? "Edit Customer Record" : "New Customer Record"}
              </DialogTitle>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {isEditing
                  ? "Update customer information. Duplicate detection runs automatically."
                  : "Complete the fields below. Duplicate detection is automatic."}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto max-h-[68vh] px-6 py-5 space-y-6">
          {error && (
            <Alert variant="destructive" className="py-3 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs ml-2">{error}</AlertDescription>
            </Alert>
          )}
          {dupResult && (
            <DuplicateWarning
              result={dupResult}
              onViewExisting={
                dupResult.existingCustomer && onSelectExisting
                  ? () => { onOpenChange(false); onSelectExisting(dupResult.existingCustomer!._id); }
                  : undefined
              }
            />
          )}

          {/* Personal Information */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 px-2">
                Personal Information
              </span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <FieldLabel required>First Name</FieldLabel>
                <Input value={form.firstName} onChange={e => set("firstName", e.target.value)} placeholder="John" className="h-9 text-sm rounded-md border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white" />
              </div>
              <div className="space-y-1.5">
                <FieldLabel>Last Name</FieldLabel>
                <Input value={form.lastName} onChange={e => set("lastName", e.target.value)} placeholder="Doe" className="h-9 text-sm rounded-md border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white" />
              </div>
              <div className="space-y-1.5">
                <FieldLabel required>
                  Email Address
                  {isCheckingDup && <Loader2 className="inline h-3 w-3 ml-1.5" />}
                </FieldLabel>
                <div className="relative">
                  <Input
                    type="email"
                    value={form.email}
                    onChange={e => { set("email", e.target.value); triggerDupCheck(e.target.value, form.phone); }}
                    placeholder="john@example.com"
                    className={`h-9 pr-8 text-sm rounded-md border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white ${dupResult?.isDuplicate ? "border-amber-400 dark:border-amber-600" : ""}`}
                  />
                  {dupResult?.isDuplicate && <AlertTriangle className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />}
                  {dupResult && !dupResult.isDuplicate && form.email && <CheckCircle2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />}
                </div>
              </div>
              <div className="space-y-1.5">
                <FieldLabel required>Phone Number</FieldLabel>
                <div className="relative">
                  <Input
                    value={form.phone}
                    onChange={e => { set("phone", e.target.value); triggerDupCheck(form.email, e.target.value); }}
                    placeholder="+1 555 000 0000"
                    className={`h-9 pr-8 text-sm rounded-md border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white ${dupResult?.isDuplicate ? "border-amber-400 dark:border-amber-600" : ""}`}
                  />
                  {dupResult?.isDuplicate && <AlertTriangle className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />}
                </div>
              </div>
              <div className="space-y-1.5">
                <FieldLabel>Alternate Phone</FieldLabel>
                <Input value={form.alternatePhone} onChange={e => set("alternatePhone", e.target.value)} placeholder="Optional" className="h-9 text-sm rounded-md border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white" />
              </div>
              <div className="space-y-1.5">
                <FieldLabel>Preferred Contact Method</FieldLabel>
                <Select value={form.preferredContactMethod} onValueChange={v => set("preferredContactMethod", v)}>
                  <SelectTrigger className="h-9 text-sm rounded-md border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Address */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 px-2">Address</span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <FieldLabel>Street Address</FieldLabel>
                <Input value={form.address?.street} onChange={e => setAddr("street", e.target.value)} placeholder="123 Main Street" className="h-9 text-sm rounded-md border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white" />
              </div>
              {[
                { key: "city", label: "City", placeholder: "New York" },
                { key: "state", label: "State / Province", placeholder: "NY" },
                { key: "postalCode", label: "Postal Code", placeholder: "10001" },
                { key: "country", label: "Country", placeholder: "United States" },
              ].map(f => (
                <div key={f.key} className="space-y-1.5">
                  <FieldLabel>{f.label}</FieldLabel>
                  <Input
                    value={(form.address as any)?.[f.key]}
                    onChange={e => setAddr(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="h-9 text-sm rounded-md border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Vehicle Interest */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 px-2">Vehicle Interest</span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { key: "year", label: "Year", placeholder: "2024" },
                { key: "make", label: "Make", placeholder: "Toyota" },
                { key: "model", label: "Model", placeholder: "Camry" },
              ].map(f => (
                <div key={f.key} className="space-y-1.5">
                  <FieldLabel>{f.label}</FieldLabel>
                  <Input value={(form.vehicleInterest as any)?.[f.key]} onChange={e => setVehicle(f.key, e.target.value)} placeholder={f.placeholder} className="h-9 text-sm rounded-md border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white" />
                </div>
              ))}
              <div className="space-y-1.5">
                <FieldLabel>Condition</FieldLabel>
                <Select value={form.vehicleInterest?.condition} onValueChange={v => setVehicle("condition", v)}>
                  <SelectTrigger className="h-9 text-sm rounded-md border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="used">Used</SelectItem>
                    <SelectItem value="certified">Certified Pre-Owned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <FieldLabel>Budget</FieldLabel>
                <Input value={form.vehicleInterest?.budget} onChange={e => setVehicle("budget", e.target.value)} placeholder="e.g., $30,000" className="h-9 text-sm rounded-md border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white" />
              </div>
            </div>
          </section>

          {/* Notes */}
          <section className="space-y-1.5">
            <FieldLabel>Internal Notes</FieldLabel>
            <Textarea
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              placeholder="Add relevant notes about this customer…"
              rows={3}
              className="resize-none text-sm rounded-md border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
          {dupResult?.isDuplicate && !isEditing ? (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium">
              <AlertTriangle className="h-3.5 w-3.5" />
              A matching record already exists
            </p>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-9 text-xs rounded-md dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" className="h-9 text-xs rounded-md bg-[#1DB854] hover:bg-[#17964a] text-white dark:bg-[#1DB854] dark:hover:bg-[#17964a]" onClick={handleSubmit} disabled={isSaving}>
              {isSaving && <Loader2 className="h-3.5 w-3.5 mr-1.5" />}
              {isEditing ? "Save Changes" : "Create Record"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Log Conversation Modal ───────────────────────────────────────────────────

function LogConversationModal({ open, onOpenChange, onLog, isSaving }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onLog: (data: any) => Promise<void>;
  isSaving: boolean;
}) {
  const [form, setForm] = React.useState({
    channel: "email", direction: "outbound", senderType: "agent",
    senderName: "", content: "", subject: "",
  });

  const handleSubmit = async () => {
    if (!form.content.trim()) return;
    await onLog(form);
    onOpenChange(false);
    setForm({ channel: "email", direction: "outbound", senderType: "agent", senderName: "", content: "", subject: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-xl p-0 gap-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">Log Communication</DialogTitle>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Record a communication interaction with this customer</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <FieldLabel>Channel</FieldLabel>
              <Select value={form.channel} onValueChange={v => setForm(p => ({ ...p, channel: v }))}>
                <SelectTrigger className="h-9 text-sm rounded-md border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["email", "sms", "phone", "in-person", "chat", "other"].map(v => (
                    <SelectItem key={v} value={v} className="capitalize">{v.replace("-", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Direction</FieldLabel>
              <Select value={form.direction} onValueChange={v => setForm(p => ({ ...p, direction: v }))}>
                <SelectTrigger className="h-9 text-sm rounded-md border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbound">Inbound</SelectItem>
                  <SelectItem value="outbound">Outbound</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Subject</FieldLabel>
            <Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Optional" className="h-9 text-sm rounded-md border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white" />
          </div>
          <div className="space-y-1.5">
            <FieldLabel required>Message Content</FieldLabel>
            <Textarea
              value={form.content}
              onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
              placeholder="Summarise what was discussed…"
              rows={4}
              className="resize-none text-sm rounded-md border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 bg-slate-50/50 dark:bg-slate-900/30">
          <Button variant="outline" size="sm" className="h-9 text-xs rounded-md dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" className="h-9 text-xs rounded-md bg-[#1DB854] hover:bg-[#17964a] text-white dark:bg-[#1DB854] dark:hover:bg-[#17964a]" onClick={handleSubmit} disabled={isSaving || !form.content.trim()}>
            {isSaving && <Loader2 className="h-3.5 w-3.5 mr-1.5" />}
            Save Record
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Customer Detail Panel ────────────────────────────────────────────────────

function CustomerDetail({ customer, onBack, onEdit, onDelete, onConversationLog, isSavingConv }: {
  customer: Customer;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onConversationLog: (data: any) => Promise<void>;
  isSavingConv: boolean;
}) {
  const [convOpen, setConvOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("overview");

  const sortedConvs = [...(customer.conversations ?? [])].sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
  );
  const sortedTxs = [...(customer.transactions ?? [])].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
  const src = SOURCE_CONFIG[customer.source] ?? SOURCE_CONFIG.manual;

  return (
    <>
      <div className="flex flex-col h-full bg-white dark:bg-slate-950">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/30">
          <button onClick={onBack} className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Avatar customer={customer} size={40} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-slate-900 dark:text-white text-[15px] leading-tight">
                {customer.firstName} {customer.lastName}
              </h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${src.lightBg} ${src.darkBg} ${src.lightBorder} ${src.darkBorder} ${src.lightText} ${src.darkText}`}>{src.label}</span>
              {!customer.isActive && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">Inactive</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{customer.email} · {customer.phone}</p>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={onEdit} title="Edit record" className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button onClick={onDelete} title="Delete record" className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20">
          {[
            { icon: <Receipt className="h-3.5 w-3.5" />, label: "Transactions", value: customer.stats?.totalTransactions ?? 0 },
            { icon: <MessageSquare className="h-3.5 w-3.5" />, label: "Conversations", value: customer.stats?.totalConversations ?? 0 },
            { icon: <Calendar className="h-3.5 w-3.5" />, label: "Appointments", value: customer.stats?.totalAppointments ?? 0 },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center py-3 gap-1">
              <p className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">{s.value}</p>
              <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                {s.icon}
                <span className="text-[10px]">{s.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
          <TabsList className="mx-5 mt-3 mb-0 justify-start h-8 bg-slate-100 dark:bg-slate-900 w-auto shrink-0 gap-0.5 rounded-md p-0.5">
            {[
              { value: "overview", label: "Overview" },
              { value: "transactions", label: `Transactions (${sortedTxs.length})` },
              { value: "conversations", label: `Conversations (${sortedConvs.length})` },
            ].map(t => (
              <TabsTrigger key={t.value} value={t.value} className="text-[11px] h-7 px-3 rounded-sm font-semibold dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="flex-1 overflow-auto px-5 py-4 space-y-5">
            <section>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2.5">Contact Information</p>
              <div className="rounded-lg border border-slate-100 dark:border-slate-800 overflow-hidden divide-y divide-slate-50 dark:divide-slate-900 bg-white dark:bg-slate-900/30">
                <a href={`mailto:${customer.email}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                  <Mail className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 shrink-0" />
                  <span className="text-[13px] text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors truncate">{customer.email}</span>
                </a>
                <a href={`tel:${customer.phone}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                  <Phone className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 shrink-0" />
                  <span className="text-[13px] text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{customer.phone}</span>
                </a>
                {customer.alternatePhone && (
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <Phone className="h-3.5 w-3.5 text-slate-300 dark:text-slate-700 shrink-0" />
                    <span className="text-[13px] text-slate-400 dark:text-slate-500">{customer.alternatePhone} <span className="text-[10px]">(alternate)</span></span>
                  </div>
                )}
                {customer.address?.city && (
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-300 dark:text-slate-700 shrink-0" />
                    <span className="text-[13px] text-slate-400 dark:text-slate-500">
                      {[customer.address.city, customer.address.state, customer.address.country].filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}
              </div>
            </section>

            {customer.vehicleInterest?.make && (
              <section>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2.5">Vehicle Interest</p>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30">
                  <div className="h-9 w-9 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                    <Car className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">
                      {[customer.vehicleInterest.year, customer.vehicleInterest.make, customer.vehicleInterest.model].filter(Boolean).join(" ")}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 capitalize">
                      {customer.vehicleInterest.condition ?? "used"}
                      {customer.vehicleInterest.budget ? ` · ${customer.vehicleInterest.budget}` : ""}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {customer.notes && (
              <section>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2.5">Notes</p>
                <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-slate-800">{customer.notes}</p>
              </section>
            )}

            <section>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2.5">Activity Timeline</p>
              <div className="space-y-1.5">
                {customer.stats?.firstContactedAt && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800">
                    <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span className="text-[12px] text-slate-500 dark:text-slate-400">First contact:</span>
                    <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300 font-mono">
                      {format(new Date(customer.stats.firstContactedAt), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
                {customer.stats?.lastContactedAt && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800">
                    <RefreshCw className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span className="text-[12px] text-slate-500 dark:text-slate-400">Last contact:</span>
                    <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">
                      {formatDistanceToNow(new Date(customer.stats.lastContactedAt), { addSuffix: true })}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800">
                  <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span className="text-[12px] text-slate-500 dark:text-slate-400">Record created:</span>
                  <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300 font-mono">
                    {format(new Date(customer.createdAt), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
            </section>
          </TabsContent>

          {/* Transactions */}
          <TabsContent value="transactions" className="flex-1 overflow-auto px-5 py-4">
            {sortedTxs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-12 w-12 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center mb-3">
                  <Receipt className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No transactions recorded</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Transaction history will appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedTxs.map(tx => (
                  <div key={tx._id} className={`flex items-start gap-3 p-3.5 rounded-lg border transition-colors ${TX_STATUS_STYLES[tx.status].light} ${TX_STATUS_STYLES[tx.status].dark} border-current/20`}>
                    <div className="h-8 w-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400">
                      {TX_ICONS[tx.type] ?? <Tag className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate">{tx.title}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold capitalize ${TX_STATUS_STYLES[tx.status].light} ${TX_STATUS_STYLES[tx.status].dark}`}>
                          {tx.status}
                        </span>
                      </div>
                      {tx.description && <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{tx.description}</p>}
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1">
                        {formatDistanceToNow(new Date(tx.occurredAt), { addSuffix: true })}
                        {tx.amount ? ` · ${tx.currency ?? "$"}${tx.amount.toLocaleString()}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Conversations */}
          <TabsContent value="conversations" className="flex-1 overflow-auto px-5 py-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-400">{sortedConvs.length} communication records</p>
              <button
                onClick={() => setConvOpen(true)}
                className="flex items-center gap-1.5 px-3 h-7 rounded-md border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors uppercase tracking-wide"
              >
                <Plus className="h-3 w-3" /> Log
              </button>
            </div>

            {sortedConvs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="h-12 w-12 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center mb-3">
                  <MessageSquare className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No communications logged</p>
                <button onClick={() => setConvOpen(true)} className="mt-3 text-xs font-semibold text-slate-600 dark:text-slate-400 underline underline-offset-2 hover:no-underline">
                  Log first communication
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {sortedConvs.map(conv => (
                  <div
                    key={conv._id}
                    className={`p-3.5 rounded-lg border text-sm ${
                      conv.direction === "inbound"
                        ? "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30"
                        : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                          conv.direction === "inbound"
                            ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}>
                          {conv.direction}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 capitalize">{conv.channel}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono shrink-0">
                        {formatDistanceToNow(new Date(conv.sentAt), { addSuffix: true })}
                      </span>
                    </div>
                    {conv.subject && <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 mb-1">{conv.subject}</p>}
                    <p className="text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{conv.content}</p>
                    {conv.senderName && (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">via {conv.senderName}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <LogConversationModal
        open={convOpen}
        onOpenChange={setConvOpen}
        onLog={onConversationLog}
        isSaving={isSavingConv}
      />
    </>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function CustomerCredentialsTab() {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [sourceFilter, setSourceFilter] = React.useState("all");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<Customer | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [detailCustomer, setDetailCustomer] = React.useState<Customer | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);
  const [isSavingConv, setIsSavingConv] = React.useState(false);

  // Sync state
  const [syncStatus, setSyncStatus] = React.useState<SyncStatus>("idle");
  const [lastSynced, setLastSynced] = React.useState<Date | null>(null);
  const syncTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const {
    customers, total, pages, stats,
    isLoading, error, refetch,
    fetchCustomer, checkDuplicate,
    createCustomer, isCreating,
    updateCustomer, isUpdating,
    deleteCustomer, isDeleting,
    addConversation,
  } = useCustomers({
    page, limit: 20,
    search: debouncedSearch,
    source: sourceFilter !== "all" ? sourceFilter : undefined,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const handleSync = React.useCallback(async () => {
    if (syncStatus === "syncing") return;
    setSyncStatus("syncing");
    try {
      await refetch();
      await new Promise(r => setTimeout(r, 800));
      setSyncStatus("synced");
      setLastSynced(new Date());
    } catch {
      setSyncStatus("error");
    }
  }, [syncStatus, refetch]);

  React.useEffect(() => {
    handleSync();
    const id = setInterval(handleSync, SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  React.useEffect(() => {
    if (syncStatus !== "synced") return;
    const id = setTimeout(() => setSyncStatus("idle"), 5000);
    return () => clearTimeout(id);
  }, [syncStatus]);

  React.useEffect(() => {
    if (!selectedId) { setDetailCustomer(null); return; }
    fetchCustomer(selectedId).then(setDetailCustomer).catch(() => setDetailCustomer(null));
  }, [selectedId, fetchCustomer]);

  const handleCreate = async (data: CreateCustomerInput) => {
    await createCustomer(data);
    refetch();
  };

  const handleUpdate = async (data: CreateCustomerInput) => {
    if (!editTarget) return;
    await updateCustomer({ id: editTarget._id, data });
    if (selectedId === editTarget._id) {
      const fresh = await fetchCustomer(editTarget._id);
      setDetailCustomer(fresh);
    }
    setEditTarget(null);
    refetch();
  };

  const handleDelete = async (id: string) => {
    await deleteCustomer(id);
    if (selectedId === id) { setSelectedId(null); setDetailCustomer(null); }
    setDeleteConfirmId(null);
    refetch();
  };

  const handleLogConv = async (data: any) => {
    if (!selectedId) return;
    setIsSavingConv(true);
    try {
      await addConversation({ customerId: selectedId, data });
      const fresh = await fetchCustomer(selectedId);
      setDetailCustomer(fresh);
    } finally { setIsSavingConv(false); }
  };

  const sourceOptions = [
    { value: "all",     label: "All Sources", count: stats?.total },
    { value: "lead",    label: "Leads",       count: stats?.fromLeads },
    { value: "manual",  label: "Manual",      count: stats?.manual },
    { value: "booking", label: "Bookings",    count: stats?.recentlyAdded },
  ];

  return (
    <div className="flex flex-col h-full gap-5 bg-white dark:bg-slate-950 p-6 rounded-xl" style={{ minHeight: 640 }}>

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Customer Records
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your customer database with automatic lead synchronization
          </p>
        </div>
        <Button
          size="sm"
          className="h-9 px-4 gap-2 bg-[#1DB854] hover:bg-[#17964a] text-white rounded-md text-xs font-semibold shrink-0 dark:bg-[#1DB854] dark:hover:bg-[#17964a]"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          New Record
        </Button>
      </div>

      {/* ── Sync Bar ─────────────────────────────────────────────────────────── */}
      <SyncBar status={syncStatus} lastSynced={lastSynced} onSync={handleSync} />

      {/* ── Stats ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          icon={<Users className="h-4.5 w-4.5 text-slate-600 dark:text-slate-400" />}
          label="Total Records"
          value={stats?.total ?? 0}
          accentLight="bg-slate-100"
          accentDark="dark:bg-slate-800"
        />
        <StatCard
          icon={<CheckCircle2 className="h-4.5 w-4.5 text-[#1DB854] dark:text-[#1DB854]" />}
          label="Active"
          value={stats?.active ?? 0}
          accentLight="bg-green-50"
          accentDark="dark:bg-green-950/40"
          trend={{ value: (((stats?.active ?? 0) / Math.max(stats?.total ?? 1, 1)) * 100), isPositive: true }}
        />
        <StatCard
          icon={<Inbox className="h-4.5 w-4.5 text-[#1DB854] dark:text-[#1DB854]" />}
          label="From Leads"
          value={stats?.fromLeads ?? 0}
          accentLight="bg-green-50"
          accentDark="dark:bg-green-950/40"
          description="Auto-synchronized"
        />
        <StatCard
          icon={<User className="h-4.5 w-4.5 text-purple-600 dark:text-purple-400" />}
          label="Manual Entry"
          value={stats?.manual ?? 0}
          accentLight="bg-purple-50"
          accentDark="dark:bg-purple-950/40"
          description="Manually created"
        />
        <StatCard
          icon={<TrendingUp className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />}
          label="This Month"
          value={stats?.recentlyAdded ?? 0}
          accentLight="bg-amber-50"
          accentDark="dark:bg-amber-950/40"
          description="Last 30 days"
        />
      </div>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 gap-4">

        {/* Left: List */}
        <div className={`flex flex-col ${selectedId ? "hidden lg:flex" : "flex"} w-full lg:w-[360px] xl:w-[400px] shrink-0`}>
          {/* Search */}
          <div className="space-y-2.5 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email or phone…"
                className="pl-9 h-9 text-[13px] rounded-md border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Source Filter */}
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2">
                {sourceOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setSourceFilter(opt.value); setPage(1); }}
                    className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-[10px] font-bold transition-all duration-200 ${
                      sourceFilter === opt.value
                        ? "bg-[#1DB854] dark:bg-[#1DB854] text-white shadow-md transform scale-105"
                        : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-700 dark:hover:text-slate-300 hover:shadow-sm"
                    }`}
                  >
                    {opt.value !== "all" && (
                      <span className={`h-2 w-2 rounded-full ${SOURCE_CONFIG[opt.value]?.stripe ?? "bg-slate-400"}`} />
                    )}
                    <span className="flex-1 text-center">{opt.label}</span>
                    {opt.count !== undefined && (
                      <span className={`font-semibold ml-auto tabular-nums ${sourceFilter === opt.value ? "text-white/80" : "text-slate-400 dark:text-slate-500"}`}>
                        {opt.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Count */}
          <div className="flex items-center justify-between mb-2.5 px-0.5">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">{total.toLocaleString()}</span>
              {" "}{total === 1 ? "record" : "records"}
              {debouncedSearch && <span className="italic"> matching "{debouncedSearch}"</span>}
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-3 py-2.5 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs ml-2">Failed to load customer records.</AlertDescription>
            </Alert>
          )}

          {/* List */}
          <ScrollArea className="flex-1 -mx-1 px-1">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2.5">
                <Loader2 className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                <p className="text-xs text-slate-400 dark:text-slate-500">Loading records…</p>
              </div>
            ) : customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-12 w-12 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center mb-3">
                  <User className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {debouncedSearch ? "No matching records" : "No records yet"}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  {debouncedSearch ? "Try adjusting your search" : "Records auto-sync from leads or can be added manually"}
                </p>
              </div>
            ) : (
              <div className="space-y-1 pb-2">
                {customers.map((c: Customer) => {
                  const src = SOURCE_CONFIG[c.source] ?? SOURCE_CONFIG.manual;
                  const isSelected = selectedId === c._id;
                  return (
                    <button
                      key={c._id}
                      onClick={() => setSelectedId(c._id)}
                      className={`w-full text-left rounded-lg border px-3.5 py-3 transition-all group ${
                        isSelected
                          ? "border-[#1DB854] dark:border-[#1DB854] bg-[#1DB854] dark:bg-[#1DB854] shadow-md text-white"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar customer={c} size={36} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className={`text-[13px] font-bold truncate ${isSelected ? "text-white" : "text-slate-800 dark:text-white"}`}>
                              {c.firstName} {c.lastName}
                            </p>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              isSelected ? "bg-white/20 text-white" : `${src.lightBg} ${src.darkBg} ${src.lightText} ${src.darkText} border ${src.lightBorder} ${src.darkBorder}`
                            }`}>
                              {src.label}
                            </span>
                          </div>
                          <p className={`text-[11px] truncate ${isSelected ? "text-white/60" : "text-slate-500 dark:text-slate-400"}`}>{c.email}</p>
                        </div>
                        <ChevronRight className={`h-4 w-4 shrink-0 transition-all ${
                          isSelected ? "text-white/50" : "text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400"
                        }`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" size="sm" className="h-8 text-xs rounded-md dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                Previous
              </Button>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono tabular-nums">
                {page} / {pages}
              </span>
              <Button variant="outline" size="sm" className="h-8 text-xs rounded-md dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}>
                Next
              </Button>
            </div>
          )}
        </div>

        {/* Right: Detail */}
        <div className={`flex-1 min-w-0 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950 ${
          selectedId ? "flex" : "hidden lg:flex"
        } flex-col shadow-sm`}>
          {detailCustomer ? (
            <CustomerDetail
              customer={detailCustomer}
              onBack={() => setSelectedId(null)}
              onEdit={() => setEditTarget(detailCustomer)}
              onDelete={() => setDeleteConfirmId(detailCustomer._id)}
              onConversationLog={handleLogConv}
              isSavingConv={isSavingConv}
            />
          ) : selectedId ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-12">
              <div className="relative">
                <div className="h-16 w-16 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center">
                  <User className="h-7 w-7 text-slate-300 dark:text-slate-600" />
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-lg bg-[#1DB854] dark:bg-[#1DB854] flex items-center justify-center shadow-sm">
                  <Shield className="h-3.5 w-3.5 text-white" />
                </div>
              </div>
              <div>
                <p className="text-base font-bold text-slate-800 dark:text-white">Select a record</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                  Choose a customer from the list to view their complete profile, transaction history, and communication log
                </p>
              </div>
              <Button size="sm" className="gap-2 bg-[#1DB854] hover:bg-[#17964a] text-white text-xs h-9 px-4 rounded-md mt-1 dark:bg-[#1DB854] dark:hover:bg-[#17964a]" onClick={() => setCreateOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                Create New Record
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────────── */}

      <CustomerFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSave={handleCreate}
        isSaving={isCreating}
        checkDuplicate={checkDuplicate}
        onSelectExisting={id => { setSelectedId(id); setCreateOpen(false); }}
      />

      {editTarget && (
        <CustomerFormModal
          open={!!editTarget}
          onOpenChange={open => { if (!open) setEditTarget(null); }}
          initial={editTarget}
          onSave={handleUpdate}
          isSaving={isUpdating}
          checkDuplicate={checkDuplicate}
        />
      )}

      <Dialog open={!!deleteConfirmId} onOpenChange={open => { if (!open) setDeleteConfirmId(null); }}>
        <DialogContent className="max-w-sm rounded-xl p-0 gap-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">Delete Customer Record</DialogTitle>
          </div>
          <div className="px-6 py-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              This action permanently removes the customer record, including all associated transactions and communication history.{" "}
              <strong className="text-slate-800 dark:text-slate-200">This cannot be undone.</strong>
            </p>
          </div>
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 bg-slate-50/50 dark:bg-slate-900/30">
            <Button variant="outline" size="sm" className="h-8 text-xs rounded-md dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-8 text-xs rounded-md"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-3.5 w-3.5 mr-1.5" />}
              Delete Record
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
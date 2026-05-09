"use client";

import * as React from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Search, Plus, User, Mail, Phone, Car, MessageSquare,
  Receipt, ChevronRight, X, Edit2, Trash2, Check,
  ArrowLeft, RefreshCw, Tag, Calendar, Clock,
  Building2, AlertCircle, Loader2, Send, FileText,
  Shield, Zap, Users, TrendingUp, Filter,
  CheckCircle2, AlertTriangle, Info,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  useCustomers,
  Customer,
  CreateCustomerInput,
  DuplicateCheckResult,
} from "@/hooks/useCustomers";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SOURCE_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  lead: { label: "Lead", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300", dot: "bg-sky-500" },
  manual: { label: "Manual", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300", dot: "bg-violet-500" },
  booking: { label: "Booking", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", dot: "bg-emerald-500" },
  import: { label: "Import", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", dot: "bg-amber-500" },
};

const TX_STATUS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  active: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  failed: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const TX_ICONS: Record<string, React.ReactNode> = {
  lead: <User className="h-3.5 w-3.5" />,
  appointment: <Calendar className="h-3.5 w-3.5" />,
  purchase: <Receipt className="h-3.5 w-3.5" />,
  quote: <FileText className="h-3.5 w-3.5" />,
  inquiry: <MessageSquare className="h-3.5 w-3.5" />,
  other: <Tag className="h-3.5 w-3.5" />,
};

function avatarInitials(c: Customer) {
  return `${c.firstName?.[0] ?? ""}${c.lastName?.[0] ?? ""}`.toUpperCase() || "??";
}

const AVATAR_GRADIENTS = [
  ["#10b981", "#059669"], // emerald
  ["#3b82f6", "#2563eb"], // blue
  ["#8b5cf6", "#7c3aed"], // violet
  ["#f59e0b", "#d97706"], // amber
  ["#06b6d4", "#0891b2"], // cyan
  ["#ec4899", "#db2777"], // pink
  ["#f97316", "#ea580c"], // orange
  ["#14b8a6", "#0d9488"], // teal
];

function avatarGradient(id: string): [string, string] {
  const idx = id.split("").reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[idx] as [string, string];
}

function Avatar({ customer, size = 36 }: { customer: Customer; size?: number }) {
  const [from, to] = avatarGradient(customer._id);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontWeight: 700,
        fontSize: size * 0.33,
        flexShrink: 0,
        letterSpacing: "-0.02em",
      }}
    >
      {avatarInitials(customer)}
    </div>
  );
}

// ─── Duplicate Warning Banner ─────────────────────────────────────────────────

function DuplicateWarning({ result, onViewExisting }: {
  result: DuplicateCheckResult;
  onViewExisting?: () => void;
}) {
  const labels: Record<string, string> = {
    email_and_phone: "same email address and phone number",
    email_only: "same email address",
    phone_only: "same phone number",
  };

  if (!result.isDuplicate) return null;

  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/50">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
          Duplicate detected
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
          A customer with the {labels[result.matchType ?? "email_only"]} already exists.
          {result.existingCustomer && (
            <> Matched: <strong>{result.existingCustomer.firstName} {result.existingCustomer.lastName}</strong></>
          )}
        </p>
      </div>
      {onViewExisting && (
        <button
          onClick={onViewExisting}
          className="text-xs text-amber-700 dark:text-amber-300 underline whitespace-nowrap hover:no-underline"
        >
          View record
        </button>
      )}
    </div>
  );
}

// ─── Stat Tile ────────────────────────────────────────────────────────────────

function StatTile({
  icon, label, value, accent, sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent: string;
  sub?: string;
}) {
  return (
    <div className="relative flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden group hover:border-border transition-all">
      <div className={`flex items-center justify-center h-9 w-9 rounded-xl ${accent} shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-0.5">{label}</p>
        <p className="text-2xl font-bold leading-none text-foreground">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Customer Form Modal ──────────────────────────────────────────────────────

interface CustomerFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<Customer>;
  onSave: (data: CreateCustomerInput) => Promise<void>;
  isSaving: boolean;
  checkDuplicate?: (email: string, phone: string, excludeId?: string) => Promise<DuplicateCheckResult>;
  onSelectExisting?: (id: string) => void;
}

const EMPTY_FORM: CreateCustomerInput = {
  firstName: "", lastName: "", email: "", phone: "",
  alternatePhone: "", notes: "", tags: [],
  preferredContactMethod: "email",
  vehicleInterest: { year: "", make: "", model: "", condition: "used" },
  address: { street: "", city: "", state: "", postalCode: "", country: "" },
};

function CustomerFormModal({
  open, onOpenChange, initial, onSave, isSaving, checkDuplicate, onSelectExisting,
}: CustomerFormProps) {
  const [form, setForm] = React.useState<CreateCustomerInput>({ ...EMPTY_FORM });
  const [error, setError] = React.useState("");
  const [dupResult, setDupResult] = React.useState<DuplicateCheckResult | null>(null);
  const [isCheckingDup, setIsCheckingDup] = React.useState(false);
  const dupCheckTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Real-time duplicate check with debounce
  const triggerDupCheck = React.useCallback(
    (email: string, phone: string) => {
      if (!checkDuplicate || initial?._id) return; // skip on edit
      if (dupCheckTimeout.current) clearTimeout(dupCheckTimeout.current);
      if (!email && !phone) { setDupResult(null); return; }
      dupCheckTimeout.current = setTimeout(async () => {
        setIsCheckingDup(true);
        try {
          const result = await checkDuplicate(email, phone, initial?._id);
          setDupResult(result);
        } catch { setDupResult(null); }
        finally { setIsCheckingDup(false); }
      }, 600);
    },
    [checkDuplicate, initial],
  );

  const handleEmailChange = (v: string) => {
    set("email", v);
    triggerDupCheck(v, form.phone);
  };
  const handlePhoneChange = (v: string) => {
    set("phone", v);
    triggerDupCheck(form.email, v);
  };

  const handleSubmit = async () => {
    setError("");
    if (!form.firstName.trim() || !form.email.trim() || !form.phone.trim()) {
      setError("First name, email, and phone are required."); return;
    }
    try {
      await onSave(form);
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to save customer.");
    }
  };

  const isEditing = !!initial?._id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border/50 bg-muted/30">
          <DialogTitle className="text-base font-semibold">
            {isEditing ? "Edit Customer" : "Add New Customer"}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isEditing
              ? "Update the customer's information below."
              : "Fill in the details below. Duplicate checking is automatic."}
          </p>
        </div>

        <div className="overflow-y-auto max-h-[70vh] px-6 py-5 space-y-6">
          {error && (
            <Alert variant="destructive" className="py-2.5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {/* Duplicate warning */}
          {dupResult && (
            <DuplicateWarning
              result={dupResult}
              onViewExisting={
                dupResult.existingCustomer && onSelectExisting
                  ? () => {
                      onOpenChange(false);
                      onSelectExisting(dupResult.existingCustomer!._id);
                    }
                  : undefined
              }
            />
          )}

          {/* Personal */}
          <section className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Personal Information
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">First Name <span className="text-red-500">*</span></Label>
                <Input
                  value={form.firstName}
                  onChange={e => set("firstName", e.target.value)}
                  placeholder="Jane"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Last Name</Label>
                <Input value={form.lastName} onChange={e => set("lastName", e.target.value)} placeholder="Doe" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Email <span className="text-red-500">*</span>
                  {isCheckingDup && <span className="ml-2 text-muted-foreground text-[10px]">checking…</span>}
                </Label>
                <div className="relative">
                  <Input
                    type="email"
                    value={form.email}
                    onChange={e => handleEmailChange(e.target.value)}
                    placeholder="jane@example.com"
                    className={`h-9 pr-8 ${dupResult?.isDuplicate ? "border-amber-400 focus-visible:ring-amber-400/30" : ""}`}
                  />
                  {dupResult?.isDuplicate && (
                    <AlertTriangle className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-500" />
                  )}
                  {dupResult && !dupResult.isDuplicate && form.email && (
                    <CheckCircle2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-500" />
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    value={form.phone}
                    onChange={e => handlePhoneChange(e.target.value)}
                    placeholder="+1 555 000 0000"
                    className={`h-9 pr-8 ${dupResult?.isDuplicate ? "border-amber-400 focus-visible:ring-amber-400/30" : ""}`}
                  />
                  {dupResult?.isDuplicate && (
                    <AlertTriangle className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-500" />
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Alternate Phone</Label>
                <Input value={form.alternatePhone} onChange={e => set("alternatePhone", e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Preferred Contact</Label>
                <Select value={form.preferredContactMethod} onValueChange={v => set("preferredContactMethod", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <Separator />

          {/* Address */}
          <section className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Address</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Street</Label>
                <Input value={form.address?.street} onChange={e => setAddr("street", e.target.value)} placeholder="123 Main St" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">City</Label>
                <Input value={form.address?.city} onChange={e => setAddr("city", e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">State</Label>
                <Input value={form.address?.state} onChange={e => setAddr("state", e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Postal Code</Label>
                <Input value={form.address?.postalCode} onChange={e => setAddr("postalCode", e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Country</Label>
                <Input value={form.address?.country} onChange={e => setAddr("country", e.target.value)} className="h-9" />
              </div>
            </div>
          </section>

          <Separator />

          {/* Vehicle */}
          <section className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Vehicle Interest</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Year</Label>
                <Input value={form.vehicleInterest?.year} onChange={e => setVehicle("year", e.target.value)} placeholder="2024" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Make</Label>
                <Input value={form.vehicleInterest?.make} onChange={e => setVehicle("make", e.target.value)} placeholder="Toyota" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Model</Label>
                <Input value={form.vehicleInterest?.model} onChange={e => setVehicle("model", e.target.value)} placeholder="Camry" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Condition</Label>
                <Select value={form.vehicleInterest?.condition} onValueChange={v => setVehicle("condition", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="used">Used</SelectItem>
                    <SelectItem value="certified">Certified Pre-Owned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Budget</Label>
                <Input value={form.vehicleInterest?.budget} onChange={e => setVehicle("budget", e.target.value)} placeholder="$30,000" className="h-9" />
              </div>
            </div>
          </section>

          <Separator />

          {/* Notes */}
          <section className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              placeholder="Any relevant notes about this customer…"
              rows={3}
              className="resize-none text-sm"
            />
          </section>
        </div>

        <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between bg-muted/20">
          {dupResult?.isDuplicate && !isEditing ? (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Duplicate detected — saving will link to existing record
            </p>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} disabled={isSaving}>
              {isSaving
                ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                : <Check className="h-3.5 w-3.5 mr-1.5" />}
              {isEditing ? "Save Changes" : "Create Customer"}
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
      <DialogContent className="max-w-md rounded-2xl p-0 gap-0">
        <div className="px-5 py-4 border-b border-border/50">
          <DialogTitle className="text-base font-semibold">Log Conversation</DialogTitle>
        </div>
        <div className="px-5 py-4 space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Channel</Label>
              <Select value={form.channel} onValueChange={v => setForm(p => ({ ...p, channel: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["email", "sms", "phone", "in-person", "chat", "other"].map(c => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Direction</Label>
              <Select value={form.direction} onValueChange={v => setForm(p => ({ ...p, direction: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbound">← Inbound</SelectItem>
                  <SelectItem value="outbound">→ Outbound</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Subject (optional)</Label>
            <Input
              value={form.subject}
              onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
              placeholder="Re: Your inquiry…"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Message <span className="text-red-500">*</span></Label>
            <Textarea
              value={form.content}
              onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
              placeholder="Conversation content or notes…"
              rows={4}
              className="resize-none text-sm"
            />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-border/50 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSaving || !form.content.trim()}>
            {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
            Log Conversation
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
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
          <button
            onClick={onBack}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted/60 transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Avatar customer={customer} size={40} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-sm truncate">
                {customer.firstName} {customer.lastName}
              </h2>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${src.color}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${src.dot}`} />
                {src.label}
              </span>
              {!customer.isActive && (
                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  Inactive
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{customer.email}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onEdit}
              className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-muted-foreground hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Quick stats bar */}
        <div className="grid grid-cols-3 border-b border-border/50 divide-x divide-border/50 shrink-0">
          {[
            { label: "Transactions", value: customer.stats?.totalTransactions ?? 0 },
            { label: "Conversations", value: customer.stats?.totalConversations ?? 0 },
            { label: "Appointments", value: customer.stats?.totalAppointments ?? 0 },
          ].map(s => (
            <div key={s.label} className="text-center py-3.5 px-2">
              <p className="text-xl font-bold text-foreground leading-none">{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
          <TabsList className="mx-5 mt-3 mb-0 justify-start h-8 bg-muted/50 w-auto shrink-0 gap-0.5">
            <TabsTrigger value="overview" className="text-[11px] h-7 px-3">Overview</TabsTrigger>
            <TabsTrigger value="transactions" className="text-[11px] h-7 px-3">
              Transactions
              {sortedTxs.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[9px] h-3.5 px-1 min-w-0">{sortedTxs.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="conversations" className="text-[11px] h-7 px-3">
              Conversations
              {sortedConvs.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[9px] h-3.5 px-1 min-w-0">{sortedConvs.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="flex-1 overflow-auto px-5 py-4 space-y-5 mt-0">
            <section>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">Contact</p>
              <div className="space-y-2.5">
                <a href={`mailto:${customer.email}`} className="flex items-center gap-2.5 text-sm group">
                  <div className="h-6 w-6 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <span className="truncate group-hover:text-emerald-600 transition-colors">{customer.email}</span>
                </a>
                <a href={`tel:${customer.phone}`} className="flex items-center gap-2.5 text-sm group">
                  <div className="h-6 w-6 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <span className="group-hover:text-emerald-600 transition-colors">{customer.phone}</span>
                </a>
                {customer.alternatePhone && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <div className="h-6 w-6 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <span className="text-muted-foreground">{customer.alternatePhone} <span className="text-xs">(alt)</span></span>
                  </div>
                )}
                {customer.address?.city && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <div className="h-6 w-6 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <span className="text-muted-foreground">
                      {[customer.address.city, customer.address.state, customer.address.country].filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}
              </div>
            </section>

            {customer.vehicleInterest?.make && (
              <>
                <Separator />
                <section>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">Vehicle Interest</p>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                    <div className="h-8 w-8 rounded-lg bg-white dark:bg-muted flex items-center justify-center shrink-0 shadow-sm">
                      <Car className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {[customer.vehicleInterest.year, customer.vehicleInterest.make, customer.vehicleInterest.model]
                          .filter(Boolean).join(" ")}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">
                        {customer.vehicleInterest.condition ?? "used"}
                        {customer.vehicleInterest.budget ? ` · ${customer.vehicleInterest.budget}` : ""}
                      </p>
                    </div>
                  </div>
                </section>
              </>
            )}

            {customer.notes && (
              <>
                <Separator />
                <section>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">Notes</p>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{customer.notes}</p>
                </section>
              </>
            )}

            <Separator />
            <section>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2.5">Activity</p>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                {customer.stats?.firstContactedAt && (
                  <p className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" /> First contact:{" "}
                    {format(new Date(customer.stats.firstContactedAt), "PPP")}
                  </p>
                )}
                {customer.stats?.lastContactedAt && (
                  <p className="flex items-center gap-1.5">
                    <RefreshCw className="h-3 w-3" /> Last contact:{" "}
                    {formatDistanceToNow(new Date(customer.stats.lastContactedAt), { addSuffix: true })}
                  </p>
                )}
                <p className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" /> Added:{" "}
                  {format(new Date(customer.createdAt), "PPP")}
                </p>
              </div>
            </section>
          </TabsContent>

          {/* Transactions */}
          <TabsContent value="transactions" className="flex-1 overflow-auto px-5 py-4 mt-0">
            {sortedTxs.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Receipt className="h-8 w-8 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedTxs.map(tx => (
                  <div
                    key={tx._id}
                    className="flex items-start gap-3 p-3 rounded-xl border border-border/50 hover:border-border/80 bg-card transition-colors"
                  >
                    <div className="h-7 w-7 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 text-muted-foreground mt-0.5">
                      {TX_ICONS[tx.type] ?? <Tag className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium truncate">{tx.title}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold capitalize ${TX_STATUS[tx.status]}`}>
                          {tx.status}
                        </span>
                      </div>
                      {tx.description && <p className="text-xs text-muted-foreground truncate">{tx.description}</p>}
                      <p className="text-[10px] text-muted-foreground mt-0.5">
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
          <TabsContent value="conversations" className="flex-1 overflow-auto px-5 py-4 mt-0">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium">{sortedConvs.length} conversations</p>
              <button
                onClick={() => setConvOpen(true)}
                className="flex items-center gap-1.5 px-2.5 h-7 rounded-lg border border-border/50 text-xs font-medium hover:bg-muted/50 hover:border-border transition-all"
              >
                <Plus className="h-3 w-3" /> Log
              </button>
            </div>

            {sortedConvs.length === 0 ? (
              <div className="text-center py-14 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No conversations yet</p>
                <button
                  onClick={() => setConvOpen(true)}
                  className="mt-3 text-xs underline hover:no-underline"
                >
                  Log first conversation
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {sortedConvs.map(conv => (
                  <div
                    key={conv._id}
                    className={`p-3.5 rounded-xl border text-sm ${
                      conv.direction === "inbound"
                        ? "border-sky-200/60 bg-sky-50/60 dark:bg-sky-900/10 dark:border-sky-800/40"
                        : "border-emerald-200/60 bg-emerald-50/60 dark:bg-emerald-900/10 dark:border-emerald-800/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold ${
                          conv.direction === "inbound" ? "text-sky-600 dark:text-sky-400" : "text-emerald-600 dark:text-emerald-400"
                        }`}>
                          {conv.direction === "inbound" ? "← INBOUND" : "→ OUTBOUND"}
                        </span>
                        <span className="text-[10px] text-muted-foreground/70 capitalize px-1.5 py-0.5 rounded bg-white/60 dark:bg-black/20 border border-border/30">
                          {conv.channel}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(conv.sentAt), { addSuffix: true })}
                      </span>
                    </div>
                    {conv.subject && <p className="text-xs font-semibold mb-1 text-foreground/80">{conv.subject}</p>}
                    <p className="text-xs text-foreground/70 leading-relaxed whitespace-pre-wrap">{conv.content}</p>
                    {conv.senderName && (
                      <p className="text-[10px] text-muted-foreground mt-1.5">by {conv.senderName}</p>
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

// ─── Main CustomerCredentialsTab ──────────────────────────────────────────────

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
    page,
    limit: 20,
    search: debouncedSearch,
    source: sourceFilter !== "all" ? sourceFilter : undefined,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  // Load full customer on select
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
    } finally {
      setIsSavingConv(false);
    }
  };

  const sourceOptions = [
    { value: "all", label: "All Sources" },
    { value: "lead", label: "Lead" },
    { value: "manual", label: "Manual" },
    { value: "booking", label: "Booking" },
    { value: "import", label: "Import" },
  ];

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 640 }}>
      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        <StatTile
          icon={<Users className="h-4 w-4 text-slate-600 dark:text-slate-300" />}
          label="Total" value={stats?.total ?? 0}
          accent="bg-slate-100 dark:bg-slate-800"
        />
        <StatTile
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
          label="Active" value={stats?.active ?? 0}
          accent="bg-emerald-100 dark:bg-emerald-900/40"
        />
        <StatTile
          icon={<Zap className="h-4 w-4 text-sky-600 dark:text-sky-400" />}
          label="From Leads" value={stats?.fromLeads ?? 0}
          accent="bg-sky-100 dark:bg-sky-900/40"
        />
        <StatTile
          icon={<User className="h-4 w-4 text-violet-600 dark:text-violet-400" />}
          label="Manual" value={stats?.manual ?? 0}
          accent="bg-violet-100 dark:bg-violet-900/40"
        />
        <StatTile
          icon={<TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
          label="Added (30d)" value={stats?.recentlyAdded ?? 0}
          sub="last 30 days"
          accent="bg-amber-100 dark:bg-amber-900/40"
        />
      </div>

      {/* ── Auto-sync notice ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-emerald-200/60 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-800/40 mb-4">
        <Shield className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          <strong>Auto-sync active</strong> — new leads are automatically added here. Duplicate detection prevents redundant records.
        </p>
      </div>

      {/* ── Main layout ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 gap-4">
        {/* Left: customer list */}
        <div className={`flex flex-col ${selectedId ? "hidden lg:flex" : "flex"} w-full lg:w-[380px] xl:w-[420px] shrink-0`}>
          {/* Search & filters */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, email or phone…"
                  className="pl-9 h-9 text-sm bg-background"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 flex items-center justify-center rounded text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Button
                size="sm"
                className="h-9 px-3 shrink-0 gap-1.5"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Add</span>
              </Button>
            </div>

            {/* Source filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              {sourceOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setSourceFilter(opt.value); setPage(1); }}
                  className={`flex items-center gap-1 px-3 h-7 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                    sourceFilter === opt.value
                      ? "bg-foreground text-background shadow-sm"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {opt.value !== "all" && (
                    <span className={`h-1.5 w-1.5 rounded-full ${SOURCE_CONFIG[opt.value]?.dot ?? "bg-gray-400"}`} />
                  )}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Result count */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">
              {total.toLocaleString()} customer{total !== 1 ? "s" : ""}
              {debouncedSearch && <> matching <em>"{debouncedSearch}"</em></>}
            </p>
            <button
              onClick={() => refetch()}
              className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-3 py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">Failed to load customers.</AlertDescription>
            </Alert>
          )}

          {/* List */}
          <ScrollArea className="flex-1 -mx-1 px-1">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Loading customers…</p>
              </div>
            ) : customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <div className="h-12 w-12 rounded-2xl border-2 border-dashed border-border flex items-center justify-center mb-4">
                  <User className="h-5 w-5 opacity-30" />
                </div>
                <p className="text-sm font-medium">
                  {debouncedSearch ? "No results found" : "No customers yet"}
                </p>
                <p className="text-xs mt-1 text-center max-w-[200px]">
                  {debouncedSearch
                    ? "Try a different search term"
                    : "Leads are auto-synced, or add one manually"}
                </p>
                {!debouncedSearch && (
                  <button
                    onClick={() => setCreateOpen(true)}
                    className="mt-4 flex items-center gap-1.5 px-3 h-8 rounded-lg border border-border text-xs font-medium hover:bg-muted/50 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Customer
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-1.5 pb-2">
                {customers.map((c: Customer) => {
                  const src = SOURCE_CONFIG[c.source] ?? SOURCE_CONFIG.manual;
                  return (
                    <button
                      key={c._id}
                      onClick={() => setSelectedId(c._id)}
                      className={`w-full text-left rounded-xl border p-3 transition-all group ${
                        selectedId === c._id
                          ? "border-emerald-500/60 bg-emerald-50/60 dark:bg-emerald-900/20 shadow-sm"
                          : "border-border/40 hover:border-border/70 hover:bg-muted/30 bg-card"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar customer={c} size={36} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="text-sm font-semibold truncate leading-tight">
                              {c.firstName} {c.lastName}
                            </p>
                            <span className={`inline-flex items-center gap-0.5 shrink-0 px-1.5 h-4 rounded-full text-[9px] font-bold ${src.color}`}>
                              <span className={`h-1 w-1 rounded-full ${src.dot}`} />
                              {src.label}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">{c.email}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">{c.phone}</p>
                        </div>
                        <ChevronRight className={`h-4 w-4 shrink-0 transition-all ${
                          selectedId === c._id
                            ? "text-emerald-500"
                            : "text-muted-foreground/30 group-hover:text-muted-foreground"
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
            <div className="flex items-center justify-between pt-3 mt-1 border-t border-border/40">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 h-7 rounded-lg border border-border/50 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted/50 transition-colors"
              >
                Previous
              </button>
              <span className="text-xs text-muted-foreground tabular-nums">
                {page} / {pages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="px-3 h-7 rounded-lg border border-border/50 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted/50 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Right: detail panel */}
        <div className={`flex-1 min-w-0 border border-border/50 rounded-2xl overflow-hidden bg-card ${
          selectedId ? "flex" : "hidden lg:flex"
        } flex-col`}>
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
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center p-10">
              <div className="relative">
                <div className="h-20 w-20 rounded-3xl border-2 border-dashed border-border flex items-center justify-center bg-muted/20">
                  <User className="h-8 w-8 text-muted-foreground/25" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-lg bg-emerald-500 flex items-center justify-center">
                  <Shield className="h-3 w-3 text-white" />
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-base font-semibold">Select a customer</p>
                <p className="text-sm text-muted-foreground max-w-[240px]">
                  Click any record to view their full profile, history, and activity
                </p>
              </div>
              <button
                onClick={() => setCreateOpen(true)}
                className="flex items-center gap-1.5 px-4 h-9 rounded-xl border border-border text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                <Plus className="h-4 w-4" /> Add New Customer
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}

      {/* Create */}
      <CustomerFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSave={handleCreate}
        isSaving={isCreating}
        checkDuplicate={checkDuplicate}
        onSelectExisting={id => { setSelectedId(id); setCreateOpen(false); }}
      />

      {/* Edit */}
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

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirmId} onOpenChange={open => { if (!open) setDeleteConfirmId(null); }}>
        <DialogContent className="max-w-sm rounded-2xl p-0 gap-0">
          <div className="px-5 py-4 border-b border-border/50">
            <DialogTitle className="text-base font-semibold">Delete Customer?</DialogTitle>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              This permanently deletes the customer record, including all transactions and conversation history. This action cannot be undone.
            </p>
          </div>
          <div className="px-5 py-4 border-t border-border/50 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={isDeleting}
            >
              {isDeleting
                ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                : <Trash2 className="h-3.5 w-3.5 mr-1.5" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
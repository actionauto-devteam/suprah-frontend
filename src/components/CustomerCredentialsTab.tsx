"use client";

import * as React from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Search, Plus, User, Mail, Phone, Car, MessageSquare,
  Receipt, ChevronRight, X, Edit2, Trash2, Check,
  ArrowLeft, RefreshCw, Tag, Calendar, Clock,
  Building2, AlertCircle, Loader2, Send, FileText,
  Shield, Zap, Users, TrendingUp,
  CheckCircle2, AlertTriangle, Activity,
  ArrowUpRight, Hash, MapPin, Inbox,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  useCustomers,
  Customer,
  CreateCustomerInput,
  DuplicateCheckResult,
} from "@/hooks/useCustomers";

// ─── Design tokens ────────────────────────────────────────────────────────────

const SOURCE_META: Record<string, { label: string; pill: string; dot: string }> = {
  lead: {
    label: "Lead",
    pill: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20",
    dot: "bg-cyan-500",
  },
  manual: {
    label: "Manual",
    pill: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20",
    dot: "bg-violet-500",
  },
  booking: {
    label: "Booking",
    pill: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  import: {
    label: "Import",
    pill: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    dot: "bg-amber-500",
  },
};

const TX_STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  active: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  failed: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

const TX_ICONS: Record<string, React.ReactNode> = {
  lead: <User className="h-3.5 w-3.5" />,
  appointment: <Calendar className="h-3.5 w-3.5" />,
  purchase: <Receipt className="h-3.5 w-3.5" />,
  quote: <FileText className="h-3.5 w-3.5" />,
  inquiry: <MessageSquare className="h-3.5 w-3.5" />,
  other: <Tag className="h-3.5 w-3.5" />,
};

// ─── Avatar ───────────────────────────────────────────────────────────────────

const GRADIENTS = [
  ["#06b6d4", "#0e7490"],
  ["#8b5cf6", "#6d28d9"],
  ["#10b981", "#047857"],
  ["#f59e0b", "#b45309"],
  ["#ec4899", "#be185d"],
  ["#3b82f6", "#1d4ed8"],
  ["#f97316", "#c2410c"],
  ["#14b8a6", "#0f766e"],
];

function getGradient(id: string): [string, string] {
  const i = id.split("").reduce((s, c) => s + c.charCodeAt(0), 0) % GRADIENTS.length;
  return GRADIENTS[i] as [string, string];
}

function CustomerAvatar({ customer, size = 38 }: { customer: Customer; size?: number }) {
  const [g1, g2] = getGradient(customer._id);
  const initials = `${customer.firstName?.[0] ?? ""}${customer.lastName?.[0] ?? ""}`.toUpperCase() || "?";
  return (
    <div
      style={{
        width: size, height: size,
        borderRadius: Math.round(size * 0.28),
        background: `linear-gradient(140deg, ${g1}, ${g2})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "white", fontWeight: 700,
        fontSize: Math.round(size * 0.36),
        flexShrink: 0, letterSpacing: "-0.03em",
        boxShadow: `0 2px 8px ${g2}55`,
      }}
    >
      {initials}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, accent, sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 rounded-2xl border border-border/60 bg-card hover:border-border hover:shadow-sm transition-all duration-200">
      <div className={`flex items-center justify-center h-9 w-9 rounded-xl ${accent} shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums tracking-tight leading-none text-foreground">{value}</p>
        <p className="text-xs font-medium text-muted-foreground mt-1">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Duplicate warning ────────────────────────────────────────────────────────

function DuplicateWarning({ result, onViewExisting }: {
  result: DuplicateCheckResult;
  onViewExisting?: () => void;
}) {
  const labels: Record<string, string> = {
    email_and_phone: "same email & phone number",
    email_only: "same email address",
    phone_only: "same phone number",
  };
  if (!result.isDuplicate) return null;
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-300/50 bg-amber-50 dark:bg-amber-950/25 dark:border-amber-700/40">
      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Duplicate detected</p>
        <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
          A customer with the {labels[result.matchType ?? "email_only"]} already exists
          {result.existingCustomer && (
            <> — <strong className="font-semibold">{result.existingCustomer.firstName} {result.existingCustomer.lastName}</strong></>
          )}.
        </p>
      </div>
      {onViewExisting && (
        <button
          onClick={onViewExisting}
          className="shrink-0 text-xs font-semibold text-amber-700 dark:text-amber-300 underline underline-offset-2 hover:no-underline"
        >
          View →
        </button>
      )}
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function FieldWrap({ label, required, children, suffix }: {
  label: string; required?: boolean; children: React.ReactNode; suffix?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </Label>
      <div className="relative">
        {children}
        {suffix && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">{suffix}</div>
        )}
      </div>
    </div>
  );
}

// ─── Customer form modal ──────────────────────────────────────────────────────

const BLANK: CreateCustomerInput = {
  firstName: "", lastName: "", email: "", phone: "",
  alternatePhone: "", notes: "", tags: [],
  preferredContactMethod: "email",
  vehicleInterest: { year: "", make: "", model: "", condition: "used", budget: "" },
  address: { street: "", city: "", state: "", postalCode: "", country: "" },
};

function CustomerFormModal({
  open, onOpenChange, initial, onSave, isSaving, checkDuplicate, onSelectExisting,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  initial?: Partial<Customer>; onSave: (data: CreateCustomerInput) => Promise<void>;
  isSaving: boolean;
  checkDuplicate?: (email: string, phone: string, excludeId?: string) => Promise<DuplicateCheckResult>;
  onSelectExisting?: (id: string) => void;
}) {
  const [form, setForm] = React.useState<CreateCustomerInput>({ ...BLANK });
  const [error, setError] = React.useState("");
  const [dupResult, setDupResult] = React.useState<DuplicateCheckResult | null>(null);
  const [isCheckingDup, setIsCheckingDup] = React.useState(false);
  const [tab, setTab] = React.useState("personal");
  const dupTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (open) {
      setForm(initial ? { ...BLANK, ...initial } : { ...BLANK });
      setError(""); setDupResult(null); setTab("personal");
    }
  }, [open, initial]);

  const set = (k: keyof CreateCustomerInput, v: any) => setForm(p => ({ ...p, [k]: v }));
  const setVehicle = (k: string, v: string) => setForm(p => ({ ...p, vehicleInterest: { ...p.vehicleInterest, [k]: v } }));
  const setAddr = (k: string, v: string) => setForm(p => ({ ...p, address: { ...p.address, [k]: v } }));

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
    }, 550);
  }, [checkDuplicate, initial]);

  const handleEmailChange = (v: string) => { set("email", v); triggerDupCheck(v, form.phone); };
  const handlePhoneChange = (v: string) => { set("phone", v); triggerDupCheck(form.email, v); };

  const handleSubmit = async () => {
    setError("");
    if (!form.firstName.trim() || !form.email.trim() || !form.phone.trim()) {
      setError("First name, email, and phone are required."); return;
    }
    try { await onSave(form); onOpenChange(false); }
    catch (e: any) { setError(e?.response?.data?.message || "Failed to save customer."); }
  };

  const isEditing = !!initial?._id;
  const TABS = ["personal", "address", "vehicle"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden rounded-2xl border border-border/60 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/20">
          <div>
            <DialogTitle className="text-[15px] font-bold tracking-tight">
              {isEditing ? "Edit Customer" : "New Customer"}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEditing ? "Update record details" : "Duplicate detection runs automatically"}
            </p>
          </div>
          <div className="flex gap-1">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 h-7 rounded-lg text-xs font-bold capitalize transition-all ${
                  tab === t ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto max-h-[62vh] px-6 py-5 space-y-4">
          {error && (
            <Alert variant="destructive" className="py-2.5 rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
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

          {/* Personal */}
          {tab === "personal" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FieldWrap label="First Name" required>
                  <Input value={form.firstName} onChange={e => set("firstName", e.target.value)} placeholder="Jane" className="h-9 text-sm" />
                </FieldWrap>
                <FieldWrap label="Last Name">
                  <Input value={form.lastName} onChange={e => set("lastName", e.target.value)} placeholder="Doe" className="h-9 text-sm" />
                </FieldWrap>
              </div>
              <FieldWrap label="Email" required
                suffix={isCheckingDup
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  : dupResult?.isDuplicate
                    ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    : (dupResult && !dupResult.isDuplicate && form.email)
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      : null}>
                <Input type="email" value={form.email}
                  onChange={e => handleEmailChange(e.target.value)}
                  placeholder="jane@example.com"
                  className={`h-9 text-sm pr-9 ${dupResult?.isDuplicate ? "border-amber-400 focus-visible:ring-amber-300/30" : ""}`} />
              </FieldWrap>
              <FieldWrap label="Phone" required
                suffix={dupResult?.isDuplicate ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> : null}>
                <Input value={form.phone} onChange={e => handlePhoneChange(e.target.value)}
                  placeholder="+1 555 000 0000"
                  className={`h-9 text-sm pr-9 ${dupResult?.isDuplicate ? "border-amber-400 focus-visible:ring-amber-300/30" : ""}`} />
              </FieldWrap>
              <div className="grid grid-cols-2 gap-3">
                <FieldWrap label="Alternate Phone">
                  <Input value={form.alternatePhone} onChange={e => set("alternatePhone", e.target.value)} className="h-9 text-sm" placeholder="+1 555..." />
                </FieldWrap>
                <FieldWrap label="Preferred Contact">
                  <Select value={form.preferredContactMethod} onValueChange={v => set("preferredContactMethod", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldWrap>
              </div>
              <FieldWrap label="Notes">
                <Textarea value={form.notes} onChange={e => set("notes", e.target.value)}
                  placeholder="Additional notes…" rows={3} className="resize-none text-sm" />
              </FieldWrap>
            </div>
          )}

          {/* Address */}
          {tab === "address" && (
            <div className="space-y-3">
              <FieldWrap label="Street">
                <Input value={form.address?.street} onChange={e => setAddr("street", e.target.value)} placeholder="123 Main St" className="h-9 text-sm" />
              </FieldWrap>
              <div className="grid grid-cols-2 gap-3">
                <FieldWrap label="City"><Input value={form.address?.city} onChange={e => setAddr("city", e.target.value)} className="h-9 text-sm" /></FieldWrap>
                <FieldWrap label="State"><Input value={form.address?.state} onChange={e => setAddr("state", e.target.value)} className="h-9 text-sm" /></FieldWrap>
                <FieldWrap label="Postal Code"><Input value={form.address?.postalCode} onChange={e => setAddr("postalCode", e.target.value)} className="h-9 text-sm" /></FieldWrap>
                <FieldWrap label="Country"><Input value={form.address?.country} onChange={e => setAddr("country", e.target.value)} className="h-9 text-sm" /></FieldWrap>
              </div>
            </div>
          )}

          {/* Vehicle */}
          {tab === "vehicle" && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <FieldWrap label="Year"><Input value={form.vehicleInterest?.year} onChange={e => setVehicle("year", e.target.value)} placeholder="2024" className="h-9 text-sm" /></FieldWrap>
                <FieldWrap label="Make"><Input value={form.vehicleInterest?.make} onChange={e => setVehicle("make", e.target.value)} placeholder="Toyota" className="h-9 text-sm" /></FieldWrap>
                <FieldWrap label="Model"><Input value={form.vehicleInterest?.model} onChange={e => setVehicle("model", e.target.value)} placeholder="Camry" className="h-9 text-sm" /></FieldWrap>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FieldWrap label="Condition">
                  <Select value={form.vehicleInterest?.condition} onValueChange={v => setVehicle("condition", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="used">Used</SelectItem>
                      <SelectItem value="certified">Certified Pre-Owned</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldWrap>
                <FieldWrap label="Budget"><Input value={form.vehicleInterest?.budget} onChange={e => setVehicle("budget", e.target.value)} placeholder="$30,000" className="h-9 text-sm" /></FieldWrap>
              </div>
              <FieldWrap label="VIN (optional)">
                <Input value={form.vehicleInterest?.vin} onChange={e => setVehicle("vin", e.target.value)} placeholder="1HGBH41JXMN109186" className="h-9 text-sm font-mono" />
              </FieldWrap>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/50 bg-muted/10 flex items-center justify-between">
          {dupResult?.isDuplicate && !isEditing ? (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium">
              <AlertTriangle className="h-3.5 w-3.5" />
              Will link to existing record
            </p>
          ) : <div />}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 rounded-lg" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" className="h-8 rounded-lg px-4" onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
              {isEditing ? "Save Changes" : "Create Customer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Log conversation modal ───────────────────────────────────────────────────

function LogConversationModal({ open, onOpenChange, onLog, isSaving }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  onLog: (data: any) => Promise<void>; isSaving: boolean;
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
        <div className="px-5 py-4 border-b border-border/50 bg-muted/20">
          <DialogTitle className="text-[15px] font-bold">Log Conversation</DialogTitle>
        </div>
        <div className="px-5 py-4 space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <FieldWrap label="Channel">
              <Select value={form.channel} onValueChange={v => setForm(p => ({ ...p, channel: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["email", "sms", "phone", "in-person", "chat", "other"].map(c => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldWrap>
            <FieldWrap label="Direction">
              <Select value={form.direction} onValueChange={v => setForm(p => ({ ...p, direction: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbound">← Inbound</SelectItem>
                  <SelectItem value="outbound">→ Outbound</SelectItem>
                </SelectContent>
              </Select>
            </FieldWrap>
          </div>
          <FieldWrap label="Subject (optional)">
            <Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
              placeholder="Re: Your inquiry…" className="h-9 text-sm" />
          </FieldWrap>
          <FieldWrap label="Message" required>
            <Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
              placeholder="Conversation content or notes…" rows={4} className="resize-none text-sm" />
          </FieldWrap>
        </div>
        <div className="px-5 py-4 border-t border-border/50 flex justify-end gap-2">
          <Button variant="outline" size="sm" className="h-8 rounded-lg" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" className="h-8 rounded-lg" onClick={handleSubmit} disabled={isSaving || !form.content.trim()}>
            {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
            Log
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Customer detail panel ────────────────────────────────────────────────────

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
      {icon} {label}
    </div>
  );
}

function ContactRow({ icon, href, children }: { icon: React.ReactNode; href?: string; children: React.ReactNode }) {
  const cls = "flex items-center gap-2.5 text-sm group";
  const inner = (
    <>
      <div className="h-6 w-6 rounded-md bg-muted/50 flex items-center justify-center shrink-0 text-muted-foreground">{icon}</div>
      <span className={href ? "truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors" : "truncate text-muted-foreground"}>{children}</span>
    </>
  );
  return href ? <a href={href} className={cls}>{inner}</a> : <div className={cls}>{inner}</div>;
}

function EmptyState({ icon, label, children }: { icon: React.ReactNode; label: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="h-12 w-12 rounded-2xl border-2 border-dashed border-border/60 flex items-center justify-center mb-3 text-muted-foreground/30">{icon}</div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function CustomerDetail({ customer, onBack, onEdit, onDelete, onConversationLog, isSavingConv }: {
  customer: Customer; onBack: () => void; onEdit: () => void; onDelete: () => void;
  onConversationLog: (data: any) => Promise<void>; isSavingConv: boolean;
}) {
  const [convOpen, setConvOpen] = React.useState(false);
  const [tab, setTab] = React.useState("overview");

  const sortedConvs = [...(customer.conversations ?? [])].sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  const sortedTxs = [...(customer.transactions ?? [])].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  const src = SOURCE_META[customer.source] ?? SOURCE_META.manual;

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/50 flex items-center gap-3 shrink-0 bg-muted/10">
          <button onClick={onBack}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted/70 transition-colors text-muted-foreground hover:text-foreground shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <CustomerAvatar customer={customer} size={42} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-[15px] truncate tracking-tight">{customer.firstName} {customer.lastName}</h2>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${src.pill}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${src.dot}`} /> {src.label}
              </span>
              {!customer.isActive && (
                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">Inactive</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{customer.email}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onEdit} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"><Edit2 className="h-3.5 w-3.5" /></button>
            <button onClick={onDelete} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-muted-foreground hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 shrink-0 border-b border-border/50 divide-x divide-border/50">
          {[
            { label: "Transactions", v: customer.stats?.totalTransactions ?? 0, icon: <Receipt className="h-3.5 w-3.5" /> },
            { label: "Conversations", v: customer.stats?.totalConversations ?? 0, icon: <MessageSquare className="h-3.5 w-3.5" /> },
            { label: "Appointments", v: customer.stats?.totalAppointments ?? 0, icon: <Calendar className="h-3.5 w-3.5" /> },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center justify-center py-3.5 gap-1">
              <span className="text-muted-foreground/50">{s.icon}</span>
              <p className="text-xl font-bold leading-none tabular-nums">{s.v}</p>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tab nav */}
        <div className="flex gap-0.5 px-5 pt-3 shrink-0 border-b border-border/50">
          {[
            { id: "overview", label: "Overview" },
            { id: "transactions", label: "Transactions", count: sortedTxs.length },
            { id: "conversations", label: "Conversations", count: sortedConvs.length },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 pb-3 text-xs font-bold border-b-2 transition-all -mb-px ${
                tab === t.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                  tab === t.id ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                }`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {tab === "overview" && (
            <div className="px-5 py-5 space-y-5">
              <section>
                <SectionHeader icon={<User className="h-3 w-3" />} label="Contact" />
                <div className="mt-3 space-y-2">
                  <ContactRow icon={<Mail className="h-3.5 w-3.5" />} href={`mailto:${customer.email}`}>{customer.email}</ContactRow>
                  <ContactRow icon={<Phone className="h-3.5 w-3.5" />} href={`tel:${customer.phone}`}>{customer.phone}</ContactRow>
                  {customer.alternatePhone && (
                    <ContactRow icon={<Phone className="h-3.5 w-3.5" />}>
                      {customer.alternatePhone} <span className="text-muted-foreground/60 ml-1">(alternate)</span>
                    </ContactRow>
                  )}
                  {customer.address?.city && (
                    <ContactRow icon={<MapPin className="h-3.5 w-3.5" />}>
                      {[customer.address.city, customer.address.state, customer.address.country].filter(Boolean).join(", ")}
                    </ContactRow>
                  )}
                </div>
              </section>

              {customer.vehicleInterest?.make && (
                <>
                  <Separator />
                  <section>
                    <SectionHeader icon={<Car className="h-3 w-3" />} label="Vehicle Interest" />
                    <div className="mt-3 flex items-center gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/50">
                      <div className="h-9 w-9 rounded-xl bg-card flex items-center justify-center shadow-sm border border-border/50 shrink-0">
                        <Car className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{[customer.vehicleInterest.year, customer.vehicleInterest.make, customer.vehicleInterest.model].filter(Boolean).join(" ")}</p>
                        <p className="text-xs text-muted-foreground capitalize mt-0.5">{customer.vehicleInterest.condition ?? "used"}{customer.vehicleInterest.budget ? ` · ${customer.vehicleInterest.budget}` : ""}</p>
                      </div>
                    </div>
                  </section>
                </>
              )}

              {customer.notes && (
                <>
                  <Separator />
                  <section>
                    <SectionHeader icon={<FileText className="h-3 w-3" />} label="Notes" />
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{customer.notes}</p>
                  </section>
                </>
              )}

              <Separator />
              <section>
                <SectionHeader icon={<Activity className="h-3 w-3" />} label="Activity Timeline" />
                <div className="mt-2 space-y-2 text-xs text-muted-foreground">
                  {customer.stats?.firstContactedAt && (
                    <div className="flex items-center gap-1.5"><Clock className="h-3 w-3 shrink-0 opacity-50" /> First contact: {format(new Date(customer.stats.firstContactedAt), "PPP")}</div>
                  )}
                  {customer.stats?.lastContactedAt && (
                    <div className="flex items-center gap-1.5"><RefreshCw className="h-3 w-3 shrink-0 opacity-50" /> Last contact: {formatDistanceToNow(new Date(customer.stats.lastContactedAt), { addSuffix: true })}</div>
                  )}
                  <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3 shrink-0 opacity-50" /> Added: {format(new Date(customer.createdAt), "PPP")}</div>
                </div>
              </section>
            </div>
          )}

          {tab === "transactions" && (
            <div className="px-5 py-5">
              {sortedTxs.length === 0 ? <EmptyState icon={<Receipt className="h-6 w-6" />} label="No transactions yet" /> : (
                <div className="space-y-2">
                  {sortedTxs.map(tx => (
                    <div key={tx._id} className="flex items-start gap-3 p-3.5 rounded-xl border border-border/50 hover:border-border/80 bg-card transition-all">
                      <div className="h-7 w-7 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 text-muted-foreground mt-0.5">
                        {TX_ICONS[tx.type] ?? <Tag className="h-3.5 w-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold truncate">{tx.title}</p>
                          <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-bold capitalize ${TX_STATUS_STYLE[tx.status]}`}>{tx.status}</span>
                        </div>
                        {tx.description && <p className="text-xs text-muted-foreground truncate">{tx.description}</p>}
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                          {formatDistanceToNow(new Date(tx.occurredAt), { addSuffix: true })}
                          {tx.amount ? ` · ${tx.currency ?? "$"}${tx.amount.toLocaleString()}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "conversations" && (
            <div className="px-5 py-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold">{sortedConvs.length} conversation{sortedConvs.length !== 1 ? "s" : ""}</p>
                <button onClick={() => setConvOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 h-7 rounded-lg border border-border/60 text-xs font-semibold hover:bg-muted/50 hover:border-border transition-all">
                  <Plus className="h-3 w-3" /> Log
                </button>
              </div>
              {sortedConvs.length === 0 ? (
                <EmptyState icon={<MessageSquare className="h-6 w-6" />} label="No conversations yet">
                  <button onClick={() => setConvOpen(true)} className="mt-3 text-xs font-semibold underline underline-offset-2 hover:no-underline text-muted-foreground">
                    Log first conversation
                  </button>
                </EmptyState>
              ) : (
                <div className="space-y-2.5">
                  {sortedConvs.map(conv => (
                    <div key={conv._id}
                      className={`p-3.5 rounded-xl border text-sm ${conv.direction === "inbound"
                        ? "border-sky-200/60 bg-sky-50/50 dark:bg-sky-900/10 dark:border-sky-800/40"
                        : "border-emerald-200/60 bg-emerald-50/50 dark:bg-emerald-900/10 dark:border-emerald-800/40"}`}>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold ${conv.direction === "inbound" ? "text-sky-600 dark:text-sky-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                            {conv.direction === "inbound" ? "← INBOUND" : "→ OUTBOUND"}
                          </span>
                          <span className="text-[10px] text-muted-foreground/70 capitalize px-1.5 py-0.5 rounded bg-white/60 dark:bg-black/20 border border-border/30">{conv.channel}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{formatDistanceToNow(new Date(conv.sentAt), { addSuffix: true })}</span>
                      </div>
                      {conv.subject && <p className="text-xs font-semibold mb-1 text-foreground/80">{conv.subject}</p>}
                      <p className="text-xs text-foreground/70 leading-relaxed whitespace-pre-wrap">{conv.content}</p>
                      {conv.senderName && <p className="text-[10px] text-muted-foreground mt-1.5">by {conv.senderName}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <LogConversationModal open={convOpen} onOpenChange={setConvOpen} onLog={onConversationLog} isSaving={isSavingConv} />
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

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
    page, limit: 20,
    search: debouncedSearch,
    source: sourceFilter !== "all" ? sourceFilter : undefined,
    sortBy: "createdAt", sortOrder: "desc",
  });

  // Fetch full detail on select
  React.useEffect(() => {
    if (!selectedId) { setDetailCustomer(null); return; }
    let cancelled = false;
    fetchCustomer(selectedId).then(c => { if (!cancelled) setDetailCustomer(c); }).catch(() => { if (!cancelled) setDetailCustomer(null); });
    return () => { cancelled = true; };
  }, [selectedId, fetchCustomer]);

  const handleCreate = async (data: CreateCustomerInput) => { await createCustomer(data); refetch(); };

  const handleUpdate = async (data: CreateCustomerInput) => {
    if (!editTarget) return;
    await updateCustomer({ id: editTarget._id, data });
    if (selectedId === editTarget._id) { const fresh = await fetchCustomer(editTarget._id); setDetailCustomer(fresh); }
    setEditTarget(null); refetch();
  };

  const handleDelete = async (id: string) => {
    await deleteCustomer(id);
    if (selectedId === id) { setSelectedId(null); setDetailCustomer(null); }
    setDeleteConfirmId(null); refetch();
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

  const SOURCE_FILTERS = [
    { value: "all", label: "All" },
    { value: "lead", label: "Leads", dot: SOURCE_META.lead.dot },
    { value: "manual", label: "Manual", dot: SOURCE_META.manual.dot },
    { value: "booking", label: "Booking", dot: SOURCE_META.booking.dot },
    { value: "import", label: "Import", dot: SOURCE_META.import.dot },
  ];

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 640 }}>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        <StatCard icon={<Hash className="h-4 w-4 text-slate-500 dark:text-slate-400" />} label="Total Customers" value={stats?.total ?? 0} accent="bg-slate-100 dark:bg-slate-800" />
        <StatCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />} label="Active" value={stats?.active ?? 0} accent="bg-emerald-100 dark:bg-emerald-900/40" />
        <StatCard icon={<Inbox className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />} label="From Leads" value={stats?.fromLeads ?? 0} accent="bg-cyan-100 dark:bg-cyan-900/40" />
        <StatCard icon={<User className="h-4 w-4 text-violet-600 dark:text-violet-400" />} label="Manual Entries" value={stats?.manual ?? 0} accent="bg-violet-100 dark:bg-violet-900/40" />
        <StatCard icon={<TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />} label="Added (30d)" value={stats?.recentlyAdded ?? 0} sub="last 30 days" accent="bg-amber-100 dark:bg-amber-900/40" />
      </div>

      {/* Live sync banner */}
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-emerald-200/70 bg-gradient-to-r from-emerald-50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/10 dark:border-emerald-800/40 mb-5">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <p className="text-xs text-emerald-700/90 dark:text-emerald-400/80">
          <strong className="font-bold">Auto-sync active</strong> — New leads are instantly created as customer records. Duplicate detection (email, phone, or both) prevents redundant entries.
        </p>
      </div>

      {/* Layout */}
      <div className="flex flex-1 min-h-0 gap-4">

        {/* List */}
        <div className={`flex flex-col ${selectedId ? "hidden lg:flex" : "flex"} w-full lg:w-[360px] xl:w-[400px] shrink-0`}>

          {/* Search + Add */}
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Name, email, phone…"
                className="pl-9 h-9 text-sm bg-background rounded-xl border-border/60 focus-visible:ring-2 focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50"
              />
              {search && (
                <button onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Button size="sm" className="h-9 px-3 rounded-xl shrink-0 gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline text-sm font-semibold">Add</span>
            </Button>
          </div>

          {/* Source filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 mb-3">
            {SOURCE_FILTERS.map(f => (
              <button key={f.value} onClick={() => { setSourceFilter(f.value); setPage(1); }}
                className={`flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                  sourceFilter === f.value ? "bg-foreground text-background shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}>
                {f.dot && <span className={`h-1.5 w-1.5 rounded-full ${f.dot}`} />}
                {f.label}
              </button>
            ))}
          </div>

          {/* Result count */}
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-medium text-muted-foreground">
              <span className="text-foreground font-bold tabular-nums">{total.toLocaleString()}</span> customer{total !== 1 ? "s" : ""}
              {debouncedSearch && <> for <em className="not-italic text-foreground">"{debouncedSearch}"</em></>}
            </p>
            <button onClick={() => refetch()}
              className="h-6 w-6 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-3 py-2 rounded-xl">
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
              <div className="flex flex-col items-center justify-center py-16">
                <div className="h-14 w-14 rounded-2xl border-2 border-dashed border-border/60 flex items-center justify-center mb-4 bg-muted/20">
                  <User className="h-6 w-6 text-muted-foreground/25" />
                </div>
                <p className="text-sm font-semibold">{debouncedSearch ? "No results found" : "No customers yet"}</p>
                <p className="text-xs text-muted-foreground mt-1 text-center max-w-[200px]">
                  {debouncedSearch ? "Try a different search term" : "Leads are auto-synced, or add one manually"}
                </p>
                {!debouncedSearch && (
                  <button onClick={() => setCreateOpen(true)}
                    className="mt-4 flex items-center gap-1.5 px-4 h-8 rounded-xl border border-border text-xs font-semibold hover:bg-muted/50 transition-colors">
                    <Plus className="h-3.5 w-3.5" /> Add Customer
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-1.5 pb-2">
                {customers.map((c: Customer) => {
                  const src = SOURCE_META[c.source] ?? SOURCE_META.manual;
                  return (
                    <button key={c._id} onClick={() => setSelectedId(c._id)}
                      className={`w-full text-left rounded-xl border p-3 transition-all group ${
                        selectedId === c._id
                          ? "border-cyan-500/50 bg-cyan-50/50 dark:bg-cyan-900/15 shadow-sm ring-1 ring-cyan-500/20"
                          : "border-border/40 hover:border-border/70 hover:bg-muted/20 bg-card"
                      }`}>
                      <div className="flex items-center gap-3">
                        <CustomerAvatar customer={c} size={38} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="text-sm font-semibold truncate leading-tight">{c.firstName} {c.lastName}</p>
                            <span className={`shrink-0 inline-flex items-center gap-0.5 px-1.5 h-4 rounded-full text-[9px] font-bold ${src.pill}`}>
                              <span className={`h-1 w-1 rounded-full ${src.dot}`} /> {src.label}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">{c.email}</p>
                          <p className="text-[10px] text-muted-foreground/50 mt-0.5 tabular-nums">{c.phone}</p>
                        </div>
                        <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${selectedId === c._id ? "text-cyan-500 translate-x-0.5" : "text-muted-foreground/30 group-hover:text-muted-foreground group-hover:translate-x-0.5"}`} />
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
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 h-7 rounded-lg border border-border/50 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted/50 transition-colors">
                ← Prev
              </button>
              <span className="text-xs font-medium text-muted-foreground tabular-nums">{page} / {pages}</span>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                className="px-3 h-7 rounded-lg border border-border/50 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted/50 transition-colors">
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Detail */}
        <div className={`flex-1 min-w-0 border border-border/50 rounded-2xl overflow-hidden bg-card ${selectedId ? "flex" : "hidden lg:flex"} flex-col shadow-sm`}>
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
                <div className="h-20 w-20 rounded-3xl border-2 border-dashed border-border/60 flex items-center justify-center bg-muted/10">
                  <Users className="h-8 w-8 text-muted-foreground/20" />
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 h-7 w-7 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-lg">
                  <Shield className="h-3.5 w-3.5 text-white" />
                </div>
              </div>
              <div className="space-y-1.5 max-w-[260px]">
                <p className="text-base font-bold tracking-tight">Select a customer</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Click any record to view their full profile, transaction history, and conversations.
                </p>
              </div>
              <button onClick={() => setCreateOpen(true)}
                className="flex items-center gap-2 px-5 h-9 rounded-xl border border-border text-sm font-semibold hover:bg-muted/50 transition-colors">
                <Plus className="h-4 w-4" /> Add New Customer
              </button>

              {/* Duplicate detection info */}
              <div className="mt-2 w-full max-w-xs bg-muted/30 rounded-xl border border-border/40 p-4 text-left space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">
                  Duplicate Detection Rules
                </p>
                {[
                  { icon: "📧📱", rule: "Same email + same phone → blocked" },
                  { icon: "📱", rule: "Same phone number only → blocked" },
                  { icon: "📧", rule: "Same email address only → blocked" },
                ].map(r => (
                  <div key={r.rule} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                    <span className="text-base leading-none shrink-0">{r.icon}</span>
                    {r.rule}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CustomerFormModal
        open={createOpen} onOpenChange={setCreateOpen}
        onSave={handleCreate} isSaving={isCreating}
        checkDuplicate={checkDuplicate}
        onSelectExisting={id => { setSelectedId(id); setCreateOpen(false); }}
      />

      {editTarget && (
        <CustomerFormModal
          open={!!editTarget} onOpenChange={open => { if (!open) setEditTarget(null); }}
          initial={editTarget} onSave={handleUpdate} isSaving={isUpdating}
          checkDuplicate={checkDuplicate}
        />
      )}

      <Dialog open={!!deleteConfirmId} onOpenChange={open => { if (!open) setDeleteConfirmId(null); }}>
        <DialogContent className="max-w-sm rounded-2xl p-0 gap-0">
          <div className="px-5 py-4 border-b border-border/50">
            <DialogTitle className="text-[15px] font-bold">Delete Customer?</DialogTitle>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              This permanently deletes the customer record, including all transactions and conversations.{" "}
              <strong className="text-foreground font-semibold">This cannot be undone.</strong>
            </p>
          </div>
          <div className="px-5 py-4 border-t border-border/50 flex justify-end gap-2">
            <Button variant="outline" size="sm" className="h-8 rounded-lg" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" className="h-8 rounded-lg"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1.5" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
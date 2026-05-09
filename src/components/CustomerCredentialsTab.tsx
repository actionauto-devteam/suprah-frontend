"use client";

import * as React from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Search, Plus, User, Mail, Phone, Car, MessageSquare,
  Receipt, ChevronRight, X, Edit2, Trash2, Check,
  ArrowLeft, RefreshCw, Tag, Calendar, Clock,
  Building2, AlertCircle, Loader2, Send, FileText,
  Shield, Zap, Users, TrendingUp, Filter, Inbox,
  CheckCircle2, AlertTriangle, Info, ArrowUpRight,
  MapPin, Activity, Package, Download,
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

// ─── Constants ────────────────────────────────────────────────────────────────

const SOURCE_CONFIG: Record<string, { label: string; color: string; dot: string; icon: React.ReactNode }> = {
  lead: {
    label: "Lead",
    color: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    dot: "bg-sky-500",
    icon: <Inbox className="h-3.5 w-3.5" />
  },
  manual: {
    label: "Manual",
    color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    dot: "bg-violet-500",
    icon: <User className="h-3.5 w-3.5" />
  },
  booking: {
    label: "Booking",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
    icon: <Calendar className="h-3.5 w-3.5" />
  },
  import: {
    label: "Import",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    dot: "bg-amber-500",
    icon: <Download className="h-3.5 w-3.5" />
  },
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

// ─── Avatar Utilities ─────────────────────────────────────────────────────────

function avatarInitials(c: Customer) {
  return `${c.firstName?.[0] ?? ""}${c.lastName?.[0] ?? ""}`.toUpperCase() || "??";
}

const AVATAR_GRADIENTS = [
  ["#10b981", "#059669"],
  ["#3b82f6", "#2563eb"],
  ["#8b5cf6", "#7c3aed"],
  ["#f59e0b", "#d97706"],
  ["#06b6d4", "#0891b2"],
  ["#ec4899", "#db2777"],
  ["#f97316", "#ea580c"],
  ["#14b8a6", "#0d9488"],
];

function avatarGradient(id: string): [string, string] {
  const idx = id.split("").reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[idx] as [string, string];
}

function Avatar({ customer, size = 40 }: { customer: Customer; size?: number }) {
  const [from, to] = avatarGradient(customer._id);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.25,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontWeight: 700,
        fontSize: size * 0.35,
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
    <div className="flex items-start gap-3 p-4 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/50">
      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          Potential Duplicate
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
          A customer with {labels[result.matchType ?? "email_only"]} already exists
          {result.existingCustomer && (
            <> — <strong>{result.existingCustomer.firstName} {result.existingCustomer.lastName}</strong></>
          )}
        </p>
      </div>
      {onViewExisting && result.existingCustomer && (
        <button
          onClick={onViewExisting}
          className="text-xs font-medium text-amber-700 dark:text-amber-300 underline whitespace-nowrap hover:no-underline"
        >
          View
        </button>
      )}
    </div>
  );
}

// ─── Modern Stat Card ─────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, trend, accent, description,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  trend?: { value: number; isPositive: boolean };
  accent: string;
  description?: string;
}) {
  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent dark:via-slate-800 opacity-0 group-hover:opacity-20 rounded-2xl transition-opacity" />
      <div className="relative flex flex-col h-full p-5 rounded-2xl border border-border/50 bg-card hover:border-border/80 shadow-sm transition-all">
        <div className="flex items-start justify-between mb-4">
          <div className={`flex items-center justify-center h-10 w-10 rounded-lg ${accent}`}>
            {icon}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-semibold ${
              trend.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            }`}>
              <ArrowUpRight className={`h-3 w-3 ${!trend.isPositive && "rotate-180"}`} />
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-1">
          {label}
        </p>
        <p className="text-3xl font-bold text-foreground leading-none">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {description && (
          <p className="text-[10px] text-muted-foreground/60 mt-2">{description}</p>
        )}
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

  const triggerDupCheck = React.useCallback(
    (email: string, phone: string) => {
      if (!checkDuplicate || initial?._id) return;
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
        <div className="px-6 py-5 border-b border-border/50 bg-gradient-to-r from-foreground/5 to-transparent">
          <DialogTitle className="text-lg font-bold">
            {isEditing ? "✏️ Edit Customer" : "➕ Add New Customer"}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {isEditing
              ? "Update the customer's information. Duplicate detection is automatic."
              : "Fill in the details below. We'll automatically check for duplicates."}
          </p>
        </div>

        <div className="overflow-y-auto max-h-[70vh] px-6 py-5 space-y-5">
          {error && (
            <Alert variant="destructive" className="py-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm ml-2">{error}</AlertDescription>
            </Alert>
          )}

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

          <section className="space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
              <User className="h-3.5 w-3.5" />
              Personal Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">First Name <span className="text-red-500">*</span></Label>
                <Input
                  value={form.firstName}
                  onChange={e => set("firstName", e.target.value)}
                  placeholder="John"
                  className="h-10 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Last Name</Label>
                <Input
                  value={form.lastName}
                  onChange={e => set("lastName", e.target.value)}
                  placeholder="Doe"
                  className="h-10 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  Email <span className="text-red-500">*</span>
                  {isCheckingDup && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                </Label>
                <div className="relative">
                  <Input
                    type="email"
                    value={form.email}
                    onChange={e => handleEmailChange(e.target.value)}
                    placeholder="john@example.com"
                    className={`h-10 pr-9 rounded-lg ${dupResult?.isDuplicate ? "border-amber-400 focus-visible:ring-amber-400/30" : ""}`}
                  />
                  {dupResult?.isDuplicate && form.email && (
                    <AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
                  )}
                  {dupResult && !dupResult.isDuplicate && form.email && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Phone <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    value={form.phone}
                    onChange={e => handlePhoneChange(e.target.value)}
                    placeholder="+1 555 000 0000"
                    className={`h-10 pr-9 rounded-lg ${dupResult?.isDuplicate ? "border-amber-400 focus-visible:ring-amber-400/30" : ""}`}
                  />
                  {dupResult?.isDuplicate && form.phone && (
                    <AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Alternate Phone</Label>
                <Input
                  value={form.alternatePhone}
                  onChange={e => set("alternatePhone", e.target.value)}
                  placeholder="(optional)"
                  className="h-10 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Preferred Contact</Label>
                <Select value={form.preferredContactMethod} onValueChange={v => set("preferredContactMethod", v)}>
                  <SelectTrigger className="h-10 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">📧 Email</SelectItem>
                    <SelectItem value="phone">☎️ Phone</SelectItem>
                    <SelectItem value="sms">💬 SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <Separator className="my-2" />

          <section className="space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
              Address
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label className="text-xs font-semibold">Street Address</Label>
                <Input
                  value={form.address?.street}
                  onChange={e => setAddr("street", e.target.value)}
                  placeholder="123 Main Street"
                  className="h-10 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">City</Label>
                <Input
                  value={form.address?.city}
                  onChange={e => setAddr("city", e.target.value)}
                  placeholder="New York"
                  className="h-10 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">State</Label>
                <Input
                  value={form.address?.state}
                  onChange={e => setAddr("state", e.target.value)}
                  placeholder="NY"
                  className="h-10 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Postal Code</Label>
                <Input
                  value={form.address?.postalCode}
                  onChange={e => setAddr("postalCode", e.target.value)}
                  placeholder="10001"
                  className="h-10 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Country</Label>
                <Input
                  value={form.address?.country}
                  onChange={e => setAddr("country", e.target.value)}
                  placeholder="United States"
                  className="h-10 rounded-lg"
                />
              </div>
            </div>
          </section>

          <Separator className="my-2" />

          <section className="space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
              <Car className="h-3.5 w-3.5" />
              Vehicle Interest
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Year</Label>
                <Input
                  value={form.vehicleInterest?.year}
                  onChange={e => setVehicle("year", e.target.value)}
                  placeholder="2024"
                  className="h-10 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Make</Label>
                <Input
                  value={form.vehicleInterest?.make}
                  onChange={e => setVehicle("make", e.target.value)}
                  placeholder="Toyota"
                  className="h-10 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Model</Label>
                <Input
                  value={form.vehicleInterest?.model}
                  onChange={e => setVehicle("model", e.target.value)}
                  placeholder="Camry"
                  className="h-10 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Condition</Label>
                <Select value={form.vehicleInterest?.condition} onValueChange={v => setVehicle("condition", v)}>
                  <SelectTrigger className="h-10 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">✨ New</SelectItem>
                    <SelectItem value="used">🔄 Used</SelectItem>
                    <SelectItem value="certified">🏆 Certified Pre-Owned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-xs font-semibold">Budget</Label>
                <Input
                  value={form.vehicleInterest?.budget}
                  onChange={e => setVehicle("budget", e.target.value)}
                  placeholder="e.g., $30,000"
                  className="h-10 rounded-lg"
                />
              </div>
            </div>
          </section>

          <Separator className="my-2" />

          <section className="space-y-2">
            <Label className="text-xs font-semibold">Notes</Label>
            <Textarea
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              placeholder="Add any relevant notes about this customer…"
              rows={3}
              className="resize-none text-sm rounded-lg"
            />
          </section>
        </div>

        <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between bg-muted/20">
          {dupResult?.isDuplicate && !isEditing ? (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              This customer already exists
            </p>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} disabled={isSaving}>
              {isSaving && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
              {isEditing ? "Save Changes" : "Add Customer"}
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
        <div className="px-6 py-5 border-b border-border/50 bg-gradient-to-r from-foreground/5 to-transparent">
          <DialogTitle className="text-lg font-bold">💬 Log Conversation</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">Record a communication with this customer</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Channel</Label>
              <Select value={form.channel} onValueChange={v => setForm(p => ({ ...p, channel: v }))}>
                <SelectTrigger className="h-10 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">📧 Email</SelectItem>
                  <SelectItem value="sms">💬 SMS</SelectItem>
                  <SelectItem value="phone">☎️ Phone</SelectItem>
                  <SelectItem value="in-person">👥 In-Person</SelectItem>
                  <SelectItem value="chat">💬 Chat</SelectItem>
                  <SelectItem value="other">🔄 Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Direction</Label>
              <Select value={form.direction} onValueChange={v => setForm(p => ({ ...p, direction: v }))}>
                <SelectTrigger className="h-10 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbound">← Inbound</SelectItem>
                  <SelectItem value="outbound">→ Outbound</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Subject (optional)</Label>
            <Input
              value={form.subject}
              onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
              placeholder="e.g., Inquiry Response"
              className="h-10 rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Message <span className="text-red-500">*</span></Label>
            <Textarea
              value={form.content}
              onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
              placeholder="What was discussed…"
              rows={4}
              className="resize-none text-sm rounded-lg"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border/50 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSaving || !form.content.trim()}>
            {isSaving && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
            Save Conversation
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
      <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border/50 flex items-center gap-4 bg-card/50 backdrop-blur-sm">
          <button
            onClick={onBack}
            className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Avatar customer={customer} size={44} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-base">
                {customer.firstName} {customer.lastName}
              </h2>
              <div className="flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${src.color}`}>
                  {src.icon}
                  {src.label}
                </span>
                {!customer.isActive && (
                  <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    Inactive
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{customer.email} • {customer.phone}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onEdit}
              title="Edit customer"
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={onDelete}
              title="Delete customer"
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-muted-foreground hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-1 border-b border-border/50 px-6 py-4 bg-card/30">
          {[
            { icon: <Receipt className="h-4 w-4" />, label: "Transactions", value: customer.stats?.totalTransactions ?? 0 },
            { icon: <MessageSquare className="h-4 w-4" />, label: "Conversations", value: customer.stats?.totalConversations ?? 0 },
            { icon: <Calendar className="h-4 w-4" />, label: "Appointments", value: customer.stats?.totalAppointments ?? 0 },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-muted-foreground">{s.icon}</span>
                <p className="text-lg font-bold text-foreground">{s.value}</p>
              </div>
              <p className="text-[10px] text-muted-foreground/70">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
          <TabsList className="mx-6 mt-4 mb-0 justify-start h-9 bg-muted/40 w-auto shrink-0 gap-1 rounded-lg">
            <TabsTrigger value="overview" className="text-xs h-8 px-3 rounded-md">Overview</TabsTrigger>
            <TabsTrigger value="transactions" className="text-xs h-8 px-3 rounded-md">
              Transactions ({sortedTxs.length})
            </TabsTrigger>
            <TabsTrigger value="conversations" className="text-xs h-8 px-3 rounded-md">
              Conversations ({sortedConvs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="flex-1 overflow-auto px-6 py-4 space-y-5">
            {/* Contact Section */}
            <section>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-3 flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                Contact Information
              </p>
              <div className="space-y-2">
                <a href={`mailto:${customer.email}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/60 transition-colors group">
                  <Mail className="h-4 w-4 text-muted-foreground group-hover:text-emerald-600" />
                  <span className="text-sm group-hover:text-emerald-600 transition-colors truncate">{customer.email}</span>
                </a>
                <a href={`tel:${customer.phone}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/60 transition-colors group">
                  <Phone className="h-4 w-4 text-muted-foreground group-hover:text-emerald-600" />
                  <span className="text-sm group-hover:text-emerald-600 transition-colors">{customer.phone}</span>
                </a>
                {customer.alternatePhone && (
                  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{customer.alternatePhone} <span className="text-xs">(alt)</span></span>
                  </div>
                )}
                {customer.address?.city && (
                  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
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
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-3 flex items-center gap-2">
                    <Car className="h-3.5 w-3.5" />
                    Vehicle Interest
                  </p>
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200/50 dark:border-blue-800/50">
                    <div className="h-10 w-10 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                      <Car className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">
                        {[customer.vehicleInterest.year, customer.vehicleInterest.make, customer.vehicleInterest.model]
                          .filter(Boolean).join(" ")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
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
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-2 flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5" />
                    Notes
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap p-3 bg-muted/30 rounded-lg">{customer.notes}</p>
                </section>
              </>
            )}

            <Separator />
            <section>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-3 flex items-center gap-2">
                <Activity className="h-3.5 w-3.5" />
                Activity Timeline
              </p>
              <div className="space-y-2 text-xs text-muted-foreground">
                {customer.stats?.firstContactedAt && (
                  <p className="flex items-center gap-2 p-2 rounded-lg bg-muted/20">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    First contact: <strong className="text-foreground">{format(new Date(customer.stats.firstContactedAt), "MMM d, yyyy")}</strong>
                  </p>
                )}
                {customer.stats?.lastContactedAt && (
                  <p className="flex items-center gap-2 p-2 rounded-lg bg-muted/20">
                    <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                    Last contact: <strong className="text-foreground">{formatDistanceToNow(new Date(customer.stats.lastContactedAt), { addSuffix: true })}</strong>
                  </p>
                )}
                <p className="flex items-center gap-2 p-2 rounded-lg bg-muted/20">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  Added: <strong className="text-foreground">{format(new Date(customer.createdAt), "MMM d, yyyy")}</strong>
                </p>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="transactions" className="flex-1 overflow-auto px-6 py-4">
            {sortedTxs.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No transactions recorded yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedTxs.map(tx => (
                  <div
                    key={tx._id}
                    className="flex items-start gap-3 p-3.5 rounded-xl border border-border/50 hover:border-border/80 bg-card transition-all"
                  >
                    <div className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 text-muted-foreground">
                      {TX_ICONS[tx.type] ?? <Tag className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold truncate">{tx.title}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold capitalize ${TX_STATUS[tx.status]}`}>
                          {tx.status}
                        </span>
                      </div>
                      {tx.description && <p className="text-xs text-muted-foreground truncate">{tx.description}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(tx.occurredAt), { addSuffix: true })}
                        {tx.amount ? ` · ${tx.currency ?? "$"}${tx.amount.toLocaleString()}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="conversations" className="flex-1 overflow-auto px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold">{sortedConvs.length} conversations</p>
              <button
                onClick={() => setConvOpen(true)}
                className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-border/50 text-xs font-semibold hover:bg-muted/50 transition-all"
              >
                <Plus className="h-3.5 w-3.5" /> Log
              </button>
            </div>

            {sortedConvs.length === 0 ? (
              <div className="text-center py-10">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
                <button
                  onClick={() => setConvOpen(true)}
                  className="mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400 underline hover:no-underline"
                >
                  Log first conversation
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedConvs.map(conv => (
                  <div
                    key={conv._id}
                    className={`p-4 rounded-xl border text-sm ${
                      conv.direction === "inbound"
                        ? "border-sky-200/60 bg-gradient-to-br from-sky-50/70 to-sky-100/30 dark:from-sky-950/20 dark:to-sky-900/10 dark:border-sky-800/40"
                        : "border-emerald-200/60 bg-gradient-to-br from-emerald-50/70 to-emerald-100/30 dark:from-emerald-950/20 dark:to-emerald-900/10 dark:border-emerald-800/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold ${
                          conv.direction === "inbound" ? "text-sky-600 dark:text-sky-400" : "text-emerald-600 dark:text-emerald-400"
                        }`}>
                          {conv.direction === "inbound" ? "📥 INBOUND" : "📤 OUTBOUND"}
                        </span>
                        <span className="text-[10px] text-muted-foreground/70 capitalize px-2 py-0.5 rounded bg-white/60 dark:bg-black/20 border border-border/30">
                          {conv.channel}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground/70 shrink-0">
                        {formatDistanceToNow(new Date(conv.sentAt), { addSuffix: true })}
                      </span>
                    </div>
                    {conv.subject && <p className="text-xs font-semibold mb-1">{conv.subject}</p>}
                    <p className="text-xs leading-relaxed whitespace-pre-wrap">{conv.content}</p>
                    {conv.senderName && (
                      <p className="text-[10px] text-muted-foreground/70 mt-2 pt-2 border-t border-current/10">by {conv.senderName}</p>
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
    { value: "all", label: "All Sources", count: stats?.total },
    { value: "lead", label: "Leads", count: stats?.fromLeads },
    { value: "manual", label: "Manual", count: stats?.manual },
    { value: "booking", label: "Bookings", count: stats?.recentlyAdded },
  ];

  return (
    <div className="flex flex-col h-full gap-6" style={{ minHeight: 640 }}>
      {/* ── Header + Auto-Sync Info ─────────────────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Customer Credentials</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your customer database with automatic lead synchronization</p>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-2xl border border-emerald-200/60 bg-gradient-to-r from-emerald-50/60 to-emerald-50/30 dark:from-emerald-950/30 dark:to-emerald-950/10 dark:border-emerald-800/40">
          <RefreshCw className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0 animate-pulse" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">
              ✨ Automatic Synchronization Active
            </p>
            <p className="text-xs text-emerald-800/70 dark:text-emerald-400/70 mt-1">
              All new leads are automatically processed and added to your customer database. Smart duplicate detection prevents redundant entries.
            </p>
          </div>
        </div>
      </div>

      {/* ── Stats Grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard
          icon={<Users className="h-5 w-5 text-slate-600 dark:text-slate-300" />}
          label="Total Customers"
          value={stats?.total ?? 0}
          accent="bg-slate-100 dark:bg-slate-900/40"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
          label="Active"
          value={stats?.active ?? 0}
          trend={{ value: (((stats?.active ?? 0) / (stats?.total ?? 1)) * 100), isPositive: true }}
          accent="bg-emerald-100 dark:bg-emerald-900/40"
          description="Active profiles"
        />
        <StatCard
          icon={<Inbox className="h-5 w-5 text-sky-600 dark:text-sky-400" />}
          label="From Leads"
          value={stats?.fromLeads ?? 0}
          accent="bg-sky-100 dark:bg-sky-900/40"
          description="Auto-synced"
        />
        <StatCard
          icon={<User className="h-5 w-5 text-violet-600 dark:text-violet-400" />}
          label="Manual Entry"
          value={stats?.manual ?? 0}
          accent="bg-violet-100 dark:bg-violet-900/40"
          description="Manually created"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
          label="This Month"
          value={stats?.recentlyAdded ?? 0}
          accent="bg-amber-100 dark:bg-amber-900/40"
          description="Last 30 days"
        />
      </div>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 gap-4">
        {/* Left: Customer List */}
        <div className={`flex flex-col ${selectedId ? "hidden lg:flex" : "flex"} w-full lg:w-[380px] xl:w-[420px] shrink-0`}>
          {/* Search */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, email, phone…"
                  className="pl-9 h-10 text-sm rounded-lg border-border/50"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button
                size="sm"
                className="h-10 px-4 gap-2 shrink-0 rounded-lg"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add</span>
              </Button>
            </div>

            {/* Source Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1">
              {sourceOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setSourceFilter(opt.value); setPage(1); }}
                  className={`flex items-center gap-2 px-3 h-8 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                    sourceFilter === opt.value
                      ? "bg-foreground text-background shadow-md"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {opt.value !== "all" && (
                    <span className={`h-2 w-2 rounded-full ${SOURCE_CONFIG[opt.value]?.dot ?? "bg-gray-400"}`} />
                  )}
                  {opt.label}
                  {opt.count !== undefined && (
                    <span className={`ml-1 px-1.5 h-5 rounded-full flex items-center ${
                      sourceFilter === opt.value
                        ? "bg-background/20"
                        : "bg-muted/40"
                    } text-[10px] font-bold`}>
                      {opt.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Result Info */}
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-xs font-medium text-muted-foreground/70">
              <strong className="text-foreground">{total.toLocaleString()}</strong> {total === 1 ? "customer" : "customers"}
              {debouncedSearch && <> matching <em>"{debouncedSearch}"</em></>}
            </p>
            <button
              onClick={() => refetch()}
              className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
              title="Refresh"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-3 py-2.5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs ml-2">Failed to load customers.</AlertDescription>
            </Alert>
          )}

          {/* Customer List */}
          <ScrollArea className="flex-1 -mx-1 px-1">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Loading customers…</p>
              </div>
            ) : customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-center">
                <div className="h-14 w-14 rounded-2xl border-2 border-dashed border-border flex items-center justify-center mb-3">
                  <User className="h-6 w-6 opacity-30" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {debouncedSearch ? "No results found" : "No customers yet"}
                </p>
                <p className="text-xs mt-1 max-w-[200px]">
                  {debouncedSearch
                    ? "Try a different search"
                    : "Leads auto-sync here or add manually"}
                </p>
                {!debouncedSearch && (
                  <button
                    onClick={() => setCreateOpen(true)}
                    className="mt-4 flex items-center gap-1.5 px-3 h-8 rounded-lg border border-border text-xs font-semibold hover:bg-muted transition-colors"
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
                      className={`w-full text-left rounded-xl border p-3.5 transition-all group ${
                        selectedId === c._id
                          ? "border-emerald-500/40 bg-gradient-to-r from-emerald-50/80 to-emerald-50/40 dark:from-emerald-950/40 dark:to-emerald-950/20 shadow-md"
                          : "border-border/40 hover:border-border/70 hover:bg-muted/40 bg-card"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar customer={c} size={40} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <p className="text-sm font-bold truncate leading-tight">
                              {c.firstName} {c.lastName}
                            </p>
                            <span className={`inline-flex items-center gap-1 shrink-0 px-1.5 h-5 rounded-full text-[9px] font-bold ${src.color}`}>
                              {src.icon}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">{c.email}</p>
                          <p className="text-[9px] text-muted-foreground/60 mt-0.5">{c.phone}</p>
                        </div>
                        <ChevronRight className={`h-5 w-5 shrink-0 transition-all text-muted-foreground/30 ${
                          selectedId === c._id ? "text-emerald-500 translate-x-0.5" : "group-hover:text-muted-foreground"
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
            <div className="flex items-center justify-between pt-4 mt-2 border-t border-border/40">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground font-medium tabular-nums">
                {page} of {pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
              >
                Next
              </Button>
            </div>
          )}
        </div>

        {/* Right: Detail Panel */}
        <div className={`flex-1 min-w-0 border border-border/50 rounded-2xl overflow-hidden bg-card ${
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
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center p-10">
              <div className="relative">
                <div className="h-20 w-20 rounded-3xl border-2 border-dashed border-border flex items-center justify-center bg-muted/20">
                  <User className="h-9 w-9 text-muted-foreground/25" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md">
                  <Shield className="h-3.5 w-3.5 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-lg font-bold">Select a customer</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Choose a customer record from the list to view their complete profile, history, and interactions
                </p>
              </div>
              <Button onClick={() => setCreateOpen(true)} className="gap-2 mt-2">
                <Plus className="h-4 w-4" />
                Add New Customer
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}

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
        <DialogContent className="max-w-sm rounded-2xl p-0 gap-0">
          <div className="px-6 py-5 border-b border-border/50 bg-gradient-to-r from-red-50/50 to-transparent dark:from-red-950/30">
            <DialogTitle className="text-lg font-bold">🗑️ Delete Customer?</DialogTitle>
          </div>
          <div className="px-6 py-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              This permanently removes the customer record, including all transactions and conversation history. <strong>This cannot be undone.</strong>
            </p>
          </div>
          <div className="px-6 py-4 border-t border-border/50 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
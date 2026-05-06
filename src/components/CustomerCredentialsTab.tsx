"use client"

import * as React from "react"
import { format, formatDistanceToNow } from "date-fns"
import {
  Search, Plus, User, Mail, Phone, Car, MessageSquare,
  Receipt, ChevronRight, X, Edit2, Trash2, Check,
  ArrowLeft, RefreshCw, Tag, Calendar, Clock,
  Building2, SlidersHorizontal, AlertCircle, Loader2,
  Send, FileText,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  useCustomers,
  Customer,
  CreateCustomerInput,
} from "@/hooks/useCustomers"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SOURCE_COLORS: Record<string, string> = {
  lead: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  manual: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  booking: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  import: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
}

const TX_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  active: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  failed: "bg-gray-100 text-gray-600",
}

const TX_TYPE_ICONS: Record<string, React.ReactNode> = {
  lead: <User className="h-3.5 w-3.5" />,
  appointment: <Calendar className="h-3.5 w-3.5" />,
  purchase: <Receipt className="h-3.5 w-3.5" />,
  quote: <FileText className="h-3.5 w-3.5" />,
  inquiry: <MessageSquare className="h-3.5 w-3.5" />,
  other: <Tag className="h-3.5 w-3.5" />,
}

function avatarInitials(c: Customer) {
  return `${c.firstName?.[0] ?? ""}${c.lastName?.[0] ?? ""}`.toUpperCase() || "??"
}

function avatarColor(id: string) {
  const palette = [
    "from-emerald-400 to-teal-600",
    "from-blue-400 to-indigo-600",
    "from-violet-400 to-purple-600",
    "from-rose-400 to-pink-600",
    "from-amber-400 to-orange-500",
    "from-cyan-400 to-sky-600",
  ]
  const idx = id.split("").reduce((s, c) => s + c.charCodeAt(0), 0) % palette.length
  return palette[idx]
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, color,
}: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <Card className="border border-border/40 shadow-sm">
      <CardContent className="pt-5 pb-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
        <p className={`text-3xl font-bold ${color ?? "text-foreground"}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

// ─── Create / Edit Modal ──────────────────────────────────────────────────────

interface CustomerFormProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: Partial<Customer>
  onSave: (data: CreateCustomerInput) => Promise<void>
  isSaving: boolean
}

function CustomerFormModal({ open, onOpenChange, initial, onSave, isSaving }: CustomerFormProps) {
  const empty: CreateCustomerInput = {
    firstName: "", lastName: "", email: "", phone: "",
    alternatePhone: "", notes: "", tags: [],
    preferredContactMethod: "email",
    vehicleInterest: { year: "", make: "", model: "", condition: "used" },
    address: { street: "", city: "", state: "", postalCode: "", country: "" },
  }

  const [form, setForm] = React.useState<CreateCustomerInput>(
    initial ? { ...empty, ...initial } : empty
  )
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    if (open) setForm(initial ? { ...empty, ...initial } : empty)
  }, [open, initial])

  const set = (key: keyof CreateCustomerInput, val: any) =>
    setForm(p => ({ ...p, [key]: val }))
  const setVehicle = (k: string, v: string) =>
    setForm(p => ({ ...p, vehicleInterest: { ...p.vehicleInterest, [k]: v } }))
  const setAddr = (k: string, v: string) =>
    setForm(p => ({ ...p, address: { ...p.address, [k]: v } }))

  const handleSubmit = async () => {
    setError("")
    if (!form.firstName.trim() || !form.email.trim() || !form.phone.trim()) {
      setError("First name, email, and phone are required."); return
    }
    try {
      await onSave(form)
      onOpenChange(false)
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to save customer.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
        <div className="max-h-[90vh] overflow-y-auto modal-scrollbar p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {initial?._id ? "Edit Customer" : "Add New Customer"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Personal */}
            <section>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Personal Information
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>First Name <span className="text-red-500">*</span></Label>
                  <Input value={form.firstName} onChange={e => set("firstName", e.target.value)} placeholder="Jane" />
                </div>
                <div className="space-y-1">
                  <Label>Last Name</Label>
                  <Input value={form.lastName} onChange={e => set("lastName", e.target.value)} placeholder="Doe" />
                </div>
                <div className="space-y-1">
                  <Label>Email <span className="text-red-500">*</span></Label>
                  <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="jane@example.com" />
                </div>
                <div className="space-y-1">
                  <Label>Phone <span className="text-red-500">*</span></Label>
                  <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+1 555 000 0000" />
                </div>
                <div className="space-y-1">
                  <Label>Alternate Phone</Label>
                  <Input value={form.alternatePhone} onChange={e => set("alternatePhone", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Preferred Contact</Label>
                  <Select value={form.preferredContactMethod} onValueChange={v => set("preferredContactMethod", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
            <section>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Address</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label>Street</Label>
                  <Input value={form.address?.street} onChange={e => setAddr("street", e.target.value)} placeholder="123 Main St" />
                </div>
                <div className="space-y-1">
                  <Label>City</Label>
                  <Input value={form.address?.city} onChange={e => setAddr("city", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>State</Label>
                  <Input value={form.address?.state} onChange={e => setAddr("state", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Postal Code</Label>
                  <Input value={form.address?.postalCode} onChange={e => setAddr("postalCode", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Country</Label>
                  <Input value={form.address?.country} onChange={e => setAddr("country", e.target.value)} />
                </div>
              </div>
            </section>

            <Separator />

            {/* Vehicle Interest */}
            <section>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Vehicle Interest</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Year</Label>
                  <Input value={form.vehicleInterest?.year} onChange={e => setVehicle("year", e.target.value)} placeholder="2024" />
                </div>
                <div className="space-y-1">
                  <Label>Make</Label>
                  <Input value={form.vehicleInterest?.make} onChange={e => setVehicle("make", e.target.value)} placeholder="Toyota" />
                </div>
                <div className="space-y-1">
                  <Label>Model</Label>
                  <Input value={form.vehicleInterest?.model} onChange={e => setVehicle("model", e.target.value)} placeholder="Camry" />
                </div>
                <div className="space-y-1">
                  <Label>Condition</Label>
                  <Select value={form.vehicleInterest?.condition} onValueChange={v => setVehicle("condition", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="used">Used</SelectItem>
                      <SelectItem value="certified">Certified Pre-Owned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Budget</Label>
                  <Input value={form.vehicleInterest?.budget} onChange={e => setVehicle("budget", e.target.value)} placeholder="$30,000" />
                </div>
              </div>
            </section>

            <Separator />

            {/* Notes */}
            <section>
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={e => set("notes", e.target.value)}
                placeholder="Any relevant notes about this customer…"
                rows={3}
                className="mt-1"
              />
            </section>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              {initial?._id ? "Save Changes" : "Create Customer"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Log Conversation Modal ───────────────────────────────────────────────────

function LogConversationModal({
  open, onOpenChange, onLog, isSaving,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onLog: (data: any) => Promise<void>
  isSaving: boolean
}) {
  const [form, setForm] = React.useState({
    channel: "email", direction: "outbound", senderType: "agent",
    senderName: "", content: "", subject: "",
  })

  const handleSubmit = async () => {
    if (!form.content.trim()) return
    await onLog(form)
    onOpenChange(false)
    setForm({ channel: "email", direction: "outbound", senderType: "agent", senderName: "", content: "", subject: "" })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Log Conversation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Channel</Label>
              <Select value={form.channel} onValueChange={v => setForm(p => ({ ...p, channel: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["email", "sms", "phone", "in-person", "chat", "other"].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Direction</Label>
              <Select value={form.direction} onValueChange={v => setForm(p => ({ ...p, direction: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbound">Inbound (from customer)</SelectItem>
                  <SelectItem value="outbound">Outbound (from agent)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Subject (optional)</Label>
            <Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Re: Your inquiry…" />
          </div>
          <div className="space-y-1">
            <Label>Message <span className="text-red-500">*</span></Label>
            <Textarea
              value={form.content}
              onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
              placeholder="Conversation content or notes…"
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving || !form.content.trim()}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Log Conversation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Customer Detail Panel ────────────────────────────────────────────────────

function CustomerDetail({
  customer,
  onBack,
  onEdit,
  onDelete,
  onConversationLog,
  isSavingConv,
}: {
  customer: Customer
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
  onConversationLog: (data: any) => Promise<void>
  isSavingConv: boolean
}) {
  const [convOpen, setConvOpen] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState("overview")

  const sortedConvs = [...(customer.conversations ?? [])].sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
  )
  const sortedTxs = [...(customer.transactions ?? [])].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  )

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-border/50 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div
            className={`h-10 w-10 rounded-xl bg-linear-to-br ${avatarColor(customer._id)} flex items-center justify-center text-white font-bold text-sm shrink-0`}
          >
            {avatarInitials(customer)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-base truncate">
              {customer.firstName} {customer.lastName}
            </h2>
            <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge className={`text-xs ${SOURCE_COLORS[customer.source]}`}>
              {customer.source}
            </Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 divide-x divide-border/50 border-b border-border/50 shrink-0">
          {[
            { label: "Transactions", value: customer.stats?.totalTransactions ?? 0 },
            { label: "Conversations", value: customer.stats?.totalConversations ?? 0 },
            { label: "Appointments", value: customer.stats?.totalAppointments ?? 0 },
          ].map(s => (
            <div key={s.label} className="text-center py-3">
              <p className="text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
          <TabsList className="mx-5 mt-3 mb-0 w-auto justify-start h-8 bg-muted/50 shrink-0">
            <TabsTrigger value="overview" className="text-xs h-7">Overview</TabsTrigger>
            <TabsTrigger value="transactions" className="text-xs h-7">
              Transactions
              {sortedTxs.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{sortedTxs.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="conversations" className="text-xs h-7">
              Conversations
              {sortedConvs.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{sortedConvs.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="flex-1 overflow-auto p-5 space-y-5 mt-2">
            {/* Contact */}
            <section>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contact</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{customer.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{customer.phone}</span>
                </div>
                {customer.alternatePhone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">{customer.alternatePhone} (alt)</span>
                  </div>
                )}
                {customer.address?.city && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>
                      {[customer.address.city, customer.address.state, customer.address.country]
                        .filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}
              </div>
            </section>

            {/* Vehicle interest */}
            {customer.vehicleInterest?.make && (
              <>
                <Separator />
                <section>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Vehicle Interest</p>
                  <div className="flex items-center gap-2 text-sm bg-muted/40 rounded-lg p-3">
                    <Car className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="font-medium">
                        {[customer.vehicleInterest.year, customer.vehicleInterest.make, customer.vehicleInterest.model]
                          .filter(Boolean).join(" ")}
                      </p>
                      {customer.vehicleInterest.condition && (
                        <p className="text-xs text-muted-foreground capitalize">
                          {customer.vehicleInterest.condition}
                          {customer.vehicleInterest.budget && ` · ${customer.vehicleInterest.budget}`}
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* Notes */}
            {customer.notes && (
              <>
                <Separator />
                <section>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes</p>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{customer.notes}</p>
                </section>
              </>
            )}

            {/* Meta */}
            <Separator />
            <section>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Activity</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                {customer.stats?.firstContactedAt && (
                  <p>First contact: {format(new Date(customer.stats.firstContactedAt), "PPP")}</p>
                )}
                {customer.stats?.lastContactedAt && (
                  <p>Last contact: {formatDistanceToNow(new Date(customer.stats.lastContactedAt), { addSuffix: true })}</p>
                )}
                <p>Added: {format(new Date(customer.createdAt), "PPP")}</p>
              </div>
            </section>
          </TabsContent>

          {/* Transactions */}
          <TabsContent value="transactions" className="flex-1 overflow-auto p-5 mt-2">
            {sortedTxs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Receipt className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedTxs.map(tx => (
                  <div key={tx._id} className="flex items-start gap-3 p-3 rounded-xl border border-border/50 hover:border-border transition-colors">
                    <div className="mt-0.5 h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                      {TX_TYPE_ICONS[tx.type] ?? <Tag className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium truncate">{tx.title}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${TX_STATUS_COLORS[tx.status]}`}>
                          {tx.status}
                        </span>
                      </div>
                      {tx.description && (
                        <p className="text-xs text-muted-foreground truncate">{tx.description}</p>
                      )}
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
          <TabsContent value="conversations" className="flex-1 overflow-auto p-5 mt-2">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium">{sortedConvs.length} conversations</p>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setConvOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Log
              </Button>
            </div>

            {sortedConvs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No conversations logged yet</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setConvOpen(true)}>
                  Log first conversation
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedConvs.map(conv => (
                  <div
                    key={conv._id}
                    className={`rounded-xl p-3 border ${conv.direction === "inbound"
                      ? "border-blue-200/60 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-800/40"
                      : "border-emerald-200/60 bg-emerald-50/50 dark:bg-emerald-900/10 dark:border-emerald-800/40"
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className="text-[10px] h-4 px-1.5 capitalize border-current/30"
                        >
                          {conv.channel}
                        </Badge>
                        <span className={`text-[10px] font-medium ${conv.direction === "inbound" ? "text-blue-600 dark:text-blue-400" : "text-emerald-600 dark:text-emerald-400"
                          }`}>
                          {conv.direction === "inbound" ? "← Inbound" : "→ Outbound"}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(conv.sentAt), { addSuffix: true })}
                      </p>
                    </div>
                    {conv.subject && (
                      <p className="text-xs font-medium mb-1 text-foreground/80">{conv.subject}</p>
                    )}
                    <p className="text-xs text-foreground/70 leading-relaxed whitespace-pre-wrap">{conv.content}</p>
                    {conv.senderName && (
                      <p className="text-[10px] text-muted-foreground mt-1">by {conv.senderName}</p>
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
  )
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export function CustomerCredentialsTab() {
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [sourceFilter, setSourceFilter] = React.useState("all")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<Customer | null>(null)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [detailCustomer, setDetailCustomer] = React.useState<Customer | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null)
  const [isSavingConv, setIsSavingConv] = React.useState(false)

  // Debounce search
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  const {
    customers, total, pages, stats,
    isLoading, error, refetch,
    fetchCustomer,
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
  })

  // Load full detail when selected
  React.useEffect(() => {
    if (!selectedId) { setDetailCustomer(null); return }
    fetchCustomer(selectedId).then(setDetailCustomer).catch(() => setDetailCustomer(null))
  }, [selectedId, fetchCustomer])

  const handleCreate = async (data: CreateCustomerInput) => {
    await createCustomer(data)
    refetch()
  }

  const handleUpdate = async (data: CreateCustomerInput) => {
    if (!editTarget) return
    await updateCustomer({ id: editTarget._id, data })
    if (selectedId === editTarget._id) {
      const fresh = await fetchCustomer(editTarget._id)
      setDetailCustomer(fresh)
    }
    setEditTarget(null)
    refetch()
  }

  const handleDelete = async (id: string) => {
    await deleteCustomer(id)
    if (selectedId === id) { setSelectedId(null); setDetailCustomer(null) }
    setDeleteConfirmId(null)
    refetch()
  }

  const handleLogConv = async (data: any) => {
    if (!selectedId) return
    setIsSavingConv(true)
    try {
      await addConversation({ customerId: selectedId, data })
      const fresh = await fetchCustomer(selectedId)
      setDetailCustomer(fresh)
    } finally {
      setIsSavingConv(false)
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 640 }}>
      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        <StatCard label="Total Customers" value={stats?.total ?? 0} />
        <StatCard label="Active" value={stats?.active ?? 0} color="text-emerald-600" />
        <StatCard label="From Leads" value={stats?.fromLeads ?? 0} color="text-blue-600" />
        <StatCard label="Manual" value={stats?.manual ?? 0} color="text-violet-600" />
        <StatCard label="Added (30d)" value={stats?.recentlyAdded ?? 0} sub="last 30 days" />
      </div>

      {/* ── Main layout ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 gap-4">
        {/* Left panel — list */}
        <div className={`flex flex-col ${selectedId ? "hidden lg:flex" : "flex"} w-full lg:w-95 xl:w-105 shrink-0`}>
          {/* Controls */}
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search name, email, phone…"
                className="pl-9 h-8 text-sm"
              />
              {search && (
                <button
                  onClick={() => { setSearch(""); setDebouncedSearch("") }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Select value={sourceFilter} onValueChange={v => { setSourceFilter(v); setPage(1) }}>
              <SelectTrigger className="h-8 w-28 text-xs">
                <SlidersHorizontal className="h-3 w-3 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="booking">Booking</SelectItem>
                <SelectItem value="import">Import</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="h-8 px-3 text-xs shrink-0" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          </div>

          {/* Count */}
          <p className="text-xs text-muted-foreground mb-2">
            {total.toLocaleString()} customer{total !== 1 ? "s" : ""}
          </p>

          {error && (
            <Alert variant="destructive" className="mb-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Failed to load customers.</AlertDescription>
            </Alert>
          )}

          {/* List */}
          <ScrollArea className="flex-1 -mx-1 px-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : customers.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <User className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">No customers found</p>
                <p className="text-xs mt-1">
                  {search ? "Try a different search" : "Add your first customer above"}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {customers.map(c => (
                  <button
                    key={c._id}
                    onClick={() => setSelectedId(c._id)}
                    className={`w-full text-left rounded-xl border transition-all p-3 group ${selectedId === c._id
                      ? "border-emerald-500/60 bg-emerald-50/60 dark:bg-emerald-900/20 shadow-sm"
                      : "border-border/40 hover:border-border hover:bg-muted/40"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-9 w-9 rounded-xl bg-linear-to-br ${avatarColor(c._id)} flex items-center justify-center text-white font-bold text-xs shrink-0`}
                      >
                        {avatarInitials(c)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <p className="text-sm font-semibold truncate">
                            {c.firstName} {c.lastName}
                          </p>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold capitalize ${SOURCE_COLORS[c.source]}`}>
                            {c.source}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                        <p className="text-[10px] text-muted-foreground/70">{c.phone}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between pt-3 mt-2 border-t border-border/40">
              <Button
                variant="outline" size="sm" className="h-7 text-xs"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                {page} / {pages}
              </span>
              <Button
                variant="outline" size="sm" className="h-7 text-xs"
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
              >
                Next
              </Button>
            </div>
          )}
        </div>

        {/* Right panel — detail */}
        <div className={`flex-1 min-w-0 border border-border/40 rounded-2xl overflow-hidden bg-card ${selectedId ? "flex" : "hidden lg:flex"} flex-col`}>
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
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
              <div className="h-20 w-20 rounded-2xl border-2 border-dashed border-border flex items-center justify-center">
                <User className="h-9 w-9 text-muted-foreground/30" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold text-foreground">Select a customer</p>
                <p className="text-sm text-muted-foreground">
                  Click any record to view their full profile
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add New Customer
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      {/* Create */}
      <CustomerFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSave={handleCreate}
        isSaving={isCreating}
      />

      {/* Edit */}
      {editTarget && (
        <CustomerFormModal
          open={!!editTarget}
          onOpenChange={open => { if (!open) setEditTarget(null) }}
          initial={editTarget}
          onSave={handleUpdate}
          isSaving={isUpdating}
        />
      )}

      {/* Delete confirm */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={open => { if (!open) setDeleteConfirmId(null) }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Customer?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            This will permanently delete the customer record including all transaction and
            conversation history. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
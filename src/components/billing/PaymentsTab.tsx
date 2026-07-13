"use client";

import * as React from "react";
import { Payment, PaymentStats, CreatePaymentData } from "@/types/billing";
import { formatCurrency } from "@/utils/format";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DollarSign, Clock, CheckCircle2, Plus, Loader2, Receipt,
  RefreshCw, Ban, ExternalLink, Search, MoreVertical, Send,
  ArrowUpDown, ArrowUp, ArrowDown, X,
} from "lucide-react";
import { StatusBadge, StatCard } from "@/components/billing/StatusBadges";

const DISPLAY = "'Rajdhani', var(--font-sans), sans-serif";
const MONO    = "'Share Tech Mono', 'Roboto Mono', monospace";
const ORANGE  = "#E55A00";
const BG      = "#0d0d10";
const SURFACE = "rgba(255,255,255,0.05)";
const BORDER  = "rgba(255,255,255,0.10)";

function SupraInput({ id, type = "text", placeholder, value, onChange, hasError }: {
  id: string; type?: string; placeholder?: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; hasError?: boolean;
}) {
  const [focus, setFocus] = React.useState(false);
  return (
    <input
      id={id} type={type} placeholder={placeholder} value={value} onChange={onChange}
      onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      style={{
        width: "100%", fontFamily: DISPLAY, fontSize: 13,
        background: SURFACE, border: `1px solid ${hasError ? "#EF4444" : focus ? ORANGE : BORDER}`,
        borderRadius: 8, padding: "8px 11px", color: "rgba(255,255,255,0.88)", outline: "none",
        boxShadow: focus ? "0 0 0 3px rgba(229,90,0,0.12)" : "none",
        transition: "border-color 0.14s, box-shadow 0.14s",
      }}
    />
  );
}

function SupraTextarea({ id, placeholder, value, onChange, rows = 2 }: {
  id: string; placeholder?: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; rows?: number;
}) {
  const [focus, setFocus] = React.useState(false);
  return (
    <textarea
      id={id} placeholder={placeholder} value={value} onChange={onChange} rows={rows}
      onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      style={{
        width: "100%", fontFamily: DISPLAY, fontSize: 13,
        background: SURFACE, border: `1px solid ${focus ? ORANGE : BORDER}`,
        borderRadius: 8, padding: "8px 11px", color: "rgba(255,255,255,0.88)",
        outline: "none", resize: "none",
        boxShadow: focus ? "0 0 0 3px rgba(229,90,0,0.12)" : "none",
        transition: "border-color 0.14s, box-shadow 0.14s",
      }}
    />
  );
}

function SupraLabel({ htmlFor, children, required }: {
  htmlFor: string; children: React.ReactNode; required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} style={{
      display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.11em",
      textTransform: "uppercase" as const, color: "rgba(255,255,255,0.28)",
      marginBottom: 6, fontFamily: DISPLAY,
    }}>
      {children}
      {required && <span style={{ color: ORANGE, marginLeft: 3 }}>*</span>}
    </label>
  );
}

function SupraBtn({ onClick, disabled, children }: {
  onClick?: () => void; disabled?: boolean; children: React.ReactNode;
}) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        position: "relative", overflow: "hidden",
        width: "100%", padding: "11px 14px", marginTop: 4, borderRadius: 8,
        background: hover && !disabled ? "#cf4f00" : ORANGE,
        border: "none", color: "white", fontSize: 14, fontWeight: 600,
        fontFamily: DISPLAY, letterSpacing: "0.04em",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1, transition: "background 0.14s",
      }}
    >
      {!disabled && (
        <span aria-hidden style={{
          position: "absolute", top: 0, bottom: 0, left: "-110%", width: "55%",
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
          transform: "skewX(-20deg)", animation: "supraSheen 3.2s ease-in-out infinite",
          pointerEvents: "none",
        }} />
      )}
      {children}
    </button>
  );
}

// ─── Supra dialog shell ───────────────────────────────────────────────────────
function SupraShell({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "relative", background: BG, borderRadius: 16, overflow: "hidden", fontFamily: DISPLAY }}>
      {/* Carbon */}
      <div aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: `
          repeating-linear-gradient(45deg, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0.018) 1px, transparent 1px, transparent 8px),
          repeating-linear-gradient(-45deg, rgba(255,255,255,0.013) 0px, rgba(255,255,255,0.013) 1px, transparent 1px, transparent 8px)
        `,
      }} />
      {/* Left stripe */}
      <div aria-hidden style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: ORANGE }} />
      {/* Top line */}
      <div aria-hidden style={{ position: "absolute", top: 0, left: 4, right: 0, height: 1, background: `linear-gradient(90deg, ${ORANGE}, rgba(229,90,0,0.24), transparent)` }} />
      {/* Close */}
      <button onClick={onClose} aria-label="Close" style={{
        position: "absolute", top: 11, right: 11, width: 28, height: 28, borderRadius: 6,
        background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
        display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 10,
      }}>
        <X style={{ width: 11, height: 11, color: "rgba(255,255,255,0.46)" }} />
      </button>
      <div style={{ position: "relative", padding: "20px 22px 22px 20px" }}>
        {children}
      </div>
    </div>
  );
}

// ─── Sort helpers ─────────────────────────────────────────────────────────────
type SortDir = "asc" | "desc" | null;
interface SortState { field: keyof Payment | null; dir: SortDir; }

function SortIcon({ field, sort }: { field: keyof Payment; sort: SortState }) {
  if (sort.field !== field) return <ArrowUpDown style={{ width: 10, height: 10, display: "inline", marginLeft: 4, opacity: 0.22 }} />;
  return sort.dir === "asc"
    ? <ArrowUp style={{ width: 10, height: 10, display: "inline", marginLeft: 4, color: ORANGE }} />
    : <ArrowDown style={{ width: 10, height: 10, display: "inline", marginLeft: 4, color: ORANGE }} />;
}

// ─── Props ─────────────────────────────────────────────────────────────────────
interface PaymentsTabProps {
  payments: Payment[]; stats: PaymentStats | null; isLoading: boolean;
  search: string; statusFilter: string;
  showCreateDialog: boolean; createForm: CreatePaymentData; isCreating: boolean;
  paymentDetailView: Payment | null;
  onSearch: (v: string) => void; onStatusFilter: (v: string) => void;
  onShowCreateDialog: (v: boolean) => void; onCreateFormChange: (form: CreatePaymentData) => void;
  onCreatePayment: () => void; onRequestPayment: (p: Payment) => void;
  onCancelPayment: (id: string) => void; onUpdateStatus: (id: string, status: Payment["status"]) => void;
  onRefresh: () => void; onViewDetail: (p: Payment | null) => void;
}

// ─── PaymentsTab ──────────────────────────────────────────────────────────────
export function PaymentsTab({
  payments, stats, isLoading, search, statusFilter, showCreateDialog, createForm,
  isCreating, paymentDetailView, onSearch, onStatusFilter, onShowCreateDialog,
  onCreateFormChange, onCreatePayment, onRequestPayment, onCancelPayment,
  onUpdateStatus, onRefresh, onViewDetail,
}: PaymentsTabProps) {
  const [sort, setSort] = React.useState<SortState>({ field: null, dir: null });
  const [selectFocus, setSelectFocus] = React.useState(false);
  const [searchFocus, setSearchFocus] = React.useState(false);

  const toggleSort = (field: keyof Payment) => {
    setSort(prev => {
      if (prev.field !== field) return { field, dir: "asc" };
      if (prev.dir === "asc") return { field, dir: "desc" };
      return { field: null, dir: null };
    });
  };

  const sorted = React.useMemo(() => {
    if (!sort.field || !sort.dir) return payments;
    return [...payments].sort((a, b) => {
      const va = a[sort.field!] as any;
      const vb = b[sort.field!] as any;
      const cmp = typeof va === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [payments, sort]);

  const statCards = [
    { label: "Total Revenue",   value: formatCurrency(stats?.totalRevenue ?? 0), icon: <DollarSign style={{ width: 15, height: 15, color: "#6EE7B7" }} /> },
    { label: "Pending Amount",  value: formatCurrency(stats?.pendingAmount ?? 0), icon: <Clock       style={{ width: 15, height: 15, color: "#FCD34D" }} /> },
    { label: "Completed",       value: String(stats?.byStatus?.succeeded?.count ?? 0), icon: <CheckCircle2 style={{ width: 15, height: 15, color: "#93C5FD" }} /> },
    { label: "Total Payments",  value: String(stats?.totalCount ?? 0),           icon: <Receipt      style={{ width: 15, height: 15, color: "#C4B5FD" }} /> },
  ];

  // Column headers for the table
  const SORTABLE_COLS: { label: string; field?: keyof Payment; right?: boolean }[] = [
    { label: "Invoice" },
    { label: "Customer",    field: "customerName" },
    { label: "Description" },
    { label: "Amount",      field: "amount" },
    { label: "Status",      field: "status" },
    { label: "Date",        field: "createdAt" },
    { label: "Actions",     right: true },
  ];

  const thStyle: React.CSSProperties = {
    padding: "10px 14px", fontSize: 10, fontWeight: 700, letterSpacing: "0.10em",
    textTransform: "uppercase", color: "rgba(255,255,255,0.32)",
    whiteSpace: "nowrap", borderBottom: "1px solid rgba(255,255,255,0.07)",
    cursor: "default",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Share+Tech+Mono&display=swap');
        @keyframes supraSheen  { 0%,62%{left:-110%} 100%{left:230%} }
        @keyframes supraSpin   { to{transform:rotate(360deg)} }
      `}</style>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
        {statCards.map(c => (
          <StatCard key={c.label} label={c.label} value={c.value} icon={c.icon} loading={isLoading} />
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 180px", maxWidth: 280 }}>
          <Search style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "rgba(255,255,255,0.30)" }} />
          <input
            placeholder="Search payments…"
            value={search} onChange={e => onSearch(e.target.value)}
            onFocus={() => setSearchFocus(true)} onBlur={() => setSearchFocus(false)}
            style={{
              width: "100%", paddingLeft: 28, padding: "8px 11px 8px 28px",
              fontFamily: DISPLAY, fontSize: 13,
              background: SURFACE, border: `1px solid ${searchFocus ? ORANGE : BORDER}`,
              borderRadius: 8, color: "rgba(255,255,255,0.80)", outline: "none",
              transition: "border-color 0.14s",
            }}
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter} onChange={e => onStatusFilter(e.target.value)}
          onFocus={() => setSelectFocus(true)} onBlur={() => setSelectFocus(false)}
          style={{
            fontFamily: DISPLAY, fontSize: 13, background: SURFACE,
            border: `1px solid ${selectFocus ? ORANGE : BORDER}`,
            borderRadius: 8, padding: "8px 11px", color: "rgba(255,255,255,0.72)", outline: "none",
            cursor: "pointer", flex: "0 0 auto",
          }}
        >
          {["all", "pending", "processing", "succeeded", "failed", "refunded", "cancelled"].map(s => (
            <option key={s} value={s} style={{ background: "#111116" }}>
              {s === "all" ? "All statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          style={{
            width: 36, height: 36, borderRadius: 8, background: SURFACE,
            border: `1px solid ${BORDER}`, display: "flex", alignItems: "center",
            justifyContent: "center", cursor: "pointer", flexShrink: 0,
          }}
        >
          <RefreshCw style={{ width: 14, height: 14, color: "rgba(255,255,255,0.55)", animation: isLoading ? "supraSpin 1s linear infinite" : "none" }} />
        </button>

        {/* Create */}
        <button
          onClick={() => onShowCreateDialog(true)}
          style={{
            position: "relative", overflow: "hidden",
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: 8,
            background: ORANGE, border: "none",
            color: "white", fontFamily: DISPLAY, fontSize: 13, fontWeight: 600,
            letterSpacing: "0.03em", cursor: "pointer", flexShrink: 0,
          }}
        >
          <span aria-hidden style={{
            position: "absolute", top: 0, bottom: 0, left: "-110%", width: "55%",
            background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.09),transparent)",
            transform: "skewX(-20deg)", animation: "supraSheen 3.2s ease-in-out infinite",
            pointerEvents: "none",
          }} />
          <Plus style={{ width: 13, height: 13 }} />
          Create payment
        </button>
      </div>

      {/* Table */}
      <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 580 }}>
            <thead>
              <tr style={{ background: "#111116" }}>
                {SORTABLE_COLS.map(({ label, field, right }) => (
                  <th
                    key={label}
                    onClick={() => field && toggleSort(field)}
                    style={{
                      ...thStyle,
                      textAlign: right ? "right" : "left",
                      cursor: field ? "pointer" : "default",
                    }}
                  >
                    {label}
                    {field && <SortIcon field={field} sort={sort} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} style={{ padding: "12px 14px" }}>
                          <div style={{ height: 12, width: 60, background: "rgba(255,255,255,0.07)", borderRadius: 4 }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : sorted.length === 0
                ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "3rem", fontFamily: DISPLAY, fontSize: 14, color: "rgba(255,255,255,0.28)" }}>
                        No payments found.
                      </td>
                    </tr>
                  )
                : sorted.map(p => (
                    <tr
                      key={p._id}
                      onClick={() => onViewDetail(p)}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", transition: "background 0.12s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.025)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "11px 14px", fontFamily: MONO, fontSize: 11, color: "rgba(229,90,0,0.65)" }}>
                        {p.invoiceNumber || "—"}
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <p style={{ fontFamily: DISPLAY, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)", margin: 0 }}>
                          {p.customerName}
                        </p>
                        <p style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.30)", margin: "2px 0 0" }}>
                          {p.customerEmail}
                        </p>
                      </td>
                      <td style={{ padding: "11px 14px", maxWidth: 180 }}>
                        <span style={{ fontFamily: DISPLAY, fontSize: 12, color: "rgba(255,255,255,0.42)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.description}
                        </span>
                      </td>
                      <td style={{ padding: "11px 14px", fontFamily: DISPLAY, fontSize: 13, fontWeight: 700, color: "#fff", whiteSpace: "nowrap" }}>
                        {formatCurrency(p.amount)}
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <StatusBadge status={p.status} />
                      </td>
                      <td style={{ padding: "11px 14px", fontFamily: MONO, fontSize: 11, color: "rgba(255,255,255,0.30)", whiteSpace: "nowrap" }}>
                        {new Date(p.createdAt).toLocaleDateString('en-US', { timeZone: 'America/Denver' })}
                      </td>
                      <td style={{ padding: "11px 14px", textAlign: "right" }} onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-7 text-[rgba(255,255,255,0.40)] hover:text-white hover:bg-[rgba(255,255,255,0.08)]">
                              <MoreVertical style={{ width: 14, height: 14 }} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 text-sm bg-[#1a1a20] border-[rgba(255,255,255,0.12)] text-white">
                            {(p.status === "pending" || p.status === "failed") && (
                              <DropdownMenuItem
                                className="focus:bg-[rgba(255,255,255,0.10)] focus:text-white"
                                onClick={() => onRequestPayment(p)}
                              >
                                <Send style={{ width: 13, height: 13, marginRight: 8 }} />
                                Request payment
                              </DropdownMenuItem>
                            )}
                            {p.status === "pending" && (
                              <DropdownMenuItem
                                className="text-red-400 focus:bg-[rgba(255,255,255,0.10)] focus:text-red-400"
                                onClick={() => onCancelPayment(p._id)}
                              >
                                <Ban style={{ width: 13, height: 13, marginRight: 8 }} />
                                Cancel payment
                              </DropdownMenuItem>
                            )}
                            {p.receiptUrl && (
                              <DropdownMenuItem className="focus:bg-[rgba(255,255,255,0.10)] focus:text-white" asChild>
                                <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink style={{ width: 13, height: 13, marginRight: 8 }} />
                                  View receipt
                                </a>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="bg-[rgba(255,255,255,0.10)]" />
                            <DropdownMenuLabel className="text-[11px] text-[rgba(255,255,255,0.28)] font-normal">
                              Change status
                            </DropdownMenuLabel>
                            {(["pending", "processing", "succeeded", "failed", "refunded", "cancelled"] as Payment["status"][]).map(s => (
                              <DropdownMenuItem
                                key={s} disabled={p.status === s}
                                onClick={() => onUpdateStatus(p._id, s)}
                                className={`capitalize text-sm focus:bg-[rgba(255,255,255,0.10)] focus:text-white ${p.status === s ? "font-semibold" : ""}`}
                              >
                                {p.status === s
                                  ? <CheckCircle2 style={{ width: 12, height: 12, marginRight: 8, color: ORANGE }} />
                                  : <span style={{ width: 12, marginRight: 8, display: "inline-block" }} />
                                }
                                {s}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Payment Dialog */}
      <CreatePaymentDialog
        open={showCreateDialog}
        form={createForm}
        isCreating={isCreating}
        onOpenChange={onShowCreateDialog}
        onFormChange={onCreateFormChange}
        onSubmit={onCreatePayment}
      />

      {/* Detail Modal */}
      <PaymentDetailModal payment={paymentDetailView} onClose={() => onViewDetail(null)} />
    </div>
  );
}

// ─── Create Payment Dialog ────────────────────────────────────────────────────
function CreatePaymentDialog({ open, form, isCreating, onOpenChange, onFormChange, onSubmit }: {
  open: boolean; form: CreatePaymentData; isCreating: boolean;
  onOpenChange: (v: boolean) => void; onFormChange: (f: CreatePaymentData) => void; onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!p-0 !border-0 !bg-transparent !shadow-none sm:max-w-md overflow-hidden rounded-2xl [&>button]:hidden w-[calc(100%-2rem)]">
        <SupraShell onClose={() => onOpenChange(false)}>
          <div style={{ paddingRight: 30, marginBottom: 18 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>Create Payment</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", marginTop: 3 }}>Add a new pending payment for a customer.</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <SupraLabel htmlFor="cp-name" required>Customer name</SupraLabel>
                <SupraInput id="cp-name" placeholder="Full name" value={form.customerName}
                  onChange={e => onFormChange({ ...form, customerName: e.target.value })} />
              </div>
              <div>
                <SupraLabel htmlFor="cp-email" required>Email</SupraLabel>
                <SupraInput id="cp-email" type="email" placeholder="john@example.com" value={form.customerEmail}
                  onChange={e => onFormChange({ ...form, customerEmail: e.target.value })} />
              </div>
              <div>
                <SupraLabel htmlFor="cp-amt" required>Amount (₱)</SupraLabel>
                <SupraInput id="cp-amt" type="number" placeholder="0.00"
                  value={form.amount ? String(form.amount) : ""}
                  onChange={e => onFormChange({ ...form, amount: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <SupraLabel htmlFor="cp-due">Due date</SupraLabel>
                <SupraInput id="cp-due" type="date" value={form.dueDate ?? ""}
                  onChange={e => onFormChange({ ...form, dueDate: e.target.value })} />
              </div>
            </div>
            <div>
              <SupraLabel htmlFor="cp-desc" required>Description</SupraLabel>
              <SupraInput id="cp-desc" placeholder="Logistics service Q2…" value={form.description}
                onChange={e => onFormChange({ ...form, description: e.target.value })} />
            </div>
            <div>
              <SupraLabel htmlFor="cp-notes">Notes</SupraLabel>
              <SupraTextarea id="cp-notes" placeholder="Optional notes…" value={form.notes ?? ""}
                onChange={e => onFormChange({ ...form, notes: e.target.value })} />
            </div>
            <SupraBtn
              onClick={onSubmit}
              disabled={isCreating || !form.customerName || !form.customerEmail || !form.amount || !form.description}
            >
              {isCreating
                ? <><Loader2 style={{ width: 14, height: 14, animation: "supraSpin 1s linear infinite" }} /> Creating…</>
                : <><Plus style={{ width: 14, height: 14 }} /> Create payment</>
              }
            </SupraBtn>
          </div>
        </SupraShell>
      </DialogContent>
    </Dialog>
  );
}

// ─── Payment Detail Modal ─────────────────────────────────────────────────────
function PaymentDetailModal({ payment, onClose }: { payment: Payment | null; onClose: () => void }) {
  if (!payment) return null;
  const fmt = (d?: string) => d
    ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Denver" })
    : "—";

  return (
    <Dialog open={!!payment} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="!p-0 !border-0 !bg-transparent !shadow-none sm:max-w-md overflow-hidden rounded-2xl [&>button]:hidden w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto">
        <SupraShell onClose={onClose}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, paddingRight: 30 }}>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>Payment Details</p>
              <p style={{ fontFamily: MONO, fontSize: 11, color: "rgba(229,90,0,0.60)", marginTop: 3, letterSpacing: "0.07em" }}>
                {payment.invoiceNumber || payment._id}
              </p>
            </div>
            <StatusBadge status={payment.status} />
          </div>

          {/* Amount */}
          <div style={{ background: "rgba(229,90,0,0.09)", border: "1px solid rgba(229,90,0,0.22)", borderRadius: 12, padding: "16px 20px", marginBottom: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "rgba(229,90,0,0.68)", marginBottom: 5, fontFamily: DISPLAY }}>
              Amount
            </p>
            <p style={{ fontFamily: DISPLAY, fontSize: 36, fontWeight: 700, color: ORANGE, letterSpacing: "-0.02em" }}>
              {formatCurrency(payment.amount)}
            </p>
            <p style={{ fontFamily: MONO, fontSize: 10, color: "rgba(229,90,0,0.50)", marginTop: 3, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
              {payment.currency}
            </p>
          </div>

          {/* Info rows */}
          {[
            { title: "Customer", rows: [
                { label: "Name",  value: payment.customerName },
                { label: "Email", value: payment.customerEmail },
                ...(payment.customerPhone ? [{ label: "Phone", value: payment.customerPhone }] : []),
              ]},
            { title: "Description", rows: [
                { label: "Details", value: payment.description },
                ...(payment.notes ? [{ label: "Notes", value: payment.notes }] : []),
              ]},
          ].map(section => (
            <div key={section.title} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, overflow: "hidden", marginBottom: 10 }}>
              {section.rows.map(({ label, value }, i) => (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                  padding: "9px 13px", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : undefined,
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.28)", fontFamily: DISPLAY, flexShrink: 0, marginRight: 12 }}>
                    {label}
                  </span>
                  <span style={{ fontFamily: DISPLAY, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.80)", textAlign: "right" }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          ))}

          {/* Dates */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            {[
              { label: "Created", value: fmt(payment.createdAt) },
              ...(payment.dueDate ? [{ label: "Due date", value: fmt(payment.dueDate) }] : []),
              ...(payment.paidAt  ? [{ label: "Paid at",  value: fmt(payment.paidAt)  }] : []),
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 12px" }}>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.11em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.28)", marginBottom: 4, fontFamily: DISPLAY }}>
                  {label}
                </p>
                <p style={{ fontFamily: DISPLAY, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.80)" }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Failure */}
          {payment.failureReason && (
            <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.20)", borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase" as const, color: "#FCA5A5", marginBottom: 5, fontFamily: DISPLAY }}>
                Failure reason
              </p>
              <p style={{ fontFamily: DISPLAY, fontSize: 13, color: "#FCA5A5" }}>{payment.failureReason}</p>
            </div>
          )}

          {/* Receipt */}
          {payment.receiptUrl && (
            <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: ORANGE, fontFamily: DISPLAY, fontWeight: 600, textDecoration: "none" }}>
              <Receipt style={{ width: 14, height: 14 }} />
              View receipt
              <ExternalLink style={{ width: 11, height: 11 }} />
            </a>
          )}
        </SupraShell>
      </DialogContent>
    </Dialog>
  );
}
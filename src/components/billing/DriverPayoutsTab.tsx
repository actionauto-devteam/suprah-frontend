"use client";

import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Clock, CheckCircle2, Loader2, RefreshCw, Send, Wallet, UserCheck, AlertTriangle, X,
} from "lucide-react";
import { DriverPayout, DeliverableLoad, DriverPayoutStats } from "@/types/driver-payout";
import { formatCurrency } from "@/utils/format";
import { StatCard, PayoutStatusBadge } from "@/components/billing/StatusBadges";
import { resolveImageUrl } from "@/lib/utils";

const DISPLAY = "'Rajdhani', var(--font-sans), sans-serif";
const MONO = "'Share Tech Mono', 'Roboto Mono', monospace";
const ORANGE = "#E55A00";
const BG = "#0d0d10";
const SURFACE = "rgba(255,255,255,0.05)";
const BORDER = "rgba(255,255,255,0.10)";

// ─── Shared Supra atoms ───────────────────────────────────────────────────────
function SupraInput({ id, type = "text", placeholder, value, onChange }: {
  id: string; type?: string; placeholder?: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [focus, setFocus] = React.useState(false);
  return (
    <input
      id={id} type={type} placeholder={placeholder} value={value} onChange={onChange}
      onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      style={{
        width: "100%", fontFamily: DISPLAY, fontSize: 13, background: SURFACE,
        border: `1px solid ${focus ? ORANGE : BORDER}`, borderRadius: 8,
        padding: "8px 11px", color: "rgba(255,255,255,0.88)", outline: "none",
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
        width: "100%", fontFamily: DISPLAY, fontSize: 13, background: SURFACE,
        border: `1px solid ${focus ? ORANGE : BORDER}`, borderRadius: 8,
        padding: "8px 11px", color: "rgba(255,255,255,0.88)", outline: "none", resize: "none",
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
      {children}{required && <span style={{ color: ORANGE, marginLeft: 3 }}>*</span>}
    </label>
  );
}

function SupraBtn({ onClick, disabled, children }: {
  onClick?: () => void; disabled?: boolean; children: React.ReactNode;
}) {
  const [hover, setHover] = React.useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        position: "relative", overflow: "hidden",
        width: "100%", padding: "11px 14px", marginTop: 4, borderRadius: 8,
        background: hover && !disabled ? "#cf4f00" : ORANGE, border: "none",
        color: "white", fontSize: 14, fontWeight: 600, fontFamily: DISPLAY, letterSpacing: "0.04em",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1,
        transition: "background 0.14s",
      }}
    >
      {!disabled && (
        <span aria-hidden style={{
          position: "absolute", top: 0, bottom: 0, left: "-110%", width: "55%",
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)",
          transform: "skewX(-20deg)", animation: "supraSheen 3.2s ease-in-out infinite",
          pointerEvents: "none",
        }} />
      )}
      {children}
    </button>
  );
}

function SupraShell({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "relative", background: BG, borderRadius: 16, overflow: "hidden", fontFamily: DISPLAY }}>
      <div aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: `
          repeating-linear-gradient(45deg, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0.018) 1px, transparent 1px, transparent 8px),
          repeating-linear-gradient(-45deg, rgba(255,255,255,0.013) 0px, rgba(255,255,255,0.013) 1px, transparent 1px, transparent 8px)
        `,
      }} />
      <div aria-hidden style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: ORANGE }} />
      <div aria-hidden style={{ position: "absolute", top: 0, left: 4, right: 0, height: 1, background: `linear-gradient(90deg,${ORANGE},rgba(229,90,0,0.22),transparent)` }} />
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

// ─── Driver avatar ────────────────────────────────────────────────────────────
function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
      background: "rgba(229,90,0,0.12)", border: "1px solid rgba(229,90,0,0.22)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: MONO, fontSize: 10, fontWeight: 700, color: "rgba(229,90,0,0.80)",
    }}>
      {initials}
    </div>
  );
}

// ─── Section header with racing stripe ───────────────────────────────────────
function SectionHead({ title }: { title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 11 }}>
      <div style={{ width: 3, height: 16, background: ORANGE, borderRadius: 1, flexShrink: 0 }} />
      <p style={{ fontFamily: DISPLAY, fontSize: 11, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.45)" }}>
        {title}
      </p>
    </div>
  );
}

// ─── Table shell ──────────────────────────────────────────────────────────────
const thStyle: React.CSSProperties = {
  padding: "10px 14px", fontSize: 10, fontWeight: 700, letterSpacing: "0.10em",
  textTransform: "uppercase", color: "rgba(255,255,255,0.32)", whiteSpace: "nowrap",
  borderBottom: "1px solid rgba(255,255,255,0.07)", textAlign: "left",
};

function TableShell({ headers, children, loading, loadingCols, emptyMsg }: {
  headers: string[]; children: React.ReactNode;
  loading?: boolean; loadingCols?: number; emptyMsg?: React.ReactNode;
}) {
  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
          <thead>
            <tr style={{ background: "#111116" }}>
              {headers.map(h => <th key={h} style={thStyle}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {Array.from({ length: loadingCols ?? headers.length }).map((_, j) => (
                    <td key={j} style={{ padding: "12px 14px" }}>
                      <div style={{ height: 11, width: 60, background: "rgba(255,255,255,0.07)", borderRadius: 4 }} />
                    </td>
                  ))}
                </tr>
              ))
              : children}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Props ─────────────────────────────────────────────────────────────────────
export interface DriverPayoutsTabProps {
  deliverableLoads: DeliverableLoad[]; payouts: DriverPayout[];
  payoutStats: DriverPayoutStats | null; payoutsLoading: boolean;
  confirmingId: string | null; createPayoutTarget: DeliverableLoad | null;
  createPayoutAmount: number; createPayoutNotes: string;
  payoutError: string | null; isCreatingPayout: boolean;
  onRefresh: () => void; onConfirmDelivery: (id: string) => void;
  onSetPayoutTarget: (s: DeliverableLoad) => void;
  onPayoutAmountChange: (v: number) => void; onPayoutNotesChange: (v: string) => void;
  onPayoutClose: () => void; onCreatePayout: () => void;
}

// ─── DriverPayoutsTab ──────────────────────────────────────────────────────────
export function DriverPayoutsTab({
  deliverableLoads, payouts, payoutStats, payoutsLoading, confirmingId,
  createPayoutTarget, createPayoutAmount, createPayoutNotes, payoutError,
  isCreatingPayout, onRefresh, onConfirmDelivery, onSetPayoutTarget,
  onPayoutAmountChange, onPayoutNotesChange, onPayoutClose, onCreatePayout,
}: DriverPayoutsTabProps) {
  const [refreshHover, setRefreshHover] = React.useState(false);

  const readyToPay = deliverableLoads.filter(
    s => !s.pendingConfirmation && (!s.existingPayout || s.existingPayout.status === "failed")
  );
  const pendingConf = deliverableLoads.filter(s => s.pendingConfirmation);

  const statCards = [
    { label: "Total Paid Out", value: formatCurrency(payoutStats?.totalPaid ?? 0), icon: <Wallet style={{ width: 15, height: 15, color: "#6EE7B7" }} /> },
    { label: "Pending Payouts", value: formatCurrency(payoutStats?.totalPending ?? 0), icon: <Clock style={{ width: 15, height: 15, color: "#FCD34D" }} /> },
    { label: "Drivers Paid", value: String(payoutStats?.countPaid ?? 0), icon: <UserCheck style={{ width: 15, height: 15, color: "#93C5FD" }} /> },
    { label: "Ready to Pay", value: String(readyToPay.length), icon: <Send style={{ width: 15, height: 15, color: ORANGE }} /> },
  ];

  // inline row hover
  const rowHover = (e: React.MouseEvent<HTMLTableRowElement>, enter: boolean) => {
    e.currentTarget.style.background = enter ? "rgba(255,255,255,0.025)" : "transparent";
  };

  const tdBase: React.CSSProperties = { padding: "11px 14px", fontFamily: DISPLAY };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Share+Tech+Mono&display=swap');
        @keyframes supraSheen { 0%,62%{left:-110%} 100%{left:230%} }
        @keyframes supraSpin  { to{transform:rotate(360deg)} }
      `}</style>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
        {statCards.map(c => (
          <StatCard key={c.label} label={c.label} value={c.value} icon={c.icon} loading={payoutsLoading} />
        ))}
      </div>

      {/* Refresh */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={onRefresh}
          onMouseEnter={() => setRefreshHover(true)}
          onMouseLeave={() => setRefreshHover(false)}
          style={{
            display: "flex", alignItems: "center", gap: 7, padding: "7px 13px",
            borderRadius: 8, fontFamily: DISPLAY, fontSize: 13, fontWeight: 600, letterSpacing: "0.03em",
            background: refreshHover ? "rgba(255,255,255,0.08)" : SURFACE,
            border: `1px solid ${BORDER}`, color: "rgba(255,255,255,0.60)", cursor: "pointer",
            transition: "background 0.14s",
          }}
        >
          <RefreshCw style={{ width: 13, height: 13, animation: payoutsLoading ? "supraSpin 1s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      {/* ── Pending Confirmation ── */}
      {(payoutsLoading || pendingConf.length > 0) && (
        <div>
          <SectionHead title="Pending Confirmation" />
          <div style={{ borderRadius: 12, border: "1px solid rgba(251,191,36,0.18)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
                <thead>
                  <tr style={{ background: "rgba(251,191,36,0.07)" }}>
                    {["Load #", "Driver", "Vehicle", "Route", "Proof", "Action"].map(h => (
                      <th key={h} style={{ ...thStyle, borderBottomColor: "rgba(251,191,36,0.14)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payoutsLoading
                    ? Array.from({ length: 2 }).map((_, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} style={{ padding: "12px 14px" }}>
                            <div style={{ height: 11, width: 60, background: "rgba(255,255,255,0.07)", borderRadius: 4 }} />
                          </td>
                        ))}
                      </tr>
                    ))
                    : pendingConf.map(s => {
                      const imgSrc = s.proofOfDelivery?.imageUrl
                        ? resolveImageUrl(s.proofOfDelivery?.imageUrl)
                        : null;
                      return (
                        <tr key={s._id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", transition: "background 0.12s" }}
                          onMouseEnter={e => rowHover(e, true)} onMouseLeave={e => rowHover(e, false)}
                        >
                          <td style={{ ...tdBase, fontFamily: MONO, fontSize: 11, color: "rgba(229,90,0,0.65)" }}>
                            {s.loadNumber || s.trackingNumber || "—"}
                          </td>
                          <td style={{ ...tdBase }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                              <Avatar name={s.assignedDriverId.name} />
                              <div>
                                <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)", margin: 0 }}>{s.assignedDriverId.name}</p>
                                <p style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.30)", margin: "2px 0 0" }}>{s.assignedDriverId.email}</p>
                              </div>
                            </div>
                          </td>
                          <td style={{ ...tdBase, fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
                            {s.preservedQuoteData?.vehicleName || "—"}
                          </td>
                          <td style={{ ...tdBase, maxWidth: 140 }}>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {s.origin} → {s.destination}
                            </span>
                          </td>
                          <td style={{ ...tdBase }}>
                            {imgSrc
                              ? <a href={imgSrc} target="_blank" rel="noopener noreferrer">
                                <img src={imgSrc} alt="Proof" style={{ width: 38, height: 38, borderRadius: 7, objectFit: "cover", border: "1px solid rgba(255,255,255,0.10)", display: "block" }} />
                              </a>
                              : <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>—</span>
                            }
                          </td>
                          <td style={{ ...tdBase }}>
                            <ConfirmBtn
                              loading={confirmingId === s._id}
                              onClick={() => onConfirmDelivery(s._id)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Ready to Pay ── */}
      <div>
        <SectionHead title="Delivered loads — ready to pay" />
        <TableShell headers={["Driver", "Load", "Route", "Vehicle", "Rate", "Action"]} loading={payoutsLoading}>
          {readyToPay.length === 0
            ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "3rem", fontFamily: DISPLAY }}>
                  <CheckCircle2 style={{ width: 26, height: 26, color: "#6EE7B7", display: "block", margin: "0 auto 8px" }} />
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.28)" }}>All delivered loads have been paid.</span>
                </td>
              </tr>
            )
            : readyToPay.map(s => (
              <tr key={s._id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", transition: "background 0.12s" }}
                onMouseEnter={e => rowHover(e, true)} onMouseLeave={e => rowHover(e, false)}
              >
                <td style={{ ...tdBase }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <Avatar name={s.assignedDriverId.name} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)", margin: 0 }}>{s.assignedDriverId.name}</p>
                      <p style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.30)", margin: "2px 0 0" }}>{s.assignedDriverId.email}</p>
                    </div>
                  </div>
                </td>
                <td style={{ ...tdBase, fontFamily: MONO, fontSize: 11, color: "rgba(229,90,0,0.65)" }}>{s.loadNumber || s.trackingNumber || "—"}</td>
                <td style={{ ...tdBase, maxWidth: 160 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.origin} → {s.destination}
                  </span>
                </td>
                <td style={{ ...tdBase, fontSize: 12, color: "rgba(255,255,255,0.65)" }}>{s.preservedQuoteData?.vehicleName || "—"}</td>
                <td style={{ ...tdBase, fontFamily: DISPLAY, fontSize: 13, fontWeight: 700, color: "#fff", whiteSpace: "nowrap" }}>
                  {s.preservedQuoteData?.rate != null ? formatCurrency(s.preservedQuoteData.rate) : "—"}
                </td>
                <td style={{ ...tdBase }}>
                  {!s.assignedDriverId.stripeConnectAccountId
                    ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "rgba(255,255,255,0.30)", fontFamily: DISPLAY }}>
                        <AlertTriangle style={{ width: 12, height: 12, color: "#FCD34D" }} />
                        No Stripe
                      </span>
                    )
                    : (
                      <PayDriverBtn onClick={() => {
                        onSetPayoutTarget(s);
                        onPayoutAmountChange(s.preservedQuoteData?.rate ?? 0);
                        onPayoutNotesChange("");
                      }} />
                    )
                  }
                </td>
              </tr>
            ))}
        </TableShell>
      </div>

      {/* ── Payout History ── */}
      <div>
        <SectionHead title="Payout history" />
        <TableShell headers={["Payout #", "Driver", "Load", "Amount", "Status", "Date"]} loading={payoutsLoading}>
          {payouts.length === 0
            ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "2.5rem", fontFamily: DISPLAY, fontSize: 13, color: "rgba(255,255,255,0.28)" }}>
                  No payouts sent yet.
                </td>
              </tr>
            )
            : payouts.map(p => {
              const driver = typeof p.driverId === "object" ? p.driverId : null;
              const load = typeof p.loadId === "object" ? p.loadId : null;
              return (
                <tr key={p._id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", transition: "background 0.12s" }}
                  onMouseEnter={e => rowHover(e, true)} onMouseLeave={e => rowHover(e, false)}
                >
                  <td style={{ ...tdBase, fontFamily: MONO, fontSize: 11, color: "rgba(229,90,0,0.65)" }}>{p.payoutNumber || "—"}</td>
                  <td style={{ ...tdBase }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <Avatar name={driver?.name || p.driverName || "?"} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)", margin: 0 }}>{driver?.name || p.driverName}</p>
                        <p style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.30)", margin: "2px 0 0" }}>{driver?.email || p.driverEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ ...tdBase, fontFamily: MONO, fontSize: 11, color: "rgba(229,90,0,0.65)" }}>{load?.loadNumber || load?.trackingNumber || "—"}</td>
                  <td style={{ ...tdBase, fontFamily: DISPLAY, fontSize: 13, fontWeight: 700, color: "#fff", whiteSpace: "nowrap" }}>{formatCurrency(p.amount)}</td>
                  <td style={{ ...tdBase }}><PayoutStatusBadge status={p.status} /></td>
                  <td style={{ ...tdBase, fontFamily: MONO, fontSize: 11, color: "rgba(255,255,255,0.30)", whiteSpace: "nowrap" }}>
                    {new Date(p.paidAt || p.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
        </TableShell>
      </div>

      {/* ── Create Payout Dialog ── */}
      <Dialog open={!!createPayoutTarget} onOpenChange={o => { if (!o) onPayoutClose(); }}>
        <DialogContent className="p-0! border-0! bg-transparent! shadow-none! sm:max-w-md overflow-hidden rounded-2xl [&>button]:hidden w-[calc(100%-2rem)]">
          {createPayoutTarget && (
            <SupraShell onClose={onPayoutClose}>
              <div style={{ paddingRight: 30, marginBottom: 18 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: 8 }}>
                  <Send style={{ width: 15, height: 15, color: ORANGE }} />
                  Pay Driver
                </p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", marginTop: 3 }}>
                  Stripe payout to {createPayoutTarget.assignedDriverId.name} · {createPayoutTarget.loadNumber || createPayoutTarget.trackingNumber || createPayoutTarget._id.slice(-6)}
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {/* Driver info */}
                <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "11px 13px", display: "flex", alignItems: "center", gap: 11 }}>
                  <Avatar name={createPayoutTarget.assignedDriverId.name} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: DISPLAY, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {createPayoutTarget.assignedDriverId.name}
                    </p>
                    <p style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.30)", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {createPayoutTarget.assignedDriverId.email}
                    </p>
                  </div>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontFamily: DISPLAY, fontWeight: 600, color: "#6EE7B7", flexShrink: 0 }}>
                    <UserCheck style={{ width: 12, height: 12 }} />
                    Stripe
                  </span>
                </div>

                {/* Load info */}
                <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 13px" }}>
                  <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.28)", marginBottom: 5, fontFamily: DISPLAY }}>
                    Load Details
                  </p>
                  <p style={{ fontFamily: DISPLAY, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.82)", margin: 0 }}>
                    {createPayoutTarget.preservedQuoteData?.vehicleName || "Vehicle"}
                  </p>
                  <p style={{ fontFamily: DISPLAY, fontSize: 12, color: "rgba(255,255,255,0.38)", margin: "3px 0 0" }}>
                    {createPayoutTarget.origin} → {createPayoutTarget.destination}
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <SupraLabel htmlFor="po-amt" required>Amount (₱)</SupraLabel>
                    <SupraInput id="po-amt" type="number" placeholder="0.00"
                      value={createPayoutAmount ? String(createPayoutAmount) : ""}
                      onChange={e => onPayoutAmountChange(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <SupraLabel htmlFor="po-notes">Notes</SupraLabel>
                    <SupraInput id="po-notes" placeholder="Optional"
                      value={createPayoutNotes}
                      onChange={e => onPayoutNotesChange(e.target.value)} />
                  </div>
                </div>

                {payoutError && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 13px", borderRadius: 8, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.20)", fontSize: 12, color: "#FCA5A5", fontFamily: DISPLAY }}>
                    <AlertTriangle style={{ width: 13, height: 13, flexShrink: 0 }} />
                    {payoutError}
                  </div>
                )}

                <SupraBtn onClick={onCreatePayout} disabled={isCreatingPayout || createPayoutAmount <= 0}>
                  {isCreatingPayout
                    ? <><Loader2 style={{ width: 14, height: 14, animation: "supraSpin 1s linear infinite" }} />Sending…</>
                    : <><Send style={{ width: 14, height: 14 }} />Send {createPayoutAmount > 0 ? formatCurrency(createPayoutAmount) : ""} to driver</>
                  }
                </SupraBtn>
              </div>
            </SupraShell>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Micro buttons ────────────────────────────────────────────────────────────
function PayDriverBtn({ onClick }: { onClick: () => void }) {
  const [h, setH] = React.useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        position: "relative", overflow: "hidden",
        display: "flex", alignItems: "center", gap: 5,
        padding: "6px 12px", borderRadius: 7,
        background: h ? "#cf4f00" : ORANGE, border: "none",
        color: "white", fontFamily: DISPLAY, fontSize: 12, fontWeight: 600,
        letterSpacing: "0.03em", cursor: "pointer", transition: "background 0.14s",
      }}
    >
      <Send style={{ width: 12, height: 12 }} />
      Pay driver
    </button>
  );
}

function ConfirmBtn({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  const [h, setH] = React.useState(false);
  return (
    <button onClick={onClick} disabled={loading}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 7,
        background: "transparent", border: `1px solid ${h ? ORANGE : "rgba(229,90,0,0.35)"}`,
        color: h ? ORANGE : "rgba(229,90,0,0.70)", fontFamily: DISPLAY, fontSize: 12, fontWeight: 600,
        cursor: loading ? "not-allowed" : "pointer", transition: "all 0.14s", opacity: loading ? 0.6 : 1,
      }}
    >
      {loading
        ? <Loader2 style={{ width: 12, height: 12, animation: "supraSpin 1s linear infinite" }} />
        : <CheckCircle2 style={{ width: 12, height: 12 }} />
      }
      Confirm
    </button>
  );
}
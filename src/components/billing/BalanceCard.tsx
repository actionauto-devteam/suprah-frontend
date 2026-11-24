"use client";

import * as React from "react";
import { Eye, EyeOff, TrendingUp, Clock, Receipt } from "lucide-react";
import { PaymentStats } from "@/types/billing";
import { T, FONT, MONO, numeric, money } from "@/components/billing/ui";

/**
 * The SuprahPay wallet card (2026-11-21). Suprah keeps customer card payments
 * and pays each dealership weekly (decision A4), so the balance is what Suprah
 * owes the dealership. The business wallet's Wise, Send and Receive parts are
 * not part of the launch (decision A1) and are no longer shown.
 */
interface BalanceCardProps {
  /** What Suprah owes the dealership now. */
  balance: number;
  isLoading: boolean;
  stats: PaymentStats | null;
  /** One line under the balance saying what it is. */
  balanceNote?: string;
  /** Bottom row: this week's payout and the payout account. */
  footerLeft?: React.ReactNode;
  footerRight?: React.ReactNode;
  /** An optional button, for example to set up the payout account. */
  action?: React.ReactNode;
}

export function BalanceCard({
  balance,
  isLoading,
  stats,
  balanceNote,
  footerLeft,
  footerRight,
  action,
}: BalanceCardProps) {
  const [visible, setVisible] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      return sessionStorage.getItem("billing_bal_vis") !== "false";
    } catch {
      return true;
    }
  });

  const toggle = () => {
    const next = !visible;
    setVisible(next);
    try {
      sessionStorage.setItem("billing_bal_vis", String(next));
    } catch {
      /* the choice just isn't remembered */
    }
  };

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // These come from the dealership's card payments, not the balance above.
  // Totals that couldn't be loaded show "—", never a made-up 0 (2026-11-23).
  const unavailable = !isLoading && !stats;
  const awaiting =
    (stats?.byStatus?.pending?.count ?? 0) + (stats?.byStatus?.failed?.count ?? 0) + (stats?.byStatus?.processing?.count ?? 0);
  const statItems = [
    { label: "Card payments received", value: unavailable ? "—" : money(stats?.totalRevenue ?? 0), Icon: TrendingUp },
    // Every invoice still waiting for payment, the same as Awaiting payment.
    { label: "Pending invoices", value: unavailable ? "—" : String(awaiting), Icon: Clock },
    { label: "Transactions", value: unavailable ? "—" : String(stats?.totalCount ?? 0), Icon: Receipt },
  ];

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 18,
        padding: "22px 24px",
        fontFamily: FONT,
        color: T.text,
        background: T.surface,
        backgroundImage:
          "radial-gradient(120% 90% at 88% -12%, rgba(22,163,74,0.14), transparent 55%)",
        border: `1px solid ${T.border}`,
        boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute", top: -90, right: -70, width: 250, height: 250, borderRadius: "50%",
          background: `radial-gradient(circle, ${T.mint} 0%, transparent 68%)`, opacity: 0.18,
          filter: "blur(26px)", pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${T.mint}, ${T.brand} 45%, transparent)`,
          boxShadow: `0 0 14px ${T.mint}88`,
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "-0.02em", color: T.text }}>
            Suprah<span style={{ color: T.mint }}>Pay</span> Wallet
          </span>
          {action}
        </div>

        <p style={{ fontSize: 11, color: T.textMute, margin: "0 0 8px", fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: MONO }}>
          Owed to your dealership
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: balanceNote ? 8 : 22 }}>
          {isLoading ? (
            <div style={{ height: 44, width: 210, maxWidth: "70%", borderRadius: 10, background: T.surfaceAlt }} />
          ) : (
            <p style={{ fontSize: 42, fontWeight: 700, margin: 0, lineHeight: 1, color: T.text,
              overflowWrap: "anywhere", textShadow: `0 0 28px ${T.mint}55`, ...numeric }}>
              <span style={{ fontSize: 22, color: T.textMute, marginRight: 6, fontFamily: MONO }}>$</span>
              {visible ? fmt(balance) : "••••••"}
            </p>
          )}
          <button
            type="button"
            onClick={toggle}
            aria-label={visible ? "Hide balance" : "Show balance"}
            style={{
              flexShrink: 0, width: 34, height: 34, borderRadius: 9, background: T.surfaceAlt,
              border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}
          >
            {visible ? (
              <EyeOff style={{ width: 16, height: 16, color: T.textSub }} />
            ) : (
              <Eye style={{ width: 16, height: 16, color: T.textSub }} />
            )}
          </button>
        </div>
        {balanceNote && (
          <p style={{ fontSize: 12, color: T.textSub, margin: "0 0 18px", lineHeight: 1.45 }}>{balanceNote}</p>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(104px, 1fr))", gap: 10, marginBottom: 16 }}>
          {statItems.map(({ label, value, Icon }) => (
            <div key={label} style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 12, padding: "11px 13px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <Icon style={{ width: 12, height: 12, color: T.mint, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: T.textMute }}>{label}</span>
              </div>
              {isLoading ? (
                <div style={{ height: 15, width: 48, borderRadius: 4, background: T.surfaceAlt }} />
              ) : (
                <span style={{ fontSize: 15, fontWeight: 700, color: T.text, display: "block", overflowWrap: "anywhere", ...numeric }}>
                  {value}
                </span>
              )}
            </div>
          ))}
        </div>

        {(footerLeft || footerRight) && (
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap",
              gap: "4px 12px", paddingTop: 14, borderTop: `1px solid ${T.border}`,
            }}
          >
            <span style={{ fontSize: 12, color: T.textSub, minWidth: 0, overflowWrap: "anywhere" }}>{footerLeft}</span>
            <span style={{ fontSize: 12, color: T.textSub, fontWeight: 600, overflowWrap: "anywhere" }}>{footerRight}</span>
          </div>
        )}
      </div>
    </div>
  );
}

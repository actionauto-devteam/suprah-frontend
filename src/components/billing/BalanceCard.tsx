"use client";

import * as React from "react";
import {
  Eye,
  EyeOff,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  TrendingUp,
  Clock,
  Receipt,
} from "lucide-react";
import { PaymentStats } from "@/types/billing";
import { formatCurrency } from "@/utils/format";
import { T, FONT, numeric, money } from "@/components/billing/ui";

interface BalanceCardProps {
  balance: number;
  userId: string;
  userName: string;
  isLoading: boolean;
  stats: PaymentStats | null;
  onReceive: () => void;
  onSend: () => void;
  onCashIn: () => void;
}

function Action({
  icon: Icon,
  label,
  sub,
  variant = "ghost",
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  sub: string;
  variant?: "ghost" | "brand";
  onClick: () => void;
}) {
  const [hover, setHover] = React.useState(false);
  const brand = variant === "brand";
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "12px 14px",
        borderRadius: 12,
        textAlign: "left",
        cursor: "pointer",
        fontFamily: FONT,
        border: brand ? "none" : `1px solid rgba(255,255,255,0.16)`,
        background: brand
          ? hover
            ? T.brandHover
            : T.brand
          : hover
            ? "rgba(255,255,255,0.16)"
            : "rgba(255,255,255,0.10)",
        transition: "background 0.15s",
      }}
    >
      <span
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          background: brand ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.14)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon style={{ width: 16, height: 16, color: "#fff" }} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#fff", lineHeight: 1.1 }}>
          {label}
        </span>
        <span style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 3 }}>
          {sub}
        </span>
      </span>
    </button>
  );
}

export function BalanceCard({
  balance,
  userId,
  userName,
  isLoading,
  stats,
  onReceive,
  onSend,
  onCashIn,
}: BalanceCardProps) {
  const [visible, setVisible] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return sessionStorage.getItem("billing_bal_vis") !== "false";
  });

  const toggle = () => {
    const next = !visible;
    setVisible(next);
    sessionStorage.setItem("billing_bal_vis", String(next));
  };

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const statItems = [
    { label: "Received", value: money(stats?.totalRevenue ?? 0), Icon: TrendingUp },
    { label: "Pending", value: `${stats?.byStatus?.pending?.count ?? 0} invoices`, Icon: Clock },
    { label: "Transactions", value: String(stats?.totalCount ?? 0), Icon: Receipt },
  ];

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 18,
        padding: "22px 24px",
        fontFamily: FONT,
        color: "#fff",
        background: `linear-gradient(135deg, #1A1410 0%, #241A12 55%, ${T.brand} 240%)`,
        boxShadow: "0 18px 40px -24px rgba(229,90,0,0.55)",
      }}
    >
      {/* soft brand glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -90,
          right: -70,
          width: 240,
          height: 240,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(229,90,0,0.45), transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative" }}>
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em" }}>
            Suprah<span style={{ color: T.brand }}>Pay</span> Wallet
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(255,255,255,0.85)",
              background: "rgba(255,255,255,0.12)",
              borderRadius: 999,
              padding: "4px 11px",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ADE80" }} />
            Active
          </span>
        </div>

        {/* Balance */}
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", margin: "0 0 8px", fontWeight: 500 }}>
          Available balance
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
          {isLoading ? (
            <div style={{ height: 42, width: 200, borderRadius: 10, background: "rgba(255,255,255,0.12)" }} />
          ) : (
            <p style={{ fontSize: 40, fontWeight: 800, margin: 0, lineHeight: 1, ...numeric }}>
              <span style={{ fontSize: 24, color: "rgba(255,255,255,0.7)", marginRight: 4 }}>$</span>
              {visible ? fmt(balance) : "••••••"}
            </p>
          )}
          <button
            onClick={toggle}
            aria-label={visible ? "Hide balance" : "Show balance"}
            style={{
              flexShrink: 0,
              width: 34,
              height: 34,
              borderRadius: 9,
              background: "rgba(255,255,255,0.12)",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            {visible ? (
              <EyeOff style={{ width: 16, height: 16, color: "rgba(255,255,255,0.75)" }} />
            ) : (
              <Eye style={{ width: 16, height: 16, color: "rgba(255,255,255,0.75)" }} />
            )}
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 18 }}>
          {statItems.map(({ label, value, Icon }) => (
            <div
              key={label}
              style={{
                background: "rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: "11px 13px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <Icon style={{ width: 12, height: 12, color: "rgba(255,255,255,0.55)" }} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>{label}</span>
              </div>
              {isLoading ? (
                <div style={{ height: 15, width: 48, borderRadius: 4, background: "rgba(255,255,255,0.12)" }} />
              ) : (
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.92)",
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    ...numeric,
                  }}
                >
                  {value}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <Action icon={ArrowDownLeft} label="Receive" sub="Generate QR" onClick={onReceive} />
          <Action icon={PlusCircle} label="Cash In" sub="Add funds" onClick={onCashIn} />
          <Action icon={ArrowUpRight} label="Send" sub="Transfer" variant="brand" onClick={onSend} />
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 14,
            borderTop: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.55)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "55%",
            }}
          >
            {userName}
          </span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: 600, ...numeric }}>
            {userId}
          </span>
        </div>
      </div>
    </div>
  );
}
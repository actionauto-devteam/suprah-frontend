"use client";

import * as React from "react";
import {
  Eye,
  EyeOff,
  ArrowDownLeft,
  ArrowUpRight,
  Link2,
  TrendingUp,
  Clock,
  Receipt,
} from "lucide-react";
import { PaymentStats } from "@/types/billing";
import { T, FONT, MONO, numeric, money } from "@/components/billing/ui";

interface BalanceCardProps {
  balance: number;
  userId: string;
  userName: string;
  isLoading: boolean;
  stats: PaymentStats | null;
  onReceive: () => void;
  onSend: () => void;
  onLinkWise: () => void;
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
        border: brand
          ? `1px solid ${T.brandBorder}`
          : `1px solid rgba(255,255,255,0.12)`,
        background: brand
          ? `linear-gradient(180deg, ${T.mint} -30%, ${T.brand} 55%, ${T.brandHover} 130%)`
          : hover
            ? "rgba(255,255,255,0.10)"
            : "rgba(255,255,255,0.05)",
        boxShadow: brand
          ? hover
            ? `0 0 0 1px ${T.mint}55, 0 10px 26px -12px ${T.brand}cc`
            : `0 8px 20px -14px ${T.brand}aa`
          : "none",
        transform: brand && hover ? "translateY(-1px)" : "none",
        transition: "background 0.15s, box-shadow 0.18s, transform 0.18s",
      }}
    >
      <span
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          background: brand ? "rgba(3,18,10,0.22)" : "rgba(255,255,255,0.10)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon style={{ width: 16, height: 16, color: brand ? "#06130C" : "#fff" }} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{
          display: "block", fontSize: 14, fontWeight: 700,
          color: brand ? "#06130C" : "#fff", lineHeight: 1.1,
        }}>
          {label}
        </span>
        <span style={{
          display: "block", fontSize: 11, marginTop: 3,
          color: brand ? "rgba(3,18,10,0.7)" : "rgba(255,255,255,0.55)",
        }}>
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
  onLinkWise,
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
        background: "#0A0E15",
        backgroundImage:
          "radial-gradient(120% 90% at 88% -12%, rgba(52,245,163,0.20), transparent 55%)," +
          "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 42%, transparent 100%)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        border: `1px solid ${T.border}`,
        boxShadow:
          "0 1px 0 0 rgba(255,255,255,0.06) inset, 0 26px 60px -30px rgba(0,0,0,0.85)",
      }}
    >
      {/* ambient glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -90,
          right: -70,
          width: 250,
          height: 250,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${T.mint} 0%, transparent 68%)`,
          opacity: 0.18,
          filter: "blur(26px)",
          pointerEvents: "none",
        }}
      />
      {/* glowing top rail */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, ${T.mint}, ${T.brand} 45%, transparent)`,
          boxShadow: `0 0 14px ${T.mint}88`,
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" }}>
            Suprah<span style={{ color: T.mint }}>Pay</span> Wallet
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 700,
              color: T.mint,
              background: T.brandSoft,
              border: `1px solid ${T.brandBorder}`,
              borderRadius: 999,
              padding: "4px 11px",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.mint,
              animation: "spy-pulse 2.4s ease-in-out infinite" }} />
            Active
          </span>
        </div>

        {/* Balance */}
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", margin: "0 0 8px", fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: MONO }}>
          Available balance
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
          {isLoading ? (
            <div style={{ height: 44, width: 210, borderRadius: 10, background: "rgba(255,255,255,0.10)" }} />
          ) : (
            <p style={{
              fontSize: 42, fontWeight: 700, margin: 0, lineHeight: 1, color: "#fff",
              textShadow: `0 0 28px ${T.mint}55`, ...numeric,
            }}>
              <span style={{ fontSize: 22, color: "rgba(255,255,255,0.5)", marginRight: 6, fontFamily: MONO }}>$</span>
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
              background: "rgba(255,255,255,0.08)",
              border: `1px solid ${T.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            {visible ? (
              <EyeOff style={{ width: 16, height: 16, color: "rgba(255,255,255,0.7)" }} />
            ) : (
              <Eye style={{ width: 16, height: 16, color: "rgba(255,255,255,0.7)" }} />
            )}
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 18 }}>
          {statItems.map(({ label, value, Icon }) => (
            <div
              key={label}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                padding: "11px 13px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <Icon style={{ width: 12, height: 12, color: T.mint }} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{label}</span>
              </div>
              {isLoading ? (
                <div style={{ height: 15, width: 48, borderRadius: 4, background: "rgba(255,255,255,0.10)" }} />
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
          <Action icon={Link2} label="Link Wise" sub="Connect account" onClick={onLinkWise} />
          <Action icon={ArrowUpRight} label="Send" sub="Transfer" variant="brand" onClick={onSend} />
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 14,
            borderTop: `1px solid ${T.border}`,
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.5)",
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
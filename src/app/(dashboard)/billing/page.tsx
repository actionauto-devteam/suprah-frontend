"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/providers/AuthProvider";
import { apiClient } from "@/lib/api-client";
import { WiseProvider, WisePanel } from "@/components/billing/WiseIntegration";
import { Payment, PaymentStats } from "@/types/billing";
import { formatCurrency } from "@/utils/format";
import {
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  XCircle,
  Activity,
  CreditCard,
  AlertCircle,
  Wallet,
  Banknote,
  Shield,
  Eye,
  EyeOff,
  ArrowRight,
  BarChart3,
  Users,
  Zap,
  TrendingUp,
} from "lucide-react";
import { CashInModal } from "@/components/CashInModal";
import { ReceiveModal } from "@/components/billing/ReceiveModal";
import { SendModal } from "@/components/billing/SendModal";

// Design Tokens (matches WiseIntegration theme)
const T = {
  bg: "var(--color-background-tertiary, var(--background))",
  surface: "var(--color-background-secondary, var(--card))",
  surfaceHi: "var(--color-background-primary, var(--popover))",
  border: "var(--color-border-tertiary, var(--border))",
  borderHi: "var(--color-border-secondary, var(--border))",
  text: "var(--color-text-primary, var(--foreground))",
  textSub: "var(--color-text-secondary, var(--muted-foreground))",
  textMute: "var(--color-text-tertiary, var(--muted-foreground))",
  accent: "var(--color-text-info, #2563EB)",
  accentBg: "var(--color-background-info, rgba(37,99,235,0.12))",
  success: "var(--color-text-success, #16A34A)",
  successBg: "var(--color-background-success, rgba(34,197,94,0.12))",
  warning: "var(--color-text-warning, #D97706)",
  warningBg: "var(--color-background-warning, rgba(217,119,6,0.12))",
  danger: "var(--color-text-danger, #DC2626)",
  dangerBg: "var(--color-background-danger, rgba(220,38,38,0.12))",
  brand: "#16A34A",
  brandMid: "#22C55E",
  brandLight: "rgba(34,197,94,0.10)",
  brandGlow: "rgba(34,197,94,0.16)",
  brandBorder: "rgba(34,197,94,0.22)",
  stripe: "#635BFF",
  stripeBg: "rgba(99,91,255,0.08)",
  stripeBorder: "rgba(99,91,255,0.20)",
  wise: "#9FE870",
  wiseDark: "#163300",
  wiseBg: "rgba(159,232,112,0.12)",
  wiseBorder: "rgba(159,232,112,0.25)",
};

function MetricIconShell({
  children,
  bg,
  size = 38,
}: {
  children: React.ReactNode;
  bg: string;
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 11,
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: `1px solid ${T.border}`,
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

function StripeLogo({ size = 38 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 0.42}
      viewBox="0 0 60 25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.5 9.5c0-1.1.9-1.5 2.3-1.5 2.1 0 4.7.6 6.8 1.7V4.3C12.4 3.5 10.2 3 7.8 3 3.2 3 0 5.4 0 9.8c0 7 9.7 5.9 9.7 8.9 0 1.3-1.1 1.7-2.6 1.7-2.3 0-5.1-.9-7.4-2.2v5.5C1.9 24.5 4.4 25 6.9 25c4.7 0 8-2.3 8-6.8-.1-7.5-9.4-6.2-9.4-8.7z"
        fill="#635BFF"
      />
      <path
        d="M22.1 1.1L16.3 2.3v4.1l-3.8.8V11h3.8v7.3c0 3.5 2.3 5 5.5 5 1.4 0 3-.3 3.9-.7v-3.8c-.7.3-3.9 1.2-3.9-1.2V11h3.9V7.2h-3.9V1.1h-.7z"
        fill="#635BFF"
      />
      <path
        d="M35 7c-1.4 0-2.3.7-2.8 1.1l-.2-.9h-4.4v17.3l5-.9v-4.4c.5.4 1.3.9 2.5.9 2.5 0 4.8-2 4.8-6.7C39.8 9.1 37.5 7 35 7zm-.9 10.4c-.8 0-1.3-.3-1.7-.7V12c.4-.4.9-.7 1.7-.7 1.3 0 2.2 1.4 2.2 3-.1 1.7-.9 3.1-2.2 3.1z"
        fill="#635BFF"
      />
      <path
        d="M42 5.9c1.6 0 2.9-1.3 2.9-2.9S43.6.1 42 .1s-2.9 1.3-2.9 2.9S40.4 5.9 42 5.9zm-2.5 1.3v17.3l5-1V7.2h-5z"
        fill="#635BFF"
      />
      <path
        d="M53.8 11.4l-.6-.3c-1.9-.9-2.7-1.3-2.7-2.1 0-.7.6-1 1.6-1 1.8 0 3.6.7 4.9 1.4V4.9C55.8 4 54 3.5 52 3.5c-4 0-6.7 2.1-6.7 5.7 0 3.3 2.3 4.7 4.8 5.8l.6.3c2 .9 2.9 1.3 2.9 2.2 0 .7-.7 1.1-1.9 1.1-1.9 0-4.3-.8-6-2v4.9c1.7 1 3.8 1.5 6 1.5 4.2 0 7-2.1 7-5.9.1-3.5-2.2-4.9-4.9-5.7z"
        fill="#635BFF"
      />
    </svg>
  );
}

function WiseLogo({ size = 38 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 0.45}
      viewBox="0 0 80 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="20" height="36" rx="4" fill="#9FE870" />
      <path d="M4 8h12L10 18l6 10H4V8z" fill="#163300" />
      <text
        x="26"
        y="26"
        fontFamily="'Helvetica Neue', Arial, sans-serif"
        fontWeight="800"
        fontSize="22"
        fill="#9FE870"
        letterSpacing="-0.5"
      >
        wise
      </text>
    </svg>
  );
}

function PoweredByBanner() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        overflow: "hidden",
        height: 44,
      }}
    >
      <div
        style={{
          padding: "0 14px",
          borderRight: `1px solid ${T.border}`,
          display: "flex",
          alignItems: "center",
          height: "100%",
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontFamily: "var(--font-mono)",
            color: T.textMute,
            whiteSpace: "nowrap",
          }}
        >
          Powered by
        </span>
      </div>
      <div
        style={{
          padding: "0 16px",
          borderRight: `1px solid ${T.border}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
          height: "100%",
          background: T.stripeBg,
        }}
      >
        <StripeLogo size={42} />
      </div>
      <div
        style={{
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          height: "100%",
          background: T.wiseBg,
        }}
      >
        <WiseLogo size={44} />
      </div>
    </div>
  );
}

function Skeleton({ w, h, r = 8 }: { w: number | string; h: number; r?: number }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: r,
        background: "var(--color-border-tertiary)",
        animation: "skShimmer 1.6s ease-in-out infinite",
      }}
    />
  );
}

function LiveBadge() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px 3px 8px",
        borderRadius: 99,
        background: T.brandLight,
        border: `1px solid ${T.brandBorder}`,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: T.brandMid,
          animation: "livePulse 2.2s ease-in-out infinite",
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: T.brandMid,
          fontFamily: "var(--font-mono)",
        }}
      >
        Live
      </span>
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, [string, string]> = {
    succeeded: [T.success, T.successBg],
    pending: [T.warning, T.warningBg],
    failed: [T.danger, T.dangerBg],
    processing: [T.accent, T.accentBg],
    cancelled: [T.textMute, T.surface],
    refunded: [T.textMute, T.surface],
  };
  const [color, bg] = cfg[status] ?? cfg.cancelled;
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        fontFamily: "var(--font-mono)",
        color,
        background: bg,
        padding: "2px 8px",
        borderRadius: 6,
        border: "1px solid currentColor",
        opacity: 0.9,
      }}
    >
      {status}
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  colorVar,
  bgVar,
  delay = 0,
  skeleton,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  colorVar: string;
  bgVar: string;
  delay?: number;
  skeleton?: boolean;
}) {
  return (
    <div
      className="sp-stat"
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 18,
        padding: "22px 24px",
        position: "relative",
        overflow: "hidden",
        transition: "transform 0.2s ease, border-color 0.2s ease",
        animationDelay: `${delay}ms`,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, ${colorVar}, transparent 70%)`,
          opacity: 0.7,
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <MetricIconShell bg={bgVar}>
          <Icon style={{ width: 16, height: 16, color: colorVar }} />
        </MetricIconShell>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontFamily: "var(--font-mono)",
            color: T.textMute,
          }}
        >
          {label}
        </span>
      </div>
      {skeleton ? (
        <Skeleton w={130} h={32} r={8} />
      ) : (
        <p
          style={{
            fontSize: 28,
            fontWeight: 700,
            margin: 0,
            color: T.text,
            letterSpacing: "-0.03em",
            lineHeight: 1,
            fontFamily: "'Epilogue', var(--font-mono), monospace",
          }}
        >
          {value}
        </p>
      )}
      <p
        style={{
          fontSize: 11,
          color: T.textMute,
          margin: "8px 0 0",
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.03em",
        }}
      >
        {sub}
      </p>
    </div>
  );
}

function NavCard({
  href,
  icon: Icon,
  title,
  desc,
  badge,
  colorVar,
  bgVar,
  delay = 0,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  desc: string;
  badge?: number;
  colorVar: string;
  bgVar: string;
  delay?: number;
}) {
  return (
    <Link
      href={href}
      className="sp-nav"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: "18px 20px",
        textDecoration: "none",
        transition: "transform 0.18s ease, border-color 0.18s ease",
        animationDelay: `${delay}ms`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 1.5,
          background: `linear-gradient(90deg, ${colorVar}, transparent 60%)`,
          opacity: 0.4,
        }}
      />
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: bgVar,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `1px solid ${T.border}`,
        }}
      >
        <Icon style={{ width: 18, height: 18, color: colorVar }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: T.text, margin: 0, letterSpacing: "-0.01em" }}>
          {title}
        </p>
        <p style={{ fontSize: 12, color: T.textSub, margin: "2px 0 0", lineHeight: 1.45 }}>
          {desc}
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {badge !== undefined && badge > 0 && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              background: T.warningBg,
              color: T.warning,
              borderRadius: 6,
              padding: "1px 8px",
              fontFamily: "var(--font-mono)",
              border: `1px solid ${T.border}`,
            }}
          >
            {badge}
          </span>
        )}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: T.bg,
            border: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowRight style={{ width: 12, height: 12, color: T.textMute }} />
        </div>
      </div>
    </Link>
  );
}

function TxRow({
  payment,
  idx,
  isHidden,
}: {
  payment: Payment;
  idx: number;
  isHidden: boolean;
}) {
  const method: "stripe" | "wise" = idx % 2 === 0 ? "stripe" : "wise";

  return (
    <div
      className="sp-tx"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 14px",
        borderRadius: 12,
        transition: "background 0.14s",
        animationDelay: `${idx * 40}ms`,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: T.brandLight,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `1px solid ${T.brandBorder}`,
        }}
      >
        <CreditCard style={{ width: 15, height: 15, color: T.brandMid }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: T.text,
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            letterSpacing: "-0.01em",
          }}
        >
          {payment.customerName}
        </p>
        <p
          style={{
            fontSize: 11,
            color: T.textMute,
            margin: "2px 0 0",
            fontFamily: "var(--font-mono)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {payment.invoiceNumber ?? payment.description}
        </p>
      </div>
      <div
        style={{
          textAlign: "right",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 4,
        }}
      >
        <p
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: T.text,
            margin: 0,
            letterSpacing: "-0.02em",
            fontFamily: "'Epilogue', monospace",
          }}
        >
          {isHidden ? "$ •••••" : formatCurrency(payment.amount)}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <StatusPill status={payment.status} />
        </div>
      </div>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  icon: Icon,
  colorVar,
  bgVar,
  skeleton,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  colorVar: string;
  bgVar: string;
  skeleton?: boolean;
}) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: "16px 18px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <MetricIconShell bg={bgVar} size={36}>
        <Icon style={{ width: 14, height: 14, color: colorVar }} />
      </MetricIconShell>
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: T.textMute,
            margin: 0,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontFamily: "var(--font-mono)",
          }}
        >
          {label}
        </p>
        {skeleton ? (
          <div style={{ marginTop: 4 }}>
            <Skeleton w={56} h={18} r={4} />
          </div>
        ) : (
          <p
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: T.text,
              margin: "3px 0 0",
              letterSpacing: "-0.025em",
              fontFamily: "'Epilogue', monospace",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {value}
          </p>
        )}
      </div>
    </div>
  );
}

function DashboardFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      style={{
        marginTop: 40,
        paddingTop: 24,
        borderTop: `1px solid ${T.border}`,
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: T.text,
              letterSpacing: "-0.02em",
              fontFamily: "'Epilogue', sans-serif",
              lineHeight: 1.1,
            }}
          >
            Suprah<span style={{ color: T.brandMid }}>Pay</span>
          </span>
          <span
            style={{
              fontSize: 11,
              color: T.textMute,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.02em",
              lineHeight: 1.4,
            }}
          >
            ©{currentYear} All rights reserved
          </span>
        </div>
      </div>
    </footer>
  );
}

export default function BillingDashboard() {
  const { getToken, userId: authUserId } = useAuth();
  const [balance, setBalance] = React.useState<number | null>(null);
  const [stats, setStats] = React.useState<PaymentStats | null>(null);
  const [recentPayments, setRecentPayments] = React.useState<Payment[]>([]);
  const [pendingCount, setPendingCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isHidden, setIsHidden] = React.useState(false);
  const [activeModal, setActiveModal] = React.useState<
    "receive" | "send" | "cashin" | null
  >(null);

  const userId = authUserId ?? "USR-0000";

  const load = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [paymentsRes, statsRes, balanceRes, pendingRes] =
        await Promise.allSettled([
          apiClient.get("/api/payments", { headers, params: { limit: "6" } }),
          apiClient.get("/api/payments/stats", { headers }),
          apiClient.get("/api/payments/balance", { headers }),
          apiClient.get("/api/payments/pending", { headers }),
        ]);
      if (paymentsRes.status === "fulfilled")
        setRecentPayments(paymentsRes.value.data.data.payments?.slice(0, 6) ?? []);
      if (statsRes.status === "fulfilled")
        setStats(statsRes.value.data.data ?? null);
      if (balanceRes.status === "fulfilled")
        setBalance(balanceRes.value.data.data?.balance ?? null);
      if (pendingRes.status === "fulfilled")
        setPendingCount((pendingRes.value.data.data ?? []).length);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  React.useEffect(() => {
    load();
  }, [load]);

  const displayBalance = balance ?? stats?.totalRevenue ?? 0;
  const succeeded = stats?.byStatus?.succeeded;
  const pending = stats?.byStatus?.pending;
  const failed = stats?.byStatus?.failed;
  const winRate =
    succeeded?.count && stats?.totalCount
      ? Math.round((succeeded.count / stats.totalCount) * 100)
      : 0;
  const avgDeal =
    (stats?.totalRevenue ?? 0) / Math.max(stats?.totalCount ?? 1, 1);

  return (
    <WiseProvider>
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Epilogue:wght@500;600;700;800&display=swap');

          @keyframes livePulse {
            0%,100% { opacity:1; transform:scale(1); }
            50%      { opacity:.45; transform:scale(1.65); }
          }
          @keyframes skShimmer {
            0%,100% { opacity:1; }
            50%      { opacity:.4; }
          }
          @keyframes fadeUp {
            from { opacity:0; transform:translateY(10px); }
            to   { opacity:1; transform:translateY(0); }
          }

          .sp-stat:hover {
            transform: translateY(-3px) !important;
            border-color: var(--color-border-secondary) !important;
            box-shadow: 0 10px 30px rgba(0,0,0,0.07) !important;
          }
          .sp-nav:hover {
            transform: translateY(-2px) !important;
            border-color: rgba(34,197,94,0.32) !important;
            box-shadow: 0 8px 24px rgba(34,197,94,0.09) !important;
          }
          .sp-tx:hover { background: var(--color-background-tertiary); }
          .sp-btn-primary:hover {
            background: #15803D !important;
            box-shadow: 0 0 28px rgba(22,163,74,0.38) !important;
            transform: translateY(-1px);
          }
          .sp-btn-ghost:hover {
            background: var(--color-background-tertiary) !important;
            transform: translateY(-1px);
          }

          @media (max-width: 900px) {
            .sp-hero { grid-template-columns: 1fr !important; }
          }
          @media (max-width: 680px) {
            .sp-header-right { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
          }
          @media (max-width: 600px) {
            .sp-stats   { grid-template-columns: 1fr 1fr !important; }
            .sp-navs    { grid-template-columns: 1fr !important; }
            .sp-metrics { grid-template-columns: 1fr 1fr !important; }
            .sp-header  { flex-direction: column !important; align-items: flex-start !important; gap: 14px !important; }
            .sp-bal-amt { font-size: 40px !important; }
            .sp-bal-pad { padding: 22px 22px !important; }
            .sp-footer  { flex-direction: column !important; align-items: flex-start !important; }
          }
          @media (max-width: 400px) {
            .sp-stats   { grid-template-columns: 1fr !important; }
            .sp-metrics { grid-template-columns: 1fr !important; }
            .sp-bal-amt { font-size: 32px !important; }
          }
        `}</style>

        <div style={{ background: T.bg, minHeight: "100%" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 20px 80px" }}>

            {/* Header */}
            <header
              className="sp-header"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 30,
                animation: "fadeUp 0.38s ease both",
                flexWrap: "wrap",
                gap: 14,
              }}
            >
              <div>
                <h1
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: T.text,
                    margin: 0,
                    letterSpacing: "-0.025em",
                    fontFamily: "'Epilogue', sans-serif",
                  }}
                >
                  Suprah<span style={{ color: T.brandMid }}>Pay</span>
                </h1>
                <p
                  style={{
                    fontSize: 10,
                    color: T.textMute,
                    margin: "1px 0 0",
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                  }}
                >
                  Payment Operations
                </p>
              </div>

              <div
                className="sp-header-right"
                style={{ display: "flex", alignItems: "center", gap: 12 }}
              >
                <Link
                  href="/billing/payments"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                    color: T.brandMid,
                    textDecoration: "none",
                    padding: "8px 16px",
                    borderRadius: 11,
                    background: T.brandLight,
                    border: `1px solid ${T.brandBorder}`,
                    transition: "all 0.15s",
                    whiteSpace: "nowrap",
                    height: 44,
                  }}
                >
                  <Activity style={{ width: 12, height: 12 }} />
                  All Payments
                  <ArrowRight style={{ width: 11, height: 11, opacity: 0.7 }} />
                </Link>
              </div>
            </header>

            {/* Wise Integration Section */}
            <section style={{ marginBottom: 28, animation: "fadeUp 0.38s ease 0.04s both" }}>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: T.textMute,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-mono)",
                  margin: "0 0 14px",
                }}
              >
                Banking Layer
              </p>
              <WisePanel style={{ marginBottom: 0 }} />
            </section>

            {/* Hero grid */}
            <div
              className="sp-hero"
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.45fr) minmax(0, 1fr)",
                gap: 20,
                marginBottom: 20,
              }}
            >
              {/* Balance + mini metrics */}
              <div style={{ animation: "fadeUp 0.42s ease 0.06s both" }}>

                {/* Mini metric strip */}
                <div
                  className="sp-metrics"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <MiniMetric
                    label="Win Rate"
                    icon={TrendingUp}
                    value={isLoading ? "" : `${winRate}%`}
                    skeleton={isLoading}
                    colorVar={T.brandMid}
                    bgVar={T.brandLight}
                  />
                  <MiniMetric
                    label="Avg Deal"
                    icon={BarChart3}
                    value={isLoading ? "" : formatCurrency(avgDeal)}
                    skeleton={isLoading}
                    colorVar={T.accent}
                    bgVar={T.accentBg}
                  />
                  <MiniMetric
                    label="Volume"
                    icon={Zap}
                    value={isLoading ? "" : String(stats?.totalCount ?? 0)}
                    skeleton={isLoading}
                    colorVar={T.warning}
                    bgVar={T.warningBg}
                  />
                </div>
              </div>

              {/* RIGHT — live feed */}
              <div
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 22,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  animation: "fadeUp 0.42s ease 0.12s both",
                  minHeight: 460,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "18px 22px",
                    borderBottom: `1px solid ${T.border}`,
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        background: T.brandLight,
                        border: `1px solid ${T.brandBorder}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Activity style={{ width: 14, height: 14, color: T.brandMid }} />
                    </div>
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: T.text,
                        letterSpacing: "-0.02em",
                        fontFamily: "'Epilogue', sans-serif",
                      }}
                    >
                      Recent Activity
                    </span>
                  </div>
                  <Link
                    href="/billing/payments"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      color: T.brandMid,
                      textDecoration: "none",
                      letterSpacing: "0.02em",
                    }}
                  >
                    View all <ArrowRight style={{ width: 10, height: 10 }} />
                  </Link>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px 14px" }}>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          padding: "13px 10px",
                          borderBottom: `1px solid ${T.border}`,
                        }}
                      >
                        <Skeleton w={40} h={40} r={12} />
                        <div style={{ flex: 1 }}>
                          <Skeleton w="52%" h={12} />
                          <div style={{ marginTop: 6 }}>
                            <Skeleton w="30%" h={10} />
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-end",
                            gap: 6,
                          }}
                        >
                          <Skeleton w={68} h={14} />
                          <Skeleton w={54} h={16} r={6} />
                        </div>
                      </div>
                    ))
                  ) : recentPayments.length === 0 ? (
                    <div style={{ padding: "60px 0", textAlign: "center" }}>
                      <Wallet
                        style={{
                          width: 30,
                          height: 30,
                          color: T.textMute,
                          margin: "0 auto 12px",
                          display: "block",
                        }}
                      />
                      <p style={{ fontSize: 14, color: T.textSub, fontWeight: 600, margin: 0 }}>
                        No transactions yet
                      </p>
                      <p style={{ fontSize: 12, color: T.textMute, margin: "4px 0 0" }}>
                        Payments will appear here
                      </p>
                    </div>
                  ) : (
                    recentPayments.map((p, i) => (
                      <TxRow key={p._id} payment={p} idx={i} isHidden={isHidden} />
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <section style={{ marginBottom: 20, animation: "fadeUp 0.42s ease 0.16s both" }}>
              <div
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 22,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    padding: "18px 22px",
                    borderBottom: `1px solid ${T.border}`,
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: T.textMute,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        fontFamily: "var(--font-mono)",
                        margin: 0,
                      }}
                    >
                      Overview
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: T.textSub,
                        margin: "4px 0 0",
                      }}
                    >
                      Snapshot of the current billing position.
                    </p>
                  </div>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      background: T.brandLight,
                      border: `1px solid ${T.brandBorder}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <BarChart3 style={{ width: 15, height: 15, color: T.brandMid }} />
                  </div>
                </div>

                <div style={{ padding: 22 }}>
                  <div
                    className="sp-stats"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                      gap: 12,
                    }}
                  >
                    <StatCard
                      icon={CheckCircle2}
                      label="Revenue"
                      skeleton={isLoading}
                      value={isHidden ? "$ ••••" : formatCurrency(stats?.totalRevenue ?? 0)}
                      sub={`${succeeded?.count ?? 0} deals closed`}
                      colorVar={T.brandMid}
                      bgVar={T.brandLight}
                      delay={60}
                    />
                    <StatCard
                      icon={Zap}
                      label="Pending"
                      skeleton={isLoading}
                      value={isHidden ? "$ ••••" : formatCurrency(pending?.totalAmount ?? 0)}
                      sub={`${pending?.count ?? 0} awaiting`}
                      colorVar={T.warning}
                      bgVar={T.warningBg}
                      delay={110}
                    />
                    <StatCard
                      icon={XCircle}
                      label="Failed"
                      skeleton={isLoading}
                      value={isHidden ? "$ ••••" : formatCurrency(failed?.totalAmount ?? 0)}
                      sub={`${failed?.count ?? 0} failed`}
                      colorVar={T.danger}
                      bgVar={T.dangerBg}
                      delay={160}
                    />
                    <StatCard
                      icon={BarChart3}
                      label="All Time"
                      skeleton={isLoading}
                      value={String(stats?.totalCount ?? 0)}
                      sub="total payments"
                      colorVar={T.accent}
                      bgVar={T.accentBg}
                      delay={210}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Sections nav */}
            <section style={{ animation: "fadeUp 0.42s ease 0.22s both" }}>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: T.textMute,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-mono)",
                  margin: "0 0 14px",
                }}
              >
                Sections
              </p>
              <div
                className="sp-navs"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                  gap: 12,
                }}
              >
                <NavCard
                  href="/billing/payments"
                  icon={CreditCard}
                  title="Payments"
                  desc="Invoices, history & billing"
                  colorVar={T.brandMid}
                  bgVar={T.brandLight}
                  delay={60}
                />
                <NavCard
                  href="/billing/driver-payouts"
                  icon={Users}
                  title="Driver Payouts"
                  desc="Manage fleet driver payments"
                  colorVar={T.success}
                  bgVar={T.successBg}
                  delay={110}
                />
                <NavCard
                  href="/billing/awaiting-payment"
                  icon={AlertCircle}
                  title="Awaiting Payment"
                  desc="Outstanding invoices"
                  badge={pendingCount}
                  colorVar={T.warning}
                  bgVar={T.warningBg}
                  delay={160}
                />
                <NavCard
                  href="/billing/my-payments"
                  icon={Wallet}
                  title="My Payments"
                  desc="Your personal invoices"
                  colorVar={T.accent}
                  bgVar={T.accentBg}
                  delay={210}
                />
              </div>
            </section>

            {/* Footer */}
            <DashboardFooter />

          </div>
        </div>

        <CashInModal
          open={activeModal === "cashin"}
          onClose={() => setActiveModal(null)}
        />
        <ReceiveModal
          open={activeModal === "receive"}
          userId={userId}
          userName="Account"
          onClose={() => setActiveModal(null)}
        />
        <SendModal
          open={activeModal === "send"}
          onClose={() => setActiveModal(null)}
          onSuccess={() => { }}
          getToken={getToken}
        />
      </>
    </WiseProvider>
  );
}
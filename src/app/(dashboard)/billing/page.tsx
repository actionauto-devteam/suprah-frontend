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
  Clock,
} from "lucide-react";
import { CashInModal } from "@/components/CashInModal";
import { ReceiveModal } from "@/components/billing/ReceiveModal";
import { SendModal } from "@/components/billing/SendModal";

// Design Tokens
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
};

// Skeleton loader
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

// Status pill
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

// Transaction Row
function TxRow({
  payment,
  idx,
  isHidden,
}: {
  payment: Payment;
  idx: number;
  isHidden: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto auto",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 10,
        borderBottom: `1px solid ${T.border}`,
        alignItems: "center",
      }}
    >
      <div style={{ minWidth: 0 }}>
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
      <div>
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
      </div>
      <div>
        <StatusPill status={payment.status} />
      </div>
    </div>
  );
}

// Mini metric card
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
        borderRadius: 12,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: bgVar,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `1px solid ${T.border}`,
          flexShrink: 0,
        }}
      >
        <Icon style={{ width: 14, height: 14, color: colorVar }} />
      </div>
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
              fontSize: 16,
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

// Nav card
function NavCard({
  href,
  icon: Icon,
  title,
  desc,
  badge,
  colorVar,
  bgVar,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  desc: string;
  badge?: number;
  colorVar: string;
  bgVar: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: "16px 18px",
        textDecoration: "none",
        transition: "transform 0.18s ease, border-color 0.18s ease",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
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
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: T.text,
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </p>
        <p
          style={{
            fontSize: 11,
            color: T.textSub,
            margin: "3px 0 0",
            lineHeight: 1.4,
          }}
        >
          {desc}
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {badge !== undefined && badge > 0 && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              background: T.warningBg,
              color: T.warning,
              borderRadius: 6,
              padding: "2px 8px",
              fontFamily: "var(--font-mono)",
              border: `1px solid ${T.border}`,
            }}
          >
            {badge}
          </span>
        )}
        <ArrowRight
          style={{
            width: 12,
            height: 12,
            color: T.textMute,
          }}
        />
      </div>
    </Link>
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

          @keyframes skShimmer {
            0%,100% { opacity:1; }
            50%      { opacity:.4; }
          }
          @keyframes fadeUp {
            from { opacity:0; transform:translateY(8px); }
            to   { opacity:1; transform:translateY(0); }
          }

          * { box-sizing: border-box; }
          body { margin: 0; }

          .dashboard-content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 24px;
          }

          .dashboard-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 12px;
          }

          @media (max-width: 768px) {
            .dashboard-header { flex-direction: column; align-items: flex-start; }
            .dashboard-stats { grid-template-columns: 1fr 1fr; }
            .dashboard-content { grid-template-columns: 1fr; }
            .dashboard-recent { min-height: auto; }
          }

          @media (max-width: 480px) {
            .dashboard-stats { grid-template-columns: 1fr; }
          }
        `}</style>

        <div style={{ background: T.bg, minHeight: "100%", padding: "16px" }}>
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              padding: "12px 0 60px",
            }}
          >
            {/* Header */}
            <header
              className="dashboard-header"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 28,
                animation: "fadeUp 0.38s ease both",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h1
                  style={{
                    fontSize: 26,
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
                    margin: "6px 0 0",
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                  }}
                >
                  Payment Operations
                </p>
              </div>

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
                  borderRadius: 10,
                  background: T.brandLight,
                  border: `1px solid ${T.brandBorder}`,
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                  height: 40,
                }}
              >
                <Activity style={{ width: 12, height: 12 }} />
                All Payments
                <ArrowRight style={{ width: 11, height: 11, opacity: 0.7 }} />
              </Link>
            </header>

            {/* Wise Integration Section */}
            <section
              style={{
                marginBottom: 24,
                animation: "fadeUp 0.38s ease 0.04s both",
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: T.textMute,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-mono)",
                  margin: "0 0 12px",
                }}
              >
                Banking Layer
              </p>
              <WisePanel style={{ marginBottom: 0 }} />
            </section>

            {/* Stats Grid */}
            <section
              style={{
                marginBottom: 24,
                animation: "fadeUp 0.38s ease 0.08s both",
              }}
            >
              <div
                className="dashboard-stats"
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
                <MiniMetric
                  label="Pending"
                  icon={Clock}
                  value={isLoading ? "" : String(pending?.count ?? 0)}
                  skeleton={isLoading}
                  colorVar={T.accent}
                  bgVar={T.accentBg}
                />
              </div>
            </section>

            {/* Main Content Grid */}
            <div
              className="dashboard-content"
              style={{
                animation: "fadeUp 0.38s ease 0.12s both",
              }}
            >
              {/* Revenue & Status Cards */}
              <div
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 16,
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
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
                    Total Revenue
                  </p>
                  {isLoading ? (
                    <Skeleton w={140} h={32} r={6} />
                  ) : (
                    <p
                      style={{
                        fontSize: 32,
                        fontWeight: 700,
                        color: T.text,
                        margin: "8px 0 0",
                        letterSpacing: "-0.03em",
                        fontFamily: "'Epilogue', monospace",
                      }}
                    >
                      {isHidden
                        ? "$ ••••"
                        : formatCurrency(stats?.totalRevenue ?? 0)}
                    </p>
                  )}
                  <p
                    style={{
                      fontSize: 11,
                      color: T.textMute,
                      margin: "6px 0 0",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {succeeded?.count ?? 0} deals closed
                  </p>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      background: T.bg,
                      border: `1px solid ${T.border}`,
                      borderRadius: 10,
                      padding: "12px 14px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: T.textMute,
                        margin: 0,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      Pending
                    </p>
                    <p
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: T.warning,
                        margin: "6px 0 0",
                      }}
                    >
                      {pending?.count ?? 0}
                    </p>
                  </div>
                  <div
                    style={{
                      background: T.bg,
                      border: `1px solid ${T.border}`,
                      borderRadius: 10,
                      padding: "12px 14px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: T.textMute,
                        margin: 0,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      Failed
                    </p>
                    <p
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: T.danger,
                        margin: "6px 0 0",
                      }}
                    >
                      {failed?.count ?? 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div
                className="dashboard-recent"
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 16,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 320,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 20px",
                    borderBottom: `1px solid ${T.border}`,
                    flexShrink: 0,
                  }}
                >
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: T.text,
                      margin: 0,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    Recent Activity
                  </p>
                  <Link
                    href="/billing/payments"
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: T.brandMid,
                      textDecoration: "none",
                      letterSpacing: "0.02em",
                    }}
                  >
                    View all →
                  </Link>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 10px",
                          borderBottom: `1px solid ${T.border}`,
                        }}
                      >
                        <Skeleton w={40} h={40} r={10} />
                        <div style={{ flex: 1 }}>
                          <Skeleton w="50%" h={12} r={4} />
                          <div style={{ marginTop: 6 }}>
                            <Skeleton w="30%" h={10} r={4} />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : recentPayments.length === 0 ? (
                    <div
                      style={{
                        padding: "40px 20px",
                        textAlign: "center",
                      }}
                    >
                      <Wallet
                        style={{
                          width: 28,
                          height: 28,
                          color: T.textMute,
                          margin: "0 auto 8px",
                          display: "block",
                        }}
                      />
                      <p
                        style={{
                          fontSize: 13,
                          color: T.textSub,
                          fontWeight: 600,
                          margin: 0,
                        }}
                      >
                        No transactions yet
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

            {/* Navigation Cards */}
            <section
              style={{
                animation: "fadeUp 0.38s ease 0.16s both",
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: T.textMute,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-mono)",
                  margin: "0 0 12px",
                }}
              >
                Quick Access
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: 12,
                }}
              >
                <NavCard
                  href="/billing/payments"
                  icon={CreditCard}
                  title="Payments"
                  desc="Invoices & billing history"
                  colorVar={T.brandMid}
                  bgVar={T.brandLight}
                />
                <NavCard
                  href="/billing/driver-payouts"
                  icon={Users}
                  title="Driver Payouts"
                  desc="Manage driver payments"
                  colorVar={T.success}
                  bgVar={T.successBg}
                />
                <NavCard
                  href="/billing/awaiting-payment"
                  icon={AlertCircle}
                  title="Awaiting Payment"
                  desc="Outstanding invoices"
                  badge={pendingCount}
                  colorVar={T.warning}
                  bgVar={T.warningBg}
                />
                <NavCard
                  href="/billing/my-payments"
                  icon={Wallet}
                  title="My Payments"
                  desc="Personal invoices"
                  colorVar={T.accent}
                  bgVar={T.accentBg}
                />
              </div>
            </section>

            {/* Footer */}
            <footer
              style={{
                marginTop: 40,
                paddingTop: 20,
                borderTop: `1px solid ${T.border}`,
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  color: T.textMute,
                  margin: 0,
                  fontFamily: "'Epilogue', sans-serif",
                }}
              >
                © {new Date().getFullYear()} SuprahPay. All rights reserved.
              </p>
            </footer>
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
          onSuccess={() => {}}
          getToken={getToken}
        />
      </>
    </WiseProvider>
  );
}
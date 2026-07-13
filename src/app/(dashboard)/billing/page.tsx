"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { apiClient } from "@/lib/api-client";
import {
  LinkedAccountProvider,
  LinkedAccountPanel,
  useLinkedAccount,
} from "@/components/billing/LinkedAccountIntegration";
import { BalanceCard } from "@/components/billing/BalanceCard";
import { Payment, PaymentStats } from "@/types/billing";
import {
  T, FONT, numeric, GlobalStyle, Wordmark, Card, SectionLabel,
  Skeleton, StatusBadge, StatCard, IconBadge,
} from "@/components/billing/ui";
import {
  Activity, ArrowRight, CreditCard, Users, AlertCircle, Wallet,
  TrendingUp, Clock, Receipt, Banknote,
} from "lucide-react";
import { formatCurrency } from "@/utils/format";
import { CashInModal } from "@/components/CashInModal";
import { ReceiveModal } from "@/components/billing/ReceiveModal";
import { SendModal } from "@/components/billing/SendModal";

function TxRow({ payment, hidden }: { payment: Payment; hidden: boolean }) {
  const credit = payment.status === "succeeded";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center",
      gap: 12, padding: "12px 8px", borderBottom: `1px solid ${T.border}` }}>
      <div style={{ width: 38, height: 38, borderRadius: 11, background: credit ? T.successBg : T.surfaceAlt,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: FONT,
        fontWeight: 700, fontSize: 14, color: credit ? T.success : T.textSub }}>
        {(payment.customerName?.[0] ?? "?").toUpperCase()}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 13.5, fontWeight: 600, color: T.text, margin: 0,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{payment.customerName}</p>
        <p style={{ fontSize: 12, color: T.textMute, margin: "2px 0 0",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {payment.invoiceNumber ? `#${payment.invoiceNumber}` : payment.description}
        </p>
      </div>
      <div style={{ textAlign: "right" }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0, ...numeric }}>
          {hidden ? "$ •••••" : formatCurrency(payment.amount)}
        </p>
        <div style={{ marginTop: 4 }}><StatusBadge status={payment.status} /></div>
      </div>
    </div>
  );
}

/* ── Nav card (unchanged) ─────────────────────────────────────────────────── */
function NavCard({ href, icon, title, desc, badge, color, bg }: {
  href: string; icon: React.ElementType; title: string; desc: string;
  badge?: number; color: string; bg: string;
}) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <Card pad="16px 18px" style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
        <IconBadge icon={icon} color={color} bg={bg} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: T.text, margin: 0 }}>{title}</p>
          <p style={{ fontSize: 12, color: T.textSub, margin: "3px 0 0", lineHeight: 1.4 }}>{desc}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {badge !== undefined && badge > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, background: T.warningBg, color: T.warning,
              borderRadius: 8, padding: "2px 8px", ...numeric }}>{badge}</span>
          )}
          <ArrowRight style={{ width: 14, height: 14, color: T.textMute }} />
        </div>
      </Card>
    </Link>
  );
}

/* ── Inner dashboard (lives inside LinkedAccountProvider) ─────────────────── */
function BillingDashboardInner() {
  const { getToken, userId: authUserId } = useAuth();
  const linked = useLinkedAccount(); // connected balance drives the wallet

  const [stats, setStats] = React.useState<PaymentStats | null>(null);
  const [recentPayments, setRecentPayments] = React.useState<Payment[]>([]);
  const [allPayments, setAllPayments] = React.useState<Payment[]>([]);
  const [pendingCount, setPendingCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hidden] = React.useState(false);
  const [activeModal, setActiveModal] = React.useState<"receive" | "send" | "cashin" | null>(null);

  const userId = authUserId ?? "USR-0000";

  const extractPayments = React.useCallback((payload: any): Payment[] => {
    const data = payload?.data;
    if (Array.isArray(data)) return data as Payment[];
    if (Array.isArray(data?.payments)) return data.payments as Payment[];
    if (Array.isArray(payload?.payments)) return payload.payments as Payment[];
    if (Array.isArray(payload)) return payload as Payment[];
    return [];
  }, []);

  const normalizeStats = React.useCallback((raw: any): PaymentStats | null => {
    if (!raw || typeof raw !== "object") return null;
    if (raw.byStatus && typeof raw.byStatus === "object") {
      return {
        byStatus: raw.byStatus,
        totalCount: Number(raw.totalCount ?? 0),
        totalRevenue: Number(raw.totalRevenue ?? 0),
        pendingAmount: Number(raw.pendingAmount ?? 0),
      };
    }
    return null;
  }, []);

  const buildStatsFromPayments = React.useCallback((payments: Payment[]): PaymentStats => {
    const empty = {
      pending: { count: 0, totalAmount: 0 }, processing: { count: 0, totalAmount: 0 },
      succeeded: { count: 0, totalAmount: 0 }, failed: { count: 0, totalAmount: 0 },
      refunded: { count: 0, totalAmount: 0 }, cancelled: { count: 0, totalAmount: 0 },
    };
    const byStatus = payments.reduce<Record<string, { count: number; totalAmount: number }>>((acc, p) => {
      const s = p.status ?? "pending";
      if (!acc[s]) acc[s] = { count: 0, totalAmount: 0 };
      acc[s].count += 1; acc[s].totalAmount += Number(p.amount ?? 0);
      return acc;
    }, { ...empty });
    return {
      byStatus, totalCount: payments.length,
      totalRevenue: Number(byStatus.succeeded?.totalAmount ?? 0),
      pendingAmount: Number(byStatus.pending?.totalAmount ?? 0) + Number(byStatus.failed?.totalAmount ?? 0),
    };
  }, []);

  const load = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [paymentsRes, statsRes, pendingRes] = await Promise.allSettled([
        apiClient.get("/api/payments", { headers, params: { limit: "6" } }),
        apiClient.get("/api/payments/stats", { headers }),
        apiClient.get("/api/payments/pending", { headers }),
      ]);

      const loaded = paymentsRes.status === "fulfilled" ? extractPayments(paymentsRes.value.data) : [];
      const loadedPending = pendingRes.status === "fulfilled" ? extractPayments(pendingRes.value.data) : [];

      const uniq = new Map<string, Payment>();
      [...loaded, ...loadedPending].forEach((p) => { if (p?._id) uniq.set(p._id, p); });
      const merged = Array.from(uniq.values()).sort(
        (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
      );

      setAllPayments(merged);
      setRecentPayments(merged.slice(0, 6));

      if (statsRes.status === "fulfilled") {
        setStats(normalizeStats(statsRes.value.data?.data) ?? buildStatsFromPayments(merged));
      } else {
        setStats(buildStatsFromPayments(merged));
      }

      setPendingCount(
        loadedPending.length ||
        merged.filter((p) => p.status === "pending" || p.status === "failed").length,
      );
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [buildStatsFromPayments, extractPayments, getToken, normalizeStats]);

  React.useEffect(() => { load(); }, [load]);

  // Wallet balance now comes from the connected account (REPLACE model).
  const displayBalance = linked.connected ? linked.walletBalance : 0;
  const balanceLoading = isLoading || linked.loading;

  const pending = stats?.byStatus?.pending;
  const failed = stats?.byStatus?.failed;
  const hasAnyData = (stats?.totalCount ?? 0) > 0 || allPayments.length > 0 || pendingCount > 0;

  const metrics = [
    { label: "Total received", value: formatCurrency(stats?.totalRevenue ?? 0),
      hint: `${stats?.byStatus?.succeeded?.count ?? 0} settled`, icon: TrendingUp, color: T.success, bg: T.successBg },
    { label: "Pending amount", value: formatCurrency(stats?.pendingAmount ?? 0),
      hint: `${pending?.count ?? 0} invoices`, icon: Clock, color: T.warning, bg: T.warningBg },
    { label: "Transactions", value: String(stats?.totalCount ?? 0),
      hint: "all time", icon: Receipt, color: T.info, bg: T.infoBg },
    { label: "Failed", value: String(failed?.count ?? 0),
      hint: "need review", icon: AlertCircle, color: T.danger, bg: T.dangerBg },
  ];

  return (
    <>
      <GlobalStyle />
      <div style={{ background: T.bg, minHeight: "100%", fontFamily: FONT }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 16px 64px" }}>
          {/* Header */}
          <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 24, gap: 16, flexWrap: "wrap", animation: "spy-fade-up 0.35s ease both" }}>
            <div>
              <Wordmark size={26} />
              <p style={{ fontSize: 13, color: T.textSub, margin: "6px 0 0" }}>Payment dashboard</p>
            </div>
            <Link href="/billing/payments" style={{ display: "inline-flex", alignItems: "center", gap: 8,
              fontSize: 13, fontWeight: 600, color: T.brand, textDecoration: "none", padding: "9px 16px",
              borderRadius: 12, background: T.brandSoft, border: `1px solid ${T.brandBorder}` }}>
              <Activity style={{ width: 14, height: 14 }} /> All payments
              <ArrowRight style={{ width: 13, height: 13 }} />
            </Link>
          </header>

          {/* Hero balance + metrics */}
          <div className="spy-hero-grid" style={{ display: "grid",
            gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 1fr)", gap: 18, marginBottom: 18,
            alignItems: "stretch", animation: "spy-fade-up 0.35s ease 0.04s both" }}>
            <BalanceCard
              balance={displayBalance}
              userId={userId}
              userName={linked.status?.primary?.profile.fullName ?? "SuprahPay Account"}
              isLoading={balanceLoading}
              stats={stats}
              onReceive={() => setActiveModal("receive")}
              onSend={() => setActiveModal("send")}
              onLinkWise={() => linked.connect("wise")}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {metrics.map((m) => (
                <StatCard key={m.label} label={m.label} value={m.value} hint={m.hint}
                  icon={m.icon} color={m.color} bg={m.bg} loading={isLoading} />
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <section style={{ marginBottom: 18, animation: "spy-fade-up 0.35s ease 0.08s both" }}>
            <Card pad={0}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "16px 20px", borderBottom: `1px solid ${T.border}` }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>Recent activity</p>
                <Link href="/billing/payments" style={{ fontSize: 13, fontWeight: 600, color: T.brand, textDecoration: "none" }}>
                  View all →
                </Link>
              </div>
              <div style={{ padding: "6px 12px" }}>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 8px", borderBottom: `1px solid ${T.border}` }}>
                      <Skeleton w={38} h={38} r={11} />
                      <div style={{ flex: 1 }}>
                        <Skeleton w="45%" h={12} />
                        <div style={{ marginTop: 6 }}><Skeleton w="28%" h={10} /></div>
                      </div>
                    </div>
                  ))
                ) : recentPayments.length === 0 ? (
                  <div style={{ padding: "40px 20px", textAlign: "center" }}>
                    <Wallet style={{ width: 28, height: 28, color: T.textMute, margin: "0 auto 10px", display: "block" }} />
                    <p style={{ fontSize: 13.5, color: T.textSub, fontWeight: 600, margin: 0 }}>
                      {hasAnyData ? "Syncing recent records…" : "No transactions yet"}
                    </p>
                  </div>
                ) : (
                  recentPayments.map((p) => <TxRow key={p._id} payment={p} hidden={hidden} />)
                )}
              </div>
            </Card>
          </section>

          {/* Linked account (Wise) */}
          <section style={{ marginBottom: 24, animation: "spy-fade-up 0.35s ease 0.10s both" }}>
            <SectionLabel>Linked bank account</SectionLabel>
            <LinkedAccountPanel style={{ marginBottom: 0 }} />
          </section>

          {/* Quick access (unchanged) */}
          <section style={{ animation: "spy-fade-up 0.35s ease 0.12s both" }}>
            <SectionLabel>Quick access</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              <NavCard href="/billing/payments" icon={CreditCard} title="Payments"
                desc="Invoices & billing history" color={T.brand} bg={T.brandSoft} />
              <NavCard href="/billing/driver-payouts" icon={Users} title="Driver payouts"
                desc="Manage driver payments" color={T.success} bg={T.successBg} />
              <NavCard href="/billing/awaiting-payment" icon={Banknote} title="Awaiting payment"
                desc="Outstanding invoices" badge={pendingCount} color={T.warning} bg={T.warningBg} />
              <NavCard href="/billing/my-payments" icon={Wallet} title="My payments"
                desc="Personal invoices" color={T.info} bg={T.infoBg} />
            </div>
          </section>

          <footer style={{ marginTop: 36, paddingTop: 20, borderTop: `1px solid ${T.border}`, textAlign: "center" }}>
            <p style={{ fontSize: 12.5, color: T.textMute, margin: 0 }}>
              © {new Date().getFullYear()} SuprahPay. All rights reserved.
            </p>
          </footer>
        </div>
      </div>

      <style>{`@media (max-width: 820px){.spy-hero-grid{grid-template-columns:1fr !important;}}`}</style>

      <CashInModal open={activeModal === "cashin"} onClose={() => setActiveModal(null)} />
      <ReceiveModal open={activeModal === "receive"} userId={userId}
        userName={linked.status?.primary?.profile.fullName ?? "SuprahPay Account"}
        onClose={() => setActiveModal(null)} />
      <SendModal
        open={activeModal === "send"}
        onClose={() => setActiveModal(null)}
        onSuccess={() => { load(); linked.sync(); }}
        getToken={getToken}
      />
    </>
  );
}

export default function BillingDashboard() {
  return (
    <LinkedAccountProvider>
      <BillingDashboardInner />
    </LinkedAccountProvider>
  );
}
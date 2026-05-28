"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/providers/AuthProvider";
import { apiClient } from "@/lib/api-client";
import { Payment } from "@/types/billing";
import { formatCurrency } from "@/utils/format";
import {
  AlertCircle,
  ChevronLeft,
  Clock3,
  DollarSign,
  Loader2,
  Receipt,
  RefreshCw,
  Search,
  Send,
  TrendingUp,
} from "lucide-react";

const T = {
  bg: "var(--awaiting-bg, var(--background))",
  surface: "var(--awaiting-surface, var(--card))",
  border: "var(--awaiting-border, var(--border))",
  borderHi: "var(--awaiting-border-hi, var(--border))",
  text: "var(--awaiting-text, var(--foreground))",
  textSub: "var(--awaiting-text-sub, var(--muted-foreground))",
  textMute: "var(--awaiting-text-mute, var(--muted-foreground))",
  green: "var(--awaiting-green, #16A34A)",
  greenBg: "var(--awaiting-green-bg, rgba(34,197,94,0.12))",
  amber: "var(--awaiting-amber, #D97706)",
  amberBg: "var(--awaiting-amber-bg, rgba(217,119,6,0.12))",
  red: "var(--awaiting-red, #DC2626)",
  redBg: "var(--awaiting-red-bg, rgba(220,38,38,0.12))",
  blue: "var(--awaiting-blue, #2563EB)",
  blueBg: "var(--awaiting-blue-bg, rgba(37,99,235,0.12))",
};

type RequestState = "idle" | "loading" | "success" | "error";

type AwaitingStatus = "all" | "pending" | "failed";

function Skeleton({
  width,
  height,
  radius = 8,
}: {
  width: number | string;
  height: number | string;
  radius?: number;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background:
          "linear-gradient(90deg, rgba(148,163,184,0.14), rgba(148,163,184,0.24), rgba(148,163,184,0.14))",
        backgroundSize: "200% 100%",
        animation: "skeletonShimmer 1.4s ease-in-out infinite",
      }}
    />
  );
}

function StatusBadge({ status }: { status: Payment["status"] }) {
  const map: Record<string, { c: string; bg: string }> = {
    pending: { c: "#CA8A04", bg: "rgba(250,204,21,0.24)" },
    failed: { c: "#DC2626", bg: "rgba(248,113,113,0.24)" },
    processing: { c: "#2563EB", bg: "rgba(96,165,250,0.24)" },
    succeeded: { c: "#16A34A", bg: "rgba(34,197,94,0.18)" },
    cancelled: { c: T.textSub, bg: T.surface },
    refunded: { c: "#64748B", bg: "rgba(148,163,184,0.2)" },
  };

  const cfg = map[status] ?? map.cancelled;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        fontWeight: 600,
        color: cfg.c,
        background: cfg.bg,
        borderRadius: 999,
        padding: "4px 10px",
        lineHeight: 1,
        textTransform: "capitalize",
      }}
    >
      {status}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}) {
  return (
    <div
      style={{
        background: T.surface,
        border: `0.5px solid ${T.border}`,
        borderRadius: 12,
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
        }}
      >
        <Icon style={{ width: 14, height: 14, color }} />
      </div>
      <p
        style={{
          fontSize: 11,
          color: T.textMute,
          margin: 0,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontWeight: 700,
        }}
      >
        {label}
      </p>
      <p style={{ fontSize: 24, fontWeight: 700, color: T.text, margin: "6px 0 0" }}>
        {value}
      </p>
      <p style={{ fontSize: 11, color: T.textSub, margin: "4px 0 0" }}>{sub}</p>
    </div>
  );
}

export default function AwaitingPaymentPage() {
  const { theme } = useTheme();
  const { getToken } = useAuth();
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<AwaitingStatus>("all");
  const [requestStates, setRequestStates] = React.useState<Record<string, RequestState>>({});

  const authHeaders = React.useCallback(async () => {
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getToken]);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const headers = await authHeaders();
      const res = await apiClient.get("/api/payments/pending", { headers });
      setPayments(res.data.data ?? []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [authHeaders]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRequest = async (payment: Payment) => {
    setRequestStates((prev) => ({ ...prev, [payment._id]: "loading" }));
    try {
      await apiClient.post(
        `/api/payments/${payment._id}/request`,
        {},
        { headers: await authHeaders() },
      );
      setRequestStates((prev) => ({ ...prev, [payment._id]: "success" }));
      setTimeout(() => {
        setRequestStates((prev) => ({ ...prev, [payment._id]: "idle" }));
      }, 2500);
    } catch (error) {
      console.error(error);
      setRequestStates((prev) => ({ ...prev, [payment._id]: "error" }));
      setTimeout(() => {
        setRequestStates((prev) => ({ ...prev, [payment._id]: "idle" }));
      }, 2500);
    }
  };

  const filteredPayments = React.useMemo(() => {
    const q = search.trim().toLowerCase();

    return payments.filter((payment) => {
      if (statusFilter !== "all" && payment.status !== statusFilter) return false;

      if (!q) return true;
      return (
        payment.customerName?.toLowerCase().includes(q) ||
        payment.customerEmail?.toLowerCase().includes(q) ||
        payment.description?.toLowerCase().includes(q) ||
        payment.invoiceNumber?.toLowerCase().includes(q)
      );
    });
  }, [payments, search, statusFilter]);

  const totalOutstanding = React.useMemo(
    () => payments.reduce((sum, payment) => sum + payment.amount, 0),
    [payments],
  );

  const overdueCount = React.useMemo(
    () =>
      payments.filter(
        (payment) =>
          payment.dueDate &&
          new Date(payment.dueDate).getTime() < Date.now() &&
          (payment.status === "pending" || payment.status === "failed"),
      ).length,
    [payments],
  );

  const avgInvoice = payments.length ? totalOutstanding / payments.length : 0;

  const statusCounts = React.useMemo(
    () => ({
      all: payments.length,
      pending: payments.filter((payment) => payment.status === "pending").length,
      failed: payments.filter((payment) => payment.status === "failed").length,
    }),
    [payments],
  );

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes skeletonShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .awaiting-payment-theme {
          --awaiting-bg: var(--background);
          --awaiting-surface: var(--card);
          --awaiting-border: var(--border);
          --awaiting-border-hi: var(--input);
          --awaiting-text: var(--foreground);
          --awaiting-text-sub: var(--muted-foreground);
          --awaiting-text-mute: var(--muted-foreground);
          --awaiting-green: #16A34A;
          --awaiting-green-bg: rgba(34, 197, 94, 0.12);
          --awaiting-amber: #B45309;
          --awaiting-amber-bg: rgba(217, 119, 6, 0.12);
          --awaiting-red: #DC2626;
          --awaiting-red-bg: rgba(220, 38, 38, 0.12);
          --awaiting-blue: #2563EB;
          --awaiting-blue-bg: rgba(37, 99, 235, 0.12);
        }
        .awaiting-payment-theme[data-theme="dark"] {
          --awaiting-bg: var(--background);
          --awaiting-surface: var(--card);
          --awaiting-border: var(--border);
          --awaiting-border-hi: var(--input);
          --awaiting-text: var(--foreground);
          --awaiting-text-sub: var(--muted-foreground);
          --awaiting-text-mute: var(--muted-foreground);
        }
      `}</style>

      <div
        className="awaiting-payment-theme"
        data-theme={theme}
        style={{ background: T.bg, minHeight: "100%", colorScheme: theme }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "24px 20px 60px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <Link
              href="/billing"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: T.textMute,
                textDecoration: "none",
                fontSize: 12,
              }}
            >
              <ChevronLeft style={{ width: 14, height: 14 }} /> Dashboard
            </Link>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: T.text }}>
              Awaiting Payment
            </h1>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <SummaryCard
              label="Outstanding"
              value={formatCurrency(totalOutstanding)}
              sub={`${payments.length} invoices`}
              icon={DollarSign}
              color={T.blue}
              bg={T.blueBg}
            />
            <SummaryCard
              label="Pending"
              value={String(statusCounts.pending)}
              sub={formatCurrency(
                payments
                  .filter((payment) => payment.status === "pending")
                  .reduce((sum, payment) => sum + payment.amount, 0),
              )}
              icon={Clock3}
              color={T.amber}
              bg={T.amberBg}
            />
            <SummaryCard
              label="Failed"
              value={String(statusCounts.failed)}
              sub={formatCurrency(
                payments
                  .filter((payment) => payment.status === "failed")
                  .reduce((sum, payment) => sum + payment.amount, 0),
              )}
              icon={AlertCircle}
              color={T.red}
              bg={T.redBg}
            />
            <SummaryCard
              label="Average"
              value={formatCurrency(avgInvoice)}
              sub={`${overdueCount} overdue`}
              icon={TrendingUp}
              color={T.green}
              bg={T.greenBg}
            />
          </div>

          <div
            style={{
              background: T.surface,
              border: `0.5px solid ${T.border}`,
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                padding: 12,
                alignItems: "center",
                borderBottom: `0.5px solid ${T.border}`,
              }}
            >
              <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 420 }}>
                <Search
                  style={{
                    position: "absolute",
                    left: 11,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 13,
                    height: 13,
                    color: T.textMute,
                  }}
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search customer, email, invoice..."
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    paddingLeft: 32,
                    paddingRight: 12,
                    paddingTop: 9,
                    paddingBottom: 9,
                    background: T.surface,
                    border: `0.5px solid ${T.borderHi}`,
                    borderRadius: "var(--border-radius-md)",
                    color: T.text,
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>

              <button
                type="button"
                onClick={fetchData}
                style={{
                  marginLeft: "auto",
                  padding: "8px 10px",
                  background: "transparent",
                  border: `0.5px solid ${T.border}`,
                  borderRadius: 10,
                  cursor: "pointer",
                  color: T.textMute,
                  display: "flex",
                }}
              >
                <RefreshCw style={{ width: 13, height: 13 }} />
              </button>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                padding: 10,
                borderBottom: `0.5px solid ${T.border}`,
                overflowX: "auto",
              }}
            >
              {(["all", "pending", "failed"] as AwaitingStatus[]).map((status) => {
                const active = statusFilter === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: `0.5px solid ${active ? "#3B82F6" : "transparent"}`,
                      background: active ? "rgba(59,130,246,0.14)" : "transparent",
                      color: active ? "#3B82F6" : T.textSub,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      textTransform: "capitalize",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {status} ({statusCounts[status]})
                  </button>
                );
              })}
            </div>

            <div style={{ overflowX: "auto" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr 0.8fr 0.7fr 0.8fr 0.8fr",
                gap: 12,
                padding: "10px 16px",
                borderBottom: `0.5px solid ${T.border}`,
                background: T.bg,
                minWidth: 600,
              }}
            >
              {[
                "Customer",
                "Invoice",
                "Amount",
                "Status",
                "Due Date",
                "Action",
              ].map((head) => (
                <span
                  key={head}
                  style={{
                    fontSize: 11,
                    color: T.textMute,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontWeight: 700,
                  }}
                >
                  {head}
                </span>
              ))}
            </div>

            {isLoading ? (
              <div style={{ padding: "6px 16px 14px" }}>
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={`skeleton-row-${idx}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 1fr 0.8fr 0.7fr 0.8fr 0.8fr",
                      gap: 12,
                      padding: "13px 0",
                      borderBottom: idx === 5 ? "none" : `0.5px solid ${T.border}`,
                      alignItems: "center",
                    }}
                  >
                    <Skeleton width="80%" height={14} radius={5} />
                    <Skeleton width="76%" height={14} radius={5} />
                    <Skeleton width="58%" height={14} radius={5} />
                    <Skeleton width="64%" height={22} radius={999} />
                    <Skeleton width="70%" height={14} radius={5} />
                    <Skeleton width="90%" height={30} radius={8} />
                  </div>
                ))}
              </div>
            ) : filteredPayments.length === 0 ? (
              <div style={{ padding: "48px 0", textAlign: "center" }}>
                <Receipt
                  style={{
                    width: 28,
                    height: 28,
                    color: T.textMute,
                    display: "block",
                    margin: "0 auto 10px",
                  }}
                />
                <p style={{ fontSize: 13, color: T.textSub, margin: 0 }}>
                  No invoices awaiting payment found
                </p>
              </div>
            ) : (
              filteredPayments.map((payment) => {
                const requestState = requestStates[payment._id] ?? "idle";
                const isOverdue =
                  payment.dueDate && new Date(payment.dueDate).getTime() < Date.now();

                return (
                  <div
                    key={payment._id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 1fr 0.8fr 0.7fr 0.8fr 0.8fr",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 16px",
                      borderBottom: `0.5px solid ${T.border}`,
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
                        }}
                      >
                        {payment.customerName}
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: T.textMute,
                          margin: "3px 0 0",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {payment.customerEmail}
                      </p>
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 12,
                          color: T.textSub,
                          margin: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontWeight: 500,
                        }}
                      >
                        {payment.invoiceNumber ? `#${payment.invoiceNumber}` : "No invoice #"}
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: T.textMute,
                          margin: "3px 0 0",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {payment.description}
                      </p>
                    </div>

                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: T.text,
                        margin: 0,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatCurrency(payment.amount)}
                    </p>

                    <StatusBadge status={payment.status} />

                    <p
                      style={{
                        fontSize: 12,
                        color: isOverdue ? T.red : T.textSub,
                        margin: 0,
                        whiteSpace: "nowrap",
                        fontWeight: isOverdue ? 600 : 400,
                      }}
                    >
                      {payment.dueDate
                        ? new Date(payment.dueDate).toLocaleDateString()
                        : "No due date"}
                    </p>

                    <button
                      type="button"
                      onClick={() => handleRequest(payment)}
                      disabled={requestState === "loading"}
                      style={{
                        justifySelf: "start",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "7px 10px",
                        borderRadius: 8,
                        border: "none",
                        background:
                          requestState === "success"
                            ? T.green
                            : requestState === "error"
                              ? T.red
                              : "#2563EB",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: requestState === "loading" ? "not-allowed" : "pointer",
                        opacity: requestState === "loading" ? 0.75 : 1,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {requestState === "loading" ? (
                        <Loader2
                          style={{
                            width: 12,
                            height: 12,
                            animation: "spin 1s linear infinite",
                          }}
                        />
                      ) : (
                        <Send style={{ width: 12, height: 12 }} />
                      )}
                      {requestState === "success"
                        ? "Sent"
                        : requestState === "error"
                          ? "Retry"
                          : "Request"}
                    </button>
                  </div>
                );
              })
            )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

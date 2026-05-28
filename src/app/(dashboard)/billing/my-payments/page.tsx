"use client";

import * as React from "react";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useAuth } from "@/providers/AuthProvider";
import { apiClient } from "@/lib/api-client";
import { Payment } from "@/types/billing";
import { formatCurrency } from "@/utils/format";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  CreditCard,
  ExternalLink,
  Loader2,
  Receipt,
  RefreshCw,
  Search,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const T = {
  bg: "var(--color-background-tertiary, var(--background))",
  surface: "var(--color-background-secondary, var(--card))",
  hi: "var(--color-background-primary, var(--popover))",
  border: "var(--color-border-tertiary, var(--border))",
  borderHi: "var(--color-border-secondary, var(--border))",
  text: "var(--color-text-primary, var(--foreground))",
  textSub: "var(--color-text-secondary, var(--muted-foreground))",
  textMute: "var(--color-text-tertiary, var(--muted-foreground))",
  accent: "var(--color-text-info, #2563EB)",
  accentBg: "var(--color-background-info, rgba(37,99,235,0.12))",
  green: "var(--color-text-success, #22C55E)",
  greenBg: "var(--color-background-success, rgba(34,197,94,0.12))",
  amber: "var(--color-text-warning, #D97706)",
  amberBg: "var(--color-background-warning, rgba(217,119,6,0.12))",
  red: "var(--color-text-danger, #DC2626)",
  redBg: "var(--color-background-danger, rgba(220,38,38,0.12))",
};

function StatusBadge({ status }: { status: Payment["status"] }) {
  const map: Record<string, { c: string; bg: string }> = {
    succeeded: { c: "#16A34A", bg: "rgba(34,197,94,0.18)" },
    pending: { c: "#CA8A04", bg: "rgba(250,204,21,0.24)" },
    failed: { c: "#DC2626", bg: "rgba(248,113,113,0.24)" },
    processing: { c: "#2563EB", bg: "rgba(96,165,250,0.24)" },
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

function PaymentForm({
  payment,
  onSuccess,
  onClose,
  getToken,
}: {
  payment: Payment;
  onSuccess: () => void;
  onClose: () => void;
  getToken: () => Promise<string | null>;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [status, setStatus] = React.useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setStatus("submitting");
    setErrorMsg(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setStatus("error");
      setErrorMsg(submitError.message ?? "Validation error");
      return;
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message ?? "Payment failed");
      return;
    }

    try {
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await apiClient.post(
        "/api/payments/confirm-customer",
        { paymentIntentId: paymentIntent?.id },
        { headers },
      );
      setStatus("success");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1600);
    } catch {
      setStatus("error");
      setErrorMsg("Payment processed but confirmation failed. Contact support.");
    }
  };

  if (status === "success") {
    return (
      <div style={{ textAlign: "center", padding: "32px 0" }}>
        <CheckCircle2
          style={{
            width: 44,
            height: 44,
            color: T.green,
            display: "block",
            margin: "0 auto 14px",
          }}
        />
        <p style={{ fontSize: 16, fontWeight: 600, color: T.text, margin: 0 }}>
          Payment successful
        </p>
        <p style={{ fontSize: 13, color: T.textSub, margin: "6px 0 0" }}>
          Your receipt will be available shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          background: T.surface,
          border: `0.5px solid ${T.border}`,
          borderRadius: "var(--border-radius-md)",
          padding: "14px 16px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ fontSize: 13, color: T.textSub, margin: 0 }}>{payment.description}</p>
            {payment.invoiceNumber && (
              <p
                style={{
                  fontSize: 11,
                  color: T.textMute,
                  fontFamily: "var(--font-mono)",
                  margin: "3px 0 0",
                }}
              >
                #{payment.invoiceNumber}
              </p>
            )}
          </div>
          <p style={{ fontSize: 20, fontWeight: 600, color: T.text, margin: 0 }}>
            {formatCurrency(payment.amount)}
          </p>
        </div>
      </div>

      <div style={{ borderRadius: "var(--border-radius-md)", overflow: "hidden" }}>
        <PaymentElement options={{ layout: "tabs" }} />
      </div>

      {errorMsg && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            background: T.redBg,
            border: `0.5px solid ${T.red}`,
            borderRadius: "var(--border-radius-md)",
          }}
        >
          <AlertCircle style={{ width: 13, height: 13, color: T.red, flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: T.red, margin: 0 }}>{errorMsg}</p>
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            flex: 1,
            padding: "11px 0",
            background: "transparent",
            border: `0.5px solid ${T.borderHi}`,
            borderRadius: "var(--border-radius-md)",
            color: T.textSub,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || status === "submitting"}
          style={{
            flex: 2,
            padding: "11px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            background: status === "submitting" ? T.accentBg : T.accent,
            border: "none",
            borderRadius: "var(--border-radius-md)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: status === "submitting" ? "not-allowed" : "pointer",
          }}
        >
          {status === "submitting" ? (
            <>
              <Loader2
                style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }}
              />
              Processing...
            </>
          ) : (
            <>
              <CreditCard style={{ width: 14, height: 14 }} />
              Pay {formatCurrency(payment.amount)}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function PayModal({
  payment,
  onClose,
  onSuccess,
  getToken,
}: {
  payment: Payment;
  onClose: () => void;
  onSuccess: () => void;
  getToken: () => Promise<string | null>;
}) {
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const token = await getToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await apiClient.post(
          "/api/payments/create-customer-intent",
          { paymentId: payment._id },
          { headers },
        );

        if (!mounted) return;
        setClientSecret(response.data.data.clientSecret);
      } catch (err: unknown) {
        if (!mounted) return;
        const message: string =
          typeof err === "object" &&
          err !== null &&
          "response" in err &&
          typeof (err as { response?: { data?: { message?: unknown } } }).response?.data
            ?.message === "string"
            ? (err as { response?: { data?: { message?: string } } }).response?.data
                ?.message ?? "Failed to initialize payment."
            : "Failed to initialize payment.";
        setError(message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [getToken, payment._id]);

  const appearance = {
    theme: "stripe" as const,
    variables: {
      colorPrimary: "#2563EB",
      borderRadius: "8px",
      fontSizeBase: "14px",
    },
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: T.hi,
          border: `0.5px solid ${T.borderHi}`,
          borderRadius: "var(--border-radius-lg)",
          padding: "24px",
          width: "100%",
          maxWidth: 460,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: T.text, margin: 0 }}>
              Complete payment
            </h2>
            <p
              style={{
                fontSize: 12,
                color: T.textMute,
                margin: "3px 0 0",
                fontFamily: "var(--font-mono)",
              }}
            >
              Secured by Stripe
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: T.textSub,
              padding: 4,
              display: "flex",
            }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <Loader2
              style={{
                width: 24,
                height: 24,
                color: T.accent,
                animation: "spin 1s linear infinite",
                display: "block",
                margin: "0 auto",
              }}
            />
            <p style={{ fontSize: 13, color: T.textSub, marginTop: 12 }}>
              Initializing payment...
            </p>
          </div>
        )}

        {error && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <AlertCircle
              style={{
                width: 32,
                height: 32,
                color: T.red,
                display: "block",
                margin: "0 auto 12px",
              }}
            />
            <p style={{ fontSize: 13, color: T.red, margin: 0 }}>{error}</p>
          </div>
        )}

        {!loading && !error && clientSecret && (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
            <PaymentForm
              payment={payment}
              onSuccess={onSuccess}
              onClose={onClose}
              getToken={getToken}
            />
          </Elements>
        )}
      </div>
    </div>
  );
}

type FilterStatus =
  | "all"
  | "action_required"
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "refunded";

export default function MyPaymentsPage() {
  const { getToken } = useAuth();
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [stats, setStats] = React.useState<{
    totalOwed: number;
    totalPaid: number;
    pendingCount: number;
  } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<FilterStatus>("all");
  const [payTarget, setPayTarget] = React.useState<Payment | null>(null);

  const load = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await apiClient.get("/api/payments/my-payments", { headers });
      setPayments(response.data.data.payments ?? []);
      setStats(response.data.data.stats ?? null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  React.useEffect(() => {
    load();
  }, [load]);

  const statusCounts = React.useMemo(() => {
    const counts: Record<FilterStatus, number> = {
      all: payments.length,
      action_required: 0,
      pending: 0,
      processing: 0,
      succeeded: 0,
      failed: 0,
      cancelled: 0,
      refunded: 0,
    };

    payments.forEach((payment) => {
      if (payment.status in counts) {
        counts[payment.status as FilterStatus] += 1;
      }
      if (payment.status === "pending" || payment.status === "failed") {
        counts.action_required += 1;
      }
    });

    return counts;
  }, [payments]);

  const filteredPayments = React.useMemo(() => {
    const query = search.trim().toLowerCase();

    return payments.filter((payment) => {
      if (statusFilter === "action_required") {
        if (payment.status !== "pending" && payment.status !== "failed") return false;
      } else if (statusFilter !== "all" && payment.status !== statusFilter) {
        return false;
      }

      if (!query) return true;

      return (
        payment.description?.toLowerCase().includes(query) ||
        payment.invoiceNumber?.toLowerCase().includes(query) ||
        payment.customerName?.toLowerCase().includes(query) ||
        payment.customerEmail?.toLowerCase().includes(query)
      );
    });
  }, [payments, search, statusFilter]);

  const actionRequiredAmount = React.useMemo(
    () =>
      payments
        .filter((payment) => payment.status === "pending" || payment.status === "failed")
        .reduce((sum, payment) => sum + payment.amount, 0),
    [payments],
  );

  const avgInvoice = payments.length
    ? payments.reduce((sum, payment) => sum + payment.amount, 0) / payments.length
    : 0;

  const totalPaidCount = payments.filter((payment) => payment.status === "succeeded").length;

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes skeletonShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div style={{ background: T.bg, minHeight: "100%" }}>
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
              My Payments
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
              label="Amount Owed"
              value={formatCurrency(stats?.totalOwed ?? actionRequiredAmount)}
              sub={`${statusCounts.action_required} invoices due`}
              icon={Clock3}
              color={T.amber}
              bg={T.amberBg}
            />
            <SummaryCard
              label="Total Paid"
              value={formatCurrency(stats?.totalPaid ?? 0)}
              sub={`${totalPaidCount} completed payments`}
              icon={CheckCircle2}
              color={T.green}
              bg={T.greenBg}
            />
            <SummaryCard
              label="Open Invoices"
              value={String(stats?.pendingCount ?? statusCounts.action_required)}
              sub="Need your action"
              icon={Wallet}
              color={T.red}
              bg={T.redBg}
            />
            <SummaryCard
              label="Average Invoice"
              value={formatCurrency(avgInvoice)}
              sub={`${payments.length} total invoices`}
              icon={TrendingUp}
              color={T.accent}
              bg={T.accentBg}
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
                  placeholder="Search invoice, description..."
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
                onClick={load}
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
              {(
                [
                  "all",
                  "action_required",
                  "pending",
                  "processing",
                  "succeeded",
                  "failed",
                  "cancelled",
                ] as FilterStatus[]
              ).map((status) => {
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
                    {status.replace("_", " ")} ({statusCounts[status] ?? 0})
                  </button>
                );
              })}
            </div>

            <div style={{ overflowX: "auto" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 0.9fr 0.8fr 0.8fr 0.8fr 0.8fr",
                minWidth: 600,
                gap: 12,
                padding: "10px 16px",
                borderBottom: `0.5px solid ${T.border}`,
                background: T.bg,
              }}
            >
              {["Invoice", "Customer", "Amount", "Status", "Date", "Action"].map((head) => (
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
                      gridTemplateColumns: "1.4fr 0.9fr 0.8fr 0.8fr 0.8fr 0.8fr",
                      minWidth: 600,
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
                  No payments found
                </p>
              </div>
            ) : (
              filteredPayments.map((payment) => {
                const canPay = payment.status === "pending" || payment.status === "failed";

                return (
                  <div
                    key={payment._id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.4fr 0.9fr 0.8fr 0.8fr 0.8fr 0.8fr",
                      minWidth: 600,
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
                        {payment.description}
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
                        {payment.invoiceNumber ? `#${payment.invoiceNumber}` : "No invoice #"}
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

                    <p style={{ fontSize: 12, color: T.textSub, margin: 0, whiteSpace: "nowrap" }}>
                      {new Date(payment.createdAt || "").toLocaleDateString()}
                    </p>

                    {canPay ? (
                      <button
                        type="button"
                        onClick={() => setPayTarget(payment)}
                        style={{
                          justifySelf: "start",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "7px 10px",
                          borderRadius: 8,
                          border: "none",
                          background: "#2563EB",
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <CreditCard style={{ width: 12, height: 12 }} />
                        Pay now
                      </button>
                    ) : payment.receiptUrl ? (
                      <a
                        href={payment.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          justifySelf: "start",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "7px 10px",
                          borderRadius: 8,
                          border: `0.5px solid ${T.borderHi}`,
                          background: "transparent",
                          color: T.textSub,
                          fontSize: 12,
                          fontWeight: 600,
                          textDecoration: "none",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <ExternalLink style={{ width: 12, height: 12 }} />
                        Receipt
                      </a>
                    ) : (
                      <span style={{ fontSize: 12, color: T.textMute }}>-</span>
                    )}
                  </div>
                );
              })
            )}
            </div>
          </div>
        </div>
      </div>

      {payTarget && (
        <PayModal
          payment={payTarget}
          onClose={() => setPayTarget(null)}
          onSuccess={() => {
            load();
            setPayTarget(null);
          }}
          getToken={getToken}
        />
      )}
    </>
  );
}

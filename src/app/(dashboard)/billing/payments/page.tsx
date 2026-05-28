"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { apiClient } from "@/lib/api-client";
import { Payment, PaymentStats } from "@/types/billing";
import { formatCurrency } from "@/utils/format";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  Search,
  RefreshCw,
  ChevronLeft,
  Send,
  X,
  CheckCircle2,
  RotateCcw,
  Ban,
  Download,
  Loader2,
  AlertCircle,
  Receipt,
  DollarSign,
  Clock3,
  TrendingUp,
  Filter,
} from "lucide-react";

const T = {
  bg: "var(--color-background-tertiary, var(--background))",
  surface: "var(--color-background-secondary, var(--card))",
  hi: "var(--color-background-primary, var(--popover))",
  border: "var(--color-border-tertiary, var(--border))",
  borderHi: "var(--color-border-secondary, var(--border))",
  text: "var(--color-text-primary, var(--foreground))",
  textSub: "var(--color-text-secondary, var(--muted-foreground))",
  textMute: "var(--color-text-tertiary, var(--muted-foreground))",
  green: "var(--color-text-success, #22C55E)",
  greenBg: "var(--color-background-success, rgba(34,197,94,0.12))",
  amber: "var(--color-text-warning, #D97706)",
  amberBg: "var(--color-background-warning, rgba(217,119,6,0.12))",
  red: "var(--color-text-danger, #DC2626)",
  redBg: "var(--color-background-danger, rgba(220,38,38,0.12))",
};

type ToastType = "success" | "error" | "info";
interface ToastItem {
  id: number;
  type: ToastType;
  msg: string;
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  if (!toasts.length) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 2000,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            background: T.hi,
            border: `0.5px solid ${t.type === "success"
                ? T.green
                : t.type === "error"
                  ? T.red
                  : T.borderHi
              }`,
            borderRadius: "var(--border-radius-lg)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
            animation: "slideIn 0.2s ease both",
            maxWidth: 340,
          }}
        >
          {t.type === "success" && (
            <CheckCircle2
              style={{ width: 14, height: 14, color: T.green, flexShrink: 0 }}
            />
          )}
          {t.type === "error" && (
            <AlertCircle
              style={{ width: 14, height: 14, color: T.red, flexShrink: 0 }}
            />
          )}
          <p style={{ fontSize: 13, color: T.text, margin: 0, flex: 1 }}>
            {t.msg}
          </p>
          <button
            onClick={() => onDismiss(t.id)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: T.textMute,
              padding: 2,
              display: "flex",
            }}
          >
            <X style={{ width: 12, height: 12 }} />
          </button>
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const idRef = React.useRef(0);

  const push = React.useCallback((type: ToastType, msg: string) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, type, msg }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3500);
  }, []);

  const dismiss = React.useCallback(
    (id: number) => setToasts((prev) => prev.filter((item) => item.id !== id)),
    [],
  );

  return { toasts, push, dismiss };
}

function StatusBadge({ status }: { status: string }) {
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
      }}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
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

function DetailDrawer({
  payment,
  onClose,
  onRefresh,
  getToken,
  toast,
}: {
  payment: Payment;
  onClose: () => void;
  onRefresh: () => void;
  getToken: () => Promise<string | null>;
  toast: (type: ToastType, msg: string) => void;
}) {
  const [loading, setLoading] = React.useState<string | null>(null);
  const [hoveredAction, setHoveredAction] = React.useState<"send" | "refund" | "cancel" | null>(
    null,
  );
  const [closeHovered, setCloseHovered] = React.useState(false);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const authHeaders = async () => {
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const action = async (label: string, fn: () => Promise<void>) => {
    setLoading(label);
    try {
      await fn();
      onRefresh();
      onClose();
      toast("success", `${label} successful`);
    } catch (error: unknown) {
      const errMsg =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message ===
          "string"
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : `${label} failed`;
      toast("error", errMsg ?? `${label} failed`);
    } finally {
      setLoading(null);
    }
  };

  const Row = ({
    label,
    val,
    last = false,
  }: {
    label: string;
    val: React.ReactNode;
    last?: boolean;
  }) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "110px minmax(0, 1fr)",
        gap: 10,
        alignItems: "start",
        padding: "10px 0",
        borderBottom: last ? "none" : `0.5px solid ${T.border}`,
      }}
    >
      <span style={{ fontSize: 12, color: T.textSub }}>{label}</span>
      <span
        style={{
          fontSize: 12,
          color: T.text,
          textAlign: "left",
          minWidth: 0,
          whiteSpace: "normal",
          overflowWrap: "anywhere",
          fontWeight: 500,
          lineHeight: 1.45,
        }}
      >
        {val}
      </span>
    </div>
  );

  const customerRows: Array<{ label: string; val: React.ReactNode }> = [
    { label: "Customer", val: payment.customerName },
    { label: "Email", val: payment.customerEmail },
    ...(payment.customerPhone ? [{ label: "Phone", val: payment.customerPhone }] : []),
  ];

  const transactionRows: Array<{ label: string; val: React.ReactNode }> = [
    { label: "Description", val: payment.description },
    ...(payment.invoiceNumber ? [{ label: "Invoice #", val: payment.invoiceNumber }] : []),
    { label: "Created", val: new Date(payment.createdAt).toLocaleString() },
    ...(payment.dueDate
      ? [{ label: "Due date", val: new Date(payment.dueDate).toLocaleDateString() }]
      : []),
    ...(payment.paidAt
      ? [{ label: "Paid at", val: new Date(payment.paidAt).toLocaleString() }]
      : []),
    ...(payment.paymentMethod ? [{ label: "Method", val: payment.paymentMethod }] : []),
    ...(payment.failureReason ? [{ label: "Failure reason", val: payment.failureReason }] : []),
    ...(payment.notes ? [{ label: "Notes", val: payment.notes }] : []),
  ];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        left: 0,
        bottom: 0,
        zIndex: 900,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <button
        type="button"
        aria-label="Close payment details"
        onClick={onClose}
        style={{
          flex: 1,
          border: "none",
          background: "rgba(2, 6, 23, 0.32)",
          cursor: "pointer",
          padding: 0,
        }}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Payment details"
        style={{
          width: "min(100vw, clamp(320px, 30vw, 440px))",
          height: "100%",
          background: T.hi,
          borderLeft: `0.5px solid ${T.borderHi}`,
          overflowY: "auto",
          padding: "18px 16px 16px",
          boxShadow: "-14px 0 44px rgba(0,0,0,0.22)",
          animation: "drawerIn 0.22s ease both",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 14,
            paddingBottom: 12,
            borderBottom: `0.5px solid ${T.border}`,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: 0 }}>
            Payment details
          </h3>
          <button
            type="button"
            onClick={onClose}
            onMouseEnter={() => setCloseHovered(true)}
            onMouseLeave={() => setCloseHovered(false)}
            style={{
              background: closeHovered ? T.bg : T.surface,
              border: `0.5px solid ${T.border}`,
              borderRadius: 10,
              width: 30,
              height: 30,
              cursor: "pointer",
              color: T.textSub,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 120ms ease, color 120ms ease",
            }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        <div
          style={{
            background: T.surface,
            border: `0.5px solid ${T.border}`,
            borderRadius: 12,
            padding: "14px 14px 12px",
            marginBottom: 14,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 11,
              color: T.textMute,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 700,
            }}
          >
            Amount
          </p>
          <div
            style={{
              marginTop: 8,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <p
              style={{
                fontSize: 34,
                fontWeight: 800,
                color: T.text,
                margin: 0,
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
              }}
            >
              {formatCurrency(payment.amount)}
            </p>
            <StatusBadge status={payment.status} />
          </div>
        </div>

        <div
          style={{
            background: T.surface,
            border: `0.5px solid ${T.border}`,
            borderRadius: 12,
            padding: "12px 14px 4px",
            marginBottom: 12,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 11,
              color: T.textMute,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            Customer info
          </p>
          {customerRows.map((row, idx) => (
            <Row
              key={`customer-${row.label}`}
              label={row.label}
              val={row.val}
              last={idx === customerRows.length - 1}
            />
          ))}
        </div>

        <div
          style={{
            background: T.surface,
            border: `0.5px solid ${T.border}`,
            borderRadius: 12,
            padding: "12px 14px 4px",
            marginBottom: 12,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 11,
              color: T.textMute,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            Transaction details
          </p>
          {transactionRows.map((row, idx) => (
            <Row
              key={`transaction-${row.label}`}
              label={row.label}
              val={row.val}
              last={idx === transactionRows.length - 1}
            />
          ))}
        </div>

        {payment.receiptUrl && (
          <a
            href={payment.receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "9px 14px",
              background: T.surface,
              border: `0.5px solid ${T.border}`,
              borderRadius: 10,
              color: T.text,
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            <Download style={{ width: 13, height: 13 }} /> View receipt
          </a>
        )}

        <div
          style={{
            background: T.surface,
            border: `0.5px solid ${T.border}`,
            borderRadius: 12,
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {(payment.status === "pending" || payment.status === "failed") && (
            <button
              onClick={() =>
                action("Send request", async () => {
                  const headers = await authHeaders();
                  await apiClient.post(
                    `/api/payments/${payment._id}/request`,
                    {},
                    { headers },
                  );
                })
              }
              disabled={!!loading}
              onMouseEnter={() => setHoveredAction("send")}
              onMouseLeave={() => setHoveredAction(null)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                padding: "11px 12px",
                background: hoveredAction === "send" && loading !== "Send request" ? "#1D4ED8" : "#2563EB",
                border: "none",
                borderRadius: 10,
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading === "Send request" ? 0.62 : 1,
                transition: "filter 120ms ease, transform 120ms ease",
              }}
            >
              {loading === "Send request" ? (
                <Loader2
                  style={{
                    width: 13,
                    height: 13,
                    animation: "spin 1s linear infinite",
                  }}
                />
              ) : (
                <Send style={{ width: 13, height: 13 }} />
              )}
              Send payment request
            </button>
          )}

          {payment.status === "succeeded" && (
            <button
              onClick={() =>
                action("Refund", async () => {
                  const headers = await authHeaders();
                  await apiClient.post(
                    `/api/payments/${payment._id}/refund`,
                    {},
                    { headers },
                  );
                })
              }
              disabled={!!loading}
              onMouseEnter={() => setHoveredAction("refund")}
              onMouseLeave={() => setHoveredAction(null)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                padding: "11px 12px",
                background: hoveredAction === "refund" && loading !== "Refund" ? T.bg : T.surface,
                border: `0.5px solid ${T.borderHi}`,
                borderRadius: 10,
                color: T.textSub,
                fontSize: 13,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading === "Refund" ? 0.62 : 1,
                transition: "background 120ms ease, color 120ms ease",
              }}
            >
              {loading === "Refund" ? (
                <Loader2
                  style={{
                    width: 13,
                    height: 13,
                    animation: "spin 1s linear infinite",
                  }}
                />
              ) : (
                <RotateCcw style={{ width: 13, height: 13 }} />
              )}
              Refund payment
            </button>
          )}

          {(payment.status === "pending" || payment.status === "processing") && (
            <button
              onClick={() =>
                action("Cancel", async () => {
                  const headers = await authHeaders();
                  await apiClient.post(
                    `/api/payments/${payment._id}/cancel`,
                    {},
                    { headers },
                  );
                })
              }
              disabled={!!loading}
              onMouseEnter={() => setHoveredAction("cancel")}
              onMouseLeave={() => setHoveredAction(null)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                padding: "11px 12px",
                background:
                  hoveredAction === "cancel" && loading !== "Cancel" ? "rgba(220,38,38,0.08)" : "transparent",
                border: `0.5px solid ${T.red}`,
                borderRadius: 10,
                color: T.red,
                fontSize: 13,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading === "Cancel" ? 0.62 : 1,
                transition: "background 120ms ease, color 120ms ease",
              }}
            >
              {loading === "Cancel" ? (
                <Loader2
                  style={{
                    width: 13,
                    height: 13,
                    animation: "spin 1s linear infinite",
                  }}
                />
              ) : (
                <Ban style={{ width: 13, height: 13 }} />
              )}
              Cancel payment
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

function PaymentRow({
  payment,
  onSelect,
}: {
  payment: Payment;
  onSelect: () => void;
}) {
  const [hov, setHov] = React.useState(false);

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "1.4fr 1fr 0.8fr 0.9fr 0.8fr",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        background: hov ? T.surface : "transparent",
        borderBottom: `0.5px solid ${T.border}`,
        cursor: "pointer",
        transition: "background 0.1s",
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
        {payment.invoiceNumber
          ? `#${payment.invoiceNumber}`
          : payment.description}
      </p>

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
          color: T.textSub,
          margin: 0,
          whiteSpace: "nowrap",
        }}
      >
        {new Date(payment.createdAt || "").toLocaleDateString()}
      </p>
    </div>
  );
}

type AdvancedPaymentFilters = {
  minAmount: string;
  maxAmount: string;
  fromDate: string;
  toDate: string;
  paymentMethod: string;
};

const defaultAdvancedFilters: AdvancedPaymentFilters = {
  minAmount: "",
  maxAmount: "",
  fromDate: "",
  toDate: "",
  paymentMethod: "",
};

export default function PaymentsPage() {
  const { getToken } = useAuth();
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [stats, setStats] = React.useState<PaymentStats | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [selected, setSelected] = React.useState<Payment | null>(null);
  const [filterPanelOpen, setFilterPanelOpen] = React.useState(false);
  const [advancedFilters, setAdvancedFilters] = React.useState<AdvancedPaymentFilters>(defaultAdvancedFilters);
  const [draftFilters, setDraftFilters] = React.useState<AdvancedPaymentFilters>(defaultAdvancedFilters);
  const [totalRecords, setTotalRecords] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const { toasts, push, dismiss } = useToast();
  const pageSize = 10;

  const hasAdvancedFilters = React.useMemo(
    () =>
      Boolean(
        advancedFilters.minAmount ||
        advancedFilters.maxAmount ||
        advancedFilters.fromDate ||
        advancedFilters.toDate ||
        advancedFilters.paymentMethod,
      ),
    [advancedFilters],
  );

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [paymentsRes, statsRes] = await Promise.allSettled([
        apiClient.get("/api/payments", {
          headers,
          params: {
            status: statusFilter !== "all" ? statusFilter : undefined,
            search: search.trim() || undefined,
            limit: pageSize,
            skip: (page - 1) * pageSize,
            minAmount: advancedFilters.minAmount || undefined,
            maxAmount: advancedFilters.maxAmount || undefined,
            fromDate: advancedFilters.fromDate || undefined,
            toDate: advancedFilters.toDate || undefined,
            paymentMethod: advancedFilters.paymentMethod.trim() || undefined,
          },
        }),
        apiClient.get("/api/payments/stats", { headers }),
      ]);

      if (paymentsRes.status === "fulfilled") {
        const payload = paymentsRes.value.data.data;
        setPayments(payload.payments ?? []);
        setTotalRecords(
          typeof payload.total === "number"
            ? payload.total
            : payload.payments?.length ?? 0,
        );
      }
      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value.data.data ?? null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [advancedFilters, getToken, page, search, statusFilter]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statuses = [
    "all",
    "pending",
    "processing",
    "succeeded",
    "failed",
    "refunded",
    "cancelled",
  ];

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const startDisplay = totalRecords === 0 ? 0 : startIdx + 1;
  const endDisplay = totalRecords === 0 ? 0 : Math.min(startIdx + payments.length, totalRecords);

  const trend = React.useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleString("en-US", { month: "short" }),
        value: 0,
      };
    });

    const indexByKey = new Map(months.map((m, idx) => [m.key, idx]));

    payments.forEach((payment) => {
      const created = new Date(payment.createdAt);
      const key = `${created.getFullYear()}-${created.getMonth()}`;
      const idx = indexByKey.get(key);
      if (idx !== undefined) {
        months[idx].value += payment.amount;
      }
    });

    return months;
  }, [payments]);

  const chartConfig = React.useMemo(
    () =>
      ({
        revenue: {
          label: "Revenue",
          color: "#3B82F6",
        },
      }) satisfies ChartConfig,
    [],
  );

  const succeededCount = stats?.byStatus?.succeeded?.count ?? 0;
  const pendingCount = stats?.byStatus?.pending?.count ?? 0;
  const totalCount = stats?.totalCount ?? 0;
  const successRate =
    totalCount > 0
      ? `${((succeededCount / totalCount) * 100).toFixed(1)}%`
      : "0.0%";
  const pendingRate =
    totalCount > 0
      ? `${((pendingCount / totalCount) * 100).toFixed(1)}%`
      : "0.0%";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Epilogue:wght@500;600;700;800&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}
        @keyframes drawerIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
        @keyframes skeletonShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      `}</style>

      <div style={{ background: T.bg, minHeight: "100%" }}>
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: "24px 16px 80px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 22,
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/billing"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                color: T.textMute,
                textDecoration: "none",
              }}
            >
              <ChevronLeft style={{ width: 14, height: 14 }} /> Dashboard
            </Link>
            <span style={{ color: T.border }}>›</span>
            <div>
              <h1
                style={{
                  fontSize: 30,
                  fontWeight: 700,
                  color: T.text,
                  margin: 0,
                  letterSpacing: "-0.03em",
                  fontFamily: "'Epilogue', sans-serif",
                }}
              >
                Payments
              </h1>
              <p style={{ fontSize: 12, color: T.textSub, margin: "4px 0 0" }}>
                SuprahPay transaction insights and records
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
              marginBottom: 16,
            }}
          >
            {[
              {
                label: "Total Revenue",
                val: formatCurrency(stats?.totalRevenue ?? 0),
                icon: DollarSign,
                iconColor: "#3B82F6",
                chip: `+${successRate}`,
              },
              {
                label: "Pending Amount",
                val: formatCurrency(stats?.pendingAmount ?? 0),
                icon: Clock3,
                iconColor: "#D97706",
                chip: `+${pendingRate}`,
              },
              {
                label: "Total Volume",
                val: String(stats?.totalCount ?? 0),
                icon: TrendingUp,
                iconColor: "#A855F7",
                chip: `+${totalCount}`,
              },
              {
                label: "Successful Transactions",
                val: String(succeededCount),
                icon: CheckCircle2,
                iconColor: "#22C55E",
                chip: `+${successRate}`,
              },
            ].map(({ label, val, icon: Icon, iconColor, chip }) => (
              <div
                key={label}
                style={{
                  background: T.surface,
                  border: `0.5px solid ${T.border}`,
                  borderRadius: 12,
                  padding: "14px 16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: T.hi,
                    }}
                  >
                    <Icon style={{ width: 14, height: 14, color: iconColor }} />
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "#22C55E",
                      background: "rgba(34,197,94,0.14)",
                      borderRadius: 999,
                      padding: "2px 8px",
                    }}
                  >
                    {chip}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: T.textSub, margin: 0 }}>
                  {label}
                </p>
                {isLoading ? (
                  <div style={{ marginTop: 8 }}>
                    <Skeleton width="65%" height={34} radius={6} />
                  </div>
                ) : (
                  <p
                    style={{
                      fontSize: 34,
                      fontWeight: 700,
                      color: T.text,
                      margin: "2px 0 0",
                      letterSpacing: "-0.03em",
                    }}
                  >
                    {val}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div
            style={{
              background: T.surface,
              border: `0.5px solid ${T.border}`,
              borderRadius: 12,
              padding: "14px 14px 10px",
              marginBottom: 16,
            }}
          >
            <p
              style={{
                margin: "0 0 10px",
                color: T.text,
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              Revenue Trend
            </p>
            {isLoading ? (
              <div
                style={{
                  height: 240,
                  padding: "8px 4px",
                  display: "grid",
                  gap: 10,
                }}
              >
                <Skeleton width="100%" height={28} radius={6} />
                <Skeleton width="100%" height={28} radius={6} />
                <Skeleton width="100%" height={28} radius={6} />
                <Skeleton width="100%" height={28} radius={6} />
                <Skeleton width="92%" height={16} radius={6} />
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-60 w-full">
                <LineChart
                  accessibilityLayer
                  data={trend.map((item) => ({
                    month: item.label,
                    revenue: Math.round(item.value),
                  }))}
                  margin={{ top: 12, right: 14, left: 2, bottom: 10 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tickFormatter={(value) =>
                      value >= 1000
                        ? `${Math.round(value / 1000)}k`
                        : `${value}`
                    }
                  />
                  <ChartTooltip
                    cursor={{
                      stroke: "rgba(148,163,184,0.45)",
                      strokeWidth: 1,
                    }}
                    content={
                      <ChartTooltipContent
                        indicator="dot"
                        formatter={(value) =>
                          formatCurrency(Number(value) || 0)
                        }
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--color-revenue)"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "var(--color-revenue)", strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: "var(--color-revenue)" }}
                  />
                </LineChart>
              </ChartContainer>
            )}
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
              <div
                style={{
                  position: "relative",
                  flex: "1 1 260px",
                  maxWidth: 420,
                }}
              >
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
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search name, email, invoice..."
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

              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    setDraftFilters(advancedFilters);
                    setFilterPanelOpen(true);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: `0.5px solid ${filterPanelOpen || hasAdvancedFilters ? "#3B82F6" : T.border}`,
                    background: filterPanelOpen || hasAdvancedFilters ? "rgba(59,130,246,0.12)" : "transparent",
                    color: filterPanelOpen || hasAdvancedFilters ? "#3B82F6" : T.textSub,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <Filter style={{ width: 12, height: 12 }} /> More Filters
                </button>
                <button
                  onClick={fetchData}
                  style={{
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
              {statuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    setStatusFilter(status);
                    setPage(1);
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: `0.5px solid ${statusFilter === status ? "#3B82F6" : "transparent"}`,
                    background:
                      statusFilter === status
                        ? "rgba(59,130,246,0.14)"
                        : "transparent",
                    color: statusFilter === status ? "#3B82F6" : T.textSub,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    textTransform: "capitalize",
                    whiteSpace: "nowrap",
                  }}
                >
                  {status}
                </button>
              ))}
            </div>

            <div style={{ overflowX: "auto" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1fr 0.8fr 0.9fr 0.8fr",
                gap: 12,
                padding: "10px 16px",
                borderBottom: `0.5px solid ${T.border}`,
                background: T.bg,
                minWidth: 520,
              }}
            >
              {["Customer", "Invoice", "Amount", "Status", "Date"].map(
                (head) => (
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
                ),
              )}
            </div>

            {isLoading ? (
              <div style={{ padding: "6px 16px 14px", minWidth: 520 }}>
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={`skeleton-row-${idx}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.4fr 1fr 0.8fr 0.9fr 0.8fr",
                      gap: 12,
                      padding: "13px 0",
                      borderBottom:
                        idx === 5 ? "none" : `0.5px solid ${T.border}`,
                      alignItems: "center",
                    }}
                  >
                    <Skeleton width="80%" height={14} radius={5} />
                    <Skeleton width="76%" height={14} radius={5} />
                    <Skeleton width="58%" height={14} radius={5} />
                    <Skeleton width="64%" height={22} radius={999} />
                    <Skeleton width="70%" height={14} radius={5} />
                  </div>
                ))}
              </div>
            ) : totalRecords === 0 ? (
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
              payments.map((payment) => (
                <PaymentRow
                  key={payment._id}
                  payment={payment}
                  onSelect={() => setSelected(payment)}
                />
              ))
            )}
            </div>

            {!isLoading && totalRecords > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "12px 14px",
                  borderTop: `0.5px solid ${T.border}`,
                }}
              >
                <p style={{ margin: 0, fontSize: 12, color: T.textMute }}>
                  Showing {startDisplay} to {endDisplay} of{" "}
                  {totalRecords} transactions
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage <= 1}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: `0.5px solid ${T.border}`,
                      background: "transparent",
                      color: T.textSub,
                      cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                      opacity: currentPage <= 1 ? 0.45 : 1,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage >= totalPages}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: `0.5px solid ${T.border}`,
                      background: "transparent",
                      color: T.textSub,
                      cursor:
                        currentPage >= totalPages ? "not-allowed" : "pointer",
                      opacity: currentPage >= totalPages ? 0.45 : 1,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {filterPanelOpen && (
        <div
          onClick={() => setFilterPanelOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1800,
            background: "rgba(15,23,42,0.42)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(460px,100vw)",
              height: "100%",
              background: T.hi,
              borderLeft: `0.5px solid ${T.borderHi}`,
              boxShadow: "-8px 0 40px rgba(0,0,0,0.18)",
              padding: 22,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: T.textMute, fontWeight: 700 }}>
                  Filter payments
                </p>
                <h3 style={{ margin: "6px 0 0", fontSize: 18, fontWeight: 700, color: T.text }}>
                  More Filters
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setFilterPanelOpen(false)}
                style={{
                  border: `0.5px solid ${T.border}`,
                  background: T.surface,
                  borderRadius: 10,
                  width: 34,
                  height: 34,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: T.textSub,
                }}
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, color: T.textSub, fontWeight: 600 }}>Minimum amount</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draftFilters.minAmount}
                  onChange={(event) =>
                    setDraftFilters((prev) => ({ ...prev, minAmount: event.target.value }))
                  }
                  placeholder="0.00"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: `0.5px solid ${T.borderHi}`,
                    background: T.surface,
                    color: T.text,
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, color: T.textSub, fontWeight: 600 }}>Maximum amount</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draftFilters.maxAmount}
                  onChange={(event) =>
                    setDraftFilters((prev) => ({ ...prev, maxAmount: event.target.value }))
                  }
                  placeholder="0.00"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: `0.5px solid ${T.borderHi}`,
                    background: T.surface,
                    color: T.text,
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, color: T.textSub, fontWeight: 600 }}>From date</span>
                  <input
                    type="date"
                    value={draftFilters.fromDate}
                    onChange={(event) =>
                      setDraftFilters((prev) => ({ ...prev, fromDate: event.target.value }))
                    }
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `0.5px solid ${T.borderHi}`,
                      background: T.surface,
                      color: T.text,
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, color: T.textSub, fontWeight: 600 }}>To date</span>
                  <input
                    type="date"
                    value={draftFilters.toDate}
                    onChange={(event) =>
                      setDraftFilters((prev) => ({ ...prev, toDate: event.target.value }))
                    }
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `0.5px solid ${T.borderHi}`,
                      background: T.surface,
                      color: T.text,
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                </label>
              </div>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, color: T.textSub, fontWeight: 600 }}>Payment method</span>
                <input
                  type="text"
                  value={draftFilters.paymentMethod}
                  onChange={(event) =>
                    setDraftFilters((prev) => ({ ...prev, paymentMethod: event.target.value }))
                  }
                  placeholder="card, ach_credit_transfer, cash..."
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: `0.5px solid ${T.borderHi}`,
                    background: T.surface,
                    color: T.text,
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </label>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 8 }}>
              <button
                type="button"
                onClick={() => {
                  setDraftFilters(defaultAdvancedFilters);
                  setAdvancedFilters(defaultAdvancedFilters);
                  setPage(1);
                }}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `0.5px solid ${T.border}`,
                  background: T.surface,
                  color: T.textSub,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Clear filters
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdvancedFilters(draftFilters);
                  setPage(1);
                  setFilterPanelOpen(false);
                }}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "none",
                  background: "#2563EB",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Apply filters
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <DetailDrawer
          payment={selected}
          onClose={() => setSelected(null)}
          onRefresh={fetchData}
          getToken={getToken}
          toast={push}
        />
      )}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}

"use client";


import * as React from "react";
import { formatCurrency } from "@/utils/format";

export const BRAND = "#16A34A";
export const BRAND_HOVER = "#0F7A39";
export const MINT = "#34F5A3";

export const T = {
  brand: BRAND,
  brandHover: BRAND_HOVER,
  mint: MINT,
  brandSoft: "rgba(22,163,74,0.16)",
  brandSofter: "rgba(22,163,74,0.08)",
  brandBorder: "rgba(52,245,163,0.30)",

  bg: "var(--background)",
  surface: "var(--card)",
  surfaceAlt: "var(--muted)",
  border: "var(--border)",
  borderHi: "var(--border)",

  text: "var(--foreground)",
  textSub: "var(--text-secondary)",
  textMute: "var(--text-tertiary)",

  success: "#34F5A3",
  successBg: "rgba(52,245,163,0.14)",
  warning: "#FBBF24",
  warningBg: "rgba(251,191,36,0.14)",
  danger: "#F87171",
  dangerBg: "rgba(248,113,113,0.12)",
  info: "#60A5FA",
  infoBg: "rgba(96,165,250,0.14)",
  violet: "#C4B5FD",
  violetBg: "rgba(196,181,253,0.14)",
  slate: "#94A3B8",
  slateBg: "rgba(148,163,184,0.14)",
} as const;

export const FONT =
  "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export const MONO =
  "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, 'Cascadia Code', monospace";

export const numeric: React.CSSProperties = {
  fontFamily: MONO,
  fontFeatureSettings: '"tnum" 1',
  fontVariantNumeric: "tabular-nums",
  letterSpacing: "0",
};

export const money = (n: number) => formatCurrency(n);

export const glassSurface: React.CSSProperties = {
  background: T.surface,
  backgroundImage:
    "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 40%, rgba(255,255,255,0) 100%)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  border: `1px solid ${T.border}`,
  boxShadow:
    "0 1px 0 0 rgba(255,255,255,0.05) inset, 0 22px 56px -30px rgba(0,0,0,0.85)",
};

/* ── Global CSS (font imports + keyframes). Drop once per screen. ─────────── */
export const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
  *{box-sizing:border-box;}
  @keyframes spy-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
  @keyframes spy-spin{to{transform:rotate(360deg)}}
  @keyframes spy-fade-up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  @keyframes spy-slide-in{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:none}}
  @keyframes spy-pulse{0%,100%{opacity:1;box-shadow:0 0 0 0 ${MINT}66}50%{opacity:.55;box-shadow:0 0 0 4px ${MINT}00}}
  @media (prefers-reduced-motion: reduce){
    *{animation-duration:.001ms !important;animation-iteration-count:1 !important;transition-duration:.001ms !important}
  }
`;

export function GlobalStyle() {
  return <style>{GLOBAL_CSS}</style>;
}

/* ── Wordmark ───────────────────────────────────────────────────────────── */
export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <span
      style={{
        fontFamily: FONT,
        fontSize: size,
        fontWeight: 800,
        letterSpacing: "-0.03em",
        color: T.text,
        lineHeight: 1,
      }}
    >
      Suprah<span style={{ color: T.brand }}>Pay</span>
    </span>
  );
}

/* ── Skeleton ───────────────────────────────────────────────────────────── */
export function Skeleton({
  w = "100%",
  h = 14,
  r = 6,
}: {
  w?: number | string;
  h?: number | string;
  r?: number;
}) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: r,
        background:
          "linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.11), rgba(255,255,255,0.04))",
        backgroundSize: "200% 100%",
        animation: "spy-shimmer 1.4s ease-in-out infinite",
      }}
    />
  );
}

/* ── Section label (eyebrow) ────────────────────────────────────────────── */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: T.textSub,
        margin: "0 0 12px",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        fontFamily: FONT,
      }}
    >
      {children}
    </p>
  );
}

/* ── Card ───────────────────────────────────────────────────────────────── */
export function Card({
  children,
  style,
  pad = 20,
  ...rest
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  pad?: number | string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      style={{
        ...glassSurface,
        borderRadius: 16,
        padding: pad,
        fontFamily: FONT,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ── Icon badge ─────────────────────────────────────────────────────────── */
export function IconBadge({
  icon: Icon,
  color = T.brand,
  bg = T.brandSoft,
  size = 38,
}: {
  icon: React.ElementType;
  color?: string;
  bg?: string;
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        background: bg,
        border: `1px solid ${T.border}`,
        boxShadow: `0 0 16px -8px ${color}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon style={{ width: size * 0.42, height: size * 0.42, color }} />
    </div>
  );
}

/* ── Stat card ──────────────────────────────────────────────────────────── */
export function StatCard({
  label,
  value,
  icon,
  hint,
  loading,
  color = T.brand,
  bg = T.brandSoft,
}: {
  label: string;
  value: string;
  icon?: React.ElementType | React.ReactNode;
  hint?: string;
  loading?: boolean;
  color?: string;
  bg?: string;
}) {
  // lucide-react icons are forwardRef objects ({$$typeof, render}), not plain
  // functions — so we can't gate on `typeof icon === "function"`. Render an
  // already-created element as-is; otherwise treat it as a component type.
  const node = icon
    ? React.isValidElement(icon)
      ? icon
      : React.createElement(icon as React.ElementType, {
          style: { width: 16, height: 16, color },
        })
    : null;

  return (
    <Card pad="16px 18px" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: T.textSub,
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          {label}
        </p>
        {node && (
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: bg,
              border: `1px solid ${T.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {node}
          </div>
        )}
      </div>
      {loading ? (
        <Skeleton w="60%" h={24} />
      ) : (
        <p style={{ fontSize: 24, fontWeight: 700, color: T.text, margin: 0, ...numeric }}>
          {value}
        </p>
      )}
      {hint && !loading && (
        <p style={{ fontSize: 12, color: T.textMute, margin: 0 }}>{hint}</p>
      )}
    </Card>
  );
}

/* ── Status badges ──────────────────────────────────────────────────────── */
const STATUS: Record<string, { c: string; bg: string; label: string }> = {
  succeeded: { c: T.success, bg: T.successBg, label: "Succeeded" },
  paid: { c: T.success, bg: T.successBg, label: "Paid" },
  completed: { c: T.success, bg: T.successBg, label: "Completed" },
  confirmed: { c: T.info, bg: T.infoBg, label: "Confirmed" },
  pending: { c: T.warning, bg: T.warningBg, label: "Pending" },
  processing: { c: T.info, bg: T.infoBg, label: "Processing" },
  failed: { c: T.danger, bg: T.dangerBg, label: "Failed" },
  refunded: { c: T.violet, bg: T.violetBg, label: "Refunded" },
  cancelled: { c: T.slate, bg: T.slateBg, label: "Cancelled" },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS[status] ?? STATUS.cancelled;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: FONT,
        fontSize: 11.5,
        fontWeight: 600,
        color: cfg.c,
        background: cfg.bg,
        border: `1px solid ${cfg.c}33`,
        borderRadius: 999,
        padding: "3px 10px",
        whiteSpace: "nowrap",
        lineHeight: 1.4,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: cfg.c,
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </span>
  );
}

export const PayoutStatusBadge = StatusBadge;

/* ── Buttons ────────────────────────────────────────────────────────────── */
export function PrimaryButton({
  children,
  full,
  style,
  ...rest
}: {
  children: React.ReactNode;
  full?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const [hover, setHover] = React.useState(false);
  const disabled = rest.disabled;
  return (
    <button
      {...rest}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: full ? "100%" : undefined,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "11px 18px",
        borderRadius: 12,
        border: `1px solid ${disabled ? "rgba(255,255,255,0.10)" : T.brandBorder}`,
        background: disabled
          ? "rgba(255,255,255,0.06)"
          : `linear-gradient(180deg, ${MINT} -20%, ${T.brand} 55%, ${T.brandHover} 130%)`,
        color: disabled ? T.textMute : "#06130C",
        fontFamily: FONT,
        fontSize: 14,
        fontWeight: 800,
        letterSpacing: "0.01em",
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled
          ? "none"
          : hover
            ? `0 0 0 1px ${MINT}55, 0 10px 28px -10px ${T.brand}aa`
            : `0 8px 22px -12px ${T.brand}88`,
        transform: hover && !disabled ? "translateY(-1px)" : "none",
        transition: "box-shadow 0.18s, transform 0.18s, background 0.18s",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  full,
  style,
  ...rest
}: {
  children: React.ReactNode;
  full?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      {...rest}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: full ? "100%" : undefined,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "11px 18px",
        borderRadius: 12,
        border: `1px solid ${hover ? T.borderHi : T.border}`,
        background: hover ? T.surfaceAlt : "rgba(255,255,255,0.03)",
        color: T.text,
        fontFamily: FONT,
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
        transition: "background 0.15s, border-color 0.15s",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/* ── Form field ─────────────────────────────────────────────────────────── */
export function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label
        style={{
          fontSize: 12.5,
          fontWeight: 600,
          color: T.textSub,
          fontFamily: FONT,
        }}
      >
        {label}
        {required && <span style={{ color: T.mint, marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {error && (
        <p style={{ fontSize: 12, color: T.danger, margin: 0, fontFamily: FONT }}>
          {error}
        </p>
      )}
    </div>
  );
}

export const inputStyle = (hasError?: boolean): React.CSSProperties => ({
  width: "100%",
  boxSizing: "border-box",
  fontFamily: FONT,
  fontSize: 14,
  background: "rgba(255,255,255,0.04)",
  border: `1px solid ${hasError ? T.danger : T.borderHi}`,
  borderRadius: 10,
  padding: "10px 13px",
  color: T.text,
  outline: "none",
});

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean },
) {
  const { hasError, style, onFocus, onBlur, ...rest } = props;
  const [focus, setFocus] = React.useState(false);
  return (
    <input
      {...rest}
      onFocus={(e) => {
        setFocus(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocus(false);
        onBlur?.(e);
      }}
      style={{
        ...inputStyle(hasError),
        borderColor: hasError ? T.danger : focus ? T.brand : T.borderHi,
        boxShadow: focus && !hasError ? `0 0 0 3px ${T.brandSoft}` : "none",
        transition: "border-color 0.15s, box-shadow 0.15s",
        ...style,
      }}
    />
  );
}
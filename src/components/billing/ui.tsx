"use client";

/**
 * SuprahPay — shared design system
 * --------------------------------
 * One source of truth for colours, type, and primitives so every billing
 * screen looks like the same e-bank product. Import from here instead of
 * re-declaring local tokens / inline styles.
 *
 *   import { T, Card, StatusBadge, StatCard, PrimaryButton, money } from "@/components/billing/ui";
 */

import * as React from "react";
import { formatCurrency } from "@/utils/format";

/* ── Brand ──────────────────────────────────────────────────────────────── */
export const BRAND = "#E55A00";          // SuprahPay orange (unchanged)
export const BRAND_HOVER = "#CC4F00";

/* ── Tokens ─────────────────────────────────────────────────────────────── */
/* CSS-var first (respects the app's theme), with clean fintech fallbacks.    */
export const T = {
  brand: BRAND,
  brandHover: BRAND_HOVER,
  brandSoft: "rgba(229,90,0,0.10)",
  brandSofter: "rgba(229,90,0,0.06)",
  brandBorder: "rgba(229,90,0,0.22)",

  bg: "var(--background, #F5F6F8)",
  surface: "var(--card, #FFFFFF)",
  surfaceAlt: "var(--muted, #F2F4F7)",
  border: "var(--border, #E7E9EE)",
  borderHi: "var(--input, #D9DDE4)",

  text: "var(--foreground, #15181E)",
  textSub: "var(--muted-foreground, #59616E)",
  textMute: "#8A92A0",

  success: "#15803D",
  successBg: "rgba(34,197,94,0.12)",
  warning: "#B45309",
  warningBg: "rgba(217,119,6,0.12)",
  danger: "#B91C1C",
  dangerBg: "rgba(220,38,38,0.10)",
  info: "#1D4ED8",
  infoBg: "rgba(37,99,235,0.10)",
  violet: "#6D28D9",
  violetBg: "rgba(124,58,237,0.10)",
  slate: "#64748B",
  slateBg: "rgba(100,116,139,0.10)",
} as const;

export const FONT =
  "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

/* Money + counters render with tabular figures so columns line up. */
export const numeric: React.CSSProperties = {
  fontFeatureSettings: '"tnum" 1',
  fontVariantNumeric: "tabular-nums",
  letterSpacing: "-0.01em",
};

export const money = (n: number) => formatCurrency(n);

/* ── Global CSS (font import + keyframes). Drop once per screen. ─────────── */
export const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  *{box-sizing:border-box;}
  @keyframes spy-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
  @keyframes spy-spin{to{transform:rotate(360deg)}}
  @keyframes spy-fade-up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  @keyframes spy-slide-in{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:none}}
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
          "linear-gradient(90deg, rgba(120,130,145,0.10), rgba(120,130,145,0.20), rgba(120,130,145,0.10))",
        backgroundSize: "200% 100%",
        animation: "spy-shimmer 1.4s ease-in-out infinite",
      }}
    />
  );
}

/* ── Section label ──────────────────────────────────────────────────────── */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: T.textSub,
        margin: "0 0 12px",
        letterSpacing: "-0.01em",
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
        background: T.surface,
        border: `1px solid ${T.border}`,
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
        border: "none",
        background: disabled ? T.brandSoft : hover ? T.brandHover : T.brand,
        color: disabled ? T.brand : "#fff",
        fontFamily: FONT,
        fontSize: 14,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.7 : 1,
        transition: "background 0.15s",
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
        border: `1px solid ${T.border}`,
        background: hover ? T.surfaceAlt : "transparent",
        color: T.text,
        fontFamily: FONT,
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
        transition: "background 0.15s",
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
        {required && <span style={{ color: T.brand, marginLeft: 3 }}>*</span>}
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
  background: T.surface,
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
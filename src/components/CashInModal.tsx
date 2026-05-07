"use client";

import * as React from "react";
import { X, Copy, CheckCircle2, ExternalLink, ChevronRight, AlertCircle } from "lucide-react";

const DISPLAY = "'Rajdhani', var(--font-sans), sans-serif";
const MONO = "'Share Tech Mono', 'Roboto Mono', monospace";
const ORANGE = "#E55A00";

// ─── Theme tokens (CSS vars — auto-adapt to light/dark) ────────────────────────
const MODAL_BG      = "var(--card)";
const MODAL_BORDER  = "var(--border)";
const TEXT_HI       = "var(--card-foreground)";
const TEXT_MID      = "var(--muted-foreground)";
const TEXT_LO       = "color-mix(in srgb, var(--muted-foreground) 55%, transparent)";
const TEXT_FAINT    = "color-mix(in srgb, var(--muted-foreground) 40%, transparent)";
const SURFACE       = "color-mix(in srgb, var(--foreground) 5%, transparent)";
const SURFACE_SUBTLE = "color-mix(in srgb, var(--foreground) 3%, transparent)";
const BORDER_HOVER  = "color-mix(in srgb, var(--foreground) 14%, transparent)";

// ─── Provider Config ───────────────────────────────────────────────────────────

type Provider = "wise" | "paypal" | "stripe";

interface ProviderConfig {
  id: Provider;
  name: string;
  tagline: string;
  fees: string;
  speed: string;
  color: string;
  accentText: string;
  logo: React.ReactNode;
  fields: FieldConfig[];
  instructions: string[];
  deepLinkBase?: string;
}

interface FieldConfig {
  key: string;
  label: string;
  value: string;
  copyable?: boolean;
}

// ─── SVG Logos ─────────────────────────────────────────────────────────────────

const WiseLogo = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <rect width="32" height="32" rx="8" fill="#9FE870" />
    <path d="M8 11h6l-2 10h-2L8 11zm5 0h6l2 10h-2l-4-10zm5 0h6l-2 10h-2l-2-10z" fill="#163300" />
  </svg>
);

const PayPalLogo = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <rect width="32" height="32" rx="8" fill="#003087" />
    <path d="M11 8h7c3 0 5 1.5 4.5 4.5C22 16 19.5 18 17 18h-3l-1 6H10L11 8z" fill="#009CDE" />
    <path d="M13.5 10h5c2.5 0 4 1 3.5 3.5C21.5 16 19.5 17.5 17 17.5h-2.5l-1 4.5h-3l2-12z" fill="white" />
  </svg>
);

const StripeLogo = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <rect width="32" height="32" rx="8" fill="#635BFF" />
    <path d="M15 13c0-1 .8-1.5 2-1.5 1.8 0 3.5.7 4.5 1.5l1.5-3.5C21.5 8.5 19.5 8 17 8c-3.5 0-6 1.8-6 5 0 5.5 7 4.5 7 7 0 1-.8 1.5-2.2 1.5-1.8 0-3.8-.8-5-1.8L9 23.2C10.5 24.5 13 25 15.5 25c3.8 0 6.5-1.8 6.5-5.2 0-5.8-7-4.8-7-6.8z" fill="white" />
  </svg>
);

// ─── Provider Data ──────────────────────────────────────────────────────────────

const PROVIDERS: ProviderConfig[] = [
  {
    id: "wise",
    name: "Wise",
    tagline: "Bank-beating exchange rates",
    fees: "~0.5–1%",
    speed: "Instant–1 day",
    color: "#9FE870",
    accentText: "#163300",
    logo: <WiseLogo />,
    fields: [
      { key: "account_name", label: "Account Name", value: "SupraPay Inc.", copyable: true },
      { key: "account_num", label: "Account Number", value: "8312 7490 2217", copyable: true },
      { key: "routing", label: "Routing (ACH)", value: "026073150", copyable: true },
      { key: "bank_name", label: "Bank", value: "Community Federal Savings Bank" },
    ],
    instructions: [
      "Log in to your Wise account.",
      "Go to Send Money and enter the account details above.",
      "Choose USD and confirm the transfer.",
      "Funds typically arrive within minutes to 1 business day.",
    ],
    deepLinkBase: "https://wise.com/send",
  },
  {
    id: "paypal",
    name: "PayPal",
    tagline: "Fast & familiar transfers",
    fees: "Free (Friends & Family)",
    speed: "Instant",
    color: "#009CDE",
    accentText: "#fff",
    logo: <PayPalLogo />,
    fields: [
      { key: "email", label: "PayPal Email", value: "payments@suprapay.io", copyable: true },
    ],
    instructions: [
      "Open PayPal and tap Send.",
      "Enter the email address above.",
      "Select Friends & Family to avoid fees.",
      "Add your account ID in the note field.",
      "Funds appear instantly in your account.",
    ],
    deepLinkBase: "https://www.paypal.com/myaccount/transfer/send",
  },
  {
    id: "stripe",
    name: "Stripe",
    tagline: "Card or bank — your choice",
    fees: "2.9% + $0.30 (card)",
    speed: "Instant",
    color: "#635BFF",
    accentText: "#fff",
    logo: <StripeLogo />,
    fields: [
      { key: "link", label: "Payment Link", value: "pay.suprapay.io/cashin", copyable: true },
    ],
    instructions: [
      "Click Open in Stripe below.",
      "Enter the amount you'd like to deposit.",
      "Pay with card, Apple Pay, or bank account.",
      "A receipt is emailed automatically.",
    ],
    deepLinkBase: "https://pay.suprapay.io/cashin",
  },
];

// ─── Sub-components ─────────────────────────────────────────────────────────────

function ProviderCard({
  provider, selected, onClick,
}: { provider: ProviderConfig; selected: boolean; onClick: () => void }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "14px 16px", borderRadius: 12, border: "none",
        background: selected
          ? "rgba(229,90,0,0.10)"
          : hover ? SURFACE : SURFACE_SUBTLE,
        outline: selected
          ? `1.5px solid ${ORANGE}`
          : `1px solid ${hover ? BORDER_HOVER : MODAL_BORDER}`,
        cursor: "pointer", textAlign: "left", transition: "all 0.14s", width: "100%",
      }}
    >
      <div style={{ flexShrink: 0 }}>{provider.logo}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: DISPLAY, fontSize: 15, fontWeight: 700, color: TEXT_HI, margin: 0 }}>
          {provider.name}
        </p>
        <p style={{ fontFamily: DISPLAY, fontSize: 12, color: TEXT_LO, margin: "2px 0 0" }}>
          {provider.tagline}
        </p>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <p style={{ fontFamily: MONO, fontSize: 11, color: provider.color, margin: 0 }}>{provider.fees}</p>
        <p style={{ fontFamily: MONO, fontSize: 11, color: TEXT_FAINT, margin: "2px 0 0" }}>{provider.speed}</p>
      </div>
      <ChevronRight
        style={{ width: 14, height: 14, color: selected ? ORANGE : TEXT_FAINT, flexShrink: 0 }}
      />
    </button>
  );
}

function CopyField({ field }: { field: FieldConfig }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(field.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { }
  };

  return (
    <div
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px",
        background: SURFACE,
        border: `1px solid ${MODAL_BORDER}`,
        borderRadius: 8,
        gap: 12,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <p style={{ fontFamily: DISPLAY, fontSize: 11, color: TEXT_LO, margin: 0, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {field.label}
        </p>
        <p style={{ fontFamily: MONO, fontSize: 13, color: TEXT_HI, margin: "3px 0 0", wordBreak: "break-all" }}>
          {field.value}
        </p>
      </div>
      {field.copyable && (
        <button
          onClick={handleCopy}
          style={{
            flexShrink: 0, padding: "6px 10px", borderRadius: 6,
            background: copied ? "rgba(110,231,183,0.15)" : SURFACE,
            border: `1px solid ${copied ? "rgba(110,231,183,0.30)" : MODAL_BORDER}`,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
            fontFamily: DISPLAY, fontSize: 11, fontWeight: 600,
            color: copied ? "#6EE7B7" : TEXT_MID,
            transition: "all 0.14s",
          }}
        >
          {copied
            ? <><CheckCircle2 style={{ width: 12, height: 12 }} /> Copied</>
            : <><Copy style={{ width: 12, height: 12 }} /> Copy</>
          }
        </button>
      )}
    </div>
  );
}

// ─── Amount Input ───────────────────────────────────────────────────────────────

function AmountStep({
  amount, onChange, onNext,
}: { amount: string; onChange: (v: string) => void; onNext: () => void }) {
  const numeric = parseFloat(amount);
  const valid = !isNaN(numeric) && numeric >= 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <p style={{ fontFamily: DISPLAY, fontSize: 12, color: TEXT_LO, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
          Amount (USD)
        </p>
        <div style={{ position: "relative" }}>
          <span style={{
            position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
            fontFamily: DISPLAY, fontSize: 24, fontWeight: 700,
            color: valid ? TEXT_HI : "color-mix(in srgb, var(--muted-foreground) 50%, transparent)",
          }}>$</span>
          <input
            type="number" min="1" step="0.01"
            value={amount}
            onChange={e => onChange(e.target.value)}
            placeholder="0.00"
            style={{
              width: "100%", padding: "14px 16px 14px 36px",
              background: SURFACE, border: `1px solid ${valid ? "rgba(229,90,0,0.40)" : MODAL_BORDER}`,
              borderRadius: 12, outline: "none",
              fontFamily: MONO, fontSize: 28, fontWeight: 700, color: TEXT_HI,
              boxSizing: "border-box",
            }}
          />
        </div>
        {!valid && amount !== "" && (
          <p style={{ fontFamily: DISPLAY, fontSize: 12, color: "#FCA5A5", marginTop: 6, display: "flex", alignItems: "center", gap: 5 }}>
            <AlertCircle style={{ width: 12, height: 12 }} /> Minimum deposit is $1.00
          </p>
        )}
      </div>

      {/* Quick amounts */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["50", "100", "250", "500", "1000"].map(v => (
          <button
            key={v} onClick={() => onChange(v)}
            style={{
              padding: "6px 14px", borderRadius: 20, border: `1px solid ${MODAL_BORDER}`,
              background: amount === v ? "rgba(229,90,0,0.15)" : SURFACE_SUBTLE,
              outline: amount === v ? `1px solid ${ORANGE}` : "none",
              color: amount === v ? ORANGE : TEXT_MID,
              fontFamily: MONO, fontSize: 12, cursor: "pointer", transition: "all 0.13s",
            }}
          >${v}</button>
        ))}
      </div>

      <button
        onClick={onNext} disabled={!valid}
        style={{
          padding: "14px", borderRadius: 10, border: "none",
          background: valid ? ORANGE : SURFACE,
          color: valid ? "#fff" : TEXT_FAINT,
          fontFamily: DISPLAY, fontSize: 15, fontWeight: 700, letterSpacing: "0.03em",
          cursor: valid ? "pointer" : "not-allowed", transition: "background 0.14s",
        }}
      >
        Continue →
      </button>
    </div>
  );
}

// ─── Details Step ───────────────────────────────────────────────────────────────

function DetailsStep({
  amount, provider,
  onBack, onOpen,
}: { amount: string; provider: ProviderConfig; onBack: () => void; onOpen: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Amount summary */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px",
        background: "rgba(229,90,0,0.08)", border: "1px solid rgba(229,90,0,0.20)", borderRadius: 10,
      }}>
        <span style={{ fontFamily: DISPLAY, fontSize: 13, color: TEXT_MID }}>Depositing</span>
        <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: TEXT_HI }}>
          ${parseFloat(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {/* Provider badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 2 }}>
        {provider.logo}
        <div>
          <p style={{ fontFamily: DISPLAY, fontSize: 14, fontWeight: 700, color: TEXT_HI, margin: 0 }}>{provider.name}</p>
          <p style={{ fontFamily: MONO, fontSize: 11, color: TEXT_LO, margin: "2px 0 0" }}>
            {provider.fees} · {provider.speed}
          </p>
        </div>
      </div>

      {/* Fields */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {provider.fields.map(f => <CopyField key={f.key} field={f} />)}
      </div>

      {/* Instructions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <p style={{ fontFamily: DISPLAY, fontSize: 11, color: TEXT_LO, letterSpacing: "0.06em", textTransform: "uppercase", margin: 0 }}>
          Steps
        </p>
        {provider.instructions.map((step, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{
              flexShrink: 0, width: 20, height: 20, borderRadius: "50%",
              background: "rgba(229,90,0,0.15)", border: "1px solid rgba(229,90,0,0.30)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: MONO, fontSize: 10, color: ORANGE, marginTop: 1,
            }}>{i + 1}</span>
            <p style={{ fontFamily: DISPLAY, fontSize: 13, color: TEXT_MID, margin: 0, lineHeight: 1.5 }}>{step}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={onBack}
          style={{
            flex: 1, padding: "12px", borderRadius: 10, border: `1px solid ${MODAL_BORDER}`,
            background: "transparent", color: TEXT_MID,
            fontFamily: DISPLAY, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >← Back</button>
        <button
          onClick={onOpen}
          style={{
            flex: 2, padding: "12px", borderRadius: 10, border: "none",
            background: ORANGE, color: "#fff",
            fontFamily: DISPLAY, fontSize: 14, fontWeight: 700, letterSpacing: "0.03em",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
          }}
        >
          <ExternalLink style={{ width: 13, height: 13 }} />
          Open in {provider.name}
        </button>
      </div>
    </div>
  );
}

// ─── Main Modal ─────────────────────────────────────────────────────────────────

interface CashInModalProps {
  open: boolean;
  onClose: () => void;
}

export function CashInModal({ open, onClose }: CashInModalProps) {
  const [step, setStep] = React.useState<"provider" | "amount" | "details">("provider");
  const [selectedId, setSelectedId] = React.useState<Provider | null>(null);
  const [amount, setAmount] = React.useState("");

  React.useEffect(() => {
    if (!open) { setStep("provider"); setSelectedId(null); setAmount(""); }
  }, [open]);

  const provider = PROVIDERS.find(p => p.id === selectedId);

  const handleSelectProvider = (id: Provider) => { setSelectedId(id); setStep("amount"); };
  const handleOpen = () => { if (provider?.deepLinkBase) window.open(provider.deepLinkBase, "_blank"); };

  if (!open) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Share+Tech+Mono&display=swap');
        @keyframes ciSlideUp {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) translateY(24px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) translateY(0) scale(1);
          }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 9998,
          background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)",
        }}
      />

      {/* Modal */}
      <div style={{
        position: "fixed", zIndex: 9999,
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(480px, 95vw)",
        background: MODAL_BG,
        border: `1px solid ${MODAL_BORDER}`,
        borderRadius: 18,
        boxShadow: "0 32px 80px rgba(0,0,0,0.40)",
        animation: "ciSlideUp 0.22s cubic-bezier(0.22,1,0.36,1)",
        overflow: "hidden",
        fontFamily: DISPLAY,
      }}>

        {/* Top accent bar */}
        <div style={{ height: 2, background: `linear-gradient(90deg, ${ORANGE}, #ff9d5c)` }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px 14px" }}>
          <div>
            <h2 style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 700, color: TEXT_HI, margin: 0 }}>
              Cash In
            </h2>
            <p style={{ fontFamily: DISPLAY, fontSize: 12, color: TEXT_LO, margin: "3px 0 0" }}>
              {step === "provider" && "Choose a deposit method"}
              {step === "amount" && `via ${provider?.name}`}
              {step === "details" && `${provider?.name} details`}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Step dots */}
            <div style={{ display: "flex", gap: 5 }}>
              {(["provider", "amount", "details"] as const).map(s => (
                <div key={s} style={{
                  width: s === step ? 18 : 6, height: 6, borderRadius: 3,
                  background: s === step ? ORANGE : MODAL_BORDER,
                  transition: "all 0.2s",
                }} />
              ))}
            </div>
            <button
              onClick={onClose}
              style={{
                width: 30, height: 30, borderRadius: 8, border: `1px solid ${MODAL_BORDER}`,
                background: SURFACE, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", color: TEXT_MID,
              }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: MODAL_BORDER, margin: "0 22px" }} />

        {/* Body */}
        <div style={{ padding: "20px 22px 24px" }}>

          {/* Step 1 — Provider select */}
          {step === "provider" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PROVIDERS.map(p => (
                <ProviderCard
                  key={p.id} provider={p}
                  selected={selectedId === p.id}
                  onClick={() => handleSelectProvider(p.id)}
                />
              ))}
              <p style={{ fontFamily: DISPLAY, fontSize: 11, color: TEXT_FAINT, textAlign: "center", marginTop: 8 }}>
                Funds are credited after confirmation by the payment provider.
              </p>
            </div>
          )}

          {/* Step 2 — Amount */}
          {step === "amount" && (
            <AmountStep amount={amount} onChange={setAmount} onNext={() => setStep("details")} />
          )}

          {/* Step 3 — Details */}
          {step === "details" && provider && (
            <DetailsStep amount={amount} provider={provider} onBack={() => setStep("amount")} onOpen={handleOpen} />
          )}
        </div>
      </div>
    </>
  );
}

"use client";

/**
 * SuprahPay × Wise Integration
 * Fixed: modal overlay, layout, z-index, and overall design polish
 */

import * as React from "react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const WISE_GREEN  = "#9FE870";
const WISE_DARK   = "#163300";
const WISE_MID    = "#5a9c32";
const WISE_BG     = "rgba(159,232,112,0.10)";
const WISE_BORDER = "rgba(159,232,112,0.22)";
const DISPLAY     = "'Rajdhani', var(--font-sans), sans-serif";
const MONO        = "'Share Tech Mono', 'Roboto Mono', monospace";
const MODAL_BG    = "var(--card, #1a1a2e)";
const MODAL_BORDER = "var(--border, rgba(255,255,255,0.10))";
const TEXT_HI     = "var(--card-foreground, #f1f5f9)";
const TEXT_MID    = "var(--muted-foreground, #94a3b8)";
const TEXT_LO     = "color-mix(in srgb, var(--muted-foreground, #94a3b8) 55%, transparent)";
const TEXT_FAINT  = "color-mix(in srgb, var(--muted-foreground, #94a3b8) 40%, transparent)";
const SURFACE     = "color-mix(in srgb, var(--foreground, #fff) 5%, transparent)";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WiseProfile {
  id: string;
  type: "personal" | "business";
  fullName: string;
  email: string;
  avatarInitials: string;
}

export interface WiseBalance {
  currency: string;
  amount: number;
  reservedAmount: number;
}

export interface WiseTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  type: "credit" | "debit";
  status: "completed" | "pending" | "cancelled";
  recipient?: string;
}

export interface WiseAccountState {
  connected: boolean;
  profile: WiseProfile | null;
  balances: WiseBalance[];
  transactions: WiseTransaction[];
  isLoading: boolean;
  error: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

// ─── API Client ───────────────────────────────────────────────────────────────

export const wiseApiClient = {
  connect: async (code: string) => {
    const response = await fetch("/api/wise/status");
    const data = await response.json();
    return data;
  },
  getTransactions: async () => {
    const response = await fetch("/api/wise/transactions?currency=USD&days=30");
    if (!response.ok) throw new Error("Failed to fetch transactions");
    const data = await response.json();
    return data.transactions;
  },
  getBalances: async () => {
    const response = await fetch("/api/wise/balances");
    if (!response.ok) throw new Error("Failed to fetch balances");
    const data = await response.json();
    return data.balances;
  },
  createTransfer: async (payload: any) => {
    const response = await fetch("/api/wise/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Transfer failed");
    }
    return await response.json();
  },
  disconnect: async () => {
    const response = await fetch("/api/wise/disconnect", { method: "POST" });
    if (!response.ok) throw new Error("Failed to disconnect");
  },
};

// ─── Context ──────────────────────────────────────────────────────────────────

interface WiseContextValue {
  state: WiseAccountState;
  connect: (code: string) => Promise<void>;
  disconnect: () => Promise<void>;
  refreshBalances: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
}

const WiseContext = React.createContext<WiseContextValue | null>(null);

export function WiseProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<WiseAccountState>({
    connected: false,
    profile: null,
    balances: [],
    transactions: [],
    isLoading: false,
    error: null,
  });

  const connect = React.useCallback(async (code: string) => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      const { profile, balances } = await wiseApiClient.connect(code);
      const transactions = await wiseApiClient.getTransactions();
      setState(s => ({ ...s, connected: true, profile, balances, transactions, isLoading: false }));
    } catch (err: unknown) {
      setState(s => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : "Connection failed.",
      }));
      throw err;
    }
  }, []);

  const disconnect = React.useCallback(async () => {
    await wiseApiClient.disconnect();
    setState({ connected: false, profile: null, balances: [], transactions: [], isLoading: false, error: null });
  }, []);

  const refreshBalances = React.useCallback(async () => {
    const balances = await wiseApiClient.getBalances();
    setState(s => ({ ...s, balances }));
  }, []);

  const refreshTransactions = React.useCallback(async () => {
    const transactions = await wiseApiClient.getTransactions();
    setState(s => ({ ...s, transactions }));
  }, []);

  return (
    <WiseContext.Provider value={{ state, connect, disconnect, refreshBalances, refreshTransactions }}>
      {children}
    </WiseContext.Provider>
  );
}

export function useWise() {
  const ctx = React.useContext(WiseContext);
  if (!ctx) throw new Error("useWise must be used within WiseProvider");
  return ctx;
}

// ─── Shared atoms ─────────────────────────────────────────────────────────────

function WiseLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="60" rx="12" fill={WISE_GREEN} />
      <rect x="14" y="14" width="16" height="32" rx="3" fill={WISE_DARK} />
      <path d="M18 20h8l-4 8 4 8h-8V20z" fill={WISE_GREEN} />
      <text x="34" y="40" fontFamily="'Helvetica Neue', Arial, sans-serif" fontWeight="800" fontSize="14" fill={WISE_GREEN}>W</text>
    </svg>
  );
}

function WiseBadge() {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 10px", borderRadius: 9,
      background: WISE_BG, border: `1px solid ${WISE_BORDER}`,
    }}>
      <WiseLogo size={14} />
      <span style={{ fontSize: 11, fontWeight: 700, color: WISE_MID, fontFamily: MONO, letterSpacing: "0.06em" }}>
        wise
      </span>
    </div>
  );
}

function DemoBadge() {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 6,
      background: "rgba(251,191,36,0.12)",
      border: "1px solid rgba(251,191,36,0.28)",
      fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
      textTransform: "uppercase" as const, fontFamily: MONO,
      color: "#FCD34D",
    }}>
      ⚡ Demo
    </span>
  );
}

function Spinner({ size = 14, color = TEXT_MID }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ animation: "wiseSpin 0.9s linear infinite", flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2.5"
        strokeDasharray="31.4 31.4" strokeLinecap="round" />
    </svg>
  );
}

function ModalClose({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="Close" style={{
      position: "absolute" as const, top: 14, right: 14,
      width: 30, height: 30, borderRadius: 8,
      background: SURFACE, border: `1px solid ${MODAL_BORDER}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      cursor: "pointer", zIndex: 10, color: TEXT_MID,
      transition: "background 0.15s",
    }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );
}

// ─── FIXED: WiseShell — proper portal-style fixed overlay ─────────────────────

function WiseShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Share+Tech+Mono&display=swap');
        @keyframes wiseSpin     { to { transform: rotate(360deg); } }
        @keyframes wiseSlideUp  {
          from { opacity:0; transform:translateY(20px) scale(0.96); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes wiseFadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes wiseShimmer  { 0%,100%{opacity:1} 50%{opacity:0.42} }
      `}</style>

      {/* Backdrop — fixed, full viewport, high z-index */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 99998,
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          animation: "wiseFadeIn 0.18s ease both",
        }}
      />

      {/* Dialog — fixed center, above backdrop */}
      <div
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        style={{
          position: "fixed",
          zIndex: 99999,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(480px, 94vw)",
          maxHeight: "min(640px, 88vh)",
          overflowY: "auto",
          background: "var(--card, #161622)",
          border: `1px solid ${MODAL_BORDER}`,
          borderRadius: 20,
          boxShadow: "0 40px 100px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)",
          animation: "wiseSlideUp 0.22s cubic-bezier(0.22,1,0.36,1) both",
          fontFamily: DISPLAY,
          scrollbarWidth: "none" as any,
        }}
      >
        {/* Green accent bar */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${WISE_GREEN}, ${WISE_MID} 60%, transparent)`, borderRadius: "20px 20px 0 0" }} />
        <div style={{ position: "relative" as const, padding: "24px 26px 28px" }}>
          <ModalClose onClick={onClose} />
          {children}
        </div>
      </div>
    </>
  );
}

// ─── WiseConnectModal ─────────────────────────────────────────────────────────

interface WiseConnectModalProps {
  open: boolean;
  onClose: () => void;
  onConnected?: () => void;
}

export function WiseConnectModal({ open, onClose, onConnected }: WiseConnectModalProps) {
  const { connect, state } = useWise();
  const [step, setStep] = React.useState<"intro" | "verify" | "success">("intro");
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [codeFocus, setCodeFocus] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setStep("intro");
      setCode("");
      setError("");
      setBusy(false);
    }
  }, [open]);

  if (!open) return null;

  const handleStart = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/wise/connect");
      const { authUrl } = await response.json();
      window.location.href = authUrl;
    } catch {
      // Demo fallback
      setBusy(false);
      setStep("verify");
    }
  };

  const handleVerify = async () => {
    if (code.trim().length < 4) {
      setError("Enter any 4+ character code to proceed.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await connect(code);
      setStep("success");
      onConnected?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  };

  const PERKS = [
    { icon: "🌍", text: "Send money to 160+ countries" },
    { icon: "💱", text: "Real exchange rates, low fees" },
    { icon: "🏦", text: "Local bank details in 9 currencies" },
    { icon: "⚡", text: "Instant transfers within Wise" },
  ];

  const btnBase: React.CSSProperties = {
    width: "100%", padding: "13px 16px", borderRadius: 12, border: "none",
    fontFamily: DISPLAY, fontSize: 15, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    transition: "all 0.15s", cursor: "pointer",
  };

  return (
    <WiseShell onClose={onClose}>
      {/* ── Step 1: Intro ── */}
      {step === "intro" && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <WiseLogo size={44} />
              <div>
                <p style={{ fontSize: 19, fontWeight: 700, color: TEXT_HI, margin: 0, letterSpacing: "-0.02em" }}>
                  Connect Wise
                </p>
                <p style={{ fontSize: 12, color: TEXT_LO, margin: "3px 0 0" }}>
                  Primary banking layer for SuprahPay
                </p>
              </div>
            </div>
            <DemoBadge />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {PERKS.map(p => (
              <div key={p.text} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 14px", borderRadius: 10,
                background: WISE_BG, border: `1px solid ${WISE_BORDER}`,
              }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{p.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_HI }}>{p.text}</span>
              </div>
            ))}
          </div>

          <div style={{
            padding: "12px 14px", borderRadius: 10,
            background: SURFACE, border: `1px solid ${MODAL_BORDER}`, marginBottom: 20,
          }}>
            <p style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.10em",
              textTransform: "uppercase" as const, color: TEXT_LO, margin: "0 0 8px", fontFamily: MONO,
            }}>
              Access simulated
            </p>
            {[
              "Read profile & account details",
              "View balances across currencies",
              "Initiate transfers (with your approval)",
              "View transaction history",
            ].map(s => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={WISE_MID} strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span style={{ fontSize: 12, color: TEXT_MID }}>{s}</span>
              </div>
            ))}
          </div>

          <button onClick={handleStart} disabled={busy} style={{
            ...btnBase,
            background: busy ? WISE_BG : WISE_GREEN,
            color: busy ? WISE_MID : WISE_DARK,
            cursor: busy ? "not-allowed" : "pointer",
          }}>
            {busy
              ? <><Spinner size={16} color={WISE_MID} /> Connecting…</>
              : <><WiseLogo size={20} /> Continue with Wise (Demo)</>
            }
          </button>

          <p style={{ fontSize: 10, color: TEXT_FAINT, textAlign: "center" as const, marginTop: 10, fontFamily: MONO }}>
            Demo only — no real OAuth handshake occurs.
          </p>
        </>
      )}

      {/* ── Step 2: Verify ── */}
      {step === "verify" && (
        <>
          <div style={{ textAlign: "center" as const, marginBottom: 22 }}>
            <WiseLogo size={52} />
            <p style={{ fontSize: 18, fontWeight: 700, color: TEXT_HI, margin: "14px 0 5px" }}>
              Enter demo code
            </p>
            <p style={{ fontSize: 12, color: TEXT_LO }}>
              In production, Wise sends a code to <strong>payments@suprapay.io</strong>
            </p>
          </div>

          <div style={{
            background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.20)",
            borderRadius: 10, padding: "9px 14px", marginBottom: 16,
          }}>
            <p style={{ fontSize: 11, color: "#FCD34D", margin: 0, textAlign: "center" as const, fontFamily: MONO }}>
              Type any 4+ characters to proceed (demo)
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <input
              value={code}
              onChange={e => { setCode(e.target.value); setError(""); }}
              onFocus={() => setCodeFocus(true)}
              onBlur={() => setCodeFocus(false)}
              onKeyDown={e => e.key === "Enter" && handleVerify()}
              placeholder="e.g. DEMO or 1234"
              autoFocus
              style={{
                width: "100%", padding: "12px 14px", fontFamily: MONO,
                fontSize: 20, letterSpacing: "0.22em", textAlign: "center" as const,
                background: SURFACE,
                border: `1px solid ${error ? "#EF4444" : codeFocus ? WISE_GREEN : MODAL_BORDER}`,
                borderRadius: 10, color: TEXT_HI, outline: "none",
                boxShadow: codeFocus ? `0 0 0 3px ${WISE_BG}` : "none",
                transition: "border-color 0.14s, box-shadow 0.14s",
                boxSizing: "border-box" as const,
              }}
            />
            {error && <p style={{ fontSize: 11, color: "#F87171", marginTop: 6, textAlign: "center" as const }}>{error}</p>}
          </div>

          {state.error && (
            <div style={{
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)",
              borderRadius: 10, padding: "10px 14px", marginBottom: 14,
            }}>
              <p style={{ fontSize: 12, color: "#FCA5A5", margin: 0 }}>{state.error}</p>
            </div>
          )}

          <button onClick={handleVerify} disabled={busy || code.trim().length < 4} style={{
            ...btnBase,
            background: code.trim().length >= 4 && !busy ? WISE_GREEN : WISE_BG,
            color: code.trim().length >= 4 && !busy ? WISE_DARK : WISE_MID,
            cursor: code.trim().length >= 4 && !busy ? "pointer" : "not-allowed",
          }}>
            {busy ? <><Spinner size={16} color={WISE_MID} /> Verifying…</> : "Verify & Connect"}
          </button>

          <button onClick={() => setStep("intro")} style={{
            display: "block", margin: "12px auto 0", padding: "8px 16px",
            background: "none", border: "none", cursor: "pointer",
            fontSize: 12, color: TEXT_LO, fontFamily: DISPLAY,
          }}>
            ← Go back
          </button>
        </>
      )}

      {/* ── Step 3: Success ── */}
      {step === "success" && state.profile && (
        <div style={{ textAlign: "center" as const }}>
          <div style={{
            width: 68, height: 68, borderRadius: "50%",
            background: WISE_BG, border: `2px solid ${WISE_BORDER}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={WISE_MID} strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <p style={{ fontSize: 20, fontWeight: 700, color: TEXT_HI, margin: "0 0 6px" }}>
            Wise connected!
          </p>
          <p style={{ fontSize: 13, color: TEXT_MID, marginBottom: 22 }}>
            {state.profile.fullName} · {state.profile.email}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 10, justifyContent: "center" as const, marginBottom: 24 }}>
            {state.balances.map(b => (
              <div key={b.currency} style={{
                padding: "8px 16px", borderRadius: 10,
                background: WISE_BG, border: `1px solid ${WISE_BORDER}`,
              }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: WISE_MID, letterSpacing: "0.12em", margin: "0 0 2px", fontFamily: MONO }}>
                  {b.currency}
                </p>
                <p style={{ fontSize: 16, fontWeight: 700, color: TEXT_HI, margin: 0, fontFamily: MONO }}>
                  {formatAmount(b.amount, b.currency)}
                </p>
              </div>
            ))}
          </div>
          <button onClick={onClose} style={{
            ...btnBase, background: WISE_GREEN, color: WISE_DARK, cursor: "pointer",
          }}>
            Done — Go to dashboard
          </button>
        </div>
      )}
    </WiseShell>
  );
}

// ─── TxStatusPill ─────────────────────────────────────────────────────────────

function TxStatusPill({ status }: { status: WiseTransaction["status"] }) {
  const cfg: Record<string, { bg: string; color: string }> = {
    completed: { bg: "rgba(52,211,153,0.10)", color: "#6EE7B7" },
    pending:   { bg: "rgba(251,191,36,0.10)",  color: "#FCD34D" },
    cancelled: { bg: "rgba(156,163,175,0.10)", color: "rgba(156,163,175,0.75)" },
  };
  const { bg, color } = cfg[status] ?? cfg.pending;
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
      textTransform: "uppercase" as const, background: bg, color,
      padding: "2px 7px", borderRadius: 20, fontFamily: MONO,
      display: "inline-block", marginTop: 2,
    }}>
      {status}
    </span>
  );
}

// ─── WiseAccountCard ──────────────────────────────────────────────────────────

interface WiseAccountCardProps {
  onSend?: () => void;
  onDisconnect?: () => void;
  onConnect?: () => void;
  style?: React.CSSProperties;
}

export function WiseAccountCard({ onSend, onDisconnect, onConnect, style: styleProp }: WiseAccountCardProps) {
  const { state, disconnect, refreshBalances, refreshTransactions } = useWise();
  const [refreshing, setRefreshing] = React.useState(false);
  const [activeCurrency, setActiveCurrency] = React.useState("USD");
  const [showTx, setShowTx] = React.useState(false);
  const [disconnecting, setDisconnecting] = React.useState(false);

  const T = {
    surface: "var(--card, #161622)",
    border: "var(--border, rgba(255,255,255,0.08))",
    text: "var(--card-foreground, #f1f5f9)",
    textSub: "var(--muted-foreground, #94a3b8)",
    textMute: "color-mix(in srgb, var(--muted-foreground, #94a3b8) 70%, transparent)",
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshBalances(), refreshTransactions()]);
    setRefreshing(false);
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Wise from SuprahPay? You can reconnect at any time.")) return;
    setDisconnecting(true);
    await disconnect();
    setDisconnecting(false);
    onDisconnect?.();
  };

  const activeBalance = state.balances.find(b => b.currency === activeCurrency) ?? state.balances[0];

  // ── Disconnected state ──
  if (!state.connected) {
    return (
      <div style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 18,
        padding: "32px 28px",
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        textAlign: "center" as const,
        gap: 16,
        ...styleProp,
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Share+Tech+Mono&display=swap');`}</style>
        
        <div style={{
          width: 72, height: 72, borderRadius: 18,
          background: WISE_BG, border: `1px solid ${WISE_BORDER}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <WiseLogo size={44} />
        </div>

        <div>
          <p style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: "0 0 8px", fontFamily: DISPLAY }}>
            Connect your Wise account
          </p>
          <p style={{ fontSize: 13, color: T.textSub, margin: 0, lineHeight: 1.6, maxWidth: 380 }}>
            Use Wise as SuprahPay&apos;s primary banking layer — multi-currency balances,
            global payments, and local bank details in 9 currencies.
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8, justifyContent: "center" as const }}>
          {["🌍 160+ countries", "💱 Real FX rates", "🏦 9 currencies", "⚡ Instant transfers"].map(f => (
            <span key={f} style={{
              fontSize: 12, fontWeight: 600, color: WISE_MID,
              background: WISE_BG, border: `1px solid ${WISE_BORDER}`,
              padding: "4px 12px", borderRadius: 20,
            }}>{f}</span>
          ))}
        </div>

        <button onClick={onConnect} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "13px 28px", borderRadius: 12, border: "none",
          background: WISE_GREEN, color: WISE_DARK,
          fontFamily: DISPLAY, fontSize: 15, fontWeight: 700,
          cursor: "pointer", transition: "opacity 0.15s",
          marginTop: 4,
        }}>
          <WiseLogo size={22} />
          Connect Wise
        </button>
      </div>
    );
  }

  // ── Connected state ──
  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: 18,
      overflow: "hidden" as const,
      fontFamily: DISPLAY,
      ...styleProp,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Share+Tech+Mono&display=swap');
        @keyframes wiseSpin { to { transform: rotate(360deg); } }
        @keyframes wiseShimmer { 0%,100%{opacity:1} 50%{opacity:0.42} }
        .wise-curr-tab { cursor:pointer; transition: all 0.15s; border:none; outline:none; font-family: ${MONO}; }
        .wise-curr-tab:hover { background: ${WISE_BG} !important; }
        .wise-tx-row { transition: background 0.12s; }
        .wise-tx-row:hover { background: rgba(255,255,255,0.03); }
        .wise-action-btn { transition: all 0.15s; }
        .wise-action-btn:hover { opacity:0.82; transform: translateY(-1px); }
      `}</style>

      {/* Accent stripe */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${WISE_GREEN}, ${WISE_MID} 60%, transparent)` }} />

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 22px", borderBottom: `1px solid ${T.border}`,
        flexWrap: "wrap" as const, gap: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <WiseLogo size={32} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0, letterSpacing: "-0.01em" }}>
              {state.profile?.fullName}
            </p>
            <p style={{ fontSize: 11, color: T.textMute, margin: "1px 0 0", fontFamily: MONO }}>
              {state.profile?.email}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <DemoBadge />
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.10em",
            textTransform: "uppercase" as const, padding: "3px 9px", borderRadius: 20,
            background: WISE_BG, border: `1px solid ${WISE_BORDER}`,
            color: WISE_MID, fontFamily: MONO,
          }}>
            ● Connected
          </span>
          <button onClick={handleRefresh} disabled={refreshing} title="Refresh" style={{
            width: 30, height: 30, borderRadius: 8,
            background: SURFACE, border: `1px solid ${MODAL_BORDER}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: T.textSub,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ animation: refreshing ? "wiseSpin 0.9s linear infinite" : "none" }}>
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>
      </div>

      {/* Currency tabs */}
      <div style={{
        display: "flex", padding: "10px 22px 0", gap: 4,
        borderBottom: `1px solid ${T.border}`, overflowX: "auto" as const,
      }}>
        {state.balances.map(b => (
          <button key={b.currency} className="wise-curr-tab" onClick={() => setActiveCurrency(b.currency)}
            style={{
              padding: "6px 14px 10px", borderRadius: "8px 8px 0 0",
              background: activeCurrency === b.currency ? WISE_BG : "transparent",
              borderBottom: activeCurrency === b.currency ? `2px solid ${WISE_GREEN}` : "2px solid transparent",
              fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" as const,
              color: activeCurrency === b.currency ? WISE_MID : T.textMute,
              letterSpacing: "0.08em",
            }}>
            {b.currency}
          </button>
        ))}
      </div>

      {/* Balance */}
      {activeBalance && (
        <div style={{ padding: "20px 22px 18px", borderBottom: `1px solid ${T.border}` }}>
          <p style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.14em",
            textTransform: "uppercase" as const, color: T.textMute, margin: "0 0 8px", fontFamily: MONO,
          }}>
            Available balance
          </p>
          {state.isLoading ? (
            <div style={{ height: 44, width: 200, borderRadius: 8, background: WISE_BG, animation: "wiseShimmer 1.6s ease-in-out infinite" }} />
          ) : (
            <p style={{
              fontSize: 42, fontWeight: 700, color: T.text, margin: 0,
              letterSpacing: "-0.03em", fontFamily: DISPLAY, lineHeight: 1,
            }}>
              {formatAmount(activeBalance.amount, activeBalance.currency)}
            </p>
          )}
          {activeBalance.reservedAmount > 0 && (
            <p style={{ fontSize: 11, color: T.textMute, margin: "6px 0 0", fontFamily: MONO }}>
              {formatAmount(activeBalance.reservedAmount, activeBalance.currency)} reserved
            </p>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" as const }}>
            <button className="wise-action-btn" onClick={onSend} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 18px", borderRadius: 10, border: "none",
              background: WISE_GREEN, color: WISE_DARK,
              fontFamily: DISPLAY, fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={WISE_DARK} strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Send money
            </button>
            <button className="wise-action-btn" onClick={() => setShowTx(v => !v)} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 18px", borderRadius: 10,
              background: "transparent", border: `1px solid ${MODAL_BORDER}`,
              color: T.text, fontFamily: DISPLAY, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              {showTx ? "Hide" : "Transactions"}
            </button>
            <a href="https://wise.com" target="_blank" rel="noopener noreferrer" style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "10px 14px", borderRadius: 10,
              background: "transparent", border: `1px solid ${MODAL_BORDER}`,
              color: WISE_MID, fontFamily: DISPLAY, fontSize: 13, fontWeight: 600,
              textDecoration: "none",
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Open Wise
            </a>
          </div>
        </div>
      )}

      {/* Transaction list */}
      {showTx && (
        <div style={{ maxHeight: 300, overflowY: "auto" as const }}>
          <div style={{ padding: "10px 22px 8px", borderBottom: `1px solid ${T.border}` }}>
            <p style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
              textTransform: "uppercase" as const, color: T.textMute, margin: 0, fontFamily: MONO,
            }}>
              Recent transactions — {activeCurrency}
            </p>
          </div>
          {state.isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ padding: "12px 22px", display: "flex", gap: 12, borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: WISE_BG, animation: "wiseShimmer 1.6s ease-in-out infinite" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 11, width: "55%", borderRadius: 4, background: WISE_BG, animation: "wiseShimmer 1.6s ease-in-out infinite", marginBottom: 6 }} />
                    <div style={{ height: 9, width: "30%", borderRadius: 4, background: WISE_BG, animation: "wiseShimmer 1.6s ease-in-out infinite" }} />
                  </div>
                </div>
              ))
            : state.transactions.length === 0
            ? <p style={{ textAlign: "center" as const, padding: "24px", color: T.textMute, fontSize: 13 }}>No transactions yet</p>
            : state.transactions.map(tx => (
                <div key={tx.id} className="wise-tx-row" style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "11px 22px", borderBottom: `1px solid ${T.border}`,
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    background: tx.type === "credit" ? "rgba(34,197,94,0.10)" : WISE_BG,
                    border: `1px solid ${tx.type === "credit" ? "rgba(34,197,94,0.18)" : WISE_BORDER}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {tx.type === "credit"
                      ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2.5"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>
                      : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={WISE_MID} strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: T.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                      {tx.description}
                    </p>
                    <p style={{ fontSize: 10, color: T.textMute, margin: "2px 0 0", fontFamily: MONO }}>
                      {new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {tx.recipient && ` · ${tx.recipient}`}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
                    <p style={{
                      fontSize: 13, fontWeight: 700, margin: 0, fontFamily: MONO,
                      color: tx.type === "credit" ? "#4ADE80" : T.text,
                    }}>
                      {tx.type === "credit" ? "+" : "−"}{formatAmount(tx.amount, tx.currency)}
                    </p>
                    <TxStatusPill status={tx.status} />
                  </div>
                </div>
              ))
          }
        </div>
      )}

      {/* Footer */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 22px", borderTop: `1px solid ${T.border}`,
      }}>
        <WiseBadge />
        <button onClick={handleDisconnect} disabled={disconnecting} style={{
          fontSize: 11, fontWeight: 600, color: T.textMute,
          background: "none", border: "none",
          cursor: disconnecting ? "not-allowed" : "pointer",
          fontFamily: DISPLAY, letterSpacing: "0.04em",
          opacity: disconnecting ? 0.5 : 1,
        }}>
          {disconnecting ? "Disconnecting…" : "Disconnect Wise"}
        </button>
      </div>
    </div>
  );
}

// ─── WiseTransferModal ────────────────────────────────────────────────────────

interface WiseTransferModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (transferId: string) => void;
}

export function WiseTransferModal({ open, onClose, onSuccess }: WiseTransferModalProps) {
  const { state } = useWise();
  const [step, setStep] = React.useState<"form" | "confirm" | "success">("form");
  const [form, setForm] = React.useState({
    sourceCurrency: "USD",
    targetCurrency: "USD",
    amount: "",
    recipient: "",
    recipientEmail: "",
    reference: "",
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<{ transferId: string; estimatedDelivery: string } | null>(null);

  React.useEffect(() => {
    if (!open) {
      setStep("form");
      setForm({ sourceCurrency: "USD", targetCurrency: "USD", amount: "", recipient: "", recipientEmail: "", reference: "" });
      setErrors({});
      setSubmitting(false);
      setResult(null);
    }
  }, [open]);

  if (!open || !state.connected) return null;

  const CURRENCIES = ["USD", "EUR", "GBP", "PHP", "SGD", "AUD", "CAD", "JPY", "HKD"];
  const sourceBalance = state.balances.find(b => b.currency === form.sourceCurrency);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.recipient.trim()) e.recipient = "Recipient is required";
    if (!form.amount || parseFloat(form.amount) <= 0) e.amount = "Enter a valid amount";
    if (sourceBalance && parseFloat(form.amount) > sourceBalance.amount)
      e.amount = `Insufficient ${form.sourceCurrency} balance`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await wiseApiClient.createTransfer({
        sourceCurrency: form.sourceCurrency,
        targetCurrency: form.targetCurrency,
        amount: parseFloat(form.amount),
        recipient: form.recipient,
        reference: form.reference,
      });
      setResult({ transferId: res.transferId, estimatedDelivery: res.estimatedDelivery });
      setStep("success");
      onSuccess?.(res.transferId);
    } catch (err: unknown) {
      setErrors({ global: err instanceof Error ? err.message : "Transfer failed." });
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = (hasErr: boolean): React.CSSProperties => ({
    width: "100%", fontFamily: DISPLAY, fontSize: 13, background: SURFACE,
    border: `1px solid ${hasErr ? "#EF4444" : MODAL_BORDER}`, borderRadius: 8,
    padding: "9px 12px", color: TEXT_HI, outline: "none", boxSizing: "border-box",
    transition: "border-color 0.14s",
  });

  const selectStyle: React.CSSProperties = {
    fontFamily: DISPLAY, fontSize: 13, background: SURFACE,
    border: `1px solid ${MODAL_BORDER}`, borderRadius: 8,
    padding: "8px 10px", color: TEXT_HI, outline: "none", cursor: "pointer",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, letterSpacing: "0.10em",
    textTransform: "uppercase", color: TEXT_LO,
    display: "block", marginBottom: 5, fontFamily: MONO,
  };

  const btnBase: React.CSSProperties = {
    padding: "13px", borderRadius: 12, border: "none",
    fontFamily: DISPLAY, fontSize: 15, fontWeight: 700, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    transition: "all 0.15s",
  };

  return (
    <WiseShell onClose={onClose}>
      {step === "form" && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <WiseLogo size={38} />
            <div>
              <p style={{ fontSize: 19, fontWeight: 700, color: TEXT_HI, margin: 0 }}>Send via Wise</p>
              <p style={{ fontSize: 12, color: TEXT_LO, margin: "2px 0 0" }}>Global transfers at real exchange rates (demo)</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>Recipient name *</label>
              <input value={form.recipient} onChange={e => setForm(f => ({ ...f, recipient: e.target.value }))}
                placeholder="Full name or business" style={inputStyle(!!errors.recipient)} />
              {errors.recipient && <p style={{ fontSize: 11, color: "#F87171", marginTop: 4 }}>{errors.recipient}</p>}
            </div>

            <div>
              <label style={labelStyle}>Recipient email</label>
              <input value={form.recipientEmail} onChange={e => setForm(f => ({ ...f, recipientEmail: e.target.value }))}
                type="email" placeholder="recipient@example.com" style={inputStyle(false)} />
            </div>

            <div>
              <label style={labelStyle}>Amount *</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  type="number" placeholder="0.00" style={{ ...inputStyle(!!errors.amount), flex: 1 }} />
                <select value={form.sourceCurrency} onChange={e => setForm(f => ({ ...f, sourceCurrency: e.target.value }))} style={selectStyle}>
                  {state.balances.map(b => <option key={b.currency} value={b.currency}>{b.currency}</option>)}
                </select>
                <span style={{ color: TEXT_FAINT, fontSize: 14 }}>→</span>
                <select value={form.targetCurrency} onChange={e => setForm(f => ({ ...f, targetCurrency: e.target.value }))} style={selectStyle}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {sourceBalance && (
                <p style={{ fontSize: 11, color: TEXT_FAINT, marginTop: 4, fontFamily: MONO }}>
                  Balance: {formatAmount(sourceBalance.amount, sourceBalance.currency)}
                </p>
              )}
              {errors.amount && <p style={{ fontSize: 11, color: "#F87171", marginTop: 4 }}>{errors.amount}</p>}
            </div>

            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" as const }}>
              {["100", "500", "1000", "5000"].map(v => (
                <button key={v} onClick={() => setForm(f => ({ ...f, amount: v }))} style={{
                  padding: "5px 14px", borderRadius: 20,
                  border: `1px solid ${form.amount === v ? WISE_BORDER : MODAL_BORDER}`,
                  background: form.amount === v ? WISE_BG : SURFACE,
                  color: form.amount === v ? WISE_MID : TEXT_MID,
                  fontFamily: MONO, fontSize: 12, cursor: "pointer", transition: "all 0.13s",
                }}>
                  {v}
                </button>
              ))}
            </div>

            <div>
              <label style={labelStyle}>Reference / note</label>
              <input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
                placeholder="Invoice #, order ref… (optional)" style={inputStyle(false)} />
            </div>

            {errors.global && (
              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 10, padding: "10px 14px" }}>
                <p style={{ fontSize: 12, color: "#FCA5A5", margin: 0 }}>{errors.global}</p>
              </div>
            )}

            <button onClick={() => { if (validate()) setStep("confirm"); }} style={{
              ...btnBase, background: WISE_GREEN, color: WISE_DARK, marginTop: 4,
            }}>
              Review transfer →
            </button>
          </div>
        </>
      )}

      {step === "confirm" && (
        <>
          <p style={{ fontSize: 19, fontWeight: 700, color: TEXT_HI, margin: "0 0 20px" }}>Confirm transfer</p>
          <div style={{
            background: WISE_BG, border: `1px solid ${WISE_BORDER}`,
            borderRadius: 14, padding: "18px 20px", textAlign: "center" as const, marginBottom: 18,
          }}>
            <p style={{ fontSize: 11, color: WISE_MID, fontFamily: MONO, letterSpacing: "0.10em", textTransform: "uppercase" as const, margin: "0 0 6px" }}>Sending</p>
            <p style={{ fontSize: 40, fontWeight: 700, color: TEXT_HI, margin: 0, fontFamily: DISPLAY, letterSpacing: "-0.02em" }}>
              {formatAmount(parseFloat(form.amount), form.sourceCurrency)}
            </p>
            {form.sourceCurrency !== form.targetCurrency && (
              <p style={{ fontSize: 12, color: TEXT_LO, margin: "4px 0 0", fontFamily: MONO }}>
                → {form.targetCurrency} (live rate applied at transfer)
              </p>
            )}
          </div>

          <div style={{ border: `1px solid ${MODAL_BORDER}`, borderRadius: 12, overflow: "hidden" as const, marginBottom: 18 }}>
            {[
              { label: "To",        value: form.recipient },
              ...(form.recipientEmail ? [{ label: "Email",     value: form.recipientEmail }] : []),
              { label: "From",      value: `${form.sourceCurrency} balance` },
              ...(form.reference   ? [{ label: "Reference", value: form.reference }] : []),
              { label: "Est. fees", value: "Simulated (no real fee)" },
            ].map(({ label, value }, i) => (
              <div key={label} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "9px 14px",
                background: i % 2 === 0 ? SURFACE : "transparent",
                borderTop: i > 0 ? `1px solid ${MODAL_BORDER}` : undefined,
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: TEXT_LO, fontFamily: MONO }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_HI }}>{value}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep("form")} style={{
              flex: 1, ...btnBase, background: "transparent",
              border: `1px solid ${MODAL_BORDER}`, color: TEXT_MID,
            }}>← Back</button>
            <button onClick={handleSubmit} disabled={submitting} style={{
              flex: 2, ...btnBase,
              background: submitting ? WISE_BG : WISE_GREEN,
              color: submitting ? WISE_MID : WISE_DARK,
              cursor: submitting ? "not-allowed" : "pointer",
            }}>
              {submitting ? <><Spinner size={16} color={WISE_MID} /> Sending…</> : "Confirm & send"}
            </button>
          </div>
        </>
      )}

      {step === "success" && result && (
        <div style={{ textAlign: "center" as const, padding: "12px 0 6px" }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: WISE_BG, border: `2px solid ${WISE_BORDER}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={WISE_MID} strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <p style={{ fontSize: 20, fontWeight: 700, color: TEXT_HI, margin: "0 0 8px" }}>Transfer initiated! (demo)</p>
          <p style={{ fontSize: 13, color: TEXT_MID, marginBottom: 6 }}>
            {formatAmount(parseFloat(form.amount), form.sourceCurrency)} → {form.recipient}
          </p>
          <div style={{
            background: WISE_BG, border: `1px solid ${WISE_BORDER}`, borderRadius: 10,
            padding: "12px 18px", margin: "16px 0 22px", display: "inline-block",
          }}>
            <p style={{ fontSize: 9, fontFamily: MONO, letterSpacing: "0.12em", color: WISE_MID, margin: "0 0 3px", textTransform: "uppercase" as const }}>Transfer ID</p>
            <p style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: TEXT_HI, margin: "0 0 8px" }}>{result.transferId}</p>
            <p style={{ fontSize: 9, fontFamily: MONO, letterSpacing: "0.12em", color: WISE_MID, margin: "0 0 3px", textTransform: "uppercase" as const }}>Est. delivery</p>
            <p style={{ fontFamily: DISPLAY, fontSize: 13, fontWeight: 700, color: TEXT_HI, margin: 0 }}>{result.estimatedDelivery}</p>
          </div>
          <button onClick={onClose} style={{ ...btnBase, width: "100%", background: WISE_GREEN, color: WISE_DARK, cursor: "pointer" }}>Done</button>
        </div>
      )}
    </WiseShell>
  );
}

// ─── WisePanel ────────────────────────────────────────────────────────────────

export function WisePanel({ style: styleProp }: { style?: React.CSSProperties }) {
  const [connectOpen, setConnectOpen] = React.useState(false);
  const [transferOpen, setTransferOpen] = React.useState(false);

  return (
    <>
      <WiseAccountCard
        style={styleProp}
        onConnect={() => setConnectOpen(true)}
        onSend={() => setTransferOpen(true)}
        onDisconnect={() => setConnectOpen(true)}
      />
      <WiseConnectModal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        onConnected={() => setConnectOpen(false)}
      />
      <WiseTransferModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        onSuccess={id => console.log("[WisePanel] Transfer created:", id)}
      />
    </>
  );
}
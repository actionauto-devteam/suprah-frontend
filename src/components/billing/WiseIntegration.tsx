"use client";

/**
 * SuprahPay × Wise Integration
 * Complete redesign: cleaner modal, better visual hierarchy, professional spacing
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

function Spinner({ size = 14, color = TEXT_MID }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ animation: "wiseSpin 0.9s linear infinite", flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2.5"
        strokeDasharray="31.4 31.4" strokeLinecap="round" />
    </svg>
  );
}

// ─── FIXED: WiseShell — properly centered fixed overlay ────────────────────────

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
        @keyframes wiseSpin { to { transform: rotate(360deg); } }
        @keyframes wiseSlideUp { from { opacity:0; transform:translate(-50%, -48%) scale(0.96); } to { opacity:1; transform:translate(-50%, -50%) scale(1); } }
        @keyframes wiseFadeIn { from{opacity:0} to{opacity:1} }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 99998,
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(12px)",
          animation: "wiseFadeIn 0.2s ease both",
        }}
      />

      {/* Dialog - FIXED CENTERING */}
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
          width: "calc(100vw - 2rem)",
          maxWidth: "500px",
          maxHeight: "calc(100vh - 4rem)",
          overflowY: "auto",
          background: MODAL_BG,
          border: `1px solid ${MODAL_BORDER}`,
          borderRadius: 20,
          boxShadow: "0 50px 120px rgba(0,0,0,0.8), 0 0 1px rgba(255,255,255,0.1)",
          animation: "wiseSlideUp 0.24s cubic-bezier(0.16,1,0.3,1) both",
          fontFamily: DISPLAY,
        }}
      >
        {children}
      </div>
    </>
  );
}

// ─── Close Button ─────────────────────────────────────────────────────────────

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Close"
      style={{
        position: "absolute",
        top: 16,
        right: 16,
        width: 32,
        height: 32,
        borderRadius: 10,
        background: SURFACE,
        border: `1px solid ${MODAL_BORDER}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        zIndex: 10,
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = `rgba(255,255,255,0.08)`;
        e.currentTarget.style.borderColor = `rgba(255,255,255,0.15)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = SURFACE;
        e.currentTarget.style.borderColor = MODAL_BORDER;
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT_MID} strokeWidth="2.5">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
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

  return (
    <WiseShell onClose={onClose}>
      {/* ── Step 1: Intro ── */}
      {step === "intro" && (
        <div style={{ padding: "32px 28px", position: "relative" }}>
          <CloseButton onClick={onClose} />

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: WISE_BG,
                border: `1.5px solid ${WISE_BORDER}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                <WiseLogo size={32} />
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: TEXT_HI,
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}>
                  Connect Wise
                </h2>
                <p style={{
                  fontSize: 13,
                  color: TEXT_LO,
                  margin: "6px 0 0",
                  lineHeight: 1.5,
                }}>
                  Primary banking layer for SuprahPay
                </p>
              </div>
            </div>

            <p style={{
              fontSize: 13,
              color: TEXT_MID,
              margin: 0,
              lineHeight: 1.6,
            }}>
              Send money globally, manage multi-currency balances, and access local bank details—all through Wise's real exchange rates and low fees.
            </p>
          </div>

          {/* Benefits Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 28,
          }}>
            {[
              { icon: "🌍", label: "160+ countries", desc: "Send to the world" },
              { icon: "💱", label: "Real FX rates", desc: "No hidden markups" },
              { icon: "🏦", label: "9 currencies", desc: "Local bank details" },
              { icon: "⚡", label: "Instant", desc: "Transfers within Wise" },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  background: WISE_BG,
                  border: `1px solid ${WISE_BORDER}`,
                  borderRadius: 12,
                  padding: "14px 12px",
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: 24, margin: "0 0 6px", lineHeight: 1 }}>
                  {item.icon}
                </p>
                <p style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: TEXT_HI,
                  margin: "0 0 3px",
                  letterSpacing: "-0.01em",
                }}>
                  {item.label}
                </p>
                <p style={{
                  fontSize: 11,
                  color: TEXT_LO,
                  margin: 0,
                }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Info Box */}
          <div style={{
            background: `rgba(159,232,112,0.06)`,
            border: `1px solid ${WISE_BORDER}`,
            borderRadius: 12,
            padding: "12px 14px",
            marginBottom: 28,
          }}>
            <p style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: WISE_MID,
              margin: "0 0 6px",
            }}>
              Demo mode
            </p>
            <p style={{
              fontSize: 12,
              color: TEXT_MID,
              margin: 0,
              lineHeight: 1.5,
            }}>
              This is a simulated connection flow. Enter any 4+ character code in the next step to proceed.
            </p>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleStart}
            disabled={busy}
            style={{
              width: "100%",
              padding: "14px 0",
              borderRadius: 12,
              border: "none",
              background: WISE_GREEN,
              color: WISE_DARK,
              fontFamily: DISPLAY,
              fontSize: 15,
              fontWeight: 700,
              cursor: busy ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              transition: "all 0.15s",
              opacity: busy ? 0.75 : 1,
            }}
            onMouseEnter={(e) => {
              if (!busy) {
                e.currentTarget.style.background = "#8FDE60";
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = WISE_GREEN;
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {busy ? (
              <>
                <Spinner size={16} color={WISE_DARK} />
                Redirecting...
              </>
            ) : (
              <>
                <WiseLogo size={18} />
                Continue with Wise
              </>
            )}
          </button>
        </div>
      )}

      {/* ── Step 2: Verify ── */}
      {step === "verify" && (
        <div style={{ padding: "36px 28px", position: "relative", textAlign: "center" }}>
          <CloseButton onClick={onClose} />

          <div style={{ marginBottom: 28 }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: WISE_BG,
              border: `1.5px solid ${WISE_BORDER}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <WiseLogo size={36} />
            </div>
            <h2 style={{
              fontSize: 22,
              fontWeight: 700,
              color: TEXT_HI,
              margin: "0 0 8px",
              letterSpacing: "-0.02em",
            }}>
              Enter demo code
            </h2>
            <p style={{
              fontSize: 13,
              color: TEXT_LO,
              margin: 0,
              lineHeight: 1.5,
            }}>
              Type any 4+ characters to proceed with the demo
            </p>
          </div>

          <div style={{
            background: `rgba(251,191,36,0.08)`,
            border: `1px solid rgba(251,191,36,0.25)`,
            borderRadius: 10,
            padding: "10px 12px",
            marginBottom: 24,
          }}>
            <p style={{
              fontSize: 11,
              color: "#FCD34D",
              margin: 0,
              fontWeight: 600,
            }}>
              ✓ In production, we verify through your registered email
            </p>
          </div>

          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            placeholder="Enter code (e.g., DEMO)"
            autoFocus
            style={{
              width: "100%",
              padding: "14px 16px",
              fontFamily: MONO,
              fontSize: 16,
              letterSpacing: "0.08em",
              textAlign: "center",
              background: SURFACE,
              border: `1.5px solid ${error ? "#EF4444" : code.length >= 4 ? WISE_BORDER : MODAL_BORDER}`,
              borderRadius: 10,
              color: TEXT_HI,
              outline: "none",
              boxSizing: "border-box",
              marginBottom: 10,
              transition: "all 0.15s",
            }}
          />

          {error && (
            <p style={{
              fontSize: 12,
              color: "#FCA5A5",
              margin: "0 0 20px",
              textAlign: "center",
            }}>
              {error}
            </p>
          )}

          {state.error && (
            <div style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.22)",
              borderRadius: 10,
              padding: "10px 12px",
              marginBottom: 20,
            }}>
              <p style={{
                fontSize: 12,
                color: "#FCA5A5",
                margin: 0,
              }}>
                {state.error}
              </p>
            </div>
          )}

          <button
            onClick={handleVerify}
            disabled={busy || code.trim().length < 4}
            style={{
              width: "100%",
              padding: "14px 0",
              borderRadius: 10,
              border: "none",
              background: code.trim().length >= 4 && !busy ? WISE_GREEN : WISE_BG,
              color: code.trim().length >= 4 && !busy ? WISE_DARK : WISE_MID,
              fontFamily: DISPLAY,
              fontSize: 15,
              fontWeight: 700,
              cursor: code.trim().length >= 4 && !busy ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              transition: "all 0.15s",
              opacity: busy ? 0.75 : 1,
            }}
            onMouseEnter={(e) => {
              if (code.trim().length >= 4 && !busy) {
                e.currentTarget.style.background = "#8FDE60";
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background =
                code.trim().length >= 4 && !busy ? WISE_GREEN : WISE_BG;
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {busy ? (
              <>
                <Spinner size={16} color={WISE_MID} />
                Verifying...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Verify & Connect
              </>
            )}
          </button>

          <button
            onClick={() => setStep("intro")}
            style={{
              marginTop: 12,
              width: "100%",
              padding: "10px 0",
              background: "none",
              border: "none",
              color: TEXT_LO,
              fontFamily: DISPLAY,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = TEXT_MID;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = TEXT_LO;
            }}
          >
            ← Back
          </button>
        </div>
      )}

      {/* ── Step 3: Success ── */}
      {step === "success" && state.profile && (
        <div style={{ padding: "40px 28px", position: "relative", textAlign: "center" }}>
          <CloseButton onClick={onClose} />

          <div style={{
            width: 72,
            height: 72,
            borderRadius: 18,
            background: WISE_BG,
            border: `2px solid ${WISE_BORDER}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={WISE_MID} strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>

          <h2 style={{
            fontSize: 24,
            fontWeight: 700,
            color: TEXT_HI,
            margin: "0 0 8px",
            letterSpacing: "-0.02em",
          }}>
            Wise connected!
          </h2>

          <p style={{
            fontSize: 13,
            color: TEXT_MID,
            margin: "0 0 24px",
            lineHeight: 1.6,
          }}>
            {state.profile.fullName} · {state.profile.email}
          </p>

          {state.balances.length > 0 && (
            <div style={{
              background: WISE_BG,
              border: `1px solid ${WISE_BORDER}`,
              borderRadius: 12,
              padding: "16px 12px",
              marginBottom: 24,
            }}>
              <p style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: WISE_MID,
                margin: "0 0 12px",
              }}>
                Available balances
              </p>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))",
                gap: 8,
              }}>
                {state.balances.slice(0, 3).map((b) => (
                  <div key={b.currency} style={{
                    background: `rgba(159,232,112,0.04)`,
                    border: `1px solid ${WISE_BORDER}`,
                    borderRadius: 8,
                    padding: "8px 10px",
                  }}>
                    <p style={{
                      fontSize: 9,
                      fontFamily: MONO,
                      letterSpacing: "0.08em",
                      color: WISE_MID,
                      margin: "0 0 3px",
                      fontWeight: 700,
                    }}>
                      {b.currency}
                    </p>
                    <p style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: TEXT_HI,
                      margin: 0,
                    }}>
                      {formatAmount(b.amount, b.currency)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            style={{
              width: "100%",
              padding: "14px 0",
              borderRadius: 12,
              border: "none",
              background: WISE_GREEN,
              color: WISE_DARK,
              fontFamily: DISPLAY,
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#8FDE60";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = WISE_GREEN;
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={WISE_DARK} strokeWidth="2.5">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Go to Dashboard
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
    pending: { bg: "rgba(251,191,36,0.10)", color: "#FCD34D" },
    cancelled: { bg: "rgba(156,163,175,0.10)", color: "rgba(156,163,175,0.75)" },
  };
  const { bg, color } = cfg[status] ?? cfg.pending;
  return (
    <span style={{
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      background: bg,
      color,
      padding: "2px 7px",
      borderRadius: 20,
      fontFamily: MONO,
      display: "inline-block",
      marginTop: 2,
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
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 16,
        ...styleProp,
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Share+Tech+Mono&display=swap');`}</style>

        <div style={{
          width: 72,
          height: 72,
          borderRadius: 18,
          background: WISE_BG,
          border: `1px solid ${WISE_BORDER}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <WiseLogo size={44} />
        </div>

        <div>
          <p style={{
            fontSize: 18,
            fontWeight: 700,
            color: T.text,
            margin: "0 0 8px",
            fontFamily: DISPLAY,
          }}>
            Connect your Wise account
          </p>
          <p style={{
            fontSize: 13,
            color: T.textSub,
            margin: 0,
            lineHeight: 1.6,
            maxWidth: 380,
          }}>
            Use Wise as SuprahPay's primary banking layer — multi-currency balances,
            global payments, and local bank details in 9 currencies.
          </p>
        </div>

        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          justifyContent: "center",
        }}>
          {["🌍 160+ countries", "💱 Real FX rates", "🏦 9 currencies", "⚡ Instant transfers"].map(f => (
            <span
              key={f}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: WISE_MID,
                background: WISE_BG,
                border: `1px solid ${WISE_BORDER}`,
                padding: "4px 12px",
                borderRadius: 20,
              }}
            >
              {f}
            </span>
          ))}
        </div>

        <button
          onClick={onConnect}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "13px 28px",
            borderRadius: 12,
            border: "none",
            background: WISE_GREEN,
            color: WISE_DARK,
            fontFamily: DISPLAY,
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.15s",
            marginTop: 4,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#8FDE60";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = WISE_GREEN;
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
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
      overflow: "hidden",
      fontFamily: DISPLAY,
      ...styleProp,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Share+Tech+Mono&display=swap');
        @keyframes wiseSpin { to { transform: rotate(360deg); } }
        .wise-curr-tab { cursor:pointer; transition: all 0.15s; border:none; outline:none; font-family: ${MONO}; }
        .wise-curr-tab:hover { background: ${WISE_BG} !important; }
        .wise-tx-row { transition: background 0.12s; }
        .wise-tx-row:hover { background: rgba(255,255,255,0.03); }
      `}</style>

      {/* Accent stripe */}
      <div style={{
        height: 3,
        background: `linear-gradient(90deg, ${WISE_GREEN}, ${WISE_MID} 60%, transparent)`,
      }} />

      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 22px",
        borderBottom: `1px solid ${T.border}`,
        flexWrap: "wrap",
        gap: 10,
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <WiseLogo size={32} />
          <div>
            <p style={{
              fontSize: 14,
              fontWeight: 700,
              color: T.text,
              margin: 0,
              letterSpacing: "-0.01em",
            }}>
              {state.profile?.fullName}
            </p>
            <p style={{
              fontSize: 11,
              color: T.textMute,
              margin: "1px 0 0",
              fontFamily: MONO,
            }}>
              {state.profile?.email}
            </p>
          </div>
        </div>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            padding: "3px 9px",
            borderRadius: 20,
            background: WISE_BG,
            border: `1px solid ${WISE_BORDER}`,
            color: WISE_MID,
            fontFamily: MONO,
          }}>
            ● Connected
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${T.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: T.textSub,
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                animation: refreshing ? "wiseSpin 0.9s linear infinite" : "none",
              }}
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>
      </div>

      {/* Currency tabs */}
      <div style={{
        display: "flex",
        padding: "10px 22px 0",
        gap: 4,
        borderBottom: `1px solid ${T.border}`,
        overflowX: "auto",
      }}>
        {state.balances.map((b) => (
          <button
            key={b.currency}
            className="wise-curr-tab"
            onClick={() => setActiveCurrency(b.currency)}
            style={{
              padding: "6px 14px 10px",
              borderRadius: "8px 8px 0 0",
              background:
                activeCurrency === b.currency ? WISE_BG : "transparent",
              borderBottom:
                activeCurrency === b.currency
                  ? `2px solid ${WISE_GREEN}`
                  : "2px solid transparent",
              fontSize: 11,
              fontWeight: 700,
              whiteSpace: "nowrap",
              color:
                activeCurrency === b.currency ? WISE_MID : T.textMute,
              letterSpacing: "0.08em",
            }}
          >
            {b.currency}
          </button>
        ))}
      </div>

      {/* Balance */}
      {activeBalance && (
        <div style={{
          padding: "20px 22px 18px",
          borderBottom: `1px solid ${T.border}`,
        }}>
          <p style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: T.textMute,
            margin: "0 0 8px",
            fontFamily: MONO,
          }}>
            Available balance
          </p>
          {state.isLoading ? (
            <div style={{
              height: 44,
              width: 200,
              borderRadius: 8,
              background: WISE_BG,
            }} />
          ) : (
            <p style={{
              fontSize: 42,
              fontWeight: 700,
              color: T.text,
              margin: 0,
              letterSpacing: "-0.03em",
              fontFamily: DISPLAY,
              lineHeight: 1,
            }}>
              {formatAmount(activeBalance.amount, activeBalance.currency)}
            </p>
          )}
          {activeBalance.reservedAmount > 0 && (
            <p style={{
              fontSize: 11,
              color: T.textMute,
              margin: "6px 0 0",
              fontFamily: MONO,
            }}>
              {formatAmount(
                activeBalance.reservedAmount,
                activeBalance.currency
              )}{" "}
              reserved
            </p>
          )}

          <div style={{
            display: "flex",
            gap: 10,
            marginTop: 16,
            flexWrap: "wrap",
          }}>
            <button
              onClick={onSend}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                borderRadius: 10,
                border: "none",
                background: WISE_GREEN,
                color: WISE_DARK,
                fontFamily: DISPLAY,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.85";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke={WISE_DARK}
                strokeWidth="2.5"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Send money
            </button>
            <button
              onClick={() => setShowTx((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                borderRadius: 10,
                background: "transparent",
                border: `1px solid ${T.border}`,
                color: T.text,
                fontFamily: DISPLAY,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = WISE_GREEN;
                e.currentTarget.style.color = WISE_GREEN;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = T.border;
                e.currentTarget.style.color = T.text;
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              {showTx ? "Hide" : "Transactions"}
            </button>
            <a
              href="https://wise.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 14px",
                borderRadius: 10,
                background: "transparent",
                border: `1px solid ${T.border}`,
                color: WISE_MID,
                fontFamily: DISPLAY,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = WISE_GREEN;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = T.border;
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Open Wise
            </a>
          </div>
        </div>
      )}

      {/* Transaction list */}
      {showTx && (
        <div style={{
          maxHeight: 300,
          overflowY: "auto",
        }}>
          <div style={{
            padding: "10px 22px 8px",
            borderBottom: `1px solid ${T.border}`,
          }}>
            <p style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: T.textMute,
              margin: 0,
              fontFamily: MONO,
            }}>
              Recent transactions — {activeCurrency}
            </p>
          </div>
          {state.isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    padding: "12px 22px",
                    display: "flex",
                    gap: 12,
                    borderBottom: `1px solid ${T.border}`,
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      background: WISE_BG,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        height: 11,
                        width: "55%",
                        borderRadius: 4,
                        background: WISE_BG,
                        marginBottom: 6,
                      }}
                    />
                    <div
                      style={{
                        height: 9,
                        width: "30%",
                        borderRadius: 4,
                        background: WISE_BG,
                      }}
                    />
                  </div>
                </div>
              ))
            : state.transactions.length === 0
            ? (
                <p
                  style={{
                    textAlign: "center",
                    padding: "24px",
                    color: T.textMute,
                    fontSize: 13,
                  }}
                >
                  No transactions yet
                </p>
              )
            : state.transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="wise-tx-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "11px 22px",
                    borderBottom: `1px solid ${T.border}`,
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      flexShrink: 0,
                      background:
                        tx.type === "credit"
                          ? "rgba(34,197,94,0.10)"
                          : WISE_BG,
                      border: `1px solid ${tx.type === "credit"
                        ? "rgba(34,197,94,0.18)"
                        : WISE_BORDER
                      }`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {tx.type === "credit" ? (
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#4ADE80"
                        strokeWidth="2.5"
                      >
                        <line x1="12" y1="19" x2="12" y2="5" />
                        <polyline points="5 12 12 5 19 12" />
                      </svg>
                    ) : (
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={WISE_MID}
                        strokeWidth="2.5"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <polyline points="19 12 12 19 5 12" />
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: T.text,
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {tx.description}
                    </p>
                    <p
                      style={{
                        fontSize: 10,
                        color: T.textMute,
                        margin: "2px 0 0",
                        fontFamily: MONO,
                      }}
                    >
                      {new Date(tx.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                      {tx.recipient && ` · ${tx.recipient}`}
                    </p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        margin: 0,
                        fontFamily: MONO,
                        color:
                          tx.type === "credit" ? "#4ADE80" : T.text,
                      }}
                    >
                      {tx.type === "credit" ? "+" : "−"}
                      {formatAmount(tx.amount, tx.currency)}
                    </p>
                    <TxStatusPill status={tx.status} />
                  </div>
                </div>
              ))
          }
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 22px",
          borderTop: `1px solid ${T.border}`,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: 9,
            background: WISE_BG,
            border: `1px solid ${WISE_BORDER}`,
          }}
        >
          <WiseLogo size={14} />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: WISE_MID,
              fontFamily: MONO,
              letterSpacing: "0.06em",
            }}
          >
            wise
          </span>
        </div>
        <button
          onClick={handleDisconnect}
          disabled={disconnecting}
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: T.textMute,
            background: "none",
            border: "none",
            cursor: disconnecting ? "not-allowed" : "pointer",
            fontFamily: DISPLAY,
            letterSpacing: "0.04em",
            opacity: disconnecting ? 0.5 : 1,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => {
            if (!disconnecting) {
              e.currentTarget.style.color = T.text;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = T.textMute;
          }}
        >
          {disconnecting ? "Disconnecting..." : "Disconnect Wise"}
        </button>
      </div>
    </div>
  );
}

// ─── WisePanel ────────────────────────────────────────────────────────────────

export function WisePanel({ style: styleProp }: { style?: React.CSSProperties }) {
  const [connectOpen, setConnectOpen] = React.useState(false);

  return (
    <>
      <WiseAccountCard
        style={styleProp}
        onConnect={() => setConnectOpen(true)}
        onDisconnect={() => setConnectOpen(true)}
      />
      <WiseConnectModal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        onConnected={() => setConnectOpen(false)}
      />
    </>
  );
}
"use client";

import * as React from "react";
import {
  linkedAccountApi,
  LinkedProvider,
  LinkedStatus,
  LinkedTransaction,
  LinkedBalance,
} from "@/lib/linkedAccountApi";

/* ── Theme: SuprahPay cockpit — dark glass, emerald→mint glow ─────────────── */
const GREEN = "#16A34A";        // brand anchor
const GREEN_DARK = "#0F7A39";
const MINT = "#34F5A3";         // luminous accent / glow
const GREEN_SOFT = "rgba(22,163,74,0.16)";
const GREEN_BORDER = "rgba(52,245,163,0.30)";
const FONT = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const MONO = "'JetBrains Mono', 'SF Mono', ui-monospace, 'Cascadia Code', Menlo, monospace";

const C = {
  base: "#0A0E15",                       // opaque card backdrop
  surface: "rgba(255,255,255,0.035)",    // glass fill on dark
  surfaceAlt: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.09)",
  borderBright: "rgba(255,255,255,0.16)",
  text: "#EAF0F7",
  textSub: "#98A4B4",
  textMute: "#5C6776",
  danger: "#F87171",
  dangerBg: "rgba(248,113,113,0.10)",
};

/* Shared glass-card surface */
const cardSurface: React.CSSProperties = {
  backgroundColor: C.base,
  backgroundImage:
    "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 38%, rgba(255,255,255,0) 100%)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  border: `1px solid ${C.border}`,
  boxShadow:
    "0 1px 0 0 rgba(255,255,255,0.06) inset, 0 28px 70px -28px rgba(0,0,0,0.85)",
};

/* Ambient glow blob — drop inside a position:relative card */
function Glow({
  x, y, size = 240, color = MINT, opacity = 0.16,
}: { x: number; y: number; size?: number; color?: string; opacity?: number }) {
  return (
    <div aria-hidden style={{
      position: "absolute", top: y, left: x, width: size, height: size, borderRadius: "50%",
      background: `radial-gradient(circle at center, ${color} 0%, transparent 68%)`,
      opacity, filter: "blur(24px)", pointerEvents: "none", zIndex: 0,
    }} />
  );
}

const GLOBAL_CSS = `
@keyframes la-spin{to{transform:rotate(360deg)}}
@keyframes la-pulse{0%,100%{opacity:1;box-shadow:0 0 0 0 ${MINT}66}50%{opacity:.55;box-shadow:0 0 0 4px ${MINT}00}}
.la-pulse{animation:la-pulse 2.4s ease-in-out infinite}
@media (prefers-reduced-motion: reduce){.la-pulse{animation:none}}
`;

function fmtMoney(amount: number, currency: string) {
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

// Wise-only. Kept as a function (taking an optional provider) so call sites
// don't need to change if another provider is added back later.
function providerMeta(_p?: LinkedProvider) {
  return { label: "Wise", color: GREEN, soft: GREEN_SOFT, border: GREEN_BORDER };
}

/* ── Provider logo (inline, no external assets) ───────────────────────────── */
function WiseLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
      <defs>
        <linearGradient id="wiseGrad" x1="0" y1="0" x2="60" y2="60">
          <stop offset="0" stopColor={MINT} />
          <stop offset="1" stopColor={GREEN} />
        </linearGradient>
      </defs>
      <rect width="60" height="60" rx="14" fill="url(#wiseGrad)" />
      <path d="M18 18h22l-6 9 6 9H18l8-9-8-9z" fill="#06130C" />
    </svg>
  );
}
function Logo({ size }: { p?: LinkedProvider; size?: number }) {
  return <WiseLogo size={size} />;
}

function Spinner({ size = 16, color = C.textSub }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ animation: "la-spin 0.9s linear infinite", flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2.5"
        strokeDasharray="31.4 31.4" strokeLinecap="round" />
    </svg>
  );
}

/* ── Context ──────────────────────────────────────────────────────────────── */
interface LinkedCtx {
  status: LinkedStatus | null;
  loading: boolean;
  error: string | null;
  banner: { type: "success" | "error"; text: string } | null;
  clearBanner: () => void;
  walletBalance: number;       // primary USD balance — drives the wallet
  walletCurrency: string;
  connected: boolean;
  refresh: () => Promise<void>;
  sync: () => Promise<void>;
  connect: (p: LinkedProvider) => Promise<void>;
  disconnect: (p?: LinkedProvider) => Promise<void>;
}

const Ctx = React.createContext<LinkedCtx | null>(null);
export function useLinkedAccount() {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useLinkedAccount must be used within LinkedAccountProvider");
  return v;
}

function primaryWallet(status: LinkedStatus | null): { amount: number; currency: string } {
  const p = status?.primary;
  if (!p || !p.balances?.length) return { amount: 0, currency: "USD" };
  const usd = p.balances.find((b) => b.currency === "USD") ?? p.balances[0];
  return { amount: usd.amount ?? 0, currency: usd.currency ?? "USD" };
}

export function LinkedAccountProvider({
  children,
  onWalletChange,
}: {
  children: React.ReactNode;
  onWalletChange?: (amount: number) => void;
}) {
  const [status, setStatus] = React.useState<LinkedStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [banner, setBanner] = React.useState<LinkedCtx["banner"]>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await linkedAccountApi.getStatus();
      setStatus(s);
      onWalletChange?.(primaryWallet(s).amount);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to load account");
    } finally {
      setLoading(false);
    }
  }, [onWalletChange]);

  const sync = React.useCallback(async () => {
    setError(null);
    try {
      await linkedAccountApi.sync();
      await refresh();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Sync failed");
    }
  }, [refresh]);

  const connect = React.useCallback(async (p: LinkedProvider) => {
    setError(null);
    try {
      const url = await linkedAccountApi.startConnect(p);
      if (!url) throw new Error("No authorize URL returned");
      window.location.href = url; // real OAuth redirect
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Could not start connection");
    }
  }, []);

  const disconnect = React.useCallback(async (p?: LinkedProvider) => {
    setError(null);
    try {
      await linkedAccountApi.disconnect(p);
      await refresh();
      setBanner({ type: "success", text: "Account disconnected." });
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Disconnect failed");
    }
  }, [refresh]);

  // Detect OAuth return (?connected= / ?error=) and clean the URL.
  React.useEffect(() => {
    refresh();
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const err = params.get("error");
    if (connected) {
      setBanner({ type: "success", text: `${providerMeta(connected as LinkedProvider).label} connected successfully.` });
    } else if (err) {
      setBanner({ type: "error", text: `Connection failed (${err.replace(/_/g, " ")}).` });
    }
    if (connected || err) {
      params.delete("connected");
      params.delete("error");
      const qs = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wallet = primaryWallet(status);
  const value: LinkedCtx = {
    status,
    loading,
    error,
    banner,
    clearBanner: () => setBanner(null),
    walletBalance: wallet.amount,
    walletCurrency: wallet.currency,
    connected: !!status?.connected,
    refresh,
    sync,
    connect,
    disconnect,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* ── Reusable bits ────────────────────────────────────────────────────────── */
function GreenButton({
  children, onClick, disabled, full,
}: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; color?: string; full?: boolean;
}) {
  const [h, setH] = React.useState(false);
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        position: "relative",
        width: full ? "100%" : undefined,
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        padding: "12px 18px", borderRadius: 12,
        border: `1px solid ${disabled ? "rgba(255,255,255,0.10)" : GREEN_BORDER}`,
        background: disabled
          ? "rgba(255,255,255,0.06)"
          : `linear-gradient(180deg, ${MINT} -20%, ${GREEN} 55%, ${GREEN_DARK} 130%)`,
        color: disabled ? C.textMute : "#06130C",
        fontFamily: FONT, fontSize: 14, fontWeight: 800, letterSpacing: "0.01em",
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled
          ? "none"
          : h
            ? `0 0 0 1px ${MINT}55, 0 10px 30px -8px ${GREEN}aa`
            : `0 8px 22px -10px ${GREEN}88`,
        transform: h && !disabled ? "translateY(-1px)" : "none",
        transition: "box-shadow 0.18s, transform 0.18s, background 0.18s",
      }}
    >
      {children}
    </button>
  );
}

function Banner({ type, text, onClose }: { type: "success" | "error"; text: string; onClose: () => void }) {
  const ok = type === "success";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12,
      marginBottom: 14, fontFamily: FONT, fontSize: 13, fontWeight: 600,
      background: ok ? GREEN_SOFT : C.dangerBg,
      border: `1px solid ${ok ? GREEN_BORDER : "rgba(248,113,113,0.28)"}`,
      color: ok ? MINT : C.danger,
      backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
    }}>
      <span style={{ flex: 1 }}>{text}</span>
      <button onClick={onClose} aria-label="Dismiss" style={{
        background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: 16, lineHeight: 1,
      }}>×</button>
    </div>
  );
}

/* ── Connect Wise (disconnected state) ────────────────────────────────────── */
function ProviderPicker() {
  const { connect, error, banner, clearBanner } = useLinkedAccount();
  const [busy, setBusy] = React.useState(false);

  const m = providerMeta("wise");

  const handle = async () => {
    setBusy(true);
    await connect("wise");
    // If connect throws it sets error and we re-enable; on success the page redirects.
    setBusy(false);
  };

  return (
    <div style={{ ...cardSurface, position: "relative", overflow: "hidden", borderRadius: 18, padding: 28, fontFamily: FONT }}>
      <style>{GLOBAL_CSS}</style>
      <style>{`
        @media (max-width: 560px){
          .la-connect-cta{flex:1 1 100% !important}
          .la-connect-cta>button{width:100% !important}
        }
      `}</style>
      <Glow x={-60} y={-90} size={280} color={MINT} opacity={0.14} />
      <div style={{ position: "relative", zIndex: 1 }}>
        {banner && <Banner type={banner.type} text={banner.text} onClose={clearBanner} />}

        <div style={{ marginBottom: 22, maxWidth: 640 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: MINT }}>
            SuprahPay · Wallet source
          </span>
          <p style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: "10px 0 0", letterSpacing: "-0.01em" }}>
            Link your Wise account
          </p>
          <p style={{ fontSize: 13.5, color: C.textSub, margin: "6px 0 0", lineHeight: 1.6 }}>
            Connect Wise to power your SuprahPay wallet. Your available balance syncs automatically once linked.
          </p>
        </div>

        <div style={{
          border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 20, flexWrap: "wrap", background: "rgba(255,255,255,0.025)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0, flex: "1 1 320px" }}>
            <div style={{
              width: 52, height: 52, borderRadius: 13, background: m.soft,
              border: `1px solid ${m.border}`, display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 24px -6px ${MINT}55`, flexShrink: 0,
            }}>
              <Logo p="wise" size={30} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>Wise</p>
              <p style={{ fontSize: 12.5, color: C.textSub, margin: "4px 0 0", lineHeight: 1.5 }}>
                Multi-currency balances, real FX rates, global transfers · Secure OAuth
              </p>
            </div>
          </div>
          <div className="la-connect-cta" style={{ flex: "0 0 auto" }}>
            <GreenButton onClick={handle} disabled={busy}>
              {busy ? (<><Spinner size={15} color="#06130C" /> Redirecting…</>) : (<>Connect Wise</>)}
            </GreenButton>
          </div>
        </div>

        {error && (
          <p style={{ marginTop: 14, fontSize: 13, color: C.danger, background: C.dangerBg,
            border: "1px solid rgba(248,113,113,0.28)", borderRadius: 10, padding: "10px 12px" }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Connected account card ───────────────────────────────────────────────── */
function ConnectedCard() {
  const { status, sync, disconnect, banner, clearBanner } = useLinkedAccount();
  const primary = status!.primary!;
  const m = providerMeta(primary.provider);

  const [activeCurrency, setActiveCurrency] = React.useState(
    primary.balances?.[0]?.currency ?? "USD"
  );
  const [syncing, setSyncing] = React.useState(false);
  const [showTx, setShowTx] = React.useState(false);
  const [txLoading, setTxLoading] = React.useState(false);
  const [txError, setTxError] = React.useState<string | null>(null);
  const [txs, setTxs] = React.useState<LinkedTransaction[]>([]);
  const [disconnecting, setDisconnecting] = React.useState(false);

  const activeBalance: LinkedBalance =
    primary.balances.find((b) => b.currency === activeCurrency) ?? primary.balances[0];

  const handleSync = async () => {
    setSyncing(true);
    await sync();
    setSyncing(false);
  };

  const toggleTx = async () => {
    const next = !showTx;
    setShowTx(next);
    if (next && txs.length === 0) {
      setTxLoading(true);
      setTxError(null);
      try {
        setTxs(await linkedAccountApi.getTransactions(activeCurrency));
      } catch (e: any) {
        setTxError(e?.response?.data?.message || e?.message || "Could not load transactions");
      } finally {
        setTxLoading(false);
      }
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm(`Disconnect ${m.label} from SuprahPay?`)) return;
    setDisconnecting(true);
    await disconnect(primary.provider);
    setDisconnecting(false);
  };

  return (
    <div style={{ ...cardSurface, position: "relative", borderRadius: 18, overflow: "hidden", fontFamily: FONT }}>
      <style>{GLOBAL_CSS}</style>
      <Glow x={-70} y={40} size={300} color={MINT} opacity={0.12} />
      <Glow x={260} y={-100} size={260} color={GREEN} opacity={0.10} />

      {/* Glowing accent rail */}
      <div style={{ position: "relative", zIndex: 1, height: 3,
        background: `linear-gradient(90deg, ${MINT}, ${GREEN} 45%, transparent)`,
        boxShadow: `0 0 14px ${MINT}88` }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ padding: "14px 20px 0" }}>
          {banner && <Banner type={banner.type} text={banner.text} onClose={clearBanner} />}
        </div>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "4px 20px 16px", borderBottom: `1px solid ${C.border}`, gap: 10, flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: m.soft,
              border: `1px solid ${m.border}`, display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 22px -6px ${MINT}55`,
            }}>
              <Logo p={primary.provider} size={26} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>{primary.profile.fullName}</p>
              <p style={{ fontSize: 12, color: C.textMute, margin: "2px 0 0" }}>{primary.profile.email}</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 11, fontWeight: 700, padding: "4px 11px", borderRadius: 999,
              background: GREEN_SOFT, color: MINT, border: `1px solid ${GREEN_BORDER}`,
            }}>
              <span className="la-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: MINT }} />
              Connected
            </span>
            <button onClick={handleSync} disabled={syncing} title="Sync balance" style={{
              width: 34, height: 34, borderRadius: 9, background: C.surface,
              border: `1px solid ${C.border}`, display: "flex", alignItems: "center",
              justifyContent: "center", cursor: syncing ? "default" : "pointer", color: C.textSub,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" style={{ animation: syncing ? "la-spin 0.9s linear infinite" : "none" }}>
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </button>
          </div>
        </div>

        {/* Currency tabs */}
        {primary.balances.length > 1 && (
          <div style={{ display: "flex", gap: 4, padding: "10px 20px 0", borderBottom: `1px solid ${C.border}`, overflowX: "auto" }}>
            {primary.balances.map((b) => (
              <button key={b.currency} onClick={() => setActiveCurrency(b.currency)} style={{
                padding: "6px 14px 10px", border: "none", background: "transparent",
                borderBottom: activeCurrency === b.currency ? `2px solid ${MINT}` : "2px solid transparent",
                fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: "0.04em",
                color: activeCurrency === b.currency ? MINT : C.textMute, fontFamily: MONO,
              }}>{b.currency}</button>
            ))}
          </div>
        )}

        {/* Balance — the signature element */}
        {activeBalance && (
          <div style={{ padding: "22px 20px 18px", borderBottom: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase",
              color: C.textMute, margin: "0 0 10px", fontFamily: MONO }}>Available balance</p>
            <p style={{
              fontSize: 42, fontWeight: 700, color: C.text, margin: 0, lineHeight: 1,
              fontFamily: MONO, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em",
              textShadow: `0 0 28px ${MINT}40`,
            }}>
              {fmtMoney(activeBalance.amount, activeBalance.currency)}
            </p>
            {activeBalance.reservedAmount > 0 && (
              <p style={{ fontSize: 12, color: C.textMute, margin: "8px 0 0", fontFamily: MONO }}>
                {fmtMoney(activeBalance.reservedAmount, activeBalance.currency)} reserved
              </p>
            )}
            {primary.lastSyncedAt && (
              <p style={{ fontSize: 11, color: C.textMute, margin: "6px 0 0" }}>
                Last synced {new Date(primary.lastSyncedAt).toLocaleString("en-US", {
                  month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                })}
              </p>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
              <button onClick={toggleTx} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10,
                background: C.surface, border: `1px solid ${C.border}`, color: C.text,
                fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>
                {showTx ? "Hide transactions" : "View transactions"}
              </button>
            </div>
          </div>
        )}

        {/* Transactions */}
        {showTx && (
          <div style={{ maxHeight: 320, overflowY: "auto" }}>
            {txLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ padding: "12px 20px", display: "flex", gap: 12, borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: C.surfaceAlt }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 11, width: "55%", borderRadius: 4, background: C.surfaceAlt, marginBottom: 6 }} />
                    <div style={{ height: 9, width: "30%", borderRadius: 4, background: C.surfaceAlt }} />
                  </div>
                </div>
              ))
            ) : txError ? (
              <p style={{ padding: 20, fontSize: 13, color: C.danger }}>{txError}</p>
            ) : txs.length === 0 ? (
              <p style={{ padding: 24, textAlign: "center", fontSize: 13, color: C.textMute }}>No transactions yet</p>
            ) : (
              txs.map((tx) => (
                <div key={tx.id} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "11px 20px",
                  borderBottom: `1px solid ${C.border}`,
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    background: tx.type === "credit" ? GREEN_SOFT : C.surfaceAlt,
                    border: `1px solid ${tx.type === "credit" ? GREEN_BORDER : C.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: tx.type === "credit" ? MINT : C.textSub, fontWeight: 800,
                  }}>{tx.type === "credit" ? "↓" : "↑"}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.description}</p>
                    <p style={{ fontSize: 11, color: C.textMute, margin: "2px 0 0" }}>
                      {new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {tx.recipient ? ` · ${tx.recipient}` : ""}
                    </p>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 700, margin: 0, fontFamily: MONO,
                    fontVariantNumeric: "tabular-nums",
                    color: tx.type === "credit" ? MINT : C.text }}>
                    {tx.type === "credit" ? "+" : "−"}{fmtMoney(tx.amount, tx.currency)}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12,
            fontWeight: 700, color: MINT }}>
            <Logo p={primary.provider} size={16} /> {m.label}
          </span>
          <button onClick={handleDisconnect} disabled={disconnecting} style={{
            fontSize: 12, fontWeight: 600, color: C.textMute, background: "none", border: "none",
            cursor: disconnecting ? "default" : "pointer", fontFamily: FONT,
          }}>{disconnecting ? "Disconnecting…" : "Disconnect"}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Public panel ─────────────────────────────────────────────────────────── */
export function LinkedAccountPanel({ style }: { style?: React.CSSProperties }) {
  const { loading, connected, status } = useLinkedAccount();

  if (loading && !status) {
    return (
      <div style={{ ...style, ...cardSurface, borderRadius: 18, padding: 28, fontFamily: FONT,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: C.textSub }}>
        <style>{GLOBAL_CSS}</style>
        <Spinner /> Loading account…
      </div>
    );
  }

  return (
    <div style={style}>
      {connected ? <ConnectedCard /> : <ProviderPicker />}
    </div>
  );
}
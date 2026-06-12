"use client";

import * as React from "react";
import {
  linkedAccountApi,
  LinkedProvider,
  LinkedStatus,
  LinkedTransaction,
  LinkedBalance,
} from "@/lib/linkedAccountApi";

/* ── Theme: SuprahPay green + clean white ─────────────────────────────────── */
const GREEN = "#16A34A";
const GREEN_DARK = "#15803D";
const GREEN_SOFT = "rgba(22,163,74,0.08)";
const GREEN_BORDER = "rgba(22,163,74,0.22)";
const PAYPAL_BLUE = "#0070BA";
const PAYPAL_BLUE_SOFT = "rgba(0,112,186,0.08)";
const FONT = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const C = {
  surface: "var(--card, #FFFFFF)",
  surfaceAlt: "var(--muted, #F4F6F8)",
  border: "var(--border, #E7E9EE)",
  text: "var(--foreground, #15181E)",
  textSub: "var(--muted-foreground, #59616E)",
  textMute: "#8A92A0",
  danger: "#B91C1C",
  dangerBg: "rgba(220,38,38,0.08)",
};

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

function providerMeta(p: LinkedProvider) {
  return p === "wise"
    ? { label: "Wise", color: GREEN, soft: GREEN_SOFT, border: GREEN_BORDER }
    : { label: "PayPal", color: PAYPAL_BLUE, soft: PAYPAL_BLUE_SOFT, border: "rgba(0,112,186,0.22)" };
}

/* ── Provider logos (inline, no external assets) ──────────────────────────── */
function WiseLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
      <rect width="60" height="60" rx="12" fill={GREEN} />
      <path d="M18 18h22l-6 9 6 9H18l8-9-8-9z" fill="#fff" />
    </svg>
  );
}
function PayPalLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
      <rect width="60" height="60" rx="12" fill="#fff" stroke={C.border} />
      <path d="M24 16h12c5 0 8 3 7 8-1 5-5 7-10 7h-4l-2 9h-6l5-31z" fill="#003087" />
      <path d="M28 20h10c4 0 6 2 5 6-1 4-4 6-8 6h-4l-1 7h-5l4-25z" fill="#0070BA" opacity="0.9" />
    </svg>
  );
}
function Logo({ p, size }: { p: LinkedProvider; size?: number }) {
  return p === "wise" ? <WiseLogo size={size} /> : <PayPalLogo size={size} />;
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
  children, onClick, disabled, color = GREEN, full,
}: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; color?: string; full?: boolean;
}) {
  const [h, setH] = React.useState(false);
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        width: full ? "100%" : undefined,
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        padding: "11px 18px", borderRadius: 12, border: "none",
        background: disabled ? "#CBD5C0" : h ? GREEN_DARK : color,
        color: "#fff", fontFamily: FONT, fontSize: 14, fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer", transition: "background 0.15s",
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
      border: `1px solid ${ok ? GREEN_BORDER : "rgba(220,38,38,0.20)"}`,
      color: ok ? GREEN_DARK : C.danger,
    }}>
      <span style={{ flex: 1 }}>{text}</span>
      <button onClick={onClose} aria-label="Dismiss" style={{
        background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: 16, lineHeight: 1,
      }}>×</button>
    </div>
  );
}

/* ── Provider picker (disconnected state) ─────────────────────────────────── */
function ProviderPicker() {
  const { connect, error, banner, clearBanner } = useLinkedAccount();
  const [busy, setBusy] = React.useState<LinkedProvider | null>(null);

  const options: { key: LinkedProvider; title: string; desc: string }[] = [
    { key: "wise", title: "Wise", desc: "Multi-currency balances, real FX rates, global transfers." },
    { key: "paypal", title: "PayPal", desc: "Connect your PayPal account to send and track money." },
  ];

  const handle = async (p: LinkedProvider) => {
    setBusy(p);
    await connect(p);
    // If connect throws it sets error and we re-enable; on success the page redirects.
    setBusy(null);
  };

  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18,
      padding: 24, fontFamily: FONT,
    }}>
      <style>{`@keyframes la-spin{to{transform:rotate(360deg)}}`}</style>
      {banner && <Banner type={banner.type} text={banner.text} onClose={clearBanner} />}

      <div style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: 0 }}>
          Link a payment account
        </p>
        <p style={{ fontSize: 13, color: C.textSub, margin: "4px 0 0", lineHeight: 1.5 }}>
          Connect Wise or PayPal to power your SuprahPay wallet. Your available
          balance will sync automatically once connected.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        {options.map((opt) => {
          const m = providerMeta(opt.key);
          const isBusy = busy === opt.key;
          return (
            <div key={opt.key} style={{
              border: `1px solid ${C.border}`, borderRadius: 14, padding: 18,
              display: "flex", flexDirection: "column", gap: 12, background: C.surface,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 12, background: m.soft,
                  border: `1px solid ${m.border}`, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Logo p={opt.key} size={28} />
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>{opt.title}</p>
                  <p style={{ fontSize: 12, color: C.textMute, margin: "2px 0 0" }}>Secure OAuth connection</p>
                </div>
              </div>
              <p style={{ fontSize: 12.5, color: C.textSub, margin: 0, lineHeight: 1.5, minHeight: 36 }}>
                {opt.desc}
              </p>
              <GreenButton onClick={() => handle(opt.key)} disabled={isBusy} color={m.color} full>
                {isBusy ? (<><Spinner size={15} color="#fff" /> Redirecting…</>) : (<>Connect {opt.title}</>)}
              </GreenButton>
            </div>
          );
        })}
      </div>

      {error && (
        <p style={{ marginTop: 14, fontSize: 13, color: C.danger, background: C.dangerBg,
          border: "1px solid rgba(220,38,38,0.20)", borderRadius: 10, padding: "10px 12px" }}>
          {error}
        </p>
      )}
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
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18,
      overflow: "hidden", fontFamily: FONT,
    }}>
      <style>{`@keyframes la-spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${m.color}, ${m.color}55 60%, transparent)` }} />

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
            fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999,
            background: GREEN_SOFT, color: GREEN_DARK, border: `1px solid ${GREEN_BORDER}`,
          }}>● Connected</span>
          <button onClick={handleSync} disabled={syncing} title="Sync balance" style={{
            width: 34, height: 34, borderRadius: 9, background: C.surfaceAlt,
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
              borderBottom: activeCurrency === b.currency ? `2px solid ${GREEN}` : "2px solid transparent",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              color: activeCurrency === b.currency ? GREEN_DARK : C.textMute, fontFamily: FONT,
            }}>{b.currency}</button>
          ))}
        </div>
      )}

      {/* Balance */}
      {activeBalance && (
        <div style={{ padding: "20px 20px 18px", borderBottom: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
            color: C.textMute, margin: "0 0 8px" }}>Available balance</p>
          <p style={{ fontSize: 40, fontWeight: 800, color: C.text, margin: 0, lineHeight: 1 }}>
            {fmtMoney(activeBalance.amount, activeBalance.currency)}
          </p>
          {activeBalance.reservedAmount > 0 && (
            <p style={{ fontSize: 12, color: C.textMute, margin: "6px 0 0" }}>
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

          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <button onClick={toggleTx} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10,
              background: "transparent", border: `1px solid ${C.border}`, color: C.text,
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
                  color: tx.type === "credit" ? GREEN_DARK : C.textSub, fontWeight: 800,
                }}>{tx.type === "credit" ? "↓" : "↑"}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.description}</p>
                  <p style={{ fontSize: 11, color: C.textMute, margin: "2px 0 0" }}>
                    {new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {tx.recipient ? ` · ${tx.recipient}` : ""}
                  </p>
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, margin: 0,
                  color: tx.type === "credit" ? GREEN_DARK : C.text }}>
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
          fontWeight: 700, color: m.color }}>
          <Logo p={primary.provider} size={16} /> {m.label}
        </span>
        <button onClick={handleDisconnect} disabled={disconnecting} style={{
          fontSize: 12, fontWeight: 600, color: C.textMute, background: "none", border: "none",
          cursor: disconnecting ? "default" : "pointer", fontFamily: FONT,
        }}>{disconnecting ? "Disconnecting…" : "Disconnect"}</button>
      </div>
    </div>
  );
}

/* ── Public panel ─────────────────────────────────────────────────────────── */
export function LinkedAccountPanel({ style }: { style?: React.CSSProperties }) {
  const { loading, connected, status } = useLinkedAccount();

  if (loading && !status) {
    return (
      <div style={{ ...style, background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 18, padding: 28, fontFamily: FONT, display: "flex", alignItems: "center",
        justifyContent: "center", gap: 10, color: C.textSub }}>
        <style>{`@keyframes la-spin{to{transform:rotate(360deg)}}`}</style>
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
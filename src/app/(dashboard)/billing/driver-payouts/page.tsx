"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/context/ThemeContext";
import { apiClient } from "@/lib/api-client";
import { DriverPayout, DeliverableLoad, DriverPayoutStats } from "@/types/driver-payout";
import { formatCurrency } from "@/utils/format";
import {
  ChevronLeft,
  RefreshCw,
  Truck,
  CheckCircle2,
  DollarSign,
  X,
  Loader2,
  Package,
  FileCheck,
  Eye,
} from "lucide-react";

function ProofLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  const [zoom, setZoom] = React.useState(1);
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 5;
  const containerRef = React.useRef<HTMLDivElement>(null);
  const lastPinchDist = React.useRef<number | null>(null);
  const isTouchDevice = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

  const clampZoom = (z: number) => Math.min(Math.max(z, MIN_ZOOM), MAX_ZOOM);
  const zoomIn = () => setZoom((z) => clampZoom(z + 0.25));
  const zoomOut = () => setZoom((z) => clampZoom(z - 0.25));
  const reset = () => setZoom(1);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => clampZoom(z - e.deltaY * 0.001));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastPinchDist.current !== null) {
        const delta = dist - lastPinchDist.current;
        setZoom((z) => clampZoom(z + delta * 0.005));
      }
      lastPinchDist.current = dist;
    };

    const onTouchEnd = () => {
      lastPinchDist.current = null;
    };

    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);

    return () => {
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.92)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 8, zIndex: 10000 }}
        onClick={(e) => e.stopPropagation()}
      >
        {[
          { label: "-", action: zoomOut, title: "Zoom out" },
          { label: `${Math.round(zoom * 100)}%`, action: reset, title: "Reset zoom" },
          { label: "+", action: zoomIn, title: "Zoom in" },
          { label: "x", action: onClose, title: "Close" },
        ].map(({ label, action, title }) => (
          <button
            key={title}
            onClick={action}
            title={title}
            style={{
              minWidth: 44,
              height: 44,
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.08)",
              color: "#fff",
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: 15,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        ref={containerRef}
        style={{
          overflow: "hidden",
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          touchAction: "none",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt="Proof of delivery"
          draggable={false}
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "center center",
            transition: "transform 0.1s ease",
            maxWidth: "90vw",
            maxHeight: "85vh",
            objectFit: "contain",
            display: "block",
            userSelect: "none",
            WebkitUserSelect: "none",
          }}
        />
      </div>

      <p
        style={{
          position: "absolute",
          bottom: 16,
          left: 0,
          right: 0,
          textAlign: "center",
          color: "rgba(255,255,255,0.3)",
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: 11,
          padding: "0 16px",
        }}
      >
        {isTouchDevice ? "Tap outside to close · Pinch to zoom" : "Click outside or press Esc · Scroll to zoom"}
      </p>
    </div>
  );
}

const ORANGE = "#E55A00";
const DISPLAY = "'Rajdhani', var(--font-sans), sans-serif";
const MONO = "'Share Tech Mono', 'Roboto Mono', monospace";

type SupraPalette = {
  pageBg: string;
  cardBg: string;
  tabBg: string;
  modalBg: string;
  inputBg: string;
  border: string;
  surface: string;
  text: string;
  textSoft: string;
  textMuted: string;
  textDim: string;
  textFaint: string;
  textGhost: string;
  iconMuted: string;
  buttonGhost: string;
  activeTabBadgeBg: string;
};

const DARK_PALETTE: SupraPalette = {
  pageBg: "#07070a",
  cardBg: "#0f0f14",
  tabBg: "#0d0d11",
  modalBg: "#0f0f14",
  inputBg: "#0a0a0d",
  border: "rgba(255,255,255,0.07)",
  surface: "rgba(255,255,255,0.04)",
  text: "#ffffff",
  textSoft: "rgba(255,255,255,0.85)",
  textMuted: "rgba(255,255,255,0.6)",
  textDim: "rgba(255,255,255,0.45)",
  textFaint: "rgba(255,255,255,0.35)",
  textGhost: "rgba(255,255,255,0.25)",
  iconMuted: "rgba(255,255,255,0.1)",
  buttonGhost: "rgba(255,255,255,0.4)",
  activeTabBadgeBg: "rgba(0,0,0,0.2)",
};

const LIGHT_PALETTE: SupraPalette = {
  pageBg: "#f4f6fb",
  cardBg: "#ffffff",
  tabBg: "#eef2f7",
  modalBg: "#ffffff",
  inputBg: "#ffffff",
  border: "rgba(15,23,42,0.12)",
  surface: "rgba(15,23,42,0.04)",
  text: "#0f172a",
  textSoft: "rgba(15,23,42,0.86)",
  textMuted: "rgba(15,23,42,0.68)",
  textDim: "rgba(15,23,42,0.58)",
  textFaint: "rgba(15,23,42,0.5)",
  textGhost: "rgba(15,23,42,0.36)",
  iconMuted: "rgba(15,23,42,0.16)",
  buttonGhost: "rgba(15,23,42,0.58)",
  activeTabBadgeBg: "rgba(255,255,255,0.72)",
};

function PayoutStatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    pending: { bg: "rgba(250,204,21,0.12)", text: "#facc15" },
    processing: { bg: "rgba(250,204,21,0.12)", text: "#facc15" },
    paid: { bg: "rgba(74,222,128,0.12)", text: "#4ade80" },
    confirmed: { bg: "rgba(96,165,250,0.12)", text: "#60a5fa" },
    failed: { bg: "rgba(239,68,68,0.12)", text: "#ef4444" },
    cancelled: { bg: "rgba(148,163,184,0.12)", text: "#94a3b8" },
  };
  const c = colors[status] || colors.pending;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: c.bg,
        color: c.text,
        borderRadius: 6,
        padding: "3px 9px",
        fontFamily: MONO,
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.text }} />
      {status}
    </span>
  );
}

function PayoutModal({
  target,
  onClose,
  onCreated,
  getToken,
  palette,
}: {
  target: DeliverableLoad;
  onClose: () => void;
  onCreated: () => void;
  getToken: () => Promise<string | null>;
  palette: SupraPalette;
}) {
  const [amount, setAmount] = React.useState(0);
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async () => {
    if (amount <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await apiClient.post("/api/driver-payouts", {
        loadId: target._id,
        driverId: target.assignedDriverId._id,
        amount, notes,
      }, { headers });
      onCreated(); onClose();
    } catch (e: any) {
      setError(e.response?.data?.message || "Failed to create payout.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.62)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: palette.modalBg,
          border: `1px solid ${palette.border}`,
          borderRadius: 18,
          padding: "26px 26px",
          width: "100%",
          maxWidth: 420,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <div>
            <h3 style={{ fontFamily: DISPLAY, fontSize: 18, fontWeight: 700, color: palette.text, margin: 0 }}>Send Driver Payout</h3>
            <p style={{ fontFamily: MONO, fontSize: 10, color: palette.textFaint, margin: 0, marginTop: 3 }}>{target.trackingNumber}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: palette.buttonGhost }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div style={{ background: palette.surface, borderRadius: 10, padding: "12px 14px", marginBottom: 18 }}>
          <p style={{ fontFamily: DISPLAY, fontSize: 13, color: palette.textMuted, margin: 0 }}>Driver</p>
          <p style={{ fontFamily: DISPLAY, fontSize: 15, fontWeight: 700, color: palette.text, margin: 0, marginTop: 2 }}>
            {target.assignedDriverId?.name || "Unknown Driver"}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontFamily: DISPLAY, fontSize: 12, color: palette.textDim }}>
              Payout Amount (USD) <span style={{ color: ORANGE }}>*</span>
            </label>
            <input
              type="number"
              value={amount || ""}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              min="0"
              step="0.01"
              style={{
                display: "block",
                width: "100%",
                boxSizing: "border-box",
                marginTop: 6,
                background: palette.inputBg,
                border: `1px solid ${palette.border}`,
                borderRadius: 9,
                padding: "11px 14px",
                color: palette.text,
                fontFamily: MONO,
                fontSize: 16,
                outline: "none",
              }}
            />
          </div>

          <div>
            <label style={{ fontFamily: DISPLAY, fontSize: 12, color: palette.textDim }}>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Delivery bonus, route details..."
              style={{
                display: "block",
                width: "100%",
                boxSizing: "border-box",
                marginTop: 6,
                background: palette.inputBg,
                border: `1px solid ${palette.border}`,
                borderRadius: 9,
                padding: "10px 14px",
                color: palette.text,
                fontFamily: DISPLAY,
                fontSize: 13,
                outline: "none",
                resize: "vertical",
              }}
            />
          </div>

          {error && <p style={{ fontFamily: DISPLAY, fontSize: 13, color: "#f87171" }}>{error}</p>}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: "11px 0",
                background: "transparent",
                border: `1px solid ${palette.border}`,
                borderRadius: 10,
                color: palette.textDim,
                fontFamily: DISPLAY,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                flex: 2,
                padding: "11px 0",
                background: loading ? "rgba(229,90,0,0.5)" : ORANGE,
                border: "none",
                borderRadius: 10,
                color: "#fff",
                fontFamily: DISPLAY,
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {loading ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <DollarSign style={{ width: 14, height: 14 }} />}
              {loading ? "Sending..." : "Send Payout"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DriverPayoutsPage() {
  const { getToken } = useAuth();
  const { theme } = useTheme();
  const [deliverableLoads, setDeliverableLoads] = React.useState<DeliverableLoad[]>([]);
  const [pendingProofs, setPendingProofs] = React.useState<any[]>([]);
  const [payouts, setPayouts] = React.useState<DriverPayout[]>([]);
  const [payoutStats, setPayoutStats] = React.useState<DriverPayoutStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [payoutTarget, setPayoutTarget] = React.useState<DeliverableLoad | null>(null);
  const [confirmingId, setConfirmingId] = React.useState<string | null>(null);
  const [proofBlobUrls, setProofBlobUrls] = React.useState<Record<string, string>>({});
  const [loadingProofId, setLoadingProofId] = React.useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<"pending-proofs" | "deliverable" | "history">("pending-proofs");

  const palette = theme === "light" ? LIGHT_PALETTE : DARK_PALETTE;

  const authHeaders = React.useCallback(async () => {
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getToken]);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const headers = await authHeaders();
      const [dRes, ppRes, pRes, sRes] = await Promise.all([
        apiClient.get("/api/driver-payouts/deliverable", { headers }),
        apiClient.get("/api/driver-payouts/pending-proofs", { headers }),
        apiClient.get("/api/driver-payouts", { headers }),
        apiClient.get("/api/driver-payouts/stats", { headers }),
      ]);
      setDeliverableLoads(dRes.data.data || []);
      setPendingProofs(ppRes.data.data || []);
      setPayouts(pRes.data.data || []);
      setPayoutStats(sRes.data.data || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const confirmDelivery = async (id: string) => {
    setConfirmingId(id);
    try {
      const endpoint = `/api/loads/${id}/confirm-delivery`;
      await apiClient.post(endpoint, {}, { headers: await authHeaders() });
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setConfirmingId(null);
    }
  };

  const openProofImage = async (item: any) => {
    const id = item._id;
    if (proofBlobUrls[id]) { setLightboxSrc(proofBlobUrls[id]); return; }
    setLoadingProofId(id);
    try {
      const token = await getToken();
      const endpoint = `/api/loads/${id}/proof-image`;
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_BASE}${endpoint}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      setProofBlobUrls((prev) => ({ ...prev, [id]: blobUrl }));
      setLightboxSrc(blobUrl);
    } catch {
      // non-fatal
    } finally {
      setLoadingProofId(null);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Share+Tech+Mono&display=swap');
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>

      <div style={{ background: palette.pageBg, minHeight: "100%", fontFamily: DISPLAY }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 60px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
            <Link
              href="/billing"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: palette.textFaint,
                textDecoration: "none",
                fontFamily: DISPLAY,
                fontSize: 13,
              }}
            >
              <ChevronLeft style={{ width: 15, height: 15 }} /> Dashboard
            </Link>
            <span style={{ color: palette.textGhost }}>›</span>
            <h1 style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 700, color: palette.text, margin: 0 }}>Driver Payouts</h1>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8, marginBottom: 24 }}>
            {[
              { label: "Total Paid Out", val: formatCurrency(payoutStats?.totalPaid ?? 0), color: "#4ade80" },
              { label: "Pending Payouts", val: formatCurrency(payoutStats?.totalPending ?? 0), color: "#facc15" },
              { label: "Deliverable Loads", val: String(deliverableLoads.length), color: ORANGE },
              { label: "All Payouts", val: String(payouts.length), color: "#60a5fa" },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ background: palette.cardBg, border: `1px solid ${palette.border}`, borderRadius: 12, padding: "14px 16px" }}>
                <p
                  style={{
                    fontFamily: MONO,
                    fontSize: 10,
                    color: palette.textFaint,
                    margin: 0,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {label}
                </p>
                <p style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 700, color, margin: 0, marginTop: 6 }}>{val}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 4, marginBottom: 18, background: palette.tabBg, border: `1px solid ${palette.border}`, borderRadius: 10, padding: 4, width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" as any }}>
            {([
              ["pending-proofs", "Pending Proofs", FileCheck, pendingProofs.length],
              ["deliverable", "Ready to Pay", Truck, deliverableLoads.length],
              ["history", "Payout History", DollarSign, 0],
            ] as ["pending-proofs" | "deliverable" | "history", string, any, number][]).map(([key, label, Icon, count]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 14px",
                  borderRadius: 7,
                  border: "none",
                  background: tab === key ? ORANGE : "transparent",
                  color: tab === key ? "#fff" : palette.textFaint,
                  fontFamily: DISPLAY,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  minHeight: 44,
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <Icon style={{ width: 14, height: 14, flexShrink: 0 }} />
                <span>{label}</span>
                {count > 0 && (
                  <span style={{ background: tab === key ? palette.activeTabBadgeBg : `${ORANGE}22`, color: tab === key ? "#fff" : ORANGE, borderRadius: 8, padding: "1px 7px", fontFamily: MONO, fontSize: 10 }}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
            <button
              onClick={fetchData}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                background: "transparent",
                border: `1px solid ${palette.border}`,
                borderRadius: 8,
                color: palette.buttonGhost,
                fontFamily: DISPLAY,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              <RefreshCw style={{ width: 13, height: 13 }} /> Refresh
            </button>
          </div>

          {tab === "pending-proofs" &&
            (loading ? (
              <div style={{ padding: "50px 0", textAlign: "center" }}>
                <RefreshCw style={{ width: 22, height: 22, color: palette.textGhost, animation: "spin 1s linear infinite" }} />
              </div>
            ) : pendingProofs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", background: palette.cardBg, border: `1px solid ${palette.border}`, borderRadius: 14 }}>
                <FileCheck style={{ width: 36, height: 36, color: palette.iconMuted, display: "block", margin: "0 auto 14px" }} />
                <p style={{ fontFamily: DISPLAY, fontSize: 16, fontWeight: 600, color: palette.textMuted }}>No pending proofs</p>
                <p style={{ fontFamily: DISPLAY, fontSize: 13, color: palette.textGhost }}>Drivers will submit proofs of delivery directly to you here.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: 12 }}>
                {pendingProofs.map((item: any) => (
                  <div key={item._id} style={{ background: palette.cardBg, border: `1px solid ${palette.border}`, borderRadius: 14, padding: "18px", display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                      <div>
                        <p style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.3)", margin: 0, letterSpacing: "0.05em" }}>LOAD #</p>
                        <p style={{ fontFamily: MONO, fontSize: 13, color: "#fff", margin: 0, marginTop: 3 }}>{item.loadNumber || item.trackingNumber}</p>
                      </div>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(96,165,250,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <FileCheck style={{ width: 15, height: 15, color: "#60a5fa" }} />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div>
                        <p style={{ fontFamily: DISPLAY, fontSize: 11, color: palette.textFaint, margin: 0 }}>Driver</p>
                        <p style={{ fontFamily: DISPLAY, fontSize: 13, fontWeight: 700, color: palette.text, margin: 0, marginTop: 2 }}>{item.assignedDriverId?.name || "-"}</p>
                      </div>
                      <div>
                        <p style={{ fontFamily: DISPLAY, fontSize: 11, color: palette.textFaint, margin: 0 }}>Submitted</p>
                        <p style={{ fontFamily: DISPLAY, fontSize: 13, color: palette.textMuted, margin: 0, marginTop: 2 }}>
                          {item.proofOfDelivery?.submittedAt ? new Date(item.proofOfDelivery.submittedAt).toLocaleDateString() : "-"}
                        </p>
                      </div>
                    </div>

                    {item.proofOfDelivery?.note && (
                      <p style={{ fontFamily: DISPLAY, fontSize: 12, color: palette.textDim, margin: 0, background: palette.surface, borderRadius: 8, padding: "8px 10px" }}>
                        {item.proofOfDelivery.note}
                      </p>
                    )}
                    <Link 
                      href={`/billing/driver-payouts/${item._id}`}
                      style={{ flex: 1, textDecoration: "none" }}
                    >
                      <button
                        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 44, padding: "0 8px", background: ORANGE, border: "none", borderRadius: 9, color: "#fff", fontFamily: DISPLAY, fontSize: 12, fontWeight: 700, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>
                        <Eye style={{ width: 13, height: 13 }} />
                        Review Proof & Payout
                      </button>
                    </Link>
                  </div>
                ))}
              </div>
            ))}

          {tab === "deliverable" &&
            (loading ? (
              <div style={{ padding: "50px 0", textAlign: "center" }}>
                <RefreshCw style={{ width: 22, height: 22, color: palette.textGhost, animation: "spin 1s linear infinite" }} />
              </div>
            ) : deliverableLoads.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", background: palette.cardBg, border: `1px solid ${palette.border}`, borderRadius: 14 }}>
                <Package style={{ width: 36, height: 36, color: "rgba(255,255,255,0.1)", display: "block", margin: "0 auto 14px" }} />
                <p style={{ fontFamily: DISPLAY, fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>No deliverable loads</p>
                <p style={{ fontFamily: DISPLAY, fontSize: 13, color: "rgba(255,255,255,0.25)" }}>Completed loads awaiting payout will appear here.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))", gap: 12 }}>
                {deliverableLoads.map(s => (
                  <div key={s._id} style={{ background: palette.cardBg, border: `1px solid ${palette.border}`, borderRadius: 14, padding: "18px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                      <div>
                        <p style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.3)", margin: 0, letterSpacing: "0.05em" }}>LOAD #</p>
                        <p style={{ fontFamily: MONO, fontSize: 13, color: "#fff", margin: 0, marginTop: 3 }}>{s.loadNumber || s.trackingNumber}</p>
                      </div>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: `${ORANGE}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Truck style={{ width: 15, height: 15, color: ORANGE }} />
                      </div>
                    </div>

                    <div>
                      <p style={{ fontFamily: DISPLAY, fontSize: 12, color: palette.textFaint, margin: 0 }}>Driver</p>
                      <p style={{ fontFamily: DISPLAY, fontSize: 15, fontWeight: 700, color: palette.text, margin: 0, marginTop: 2 }}>{s.assignedDriverId?.name || "-"}</p>
                    </div>
                    <Link 
                      href={`/billing/driver-payouts/${s._id}`}
                      style={{ flex: 1, textDecoration: "none" }}
                    >
                      <button
                        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 0", background: ORANGE, border: "none", borderRadius: 9, color: "#fff", fontFamily: DISPLAY, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        <DollarSign style={{ width: 12, height: 12 }} />
                        Process Payout
                      </button>
                    </Link>
                  </div>
                ))}
              </div>
            ))}

          {tab === "history" && (
            <div style={{ background: palette.cardBg, border: `1px solid ${palette.border}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto", minWidth: 480, gap: 12, padding: "11px 16px", borderBottom: `1px solid ${palette.border}` }}>
                {["Driver", "Load", "Amount", "Status"].map(h => (
                  <span key={h} style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</span>
                ))}
              </div>

              {loading ? (
                <div style={{ padding: "40px 0", textAlign: "center" }}>
                  <RefreshCw style={{ width: 20, height: 20, color: palette.textGhost, animation: "spin 1s linear infinite" }} />
                </div>
              ) : payouts.length === 0 ? (
                <p style={{ fontFamily: DISPLAY, fontSize: 14, color: palette.textFaint, textAlign: "center", padding: "40px 0" }}>No payouts yet</p>
              ) : (
                payouts.map((p) => (
                  <div key={p._id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto", minWidth: 480, gap: 12, alignItems: "center", padding: "13px 16px", borderBottom: `1px solid ${palette.border}` }}>
                    <div>
                      <p style={{ fontFamily: DISPLAY, fontSize: 14, fontWeight: 600, color: palette.textSoft, margin: 0 }}>{(p.driverId as any)?.name || "-"}</p>
                      <p style={{ fontFamily: MONO, fontSize: 11, color: palette.textFaint, margin: 0 }}>{new Date(p.createdAt || "").toLocaleDateString()}</p>
                    </div>
                    <p style={{ fontFamily: MONO, fontSize: 12, color: palette.textDim, margin: 0 }}>{(p.loadId as any)?.loadNumber || (p.loadId as any)?.trackingNumber || "-"}</p>
                    <p style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: palette.text, margin: 0 }}>{formatCurrency(p.amount)}</p>
                    <PayoutStatusBadge status={p.status} />
                  </div>
              )))}
              </div>
            </div>
          )}
        </div>
      </div>

      {payoutTarget && (
        <PayoutModal target={payoutTarget} onClose={() => setPayoutTarget(null)} onCreated={fetchData} getToken={getToken} palette={palette} />
      )}
      {lightboxSrc && <ProofLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </>
  );
}

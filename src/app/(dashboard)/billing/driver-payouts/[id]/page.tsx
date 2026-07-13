"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { apiClient } from "@/lib/api-client";
import { getLoadById, confirmLoadDelivery } from "@/lib/api/loads";
import { Load } from "@/types/load";
import { formatCurrency } from "@/utils/format";
import {
  ChevronLeft, RefreshCw, Truck, CheckCircle2,
  DollarSign, Clock, X, Loader2, FileCheck, Eye,
  MapPin, Calendar, Package, AlertCircle, Info, ExternalLink
} from "lucide-react";
import { toast } from "sonner";

const ORANGE = "#E55A00";
const PAGE_BG = "#07070a";
const CARD_BG = "#0f0f14";
const BORDER = "rgba(255,255,255,0.07)";
const DISPLAY = "'Rajdhani', var(--font-sans), sans-serif";
const MONO = "'Share Tech Mono', 'Roboto Mono', monospace";

function PayoutActionCard({ load, onAction }: { load: Load; onAction: () => void }) {
  const { getToken } = useAuth();
  const [amount, setAmount] = React.useState(load.pricing?.carrierPayAmount || 0);
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async () => {
    if (amount <= 0) { setError("Amount must be greater than 0."); return; }
    setLoading(true); setError(null);
    try {
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const driverId = typeof load.assignedDriverId === 'object' 
        ? load.assignedDriverId._id 
        : load.assignedDriverId;

      await apiClient.post("/api/driver-payouts", {
        loadId: load._id,
        driverId,
        amount, 
        notes,
      }, { headers });
      
      toast.success("Payout sent successfully");
      onAction();
    } catch (e: any) {
      setError(e.response?.data?.message || "Failed to create payout.");
      toast.error(e.response?.data?.message || "Failed to create payout.");
    } finally { setLoading(false); }
  };

  const isConfirmed = !!load.proofOfDelivery?.confirmedAt || load.status === "Delivered";

  if (!isConfirmed) {
    return (
      <div style={{ background: "rgba(250, 204, 21, 0.05)", border: "1px solid rgba(250,204,21,0.2)", borderRadius: 16, padding: 20 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <AlertCircle style={{ width: 20, height: 20, color: "#facc15", flexShrink: 0 }} />
          <div>
            <h4 style={{ fontFamily: DISPLAY, fontSize: 16, fontWeight: 700, color: "#fff", margin: 0 }}>Pending Confirmation</h4>
            <p style={{ fontFamily: DISPLAY, fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0, marginTop: 4 }}>
              You must confirm the delivery proof before you can initiate a payout.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24 }}>
      <h3 style={{ fontFamily: DISPLAY, fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
        <DollarSign style={{ width: 18, height: 18, color: ORANGE }} />
        Process Payout
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ fontFamily: DISPLAY, fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 8, display: "block" }}>
            Payout Amount (USD) <span style={{ color: ORANGE }}>*</span>
          </label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)", fontFamily: MONO }}>$</span>
            <input 
              type="number" 
              value={amount || ""} 
              onChange={e => setAmount(parseFloat(e.target.value) || 0)}
              placeholder="0.00" 
              style={{ width: "100%", background: "#0a0a0d", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px 12px 30px", color: "#fff", fontFamily: MONO, fontSize: 16, outline: "none" }}
            />
          </div>
          <p style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>
            Carrier Pay: {formatCurrency(load.pricing?.carrierPayAmount || 0)}
          </p>
        </div>

        <div>
          <label style={{ fontFamily: DISPLAY, fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 8, display: "block" }}>
            Notes for Driver
          </label>
          <textarea 
            value={notes} 
            onChange={e => setNotes(e.target.value)} 
            rows={3} 
            placeholder="Add any internal or driver-facing notes..."
            style={{ width: "100%", background: "#0a0a0d", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px", color: "#fff", fontFamily: DISPLAY, fontSize: 13, outline: "none", resize: "none" }}
          />
        </div>

        {error && (
          <div style={{ display: "flex", gap: 8, color: "#f87171", alignItems: "center" }}>
            <AlertCircle style={{ width: 14, height: 14 }} />
            <p style={{ fontFamily: DISPLAY, fontSize: 13, margin: 0 }}>{error}</p>
          </div>
        )}

        <button 
          onClick={handleSubmit} 
          disabled={loading}
          style={{ width: "100%", padding: "14px 0", background: loading ? "rgba(229,90,0,0.5)" : ORANGE, border: "none", borderRadius: 12, color: "#fff", fontFamily: DISPLAY, fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "all 0.2s ease" }}
        >
          {loading ? <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} /> : <DollarSign style={{ width: 18, height: 18 }} />}
          {loading ? "Processing..." : "Approve & Send Payout"}
        </button>
      </div>
    </div>
  );
}

export default function PayoutDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { getToken } = useAuth();
  
  const [load, setLoad] = React.useState<Load | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [zoomImage, setZoomImage] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLoadById(id);
      setLoad(data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load payout details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleConfirmDelivery = async () => {
    setActionLoading(true);
    try {
      await confirmLoadDelivery(id);
      toast.success("Delivery proof confirmed");
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to confirm delivery");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ background: PAGE_BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <RefreshCw style={{ width: 40, height: 40, color: ORANGE, animation: "spin 1.5s linear infinite" }} />
      </div>
    );
  }

  if (!load) {
    return (
      <div style={{ background: PAGE_BG, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
        <AlertCircle style={{ width: 48, height: 48, color: "rgba(255,255,255,0.1)" }} />
        <h2 style={{ fontFamily: DISPLAY, color: "#fff", margin: 0 }}>Load not found</h2>
        <Link href="/billing/driver-payouts" style={{ color: ORANGE, textDecoration: "none", fontFamily: DISPLAY }}>Return to Payouts</Link>
      </div>
    );
  }

  const driver = typeof load.assignedDriverId === 'object' ? load.assignedDriverId : null;

  return (
    <div className="dark" style={{ background: PAGE_BG, minHeight: "100vh", fontFamily: DISPLAY, color: "#fff" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Share+Tech+Mono&display=swap');
        @keyframes spin { to{transform:rotate(360deg)} }
        .dp-main-grid { display: grid; grid-template-columns: 1fr 380px; gap: 32px; max-width: 1200px; margin: 0 auto; padding: 32px 20px; }
        .dp-load-overview { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 900px) { .dp-main-grid { grid-template-columns: 1fr; } }
        @media (max-width: 600px) { .dp-load-overview { grid-template-columns: 1fr; } }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(15,15,20,0.5)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 4 }}>
              <ChevronLeft style={{ width: 20, height: 20 }} />
              <span style={{ fontSize: 14 }}>Back</span>
            </button>
            <div style={{ width: 1, height: 24, background: BORDER }} />
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Review Payout</h1>
              <p style={{ fontFamily: MONO, fontSize: 11, color: ORANGE, margin: 0, marginTop: 2 }}>{load.loadNumber}</p>
            </div>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0 }}>Status</p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: load.status === "Delivered" ? "#4ade80" : "#facc15" }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>{load.status}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="dp-main-grid">
        
        {/* Left Content: POD & Details */}
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          
          {/* Proof of Delivery Section */}
          <section>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
                <FileCheck style={{ width: 20, height: 20, color: ORANGE }} />
                Proof of Delivery
              </h2>
              {load.proofOfDelivery?.submittedAt && (
                <span style={{ fontFamily: MONO, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                  Submitted: {new Date(load.proofOfDelivery.submittedAt).toLocaleString()}
                </span>
              )}
            </div>

            {load.proofOfDelivery?.imageUrl ? (
              <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 20, overflow: "hidden", position: "relative" }}>
                <div 
                  onClick={() => setZoomImage(!zoomImage)}
                  style={{ 
                    cursor: "zoom-in",
                    height: zoomImage ? "auto" : 500,
                    maxHeight: zoomImage ? "none" : 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#000",
                    transition: "all 0.3s ease"
                  }}
                >
                  <img 
                    src={load.proofOfDelivery.imageUrl} 
                    alt="Proof of Delivery" 
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                  {!zoomImage && (
                    <div style={{ position: "absolute", bottom: 20, right: 20, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, pointerEvents: "none" }}>
                      <Eye style={{ width: 14, height: 14 }} />
                      <span style={{ fontSize: 12 }}>Click to Expand</span>
                    </div>
                  )}
                </div>
                
                {load.proofOfDelivery.note && (
                  <div style={{ padding: 24, borderTop: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.02)" }}>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: MONO }}>Driver Note</p>
                    <p style={{ fontSize: 15, lineHeight: 1.6, margin: 0 }}>{load.proofOfDelivery.note}</p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ height: 300, background: CARD_BG, border: `1px dashed ${BORDER}`, borderRadius: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <Package style={{ width: 40, height: 40, color: "rgba(255,255,255,0.1)" }} />
                <p style={{ color: "rgba(255,255,255,0.3)" }}>No proof of delivery uploaded yet</p>
              </div>
            )}
          </section>

          {/* Load Overview */}
          <section className="dp-load-overview">
            <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px", color: "rgba(255,255,255,0.5)" }}>Origin</h3>
              <div style={{ display: "flex", gap: 12 }}>
                <MapPin style={{ width: 18, height: 18, color: ORANGE, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{load.pickupLocation.city}, {load.pickupLocation.state}</p>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{load.pickupLocation.street}</p>
                </div>
              </div>
            </div>
            <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px", color: "rgba(255,255,255,0.5)" }}>Destination</h3>
              <div style={{ display: "flex", gap: 12 }}>
                <MapPin style={{ width: 18, height: 18, color: "#4ade80", flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{load.deliveryLocation.city}, {load.deliveryLocation.state}</p>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{load.deliveryLocation.street}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Vehicle List */}
          <section style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px", color: "rgba(255,255,255,0.5)" }}>Vehicles ({load.vehicles.length})</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {load.vehicles.map((v, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Truck style={{ width: 16, height: 16, color: "rgba(255,255,255,0.3)" }} />
                    <span style={{ fontWeight: 600 }}>{v.year} {v.make} {v.model}</span>
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{v.vin || "NO VIN"}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Content: Sidebar Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          {/* Driver Card */}
          <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: MONO }}>Assigned Driver</p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: ORANGE, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700 }}>
                {driver?.name?.[0] || "?"}
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{driver?.name || "Unassigned"}</p>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{driver?.email || "No email"}</p>
              </div>
            </div>
          </div>

          {/* Approval Action */}
          {!load.proofOfDelivery?.confirmedAt && load.status !== "Delivered" && (
            <div style={{ background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 16, padding: 20 }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle2 style={{ width: 16, height: 16, color: "#4ade80" }} />
                Verify Proof
              </h4>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 20, lineHeight: 1.5 }}>
                Confirm that the proof of delivery is valid and the vehicle has been received by the customer.
              </p>
              <button 
                onClick={handleConfirmDelivery}
                disabled={actionLoading || !load.proofOfDelivery?.imageUrl}
                style={{ width: "100%", padding: "12px 0", background: "#4ade80", color: "#000", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: actionLoading ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                {actionLoading ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : <CheckCircle2 style={{ width: 16, height: 16 }} />}
                Confirm Delivery
              </button>
            </div>
          )}

          {/* Payout Action */}
          <PayoutActionCard load={load} onAction={fetchData} />

          {/* Quick Links */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Link 
              href={`/transportation/load/${load._id}`}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 0", background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 10, color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: 13, fontWeight: 600 }}
            >
              <Info style={{ width: 14, height: 14 }} />
              View Original Load
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}

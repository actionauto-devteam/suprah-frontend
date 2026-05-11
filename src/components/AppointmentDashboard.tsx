"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Calendar,
  ChevronRight,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Download,
  Eye,
  Filter,
  FileText,
  RefreshCw,
  Search,
  Car,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomerBooking {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isCustomerBooking: boolean;
}

interface CrmUserData {
  _id: string;
  fullName: string;
  email: string;
  username: string;
}

interface VehicleInterest {
  year?: string;
  make?: string;
  model?: string;
  trim?: string;
}

interface DashboardAppointment {
  _id: string;
  title: string;
  description?: string;
  startTime: Date | string;
  endTime: Date | string;
  type: "appointment" | "event" | "task" | "reminder";
  status: "scheduled" | "confirmed" | "completed" | "cancelled";
  entryType: string;
  source: string;
  customerBooking: CustomerBooking;
  crmUser: CrmUserData;
  vehicleInterest?: VehicleInterest;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ─── Style Sheet ─────────────────────────────────────────────────────────────

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap');

/* ── Design tokens ── */
:root {
  --ad-font:        'DM Sans', sans-serif;
  --ad-mono:        'DM Mono', monospace;

  --ad-page:        #f2f4f7;
  --ad-surface:     #ffffff;
  --ad-surface-2:   #f7f8fa;
  --ad-border:      #e3e6ed;
  --ad-border-med:  #d0d4de;
  --ad-focus:       rgba(22,163,74,0.18);

  --ad-text-1:      #0d1117;
  --ad-text-2:      #3d4455;
  --ad-text-3:      #7a8297;
  --ad-text-4:      #b0b7c9;

  --ad-accent:      #16a34a;
  --ad-accent-h:    #15803d;
  --ad-accent-bg:   rgba(22,163,74,0.07);

  --ad-shadow-sm:   0 1px 2px rgba(0,0,0,0.05);
  --ad-shadow:      0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04);
  --ad-shadow-md:   0 4px 12px rgba(0,0,0,0.08);

  --ad-radius:      10px;
  --ad-radius-sm:   6px;
}

.dark {
  --ad-page:        #0b0d14;
  --ad-surface:     #111520;
  --ad-surface-2:   #161a28;
  --ad-border:      #232840;
  --ad-border-med:  #2e3450;
  --ad-focus:       rgba(34,197,94,0.18);

  --ad-text-1:      #eceef5;
  --ad-text-2:      #9299b0;
  --ad-text-3:      #555e7a;
  --ad-text-4:      #353c54;

  --ad-accent:      #22c55e;
  --ad-accent-h:    #16a34a;
  --ad-accent-bg:   rgba(34,197,94,0.1);

  --ad-shadow-sm:   0 1px 3px rgba(0,0,0,0.3);
  --ad-shadow:      0 1px 4px rgba(0,0,0,0.35);
  --ad-shadow-md:   0 4px 16px rgba(0,0,0,0.4);
}

/* ── Root ── */
.ad {
  font-family: var(--ad-font);
  background: var(--ad-page);
  color: var(--ad-text-1);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

.ad-wrap {
  max-width: 1480px;
  margin: 0 auto;
  padding: 28px 24px 48px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* ── Page header ── */
.ad-page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--ad-border);
}

.ad-page-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.ad-back-btn {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ad-surface);
  border: 1px solid var(--ad-border);
  border-radius: var(--ad-radius-sm);
  color: var(--ad-text-2);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, box-shadow 0.15s;
}
.ad-back-btn:hover {
  border-color: var(--ad-accent);
  color: var(--ad-accent);
  box-shadow: 0 0 0 3px var(--ad-focus);
}

.ad-eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ad-accent);
  margin-bottom: 3px;
}

.ad-page-title {
  font-size: clamp(17px, 2.2vw, 22px);
  font-weight: 700;
  color: var(--ad-text-1);
  line-height: 1.15;
  letter-spacing: -0.015em;
}

.ad-primary-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 18px;
  height: 36px;
  background: var(--ad-accent);
  color: #fff;
  border: none;
  border-radius: var(--ad-radius-sm);
  font-family: var(--ad-font);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, box-shadow 0.15s;
  white-space: nowrap;
}
.ad-primary-btn:hover {
  background: var(--ad-accent-h);
  box-shadow: var(--ad-shadow-md);
}

/* ── Card ── */
.ad-card {
  background: var(--ad-surface);
  border: 1px solid var(--ad-border);
  border-radius: var(--ad-radius);
  box-shadow: var(--ad-shadow);
  overflow: hidden;
}

.ad-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding: 13px 20px;
  border-bottom: 1px solid var(--ad-border);
}

.ad-card-label {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--ad-text-3);
}

.ad-card-body { padding: 20px; }

/* ── Stats ── */
.ad-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.ad-stat-card {
  background: var(--ad-surface);
  border: 1px solid var(--ad-border);
  border-radius: var(--ad-radius);
  padding: 16px 18px 14px;
  box-shadow: var(--ad-shadow-sm);
  position: relative;
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.ad-stat-card:hover {
  border-color: var(--ad-border-med);
  box-shadow: var(--ad-shadow);
}

.ad-stat-bar {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: var(--s-color);
  border-radius: var(--ad-radius) var(--ad-radius) 0 0;
}

.ad-stat-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--ad-text-3);
  margin-bottom: 8px;
}

.ad-stat-num {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
  color: var(--ad-text-1);
  letter-spacing: -0.025em;
  font-variant-numeric: tabular-nums;
}

.ad-stat-icon {
  position: absolute;
  bottom: 10px; right: 14px;
  color: var(--s-color);
  opacity: 0.12;
}

/* ── Field ── */
.ad-field-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--ad-text-3);
  margin-bottom: 6px;
}

.ad-ctrl {
  width: 100%;
  height: 36px;
  padding: 0 12px;
  background: var(--ad-surface-2);
  border: 1px solid var(--ad-border);
  border-radius: var(--ad-radius-sm);
  color: var(--ad-text-1);
  font-family: var(--ad-font);
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  -webkit-appearance: none;
  color-scheme: light dark;
}
.ad-ctrl:focus {
  border-color: var(--ad-accent);
  box-shadow: 0 0 0 3px var(--ad-focus);
}
.ad-ctrl::placeholder { color: var(--ad-text-3); }

.ad-ctrl-select {
  cursor: pointer;
  padding-right: 30px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='%237a8297' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 9px center;
}
.ad-ctrl-select option { background: var(--ad-surface); }

.ad-search-wrap { position: relative; }
.ad-search-icon {
  position: absolute;
  left: 10px; top: 50%;
  transform: translateY(-50%);
  color: var(--ad-text-3);
  pointer-events: none;
}
.ad-search-wrap .ad-ctrl { padding-left: 32px; }

/* ── Date row ── */
.ad-date-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}
.ad-date-input-group { flex: 1; min-width: 180px; }

.ad-quick-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 14px;
}
.ad-quick-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--ad-text-4);
}

.ad-quick-btn {
  height: 28px;
  padding: 0 12px;
  background: var(--ad-surface-2);
  border: 1px solid var(--ad-border);
  border-radius: 5px;
  color: var(--ad-text-2);
  font-family: var(--ad-font);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.ad-quick-btn:hover {
  border-color: var(--ad-accent);
  color: var(--ad-accent);
  background: var(--ad-accent-bg);
}
.ad-quick-btn.is-active {
  background: var(--ad-accent-bg);
  border-color: var(--ad-accent);
  color: var(--ad-accent);
  font-weight: 600;
}

/* ── Filter grid ── */
.ad-filter-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}
@media (min-width: 640px)  { .ad-filter-grid { grid-template-columns: 1fr 1fr; } }
@media (min-width: 1024px) { .ad-filter-grid { grid-template-columns: 2fr 1fr 1fr; } }

/* ── Table ── */
.ad-tbl-cols { grid-template-columns: 2.2fr 1.1fr 0.9fr 0.9fr 1.1fr 0.8fr 0.9fr 72px; }

.ad-tbl-head {
  display: none;
  padding: 0 20px;
  border-bottom: 1px solid var(--ad-border);
}
@media (min-width: 1080px) { .ad-tbl-head { display: block; } }

.ad-tbl-head-row {
  display: grid;
  gap: 8px;
  padding: 9px 0;
}

.ad-th {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--ad-text-3);
}

.ad-tbl-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--ad-border);
  transition: background 0.12s;
}
@media (min-width: 1080px) {
  .ad-tbl-row {
    gap: 8px;
    padding: 12px 20px;
    align-items: center;
  }
}
.ad-tbl-row:last-child { border-bottom: none; }
.ad-tbl-row:hover { background: var(--ad-surface-2); }

.ad-mob-label {
  display: block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ad-text-3);
  margin-bottom: 3px;
}
@media (min-width: 1080px) { .ad-mob-label { display: none; } }

.ad-customer-name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ad-text-1);
  line-height: 1.3;
}
.ad-customer-email {
  font-size: 12px;
  color: var(--ad-text-3);
  margin-top: 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ad-phone {
  font-family: var(--ad-mono);
  font-size: 12px;
  color: var(--ad-text-2);
}
.ad-time {
  font-family: var(--ad-mono);
  font-size: 13px;
  font-weight: 500;
  color: var(--ad-text-1);
}
.ad-dur {
  font-size: 11px;
  color: var(--ad-text-3);
  margin-top: 1px;
}
.ad-staff {
  font-size: 13px;
  color: var(--ad-text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Badges ── */
.ad-badge {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 7px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  border: 1px solid transparent;
}

/* Status */
.bs-scheduled  { background:rgba(59,130,246,.1);  color:#3b82f6; border-color:rgba(59,130,246,.2); }
.bs-confirmed  { background:rgba(16,185,129,.1); color:#10b981; border-color:rgba(16,185,129,.2); }
.bs-completed  { background:rgba(5,150,105,.1);  color:#059669; border-color:rgba(5,150,105,.2); }
.bs-cancelled  { background:rgba(239,68,68,.1);  color:#ef4444; border-color:rgba(239,68,68,.2); }

/* Type */
.bt-appointment  { background:rgba(99,102,241,.1); color:#6366f1; border-color:rgba(99,102,241,.2); }
.bt-test-drive   { background:rgba(245,158,11,.1); color:#f59e0b; border-color:rgba(245,158,11,.2); }
.bt-phone-call   { background:rgba(59,130,246,.1); color:#3b82f6; border-color:rgba(59,130,246,.2); }
.bt-meeting      { background:rgba(139,92,246,.1); color:#8b5cf6; border-color:rgba(139,92,246,.2); }
.bt-event        { background:rgba(236,72,153,.1); color:#ec4899; border-color:rgba(236,72,153,.2); }
.bt-task         { background:rgba(245,158,11,.1); color:#f59e0b; border-color:rgba(245,158,11,.2); }
.bt-reminder     { background:rgba(20,184,166,.1); color:#14b8a6; border-color:rgba(20,184,166,.2); }

/* Source */
.bsc-sms     { background:rgba(16,185,129,.08); color:#10b981; border-color:rgba(16,185,129,.2); }
.bsc-phone   { background:rgba(59,130,246,.08); color:#3b82f6; border-color:rgba(59,130,246,.2); }
.bsc-email   { background:rgba(99,102,241,.08); color:#6366f1; border-color:rgba(99,102,241,.2); }
.bsc-lead    { background:rgba(245,158,11,.08); color:#f59e0b; border-color:rgba(245,158,11,.2); }
.bsc-booking { background:rgba(5,150,105,.08);  color:#059669; border-color:rgba(5,150,105,.2); }
.bsc-manual  { background:rgba(107,114,128,.08);color:#6b7280; border-color:rgba(107,114,128,.2); }

/* ── Action buttons ── */
.ad-action-row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }

.ad-btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  background: transparent;
  border: 1px solid var(--ad-border);
  border-radius: var(--ad-radius-sm);
  color: var(--ad-text-2);
  font-family: var(--ad-font);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.ad-btn-outline:hover:not(:disabled) {
  border-color: var(--ad-accent);
  color: var(--ad-accent);
  background: var(--ad-accent-bg);
}
.ad-btn-outline:disabled { opacity: 0.4; cursor: not-allowed; }

.ad-view-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 10px;
  background: transparent;
  border: 1px solid var(--ad-border);
  border-radius: 5px;
  color: var(--ad-text-3);
  font-family: var(--ad-font);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.ad-view-btn:hover {
  border-color: var(--ad-accent);
  color: var(--ad-accent);
  background: var(--ad-accent-bg);
}

/* ── Empty ── */
.ad-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 56px 24px;
  gap: 10px;
  text-align: center;
}
.ad-empty-ico {
  width: 48px; height: 48px;
  background: var(--ad-surface-2);
  border: 1px solid var(--ad-border);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ad-text-3);
  margin-bottom: 4px;
}
.ad-empty-title { font-size: 15px; font-weight: 600; color: var(--ad-text-2); }
.ad-empty-sub   { font-size: 13px; color: var(--ad-text-3); max-width: 340px; }

/* ── Loading ── */
.ad-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 56px 24px;
  gap: 10px;
}
.ad-loading-txt { font-size: 13px; color: var(--ad-text-3); }

/* ── Footer ── */
.ad-tbl-footer {
  padding: 10px 20px;
  border-top: 1px solid var(--ad-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  color: var(--ad-text-3);
}
.ad-tbl-footer strong { color: var(--ad-text-2); font-weight: 600; }

/* ── Error ── */
.ad-error-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: rgba(239,68,68,.07);
  border: 1px solid rgba(239,68,68,.2);
  border-radius: var(--ad-radius-sm);
  font-size: 13px;
  color: #ef4444;
}

/* ── Scroll ── */
.ad-scroll {
  overflow-y: auto;
  max-height: 540px;
  scrollbar-width: thin;
  scrollbar-color: var(--ad-border) transparent;
}
.ad-scroll::-webkit-scrollbar { width: 4px; }
.ad-scroll::-webkit-scrollbar-thumb { background: var(--ad-border-med); border-radius: 2px; }

@keyframes ad-spin { to { transform: rotate(360deg); } }
.ad-spin { animation: ad-spin 1s linear infinite; }
`;

// ─── Style injection ──────────────────────────────────────────────────────────

function useStyles() {
  React.useEffect(() => {
    const id = "ad-dashboard-styles-v2";
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = STYLES;
    document.head.appendChild(el);
    return () => el.remove();
  }, []);
}

// ─── Badge components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`ad-badge bs-${status}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const key = type.toLowerCase().replace(/[\s_]+/g, "-");
  const label = type
    .split(/[-\s_]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return <span className={`ad-badge bt-${key}`}>{label}</span>;
}

function SourceBadge({ source }: { source: string }) {
  return (
    <span className={`ad-badge bsc-${source.toLowerCase()}`}>
      {source.charAt(0).toUpperCase() + source.slice(1)}
    </span>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="ad-stat-card" style={{ "--s-color": color } as React.CSSProperties}>
      <div className="ad-stat-bar" />
      <div className="ad-stat-label">{label}</div>
      <div className="ad-stat-num">{value}</div>
      <div className="ad-stat-icon">{icon}</div>
    </div>
  );
}

// ─── Appointment row ──────────────────────────────────────────────────────────

function AppointmentRow({
  appointment,
  onView,
}: {
  appointment: DashboardAppointment;
  onView: (id: string) => void;
}) {
  const startTime = new Date(appointment.startTime);
  const endTime   = new Date(appointment.endTime);
  const duration  = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
  const name      = `${appointment.customerBooking.firstName} ${appointment.customerBooking.lastName}`.trim();

  return (
    <div className={cn("ad-tbl-row", "ad-tbl-cols")}>
      <div>
        <span className="ad-mob-label">Customer</span>
        <div className="ad-customer-name">{name}</div>
        <div className="ad-customer-email">{appointment.customerBooking.email}</div>
      </div>
      <div>
        <span className="ad-mob-label">Phone</span>
        <div className="ad-phone">{appointment.customerBooking.phone}</div>
      </div>
      <div>
        <span className="ad-mob-label">Time</span>
        <div className="ad-time">{format(startTime, "HH:mm")}</div>
        <div className="ad-dur">{duration} min</div>
      </div>
      <div>
        <span className="ad-mob-label">Type</span>
        <TypeBadge type={appointment.entryType || appointment.type} />
      </div>
      <div>
        <span className="ad-mob-label">Booked By</span>
        <div className="ad-staff">{appointment.crmUser?.fullName || "—"}</div>
      </div>
      <div>
        <span className="ad-mob-label">Source</span>
        <SourceBadge source={appointment.source} />
      </div>
      <div>
        <span className="ad-mob-label">Status</span>
        <StatusBadge status={appointment.status} />
      </div>
      <div>
        <button
          className="ad-view-btn"
          onClick={() => onView(appointment._id)}
          aria-label={`View appointment for ${name}`}
        >
          <Eye size={11} strokeWidth={2} />
          View
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AppointmentDashboard() {
  useStyles();
  const router    = useRouter();
  const { getToken } = useAuth();

  const today    = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(new Date(Date.now() + 86_400_000), "yyyy-MM-dd");

  const [selectedDate, setSelectedDate] = React.useState(today);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [typeFilter,   setTypeFilter]   = React.useState("all");
  const [searchQuery,  setSearchQuery]  = React.useState("");

  const getHeaders = async () => {
    const token = await getToken();
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const {
    data: appointmentsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["appts-dash", selectedDate, statusFilter, typeFilter],
    queryFn: async () => {
      const h = await getHeaders();
      const params: Record<string, string> = { date: selectedDate };
      if (statusFilter !== "all") params.status = statusFilter;
      if (typeFilter   !== "all") params.type   = typeFilter;
      const r = await apiClient.get("/api/appointments/dashboard", { ...h, params });
      return r.data?.data || r.data;
    },
    staleTime: 30_000,
  });

  const { data: statsData } = useQuery({
    queryKey: ["appts-dash-stats", selectedDate],
    queryFn: async () => {
      const h = await getHeaders();
      const r = await apiClient.get("/api/appointments/dashboard/stats", {
        ...h,
        params: { date: selectedDate },
      });
      return r.data?.data || r.data;
    },
    staleTime: 30_000,
  });

  const filtered = React.useMemo(() => {
    if (!appointmentsData?.appointments) return [];
    const q = searchQuery.toLowerCase();
    if (!q) return appointmentsData.appointments as DashboardAppointment[];
    return (appointmentsData.appointments as DashboardAppointment[]).filter(apt => {
      const name = `${apt.customerBooking.firstName} ${apt.customerBooking.lastName}`.toLowerCase();
      return (
        name.includes(q) ||
        apt.customerBooking.email?.toLowerCase().includes(q) ||
        apt.customerBooking.phone?.toLowerCase().includes(q) ||
        apt.crmUser?.fullName?.toLowerCase().includes(q)
      );
    });
  }, [appointmentsData?.appointments, searchQuery]);

  const handleDateChange = (d: string) => {
    setSelectedDate(d);
    setStatusFilter("all");
    setTypeFilter("all");
    setSearchQuery("");
  };

  const displayDate = (() => {
    try { return format(new Date(selectedDate + "T00:00:00"), "MMMM d, yyyy"); }
    catch { return selectedDate; }
  })();

  const handleExport = async () => {
    try {
      const h = await getHeaders();
      const r = await apiClient.get("/api/appointments/dashboard/export", {
        ...h,
        params: { date: selectedDate, format: "csv" },
        responseType: "text",
      });
      const blob = new Blob([r.data], { type: "text/csv" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `appointments-${selectedDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed:", e);
    }
  };

  return (
    <div className="ad">
      <div className="ad-wrap">

        {/* ── Page Header ── */}
        <div className="ad-page-header">
          <div className="ad-page-header-left">
            <button
              className="ad-back-btn"
              onClick={() => router.back()}
              aria-label="Go back"
            >
              <ArrowLeft size={15} strokeWidth={2} />
            </button>
            <div>
              <div className="ad-eyebrow">Operations Center</div>
              <div className="ad-page-title">Appointment Dashboard</div>
            </div>
          </div>
          <button
            className="ad-primary-btn"
            onClick={() => router.push("/crm/appointments")}
          >
            <FileText size={14} strokeWidth={2} />
            Full Appointments
            <ChevronRight size={14} strokeWidth={2} />
          </button>
        </div>

        {/* ── Date Selection ── */}
        <div className="ad-card">
          <div className="ad-card-head">
            <div className="ad-card-label">
              <Calendar size={13} strokeWidth={2} />
              Date Selection
            </div>
          </div>
          <div className="ad-card-body">
            <div className="ad-date-input-group">
              <label className="ad-field-label" htmlFor="date-input">
                Selected Date
              </label>
              <input
                id="date-input"
                type="date"
                className="ad-ctrl"
                value={selectedDate}
                onChange={e => handleDateChange(e.target.value)}
                style={{ maxWidth: 220 }}
              />
            </div>
            <div className="ad-quick-row">
              <span className="ad-quick-label">Quick:</span>
              <button
                className={cn("ad-quick-btn", selectedDate === today && "is-active")}
                onClick={() => handleDateChange(today)}
              >
                Today
              </button>
              <button
                className={cn("ad-quick-btn", selectedDate === tomorrow && "is-active")}
                onClick={() => handleDateChange(tomorrow)}
              >
                Tomorrow
              </button>
              {selectedDate !== today && (
                <button
                  className="ad-quick-btn"
                  onClick={() => handleDateChange(today)}
                >
                  Reset to Today
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Stats ── */}
        {statsData && (
          <div className="ad-stats-grid">
            <StatCard label="Total"     value={statsData.total     ?? 0} color="#1a56db" icon={<TrendingUp size={40} strokeWidth={1.5} />} />
            <StatCard label="Scheduled" value={statsData.scheduled ?? 0} color="#3b82f6" icon={<Clock      size={40} strokeWidth={1.5} />} />
            <StatCard label="Confirmed" value={statsData.confirmed ?? 0} color="#10b981" icon={<CheckCircle2 size={40} strokeWidth={1.5} />} />
            <StatCard label="Completed" value={statsData.completed ?? 0} color="#059669" icon={<CheckCircle2 size={40} strokeWidth={1.5} />} />
            <StatCard label="Cancelled" value={statsData.cancelled ?? 0} color="#ef4444" icon={<XCircle    size={40} strokeWidth={1.5} />} />
          </div>
        )}

        {/* ── Filters ── */}
        <div className="ad-card">
          <div className="ad-card-head">
            <div className="ad-card-label">
              <Filter size={13} strokeWidth={2} />
              Filters
            </div>
          </div>
          <div className="ad-card-body">
            <div className="ad-filter-grid">
              <div>
                <label className="ad-field-label" htmlFor="search-ctrl">
                  Search
                </label>
                <div className="ad-search-wrap">
                  <Search size={13} className="ad-search-icon" strokeWidth={2} />
                  <input
                    id="search-ctrl"
                    className="ad-ctrl"
                    placeholder="Customer name, email, or phone..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="ad-field-label" htmlFor="status-ctrl">
                  Status
                </label>
                <select
                  id="status-ctrl"
                  className="ad-ctrl ad-ctrl-select"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="ad-field-label" htmlFor="type-ctrl">
                  Type
                </label>
                <select
                  id="type-ctrl"
                  className="ad-ctrl ad-ctrl-select"
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="appointment">Appointment</option>
                  <option value="test-drive">Test Drive</option>
                  <option value="phone-call">Phone Call</option>
                  <option value="meeting">Meeting</option>
                  <option value="event">Event</option>
                  <option value="task">Task</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="ad-error-box">
            <AlertCircle size={15} strokeWidth={2} />
            {error instanceof Error
              ? error.message
              : "Failed to load appointments. Please try again."}
          </div>
        )}

        {/* ── Appointments Table ── */}
        <div className="ad-card" style={{ display: "flex", flexDirection: "column" }}>
          <div className="ad-card-head">
            <div className="ad-card-label">
              <Car size={13} strokeWidth={2} />
              {displayDate}
              {!isLoading && appointmentsData?.count != null && (
                <span style={{ color: "var(--ad-text-3)", fontWeight: 400, letterSpacing: 0, textTransform: "none", fontSize: 12, marginLeft: 4 }}>
                  &mdash; {appointmentsData.count} total
                </span>
              )}
            </div>
            <div className="ad-action-row">
              <button
                className="ad-btn-outline"
                onClick={handleExport}
                disabled={isLoading || !filtered.length}
              >
                <Download size={12} strokeWidth={2} />
                Export CSV
              </button>
              <button
                className="ad-btn-outline"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw
                  size={12}
                  strokeWidth={2}
                  className={isLoading ? "ad-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>

          {/* Column headers */}
          <div className="ad-tbl-head">
            <div className={cn("ad-tbl-head-row", "ad-tbl-cols")}>
              <span className="ad-th">Customer</span>
              <span className="ad-th">Phone</span>
              <span className="ad-th">Time</span>
              <span className="ad-th">Type</span>
              <span className="ad-th">Booked By</span>
              <span className="ad-th">Source</span>
              <span className="ad-th">Status</span>
              <span className="ad-th" />
            </div>
          </div>

          {isLoading ? (
            <div className="ad-loading">
              <Loader2
                size={22}
                strokeWidth={2}
                className="ad-spin"
                style={{ color: "var(--ad-accent)" }}
              />
              <p className="ad-loading-txt">Loading appointments&hellip;</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="ad-empty">
              <div className="ad-empty-ico">
                <Calendar size={22} strokeWidth={1.5} />
              </div>
              <div className="ad-empty-title">No Appointments Found</div>
              <div className="ad-empty-sub">
                {searchQuery
                  ? "Try adjusting your search or filter criteria."
                  : `No appointments are scheduled for ${displayDate}.`}
              </div>
            </div>
          ) : (
            <div className="ad-scroll">
              {filtered.map(apt => (
                <AppointmentRow
                  key={apt._id}
                  appointment={apt}
                  onView={id => router.push(`/crm/appointments?id=${id}`)}
                />
              ))}
            </div>
          )}

          {!isLoading && filtered.length > 0 && (
            <div className="ad-tbl-footer">
              <span>
                Showing{" "}
                <strong>{filtered.length}</strong> of{" "}
                <strong>{appointmentsData?.count ?? 0}</strong>{" "}
                appointments
              </span>
              <span>{displayDate}</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default AppointmentDashboard;
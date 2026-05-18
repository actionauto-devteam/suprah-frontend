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
  CalendarDays,
  Plus,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

interface DashboardPost {
  _id: string;
  type: "event" | "news" | "announcement" | "update";
  title: string;
  content: string;
  authorName: string;
  authorRole: string;
  createdAt: Date | string;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --c-bg:          #f0f2f5;
  --c-surface:     #ffffff;
  --c-surface-2:   #f7f9fb;
  --c-surface-3:   #eef1f6;
  --c-border:      #e2e6ef;
  --c-border-2:    #d3d9e8;

  --c-text-1:      #0c1220;
  --c-text-2:      #3b4560;
  --c-text-3:      #6e7a99;
  --c-text-4:      #aab2cc;

  --c-green:       #16a34a;
  --c-green-h:     #15803d;
  --c-green-light: rgba(22,163,74,0.08);
  --c-green-ring:  rgba(22,163,74,0.20);

  --c-blue:        #2563eb;
  --c-teal:        #0d9488;
  --c-violet:      #7c3aed;
  --c-amber:       #d97706;
  --c-red:         #dc2626;

  --radius:        8px;
  --radius-sm:     5px;
  --shadow-xs:     0 1px 2px rgba(0,0,0,0.05);
  --shadow-sm:     0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md:     0 4px 16px rgba(0,0,0,0.10);

  --font:          'Sora', sans-serif;
  --mono:          'JetBrains Mono', monospace;
}

.dark {
  --c-bg:          #080c14;
  --c-surface:     #0e1422;
  --c-surface-2:   #131927;
  --c-surface-3:   #1a2135;
  --c-border:      #1e2840;
  --c-border-2:    #28344e;

  --c-text-1:      #e8ecf8;
  --c-text-2:      #8b96b8;
  --c-text-3:      #4e5a7a;
  --c-text-4:      #2e3855;

  --c-green:       #22c55e;
  --c-green-h:     #16a34a;
  --c-green-light: rgba(34,197,94,0.08);
  --c-green-ring:  rgba(34,197,94,0.20);
}

/* ── Reset & base ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.apd {
  font-family: var(--font);
  background: var(--c-bg);
  color: var(--c-text-1);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ── Layout ── */
.apd-layout {
  max-width: 1560px;
  margin: 0 auto;
  padding: 24px 28px 60px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Header ── */
.apd-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--c-border);
}

.apd-header-left { display: flex; align-items: center; gap: 12px; }

.apd-back {
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  color: var(--c-text-3);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, box-shadow 0.15s;
  flex-shrink: 0;
}
.apd-back:hover { border-color: var(--c-green); color: var(--c-green); box-shadow: 0 0 0 3px var(--c-green-ring); }

.apd-header-info {}
.apd-eyebrow {
  font-size: 10px; font-weight: 600; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--c-green); margin-bottom: 2px;
}
.apd-title {
  font-size: 19px; font-weight: 700; color: var(--c-text-1);
  letter-spacing: -0.02em; line-height: 1.2;
}

.apd-header-right { display: flex; align-items: center; gap: 8px; }

.apd-btn-ghost {
  display: inline-flex; align-items: center; gap: 6px;
  height: 34px; padding: 0 14px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  color: var(--c-text-2);
  font-family: var(--font); font-size: 12.5px; font-weight: 500;
  cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
.apd-btn-ghost:hover { border-color: var(--c-green); color: var(--c-green); background: var(--c-green-light); }
.apd-btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }

.apd-btn-primary {
  display: inline-flex; align-items: center; gap: 6px;
  height: 34px; padding: 0 16px;
  background: var(--c-green); border: none;
  border-radius: var(--radius-sm);
  color: #fff; font-family: var(--font); font-size: 12.5px; font-weight: 600;
  cursor: pointer; transition: background 0.15s, box-shadow 0.15s; white-space: nowrap;
}
.apd-btn-primary:hover { background: var(--c-green-h); box-shadow: var(--shadow-md); }

/* ── Posts ── */
.apd-posts-card {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-xs);
  overflow: hidden;
}

.apd-posts-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--c-border);
  background: var(--c-surface-2);
}

.apd-posts-title {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--c-text-2);
  letter-spacing: 0.02em;
}

.apd-posts-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 16px;
}

.apd-post-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--c-surface-2);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  padding: 10px;
}

.apd-post-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.apd-post-input,
.apd-post-select,
.apd-post-textarea {
  width: 100%;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  border-radius: var(--radius-sm);
  color: var(--c-text-1);
  font-family: var(--font);
  font-size: 12.5px;
  padding: 8px 10px;
  outline: none;
}

.apd-post-input:focus,
.apd-post-select:focus,
.apd-post-textarea:focus {
  border-color: var(--c-green);
  box-shadow: 0 0 0 3px var(--c-green-ring);
}

.apd-post-input { flex: 1; min-width: 240px; }
.apd-post-select { width: 150px; }
.apd-post-textarea { min-height: 86px; resize: vertical; }

.apd-post-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.apd-post-item {
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  padding: 10px;
  background: var(--c-surface-2);
}

.apd-post-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.apd-post-type {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--c-green);
  background: var(--c-green-light);
  border: 1px solid var(--c-green-ring);
}

.apd-post-author,
.apd-post-time {
  font-size: 11px;
  color: var(--c-text-3);
}

.apd-post-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--c-text-1);
  margin-bottom: 4px;
}

.apd-post-content {
  font-size: 12px;
  color: var(--c-text-2);
  line-height: 1.5;
  white-space: pre-wrap;
}

.apd-post-stream {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--c-border);
  background: var(--c-surface);
}

/* ── Toolbar row ── */
.apd-toolbar {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  padding: 14px 18px;
  box-shadow: var(--shadow-xs);
}

.apd-toolbar-group { display: flex; align-items: flex-end; gap: 8px; flex-wrap: wrap; }
.apd-toolbar-divider { width: 1px; height: 32px; background: var(--c-border); margin: 0 4px; align-self: center; }

.apd-field { display: flex; flex-direction: column; gap: 5px; }
.apd-label {
  font-size: 10px; font-weight: 700; letter-spacing: 0.09em;
  text-transform: uppercase; color: var(--c-text-3);
}

.apd-ctrl {
  height: 34px; padding: 0 10px;
  background: var(--c-surface-2);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  color: var(--c-text-1);
  font-family: var(--font); font-size: 13px;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  color-scheme: light dark;
}
.apd-ctrl:focus { border-color: var(--c-green); box-shadow: 0 0 0 3px var(--c-green-ring); }
.apd-ctrl::placeholder { color: var(--c-text-4); }
.apd-ctrl-date { width: 160px; cursor: pointer; }
.apd-ctrl-select {
  width: 148px; cursor: pointer;
  padding-right: 28px; -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236e7a99' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 8px center;
}
.apd-ctrl-select option { background: var(--c-surface); }
.apd-search-wrap { position: relative; }
.apd-search-ico { position: absolute; left: 9px; top: 50%; transform: translateY(-50%); color: var(--c-text-3); pointer-events: none; }
.apd-search-wrap .apd-ctrl { padding-left: 30px; width: 220px; }

.apd-quick-chips { display: flex; align-items: center; gap: 6px; }
.apd-chip {
  height: 26px; padding: 0 10px;
  background: var(--c-surface-3);
  border: 1px solid var(--c-border);
  border-radius: 4px;
  color: var(--c-text-3);
  font-family: var(--font); font-size: 11.5px; font-weight: 500;
  cursor: pointer; transition: all 0.14s; white-space: nowrap;
}
.apd-chip:hover { border-color: var(--c-green); color: var(--c-green); background: var(--c-green-light); }
.apd-chip.is-on { background: var(--c-green-light); border-color: var(--c-green); color: var(--c-green); font-weight: 600; }

/* ── Stats row ── */
.apd-stats {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}
@media (max-width: 900px) { .apd-stats { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 520px)  { .apd-stats { grid-template-columns: repeat(2, 1fr); } }

.apd-stat {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  padding: 14px 16px 12px;
  box-shadow: var(--shadow-xs);
  position: relative;
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.apd-stat:hover { border-color: var(--c-border-2); box-shadow: var(--shadow-sm); }

.apd-stat-stripe {
  position: absolute; top: 0; left: 0; right: 0; height: 2.5px;
  background: var(--stripe);
  border-radius: var(--radius) var(--radius) 0 0;
}
.apd-stat-label {
  font-size: 10px; font-weight: 700; letter-spacing: 0.09em;
  text-transform: uppercase; color: var(--c-text-3); margin-bottom: 6px;
}
.apd-stat-value {
  font-size: 30px; font-weight: 700; line-height: 1;
  color: var(--c-text-1); letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}
.apd-stat-icon {
  position: absolute; bottom: 8px; right: 12px;
  color: var(--stripe); opacity: 0.10;
}

/* ── Table card ── */
.apd-table-card {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-xs);
  overflow: hidden;
}

.apd-table-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px; padding: 12px 20px;
  border-bottom: 1px solid var(--c-border);
  background: var(--c-surface-2);
}
.apd-table-header-left {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; font-weight: 600; color: var(--c-text-2);
}
.apd-count-pill {
  background: var(--c-surface-3);
  border: 1px solid var(--c-border);
  border-radius: 20px;
  padding: 1px 8px;
  font-size: 11px; font-weight: 600; color: var(--c-text-3);
}
.apd-table-actions { display: flex; gap: 7px; align-items: center; }

/* ── Table ── */
.apd-tbl { width: 100%; border-collapse: collapse; table-layout: fixed; }

/* Column widths */
.apd-tbl .col-customer { width: 22%; }
.apd-tbl .col-phone    { width: 12%; }
.apd-tbl .col-time     { width: 10%; }
.apd-tbl .col-type     { width: 13%; }
.apd-tbl .col-booked   { width: 16%; }
.apd-tbl .col-source   { width: 10%; }
.apd-tbl .col-status   { width: 10%; }
.apd-tbl .col-action   { width: 7%; }

.apd-tbl thead tr {
  border-bottom: 1px solid var(--c-border);
}
.apd-tbl thead th {
  padding: 9px 14px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.09em;
  text-transform: uppercase; color: var(--c-text-3);
  text-align: left; white-space: nowrap;
}
.apd-tbl thead th:last-child { text-align: center; }

.apd-tbl tbody tr {
  border-bottom: 1px solid var(--c-border);
  transition: background 0.1s;
}
.apd-tbl tbody tr:last-child { border-bottom: none; }
.apd-tbl tbody tr:hover { background: var(--c-surface-2); }

.apd-tbl td {
  padding: 11px 14px;
  vertical-align: middle;
  font-size: 13px; color: var(--c-text-2);
}
.apd-tbl td:last-child { text-align: center; }

/* Customer cell */
.apd-cust-name {
  font-size: 13px; font-weight: 600; color: var(--c-text-1);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.apd-cust-email {
  font-size: 11.5px; color: var(--c-text-3); margin-top: 1px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* Phone */
.apd-phone {
  font-family: var(--mono); font-size: 12px;
  color: var(--c-text-2); letter-spacing: -0.01em;
  white-space: nowrap;
}

/* Time */
.apd-time-val { font-family: var(--mono); font-size: 13px; font-weight: 500; color: var(--c-text-1); }
.apd-time-dur { font-size: 11px; color: var(--c-text-4); margin-top: 1px; }

/* Staff */
.apd-staff {
  font-size: 12.5px; color: var(--c-text-2);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* ── Badges ── */
.badge {
  display: inline-flex; align-items: center;
  height: 20px; padding: 0 7px;
  border-radius: 4px;
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.05em; text-transform: uppercase;
  border: 1px solid transparent; white-space: nowrap;
}

/* Status */
.bs-scheduled { background: rgba(37,99,235,.08); color: #2563eb; border-color: rgba(37,99,235,.2); }
.bs-confirmed { background: rgba(5,150,105,.08); color: #059669; border-color: rgba(5,150,105,.2); }
.bs-completed { background: rgba(22,163,74,.08);  color: #16a34a; border-color: rgba(22,163,74,.2); }
.bs-cancelled { background: rgba(220,38,38,.08);  color: #dc2626; border-color: rgba(220,38,38,.2); }

/* Type */
.bt-appointment { background: rgba(124,58,237,.08); color: #7c3aed; border-color: rgba(124,58,237,.2); }
.bt-test-drive  { background: rgba(217,119,6,.08);  color: #d97706; border-color: rgba(217,119,6,.2); }
.bt-phone-call  { background: rgba(37,99,235,.08);  color: #2563eb; border-color: rgba(37,99,235,.2); }
.bt-meeting     { background: rgba(13,148,136,.08); color: #0d9488; border-color: rgba(13,148,136,.2); }
.bt-event       { background: rgba(219,39,119,.08); color: #db2777; border-color: rgba(219,39,119,.2); }
.bt-task        { background: rgba(217,119,6,.08);  color: #d97706; border-color: rgba(217,119,6,.2); }
.bt-reminder    { background: rgba(13,148,136,.08); color: #0d9488; border-color: rgba(13,148,136,.2); }

/* Source */
.bsrc-sms     { background: rgba(22,163,74,.08);  color: #16a34a; border-color: rgba(22,163,74,.2); }
.bsrc-phone   { background: rgba(37,99,235,.08);  color: #2563eb; border-color: rgba(37,99,235,.2); }
.bsrc-email   { background: rgba(124,58,237,.08); color: #7c3aed; border-color: rgba(124,58,237,.2); }
.bsrc-lead    { background: rgba(217,119,6,.08);  color: #d97706; border-color: rgba(217,119,6,.2); }
.bsrc-booking { background: rgba(13,148,136,.08); color: #0d9488; border-color: rgba(13,148,136,.2); }
.bsrc-manual  { background: rgba(107,114,128,.08);color: #6b7280; border-color: rgba(107,114,128,.2); }

/* ── View button ── */
.apd-view-btn {
  display: inline-flex; align-items: center; gap: 4px;
  height: 26px; padding: 0 10px;
  background: transparent;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  color: var(--c-text-3);
  font-family: var(--font); font-size: 11px; font-weight: 500;
  cursor: pointer; transition: all 0.14s;
}
.apd-view-btn:hover { border-color: var(--c-green); color: var(--c-green); background: var(--c-green-light); }

/* ── Empty / Loading / Error ── */
.apd-center {
  display: flex; flex-direction: column; align-items: center;
  padding: 60px 24px; gap: 10px; text-align: center;
}
.apd-center-icon {
  width: 46px; height: 46px;
  background: var(--c-surface-2);
  border: 1px solid var(--c-border);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  color: var(--c-text-3); margin-bottom: 2px;
}
.apd-center-title { font-size: 14.5px; font-weight: 600; color: var(--c-text-2); }
.apd-center-sub   { font-size: 13px; color: var(--c-text-3); max-width: 320px; }

.apd-error {
  display: flex; align-items: center; gap: 10px;
  padding: 11px 16px;
  background: rgba(220,38,38,.06);
  border: 1px solid rgba(220,38,38,.18);
  border-radius: var(--radius-sm);
  font-size: 13px; color: #dc2626;
}

/* ── Table scroll ── */
.apd-tbl-scroll {
  overflow-x: auto;
  overflow-y: auto;
  max-height: 520px;
  scrollbar-width: thin;
  scrollbar-color: var(--c-border) transparent;
}
.apd-tbl-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
.apd-tbl-scroll::-webkit-scrollbar-thumb { background: var(--c-border-2); border-radius: 2px; }

/* ── Footer ── */
.apd-tbl-foot {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px; padding: 9px 20px;
  border-top: 1px solid var(--c-border);
  font-size: 11.5px; color: var(--c-text-3);
  background: var(--c-surface-2);
}
.apd-tbl-foot strong { color: var(--c-text-2); font-weight: 600; }

/* ── Spin ── */
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 1s linear infinite; }
`;

// ─── Style injection ──────────────────────────────────────────────────────────

function useStyles() {
  React.useEffect(() => {
    const id = "apd-styles-v3";
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = STYLES;
    document.head.appendChild(el);
    return () => el.remove();
  }, []);
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={`badge bs-${status}`}>{label}</span>;
}

function TypeBadge({ type }: { type: string }) {
  const key = type.toLowerCase().replace(/[\s_]+/g, "-");
  const label = type
    .split(/[-\s_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return <span className={`badge bt-${key}`}>{label}</span>;
}

function SourceBadge({ source }: { source: string }) {
  const key = source.toLowerCase();
  return (
    <span className={`badge bsrc-${key}`}>
      {source.charAt(0).toUpperCase() + source.slice(1)}
    </span>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  stripe,
  icon,
}: {
  label: string;
  value: number;
  stripe: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="apd-stat"
      style={{ "--stripe": stripe } as React.CSSProperties}
    >
      <div className="apd-stat-stripe" />
      <div className="apd-stat-label">{label}</div>
      <div className="apd-stat-value">{value}</div>
      <div className="apd-stat-icon">{icon}</div>
    </div>
  );
}

// ─── Table row ────────────────────────────────────────────────────────────────

function AppointmentRow({
  apt,
  onView,
}: {
  apt: DashboardAppointment;
  onView: (id: string) => void;
}) {
  const start = new Date(apt.startTime);
  const end = new Date(apt.endTime);
  const dur = Math.round((end.getTime() - start.getTime()) / 60000);
  const name =
    `${apt.customerBooking.firstName} ${apt.customerBooking.lastName}`.trim();

  return (
    <tr>
      <td className="col-customer">
        <div className="apd-cust-name">{name}</div>
        <div className="apd-cust-email">{apt.customerBooking.email}</div>
      </td>
      <td className="col-phone">
        <span className="apd-phone">{apt.customerBooking.phone}</span>
      </td>
      <td className="col-time">
        <div className="apd-time-val">{format(start, "HH:mm")}</div>
        <div className="apd-time-dur">{dur} min</div>
      </td>
      <td className="col-type">
        <TypeBadge type={apt.entryType || apt.type} />
      </td>
      <td className="col-booked">
        <span className="apd-staff">{apt.crmUser?.fullName || "—"}</span>
      </td>
      <td className="col-source">
        <SourceBadge source={apt.source} />
      </td>
      <td className="col-status">
        <StatusBadge status={apt.status} />
      </td>
      <td className="col-action">
        <button
          className="apd-view-btn"
          onClick={() => onView(apt._id)}
          aria-label={`View appointment for ${name}`}
        >
          <Eye size={11} strokeWidth={2} />
          View
        </button>
      </td>
    </tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AppointmentDashboard() {
  useStyles();
  const router = useRouter();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(new Date(Date.now() + 86_400_000), "yyyy-MM-dd");

  const [selectedDate, setSelectedDate] = React.useState(today);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showPostComposer, setShowPostComposer] = React.useState(false);
  const [postType, setPostType] = React.useState<
    "event" | "news" | "announcement" | "update"
  >("event");
  const [postTitle, setPostTitle] = React.useState("");
  const [postContent, setPostContent] = React.useState("");

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
      if (typeFilter !== "all") params.type = typeFilter;
      const r = await apiClient.get("/api/appointments/dashboard", {
        ...h,
        params,
      });
      return r.data?.data ?? r.data;
    },
    staleTime: 30_000,
  });

  const { data: crmMeData } = useQuery({
    queryKey: ["crm-me-for-apd"],
    queryFn: async () => {
      const h = await getHeaders();
      const r = await apiClient.get("/api/crm/me", h);
      return r.data?.data ?? r.data;
    },
    staleTime: 60_000,
  });

  const isAdmin = crmMeData?.role === "admin";

  const { data: postsData, isLoading: isPostsLoading } = useQuery({
    queryKey: ["appts-dash-posts"],
    queryFn: async () => {
      const h = await getHeaders();
      const r = await apiClient.get("/api/appointments/dashboard/posts", {
        ...h,
        params: { limit: 30 },
      });
      return r.data?.data ?? r.data;
    },
    staleTime: 30_000,
  });

  const createPostMutation = useMutation({
    mutationFn: async () => {
      const h = await getHeaders();
      return apiClient.post(
        "/api/appointments/dashboard/posts",
        { type: postType, title: postTitle, content: postContent },
        h,
      );
    },
    onSuccess: () => {
      setPostTitle("");
      setPostContent("");
      setPostType("event");
      setShowPostComposer(false);
      queryClient.invalidateQueries({ queryKey: ["appts-dash-posts"] });
    },
  });

  const posts: DashboardPost[] =
    (postsData?.posts as DashboardPost[] | undefined) || [];

  const { data: statsData } = useQuery({
    queryKey: ["appts-dash-stats", selectedDate],
    queryFn: async () => {
      const h = await getHeaders();
      const r = await apiClient.get("/api/appointments/dashboard/stats", {
        ...h,
        params: { date: selectedDate },
      });
      return r.data?.data ?? r.data;
    },
    staleTime: 30_000,
  });

  const filtered = React.useMemo(() => {
    if (!appointmentsData?.appointments) return [];
    const q = searchQuery.toLowerCase();
    if (!q) return appointmentsData.appointments as DashboardAppointment[];
    return (appointmentsData.appointments as DashboardAppointment[]).filter(
      (apt) => {
        const name =
          `${apt.customerBooking.firstName} ${apt.customerBooking.lastName}`.toLowerCase();
        return (
          name.includes(q) ||
          apt.customerBooking.email?.toLowerCase().includes(q) ||
          apt.customerBooking.phone?.toLowerCase().includes(q) ||
          apt.crmUser?.fullName?.toLowerCase().includes(q)
        );
      },
    );
  }, [appointmentsData?.appointments, searchQuery]);

  const handleDateChange = (d: string) => {
    setSelectedDate(d);
    setStatusFilter("all");
    setTypeFilter("all");
    setSearchQuery("");
  };

  const displayDate = (() => {
    try {
      return format(new Date(selectedDate + "T00:00:00"), "MMMM d, yyyy");
    } catch {
      return selectedDate;
    }
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
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), {
        href: url,
        download: `appointments-${selectedDate}.csv`,
      });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed:", e);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!postTitle.trim() || !postContent.trim()) return;
    await createPostMutation.mutateAsync();
  };

  return (
    <div className="apd">
      <div className="apd-layout">
        {/* ── Page header ── */}
        <div className="apd-header">
          <div className="apd-header-left">
            <button
              className="apd-back"
              onClick={() => router.back()}
              aria-label="Go back"
            >
              <ArrowLeft size={14} strokeWidth={2} />
            </button>
            <div className="apd-header-info">
              <div className="apd-eyebrow">Operations Center</div>
              <div className="apd-title">Appointment Dashboard</div>
            </div>
          </div>
          <div className="apd-header-right">
            <button
              className="apd-btn-primary"
              onClick={() => router.push("/crm/appointments")}
            >
              <FileText size={13} strokeWidth={2} />
              Full Appointments
              <ChevronRight size={13} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        {statsData && (
          <div className="apd-stats">
            <StatCard
              label="Total"
              value={statsData.total ?? 0}
              stripe="#2563eb"
              icon={<TrendingUp size={38} strokeWidth={1.5} />}
            />
            <StatCard
              label="Scheduled"
              value={statsData.scheduled ?? 0}
              stripe="#3b82f6"
              icon={<Clock size={38} strokeWidth={1.5} />}
            />
            <StatCard
              label="Confirmed"
              value={statsData.confirmed ?? 0}
              stripe="#0d9488"
              icon={<CheckCircle2 size={38} strokeWidth={1.5} />}
            />
            <StatCard
              label="Completed"
              value={statsData.completed ?? 0}
              stripe="#16a34a"
              icon={<CheckCircle2 size={38} strokeWidth={1.5} />}
            />
            <StatCard
              label="Cancelled"
              value={statsData.cancelled ?? 0}
              stripe="#dc2626"
              icon={<XCircle size={38} strokeWidth={1.5} />}
            />
          </div>
        )}

        {/* ── Toolbar ── */}
        <div className="apd-toolbar">
          {/* Date */}
          <div className="apd-field">
            <span className="apd-label">Date</span>
            <input
              type="date"
              className="apd-ctrl apd-ctrl-date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
            />
          </div>

          {/* Quick chips */}
          <div className="apd-field">
            <span className="apd-label">Quick select</span>
            <div className="apd-quick-chips">
              <button
                className={cn("apd-chip", selectedDate === today && "is-on")}
                onClick={() => handleDateChange(today)}
              >
                Today
              </button>
              <button
                className={cn("apd-chip", selectedDate === tomorrow && "is-on")}
                onClick={() => handleDateChange(tomorrow)}
              >
                Tomorrow
              </button>
              {selectedDate !== today && (
                <button
                  className="apd-chip"
                  onClick={() => handleDateChange(today)}
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="apd-toolbar-divider" />

          {/* Status */}
          <div className="apd-field">
            <span className="apd-label">Status</span>
            <select
              className="apd-ctrl apd-ctrl-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Type */}
          <div className="apd-field">
            <span className="apd-label">Type</span>
            <select
              className="apd-ctrl apd-ctrl-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
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

          <div className="apd-toolbar-divider" />

          {/* Search */}
          <div className="apd-field">
            <span className="apd-label">Search</span>
            <div className="apd-search-wrap">
              <Search size={12} className="apd-search-ico" strokeWidth={2} />
              <input
                className="apd-ctrl"
                placeholder="Name, email, phone…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="apd-error">
            <AlertCircle size={14} strokeWidth={2} />
            {error instanceof Error
              ? error.message
              : "Failed to load appointments. Please try again."}
          </div>
        )}

        {/* ── Table card ── */}
        <div className="apd-table-card">
          <div className="apd-table-header">
            <div className="apd-table-header-left">
              <CalendarDays
                size={13}
                strokeWidth={2}
                style={{ color: "var(--c-green)" }}
              />
              <span>{displayDate}</span>
              {!isLoading && appointmentsData?.count != null && (
                <span className="apd-count-pill">
                  {appointmentsData.count} total
                </span>
              )}
            </div>
            <div className="apd-table-actions">
              {isAdmin && (
                <button
                  className="apd-btn-primary"
                  onClick={() => setShowPostComposer((v) => !v)}
                >
                  <Plus size={12} strokeWidth={2} />
                  add event
                </button>
              )}
              <button
                className="apd-btn-ghost"
                onClick={handleExport}
                disabled={isLoading || !filtered.length}
              >
                <Download size={12} strokeWidth={2} />
                Export CSV
              </button>
              <button
                className="apd-btn-ghost"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw
                  size={12}
                  strokeWidth={2}
                  className={isLoading ? "spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>

          {showPostComposer && isAdmin && (
            <div className="apd-post-stream">
              <form className="apd-post-form" onSubmit={handleCreatePost}>
                <div className="apd-post-row">
                  <input
                    className="apd-post-input"
                    placeholder="Post title"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    maxLength={160}
                  />
                  <select
                    className="apd-post-select"
                    value={postType}
                    onChange={(e) =>
                      setPostType(e.target.value as DashboardPost["type"])
                    }
                  >
                    <option value="event">Event</option>
                    <option value="news">News</option>
                    <option value="announcement">Announcement</option>
                    <option value="update">Update</option>
                  </select>
                </div>
                <textarea
                  className="apd-post-textarea"
                  placeholder="Write your update..."
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  maxLength={5000}
                />
                <div className="apd-post-actions">
                  <button
                    type="button"
                    className="apd-btn-ghost"
                    onClick={() => setShowPostComposer(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="apd-btn-primary"
                    disabled={
                      createPostMutation.isPending ||
                      !postTitle.trim() ||
                      !postContent.trim()
                    }
                  >
                    {createPostMutation.isPending ? "Posting..." : "Post"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {(isPostsLoading || posts.length > 0) && (
            <div className="apd-post-stream">
              {isPostsLoading ? (
                <div className="apd-center-sub">Loading posts...</div>
              ) : (
                posts.map((post) => (
                  <div className="apd-post-item" key={post._id}>
                    <div className="apd-post-meta">
                      <span className="apd-post-type">{post.type}</span>
                      <span className="apd-post-author">
                        By {post.authorName} ({post.authorRole})
                      </span>
                      <span className="apd-post-time">
                        {format(
                          new Date(post.createdAt),
                          "MMM d, yyyy · HH:mm",
                        )}
                      </span>
                    </div>
                    <div className="apd-post-title">{post.title}</div>
                    <div className="apd-post-content">{post.content}</div>
                  </div>
                ))
              )}
            </div>
          )}

          {isLoading ? (
            <div className="apd-center">
              <Loader2
                size={22}
                strokeWidth={2}
                className="spin"
                style={{ color: "var(--c-green)" }}
              />
              <p className="apd-center-sub">Loading appointments…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="apd-center">
              <div className="apd-center-icon">
                <Calendar size={20} strokeWidth={1.5} />
              </div>
              <div className="apd-center-title">No Appointments Found</div>
              <div className="apd-center-sub">
                {searchQuery
                  ? "Try adjusting your search or filters."
                  : `No appointments scheduled for ${displayDate}.`}
              </div>
            </div>
          ) : (
            <div className="apd-tbl-scroll">
              <table className="apd-tbl">
                <colgroup>
                  <col className="col-customer" />
                  <col className="col-phone" />
                  <col className="col-time" />
                  <col className="col-type" />
                  <col className="col-booked" />
                  <col className="col-source" />
                  <col className="col-status" />
                  <col className="col-action" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="col-customer">Customer</th>
                    <th className="col-phone">Phone</th>
                    <th className="col-time">Time</th>
                    <th className="col-type">Type</th>
                    <th className="col-booked">Booked By</th>
                    <th className="col-source">Source</th>
                    <th className="col-status">Status</th>
                    <th className="col-action" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((apt) => (
                    <AppointmentRow
                      key={apt._id}
                      apt={apt}
                      onView={(id) => router.push(`/crm/appointments?id=${id}`)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && filtered.length > 0 && (
            <div className="apd-tbl-foot">
              <span>
                Showing <strong>{filtered.length}</strong> of{" "}
                <strong>{appointmentsData?.count ?? 0}</strong> appointments
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

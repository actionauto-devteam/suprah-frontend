"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Calendar,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Download,
  Eye,
  RefreshCw,
  Search,
  Car,
  Clock,
  CalendarDays,
  FileText,
  UserCheck,
  Zap,
  CheckCircle,
  XCircle,
  Users
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { AppointmentDetailsModal } from "@/components/AppointmentDetailsModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

interface DashboardAppointment {
  _id: string;
  title: string;
  description?: string;
  startTime: Date | string;
  endTime: Date | string;
  type: string;
  customTypeDetails?: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled";
  entryType: string;
  source: string;
  customerBooking: CustomerBooking;
  crmUser: CrmUserData;
  vehicles: any[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --c-bg:          #f4f7fa;
  --c-surface:     #ffffff;
  --c-surface-2:   #fcfdfe;
  --c-surface-3:   #eef1f6;
  --c-border:      #e9edf3;

  --c-text-1:      #0c1220;
  --c-text-2:      #4e5a7a;
  --c-text-3:      #92a1b9;

  --c-green:       #10b981;
  --c-green-light: rgba(16,185,129,0.06);
  
  --c-blue:        #3b82f6;
  --c-blue-light:  rgba(59,130,246,0.06);

  --c-teal:        #14b8a6;
  --c-violet:      #8b5cf6;
  --c-amber:       #f59e0b;
  --c-red:         #ef4444;

  --radius:        12px;
  --radius-sm:     8px;
  
  --shadow-sm:     0 2px 4px rgba(0,0,0,0.02);
  --shadow-md:     0 10px 15px -3px rgba(0,0,0,0.04), 0 4px 6px -2px rgba(0,0,0,0.01);
  --shadow-inner:  inset 0 1px 3px rgba(0,0,0,0.03);

  --font:          'Sora', sans-serif;
  --mono:          'JetBrains Mono', monospace;
}

.dark {
  --c-bg:          #0b101a;
  --c-surface:     #111726;
  --c-surface-2:   #161e2f;
  --c-surface-3:   #1f2a3f;
  --c-border:      #1d283e;

  --c-text-1:      #f1f5f9;
  --c-text-2:      #94a3b8;
  --c-text-3:      #4e5d7a;
  
  --c-green-light: rgba(16,185,129,0.08);
  --c-blue-light:  rgba(59,130,246,0.08);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.apd {
  font-family: var(--font);
  background: var(--c-bg);
  color: var(--c-text-1);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

.apd-layout {
  max-width: 1600px;
  margin: 0 auto;
  padding: 24px 16px 60px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

@media (min-width: 768px) {
  .apd-layout { padding: 30px 40px 80px; gap: 24px;}
}

.apd-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 24px;
  flex-wrap: wrap;
}

.apd-header-left { display: flex; align-items: center; gap: 16px; }

.apd-back {
  width: 38px; height: 38px;
  display: flex; align-items: center; justify-content: center;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 50%;
  color: var(--c-text-2);
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: var(--shadow-sm);
}
.apd-back:hover { border-color: var(--c-blue); color: var(--blue); transform: translateX(-2px); }

.apd-header-title-block { display: flex; flex-direction: column; }
.apd-eyebrow { font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--c-blue); margin-bottom: 3px; }
.apd-title { font-size: 26px; font-weight: 700; color: var(--c-text-1); letter-spacing: -0.02em; line-height: 1.2; }

.apd-btn-primary {
  display: inline-flex; align-items: center; gap: 8px;
  height: 40px; padding: 0 18px;
  background: var(--c-surface); border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  color: var(--c-text-1); font-family: var(--font); font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all 0.2s ease; white-space: nowrap;
  box-shadow: var(--shadow-sm); width: 100%; justify-content: center;
}
@media (min-width: 480px) {
  .apd-btn-primary { width: auto; }
}
.apd-btn-primary:hover { border-color: var(--c-text-1); box-shadow: var(--shadow-md); transform: translateY(-1px); }

.apd-toolbar {
  display: flex; align-items: stretch; gap: 16px;
  background: var(--c-surface); border-radius: var(--radius); padding: 18px; 
  box-shadow: var(--shadow-sm); flex-direction: column;
}
@media (min-width: 768px) {
  .apd-toolbar { flex-direction: row; align-items: flex-end; }
}

.apd-field { display: flex; flex-direction: column; gap: 7px; flex: 1; width: 100%; }
@media (min-width: 768px) {
  .apd-field { width: auto; }
}
.apd-label { font-size: 10.5px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: var(--c-text-3); }

.apd-ctrl {
  height: 38px; padding: 0 14px; background: var(--c-surface-3);
  border: 1px solid transparent; border-radius: var(--radius-sm);
  color: var(--c-text-1); font-family: var(--font); font-size: 13.5px;
  outline: none; transition: all 0.15s ease; width: 100%;
}
.apd-ctrl:focus { background: var(--c-surface); border-color: var(--c-blue); box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }

@media (min-width: 768px) {
  .apd-ctrl-date { width: 190px; }
  .apd-ctrl-select { width: 190px; }
}

.apd-search-wrapper { position: relative; width: 100%; }
.apd-search-icon { absolute; left: 13px; top: 50%; transform: translateY(-50%); size: 16px; text-muted-foreground; pointer-events: none; }
.apd-ctrl-search { padding-left: 40px; }

.apd-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
@media (min-width: 1200px) { .apd-stats { grid-template-columns: repeat(5, 1fr); } }

.apd-stat { 
  background: var(--c-surface); border-radius: var(--radius); padding: 20px; 
  box-shadow: var(--shadow-sm); display: flex; align-items: center; gap: 16px; 
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.apd-stat:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }

.apd-stat-icon-w { size: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: var(--c-bg); }

.apd-stat-info { display: flex; flex-direction: column; flex-grow: 1;}
.apd-stat-label { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--c-text-3); margin-bottom: 4px; }
.apd-stat-value { font-size: 28px; font-weight: 700; line-height: 1.1; color: var(--c-text-1); letter-spacing: -0.03em; }

.apd-table-section { display: flex; flex-direction: column; gap: 16px; }

.apd-table-header { 
  display: flex; align-items: center; justify-content: space-between; gap: 12px; 
  flex-wrap: wrap; padding: 0 4px;
}
.apd-table-header-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.apd-header-meta { display: flex; align-items: center; gap: 8px; }
.apd-header-date { font-size: 15px; font-weight: 600; color: var(--c-text-1); }
.apd-count-pill { background: var(--c-violet); color: #fff; border-radius: 20px; padding: 3px 10px; font-size: 11px; font-weight: 600; }

.apd-table-actions { display: flex; gap: 10px; flex-wrap: wrap; width: 100%; }
@media (min-width: 580px) { .apd-table-actions { width: auto; } }

.apd-btn-ghost {
  display: inline-flex; align-items: center; gap: 7px;
  height: 36px; padding: 0 16px;
  background: var(--c-surface); border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  color: var(--c-text-2); font-family: var(--font); font-size: 13px; font-weight: 500;
  cursor: pointer; transition: all 0.15s ease; white-space: nowrap; flex: 1; justify-content: center;
}
@media (min-width: 580px) { .apd-btn-ghost { flex: none; } }
.apd-btn-ghost:hover:not(:disabled) { background: var(--c-bg); border-color: var(--c-blue); color: var(--c-blue); }
.apd-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }

.apd-table-card { background: var(--c-surface); border-radius: var(--radius); box-shadow: var(--shadow-sm); overflow: hidden; }

.apd-tbl-scroll { overflow-x: auto; overflow-y: hidden; max-height: none; }

.apd-tbl { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 1100px; }

.apd-tbl thead { position: sticky; top: 0; z-index: 10; background: var(--c-surface); }
.apd-tbl thead th { 
  padding: 16px; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; 
  text-transform: uppercase; color: var(--c-text-3); text-align: left; 
  border-bottom: 1px solid var(--c-border);
  backdrop-filter: blur(8px); background: rgba(var(--c-surface-rgb), 0.9);
}

.apd-tbl tbody tr { transition: background 0.2s ease, transform 0.15s ease; cursor: pointer; }
.apd-tbl tbody tr:hover td { background: var(--c-surface-2); }
.apd-tbl tbody tr:not(:last-child) td { border-bottom: 1px solid var(--c-border); }

.apd-tbl td { padding: 18px 16px; vertical-align: middle; font-size: 14px; color: var(--c-text-2); background: transparent; }

.apd-customer-cell { display: flex; flex-direction: column; gap: 2px; }
.apd-cust-name { font-weight: 600; color: var(--c-text-1); }
.apd-cust-email { font-size: 12.5px; color: var(--c-text-3); }
.apd-phone { font-family: var(--mono); font-size: 13px; font-weight: 500; }
.apd-time { font-family: var(--font); font-size: 15px; font-weight: 600; color: var(--c-violet); }

.asd-vehicle-cell { display: flex; flex-direction: column; gap: 4px; max-width: 250px;}
.asd-v-badge { 
  display: inline-flex; align-items: center; gap: 5px; 
  background: var(--c-green-light); color: var(--c-green); 
  border-radius: 6px; padding: 3px 8px; font-size: 12px; font-weight: 500; truncate;
}
.asd-v-no { font-size: 12px; text-muted-foreground italic;}

.apd-crm-user { font-size: 12.5px; color: var(--c-text-3); }

.apd-view-btn-w { text-align: center; }
.apd-view-btn {
  display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 14px;
  background: var(--c-surface); border: 1px solid var(--c-border); border-radius: var(--radius-sm);
  color: var(--c-text-1); font-size: 11.5px; font-weight: 600; cursor: pointer; transition: all 0.15s ease;
}
.apd-view-btn:hover { border-color: var(--c-violet); color: var(--c-violet); background: rgba(139,92,246,0.06); }

.apd-tbl-foot {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 18px 20px; border-top: 1px solid var(--c-border);
  font-size: 12.5px; color: var(--c-text-3); background: var(--c-surface-2); flex-wrap: wrap;
}
.apd-tbl-count strong { color: var(--c-text-1); font-weight: 600; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
`;

export function AppointmentDashboard() {
  React.useEffect(() => {
    const id = "apd-clean-unique-styles";
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = STYLES;
    document.head.appendChild(el);
  }, []);

  const router = useRouter();
  const { getToken } = useAuth();

  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(new Date(Date.now() + 86400000), "yyyy-MM-dd");

  const [selectedDate, setSelectedDate] = React.useState(today);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  const [detailsModalOpen, setDetailsModalOpen] = React.useState(false);
  const [selectedAppointment, setSelectedAppointment] = React.useState<any>(null);

  const getHeaders = async () => {
    const token = await getToken();
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const { data: appointmentsData, isLoading, error, refetch } = useQuery({
    queryKey: ["appts-dash", selectedDate, statusFilter, typeFilter],
    queryFn: async () => {
      const h = await getHeaders();
      const params: Record<string, string> = { date: selectedDate };
      if (statusFilter !== "all") params.status = statusFilter;
      if (typeFilter !== "all") params.type = typeFilter;
      const r = await apiClient.get("/api/appointments/dashboard", { ...h, params });
      return r.data?.data ?? r.data;
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ["appts-dash-stats", selectedDate],
    queryFn: async () => {
      const h = await getHeaders();
      const r = await apiClient.get("/api/appointments/dashboard/stats", {
        ...h, params: { date: selectedDate },
      });
      return r.data?.data ?? r.data;
    },
  });

  const handleOpenDetailsModal = async (id: string) => {
    try {
      const h = await getHeaders();
      const response = await apiClient.get(`/api/appointments/${id}`, h);
      setSelectedAppointment(response.data?.data || response.data);
      setDetailsModalOpen(true);
    } catch (e) {
      console.error("Failed to fetch appointment details:", e);
    }
  };

  const filtered = React.useMemo(() => {
    if (!appointmentsData?.appointments) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return appointmentsData.appointments as DashboardAppointment[];
    return (appointmentsData.appointments as DashboardAppointment[]).filter(apt => {
      const name = `${apt.customerBooking.firstName} ${apt.customerBooking.lastName}`.toLowerCase();
      return (
        name.includes(q) ||
        apt.customerBooking.email?.toLowerCase().includes(q) ||
        apt.customerBooking.phone?.toLowerCase().includes(q)
      );
    });
  }, [appointmentsData?.appointments, searchQuery]);

  const handleExport = async () => {
    try {
      const h = await getHeaders();
      const r = await apiClient.get("/api/appointments/dashboard/export", {
        ...h, params: { date: selectedDate, format: "csv" }, responseType: "text",
      });
      const blob = new Blob([r.data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href: url, download: `appointments-${selectedDate}.csv` });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) { console.error("CSV Export failed:", e); }
  };

  return (
    <div className="apd">
      <div className="apd-layout">
        <div className="apd-header">
          <div className="apd-header-left">
            <button className="apd-back" onClick={() => router.back()} aria-label="Go back">
              <ArrowLeft size={16} strokeWidth={2.5} />
            </button>
            <div className="apd-header-title-block">
              <div className="apd-eyebrow">Operations Hub</div>
              <div className="apd-title">Daily Appointment Dashboard</div>
            </div>
          </div>
          <div className="apd-header-right">
            <button className="apd-btn-primary" onClick={() => router.push("/crm/appointments")}>
              <FileText size={16} className="text-blue-500" /> Full Appointments Schedule
            </button>
          </div>
        </div>

        {statsData && (
          <div className="apd-stats">
            <div className="apd-stat apd-stat-blue">
              <div className="apd-stat-icon-w text-blue-500" style={{background: 'rgba(59,130,246,0.06)'}}><Zap size={24} /></div>
              <div className="apd-stat-info">
                <div className="apd-stat-label">Total Volume</div>
                <div className="apd-stat-value">{statsData.total ?? 0}</div>
              </div>
            </div>
            <div className="apd-stat apd-stat-orange">
              <div className="apd-stat-icon-w text-amber-600" style={{background: 'rgba(245,158,11,0.06)'}}><CalendarDays size={24} /></div>
              <div className="apd-stat-info">
                <div className="apd-stat-label">Scheduled</div>
                <div className="apd-stat-value">{statsData.scheduled ?? 0}</div>
              </div>
            </div>
            <div className="apd-stat apd-stat-teal">
              <div className="apd-stat-icon-w text-teal-600" style={{background: 'rgba(20,184,166,0.06)'}}><UserCheck size={24} /></div>
              <div className="apd-stat-info">
                <div className="apd-stat-label">Confirmed</div>
                <div className="apd-stat-value">{statsData.confirmed ?? 0}</div>
              </div>
            </div>
            <div className="apd-stat apd-stat-green">
              <div className="apd-stat-icon-w text-green-600" style={{background: 'rgba(16,185,129,0.06)'}}><CheckCircle size={24} /></div>
              <div className="apd-stat-info">
                <div className="apd-stat-label">Completed</div>
                <div className="apd-stat-value">{statsData.completed ?? 0}</div>
              </div>
            </div>
            <div className="apd-stat apd-stat-red">
              <div className="apd-stat-icon-w text-red-600" style={{background: 'rgba(239,68,68,0.06)'}}><XCircle size={24} /></div>
              <div className="apd-stat-info">
                <div className="apd-stat-label">Cancelled</div>
                <div className="apd-stat-value">{statsData.cancelled ?? 0}</div>
              </div>
            </div>
          </div>
        )}

        <div className="apd-toolbar">
          <div className="apd-field">
            <span className="apd-label">Select Date</span>
            <input type="date" className="apd-ctrl apd-ctrl-date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
          </div>

          <div className="apd-field">
            <span className="apd-label">Status Filter</span>
            <select className="apd-ctrl apd-ctrl-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="apd-field md:flex-1">
            <span className="apd-label">Search Bookings</span>
            <div className="apd-search-wrapper relative">
              <Search className="apd-search-icon absolute size-5 text-muted-foreground pointer-events-none" style={{left: '12px', top: '50%', transform: 'translateY(-50%)'}} />
              <Input className="apd-ctrl apd-ctrl-search pl-11 text-xs h-9 w-full bg-[#f7f9fb] dark:bg-[#131927]" placeholder="Type name, email, or phone to filter..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </div>
        </div>

        {error && (
          <div className="text-red-600 bg-red-50 dark:bg-red-950/20 p-4 rounded-xl border border-red-200 text-sm flex items-center gap-2">
            <AlertCircle size={18} /> Error syncing operational dashboard data. Please try again.
          </div>
        )}

        <div className="apd-table-section">
          <div className="apd-table-header">
            <div className="apd-table-header-left">
              <div className="apd-header-meta">
                <CalendarDays className="h-5 w-5 text-violet-600" />
                <span className="apd-header-date">{selectedDate}</span>
              </div>
              <span className="apd-count-pill">{filtered.length} Bookings</span>
            </div>
            <div className="apd-table-actions">
              <button className="apd-btn-ghost" onClick={handleExport} disabled={isLoading || !filtered.length}>
                <Download size={14} /> Export CSV
              </button>
              <button className="apd-btn-ghost" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCw size={14} className={isLoading ? "spin" : ""} /> Sync Data
              </button>
            </div>
          </div>

          <div className="apd-table-card">
            <div className="apd-tbl-scroll">
              <table className="apd-tbl">
                <thead>
                  <tr>
                    <th style={{ width: "22%" }}>Customer</th>
                    <th style={{ width: "13%" }}>Phone</th>
                    <th style={{ width: "10%" }}>Time</th>
                    <th style={{ width: "16%" }}>Meeting Type</th>
                    <th style={{ width: "20%" }}>Linked Vehicles</th>
                    <th style={{ width: "12%" }}>Booked By</th>
                    <th style={{ width: "9%" }}>Status</th>
                    <th style={{ width: "8%" }} className="text-center">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={8} className="p-16 text-center text-muted-foreground"><Loader2 className="animate-spin mx-auto h-8 w-8" /></td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={8} className="p-16 text-center text-muted-foreground">No operations recorded matching current criteria layout.</td></tr>
                  ) : (
                    filtered.map((apt: any) => {
                      const finalMeetingTypeDisplayName = apt.type === 'other' && apt.customTypeDetails
                        ? apt.customTypeDetails
                        : apt.type;

                      return (
                        <tr key={apt._id} onClick={() => handleOpenDetailsModal(apt._id)}>
                          <td>
                            <div className="apd-customer-cell">
                              <div className="apd-cust-name">{apt.customerBooking.firstName} {apt.customerBooking.lastName}</div>
                              <div className="apd-cust-email">{apt.customerBooking.email}</div>
                            </div>
                          </td>
                          <td><span className="apd-phone">{apt.customerBooking.phone}</span></td>
                          <td><div className="flex items-center gap-2 apd-time"><Clock size={15}/> {format(new Date(apt.startTime), "HH:mm")}</div></td>
                          <td className="capitalize font-medium text-xs"><Badge variant="outline" className="rounded-md border-violet-200 text-violet-700 bg-violet-50/20">{finalMeetingTypeDisplayName.replace('-', ' ')}</Badge></td>
                          <td>
                            <div className="asd-vehicle-cell">
                              {apt.vehicles && apt.vehicles.length > 0 ? apt.vehicles.map((v: any, i: number) => (
                                <span key={v._id || i} className="asd-v-badge">
                                  <Car className="h-3.5 w-3.5" />
                                  <span>{v.year} {v.make} {v.model}</span>
                                </span>
                              )) : <span className="asd-v-no italic">None</span>}
                            </div>
                          </td>
                          <td><div className="flex items-center gap-2 apd-crm-user"><Users size={14}/> {apt.crmUser?.fullName || "—"}</div></td>
                          <td>
                            <span className={cn("px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest border",
                              apt.status === 'confirmed' ? 'bg-green-50/30 border-green-200 text-green-700' : 
                              apt.status === 'completed' ? 'bg-teal-50/30 border-teal-200 text-teal-700' :
                              apt.status === 'cancelled' ? 'bg-red-50/30 border-red-200 text-red-700' :
                              'bg-blue-50/30 border-blue-200 text-blue-700')}>
                              {apt.status}
                            </span>
                          </td>
                          <td className="apd-view-btn-w" onClick={(e) => e.stopPropagation()}>
                            <button className="apd-view-btn" onClick={() => handleOpenDetailsModal(apt._id)}>
                              <Eye size={14} /> Open
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {!isLoading && filtered.length > 0 && (
              <div className="apd-tbl-foot">
                <div className="apd-tbl-count">
                  Displaying <strong>{filtered.length}</strong> of{" "}
                  <strong>{appointmentsData?.count ?? 0}</strong> operational entries
                </div>
                <div className="apd-tbl-date font-mono">{selectedDate}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AppointmentDetailsModal open={detailsModalOpen} onOpenChange={setDetailsModalOpen} appointment={selectedAppointment} />
    </div>
  );
}

export default AppointmentDashboard;
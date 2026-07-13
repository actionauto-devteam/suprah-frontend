"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { apiClient } from "@/lib/api-client";
import {
  FileText,
  Archive,
  MapPin,
  CreditCard,
  Truck,
  CheckSquare,
  Loader2,
  AlertCircle,
  Calendar,
  Database,
  Users,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/format";
import { Payment } from "@/types/billing";
import { DriverPayout } from "@/types/driver-payout";
import { ReportCard } from "@/components/reports/ReportCard";
import { EmptyState } from "@/components/reports/EmptyState";
import { ReportPreviewModal } from "@/components/reports/ReportPreviewModal";
import { ReportsAnalytics } from "@/components/reports/ReportsAnalytics";
import { Quote as TransportQuote } from "@/types/transportation";
import { Load } from "@/types/load";
import { TransportationAnalytics } from "@/components/reports/transportation/TransportationAnalytics";
import {
  TransportationPreviewModal,
  generateLoadReportPdf,
  generateQuoteReportPdf,
} from "@/components/reports/transportation/TransportationPreviewModal";
import {
  buildLoadSummary,
  buildQuoteSummary,
  fmtCurrency as transportFmtCurrency,
  fmtNumber,
} from "@/lib/transportation-reports";
import {
  saveGeneratedReportFile,
  type ReportFileCategory,
} from "@/lib/report-files";
import {
  loadLogoBase64,
  generateDocId,
  formatGeneratedAt,
  embedFonts,
  drawReportPageHeader,
  drawContinuedLabel,
  drawSectionTitle,
  drawEmptyState,
  drawSummaryCards,
  applyFootersToAllPages,
  TABLE_BODY_STYLES,
  TABLE_HEAD_STYLES_PRIMARY,
  TABLE_HEAD_STYLES_SECONDARY,
  TABLE_ALTERNATE_ROW,
  TABLE_BODY_ROW,
} from "@/utils/reportPdfTemplate";


type TabValue = "ALL" | "Transportation" | "Driver Reports" | "Billings";

interface ReportData {
  loads: Load[]
  payments: Payment[]
  payouts: DriverPayout[]
}


const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const CATEGORIES: { id: TabValue; label: string; icon: any }[] = [
  { id: "ALL", label: "All Reports", icon: Archive },
  { id: "Transportation", label: "Transportation", icon: Truck },
  { id: "Driver Reports", label: "Driver Reports", icon: MapPin },
  { id: "Billings", label: "Billings & Finance", icon: CreditCard },
];

export default function ReportsPage() {
  const { getToken } = useAuth();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = React.useState<TabValue>("ALL");
  const [selectedMonth, setSelectedMonth] = React.useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const [reportData, setReportData] = React.useState<ReportData | null>(null);
  const [rawLoads, setRawLoads] = React.useState<Load[]>([]);
  const [rawQuotes, setRawQuotes] = React.useState<TransportQuote[]>([]);
  const [rawPayments, setRawPayments] = React.useState<Payment[]>([]);

  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [downloading, setDownloading] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");

  const [previewType, setPreviewType] = React.useState<string | null>(null);
  const [transportPreview, setTransportPreview] = React.useState<
    "load" | "quote" | null
  >(null);


  const fetchData = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      const token = await getToken();
      const monthStr = String(selectedMonth + 1).padStart(2, "0");
      const yearMonth = `${selectedYear}-${monthStr}`;

      const [lRes, qRes, pRes, payRes] = await Promise.all([
        apiClient.get(`/api/loads?date=${yearMonth}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiClient.get(`/api/transportation/quotes?date=${yearMonth}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiClient.get(`/api/payments?date=${yearMonth}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiClient.get(`/api/driver-payouts?date=${yearMonth}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setReportData({
        loads: lRes.data?.data || [],
        payments: pRes.data?.data || [],
        payouts: payRes.data?.data || [],
      });

      // Also get ALL (unfiltered by month) for some analytics components if needed,
      // but for this specific reports page, we usually want the current month context.
      // Re-fetching without the month param for the "raw" state used in trends:
      const [sRes, qRawRes, pRawRes] = await Promise.all([
        apiClient.get(`/api/loads`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiClient.get(`/api/transportation/quotes`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiClient.get(`/api/payments`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const loadData = Array.isArray(sRes.data?.data) ? sRes.data.data : [];
      setRawLoads(loadData);
      setRawQuotes(qRawRes.data?.data || []);
      setRawPayments(pRawRes.data?.data || []);
    } catch (error) {
      console.error("Report fetch error:", error);
      toast.error("Failed to load report data");
    } finally {
      setIsRefreshing(false);
    }
  }, [getToken, selectedMonth, selectedYear]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Filter Logic ───────────────────────────────────────────────────────────

  const monthLabel = `${MONTHS[selectedMonth]} ${selectedYear}`;

  const filteredLoads = React.useMemo(() => {
    if (!reportData?.loads) return [];
    return reportData.loads.filter((l) => {
      const q = searchQuery.toLowerCase();
      return (
        l.loadNumber?.toLowerCase().includes(q) ||
        l.pickupLocation?.city?.toLowerCase().includes(q) ||
        l.deliveryLocation?.city?.toLowerCase().includes(q)
      );
    });
  }, [reportData?.loads, searchQuery]);

  const filteredQuotes = React.useMemo(() => {
    if (!rawQuotes) return [];
    // Filter quotes by the selected year/month based on createdAt
    const monthStr = String(selectedMonth + 1).padStart(2, "0");
    const yearMonth = `${selectedYear}-${monthStr}`;
    return rawQuotes.filter((q) => {
      const matchesDate = q.createdAt?.startsWith(yearMonth);
      if (!matchesDate) return false;
      const query = searchQuery.toLowerCase();
      return (
        q.firstName?.toLowerCase().includes(query) ||
        q.lastName?.toLowerCase().includes(query) ||
        q.fromAddress?.toLowerCase().includes(query) ||
        q.toAddress?.toLowerCase().includes(query)
      );
    });
  }, [rawQuotes, selectedMonth, selectedYear, searchQuery]);

  const loadSummary = React.useMemo(() => {
    return buildLoadSummary(filteredLoads);
  }, [filteredLoads]);

  const quoteSummary = React.useMemo(() => {
    return buildQuoteSummary(filteredQuotes);
  }, [filteredQuotes]);

  const revenueTotal = React.useMemo(() => {
    if (!reportData?.payments) return 0;
    return reportData.payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  }, [reportData?.payments]);

  const payoutTotal = React.useMemo(() => {
    if (!reportData?.payouts) return 0;
    return reportData.payouts.reduce((acc, p) => acc + (p.amount || 0), 0);
  }, [reportData?.payouts]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    const allIds =
      activeTab === "ALL"
        ? ["driver-report", "billing-report", "load-report", "quote-report"]
        : activeTab === "Transportation"
          ? ["load-report", "quote-report"]
          : activeTab === "Driver Reports"
            ? ["driver-report"]
            : ["billing-report"];

    if (selected.size === allIds.length) setSelected(new Set());
    else setSelected(new Set(allIds));
  };

  const downloadReport = async (id: string) => {
    setDownloading(id);
    try {
      let blob: Blob | null = null;
      let filename = `Report_${id}_${monthLabel.replace(" ", "_")}.pdf`;
      let category: ReportFileCategory = "transportation";

      if (id === "load-report") {
        blob = await generateLoadReportPdf(filteredLoads, monthLabel);
        category = "transportation";
      } else if (id === "quote-report") {
        blob = await generateQuoteReportPdf(filteredQuotes, monthLabel);
        category = "transportation";
      } else {
        // Mocking others for now
        await new Promise((r) => setTimeout(r, 1000));
        toast.info(`${id} generation coming soon`);
      }

      if (blob) {
        // Save to internal db
        await saveGeneratedReportFile({
          name: filename,
          category,
          blob,
        });
        // Trigger browser download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`${id} downloaded and saved`);
      }
    } catch (err) {
      console.error(err);
      toast.error(`Failed to generate ${id}`);
    } finally {
      setDownloading(null);
    }
  };

  const bulkDownload = async () => {
    const picks = Array.from(selected);
    if (picks.length === 0) return;

    toast.promise(
      (async () => {
        for (const id of picks) {
          await downloadReport(id);
        }
      })(),
      {
        loading: `Generating ${picks.length} reports...`,
        success: "All reports generated successfully",
        error: "Some reports failed to generate",
      },
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header Area ── */}
      <div className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Archive className="size-6 text-primary" />
                Reports & Analytics
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Manage, preview and export your organization's operational data.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-xl border border-border">
              <Calendar className="size-4 text-muted-foreground ml-2" />
              <Select
                value={String(selectedMonth)}
                onValueChange={(value) => setSelectedMonth(Number(value))}
              >
                <SelectTrigger
                  size="sm"
                  className="h-8 w-28 border-0 bg-transparent px-2 font-semibold shadow-none focus:ring-0 focus-visible:ring-0"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  align="start"
                  className="border-border bg-popover text-popover-foreground shadow-xl"
                >
                  {MONTHS.map((month, index) => (
                    <SelectItem key={month} value={String(index)}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="w-px h-4 bg-border mx-1" />
              <Select
                value={String(selectedYear)}
                onValueChange={(value) => setSelectedYear(Number(value))}
              >
                <SelectTrigger
                  size="sm"
                  className="h-8 w-22 border-0 bg-transparent px-2 font-semibold shadow-none focus:ring-0 focus-visible:ring-0"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  align="end"
                  className="min-w-22 border-border bg-popover text-popover-foreground shadow-xl"
                >
                  {[2024, 2025, 2026].map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">
        {/* ── Stats Strip ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatBox
            label="Total Loads"
            value={reportData?.loads.length || 0}
            sub="Current period"
            icon={Truck}
            color="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40"
          />
          <StatBox
            label="Delivered"
            value={
              reportData?.loads.filter((s) => s.status === "Delivered").length ||
              0
            }
            sub="Successful cycles"
            icon={CheckSquare}
            color="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
          />
          <StatBox
            label="Revenue"
            value={formatCurrency(
              reportData?.payments.reduce((s, p) => s + p.amount, 0) || 0,
            )}
            sub="Gross succeeding"
            icon={CreditCard}
            color="text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40"
          />
          <StatBox
            label="Driver Payouts"
            value={formatCurrency(
              reportData?.payouts.reduce((s, p) => s + p.amount, 0) || 0,
            )}
            sub="Completed settlements"
            icon={Users}
            color="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40"
          />
        </div>

        {/* ── Main Workspace ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left: Navigation & Filters */}
          <aside className="lg:col-span-3 space-y-4">
            <div className="bg-card rounded-2xl border border-border p-2 shadow-sm">
              <nav className="space-y-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveTab(cat.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      activeTab === cat.id
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <cat.icon
                      className={`size-4.5 ${activeTab === cat.id ? "text-primary-foreground" : "text-muted-foreground"}`}
                    />
                    {cat.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="bg-muted/30 rounded-2xl p-5 border border-border/50">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
                Global Filters
              </h3>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search entities..."
                    className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 rounded-xl h-11 border-dashed"
                  onClick={() => setSearchQuery("")}
                >
                  <Database className="size-4" /> Reset Filters
                </Button>
              </div>
            </div>
          </aside>

          {/* Right: Content Area */}
          <main className="lg:col-span-9 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {activeTab === "ALL" ? "Available Reports" : activeTab}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Showing results for {monthLabel}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selected.size > 0 && (
                  <Button
                    size="sm"
                    className="rounded-lg gap-2 h-9 shadow-md"
                    onClick={bulkDownload}
                  >
                    <CheckSquare className="size-4" />
                    Export Selected ({selected.size})
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-lg h-9"
                  onClick={toggleAll}
                >
                  {selected.size > 0 ? "Deselect All" : "Select All"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(activeTab === "ALL" || activeTab === "Transportation") && (
                <>
                  <ReportCard
                    title="Unified Load Report"
                    subtitle="Logistics & Delivery"
                    description="Full delivery cycles, carrier payouts, and logistics efficiency tracking."
                    category="Logistics"
                    categoryClass="text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40"
                    stats={[
                      { icon: <Truck className="size-3" />, label: `${filteredLoads.length} active` },
                      { icon: <Database className="size-3" />, label: "System Sync" }
                    ]}
                    highlights={[
                      { label: "Success Rate", value: `${loadSummary.onTimeRate}%`, color: "text-emerald-600 dark:text-emerald-400" },
                      { label: "Total Revenue", value: transportFmtCurrency(loadSummary.totalRate), color: "text-foreground" }
                    ]}
                    isSelected={selected.has("load-report")}
                    isDownloading={downloading === "load-report"}
                    onToggle={() => toggleSelect("load-report")}
                    onDownload={() => downloadReport("load-report")}
                    onPreview={() => setTransportPreview("load")}
                  />
                  <ReportCard
                    title="Quotes & Drafts"
                    subtitle="Sales & Conversion"
                    description="Market quote history, conversion rates and pending logistics drafts."
                    category="Transportation"
                    categoryClass="text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/40"
                    stats={[
                      { icon: <FileText className="size-3" />, label: `${filteredQuotes.length} quotes` },
                      { icon: <Users className="size-3" />, label: "Client Direct" }
                    ]}
                    highlights={[
                      { label: "Conv. Rate", value: `${quoteSummary.conversionRate}%`, color: "text-amber-600 dark:text-amber-400" },
                      { label: "Avg Rate", value: transportFmtCurrency(quoteSummary.avgRate), color: "text-foreground" }
                    ]}
                    isSelected={selected.has("quote-report")}
                    isDownloading={downloading === "quote-report"}
                    onToggle={() => toggleSelect("quote-report")}
                    onDownload={() => downloadReport("quote-report")}
                    onPreview={() => setTransportPreview("quote")}
                  />
                </>
              )}

              {(activeTab === "ALL" || activeTab === "Driver Reports") && (
                <ReportCard
                  title="Driver Performance"
                  subtitle="Fleet Analytics"
                  description="Individual driver metrics, completion rates and settlement logs."
                  category="Operations"
                  categoryClass="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-950/40"
                  stats={[
                    { icon: <Truck className="size-3" />, label: "Fleet Wide" },
                    { icon: <CheckSquare className="size-3" />, label: "Compliance" }
                  ]}
                  highlights={[
                    { label: "Avg Score", value: "98.2", color: "text-blue-600 dark:text-blue-400" },
                    { label: "Payouts", value: formatCurrency(payoutTotal), color: "text-foreground" }
                  ]}
                  isSelected={selected.has("driver-report")}
                  isDownloading={downloading === "driver-report"}
                  onToggle={() => toggleSelect("driver-report")}
                  onDownload={() => downloadReport("driver-report")}
                  onPreview={() => setPreviewType("DRIVER")}
                />
              )}

              {(activeTab === "ALL" || activeTab === "Billings") && (
                <ReportCard
                  title="Billings & Revenue"
                  subtitle="Financial Audit"
                  description="Complete financial audit of succeeding payments and gross revenue."
                  category="Finance"
                  categoryClass="text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-950/40"
                  stats={[
                    { icon: <CreditCard className="size-3" />, label: "Bank Sync" },
                    { icon: <Search className="size-3" />, label: "Audit Ready" }
                  ]}
                  highlights={[
                    { label: "Gross", value: formatCurrency(revenueTotal), color: "text-violet-600 dark:text-violet-400" },
                    { label: "Vol.", value: rawPayments.length, color: "text-foreground" }
                  ]}
                  isSelected={selected.has("billing-report")}
                  isDownloading={downloading === "billing-report"}
                  onToggle={() => toggleSelect("billing-report")}
                  onDownload={() => downloadReport("billing-report")}
                  onPreview={() => setPreviewType("BILLING")}
                />
              )}
            </div>

            {/* Sub-Analytics for Transportation */}
            {(activeTab === "ALL" || activeTab === "Transportation") && (
              <div>
                <TransportationAnalytics
                  loads={filteredLoads}
                  quotes={filteredQuotes}
                  rawLoads={rawLoads}
                  rawQuotes={rawQuotes}
                  monthLabel={monthLabel}
                />
              </div>
            )}

            {/* Common Analytics Overview */}
            <div>
              <ReportsAnalytics
                loads={rawLoads}
                rawPayments={rawPayments}
                monthLabel={monthLabel}
              />
            </div>
          </main>
        </div>
      </div>

      {/* ── Modals & Previews ── */}
      <TransportationPreviewModal
        open={!!transportPreview}
        onClose={() => setTransportPreview(null)}
        reportType={transportPreview || "load"}
        loads={filteredLoads}
        quotes={filteredQuotes}
        monthLabel={monthLabel}
        isDownloading={downloading === "load-report" || downloading === "quote-report"}
        onDownload={() =>
          downloadReport(
            transportPreview === "load" ? "load-report" : "quote-report",
          )
        }
      />

      <ReportPreviewModal
        open={!!previewType}
        onClose={() => setPreviewType(null)}
        reportType={previewType?.toLowerCase() as "driver" | "billing"}
        loads={reportData?.loads || []}
        payments={reportData?.payments || []}
        payouts={reportData?.payouts || []}
        monthLabel={monthLabel}
        isDownloading={downloading === previewType?.toLowerCase()}
        onDownload={() => {
          if (previewType === "DRIVER") downloadReport("driver-report");
          else if (previewType === "BILLING") downloadReport("billing-report");
        }}
      />
    </div>
  );
}

function StatBox({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: any;
  color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div
          className={`size-10 rounded-xl flex items-center justify-center ${color}`}
        >
          <Icon className="size-5" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight text-foreground">
          {value}
        </p>
        <p className="text-xs font-semibold text-foreground/80 mt-0.5">
          {label}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-medium">
          {sub}
        </p>
      </div>
    </div>
  );
}

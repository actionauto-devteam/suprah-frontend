"use client";

import * as React from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DriverHeroGlow } from '@/components/driver/DriverHeroGlow';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Truck,
  Package,
  Search,
  CheckCircle2,
  Clock,
  Loader2,
  ArrowRight,
  Camera,
  AlertCircle,
  ImageIcon,
  DollarSign,
  Timer,
  XCircle,
  Phone,
  Mail,
  FileText,
  User2,
  ChevronDown,
  ChevronUp,
  Ban,
  RefreshCw,
  CircleDot,
  Navigation2,
  AlertTriangle,
  ArrowLeft,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { initializeSocket, getSocket } from "@/lib/socket.client";
import { cn, resolveImageUrl } from "@/lib/utils";
import Link from "next/link";
import { Load, LoadStatus } from '@/types/load';
import { ConfirmationModal, ConfirmationVariant } from '@/components/ui/confirmation-modal';
import { DriverContractModal, DriverSignedContract } from '@/components/create-load/DriverContractModal';
import { useDriverWorkEligibility } from '@/hooks/useDriverWorkEligibility';

// Real driver-tracking endpoint — accept/pickup/start-route/drop all live
// under /loads/:id/*, not the flat /api/driver-tracking/{action} shape this
// page used to call (that 404'd silently).
const ACTION_ENDPOINTS: Record<string, string> = {
  'accept-load': 'accept',
  'mark-picked-up': 'pickup',
  'start-route': 'start-route',
  'drop-load': 'drop',
};

const STATUS_THEME: Record<LoadStatus, string> = {
  Draft: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20',
  Posted: 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/20',
  Assigned: 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/20',
  Accepted: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20',
  'Picked Up': 'bg-orange-500/10 text-orange-600 dark:text-orange-300 border-orange-500/20',
  'In-Transit': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20',
  Delivered: 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20',
  Cancelled: 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/20',
};

const STEPS = [
  { key: 'assigned', label: 'Assigned' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'picked-up', label: 'Picked Up' },
  { key: 'in-transit', label: 'In Transit' },
  { key: 'delivered', label: 'Delivered' },
] as const;

const getStepIdx = (load: Load) => {
  const status = load.status;
  if (status === 'Delivered') return 4;
  if (status === 'In-Transit') return 3;
  if (status === 'Picked Up') return 2;
  if (status === 'Accepted' || load.driverAcceptedAt) return 1;
  return 0;
};

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Denver' }) : '';
const extractErr = (e: any, fb: string) => e?.response?.data?.message || e?.message || fb;

type Tab = "active" | "requests" | "completed" | "all";

const getTabFromSearch = (search: string): Tab => {
  const requestedTab = new URLSearchParams(search).get("tab");
  return requestedTab === "requests" ||
    requestedTab === "completed" ||
    requestedTab === "all" ||
    requestedTab === "active"
    ? requestedTab
    : "active";
};

export default function DriverLoadsPage() {
  const { getToken } = useAuth();
  const workEligibility = useDriverWorkEligibility();
  const [loads, setLoads] = React.useState<Load[]>([]);
  const [requests, setRequests] = React.useState<Load[]>([]);
  const [pagination, setPagination] = React.useState<{ hasMore: boolean; page: number; totalPages: number } | null>(null);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [tab, setTab] = React.useState<Tab>('active');
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const syncTabFromUrl = () => {
      setTab(getTabFromSearch(window.location.search));
    };

    syncTabFromUrl();
    window.addEventListener("popstate", syncTabFromUrl);

    return () => {
      window.removeEventListener("popstate", syncTabFromUrl);
    };
  }, []);

  const handleTabChange = React.useCallback((nextTab: Tab) => {
    setTab(nextTab);

    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    if (nextTab === "active") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", nextTab);
    }

    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, []);

  // Action States
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [contractState, setContractState] = React.useState<{ action: string; loadId: string } | null>(null);
  const [confirmState, setConfirmState] = React.useState<{
    isOpen: boolean;
    action: string;
    loadId: string;
    title: string;
    description: string;
    variant: ConfirmationVariant;
  }>({
    isOpen: false,
    action: '',
    loadId: '',
    title: '',
    description: '',
    variant: 'primary',
  });

  // Dialog Targets
  const [proofTarget, setProofTarget] = React.useState<Load | null>(null);

  const [refreshing, setRefreshing] = React.useState(false);
  const [maxLoadCapacity, setMaxLoadCapacity] = React.useState(12);

  const fetchLoads = React.useCallback(async (pageNum = 1, append = false) => {
    try {
      const token = await getToken();
      const [loadsRes, reqRes] = await Promise.all([
        apiClient.get(`/api/driver-tracking/my-loads?page=${pageNum}`, { headers: { Authorization: `Bearer ${token}` } }),
        apiClient.get('/api/driver-tracking/my-requests', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const loadsData = loadsRes.data?.data;
      const newLoads = loadsData?.loads || loadsData || [];
      const newPagination = loadsData?.pagination || null;
      const newCapacity = loadsData?.maxLoadCapacity || 12;

      if (append) {
        setLoads(prev => [...prev, ...newLoads]);
      } else {
        setLoads(newLoads);
      }
      setPagination(newPagination);
      setMaxLoadCapacity(newCapacity);
      if (!append) setPage(1);
      else setPage(pageNum);

      setRequests(reqRes.data?.data || []);
    } catch (err: any) {
      toast.error(extractErr(err, 'Failed to fetch loads'));
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [getToken]);

  React.useEffect(() => {
    fetchLoads();
    const poll = setInterval(fetchLoads, 30000);
    return () => clearInterval(poll);
  }, [fetchLoads]);

  React.useEffect(() => {
    let mounted = true;
    const setup = async () => {
      const token = await getToken();
      if (!token || !mounted) return;
      const sock = initializeSocket(token);
      const refresh = () => {
        if (mounted) fetchLoads();
      };
      sock.on("driver:loads_updated", refresh);
      sock.on("driver:load_request_updated", refresh);
      sock.on("driver:load_requested", refresh);
    };
    setup();
    return () => {
      mounted = false;
      const s = getSocket();
      if (s) {
        s.off("driver:loads_updated");
        s.off("driver:load_request_updated");
        s.off("driver:load_requested");
      }
    };
  }, [getToken, fetchLoads]);

  const handleRefresh = () => { setRefreshing(true); fetchLoads(1, false); };

  const handleLoadMore = async () => {
    if (!pagination || !pagination.hasMore || loadingMore) return;
    setLoadingMore(true);
    await fetchLoads(page + 1, true);
  };

  const executeAction = async (action: string, id: string, signature?: DriverSignedContract) => {
    if (!id) {
      toast.error(`Cannot ${action}: Load ID is missing`);
      return;
    }
    setActionLoading(id);
    try {
      const token = await getToken();
      const endpoint = ACTION_ENDPOINTS[action] ?? action;
      await apiClient.post(`/api/driver-tracking/loads/${id}/${endpoint}`, signature ?? {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(
        action === 'accept-load' ? 'Load accepted' :
          action === 'start-route' ? 'Route started' :
            action === 'drop-load' ? 'Load dropped' :
              action === 'mark-picked-up' ? 'Load picked up' :
                'Done'
      );
      await fetchLoads();
      setConfirmState(prev => ({ ...prev, isOpen: false }));
      setContractState(null);
    } catch (err: any) {
      toast.error(extractErr(err, `Failed to ${action}`));
    } finally {
      setActionLoading(null);
    }
  };

  const handleAction = (action: string, loadOrId: Load | string) => {
    if (action === 'accept-load' && !workEligibility.canTakeNewWork) {
      toast.error(workEligibility.blockReason || 'You are not eligible to accept a new load right now.');
      return;
    }
    let title = '';
    let description = '';
    let variant: ConfirmationVariant = 'primary';

    // Safety check: loadOrId might be a string (the ID) or the full Load object
    const actualLoadId = typeof loadOrId === 'string' ? loadOrId : loadOrId._id;

    if (action === 'accept-load') {
      setContractState({ action, loadId: actualLoadId });
      return;
    }

    switch (action) {
      case 'mark-picked-up':
        title = 'Confirm Pickup?';
        description = 'Are you sure you have picked up all vehicles for this load? The current time will be recorded as the pickup time.';
        variant = 'success';
        break;
      case 'start-route':
        title = 'Start Route?';
        description = 'Are you ready to begin the delivery route? This will notify the organization that you are in transit.';
        variant = 'success';
        break;
      case 'drop-load':
        title = 'Drop This Load?';
        description = 'Warning: You are about to drop this load. This action should only be taken if you cannot complete the delivery.';
        variant = 'danger';
        break;
      default:
        executeAction(action, actualLoadId);
        return;
    }

    setConfirmState({
      isOpen: true,
      action,
      loadId: actualLoadId,
      title,
      description,
      variant,
    });
  };

  const pending = requests.filter((r) => r.myRequestStatus === "pending");
  const rejected = requests.filter((r) => r.myRequestStatus === "rejected");
  const activeCount = loads.filter(
    (l) => l.status !== "Delivered" && l.status !== "Cancelled",
  ).length;
  const completedCount = loads.filter((l) => l.status === "Delivered").length;

  const filtered = React.useMemo(() => {
    let result: Load[] = [];
    if (tab === 'active') result = loads.filter(l => l.status !== 'Delivered' && l.status !== 'Cancelled');
    else if (tab === 'requests') result = [...pending, ...rejected];
    else if (tab === 'completed') result = loads.filter(l => l.status === 'Delivered');
    else result = loads;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.loadNumber?.toLowerCase().includes(q) ||
          l.pickupLocation?.city?.toLowerCase().includes(q) ||
          l.deliveryLocation?.city?.toLowerCase().includes(q) ||
          l.vehicles?.[0]?.make?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [loads, requests, tab, search, pending, rejected]);

  const tabItems: {
    key: Tab;
    label: string;
    count?: number;
    icon: React.ElementType;
  }[] = [
      {
        key: "active",
        label: `Active (${activeCount}/${maxLoadCapacity})`,
        count: undefined,
        icon: Navigation2,
      },
      {
        key: "requests",
        label: "Requests",
        count: pending.length || undefined,
        icon: Timer,
      },
      {
        key: "completed",
        label: "Completed",
        count: completedCount || undefined,
        icon: CheckCircle2,
      },
      {
        key: "all",
        label: "All",
        count: loads.length || undefined,
        icon: Package,
      },
    ];

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-5"
      >
        <div className="relative overflow-hidden rounded-3xl border border-slate-300/80 dark:border-white/15 shadow-lg dark:shadow-2xl ring-1 ring-slate-200/50 dark:ring-white/[0.03]">
          <div className="absolute inset-0 bg-linear-to-br from-white via-slate-50 to-emerald-50/70 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
          <DriverHeroGlow />
          <div className="relative p-5 sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Link
                  href="/driver"
                  className="p-2.5 rounded-xl bg-background/80 dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 transition-colors border border-border/80 dark:border-white/15 shadow-sm"
                >
                  <ArrowLeft className="size-4.5 text-foreground/80 dark:text-white/80" />
                </Link>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                    My Loads
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {loading ? (
                      "Loading..."
                    ) : (
                      <>
                        {activeCount}/{maxLoadCapacity} active
                        {completedCount > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            {" "}
                            · {completedCount} completed
                          </span>
                        )}
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/20">
                  <Zap className="size-3 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Live
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="h-11 gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-white/10 border border-border/80 dark:border-white/15 bg-background/60 dark:bg-transparent"
                >
                  <RefreshCw
                    className={cn("size-3.5", refreshing && "animate-spin")}
                  />{" "}
                  Refresh
                </Button>
              </div>
            </div>

            <div className="flex gap-1 mt-5 overflow-x-auto scrollbar-hide bg-background/70 dark:bg-white/5 rounded-xl p-1 border border-border/80 dark:border-white/15 shadow-sm">
              {tabItems.map((t) => (
                <button
                  key={t.key}
                  onClick={() => handleTabChange(t.key)}
                  className={cn(
                    "relative shrink-0 px-3 h-11 text-xs rounded-lg transition-all flex items-center gap-1.5",
                    tab === t.key
                      ? "bg-card font-bold text-foreground shadow-sm border border-border/70 dark:bg-white/10 dark:text-white dark:border-white/15"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50 dark:hover:text-white/80",
                  )}
                >
                  <t.icon className="size-3" />
                  {t.label}
                  {t.count && t.count > 0 && (
                    <span
                      className={cn(
                        "inline-flex items-center justify-center min-w-4.5 h-4.5 text-[9px] font-bold rounded-full px-1",
                        t.key === "requests"
                          ? "bg-amber-500 text-white"
                          : "bg-muted text-muted-foreground dark:bg-white/15 dark:text-white/70",
                      )}
                    >
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {!workEligibility.canTakeNewWork && !workEligibility.isLoading && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">{workEligibility.blockReason}</p>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by load #, city, vehicle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-background border-border/80 shadow-sm focus-visible:border-primary/60"
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative">
              <div className="size-16 rounded-full border-4 border-emerald-500/20 animate-pulse" />
              <Loader2 className="size-8 animate-spin text-emerald-500 absolute inset-0 m-auto" />
            </div>
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">
              Loading Your Loads
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-border/60 rounded-2xl">
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="size-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
                <Package className="size-8 text-muted-foreground/30" />
              </div>
              <p className="text-sm font-bold">
                {tab === "active"
                  ? "No active loads"
                  : tab === "requests"
                    ? "No load requests"
                    : tab === "completed"
                      ? "No completed loads yet"
                      : "No loads found"}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {tab === "active"
                  ? "Check available loads to request new assignments."
                  : tab === "requests"
                    ? "Request loads from the Available Loads board."
                    : search
                      ? "Try adjusting your search."
                      : "Loads will appear here as they are assigned."}
              </p>
              {(tab === "active" || tab === "requests") && (
                <Button asChild className="mt-4 gap-2 rounded-xl">
                  <Link href="/driver/available-loads">
                    <Truck className="size-4" /> Browse Available Loads
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {filtered.map((load, i) => (
                  <motion.div key={load._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.03 }}>
                    <LoadCard
                      load={load}
                      isRequest={tab === 'requests'}
                      actionLoading={actionLoading}
                      onAccept={(l) => handleAction('accept-load', l)}
                      onMarkPickedUp={(l) => handleAction('mark-picked-up', l)}
                      onDrop={(l) => handleAction('drop-load', l)}
                      onStartRoute={(l) => handleAction('start-route', l)}
                      onSubmitProof={() => setProofTarget(load)}
                      canAcceptWork={workEligibility.canTakeNewWork}
                    />
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
            {loadingMore && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/30" />
              </div>
            )}
            {pagination?.hasMore && !loadingMore && (
              <Button variant="outline" className="w-full rounded-xl h-10 text-xs gap-2 border-border/70 hover:border-primary/30" onClick={handleLoadMore}>
                <ChevronDown className="h-4 w-4" /> Load more loads
              </Button>
            )}
          </>
        )}
      </motion.div>

      <ConfirmationModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => executeAction(confirmState.action, confirmState.loadId)}
        title={confirmState.title}
        description={confirmState.description}
        variant={confirmState.variant}
        isLoading={!!actionLoading}
      />

      <DriverContractModal
        isOpen={!!contractState}
        onClose={() => setContractState(null)}
        onConfirm={(contract) => executeAction(contractState!.action, contractState!.loadId, contract)}
        isSubmitting={!!actionLoading && actionLoading === contractState?.loadId}
        title="Accept This Load"
        description="Review and sign the transport contract to accept this load assignment."
        confirmLabel="Accept & Sign"
      />

      <SubmitProofModal
        load={proofTarget}
        getToken={getToken}
        onClose={() => setProofTarget(null)}
        onSuccess={() => {
          setProofTarget(null);
          toast.success("Proof of delivery submitted");
          fetchLoads();
        }}
      />
    </div>
  );
}

function StatusTimeline({ load }: { load: Load }) {
  const cur = getStepIdx(load);

  const timelineDates = [
    load.assignedAt,
    load.driverAcceptedAt,
    load.pickedUpAt,
    load.inTransitAt,
    load.deliveredAt
  ];

  return (
    <div className="flex items-center gap-0 w-full mt-2 overflow-x-auto pb-2 scrollbar-hide">
      {STEPS.map((step, i) => (
        <React.Fragment key={step.key}>
          <div className="flex flex-col items-center gap-1 min-w-17.5 shrink-0">
            <div
              className={cn(
                "size-5.5 sm:size-6 rounded-full flex items-center justify-center border-2 transition-colors",
                i <= cur
                  ? i === cur
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "bg-emerald-500/20 border-emerald-500 text-emerald-600"
                  : "bg-muted/50 border-border text-muted-foreground/40",
              )}
            >
              {i < cur ? (
                <CheckCircle2 className="size-3.5" />
              ) : i === cur ? (
                <CircleDot className="size-3.5" />
              ) : (
                <div className="size-1.5 rounded-full bg-current" />
              )}
            </div>
            <span
              className={cn(
                "text-[10px] sm:text-[11px] font-semibold whitespace-nowrap leading-none",
                i <= cur ? "text-emerald-600" : "text-muted-foreground/40",
              )}
            >
              {step.label}
            </span>
            <span
              className={cn(
                "text-[9px] whitespace-nowrap leading-none mt-0.5",
                i <= cur && timelineDates[i] ? "text-emerald-500/80" : "text-muted-foreground/35",
              )}
            >
              {i <= cur && timelineDates[i] ? fmtDate(timelineDates[i]) : "N/A"}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                "flex-1 h-0.5 -mt-6 mx-0.5 rounded-full min-w-5",
                i < cur ? "bg-emerald-500" : "bg-border",
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function LoadCard({ load, isRequest, actionLoading, onAccept, onMarkPickedUp, onDrop, onStartRoute, onSubmitProof, canAcceptWork }: {
  load: Load; isRequest: boolean; actionLoading: string | null;
  onAccept: (id: string) => void; onMarkPickedUp: (id: string) => void; onDrop: (l: Load) => void; onStartRoute: (id: string) => void; onSubmitProof: () => void; canAcceptWork: boolean;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const status = load.status;
  const isDispatched = ['Assigned', 'Accepted', 'Picked Up', 'In-Transit'].includes(status);
  const isActive = status !== 'Delivered' && status !== 'Cancelled';
  const isDelivered = status === 'Delivered';
  const isPending = load.myRequestStatus === 'pending';
  const isRejected = load.myRequestStatus === 'rejected';

  const vehicle = load.vehicles?.[0];
  const vehicleName = vehicle ? `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim() : "Unknown Vehicle";
  const vehicleImg = vehicle?.imageUrl ? resolveImageUrl(vehicle.imageUrl) : null;

  return (
    <Card className={cn('overflow-hidden border-border/75 hover:shadow-lg transition-all duration-200 rounded-2xl group',
      isPending ? 'border-amber-500/30 bg-amber-500/3' : isRejected ? 'border-red-500/20 opacity-75' :
        (status === 'In-Transit') ? 'border-emerald-500/30 bg-emerald-500/3' :
          status === 'Picked Up' ? 'border-orange-500/30 bg-orange-500/3' :
            status === 'Accepted' ? 'border-amber-500/30 bg-amber-500/3' : 'hover:border-primary/20')}>
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {vehicleImg && (
            <div className="w-full sm:w-40 h-32 sm:h-auto relative shrink-0">
              <img src={vehicleImg} alt={vehicleName} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />
            </div>
          )}
          <div className="flex-1 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/driver/loads/${load._id}`}
                    className="text-sm font-mono font-bold hover:text-primary transition-colors"
                  >
                    {load.loadNumber || "No load #"}
                  </Link>
                  {isRequest ? (
                    isPending ? (
                      <Badge className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20 gap-1">
                        <Timer className="size-2.5" />
                        Pending Approval
                      </Badge>
                    ) : isRejected ? (
                      <Badge className="text-[10px] bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/20 gap-1">
                        <XCircle className="size-2.5" />
                        Declined
                      </Badge>
                    ) : null
                  ) : (
                    <Badge
                      variant="outline"
                      className={STATUS_THEME[load.status] || ""}
                    >
                      {load.status}
                    </Badge>
                  )}
                  {load.pricing?.carrierPayAmount != null && load.pricing.carrierPayAmount > 0 && (
                    <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20 gap-0.5"><DollarSign className="size-2.5" />{load.pricing.carrierPayAmount.toLocaleString()}</Badge>
                  )}
                </div>
                <p className="text-sm font-bold text-foreground/80">
                  {vehicleName}
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <div className="size-1.5 rounded-full bg-emerald-500" />
                    <span className="truncate font-medium">{load.pickupLocation?.city || "Origin not provided"}{load.pickupLocation?.state ? `, ${load.pickupLocation.state}` : ""}</span>
                  </div>
                  <ArrowRight className="size-3 text-muted-foreground shrink-0" />
                  <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                    <div className="size-1.5 rounded-full bg-rose-500" />
                    <span className="truncate font-medium">
                      {load.deliveryLocation?.city || "Destination not provided"}{load.deliveryLocation?.state ? `, ${load.deliveryLocation.state}` : ""}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  {load.dates?.pickupDeadline && <span className="flex items-center gap-1"><Clock className="size-3" />Pickup: {fmtDate(load.dates.pickupDeadline)}</span>}
                  {load.dates?.deliveryDeadline && <span className="flex items-center gap-1"><Truck className="size-3" />Delivery: {fmtDate(load.dates.deliveryDeadline)}</span>}
                  {isRequest && load.myRequestedAt && <span>Requested: {fmtDate(load.myRequestedAt)}</span>}
                </div>
              </div>

              {!isRequest && (
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {status === 'Assigned' && !load.driverAcceptedAt && isActive && (
                    <Button size="sm" onClick={() => onAccept(load._id)} disabled={actionLoading === load._id || !canAcceptWork} className="h-11 rounded-lg gap-1.5">
                      {actionLoading === load._id ? <Loader2 className="size-4 animate-spin" /> : <><CheckCircle2 className="size-4" />{canAcceptWork ? 'Accept' : 'Unavailable'}</>}
                    </Button>
                  )}
                  {status === 'Accepted' && (
                    <Button size="sm" className="h-11 bg-orange-600 hover:bg-orange-700 rounded-lg gap-1.5" onClick={() => onMarkPickedUp(load._id)} disabled={actionLoading === load._id}>
                      {actionLoading === load._id ? <Loader2 className="size-4 animate-spin" /> : <><Package className="size-4" />Mark Picked Up</>}
                    </Button>
                  )}
                  {status === 'Picked Up' && (
                    <Button size="sm" className="h-11 bg-emerald-600 hover:bg-emerald-700 rounded-lg gap-1.5" onClick={() => onStartRoute(load._id)} disabled={actionLoading === load._id}>
                      {actionLoading === load._id ? <Loader2 className="size-4 animate-spin" /> : <><Navigation2 className="size-4" />Start Route</>}
                    </Button>
                  )}
                  {(status === 'In-Transit') && (
                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20 gap-1 animate-pulse"><Navigation2 className="size-3" />In Transit</Badge>
                  )}
                  {(status === 'In-Transit') && !load.proofOfDelivery?.imageUrl && (
                    <Button size="sm" variant="outline" onClick={onSubmitProof} className="h-11 rounded-lg gap-1.5"><Camera className="size-4" />Submit Proof</Button>
                  )}
                  {load.proofOfDelivery?.imageUrl && (
                    <Badge
                      className={cn(
                        "gap-1 text-[10px]",
                        load.proofOfDelivery.confirmedAt
                          ? "bg-green-500/10 text-green-600 dark:text-green-300 border-green-500/20"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/20",
                      )}
                    >
                      <ImageIcon className="size-2.5" />
                      {load.proofOfDelivery.confirmedAt
                        ? "Confirmed"
                        : "Proof Sent"}
                    </Badge>
                  )}
                  {isActive && load.driverAcceptedAt && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-[10px] text-muted-foreground hover:text-red-500 h-11 px-2"
                      onClick={() => onDrop(load)}
                      disabled={actionLoading === load._id}
                    >
                      {actionLoading === load._id ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <>
                          <Ban className="size-3 mr-1" />
                          Drop
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {!isRequest && isActive && <StatusTimeline load={load} />}

            {isRejected && load.rejectionReason && (
              <div className="flex items-start gap-2 rounded-xl bg-red-500/5 border border-red-500/15 p-2.5">
                <AlertCircle className="size-3.5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-600 dark:text-red-400">
                  {load.rejectionReason}
                </p>
              </div>
            )}

            {(isDispatched || isDelivered) && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-[11px] text-primary font-semibold hover:underline"
              >
                <FileText className="size-3" />
                {expanded ? "Hide" : "View"}{" "}
                {isDelivered ? "Load History" : "Dispatch Details"}
                {expanded ? (
                  <ChevronUp className="size-3" />
                ) : (
                  <ChevronDown className="size-3" />
                )}
              </button>
            )}

            {expanded && (isDispatched || isDelivered) && (
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3">
                {load.additionalInfo?.notes && <DetailBlock label="Dispatch Notes" text={load.additionalInfo.notes} />}
                {load.additionalInfo?.instructions && <DetailBlock label="Special Instructions" text={load.additionalInfo.instructions} />}
                {load.contract?.signerName && <DetailBlock label="Signed By" text={load.contract.signerName} />}
                {load.driverContract?.agreedToTerms && <DetailBlock label="Driver Contract" text={`Signed by ${load.driverContract.signerName || "driver"}`} />}
                {load.pickupLocation?.contactName && <ContactBlock label="Pick-Up Contact" contact={load.pickupLocation} />}
                {load.deliveryLocation?.contactName && <ContactBlock label="Delivery Contact" contact={load.deliveryLocation} />}
                {load.pricing?.carrierPayAmount != null && load.pricing.carrierPayAmount > 0 && (
                  <div className="flex items-center gap-4 pt-1 border-t border-border/55">
                    <MoneyBlock label="Carrier Pay" value={load.pricing.carrierPayAmount} highlight />
                    {load.pricing.copCodAmount != null && load.pricing.copCodAmount > 0 && <MoneyBlock label="COD" value={load.pricing.copCodAmount} />}
                    {load.pricing.balanceAmount != null && <MoneyBlock label="Balance" value={load.pricing.balanceAmount} />}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-xs">{text}</p>
    </div>
  );
}

function ContactBlock({ label, contact }: { label: string; contact: any }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        {label}
      </p>
      <div className="flex flex-wrap gap-3 text-xs">
        {contact.contactName && (
          <span className="flex items-center gap-1">
            <User2 className="size-3" />
            {contact.contactName}
          </span>
        )}
        {contact.phone && (
          <a
            href={`tel:${contact.phone}`}
            className="flex items-center gap-1 text-primary hover:underline"
          >
            <Phone className="size-3" />
            {contact.phone}
          </a>
        )}
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            className="flex items-center gap-1 text-primary hover:underline"
          >
            <Mail className="size-3" />
            {contact.email}
          </a>
        )}
      </div>
    </div>
  );
}

function MoneyBlock({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p className={cn("text-sm font-bold", highlight && "text-emerald-600")}>
        ${value.toLocaleString()}
      </p>
    </div>
  );
}

function SubmitProofModal({ load, getToken, onClose, onSuccess }: { load: Load | null; getToken: () => Promise<string | null>; onClose: () => void; onSuccess: () => void }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const camRef = React.useRef<HTMLInputElement>(null);
  const galRef = React.useRef<HTMLInputElement>(null);
  // Tracks whether submit-proof already succeeded for the current file, so a
  // retry after the follow-up /deliver call fails skips re-uploading proof
  // instead of creating a duplicate.
  const proofSubmittedRef = React.useRef(false);

  React.useEffect(() => {
    proofSubmittedRef.current = false;
    if (!load) {
      setFile(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      setNote("");
      setError(null);
      return;
    }
  }, [load]);

  React.useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (preview) URL.revokeObjectURL(preview);
      setFile(f);
      setPreview(URL.createObjectURL(f));
      proofSubmittedRef.current = false;
      e.target.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!load || !file) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = await getToken();

      // Use the Driver Tracking proof route so shared/standalone drivers do
      // not need a home organization just to submit POD, matching the same
      // flow used by the dashboard's Complete Delivery dialog. Delivery is
      // only advanced after the proof upload succeeds. If a retry lands here
      // after submit-proof already succeeded but /deliver failed, skip
      // re-uploading the same file and go straight to /deliver.
      if (!proofSubmittedRef.current) {
        const fd = new FormData();
        fd.append('proof', file);
        if (note.trim()) fd.append('note', note.trim());
        await apiClient.post(
          `/api/driver-tracking/loads/${encodeURIComponent(load._id)}/submit-proof`,
          fd,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        proofSubmittedRef.current = true;
      }

      await apiClient.post(
        `/api/driver-tracking/loads/${encodeURIComponent(load._id)}/deliver`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      onSuccess();
    } catch (err: any) {
      setError(extractErr(err, "Failed to submit proof."));
    } finally {
      setSubmitting(false);
    }
  };

  if (!load) return null;
  return (
    <Dialog
      open={!!load}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-md">
        <DialogHeader className="shrink-0 border-b border-border/60 bg-muted/20 px-4 py-4 text-left sm:px-6">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="size-4 text-primary" />
            Submit Proof of Delivery
          </DialogTitle>
          <DialogDescription>
            Photo proof for load{" "}
            <span className="font-mono font-medium">
              {load.loadNumber || "this load"}
            </span>
            .
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
          <input
            ref={camRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            capture="environment"
            className="hidden"
            onChange={onFileChange}
          />
          <input
            ref={galRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,.img"
            className="hidden"
            onChange={onFileChange}
          />
          {!preview ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => camRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-3 py-10 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/60 transition-colors cursor-pointer"
              >
                <div className="p-4 rounded-full bg-primary/10">
                  <Camera className="size-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold">Take a Photo</p>
                  <p className="text-xs text-muted-foreground">
                    Opens your camera
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => galRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 min-h-11 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
              >
                <ImageIcon className="size-4" />
                Choose from gallery
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="rounded-xl overflow-hidden border border-border">
                <img
                  src={preview}
                  alt="Proof preview"
                  className="w-full max-h-60 object-contain bg-muted"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => camRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-1.5 min-h-11 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors hover:bg-muted"
                >
                  <Camera className="size-3.5" />
                  Retake
                </button>
                <button
                  type="button"
                  onClick={() => galRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-1.5 min-h-11 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors hover:bg-muted"
                >
                  <ImageIcon className="size-3.5" />
                  Change Photo
                </button>
              </div>
            </div>
          )}
          <div>
            <Label htmlFor="proof-note">Note (optional)</Label>
            <Textarea
              id="proof-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Delivered to front door, customer signed"
              className="mt-1"
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl border border-red-500/15 bg-red-500/5 text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}
        </div>
        <DialogFooter className="shrink-0 border-t border-border/60 bg-muted/10 px-4 py-3 sm:px-6">
          <Button
            className="h-11 w-full rounded-xl"
            onClick={handleSubmit}
            disabled={submitting || !file}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Camera className="size-4 mr-2" />
                Submit Proof
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
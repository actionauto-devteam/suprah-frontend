'use client';

import * as React from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Truck, Package, Search, Loader2, AlertTriangle, RefreshCw,
  Filter, ChevronDown, DollarSign, Clock, MapPin, Map as MapIcon, XCircle,
  Timer, ArrowUpDown, TrendingUp, CalendarClock, Calendar,
  ArrowLeft, Zap, Car, ChevronRight, Navigation,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { trailerTypeOptions } from '@/components/driver-profile/driver-profile-constants';
import { initializeSocket, getSocket } from '@/lib/socket.client';
import { cn, resolveImageUrl } from '@/lib/utils';
import Link from 'next/link';
import { DriverContractModal, DriverSignedContract } from '@/components/create-load/DriverContractModal';
import { useDriverWorkEligibility } from '@/hooks/useDriverWorkEligibility';

const FALLBACK = "/vehicle-placeholder.jpg";

interface AvailableLoad {
  _id: string;
  origin: string;
  destination: string;
  trackingNumber?: string;
  status: string;
  dates?: {
    pickupDeadline?: string;
    deliveryDeadline?: string;
    firstAvailable?: string;
  };
  pricing?: {
    carrierPayAmount?: number;
    copCodAmount?: number;
    balanceAmount?: number;
  };
  trailerTypeRequired?: string;
  vehicleCount?: number;
  carrierPayAmount?: number; // legacy fallback
  myRequestStatus?: 'pending' | 'approved' | 'rejected' | null;
  myRequestedAt?: string | null;
  vehicles?: { trailerType: string; year: string; make: string; model: string; vin: string; color: string; condition: string }[];
  preservedQuoteData?: {
    vehicleName?: string; vehicleImage?: string; rate?: number; miles?: number;
    firstName?: string; lastName?: string; enclosedTrailer?: boolean; units?: number;
  };
  createdAt: string;
}

const trailerLabel = (val?: string) => trailerTypeOptions.find(t => t.value === val)?.label || val || 'Any';
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Denver' }) : 'TBD';
const timeAgo = (d: string) => { const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`; return `${Math.floor(h / 24)}d ago`; };
const extractErr = (e: any, fb: string) => e?.response?.data?.message || e?.message || fb;
const getPay = (l: AvailableLoad) => l.pricing?.carrierPayAmount || l.carrierPayAmount || l.preservedQuoteData?.rate || 0;

type SortMode = 'newest' | 'pay-high' | 'pay-low' | 'pickup-soon';

export default function AvailableLoadsPage() {
  const { getToken } = useAuth();
  const workEligibility = useDriverWorkEligibility();
  const [loads, setLoads] = React.useState<AvailableLoad[]>([]);
  const [pagination, setPagination] = React.useState<{ hasMore: boolean; page: number; totalPages: number } | null>(null);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [trailerFilter, setTrailerFilter] = React.useState('all');
  const [driverTrailerType, setDriverTrailerType] = React.useState<string | null>(null);
  const [activeLoadCount, setActiveLoadCount] = React.useState(0);
  const [maxLoadCapacity, setMaxLoadCapacity] = React.useState(12);
  const [sortBy, setSortBy] = React.useState<SortMode>('newest');
  const [requestTarget, setRequestTarget] = React.useState<AvailableLoad | null>(null);
  const [showContractModal, setShowContractModal] = React.useState(false);
  const [requesting, setRequesting] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchDriverProfile = React.useCallback(async () => {
    try {
      const token = await getToken();
      const [profileRes, loadsRes] = await Promise.all([
        apiClient.get('/api/driver-profile', { headers: { Authorization: `Bearer ${token}` } }),
        apiClient.get('/api/driver-tracking/my-loads', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const trailer = profileRes.data?.data?.trailerType;
      const cap = profileRes.data?.data?.maxVehicleCapacity || 12;
      if (trailer) {
        setDriverTrailerType(trailer);
        setTrailerFilter(prev => prev === 'all' ? trailer : prev);
      }
      setMaxLoadCapacity(cap);
      const myLoadsData = loadsRes.data?.data;
      if (myLoadsData?.activeLoadCount != null) {
        setActiveLoadCount(myLoadsData.activeLoadCount);
        if (myLoadsData.maxLoadCapacity) setMaxLoadCapacity(myLoadsData.maxLoadCapacity);
      } else {
        const myLoads = Array.isArray(myLoadsData) ? myLoadsData : [];
        setActiveLoadCount(myLoads.filter((l: any) => l.status !== 'Delivered' && l.status !== 'Cancelled').length);
      }
    } catch { /* silently fall back */ }
  }, [getToken]);

  React.useEffect(() => { fetchDriverProfile(); }, [fetchDriverProfile]);

  React.useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'visible') fetchDriverProfile(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [fetchDriverProfile]);

  const fetchLoads = React.useCallback(async (pageNum = 1, append = false) => {
    try {
      const token = await getToken();
      const res = await apiClient.get(`/api/driver-tracking/available-loads?page=${pageNum}`, { headers: { Authorization: `Bearer ${token}` } });
      const responseData = res.data?.data;
      const newLoads = responseData?.loads || responseData || [];
      const newPagination = responseData?.pagination || null;
      
      if (append) {
        setLoads(prev => [...prev, ...newLoads]);
      } else {
        setLoads(newLoads);
      }
      setPagination(newPagination);
      if (!append) setPage(1);
      else setPage(pageNum);
    } catch (err: any) { toast.error(extractErr(err, 'Failed to load available loads')); }
    finally { setLoading(false); setRefreshing(false); setLoadingMore(false); }
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
      const refresh = () => { if (mounted) fetchLoads(); };
      sock.on('driver:loads_updated', refresh);
      sock.on('driver:load_requested', refresh);
      sock.on('driver:load_request_updated', refresh);
      sock.on('load:change', refresh);
    };
    setup();
    return () => {
      mounted = false;
      const s = getSocket();
      if (s) {
        s.off('driver:loads_updated');
        s.off('driver:load_requested');
        s.off('driver:load_request_updated');
        s.off('load:change');
      }
    };
  }, [getToken, fetchLoads]);

  const handleLoadMore = async () => {
    if (!pagination || !pagination.hasMore || loadingMore) return;
    setLoadingMore(true);
    await fetchLoads(page + 1, true);
  };

  const handleRefresh = () => { setRefreshing(true); fetchLoads(1, false); };

  const handleRequest = async (contract: DriverSignedContract) => {
    if (!requestTarget) return;
    if (!workEligibility.canTakeNewWork) {
      toast.error(workEligibility.blockReason || 'You are not eligible to request a new load right now.');
      return;
    }
    setRequesting(true);
    try {
      const token = await getToken();
      await apiClient.post(`/api/driver-tracking/loads/${requestTarget._id}/request`,
        contract,
        { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Load request submitted — pending dispatcher approval');
      setShowContractModal(false);
      setRequestTarget(null);
      fetchLoads();
    } catch (err: any) { toast.error(extractErr(err, 'Failed to request load')); }
    finally { setRequesting(false); }
  };

  const uniqueTrailers = React.useMemo(() => {
    const set = new Set(loads.map(l => l.trailerTypeRequired).filter(Boolean) as string[]);
    if (driverTrailerType) set.add(driverTrailerType);
    return Array.from(set);
  }, [loads, driverTrailerType]);

  const atCapacity = activeLoadCount >= maxLoadCapacity;

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    let result = loads.filter(l => {
      if (trailerFilter !== 'all') {
        const loadTrailer = (l.trailerTypeRequired || '').toLowerCase().replace(/[\s-]/g, '_');
        const activeFilter = trailerFilter.toLowerCase().replace(/[\s-]/g, '_');
        if (loadTrailer !== activeFilter) return false;
      }
      if (!q) return true;
      return l.origin?.toLowerCase().includes(q) || l.destination?.toLowerCase().includes(q) || l.trackingNumber?.toLowerCase().includes(q) || l.preservedQuoteData?.vehicleName?.toLowerCase().includes(q);
    });
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case 'pay-high': return getPay(b) - getPay(a);
        case 'pay-low': return getPay(a) - getPay(b);
        case 'pickup-soon': return new Date(a.dates?.pickupDeadline || a.createdAt).getTime() - new Date(b.dates?.pickupDeadline || b.createdAt).getTime();
        default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [loads, search, trailerFilter, sortBy]);

  const pendingCount = loads.filter(l => l.myRequestStatus === 'pending').length;
  const avgPay = loads.length > 0 ? Math.round(loads.reduce((s, l) => s + getPay(l), 0) / loads.length) : 0;
  const highPay = loads.length > 0 ? Math.max(...loads.map(getPay)) : 0;

  const sortOpts: { key: SortMode; label: string; icon: React.ElementType }[] = [
    { key: 'newest', label: 'Newest First', icon: Clock },
    { key: 'pay-high', label: 'Highest Pay', icon: TrendingUp },
    { key: 'pay-low', label: 'Lowest Pay', icon: DollarSign },
    { key: 'pickup-soon', label: 'Pickup Soonest', icon: CalendarClock },
  ];

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-5">

        <div className="relative overflow-hidden rounded-3xl border border-slate-300/80 dark:border-white/15 shadow-lg dark:shadow-2xl ring-1 ring-slate-200/50 dark:ring-white/[0.03]">
          <div className="absolute inset-0 bg-linear-to-br from-white via-slate-50 to-cyan-50/70 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
          <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/8 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-emerald-500/6 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
          <div className="relative p-5 sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Link href="/driver" className="p-2.5 rounded-xl bg-background/80 dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 transition-colors border border-border/80 dark:border-white/15 shadow-sm">
                  <ArrowLeft className="size-4.5 text-foreground/80 dark:text-white/80" />
                </Link>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">Load Board</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {loading ? 'Scanning...' : `${loads.length} load${loads.length !== 1 ? 's' : ''} available`}
                    {pendingCount > 0 && <span className="ml-1.5 text-amber-400 font-semibold"> · {pendingCount} pending</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/20">
                  <Zap className="size-3 text-emerald-400" /><span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Live</span>
                </div>
                <div className="flex rounded-lg border border-border/80 dark:border-white/15 p-0.5 bg-background/70 dark:bg-white/5 shadow-sm">
                  <div className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-background text-foreground dark:bg-white/15 dark:text-white shadow-sm border border-border/60 dark:border-white/10">
                    <MapIcon className="size-3.5 inline mr-1" />Map
                    <span className="ml-1 text-[9px] text-amber-400 font-bold uppercase">Soon</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-white/10 border border-border/80 dark:border-white/15 bg-background/60 dark:bg-transparent">
                  <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} />
                </Button>
              </div>
            </div>

            {!loading && loads.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                <div className="rounded-xl bg-background/70 dark:bg-white/5 border border-border/80 dark:border-white/15 p-3 text-center shadow-sm">
                  <p className="text-lg sm:text-xl font-black text-foreground tabular-nums">{loads.length}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Available</p>
                </div>
                <div className={cn("rounded-xl bg-background/70 dark:bg-white/5 border p-3 text-center shadow-sm", atCapacity ? "border-red-500/40" : "border-border/80 dark:border-white/15")}>
                  <p className={cn("text-lg sm:text-xl font-black tabular-nums", atCapacity ? "text-red-400" : "text-amber-400")}>{activeLoadCount}/{maxLoadCapacity}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">My Loads</p>
                </div>
                <div className="rounded-xl bg-background/70 dark:bg-white/5 border border-border/80 dark:border-white/15 p-3 text-center shadow-sm">
                  <p className="text-lg sm:text-xl font-black text-emerald-400 tabular-nums">${avgPay.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Avg Pay</p>
                </div>
                <div className="rounded-xl bg-background/70 dark:bg-white/5 border border-border/80 dark:border-white/15 p-3 text-center shadow-sm">
                  <p className="text-lg sm:text-xl font-black text-emerald-400 tabular-nums">${highPay.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Top Pay</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {!workEligibility.canTakeNewWork && !workEligibility.isLoading && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">{workEligibility.blockReason}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search by city, tracking #, or vehicle..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10 rounded-xl bg-background border-border/80 shadow-sm focus-visible:border-primary/60" />
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-10 shrink-0 rounded-xl border-border/60">
                  <ArrowUpDown className="size-3.5" /><span className="hidden sm:inline">{sortOpts.find(s => s.key === sortBy)?.label}</span><ChevronDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">Sort By</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {sortOpts.map(o => <DropdownMenuItem key={o.key} onClick={() => setSortBy(o.key)} className={sortBy === o.key ? 'bg-accent' : ''}><span className="flex items-center gap-2"><o.icon className="size-3.5" />{o.label}</span></DropdownMenuItem>)}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className={cn("gap-1.5 h-10 shrink-0 rounded-xl border-border/60", trailerFilter !== 'all' && "border-primary/40 bg-primary/5")}>
                  <Filter className="size-3.5" /><span className="hidden sm:inline">{trailerFilter === 'all' ? 'All Trailers' : trailerLabel(trailerFilter)}</span><ChevronDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">Trailer Filter</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setTrailerFilter('all')} className={trailerFilter === 'all' ? 'bg-accent' : ''}>All Trailers</DropdownMenuItem>
                {uniqueTrailers.map(t => <DropdownMenuItem key={t} onClick={() => setTrailerFilter(t)} className={trailerFilter === t ? 'bg-accent' : ''}>{trailerLabel(t)}</DropdownMenuItem>)}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative"><div className="size-16 rounded-full border-4 border-blue-500/20 animate-pulse" /><Loader2 className="size-8 animate-spin text-blue-500 absolute inset-0 m-auto" /></div>
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Scanning Load Board</p>
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-border/60 rounded-2xl">
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="size-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4"><Package className="size-8 text-muted-foreground/30" /></div>
              <p className="text-sm font-bold">{search || trailerFilter !== 'all' ? 'No loads match your filters' : 'No loads posted to the board right now'}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Check back later or adjust your filters</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <AnimatePresence mode="popLayout">
              <div className="grid gap-3">
                {filtered.map((load, i) => (
                  <motion.div key={load._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.03 }}>
                    <LoadCard
                      load={load}
                      canRequest={workEligibility.canTakeNewWork}
                      onRequest={() => {
                        if (!workEligibility.canTakeNewWork) {
                          toast.error(workEligibility.blockReason || 'You are not eligible to request a load right now.');
                          return;
                        }
                        setRequestTarget(load);
                      }}
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

      <Dialog open={!!requestTarget} onOpenChange={() => setRequestTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Truck className="size-5 text-primary" />Request Load Assignment</DialogTitle>
            <DialogDescription>The dispatcher will review and approve your request.</DialogDescription>
          </DialogHeader>
          {requestTarget && (
            <div className="rounded-xl border p-3 space-y-2 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px]">{requestTarget.trackingNumber || requestTarget._id.slice(-8)}</Badge>
                  {requestTarget.trailerTypeRequired && <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">{trailerLabel(requestTarget.trailerTypeRequired)}</Badge>}
                </div>
                {getPay(requestTarget) > 0 && <span className="text-sm font-black text-emerald-600">${getPay(requestTarget).toLocaleString()}</span>}
              </div>
              <p className="text-sm font-semibold">{requestTarget.origin} → {requestTarget.destination}</p>
              {requestTarget.preservedQuoteData?.vehicleName && <p className="text-xs text-muted-foreground font-medium">{requestTarget.preservedQuoteData.vehicleName}</p>}
              {requestTarget.vehicles && requestTarget.vehicles.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {requestTarget.vehicles.map((v, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] gap-1"><Car className="size-2.5" />{`${v.year} ${v.make} ${v.model}`.trim()}{v.color ? ` · ${v.color}` : ''}</Badge>
                  ))}
                </div>
              )}
              {requestTarget.vehicleCount && <p className="text-xs text-muted-foreground">{requestTarget.vehicleCount} vehicle{requestTarget.vehicleCount > 1 ? 's' : ''}</p>}
            </div>
          )}
          <div className="flex items-start gap-2 rounded-xl bg-amber-500/5 border border-amber-500/15 p-3">
            <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {atCapacity
                ? `You've reached your active load limit (${activeLoadCount}/${maxLoadCapacity}). Complete or drop a load before requesting more.`
                : `Requesting a load does not guarantee assignment. Active loads: ${activeLoadCount}/${maxLoadCapacity}`}
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRequestTarget(null)} disabled={requesting}>Cancel</Button>
            <Button onClick={() => setShowContractModal(true)} disabled={requesting || atCapacity || !workEligibility.canTakeNewWork} className="gap-1.5">
              {requesting ? <Loader2 className="size-4 animate-spin" /> : <Truck className="size-4" />}{requesting ? 'Requesting...' : atCapacity ? 'At Capacity' : 'Continue to Sign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DriverContractModal
        isOpen={showContractModal}
        onClose={() => setShowContractModal(false)}
        onConfirm={handleRequest}
        isSubmitting={requesting}
        title="Request This Load"
        description="Review and sign the transport contract to submit your request."
        confirmLabel="Request & Sign"
      />
    </div>
  );
}

function LoadCard({ load, onRequest, canRequest }: { load: AvailableLoad; onRequest: () => void; canRequest: boolean }) {
  const quote = load.preservedQuoteData;
  const isRequested = load.myRequestStatus === 'pending';
  const isRejected = load.myRequestStatus === 'rejected';
  const vehicles = load.vehicles || [];
  const vehicleName = quote?.vehicleName || (vehicles.length > 0 ? `${vehicles[0].year} ${vehicles[0].make} ${vehicles[0].model}`.trim() : undefined);
  const pay = getPay(load);

  return (
    <Link href={`/driver/available-loads/${load._id}`} className="block group">
      <Card className={cn('border-border/75 hover:shadow-xl transition-all duration-200 overflow-hidden rounded-2xl',
        isRequested ? 'border-amber-500/30 bg-amber-500/3' : isRejected ? 'border-red-500/20 opacity-75' : 'hover:border-primary/25 hover:-translate-y-0.5')}>
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">
            <div className="relative w-full sm:w-48 h-40 sm:h-auto shrink-0 overflow-hidden">
              <img
                src={resolveImageUrl(quote?.vehicleImage) || FALLBACK}
                alt={vehicleName || 'Vehicle'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  const img = e.currentTarget;
                  if (img.src !== window.location.origin + FALLBACK) {
                    img.src = FALLBACK;
                  }
                }}
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent" />
              {isRequested && <div className="absolute top-2.5 left-2.5"><Badge className="text-[9px] bg-amber-500 text-white border-0 gap-1 shadow-lg"><Timer className="size-2.5" />Pending Review</Badge></div>}
              {isRejected && <div className="absolute top-2.5 left-2.5"><Badge className="text-[9px] bg-red-500 text-white border-0 gap-1 shadow-lg"><XCircle className="size-2.5" />Declined</Badge></div>}
              {pay > 0 && (
                <div className="absolute bottom-2.5 right-2.5">
                  <div className="bg-black/70 backdrop-blur-sm rounded-lg px-2.5 py-1">
                    <span className="text-base font-black text-emerald-400">${pay.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] font-bold font-mono">{load.trackingNumber || load._id.slice(-8)}</Badge>
                    {load.trailerTypeRequired && <Badge className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20"><Truck className="size-2.5 mr-1" />{trailerLabel(load.trailerTypeRequired)}</Badge>}
                    {load.vehicleCount && load.vehicleCount > 1 && <Badge className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/20">{load.vehicleCount} vehicles</Badge>}
                    {isRequested && !quote?.vehicleImage && <Badge className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1"><Timer className="size-2.5" />Pending</Badge>}
                    {isRejected && !quote?.vehicleImage && <Badge className="text-[9px] bg-red-500/10 text-red-600 border-red-500/20 gap-1"><XCircle className="size-2.5" />Declined</Badge>}
                  </div>
                  {vehicleName && <p className="text-sm font-bold truncate">{vehicleName}</p>}
                  {vehicles.length > 1 && (
                    <div className="flex flex-wrap gap-1">
                      {vehicles.slice(1, 4).map((v, i) => (
                        <span key={i} className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded-md">{v.year} {v.make} {v.model}</span>
                      ))}
                      {vehicles.length > 4 && <span className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded-md">+{vehicles.length - 4} more</span>}
                    </div>
                  )}
                </div>
                {!quote?.vehicleImage && pay > 0 && (
                  <div className="text-right shrink-0">
                    <p className="text-xl font-black text-emerald-600 flex items-center gap-0.5 justify-end"><DollarSign className="size-4" />{pay.toLocaleString()}</p>
                    {quote?.miles && <p className="text-[10px] text-muted-foreground">${(pay / quote.miles).toFixed(2)}/mi · {quote.miles.toLocaleString()} mi</p>}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted/20 border border-border/50">
                <div className="size-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-xs font-semibold truncate max-w-32.5">{load.origin}</span>
                <div className="flex-1 border-t border-dashed border-muted-foreground/20 mx-1.5" />
                <Navigation className="size-3 text-muted-foreground/40 shrink-0" />
                <div className="flex-1 border-t border-dashed border-muted-foreground/20 mx-1.5" />
                <MapPin className="size-3 text-red-500 shrink-0" />
                <span className="text-xs font-semibold truncate max-w-32.5">{load.destination}</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="size-3" />{fmtDate(load.dates?.pickupDeadline)}</span>
                  {quote?.miles && <span className="flex items-center gap-1"><Navigation className="size-3" />{quote.miles.toLocaleString()} mi</span>}
                  <span className="flex items-center gap-1"><Clock className="size-3" />{timeAgo(load.createdAt)}</span>
                </div>
                {isRequested ? (
                  <Badge variant="outline" className="text-[10px] font-semibold border-amber-500/30 text-amber-600 gap-1"><Timer className="size-3" />Awaiting Approval</Badge>
                ) : isRejected ? (
                  <Badge variant="outline" className="text-[10px] font-semibold border-red-500/30 text-red-500 gap-1"><XCircle className="size-3" />Declined</Badge>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button size="sm" disabled={!canRequest} onClick={e => { e.preventDefault(); e.stopPropagation(); onRequest(); }} className="h-7 px-3 text-[10px] font-bold gap-1 shadow-sm rounded-lg">
                      <Truck className="size-3" />{canRequest ? 'Request' : 'Unavailable'}
                    </Button>
                    <ChevronRight className="size-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
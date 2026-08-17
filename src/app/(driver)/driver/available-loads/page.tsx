'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpDown,
  Calendar,
  CalendarClock,
  Car,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  DollarSign,
  Filter,
  Loader2,
  Map as MapIcon,
  MapPin,
  MessageSquare,
  Navigation,
  Package,
  RefreshCw,
  Search,
  Timer,
  TrendingUp,
  Truck,
  XCircle,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { trailerTypeOptions } from '@/components/driver-profile/driver-profile-constants';
import { initializeSocket, getSocket } from '@/lib/socket.client';
import { cn, resolveImageUrl } from '@/lib/utils';
import {
  DriverContractModal,
  DriverSignedContract,
} from '@/components/create-load/DriverContractModal';
import { useDriverWorkEligibility } from '@/hooks/useDriverWorkEligibility';
import type { DriverLoadCompatibility } from '@/types/driver-tracking';
import { titleCaseDay } from '@/lib/driver-load-compatibility';
import { DriverLoadRecommendationBadges } from '@/components/driver-tracker/DriverLoadRecommendationBadges';
import { DispatchChatDialog, type DispatchChatThreadSummary } from '@/components/dispatch-chat/DispatchChatDialog';

const FALLBACK = '/vehicle-placeholder.jpg';

type SortMode = 'newest' | 'pay-high' | 'pay-low' | 'pickup-soon';

interface AvailableLoad {
  _id: string;
  origin: string;
  destination: string;
  trackingNumber?: string;
  loadNumber?: string;
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
  trailerType?: string;
  vehicleCount?: number;
  carrierPayAmount?: number;
  myRequestStatus?: 'pending' | 'approved' | 'rejected' | null;
  myRequestedAt?: string | null;
  hasRequested?: boolean;
  vehicles?: Array<{
    trailerType?: string;
    year?: string | number;
    make?: string;
    model?: string;
    vin?: string;
    color?: string;
    condition?: string;
  }>;
  preservedQuoteData?: {
    vehicleName?: string;
    vehicleImage?: string;
    rate?: number;
    miles?: number;
    firstName?: string;
    lastName?: string;
    enclosedTrailer?: boolean;
    units?: number;
  };
  pickupLocation?: { address?: string; city?: string; state?: string; zip?: string };
  deliveryLocation?: { address?: string; city?: string; state?: string; zip?: string };
  compatibility?: DriverLoadCompatibility;
  createdAt: string;
}

const trailerLabel = (value?: string) =>
  trailerTypeOptions.find((item) => item.value === value)?.label || value || 'Any';

const fmtDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      })
    : 'TBD';

const timeAgo = (value: string) => {
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const extractErr = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

const getPay = (load: AvailableLoad) =>
  load.pricing?.carrierPayAmount ||
  load.carrierPayAmount ||
  load.preservedQuoteData?.rate ||
  0;

function hasCompatibilityMismatch(compatibility?: DriverLoadCompatibility) {
  if (!compatibility) return false;
  return (
    compatibility.availability.status === 'off_schedule' ||
    compatibility.capacity.status === 'exceeded' ||
    compatibility.trailer.status === 'mismatch' ||
    compatibility.serviceArea?.status === 'outside' ||
    compatibility.preferredRoute?.status === 'not_preferred'
  );
}

function locationLabel(location: any, fallback?: string) {
  if (fallback) return fallback;
  return [location?.city, location?.state].filter(Boolean).join(', ');
}

function normalizeLoad(raw: any): AvailableLoad {
  const vehicles = Array.isArray(raw?.vehicles) ? raw.vehicles : [];
  return {
    ...raw,
    origin: locationLabel(raw?.pickupLocation, raw?.origin) || 'Origin not provided',
    destination:
      locationLabel(raw?.deliveryLocation, raw?.destination) ||
      'Destination not provided',
    trackingNumber: raw?.trackingNumber || raw?.loadNumber,
    trailerTypeRequired: raw?.trailerTypeRequired || raw?.trailerType,
    vehicleCount:
      typeof raw?.vehicleCount === 'number' ? raw.vehicleCount : vehicles.length,
    myRequestStatus:
      raw?.myRequestStatus || (raw?.hasRequested ? 'pending' : null),
    vehicles,
  };
}

function searchableValue(value: unknown) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim().toLowerCase();
  }
  return '';
}

function getLoadSearchText(load: AvailableLoad) {
  const vehicleTerms = (load.vehicles || []).flatMap((vehicle) => [
    vehicle.year,
    vehicle.make,
    vehicle.model,
    vehicle.vin,
    vehicle.color,
    vehicle.condition,
    vehicle.trailerType,
  ]);

  return [
    load.trackingNumber,
    load.loadNumber,
    load.origin,
    load.destination,
    load.pickupLocation?.address,
    load.pickupLocation?.city,
    load.pickupLocation?.state,
    load.pickupLocation?.zip,
    load.deliveryLocation?.address,
    load.deliveryLocation?.city,
    load.deliveryLocation?.state,
    load.deliveryLocation?.zip,
    load.preservedQuoteData?.vehicleName,
    load.trailerTypeRequired,
    ...vehicleTerms,
  ]
    .map(searchableValue)
    .filter(Boolean)
    .join(' ');
}

function CompatibilityBadges({ compatibility }: { compatibility?: DriverLoadCompatibility }) {
  if (!compatibility) return null;
  const availability = compatibility.availability.status;
  const capacity = compatibility.capacity.status;

  return (
    <div className="flex min-w-0 flex-wrap gap-1.5">
      {availability === 'match' && (
        <Badge className="h-auto whitespace-normal border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[10px] leading-tight text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="mr-1 size-3 shrink-0" />
          Available {titleCaseDay(compatibility.availability.pickupDay) || 'Pickup Day'}
        </Badge>
      )}
      {availability === 'off_schedule' && (
        <Badge className="h-auto whitespace-normal border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[10px] leading-tight text-amber-800 dark:text-amber-300">
          <AlertTriangle className="mr-1 size-3 shrink-0" />
          Off Schedule {titleCaseDay(compatibility.availability.pickupDay) || ''}
        </Badge>
      )}
      {availability === 'unknown' && (
        <Badge variant="outline" className="h-auto whitespace-normal px-2 py-1 text-[10px] leading-tight text-muted-foreground">
          <Calendar className="mr-1 size-3 shrink-0" />Schedule Unknown
        </Badge>
      )}

      {capacity === 'match' ? (
        <Badge className="h-auto whitespace-normal border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[10px] leading-tight text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="mr-1 size-3 shrink-0" />
          Capacity {compatibility.capacity.requiredVehicles}/{compatibility.capacity.maxVehicles}
        </Badge>
      ) : (
        <Badge className="h-auto whitespace-normal border-red-500/25 bg-red-500/10 px-2 py-1 text-[10px] leading-tight text-red-700 dark:text-red-400">
          {capacity === 'exceeded' ? (
            <XCircle className="mr-1 size-3 shrink-0" />
          ) : (
            <AlertTriangle className="mr-1 size-3 shrink-0" />
          )}
          {capacity === 'exceeded'
            ? `Capacity ${compatibility.capacity.requiredVehicles}/${compatibility.capacity.maxVehicles} · Exceeded`
            : 'Capacity Not Verified'}
        </Badge>
      )}

      {compatibility.trailer.status === 'mismatch' && (
        <Badge className="h-auto whitespace-normal border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[10px] leading-tight text-amber-800 dark:text-amber-300">
          <AlertTriangle className="mr-1 size-3 shrink-0" />Trailer Mismatch
        </Badge>
      )}
      <DriverLoadRecommendationBadges compatibility={compatibility} />
    </div>
  );
}

export default function AvailableLoadsPage() {
  const { getToken } = useAuth();
  const workEligibility = useDriverWorkEligibility();
  const [loads, setLoads] = React.useState<AvailableLoad[]>([]);
  const [pagination, setPagination] = React.useState<{
    hasMore: boolean;
    page: number;
    totalPages: number;
  } | null>(null);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [trailerFilter, setTrailerFilter] = React.useState('all');
  const [driverTrailerType, setDriverTrailerType] = React.useState<string | null>(null);
  const [equipmentCapacity, setEquipmentCapacity] = React.useState<number | null>(null);
  const [sortBy, setSortBy] = React.useState<SortMode>('newest');
  const [requestTarget, setRequestTarget] = React.useState<AvailableLoad | null>(null);
  const [showContractModal, setShowContractModal] = React.useState(false);
  const [requesting, setRequesting] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [chatOpen, setChatOpen] = React.useState(false);
  const [chatThread, setChatThread] = React.useState<DispatchChatThreadSummary | null>(null);
  const [chatOpeningLoadId, setChatOpeningLoadId] = React.useState<string | null>(null);

  const fetchDriverProfile = React.useCallback(async () => {
    try {
      const token = await getToken();
      const response = await apiClient.get('/api/driver-profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const profile = response.data?.data;
      const trailer = profile?.trailerType;
      if (trailer) {
        setDriverTrailerType(trailer);
        setTrailerFilter((previous) => (previous === 'all' ? trailer : previous));
      }
      setEquipmentCapacity(
        typeof profile?.maxVehicleCapacity === 'number'
          ? profile.maxVehicleCapacity
          : null,
      );
    } catch {
      // The board remains usable; the backend still enforces compatibility.
    }
  }, [getToken]);

  React.useEffect(() => {
    void fetchDriverProfile();
  }, [fetchDriverProfile]);

  React.useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void fetchDriverProfile();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [fetchDriverProfile]);

  const fetchLoads = React.useCallback(
    async (pageNumber = 1, append = false) => {
      try {
        const token = await getToken();
        const response = await apiClient.get(
          `/api/driver-tracking/available-loads?page=${pageNumber}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const responseData = response.data?.data;
        const nextLoads = (responseData?.loads || responseData || []).map(normalizeLoad);
        const nextPagination = responseData?.pagination || null;
        setLoads((previous) => (append ? [...previous, ...nextLoads] : nextLoads));
        setPagination(nextPagination);
        setPage(append ? pageNumber : 1);
      } catch (error: any) {
        toast.error(extractErr(error, 'Failed to load available loads'));
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [getToken],
  );

  React.useEffect(() => {
    void fetchLoads();
    const poll = window.setInterval(() => void fetchLoads(), 30000);
    return () => window.clearInterval(poll);
  }, [fetchLoads]);

  React.useEffect(() => {
    let mounted = true;
    const setup = async () => {
      const token = await getToken();
      if (!token || !mounted) return;
      const socket = initializeSocket(token);
      const refresh = () => {
        if (mounted) void fetchLoads();
      };
      socket.on('driver:loads_updated', refresh);
      socket.on('driver:load_requested', refresh);
      socket.on('driver:load_request_updated', refresh);
      socket.on('load:change', refresh);
    };
    void setup();
    return () => {
      mounted = false;
      const socket = getSocket();
      socket?.off('driver:loads_updated');
      socket?.off('driver:load_requested');
      socket?.off('driver:load_request_updated');
      socket?.off('load:change');
    };
  }, [getToken, fetchLoads]);

  const handleRequest = async (contract: DriverSignedContract) => {
    if (!requestTarget) return;
    if (!workEligibility.canTakeNewWork) {
      toast.error(
        workEligibility.blockReason ||
          'You are not eligible to request a new load right now.',
      );
      return;
    }

    const compatibility = requestTarget.compatibility;
    if (compatibility && !compatibility.driverRequestAllowed) {
      toast.error(
        compatibility.capacity.status === 'exceeded'
          ? 'This load exceeds your configured vehicle capacity.'
          : 'Your vehicle capacity must be verified before requesting this load.',
      );
      return;
    }

    setRequesting(true);
    try {
      const token = await getToken();
      await apiClient.post(
        `/api/driver-tracking/loads/${requestTarget._id}/request`,
        {
          ...contract,
          overrideAvailability:
            compatibility?.availability.status === 'off_schedule',
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success('Load request submitted — pending dispatcher approval');
      setShowContractModal(false);
      setRequestTarget(null);
      await fetchLoads();
    } catch (error: any) {
      toast.error(extractErr(error, 'Failed to request load'));
    } finally {
      setRequesting(false);
    }
  };

  const handleMessageCreator = React.useCallback(
    async (load: AvailableLoad) => {
      setChatOpeningLoadId(load._id);
      try {
        const token = await getToken();
        if (!token) {
          toast.error('Your session is unavailable. Please sign in again.');
          return;
        }

        const response = await apiClient.post(
          `/api/driver-tracking/dispatch-chat/load/${encodeURIComponent(load._id)}/open`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const thread = response.data?.data?.thread as
          | DispatchChatThreadSummary
          | undefined;

        if (!thread?.id || !thread.driver?.id || !thread.dispatcher?.id) {
          throw new Error('The load creator conversation could not be opened');
        }

        setChatThread(thread);
        setChatOpen(true);
      } catch (error: any) {
        toast.error(
          extractErr(
            error,
            'The creator of this load is unavailable for Suprah Dispatch Chat',
          ),
        );
      } finally {
        setChatOpeningLoadId(null);
      }
    },
    [getToken],
  );

  const uniqueTrailers = React.useMemo(() => {
    const values = new Set(
      loads.map((load) => load.trailerTypeRequired).filter(Boolean) as string[],
    );
    if (driverTrailerType) values.add(driverTrailerType);
    return Array.from(values);
  }, [loads, driverTrailerType]);

  const filtered = React.useMemo(() => {
    const query = search.toLowerCase().trim();
    const matching = loads.filter((load) => {
      if (trailerFilter !== 'all') {
        const loadTrailer = (load.trailerTypeRequired || '')
          .toLowerCase()
          .replace(/[\s-]/g, '_');
        const filterTrailer = trailerFilter.toLowerCase().replace(/[\s-]/g, '_');
        if (loadTrailer !== filterTrailer) return false;
      }
      if (!query) return true;
      return getLoadSearchText(load).includes(query);
    });

    return [...matching].sort((a, b) => {
      switch (sortBy) {
        case 'pay-high':
          return getPay(b) - getPay(a);
        case 'pay-low':
          return getPay(a) - getPay(b);
        case 'pickup-soon':
          return (
            new Date(a.dates?.firstAvailable || a.dates?.pickupDeadline || a.createdAt).getTime() -
            new Date(b.dates?.firstAvailable || b.dates?.pickupDeadline || b.createdAt).getTime()
          );
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [loads, search, trailerFilter, sortBy]);

  const pendingCount = loads.filter((load) => load.myRequestStatus === 'pending').length;
  const avgPay = loads.length
    ? Math.round(loads.reduce((sum, load) => sum + getPay(load), 0) / loads.length)
    : 0;
  const highPay = loads.length ? Math.max(...loads.map(getPay)) : 0;

  const sortOptions: Array<{
    key: SortMode;
    label: string;
    icon: React.ElementType;
  }> = [
    { key: 'newest', label: 'Newest First', icon: Clock },
    { key: 'pay-high', label: 'Highest Pay', icon: TrendingUp },
    { key: 'pay-low', label: 'Lowest Pay', icon: DollarSign },
    { key: 'pickup-soon', label: 'Pickup Soonest', icon: CalendarClock },
  ];

  const requestCompatibility = requestTarget?.compatibility;
  const capacityBlocked = Boolean(
    requestCompatibility && !requestCompatibility.driverRequestAllowed,
  );
  const offSchedule =
    requestCompatibility?.availability.status === 'off_schedule';
  const requestBlocked =
    requesting || capacityBlocked || !workEligibility.canTakeNewWork;

  return (
    <div className="mx-auto max-w-5xl px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-5"
      >
        <div className="relative overflow-hidden rounded-3xl border border-slate-300/80 shadow-lg ring-1 ring-slate-200/50 dark:border-white/15 dark:shadow-2xl dark:ring-white/[0.03]">
          <div className="absolute inset-0 bg-linear-to-br from-white via-slate-50 to-cyan-50/70 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
          <div className="relative p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <Link href="/driver" className="shrink-0 rounded-xl border border-border/80 bg-background/80 p-2.5 shadow-sm transition-colors hover:bg-muted dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10">
                  <ArrowLeft className="size-4.5 text-foreground/80" />
                </Link>
                <div className="min-w-0">
                  <h1 className="break-words text-2xl font-black tracking-tight text-foreground [overflow-wrap:anywhere] sm:text-3xl">Load Board</h1>
                  <p className="mt-0.5 break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
                    {loading ? 'Scanning...' : `${loads.length} load${loads.length === 1 ? '' : 's'} available`}
                    {pendingCount > 0 && <span className="ml-1.5 font-semibold text-amber-500">· {pendingCount} pending</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2 py-0.5 sm:flex">
                  <Zap className="size-3 text-emerald-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Live</span>
                </div>
                <div className="hidden rounded-lg border border-border/80 bg-background/70 p-1 text-[11px] font-semibold sm:block">
                  <MapIcon className="mr-1 inline size-3.5" />Map <span className="text-[9px] font-bold uppercase text-amber-500">Soon</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setRefreshing(true); void fetchLoads(1, false); }} disabled={refreshing} className="border border-border/80">
                  <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} />
                </Button>
              </div>
            </div>

            {!loading && loads.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat value={loads.length.toString()} label="Available" />
                <Stat
                  value={equipmentCapacity != null ? `${equipmentCapacity} vehicles` : 'Not set'}
                  label="Equipment Capacity"
                  className={equipmentCapacity == null ? 'text-amber-500' : 'text-indigo-500'}
                />
                <Stat value={`$${avgPay.toLocaleString()}`} label="Avg Pay" className="text-emerald-500" />
                <Stat value={`$${highPay.toLocaleString()}`} label="Top Pay" className="text-emerald-500" />
              </div>
            )}
          </div>
        </div>

        {!workEligibility.canTakeNewWork && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">New load requests are temporarily unavailable</p>
              <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                {workEligibility.blockReason || 'Return your Work Availability to Active before requesting new work.'}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by city, tracking #, or vehicle..." value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 rounded-xl pl-9" />
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 gap-1.5 rounded-xl">
                  <ArrowUpDown className="size-3.5" />
                  <span className="hidden sm:inline">{sortOptions.find((option) => option.key === sortBy)?.label}</span>
                  <ChevronDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">Sort By</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {sortOptions.map((option) => (
                  <DropdownMenuItem key={option.key} onClick={() => setSortBy(option.key)} className={sortBy === option.key ? 'bg-accent' : ''}>
                    <option.icon className="mr-2 size-3.5" />{option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className={cn('h-10 gap-1.5 rounded-xl', trailerFilter !== 'all' && 'border-primary/40 bg-primary/5')}>
                  <Filter className="size-3.5" />
                  <span className="hidden sm:inline">{trailerFilter === 'all' ? 'All Trailers' : trailerLabel(trailerFilter)}</span>
                  <ChevronDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">Trailer Filter</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setTrailerFilter('all')} className={trailerFilter === 'all' ? 'bg-accent' : ''}>All Trailers</DropdownMenuItem>
                {uniqueTrailers.map((trailer) => (
                  <DropdownMenuItem key={trailer} onClick={() => setTrailerFilter(trailer)} className={trailerFilter === trailer ? 'bg-accent' : ''}>{trailerLabel(trailer)}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Scanning Load Board</p>
          </div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-2xl border-border/60">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <Package className="mb-3 size-8 opacity-30" />
              <p className="text-sm font-bold">{search || trailerFilter !== 'all' ? 'No loads match your filters' : 'No loads posted to the board right now'}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <AnimatePresence mode="popLayout">
              <div className="grid gap-3">
                {filtered.map((load, index) => (
                  <motion.div key={load._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: index * 0.02 }}>
                    <LoadCard
                      load={load}
                      canTakeNewWork={workEligibility.canTakeNewWork}
                      chatOpening={chatOpeningLoadId === load._id}
                      onMessageCreator={() => void handleMessageCreator(load)}
                      onRequest={() => setRequestTarget(load)}
                    />
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
            {pagination?.hasMore && (
              <Button variant="outline" className="h-10 w-full rounded-xl" disabled={loadingMore} onClick={async () => { setLoadingMore(true); await fetchLoads(page + 1, true); }}>
                {loadingMore ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ChevronDown className="mr-2 size-4" />}
                {loadingMore ? 'Loading...' : 'Load more loads'}
              </Button>
            )}
          </>
        )}
      </motion.div>

      <Dialog
        open={requestTarget !== null}
        onOpenChange={(open) => {
          if (!open && !requesting) {
            setRequestTarget(null);
            setShowContractModal(false);
          }
        }}
      >
        <DialogContent
          className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:max-w-lg"
          overlayClassName="bg-black/70 backdrop-blur-[3px]"
        >
          <DialogHeader className="shrink-0 border-b border-border/60 px-4 py-4 text-left sm:px-5">
            <DialogTitle className="flex items-start gap-2 pr-7 text-base font-black sm:text-lg">
              <Truck className="mt-0.5 size-5 shrink-0 text-primary" />
              <span className="break-words [overflow-wrap:anywhere]">Request Load Assignment</span>
            </DialogTitle>
            <DialogDescription className="break-words text-xs leading-relaxed [overflow-wrap:anywhere] sm:text-sm">
              Review your pickup-day availability and equipment capacity before signing.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
            {requestTarget && (
              <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <Badge variant="outline" className="break-all text-[10px] [overflow-wrap:anywhere]">{requestTarget.trackingNumber || requestTarget._id.slice(-8)}</Badge>
                  {getPay(requestTarget) > 0 && <span className="text-sm font-black text-emerald-600">${getPay(requestTarget).toLocaleString()}</span>}
                </div>
                <p className="break-words text-sm font-semibold [overflow-wrap:anywhere]">{requestTarget.origin} → {requestTarget.destination}</p>
                <CompatibilityBadges compatibility={requestTarget.compatibility} />
              </div>
            )}

            {capacityBlocked && (
              <div className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/5 p-3.5">
                <XCircle className="mt-0.5 size-4 shrink-0 text-red-500" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-red-700 dark:text-red-400">This load cannot be self-requested with the current equipment profile</p>
                  <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                    {requestCompatibility?.capacity.status === 'exceeded'
                      ? `The load requires ${requestCompatibility.capacity.requiredVehicles} vehicle${requestCompatibility.capacity.requiredVehicles === 1 ? '' : 's'}, while your configured capacity is ${requestCompatibility.capacity.maxVehicles}.`
                      : 'Your vehicle capacity could not be verified. Update Equipment or contact Dispatch.'}
                  </p>
                </div>
              </div>
            )}

            {offSchedule && !capacityBlocked && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3.5">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Outside your regular availability</p>
                  <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                    This pickup is scheduled for {titleCaseDay(requestCompatibility?.availability.pickupDay) || 'an off-schedule day'}. You may still request it if you are available to work that day.
                  </p>
                </div>
              </div>
            )}

            {!workEligibility.canTakeNewWork && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3.5">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                <p className="break-words text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{workEligibility.blockReason}</p>
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t border-border/60 px-4 py-3 sm:px-5">
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
              <Button variant="outline" className="h-10" onClick={() => setRequestTarget(null)} disabled={requesting}>Cancel</Button>
              <Button
                className="h-10 gap-2 font-bold"
                onClick={() => setShowContractModal(true)}
                disabled={requestBlocked}
              >
                <Truck className="size-4" />
                {capacityBlocked
                  ? 'Capacity Mismatch'
                  : !workEligibility.canTakeNewWork
                    ? 'Unavailable for New Work'
                    : offSchedule
                      ? 'Continue Anyway & Sign'
                      : 'Continue to Sign'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DriverContractModal
        isOpen={showContractModal}
        onClose={() => setShowContractModal(false)}
        onConfirm={handleRequest}
        isSubmitting={requesting}
        title={offSchedule ? 'Request Outside Regular Schedule' : 'Request This Load'}
        description={
          offSchedule
            ? 'You confirmed that you are available for this off-schedule pickup. Review and sign the transport contract to submit your request.'
            : 'Review and sign the transport contract to submit your request.'
        }
        confirmLabel={offSchedule ? 'Request Anyway & Sign' : 'Request & Sign'}
      />

      <DispatchChatDialog
        open={chatOpen}
        onOpenChange={(nextOpen) => {
          setChatOpen(nextOpen);
          if (!nextOpen) setChatThread(null);
        }}
        driverId={chatThread?.driver?.id}
        initialThread={chatThread}
      />
    </div>
  );
}

function Stat({ value, label, className }: { value: string; label: string; className?: string }) {
  return (
    <div className="rounded-xl border border-border/80 bg-background/70 p-3 text-center shadow-sm dark:border-white/15 dark:bg-white/5">
      <p className={cn('break-words text-base font-black tabular-nums [overflow-wrap:anywhere] sm:text-lg', className)}>{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}

function LoadCard({
  load,
  onRequest,
  onMessageCreator,
  canTakeNewWork,
  chatOpening,
}: {
  load: AvailableLoad;
  onRequest: () => void;
  onMessageCreator: () => void;
  canTakeNewWork: boolean;
  chatOpening: boolean;
}) {
  const quote = load.preservedQuoteData;
  const isRequested = load.myRequestStatus === 'pending';
  const isRejected = load.myRequestStatus === 'rejected';
  const vehicles = load.vehicles || [];
  const vehicleName =
    quote?.vehicleName ||
    (vehicles.length
      ? `${vehicles[0].year || ''} ${vehicles[0].make || ''} ${vehicles[0].model || ''}`.trim()
      : undefined);
  const pay = getPay(load);
  const capacityBlocked = Boolean(
    load.compatibility && !load.compatibility.driverRequestAllowed,
  );
  const offSchedule = load.compatibility?.availability.status === 'off_schedule';
  const hasMismatch = hasCompatibilityMismatch(load.compatibility);

  return (
    <Link href={`/driver/available-loads/${load._id}`} className="group block">
      <Card className={cn('overflow-hidden rounded-2xl border-border/75 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-xl', isRequested && 'border-amber-500/30 bg-amber-500/3', isRejected && 'border-red-500/20 opacity-75')}>
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">
            <div className="relative h-40 w-full shrink-0 overflow-hidden sm:h-auto sm:w-48">
              <img
                src={resolveImageUrl(quote?.vehicleImage) || FALLBACK}
                alt={vehicleName || 'Vehicle'}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={(event) => {
                  const image = event.currentTarget;
                  if (image.src !== window.location.origin + FALLBACK) image.src = FALLBACK;
                }}
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent" />
              {pay > 0 && <div className="absolute bottom-2.5 right-2.5 rounded-lg bg-black/70 px-2.5 py-1 text-base font-black text-emerald-400 backdrop-blur-sm">${pay.toLocaleString()}</div>}
            </div>

            <div className="min-w-0 flex-1 space-y-3 p-4">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="break-all text-[10px] font-bold font-mono [overflow-wrap:anywhere]">{load.trackingNumber || load._id.slice(-8)}</Badge>
                    {load.trailerTypeRequired && <Badge className="h-auto whitespace-normal border-blue-500/20 bg-blue-500/10 text-[10px] text-blue-600"><Truck className="mr-1 size-2.5" />{trailerLabel(load.trailerTypeRequired)}</Badge>}
                    {load.vehicleCount != null && <Badge className="h-auto bg-purple-500/10 text-[10px] text-purple-600">{load.vehicleCount} vehicle{load.vehicleCount === 1 ? '' : 's'}</Badge>}
                    {isRequested && <Badge className="bg-amber-500/10 text-[9px] text-amber-600"><Timer className="mr-1 size-2.5" />Pending</Badge>}
                  </div>
                  {vehicleName && <p className="break-words text-sm font-bold [overflow-wrap:anywhere]">{vehicleName}</p>}
                </div>
              </div>

              <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-1 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs font-semibold sm:flex sm:items-center">
                <span className="size-2 rounded-full bg-emerald-500" />
                <span className="break-words [overflow-wrap:anywhere]">{load.origin}</span>
                <Navigation className="size-3 text-muted-foreground/40" />
                <span className="break-words [overflow-wrap:anywhere]">{load.destination}</span>
              </div>

              <CompatibilityBadges compatibility={load.compatibility} />

              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="size-3" />{fmtDate(load.dates?.firstAvailable || load.dates?.pickupDeadline)}</span>
                  {quote?.miles && <span className="flex items-center gap-1"><Navigation className="size-3" />{quote.miles.toLocaleString()} mi</span>}
                  <span className="flex items-center gap-1"><Clock className="size-3" />{timeAgo(load.createdAt)}</span>
                </div>

                {hasMismatch && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={chatOpening}
                    className="h-8 gap-1.5 border-emerald-500/30 bg-emerald-500/5 px-3 text-[10px] font-bold text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onMessageCreator();
                    }}
                    aria-label={`Message the creator of ${load.trackingNumber || load.loadNumber || 'this load'}`}
                  >
                    {chatOpening ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <MessageSquare className="size-3" />
                    )}
                    {chatOpening ? 'Opening Chat…' : 'Message Creator'}
                  </Button>
                )}

                {!isRequested && !isRejected && (
                  <Button
                    size="sm"
                    className="h-8 gap-1 px-3 text-[10px] font-bold"
                    variant={capacityBlocked ? 'outline' : 'default'}
                    disabled={capacityBlocked || !canTakeNewWork}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onRequest();
                    }}
                  >
                    {capacityBlocked ? <XCircle className="size-3" /> : offSchedule ? <AlertTriangle className="size-3" /> : <Truck className="size-3" />}
                    {capacityBlocked ? 'Capacity Mismatch' : offSchedule ? 'Request Anyway' : 'Request'}
                  </Button>
                )}
                {isRequested && <Badge variant="outline" className="border-amber-500/30 text-[10px] text-amber-600"><Timer className="mr-1 size-3" />Awaiting Approval</Badge>}
                <ChevronRight className="size-4 text-muted-foreground/30 transition-colors group-hover:text-primary" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
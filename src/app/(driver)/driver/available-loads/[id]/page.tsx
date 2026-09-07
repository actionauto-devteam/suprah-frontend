'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Car,
  CheckCircle2,
  DollarSign,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Navigation,
  Package,
  Phone,
  Timer,
  Truck,
  User2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, resolveImageUrl } from '@/lib/utils';
import { trailerTypeOptions } from '@/components/driver-profile/driver-profile-constants';
import { useTheme } from '@/context/ThemeContext';
import {
  DriverContractModal,
  DriverSignedContract,
} from '@/components/create-load/DriverContractModal';
import { useDriverWorkEligibility } from '@/hooks/useDriverWorkEligibility';
import type { DriverLoadCompatibility } from '@/types/driver-tracking';
import { titleCaseDay } from '@/lib/driver-load-compatibility';
import { DriverLoadRecommendationBadges } from '@/components/driver-tracker/DriverLoadRecommendationBadges';

const FALLBACK = '/vehicle-placeholder.jpg';

const fmtDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : '';

const trailerLabel = (value?: string) =>
  trailerTypeOptions.find((item) => item.value === value)?.label || value || 'Any';

const extractErr = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

function locationLabel(location: any, fallback?: string) {
  if (fallback) return fallback;
  return [location?.city, location?.state].filter(Boolean).join(', ');
}

function normalizeLoad(raw: any) {
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
    carrierPayAmount:
      raw?.carrierPayAmount ?? raw?.pricing?.carrierPayAmount ?? null,
    copCodAmount: raw?.copCodAmount ?? raw?.pricing?.copCodAmount ?? null,
    originContact: raw?.originContact || raw?.pickupLocation || null,
    destinationContact: raw?.destinationContact || raw?.deliveryLocation || null,
    specialInstructions:
      raw?.specialInstructions || raw?.additionalInfo?.instructions || '',
    preDispatchNotes:
      raw?.preDispatchNotes || raw?.additionalInfo?.notes || '',
    vehicles,
  };
}

function CompatibilityPanel({ compatibility }: { compatibility?: DriverLoadCompatibility }) {
  if (!compatibility) return null;
  const availability = compatibility.availability.status;
  const capacity = compatibility.capacity.status;

  return (
    <Card className="overflow-hidden rounded-2xl border-border/40">
      <div className="border-b border-border/40 px-4 py-3">
        <h3 className="text-sm font-black uppercase tracking-wider">Load Compatibility</h3>
      </div>
      <CardContent className="space-y-3 p-4">
        <div
          className={cn(
            'flex items-start gap-3 rounded-xl border p-3',
            availability === 'match'
              ? 'border-emerald-500/20 bg-emerald-500/5'
              : availability === 'off_schedule'
                ? 'border-amber-500/25 bg-amber-500/5'
                : 'border-border/50 bg-muted/15',
          )}
        >
          {availability === 'match' ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
          ) : availability === 'off_schedule' ? (
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
          ) : (
            <Calendar className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0">
            <p className="break-words text-sm font-bold [overflow-wrap:anywhere]">
              {availability === 'match'
                ? `Available ${titleCaseDay(compatibility.availability.pickupDay) || 'on pickup day'}`
                : availability === 'off_schedule'
                  ? `Outside Regular Availability · ${titleCaseDay(compatibility.availability.pickupDay) || 'Pickup day'}`
                  : 'Regular Availability Could Not Be Compared'}
            </p>
            <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
              {availability === 'off_schedule'
                ? 'You can still request this load if you are available to work outside your normal weekly schedule.'
                : availability === 'unknown'
                  ? 'No regular work days are configured or the pickup date is not available. This does not block the request by itself.'
                  : 'The pickup falls on one of your selected regular work days.'}
            </p>
          </div>
        </div>

        <div
          className={cn(
            'flex items-start gap-3 rounded-xl border p-3',
            capacity === 'match'
              ? 'border-emerald-500/20 bg-emerald-500/5'
              : 'border-red-500/25 bg-red-500/5',
          )}
        >
          {capacity === 'match' ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
          ) : capacity === 'exceeded' ? (
            <XCircle className="mt-0.5 size-4 shrink-0 text-red-500" />
          ) : (
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" />
          )}
          <div className="min-w-0">
            <p className="break-words text-sm font-bold [overflow-wrap:anywhere]">
              {capacity === 'match'
                ? `Capacity Fits · ${compatibility.capacity.requiredVehicles}/${compatibility.capacity.maxVehicles}`
                : capacity === 'exceeded'
                  ? `Capacity Exceeded · ${compatibility.capacity.requiredVehicles}/${compatibility.capacity.maxVehicles}`
                  : 'Vehicle Capacity Not Verified'}
            </p>
            <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
              {capacity === 'match'
                ? 'Your configured equipment can accommodate the vehicles on this load.'
                : capacity === 'exceeded'
                  ? 'Drivers cannot self-request a load that exceeds their configured equipment capacity. Contact Dispatch if your equipment profile is outdated.'
                  : 'Update your Equipment profile or contact Dispatch before requesting this load.'}
            </p>
          </div>
        </div>

        {compatibility.trailer.status === 'mismatch' && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <div className="min-w-0">
              <p className="text-sm font-bold">Trailer Type Mismatch</p>
              <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                This is shown as a planning warning. Dispatch can verify whether another approved equipment configuration is available.
              </p>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border/50 bg-muted/15 p-3">
          <p className="mb-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
            Dispatch Matching Information
          </p>
          <DriverLoadRecommendationBadges
            compatibility={compatibility}
            showUnknown
          />
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Service area, preferred route, and pickup distance are planning preferences only. They do not prevent you from requesting an otherwise eligible load.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AvailableLoadDetailPage() {
  const { getToken } = useAuth();
  const { theme } = useTheme();
  const workEligibility = useDriverWorkEligibility();
  const params = useParams();
  const router = useRouter();
  const loadId = params.id as string;
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [requesting, setRequesting] = React.useState(false);
  const [showContract, setShowContract] = React.useState(false);
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<any>(null);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const fetchDetail = React.useCallback(async () => {
    try {
      const token = await getToken();
      const response = await apiClient.get(
        `/api/driver-tracking/loads/${encodeURIComponent(loadId)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setData(normalizeLoad(response.data?.data));
    } catch (error: any) {
      toast.error(extractErr(error, 'Failed to load details'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [getToken, loadId]);

  React.useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  React.useEffect(() => {
    if (!data || !mapboxToken || !mapRef.current) return;
    let cancelled = false;

    const init = async () => {
      const mapboxgl = (await import('mapbox-gl')).default;
      await import('mapbox-gl/dist/mapbox-gl.css');
      if (cancelled || mapInstanceRef.current || !mapRef.current) return;

      const geocode = async (query: string): Promise<[number, number] | null> => {
        try {
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&limit=1&country=US`,
          );
          const json = await response.json();
          return json.features?.[0]?.center || null;
        } catch {
          return null;
        }
      };

      const [originCoords, destinationCoords] = await Promise.all([
        geocode(data.origin),
        geocode(data.destination),
      ]);
      if (cancelled || !mapRef.current) return;

      const center: [number, number] = originCoords || [-98.58, 39.83];
      const map = new mapboxgl.Map({
        container: mapRef.current,
        style:
          theme === 'dark'
            ? 'mapbox://styles/mapbox/dark-v11'
            : 'mapbox://styles/mapbox/streets-v12',
        center,
        zoom: 5,
        accessToken: mapboxToken,
      });
      mapInstanceRef.current = map;
      map.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.on('load', () => {
        if (cancelled) return;
        const points: [number, number][] = [];

        const addMarker = (
          coordinates: [number, number] | null,
          label: string,
          background: string,
        ) => {
          if (!coordinates) return;
          points.push(coordinates);
          const element = document.createElement('div');
          element.innerHTML = `<div style="width:16px;height:16px;background:${background};border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.3);"></div>`;
          new mapboxgl.Marker({ element })
            .setLngLat(coordinates)
            .setPopup(
              new mapboxgl.Popup({ offset: 12 }).setText(label),
            )
            .addTo(map);
        };

        addMarker(originCoords, `Pickup: ${data.origin}`, '#10b981');
        addMarker(destinationCoords, `Delivery: ${data.destination}`, '#ef4444');

        if (originCoords && destinationCoords) {
          map.addSource('route-line', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: [originCoords, destinationCoords],
              },
            },
          });
          map.addLayer({
            id: 'route-line-layer',
            type: 'line',
            source: 'route-line',
            paint: {
              'line-color': '#3b82f6',
              'line-width': 3,
              'line-dasharray': [2, 1],
            },
          });
        }

        if (points.length >= 2) {
          const bounds = new mapboxgl.LngLatBounds();
          points.forEach((point) => bounds.extend(point));
          map.fitBounds(bounds, { padding: 60, duration: 800 });
        } else if (points.length === 1) {
          map.flyTo({ center: points[0], zoom: 8, duration: 800 });
        }
      });
    };

    void init();
    return () => {
      cancelled = true;
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, [data, mapboxToken, theme]);

  const handleRequest = async (contract: DriverSignedContract) => {
    if (!data) return;
    if (!workEligibility.canTakeNewWork) {
      toast.error(workEligibility.blockReason || 'You are not eligible for new work right now.');
      return;
    }

    const compatibility: DriverLoadCompatibility | undefined = data.compatibility;
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
        `/api/driver-tracking/loads/${encodeURIComponent(data._id)}/request`,
        {
          ...contract,
          overrideAvailability:
            compatibility?.availability.status === 'off_schedule',
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success('Load request submitted — pending dispatcher approval');
      setShowContract(false);
      await fetchDetail();
    } catch (error: any) {
      toast.error(extractErr(error, 'Failed to request load'));
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Loading Details</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <Package className="mx-auto mb-4 size-10 text-muted-foreground/30" />
        <h2 className="text-xl font-black">Load Not Found</h2>
        <p className="mt-2 text-sm text-muted-foreground">This load may have been removed or already assigned.</p>
        <Button asChild className="mt-4 h-11 gap-2 rounded-xl">
          <Link href="/driver/available-loads"><ArrowLeft className="size-4" />Back to Load Board</Link>
        </Button>
      </div>
    );
  }

  const quote = data.preservedQuoteData;
  const vehicleName = quote?.vehicleName;
  const vehicleImage = quote?.vehicleImage;
  const vehicles = data.vehicles || [];
  const pay = data.pricing?.carrierPayAmount || data.carrierPayAmount || quote?.rate || 0;
  const miles = quote?.miles || data.estimatedMiles;
  const isRequested = data.myRequestStatus === 'pending' || data.hasRequested;
  const isRejected = data.myRequestStatus === 'rejected';
  const compatibility: DriverLoadCompatibility | undefined = data.compatibility;
  const capacityBlocked = Boolean(compatibility && !compatibility.driverRequestAllowed);
  const offSchedule = compatibility?.availability.status === 'off_schedule';
  const canRequest =
    !isRequested &&
    !isRejected &&
    !capacityBlocked &&
    workEligibility.canTakeNewWork;

  return (
    <div className="mx-auto max-w-4xl px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-5">
        <div className="relative overflow-hidden rounded-3xl border border-slate-300/80 dark:border-white/15 shadow-lg dark:shadow-2xl ring-1 ring-slate-200/50 dark:ring-white/[0.03]">
          <div className="absolute inset-0 bg-linear-to-br from-white via-slate-50 to-cyan-50/70 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
          <div className="relative p-5 sm:p-7">
            <div className="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <button onClick={() => router.back()} className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/80 dark:border-white/10 bg-background/80 dark:bg-white/5 transition-colors hover:bg-muted dark:hover:bg-white/10">
                  <ArrowLeft className="size-4.5 text-foreground/80 dark:text-white/80" />
                </button>
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                    <h1 className="break-all font-mono text-xl font-black tracking-tight text-foreground [overflow-wrap:anywhere] sm:text-2xl">{data.trackingNumber || data.loadNumber || loadId.slice(-8)}</h1>
                    <Badge className="bg-blue-500/10 text-[10px] text-blue-600 dark:text-blue-400">Available</Badge>
                    {isRequested && <Badge className="bg-amber-500/10 text-[10px] text-amber-600 dark:text-amber-400"><Timer className="mr-1 size-2.5" />Requested</Badge>}
                  </div>
                  <p className="mt-0.5 break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">{vehicleName || `${data.origin} → ${data.destination}`}</p>
                </div>
              </div>
              {pay > 0 && <span className="text-3xl font-black tabular-nums text-foreground">${pay.toLocaleString()}</span>}
            </div>

            <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-2 rounded-xl border border-border/80 dark:border-white/10 bg-background/70 dark:bg-white/5 px-4 py-3 text-sm font-semibold text-foreground sm:flex sm:items-center">
              <span className="size-3 rounded-full bg-emerald-500 dark:bg-emerald-400" />
              <span className="break-words [overflow-wrap:anywhere]">{data.origin}</span>
              <Navigation className="size-3.5 text-muted-foreground" />
              <span className="break-words [overflow-wrap:anywhere]">{data.destination}</span>
            </div>
          </div>
        </div>

        <CompatibilityPanel compatibility={compatibility} />

        {!workEligibility.canTakeNewWork && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <p className="break-words text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{workEligibility.blockReason}</p>
          </div>
        )}

        <div className="flex min-w-0 flex-wrap gap-2">
          {canRequest && (
            <Button onClick={() => setShowContract(true)} className="h-11 flex-1 gap-2 rounded-xl text-sm font-bold shadow-lg sm:flex-none">
              {offSchedule ? <AlertTriangle className="size-4" /> : <Truck className="size-4" />}
              {offSchedule ? 'Request Anyway' : 'Request This Load'}
            </Button>
          )}
          {capacityBlocked && (
            <Badge className="h-auto min-h-11 whitespace-normal border-red-500/25 bg-red-500/10 px-4 py-2 text-sm leading-relaxed text-red-700 dark:text-red-400">
              <XCircle className="mr-2 size-4 shrink-0" />Capacity mismatch — contact Dispatch
            </Badge>
          )}
          {isRequested && (
            <Badge className="h-auto min-h-11 whitespace-normal border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm text-amber-600 dark:text-amber-400">
              <Timer className="mr-2 size-4 shrink-0" />Request Pending — Awaiting Approval
            </Badge>
          )}
        </div>

        <Card className="overflow-hidden rounded-2xl border-border/40 shadow-xl">
          <CardContent className="p-0">
            {mapboxToken ? (
              <div ref={mapRef} className="h-75 w-full" />
            ) : (
              <div className="flex h-75 items-center justify-center bg-muted/30 text-center">
                <div><MapPin className="mx-auto size-10 text-muted-foreground/30" /><p className="mt-2 text-xs text-muted-foreground">Route map unavailable</p></div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="overflow-hidden rounded-2xl border-border/40 md:col-span-2">
            <div className="relative h-56 sm:h-72">
              <img
                src={resolveImageUrl(vehicleImage) || FALLBACK}
                alt={vehicleName || 'Vehicle'}
                className="h-full w-full object-cover"
                onError={(event) => {
                  const image = event.currentTarget;
                  if (image.src !== window.location.origin + FALLBACK) image.src = FALLBACK;
                }}
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                {vehicleName && <p className="break-words text-xl font-black text-white [overflow-wrap:anywhere]">{vehicleName}</p>}
                {miles && <p className="text-sm text-white/70">{miles.toLocaleString()} miles</p>}
              </div>
            </div>
          </Card>

          {vehicles.length > 0 && (
            <Card className="overflow-hidden rounded-2xl border-border/40 md:col-span-2">
              <div className="border-b border-border/40 p-4"><h3 className="text-sm font-black uppercase tracking-wider">Vehicles ({vehicles.length})</h3></div>
              <CardContent className="grid gap-2 p-4">
                {vehicles.map((vehicle: any, index: number) => (
                  <div key={`${vehicle.vin || vehicle.vehicleId || index}`} className="flex min-w-0 items-start gap-3 rounded-xl border border-border/40 bg-muted/10 p-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Car className="size-5 text-primary" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-bold [overflow-wrap:anywhere]">{`${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'Unknown Vehicle'}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                        {vehicle.color && <span>{vehicle.color}</span>}
                        {vehicle.condition && <span>· {vehicle.condition}</span>}
                        {vehicle.vin && <span className="break-all font-mono [overflow-wrap:anywhere]">VIN: {vehicle.vin}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <InfoCard icon={<Calendar className="size-4 text-primary" />} title="Schedule">
            <DetailRow label="First Available" value={fmtDate(data.dates?.firstAvailable)} />
            <DetailRow label="Pickup Deadline" value={fmtDate(data.dates?.pickupDeadline)} />
            <DetailRow label="Delivery Deadline" value={fmtDate(data.dates?.deliveryDeadline)} />
          </InfoCard>

          <InfoCard icon={<DollarSign className="size-4 text-emerald-500" />} title="Financials">
            {pay > 0 && <DetailRow label="Carrier Pay" value={`$${pay.toLocaleString()}`} />}
            {miles && <DetailRow label="Distance" value={`${miles.toLocaleString()} miles`} />}
            {data.copCodAmount > 0 && <DetailRow label="COD" value={`$${data.copCodAmount.toLocaleString()}`} />}
            {data.trailerTypeRequired && <DetailRow label="Trailer Required" value={trailerLabel(data.trailerTypeRequired)} />}
          </InfoCard>

          {(data.originContact?.contactName || data.originContact?.phone || data.originContact?.email) && (
            <InfoCard icon={<User2 className="size-4 text-primary" />} title="Pick-Up Contact">
              {data.originContact.contactName && <DetailRow label="Contact" value={data.originContact.contactName} />}
              {data.originContact.phone && <a href={`tel:${data.originContact.phone}`} className="flex min-w-0 items-center gap-2 break-all text-sm text-primary [overflow-wrap:anywhere] hover:underline"><Phone className="size-4 shrink-0" />{data.originContact.phone}</a>}
              {data.originContact.email && <a href={`mailto:${data.originContact.email}`} className="flex min-w-0 items-center gap-2 break-all text-sm text-primary [overflow-wrap:anywhere] hover:underline"><Mail className="size-4 shrink-0" />{data.originContact.email}</a>}
            </InfoCard>
          )}

          {(data.destinationContact?.contactName || data.destinationContact?.phone || data.destinationContact?.email) && (
            <InfoCard icon={<User2 className="size-4 text-primary" />} title="Delivery Contact">
              {data.destinationContact.contactName && <DetailRow label="Contact" value={data.destinationContact.contactName} />}
              {data.destinationContact.phone && <a href={`tel:${data.destinationContact.phone}`} className="flex min-w-0 items-center gap-2 break-all text-sm text-primary [overflow-wrap:anywhere] hover:underline"><Phone className="size-4 shrink-0" />{data.destinationContact.phone}</a>}
              {data.destinationContact.email && <a href={`mailto:${data.destinationContact.email}`} className="flex min-w-0 items-center gap-2 break-all text-sm text-primary [overflow-wrap:anywhere] hover:underline"><Mail className="size-4 shrink-0" />{data.destinationContact.email}</a>}
            </InfoCard>
          )}

          {(data.preDispatchNotes || data.specialInstructions) && (
            <Card className="overflow-hidden rounded-2xl border-border/40 md:col-span-2">
              <div className="border-b border-border/40 p-4"><div className="flex items-center gap-2"><FileText className="size-4 text-primary" /><h3 className="text-sm font-black uppercase tracking-wider">Notes & Instructions</h3></div></div>
              <CardContent className="space-y-4 p-4">
                {data.preDispatchNotes && <div><p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Dispatch Notes</p><p className="break-words text-sm leading-relaxed [overflow-wrap:anywhere]">{data.preDispatchNotes}</p></div>}
                {data.specialInstructions && <div><p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Special Instructions</p><p className="break-words text-sm leading-relaxed [overflow-wrap:anywhere]">{data.specialInstructions}</p></div>}
              </CardContent>
            </Card>
          )}
        </div>
      </motion.div>

      <DriverContractModal
        isOpen={showContract}
        onClose={() => setShowContract(false)}
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
    </div>
  );
}

function InfoCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/40">
      <div className="border-b border-border/40 p-4"><div className="flex items-center gap-2">{icon}<h3 className="text-sm font-black uppercase tracking-wider">{title}</h3></div></div>
      <CardContent className="space-y-3 p-4">{children}</CardContent>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex min-w-0 flex-wrap justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-words text-right font-semibold [overflow-wrap:anywhere]">{value}</span>
    </div>
  );
}
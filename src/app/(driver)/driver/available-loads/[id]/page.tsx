'use client';

import * as React from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Truck, ArrowLeft, ArrowRight, CheckCircle2, Clock, Loader2, MapPin,
    DollarSign, Navigation, Phone, Mail, User2,
    Calendar, Package, Car, Shield, Copy, FileText, ChevronRight,
    Timer, XCircle, Zap, Route, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cn, resolveImageUrl } from '@/lib/utils';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { trailerTypeOptions } from '@/components/driver-profile/driver-profile-constants';
import { useTheme } from '@/context/ThemeContext';
import { DriverContractModal, DriverSignedContract } from '@/components/create-load/DriverContractModal';

const FALLBACK = "/vehicle-placeholder.jpg";

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Denver' }) : '';
const trailerLabel = (val?: string) => trailerTypeOptions.find(t => t.value === val)?.label || val || 'Any';
const extractErr = (e: any, fb: string) => e?.response?.data?.message || e?.message || fb;

export default function AvailableLoadDetailPage() {
    const { getToken } = useAuth();
    const { theme } = useTheme();
    const params = useParams();
    const router = useRouter();
    const loadId = params.id as string;
    const [data, setData] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);
    const [requesting, setRequesting] = React.useState(false);
    const [showConfirm, setShowConfirm] = React.useState(false);
    const mapRef = React.useRef<HTMLDivElement>(null);
    const mapInst = React.useRef<any>(null);
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    const fetchDetail = React.useCallback(async () => {
        try {
            const token = await getToken();
            const res = await apiClient.get('/api/driver-tracking/available-loads', { headers: { Authorization: `Bearer ${token}` } });
            const responseData = res.data?.data;
            const loadsList = responseData?.loads || responseData || [];
            const found = loadsList.find((l: any) => l._id === loadId);
            if (found) setData(found);
        } catch (err: any) { toast.error(extractErr(err, 'Failed to load details')); }
        finally { setLoading(false); }
    }, [getToken, loadId]);

    React.useEffect(() => { fetchDetail(); }, [fetchDetail]);

    React.useEffect(() => {
        if (!data || !mapboxToken || !mapRef.current) return;
        let cancelled = false;
        const init = async () => {
            const mapboxgl = (await import('mapbox-gl')).default;
            // @ts-ignore
            await import('mapbox-gl/dist/mapbox-gl.css');
            if (cancelled || mapInst.current) return;

            const geocode = async (q: string): Promise<[number, number] | null> => {
                try {
                    const r = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${mapboxToken}&limit=1&country=US`);
                    const d = await r.json();
                    return d.features?.[0]?.center || null;
                } catch { return null; }
            };

            const [originCoords, destCoords] = await Promise.all([geocode(data.origin), geocode(data.destination)]);
            if (cancelled) return;

            const center: [number, number] = originCoords || [-98.58, 39.83];
            const map = new mapboxgl.Map({
                container: mapRef.current!,
                style: theme === "dark" ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/streets-v12",
                center,
                zoom: 5,
                accessToken: mapboxToken,
            });
            mapInst.current = map;
            map.addControl(new mapboxgl.NavigationControl(), 'top-right');

            map.on('load', () => {
                if (cancelled) return;
                const points: [number, number][] = [];

                if (originCoords) {
                    points.push(originCoords);
                    const el = document.createElement('div');
                    el.innerHTML = `<div style="width:16px;height:16px;background:#10b981;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`;
                    new mapboxgl.Marker({ element: el }).setLngLat(originCoords)
                        .setPopup(new mapboxgl.Popup({ offset: 12 }).setHTML(`<div style="padding:4px 8px;font-weight:700;font-size:12px;">Pickup: ${data.origin}</div>`))
                        .addTo(map);
                }

                if (destCoords) {
                    points.push(destCoords);
                    const el = document.createElement('div');
                    el.innerHTML = `<div style="width:16px;height:16px;background:#ef4444;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`;
                    new mapboxgl.Marker({ element: el }).setLngLat(destCoords)
                        .setPopup(new mapboxgl.Popup({ offset: 12 }).setHTML(`<div style="padding:4px 8px;font-weight:700;font-size:12px;">Delivery: ${data.destination}</div>`))
                        .addTo(map);
                }

                if (originCoords && destCoords) {
                    map.addSource('route-line', {
                        type: 'geojson',
                        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [originCoords, destCoords] } },
                    });
                    map.addLayer({ id: 'route-line-layer', type: 'line', source: 'route-line', paint: { 'line-color': '#3b82f6', 'line-width': 3, 'line-dasharray': [2, 1] } });
                }

                if (points.length >= 2) {
                    const bounds = new mapboxgl.LngLatBounds();
                    points.forEach(p => bounds.extend(p));
                    map.fitBounds(bounds, { padding: 60, duration: 800 });
                } else if (points.length === 1) {
                    map.flyTo({ center: points[0], zoom: 8, duration: 800 });
                }
            });
        };
        init();
        return () => { cancelled = true; mapInst.current?.remove(); mapInst.current = null; };
    }, [data, mapboxToken, theme]);

    const handleRequest = async (contract: DriverSignedContract) => {
        setRequesting(true);
        try {
            const token = await getToken();
            await apiClient.post(`/api/driver-tracking/loads/${data._id}/request`,
            contract,
            { headers: { Authorization: `Bearer ${token}` } });
            toast.success('Load request submitted — pending dispatcher approval');
            setShowConfirm(false);
            fetchDetail();
        } catch (err: any) { toast.error(extractErr(err, 'Failed to request load')); }
        finally { setRequesting(false); }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="relative"><div className="size-16 rounded-full border-4 border-blue-500/20 animate-pulse" /><Loader2 className="size-8 animate-spin text-blue-500 absolute inset-0 m-auto" /></div>
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Loading Details</p>
        </div>
    );

    if (!data) return (
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
            <div className="size-20 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-4"><Package className="size-10 text-muted-foreground/30" /></div>
            <h2 className="text-xl font-black">Load Not Found</h2>
            <p className="text-sm text-muted-foreground mt-2">This load may have been removed or already assigned.</p>
            <Button asChild className="mt-4 gap-2 rounded-xl"><Link href="/driver/available-loads"><ArrowLeft className="size-4" /> Back to Load Board</Link></Button>
        </div>
    );

    const quote = data.preservedQuoteData;
    const vehicleName = quote?.vehicleName;
    const vehicleImg = quote?.vehicleImage;
    const vehicles = data.vehicles || [];
    const pay = data.pricing?.carrierPayAmount || data.carrierPayAmount || quote?.rate || 0;
    const miles = quote?.miles || data.estimatedMiles;
    const isRequested = data.myRequestStatus === 'pending';
    const isRejected = data.myRequestStatus === 'rejected';
    const canRequest = !isRequested && !isRejected;

    return (
        <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-5">

                <div className="relative overflow-hidden rounded-3xl shadow-2xl">
                    <div className="absolute inset-0 bg-linear-to-br from-slate-950 via-slate-900 to-slate-950" />
                    <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/8 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
                    <div className="absolute bottom-0 left-0 w-56 h-56 bg-blue-500/6 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
                    <div className="relative p-5 sm:p-7">
                        <div className="flex items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3">
                                <button onClick={() => router.back()} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10">
                                    <ArrowLeft className="size-4.5 text-white/80" />
                                </button>
                                <div>
                                    <div className="flex items-center gap-2.5">
                                        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-mono">{data.trackingNumber || data.loadNumber || loadId.slice(-8)}</h1>
                                        <Badge className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20">Available</Badge>
                                        {isRequested && <Badge className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20 gap-1"><Timer className="size-2.5" />Requested</Badge>}
                                        {isRejected && <Badge className="text-[10px] bg-red-500/10 text-red-400 border-red-500/20 gap-1"><XCircle className="size-2.5" />Declined</Badge>}
                                    </div>
                                    <p className="text-sm text-white/40 mt-0.5">{vehicleName || `${data.origin} → ${data.destination}`}</p>
                                </div>
                            </div>
                            {pay > 0 && (
                                <div className="text-right hidden sm:block">
                                    <span className="text-3xl font-black tabular-nums text-white">${pay.toLocaleString()}</span>
                                    {miles && <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">${(pay / miles).toFixed(2)}/mi</p>}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/8">
                            <div className="size-3 rounded-full bg-emerald-400 shrink-0" />
                            <span className="text-sm font-semibold text-white truncate">{data.origin}</span>
                            <div className="flex-1 border-t border-dashed border-white/15 mx-2" />
                            <Navigation className="size-3.5 text-white/25 shrink-0" />
                            <div className="flex-1 border-t border-dashed border-white/15 mx-2" />
                            <MapPin className="size-3.5 text-red-400 shrink-0" />
                            <span className="text-sm font-semibold text-white truncate">{data.destination}</span>
                        </div>

                        {pay > 0 && (
                            <div className="grid grid-cols-3 gap-3 mt-4">
                                <div className="rounded-xl bg-white/5 border border-white/8 p-3 text-center">
                                    <p className="text-lg font-black text-emerald-400 tabular-nums">${pay.toLocaleString()}</p>
                                    <p className="text-[10px] text-white/30 font-semibold uppercase tracking-widest">Pay</p>
                                </div>
                                <div className="rounded-xl bg-white/5 border border-white/8 p-3 text-center">
                                    <p className="text-lg font-black text-white tabular-nums">{miles ? `${miles.toLocaleString()} mi` : '—'}</p>
                                    <p className="text-[10px] text-white/30 font-semibold uppercase tracking-widest">Distance</p>
                                </div>
                                <div className="rounded-xl bg-white/5 border border-white/8 p-3 text-center">
                                    <p className="text-lg font-black text-white tabular-nums">{miles && pay ? `$${(pay / miles).toFixed(2)}` : '—'}</p>
                                    <p className="text-[10px] text-white/30 font-semibold uppercase tracking-widest">Per Mile</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-2">
                    {canRequest && (
                        <Button onClick={() => setShowConfirm(true)} className="gap-2 rounded-xl flex-1 sm:flex-none h-11 text-sm font-bold shadow-lg">
                            <Truck className="size-4" />Request This Load
                        </Button>
                    )}
                    {isRequested && (
                        <Badge className="h-11 px-5 text-sm bg-amber-500/10 text-amber-600 border-amber-500/20 gap-2">
                            <Timer className="size-4" />Request Pending — Awaiting Approval
                        </Badge>
                    )}
                    {isRejected && (
                        <Badge className="h-11 px-5 text-sm bg-red-500/10 text-red-600 border-red-500/20 gap-2">
                            <XCircle className="size-4" />Request Declined
                        </Badge>
                    )}
                </div>

                <Card className="overflow-hidden border-border/20 rounded-2xl shadow-xl">
                    <CardContent className="p-0">
                        {mapboxToken ? <div ref={mapRef} className="h-75 w-full" /> : (
                            <div className="h-75 flex items-center justify-center bg-muted/30">
                                <div className="text-center space-y-2"><MapPin className="size-10 text-muted-foreground/30 mx-auto" /><p className="text-xs text-muted-foreground">Route map unavailable</p></div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-border/20 rounded-2xl overflow-hidden md:col-span-2">
                        <div className="relative h-56 sm:h-72">
                            <img
                                src={resolveImageUrl(vehicleImg) || FALLBACK}
                                alt={vehicleName || 'Vehicle'}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    const img = e.currentTarget;
                                    if (img.src !== window.location.origin + FALLBACK) {
                                        img.src = FALLBACK;
                                    }
                                }}
                            />
                            <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                            <div className="absolute bottom-4 left-4 right-4">
                                <p className="text-xl font-black text-white">{vehicleName}</p>
                                {miles && <p className="text-sm text-white/60">{miles.toLocaleString()} miles</p>}
                            </div>
                        </div>
                    </Card>

                    {vehicles.length > 0 && (
                        <Card className="border-border/20 rounded-2xl overflow-hidden md:col-span-2">
                            <div className="p-4 border-b border-border/10">
                                <div className="flex items-center gap-2"><Car className="size-4 text-primary" /><h3 className="text-sm font-black uppercase tracking-wider">Vehicles ({vehicles.length})</h3></div>
                            </div>
                            <CardContent className="p-4">
                                <div className="grid gap-2">
                                    {vehicles.map((v: any, i: number) => (
                                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border/15 bg-muted/10">
                                            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Car className="size-5 text-primary" /></div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold">{`${v.year || ''} ${v.make || ''} ${v.model || ''}`.trim() || 'Unknown Vehicle'}</p>
                                                <div className="flex flex-wrap gap-2 mt-0.5">
                                                    {v.color && <span className="text-[10px] text-muted-foreground">{v.color}</span>}
                                                    {v.condition && <span className="text-[10px] text-muted-foreground">· {v.condition}</span>}
                                                    {v.vin && <span className="text-[10px] text-muted-foreground font-mono">VIN: {v.vin}</span>}
                                                    {v.trailerType && <Badge variant="outline" className="text-[9px] h-4">{trailerLabel(v.trailerType)}</Badge>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="border-border/20 rounded-2xl overflow-hidden">
                        <div className="p-4 border-b border-border/10">
                            <div className="flex items-center gap-2"><Calendar className="size-4 text-primary" /><h3 className="text-sm font-black uppercase tracking-wider">Schedule</h3></div>
                        </div>
                        <CardContent className="p-4 space-y-3">
                            <DetailRow label="Scheduled Pickup" value={fmtDate(data.dates?.pickupDeadline || data.scheduledPickup || data.requestedPickupDate)} />
                            <DetailRow label="Scheduled Delivery" value={fmtDate(data.dates?.deliveryDeadline || data.scheduledDelivery || data.desiredDeliveryDate)} />
                            <DetailRow label="Posted" value={fmtDate(data.createdAt)} />
                        </CardContent>
                    </Card>

                    <Card className="border-border/20 rounded-2xl overflow-hidden">
                        <div className="p-4 border-b border-border/10">
                            <div className="flex items-center gap-2"><DollarSign className="size-4 text-emerald-500" /><h3 className="text-sm font-black uppercase tracking-wider">Financials</h3></div>
                        </div>
                        <CardContent className="p-4 space-y-3">
                            {pay > 0 && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Carrier Pay</span><span className="font-bold text-emerald-600">${pay.toLocaleString()}</span></div>}
                            {miles && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Distance</span><span className="font-semibold">{miles.toLocaleString()} miles</span></div>}
                            {miles && pay > 0 && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Rate per Mile</span><span className="font-semibold">${(pay / miles).toFixed(2)}/mi</span></div>}
                            {data.copCodAmount != null && data.copCodAmount > 0 && <div className="flex justify-between text-xs"><span className="text-muted-foreground">COD</span><span className="font-semibold">${data.copCodAmount.toLocaleString()}</span></div>}
                            {data.trailerTypeRequired && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Trailer Required</span><Badge variant="outline" className="text-[10px] h-5">{trailerLabel(data.trailerTypeRequired)}</Badge></div>}
                        </CardContent>
                    </Card>

                    {(data.originContact?.contactName || data.originContact?.phone) && (
                        <Card className="border-border/20 rounded-2xl overflow-hidden">
                            <div className="p-4 border-b border-border/10"><h3 className="text-sm font-black uppercase tracking-wider">Pick-Up Contact</h3></div>
                            <CardContent className="p-4 space-y-2">
                                {data.originContact.contactName && <div className="flex items-center gap-2 text-sm"><User2 className="size-4 text-muted-foreground" /><span className="font-semibold">{data.originContact.contactName}</span></div>}
                                {data.originContact.phone && <a href={`tel:${data.originContact.phone}`} className="flex items-center gap-2 text-sm text-primary hover:underline"><Phone className="size-4" />{data.originContact.phone}</a>}
                                {data.originContact.email && <a href={`mailto:${data.originContact.email}`} className="flex items-center gap-2 text-sm text-primary hover:underline"><Mail className="size-4" />{data.originContact.email}</a>}
                            </CardContent>
                        </Card>
                    )}

                    {(data.destinationContact?.contactName || data.destinationContact?.phone) && (
                        <Card className="border-border/20 rounded-2xl overflow-hidden">
                            <div className="p-4 border-b border-border/10"><h3 className="text-sm font-black uppercase tracking-wider">Delivery Contact</h3></div>
                            <CardContent className="p-4 space-y-2">
                                {data.destinationContact.contactName && <div className="flex items-center gap-2 text-sm"><User2 className="size-4 text-muted-foreground" /><span className="font-semibold">{data.destinationContact.contactName}</span></div>}
                                {data.destinationContact.phone && <a href={`tel:${data.destinationContact.phone}`} className="flex items-center gap-2 text-sm text-primary hover:underline"><Phone className="size-4" />{data.destinationContact.phone}</a>}
                                {data.destinationContact.email && <a href={`mailto:${data.destinationContact.email}`} className="flex items-center gap-2 text-sm text-primary hover:underline"><Mail className="size-4" />{data.destinationContact.email}</a>}
                            </CardContent>
                        </Card>
                    )}

                    {(data.specialInstructions || data.preDispatchNotes || data.loadSpecificTerms) && (
                        <Card className="border-border/20 rounded-2xl overflow-hidden md:col-span-2">
                            <div className="p-4 border-b border-border/10">
                                <div className="flex items-center gap-2"><FileText className="size-4 text-primary" /><h3 className="text-sm font-black uppercase tracking-wider">Notes & Instructions</h3></div>
                            </div>
                            <CardContent className="p-4 space-y-4">
                                {data.preDispatchNotes && <div><p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Dispatch Notes</p><p className="text-sm leading-relaxed">{data.preDispatchNotes}</p></div>}
                                {data.specialInstructions && <div><p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Special Instructions</p><p className="text-sm leading-relaxed">{data.specialInstructions}</p></div>}
                                {data.loadSpecificTerms && <div><p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Load Terms</p><p className="text-sm leading-relaxed">{data.loadSpecificTerms}</p></div>}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {canRequest && (
                    <div className="rounded-2xl overflow-hidden border border-primary/20 bg-primary/3">
                        <div className="p-5 flex items-center justify-between gap-4">
                            <div>
                                <p className="font-bold text-sm">Ready to haul this load?</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Submit a request and the dispatcher will review your profile and equipment.</p>
                            </div>
                            <Button onClick={() => setShowConfirm(true)} className="gap-2 rounded-xl h-11 px-6 font-bold shadow-lg shrink-0">
                                <Truck className="size-4" />Request Assignment
                            </Button>
                        </div>
                    </div>
                )}
            </motion.div>

            <DriverContractModal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={handleRequest}
                isSubmitting={requesting}
                title="Request This Load"
                description="Requesting a load does not guarantee assignment — your compliance and equipment profile will be verified. Review and sign the transport contract to submit your request."
                confirmLabel="Request & Sign"
            />
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
    if (!value) return null;
    return <div className="flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-semibold">{value}</span></div>;
}

'use client';

import * as React from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Truck, ArrowLeft, ArrowRight, CheckCircle2, Clock, Loader2, MapPin,
  DollarSign, Navigation2, Phone, Mail, User2, Camera, Ban, FileText,
  AlertTriangle, CircleDot, Calendar, Package, Car, Shield, Zap,
  ExternalLink, Copy, ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cn, resolveImageUrl } from '@/lib/utils';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { trailerTypeOptions } from '@/components/driver-profile/driver-profile-constants';
import { Load, LoadStatus } from '@/types/load';
import { ConfirmationModal, ConfirmationVariant } from '@/components/ui/confirmation-modal';
import { DriverContractModal, DriverSignedContract } from '@/components/create-load/DriverContractModal';
import { useDriverWorkEligibility } from '@/hooks/useDriverWorkEligibility';
import { DriverHeroGlow } from '@/components/driver/DriverHeroGlow';

// Real driver-tracking endpoints — accept/request/pickup/start-route/drop
// all live under /loads/:id/*, not the flat /api/driver-tracking/{action}
// shape this page used to call (that 404'd silently).
const ACTION_ENDPOINTS: Record<string, string> = {
  'accept-load': 'accept',
  'mark-picked-up': 'pickup',
  'start-route': 'start-route',
  'drop-load': 'drop',
  'request-load': 'request',
};

// Actions that require the driver to review and sign the transport contract
// before they take effect.
const SIGNATURE_ACTIONS = new Set(['accept-load', 'request-load']);

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Denver' }) : '';
const fmtDateTime = (d?: string) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Denver' }) : '';
const trailerLabel = (val?: string) => trailerTypeOptions.find(t => t.value === val)?.label || val || 'Any';
const extractErr = (e: any, fb: string) => e?.response?.data?.message || e?.message || fb;

const STATUS_THEME: Record<LoadStatus, { bg: string; text: string; border: string }> = {
  Draft: { bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-300', border: 'border-slate-500/20' },
  Posted: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-300', border: 'border-blue-500/20' },
  Assigned: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-300', border: 'border-blue-500/20' },
  Accepted: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-300', border: 'border-amber-500/20' },
  'Picked Up': { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-300', border: 'border-orange-500/20' },
  'In-Transit': { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-300', border: 'border-emerald-500/20' },
  Delivered: { bg: 'bg-green-500/10', text: 'text-green-700 dark:text-green-300', border: 'border-green-500/20' },
  Cancelled: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-300', border: 'border-red-500/20' },
};

const STEPS = [
  { key: 'assigned', label: 'Assigned' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'picked-up', label: 'Picked Up' },
  { key: 'in-transit', label: 'In Transit' },
  { key: 'delivered', label: 'Delivered' },
] as const;

export default function LoadDetailPage() {
  const { getToken } = useAuth();
  const workEligibility = useDriverWorkEligibility();
  const params = useParams();
  const router = useRouter();
  const loadId = params.id as string;
  const [data, setData] = React.useState<Load | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [contractAction, setContractAction] = React.useState<string | null>(null);
  const [confirmState, setConfirmState] = React.useState<{
    isOpen: boolean;
    action: string;
    title: string;
    description: string;
    variant: ConfirmationVariant;
  }>({
    isOpen: false,
    action: '',
    title: '',
    description: '',
    variant: 'primary',
  });

  const fetchDetail = React.useCallback(async () => {
    try {
      const token = await getToken();
      const res = await apiClient.get(`/api/driver-tracking/loads/${loadId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const loadData = res.data?.data;
      if (loadData) {
        setData(loadData);
      }
    } catch (err: any) {
      const msg = extractErr(err, 'Failed to load details');
      // If 403 or 404, the "data" will be null, showing the "Not Found" screen
      if (err.response?.status !== 403 && err.response?.status !== 404) {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [getToken, loadId]);

  React.useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const executeAction = async (action: string, signature?: DriverSignedContract) => {
    if (!loadId) {
      toast.error(`Cannot ${action}: Load ID is missing from URL`);
      return;
    }
    setActionLoading(action);
    try {
      const token = await getToken();
      const endpoint = ACTION_ENDPOINTS[action] ?? action;
      await apiClient.post(`/api/driver-tracking/loads/${loadId}/${endpoint}`, signature ?? {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(action === 'accept-load' ? 'Load accepted' : action === 'start-route' ? 'Route started' : action === 'drop-load' ? 'Load dropped' : action === 'request-load' ? 'Request submitted' : action === 'mark-picked-up' ? 'Load picked up' : 'Done');
      await fetchDetail();
      setConfirmState(prev => ({ ...prev, isOpen: false }));
      setContractAction(null);
    } catch (err: any) { toast.error(extractErr(err, `Failed to ${action}`)); }
    finally { setActionLoading(null); }
  };

  const handleAction = (action: string) => {
    if (SIGNATURE_ACTIONS.has(action) && !workEligibility.canTakeNewWork) {
      toast.error(workEligibility.blockReason || 'You are not eligible to accept or request a new load right now.');
      return;
    }
    if (SIGNATURE_ACTIONS.has(action)) {
      setContractAction(action);
      return;
    }

    let title = '';
    let description = '';
    let variant: ConfirmationVariant = 'primary';

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
        executeAction(action);
        return;
    }

    setConfirmState({
      isOpen: true,
      action,
      title,
      description,
      variant,
    });
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="relative"><div className="size-16 rounded-full border-4 border-emerald-500/20 animate-pulse" /><Loader2 className="size-8 animate-spin text-emerald-500 absolute inset-0 m-auto" /></div>
      <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Loading Details</p>
    </div>
  );

  if (!data) return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <div className="size-20 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-4"><Package className="size-10 text-muted-foreground/30" /></div>
      <h2 className="text-xl font-black">Load Not Found</h2>
      <p className="text-sm text-muted-foreground mt-2">This load may have been removed or reassigned.</p>
      <Button asChild className="mt-4 h-11 gap-2 rounded-xl"><Link href="/driver/loads"><ArrowLeft className="size-4" /> Back to Loads</Link></Button>
    </div>
  );

  const status = data.status;
  const theme = STATUS_THEME[status] || STATUS_THEME['Posted'];
  const vehicles = data.vehicles || [];
  const primaryVehicle = vehicles[0];
  const vehicleName = primaryVehicle ? `${primaryVehicle.year || ''} ${primaryVehicle.make || ''} ${primaryVehicle.model || ''}`.trim() : "Unknown Vehicle";

  const isAssigned = !!data.assignedAt;
  const isAccepted = !!data.driverAcceptedAt;
  const isMyRequest = !!data.myRequestStatus;

  const canAccept = status === 'Assigned' && !isAccepted && workEligibility.canTakeNewWork;
  const canMarkPickedUp = status === 'Accepted';
  const canStartRoute = status === 'Picked Up';
  const canDrop = isAccepted && (status === 'Accepted' || status === 'Picked Up' || status === 'In-Transit');
  const canRequest = !isAssigned && !isMyRequest && status === 'Posted' && workEligibility.canTakeNewWork;

  const getStepIdx = () => {
    if (status === 'Delivered') return 4;
    if (status === 'In-Transit') return 3;
    if (status === 'Picked Up') return 2;
    if (status === 'Accepted' || isAccepted) return 1;
    return 0;
  };
  const stepIdx = getStepIdx();

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-5">

        <div className="relative overflow-hidden rounded-3xl border border-slate-300/80 dark:border-white/15 shadow-lg dark:shadow-2xl ring-1 ring-slate-200/50 dark:ring-white/[0.03]">
          <div className="absolute inset-0 bg-linear-to-br from-white via-slate-50 to-emerald-50/70 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
          <DriverHeroGlow />
          <div className="relative p-5 sm:p-7">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-background/80 dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 transition-colors border border-border/80 dark:border-white/10"><ArrowLeft className="size-4.5 text-foreground/80 dark:text-white/80" /></button>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground font-mono">{data.loadNumber || loadId.slice(-8)}</h1>
                    <Badge className={cn('text-[10px]', theme.bg, theme.text, theme.border)}>{status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{vehicleName || `${data.pickupLocation?.city || "Origin not provided"} → ${data.deliveryLocation?.city || "Destination not provided"}`}</p>
                </div>
              </div>
              {data.pricing?.carrierPayAmount != null && data.pricing.carrierPayAmount > 0 && (
                <div className="text-right hidden sm:block">
                  <span className="text-3xl font-black tabular-nums text-foreground">${data.pricing.carrierPayAmount.toLocaleString()}</span>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Carrier Pay</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400"><div className="size-2 rounded-full bg-emerald-500 dark:bg-emerald-400" /><span className="font-semibold">{data.pickupLocation?.city || "Origin not provided"}{data.pickupLocation?.state ? `, ${data.pickupLocation.state}` : ""}</span></div>
              <ArrowRight className="size-4 text-muted-foreground" />
              <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400"><MapPin className="size-3.5" /><span className="font-semibold">{data.deliveryLocation?.city || "Destination not provided"}{data.deliveryLocation?.state ? `, ${data.deliveryLocation.state}` : ""}</span></div>
            </div>

            {isAssigned && status !== 'Cancelled' && (
              <div className="flex items-center gap-0 w-full mt-5 overflow-x-auto pb-2 scrollbar-hide">
                {STEPS.map((step, i) => (
                  <React.Fragment key={step.key}>
                    <div className="flex flex-col items-center gap-0.5 min-w-17.5 shrink-0">
                      <div className={cn('size-6 rounded-full flex items-center justify-center border-2 transition-colors',
                        i <= stepIdx ? (i === stepIdx ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-300')
                          : 'bg-muted/50 border-border text-muted-foreground/40')}>
                        {i < stepIdx ? <CheckCircle2 className="size-3.5" /> : i === stepIdx ? <CircleDot className="size-3.5" /> : <div className="size-1.5 rounded-full bg-current" />}
                      </div>
                      <span className={cn('text-[10px] font-semibold whitespace-nowrap', i <= stepIdx ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground/40')}>{step.label}</span>
                    </div>
                    {i < STEPS.length - 1 && <div className={cn('flex-1 h-0.5 -mt-2.5 mx-1 rounded-full min-w-5', i < stepIdx ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-border')} />}
                  </React.Fragment>
                ))}
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

        <div className="flex flex-wrap gap-2">
          {canAccept && (
            <Button onClick={() => handleAction('accept-load')} disabled={!!actionLoading} className="h-11 gap-2 rounded-xl">
              {actionLoading === 'accept-load' ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Accept Load
            </Button>
          )}
          {canMarkPickedUp && (
            <Button onClick={() => handleAction('mark-picked-up')} disabled={!!actionLoading} className="h-11 gap-2 bg-orange-600 hover:bg-orange-700 rounded-xl">
              {actionLoading === 'mark-picked-up' ? <Loader2 className="size-4 animate-spin" /> : <Package className="size-4" />} Mark Picked Up
            </Button>
          )}
          {canStartRoute && (
            <Button onClick={() => handleAction('start-route')} disabled={!!actionLoading} className="h-11 gap-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl">
              {actionLoading === 'start-route' ? <Loader2 className="size-4 animate-spin" /> : <Navigation2 className="size-4" />} Start Route
            </Button>
          )}
          {canRequest && (
            <Button onClick={() => handleAction('request-load')} disabled={!!actionLoading} className="h-11 gap-2 rounded-xl">
              {actionLoading === 'request-load' ? <Loader2 className="size-4 animate-spin" /> : <Truck className="size-4" />} Request This Load
            </Button>
          )}
          {data.myRequestStatus === 'pending' && <Badge className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20 h-9 px-3 gap-1.5"><Clock className="size-3.5" />Request Pending</Badge>}
          {canDrop && (
            <Button variant="outline" onClick={() => handleAction('drop-load')} disabled={!!actionLoading} className="h-11 gap-2 text-destructive hover:text-destructive rounded-xl ml-auto">
              {actionLoading === 'drop-load' ? <Loader2 className="size-4 animate-spin" /> : <Ban className="size-4" />} Drop Load
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <DateRow label="Scheduled Pickup" value={data.dates?.pickupDeadline} />
              <DateRow label="Scheduled Delivery" value={data.dates?.deliveryDeadline} />
              {data.assignedAt && <DateRow label="Assigned" value={data.assignedAt} />}
              {data.driverAcceptedAt && <DateRow label="Accepted" value={data.driverAcceptedAt} />}
              {data.pickedUpAt && <DateRow label="Picked Up" value={data.pickedUpAt} />}
              {data.deliveredAt && <DateRow label="Delivered" value={data.deliveredAt} />}
            </CardContent>
          </Card>

          <Card className="border-border/20 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-border/10">
              <div className="flex items-center gap-2"><DollarSign className="size-4 text-emerald-500" /><h3 className="text-sm font-black uppercase tracking-wider">Financials</h3></div>
            </div>
            <CardContent className="p-4 space-y-3">
              {data.pricing?.carrierPayAmount != null && <FinRow label="Carrier Pay" value={data.pricing.carrierPayAmount} highlight />}
              {data.pricing?.copCodAmount != null && data.pricing.copCodAmount > 0 && <FinRow label="COD" value={data.pricing.copCodAmount} />}
              {data.pricing?.balanceAmount != null && <FinRow label="Balance" value={data.pricing.balanceAmount} />}
              {data.trailerType && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Trailer Required</span>
                  <Badge variant="outline" className="text-[10px] h-5">
                    {data.trailerType.replace(/_/g, " ")}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {isAccepted && (
            <Card className="border-border/20 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-border/10">
                <div className="flex items-center gap-2"><FileText className="size-4 text-emerald-500" /><h3 className="text-sm font-black uppercase tracking-wider">Contract</h3></div>
              </div>
              <CardContent className="p-4">
                {data.driverContract?.agreedToTerms ? (
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 className="size-4 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold">Contract Signed</p>
                      {data.driverContract.signedAt && (
                        <p className="text-[10px] text-muted-foreground">{fmtDateTime(data.driverContract.signedAt)}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Not signed yet</p>
                )}
              </CardContent>
            </Card>
          )}

          {data.pickupLocation?.contactName && (
            <Card className="border-border/20 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-border/10">
                <h3 className="text-sm font-black uppercase tracking-wider">Pick-Up Contact</h3>
              </div>
              <CardContent className="p-4 space-y-2">
                <ContactInfo contact={data.pickupLocation} />
              </CardContent>
            </Card>
          )}

          {data.deliveryLocation?.contactName && (
            <Card className="border-border/20 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-border/10">
                <h3 className="text-sm font-black uppercase tracking-wider">Delivery Contact</h3>
              </div>
              <CardContent className="p-4 space-y-2">
                <ContactInfo contact={data.deliveryLocation} />
              </CardContent>
            </Card>
          )}

          {(data.additionalInfo?.instructions || data.additionalInfo?.notes) && (
            <Card className="border-border/20 rounded-2xl overflow-hidden md:col-span-2">
              <div className="p-4 border-b border-border/10">
                <div className="flex items-center gap-2"><FileText className="size-4 text-primary" /><h3 className="text-sm font-black uppercase tracking-wider">Notes & Instructions</h3></div>
              </div>
              <CardContent className="p-4 space-y-4">
                {data.additionalInfo?.notes && <NoteBlock label="Dispatch Notes" text={data.additionalInfo.notes} />}
                {data.additionalInfo?.instructions && <NoteBlock label="Special Instructions" text={data.additionalInfo.instructions} />}
              </CardContent>
            </Card>
          )}

          {data.proofOfDelivery?.imageUrl && (
            <Card className="border-border/20 rounded-2xl overflow-hidden md:col-span-2">
              <div className="p-4 border-b border-border/10">
                <div className="flex items-center gap-2"><Camera className="size-4 text-primary" /><h3 className="text-sm font-black uppercase tracking-wider">Proof of Delivery</h3></div>
              </div>
              <CardContent className="p-4">
                <div className="rounded-xl overflow-hidden border border-border/15">
                  <img src={resolveImageUrl(data.proofOfDelivery.imageUrl)} alt="Proof of delivery" className="w-full max-h-72 object-contain bg-muted/20" />
                </div>
                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                  {data.proofOfDelivery.submittedAt && <span>Submitted: {fmtDateTime(data.proofOfDelivery.submittedAt)}</span>}
                  {data.proofOfDelivery.confirmedAt && <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1 text-[10px]"><CheckCircle2 className="size-2.5" />Confirmed {fmtDate(data.proofOfDelivery.confirmedAt)}</Badge>}
                  {data.proofOfDelivery.note && <span className="italic">&ldquo;{data.proofOfDelivery.note}&rdquo;</span>}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </motion.div>
      <ConfirmationModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => executeAction(confirmState.action)}
        title={confirmState.title}
        description={confirmState.description}
        variant={confirmState.variant}
        isLoading={!!actionLoading}
      />
      <DriverContractModal
        isOpen={!!contractAction}
        onClose={() => setContractAction(null)}
        onConfirm={(contract) => executeAction(contractAction!, contract)}
        isSubmitting={!!actionLoading}
        title={contractAction === 'request-load' ? 'Request This Load' : 'Accept This Load'}
        description={
          contractAction === 'request-load'
            ? 'Review and sign the transport contract to request this load from the dispatcher.'
            : 'Review and sign the transport contract to accept this load assignment.'
        }
        confirmLabel={contractAction === 'request-load' ? 'Request & Sign' : 'Accept & Sign'}
      />
    </div>
  );
}

function DateRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return <div className="flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-semibold">{fmtDate(value)}</span></div>;
}

function FinRow({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return <div className="flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className={cn('font-bold', highlight && 'text-emerald-600')}>${value.toLocaleString()}</span></div>;
}

function ContactInfo({ contact }: { contact: any }) {
  return (
    <>
      {contact.contactName && <div className="flex items-center gap-2 text-sm"><User2 className="size-4 text-muted-foreground" /><span className="font-semibold">{contact.contactName}</span></div>}
      {contact.phone && <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-sm text-primary hover:underline"><Phone className="size-4" />{contact.phone}</a>}
      {contact.email && <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-sm text-primary hover:underline"><Mail className="size-4" />{contact.email}</a>}
    </>
  );
}

function NoteBlock({ label, text }: { label: string; text: string }) {
  return <div><p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</p><p className="text-sm leading-relaxed">{text}</p></div>;
}
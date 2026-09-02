'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api-client';
import { DriverProfile } from '@/types/driver-profile';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Loader2, Truck, Save, Hash, CheckCircle2, ArrowLeft, Plus, X,
  Gauge, Ruler, Shield, Star, Settings2, ChevronRight, Wrench, Circle,
  Zap, Box, ChevronsUpDown, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  trailerTypeOptions, specialFeatureOptions, TRAILER_CATEGORIES, hitchTypeOptions,
} from './driver-profile-constants';
import { cn } from '@/lib/utils';
import { getEquipmentReadiness } from '@/lib/driver-readiness';
import Link from 'next/link';

interface EquipmentForm {
  truckMake: string; truckModel: string; truckYear: number | undefined;
  truckColor: string; engineType: string; gvwr: number | undefined;
  vin: string; plateNumber: string; dotNumber: string; mcNumber: string;
  trailerType: string; customTrailerName: string; trailerMake: string; trailerModel: string;
  trailerYear: number | undefined; hitchType: string; maxVehicleCapacity: number;
  trailerLength: number | undefined; trailerAxles: number;
  trailerGvwr: number | undefined; specialFeatures: string[];
}

const INIT: EquipmentForm = {
  truckMake: '', truckModel: '', truckYear: undefined, truckColor: '',
  engineType: '', gvwr: undefined, vin: '', plateNumber: '', dotNumber: '',
  mcNumber: '', trailerType: '', customTrailerName: '', trailerMake: '', trailerModel: '',
  trailerYear: undefined, hitchType: '', maxVehicleCapacity: 1,
  trailerLength: undefined, trailerAxles: 2, trailerGvwr: undefined,
  specialFeatures: [],
};

const TH: Record<string, { bg: string; text: string; fill: string; grad: string; ring: string; glow: string }> = {
  open: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', fill: 'fill-emerald-500', grad: 'from-emerald-600 to-teal-500', ring: 'ring-emerald-500/30', glow: 'shadow-emerald-500/20' },
  enclosed: { bg: 'bg-blue-500/10', text: 'text-blue-500', fill: 'fill-blue-500', grad: 'from-blue-600 to-indigo-500', ring: 'ring-blue-500/30', glow: 'shadow-blue-500/20' },
  flatbed: { bg: 'bg-amber-500/10', text: 'text-amber-500', fill: 'fill-amber-500', grad: 'from-amber-600 to-orange-500', ring: 'ring-amber-500/30', glow: 'shadow-amber-500/20' },
  heavy: { bg: 'bg-red-500/10', text: 'text-red-500', fill: 'fill-red-500', grad: 'from-red-600 to-rose-500', ring: 'ring-red-500/30', glow: 'shadow-red-500/20' },
  multi: { bg: 'bg-purple-500/10', text: 'text-purple-500', fill: 'fill-purple-500', grad: 'from-purple-600 to-violet-500', ring: 'ring-purple-500/30', glow: 'shadow-purple-500/20' },
  specialty: { bg: 'bg-cyan-500/10', text: 'text-cyan-500', fill: 'fill-cyan-500', grad: 'from-cyan-600 to-sky-500', ring: 'ring-cyan-500/30', glow: 'shadow-cyan-500/20' },
};

const TSvg = ({ cat, className }: { cat: string; className?: string }) => {
  const c = cn('stroke-current', TH[cat]?.text || TH.open.text, className);
  if (cat === 'enclosed') return (
    <svg viewBox="0 0 160 80" fill="none" strokeWidth="2.5" className={c}>
      <path d="M8 56V32c0-3 2-5 5-5h14l6 12h2v17" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="30" width="10" height="7" rx="1.5" strokeWidth="1.5" opacity=".5" />
      <rect x="39" y="20" width="97" height="36" rx="3" /><path d="M128 20v36" opacity=".3" strokeWidth="1.5" />
      <circle cx="20" cy="62" r="6" strokeWidth="2.5" /><circle cx="107" cy="62" r="6" strokeWidth="2.5" /><circle cx="127" cy="62" r="6" strokeWidth="2.5" />
    </svg>
  );
  if (cat === 'flatbed') return (
    <svg viewBox="0 0 160 80" fill="none" strokeWidth="2.5" className={c}>
      <path d="M8 56V32c0-3 2-5 5-5h14l6 12h2v17" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="30" width="10" height="7" rx="1.5" strokeWidth="1.5" opacity=".5" />
      <rect x="39" y="47" width="100" height="5" rx="1.5" />
      <path d="M47 47V37M77 47V37M107 47V37M135 47V37" opacity=".35" strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="62" r="6" strokeWidth="2.5" /><circle cx="107" cy="62" r="6" strokeWidth="2.5" /><circle cx="127" cy="62" r="6" strokeWidth="2.5" />
    </svg>
  );
  if (cat === 'heavy') return (
    <svg viewBox="0 0 160 80" fill="none" strokeWidth="2.5" className={c}>
      <path d="M8 56V32c0-3 2-5 5-5h14l6 12h2v17" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="30" width="10" height="7" rx="1.5" strokeWidth="1.5" opacity=".5" />
      <path d="M37 52l10-16h4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="51" y="52" width="85" height="4" rx="1.5" />
      <rect x="65" y="36" width="38" height="16" rx="3" className={cn(TH.heavy.fill)} opacity=".15" />
      <circle cx="20" cy="62" r="6" strokeWidth="2.5" /><circle cx="107" cy="62" r="6" strokeWidth="2.5" /><circle cx="127" cy="62" r="6" strokeWidth="2.5" />
    </svg>
  );
  if (cat === 'multi') return (
    <svg viewBox="0 0 160 80" fill="none" strokeWidth="2.5" className={c}>
      <path d="M4 56V27c0-3 2-5 5-5h14l6 10h2v24" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="10" y="25" width="10" height="6" rx="1.5" strokeWidth="1.5" opacity=".5" />
      <path d="M33 24h118M33 52h118" strokeLinecap="round" />
      <path d="M40 24v28M90 24v28M145 24v28" strokeWidth="2" strokeLinecap="round" />
      {[48, 65, 98, 115].map(x => <rect key={`u${x}`} x={x} y="17" width="13" height="7" rx="2" className={cn(TH.multi.fill)} opacity=".18" />)}
      {[48, 65, 98, 115].map(x => <rect key={`l${x}`} x={x} y="45" width="13" height="7" rx="2" className={cn(TH.multi.fill)} opacity=".18" />)}
      <circle cx="16" cy="62" r="5.5" strokeWidth="2.5" /><circle cx="58" cy="62" r="5.5" strokeWidth="2.5" /><circle cx="73" cy="62" r="5.5" strokeWidth="2.5" />
      <circle cx="128" cy="62" r="5.5" strokeWidth="2.5" /><circle cx="143" cy="62" r="5.5" strokeWidth="2.5" />
    </svg>
  );
  if (cat === 'specialty') return (
    <svg viewBox="0 0 160 80" fill="none" strokeWidth="2.5" className={c}>
      <path d="M8 56V30c0-3 2-5 5-5h18l6 8h18v23" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="27" width="16" height="7" rx="1.5" strokeWidth="1.5" opacity=".5" />
      <rect x="47" y="37" width="12" height="15" rx="1.5" /><path d="M60 50h8" strokeLinecap="round" />
      <rect x="68" y="42" width="68" height="10" rx="1.5" />
      <rect x="78" y="32" width="22" height="10" rx="3" className={cn(TH.specialty.fill)} opacity=".15" />
      <circle cx="18" cy="62" r="5.5" strokeWidth="2.5" /><circle cx="48" cy="62" r="5.5" strokeWidth="2.5" />
      <circle cx="98" cy="62" r="5.5" strokeWidth="2.5" /><circle cx="128" cy="62" r="5.5" strokeWidth="2.5" />
    </svg>
  );
  return (
    <svg viewBox="0 0 160 80" fill="none" strokeWidth="2.5" className={c}>
      <path d="M8 56V32c0-3 2-5 5-5h14l6 12h2v17" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="30" width="10" height="7" rx="1.5" strokeWidth="1.5" opacity=".5" />
      <path d="M37 52h100M37 56h100" strokeLinecap="round" /><path d="M42 32h90" strokeLinecap="round" />
      <path d="M47 32v20M127 32v20" strokeWidth="2" strokeLinecap="round" />
      <path d="M132 32l14 10" strokeLinecap="round" opacity=".6" />
      <rect x="57" y="24" width="22" height="8" rx="3" className={cn(TH.open.fill)} opacity=".2" />
      <rect x="87" y="24" width="22" height="8" rx="3" className={cn(TH.open.fill)} opacity=".2" />
      <circle cx="20" cy="62" r="6" strokeWidth="2.5" /><circle cx="107" cy="62" r="6" strokeWidth="2.5" /><circle cx="127" cy="62" r="6" strokeWidth="2.5" />
    </svg>
  );
};

type Nav = 'rig' | 'trailer' | 'specs' | 'features';
const NAVS: { id: Nav; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'rig', label: 'Rig', icon: Truck, color: 'from-blue-600 to-indigo-500' },
  { id: 'trailer', label: 'Trailer', icon: Box, color: 'from-emerald-600 to-teal-500' },
  { id: 'specs', label: 'Specs', icon: Gauge, color: 'from-amber-500 to-orange-500' },
  { id: 'features', label: 'Features', icon: Star, color: 'from-violet-600 to-purple-500' },
];

const Counter = ({
  value, onChange, min, max, label, color, lg,
}: {
  value: number; onChange: (v: number) => void; min: number; max: number;
  label: string; color: string; lg?: boolean;
}) => (
  <div className="flex items-center gap-5 justify-center">
    <button type="button" onClick={() => onChange(Math.max(min, value - 1))}
      className={cn('rounded-2xl border-2 border-border/60 flex items-center justify-center font-bold transition-all active:scale-90 hover:border-primary/40', lg ? 'size-14 text-2xl' : 'size-11 text-xl')}>−</button>
    <div className="text-center min-w-20">
      <motion.span key={value} initial={{ scale: 1.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className={cn('font-black tabular-nums block', color, lg ? 'text-7xl' : 'text-5xl')}>{value}</motion.span>
      <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-widest">{label}</p>
    </div>
    <button type="button" onClick={() => onChange(Math.min(max, value + 1))}
      className={cn('rounded-2xl border-2 border-border/60 flex items-center justify-center font-bold transition-all active:scale-90 hover:border-primary/40', lg ? 'size-14 text-2xl' : 'size-11 text-xl')}>+</button>
  </div>
);

const Fld = ({ label, children, icon }: { label: string; children: React.ReactNode; icon?: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">{icon}{label}</Label>
    {children}
  </div>
);

export const EquipmentPage: React.FC = () => {
  const { getToken } = useAuth();
  const [form, setForm] = useState<EquipmentForm>(INIT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [dialogCategory, setDialogCategory] = useState('open');
  const [customInputs, setCustomInputs] = useState<string[]>(['']);
  const [nav, setNav] = useState<Nav>('rig');

  const getCapLimit = (type: string) =>
    trailerTypeOptions.find(t => t.value === type)?.maxCapacity ?? 1;

  const patch = useCallback((u: Partial<EquipmentForm>) => setForm(f => {
    const next = { ...f, ...u };
    if (u.trailerType) {
      const cap = trailerTypeOptions.find(t => t.value === u.trailerType)?.maxCapacity ?? 12;
      next.maxVehicleCapacity = cap;
    }
    return next;
  }), []);

  const fetchProfile = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await apiClient.get('/api/driver-profile', { headers: { Authorization: `Bearer ${token}` } });
      const d = res.data?.data as DriverProfile | undefined;
      if (d) {
        setForm({
          truckMake: d.truckMake || '', truckModel: d.truckModel || '', truckYear: d.truckYear, truckColor: d.truckColor || '',
          engineType: d.engineType || '', gvwr: d.gvwr, vin: d.vin || '', plateNumber: d.plateNumber || '',
          dotNumber: d.dotNumber || '', mcNumber: d.mcNumber || '', trailerType: d.trailerType || '',
          customTrailerName: (d as any).customTrailerName || '',
          trailerMake: d.trailerMake || '', trailerModel: d.trailerModel || '', trailerYear: d.trailerYear,
          hitchType: d.hitchType || '', maxVehicleCapacity: d.maxVehicleCapacity || 1, trailerLength: d.trailerLength,
          trailerAxles: d.trailerAxles || 2, trailerGvwr: d.trailerGvwr, specialFeatures: d.specialFeatures || [],
        });
        const match = trailerTypeOptions.find(t => t.value === d.trailerType);
        if (match) setDialogCategory(match.category);
      }
    } catch { toast.error('Failed to load equipment data'); }
    finally { setLoading(false); }
  }, [getToken]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const buildEquipmentPayload = useCallback((section: Nav | 'all') => {
    const payload: Record<string, unknown> = {};

    if (section === 'rig' || section === 'all') {
      Object.assign(payload, {
        truckMake: form.truckMake.trim(),
        truckModel: form.truckModel.trim(),
        truckYear: form.truckYear || undefined,
        truckColor: form.truckColor.trim(),
        engineType: form.engineType.trim(),
        gvwr: form.gvwr || undefined,
        vin: form.vin.trim(),
        plateNumber: form.plateNumber.trim(),
        dotNumber: form.dotNumber.trim(),
        mcNumber: form.mcNumber.trim(),
      });
    }

    if (section === 'trailer' || section === 'all') {
      Object.assign(payload, {
        // Do not manufacture equipment configuration from UI defaults.
        trailerType: form.trailerType || undefined,
        maxVehicleCapacity: form.trailerType
          ? form.maxVehicleCapacity
          : undefined,
        customTrailerName:
          form.trailerType === 'other'
            ? form.customTrailerName.trim()
            : '',
        trailerMake: form.trailerMake.trim(),
        trailerModel: form.trailerModel.trim(),
        trailerYear: form.trailerYear || undefined,
        hitchType: form.hitchType,
      });
    }

    if (section === 'specs' || section === 'all') {
      Object.assign(payload, {
        maxVehicleCapacity: form.trailerType
          ? form.maxVehicleCapacity
          : undefined,
        trailerLength: form.trailerLength || undefined,
        trailerAxles: form.trailerAxles,
        trailerGvwr: form.trailerGvwr || undefined,
      });
    }

    if (section === 'features' || section === 'all') {
      Object.assign(payload, {
        specialFeatures: form.specialFeatures,
      });
    }

    return payload;
  }, [form]);

  const persistEquipment = useCallback(
    async (
      section: Nav | 'all',
      options: { announce?: boolean } = {},
    ): Promise<boolean> => {
      if (saving) return false;

      setSaving(true);
      try {
        const token = await getToken();
        await apiClient.patch(
          '/api/driver-profile/equipment',
          buildEquipmentPayload(section),
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (options.announce) {
          toast.success('Equipment saved');
        }

        return true;
      } catch (error: any) {
        toast.error(
          error?.response?.data?.message ||
            'Failed to save equipment progress',
        );
        return false;
      } finally {
        setSaving(false);
      }
    },
    [buildEquipmentPayload, getToken, saving],
  );

  const handleSave = useCallback(async () => {
    await persistEquipment('all', { announce: true });
  }, [persistEquipment]);

  const handleNavigate = useCallback(
    async (nextNav: Nav) => {
      if (nextNav === nav || saving) return;

      // Save only the section the driver is leaving. The backend Equipment
      // endpoint already supports partial PATCH updates, so unfinished fields
      // in later sections cannot overwrite previously saved data.
      const saved = await persistEquipment(nav);
      if (!saved) return;

      setNav(nextNav);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [nav, persistEquipment, saving],
  );

  const toggleFeature = (v: string) =>
    patch({ specialFeatures: form.specialFeatures.includes(v) ? form.specialFeatures.filter(f => f !== v) : [...form.specialFeatures, v] });

  const addCustomFeature = (v: string) => {
    const t = v.trim().toLowerCase().replace(/\s+/g, '_');
    if (!t || form.specialFeatures.includes(t) || form.specialFeatures.length >= 20) return false;
    patch({ specialFeatures: [...form.specialFeatures, t] });
    return true;
  };

  const sel = trailerTypeOptions.find(t => t.value === form.trailerType);
  const cat = sel?.category || 'open';
  const th = TH[cat] || TH.open;

  const equipmentReadiness = useMemo(
    () => getEquipmentReadiness(form),
    [form],
  );
  const pct = equipmentReadiness.percent;

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="size-10 animate-spin text-primary" />
      <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs animate-pulse">Loading Equipment</p>
    </div>
  );

  const inp = "h-11 text-sm font-medium bg-muted/20 border-border/60 focus:border-primary/50 focus:ring-primary/20 rounded-xl";
  const mono = cn(inp, 'font-mono tracking-wide');

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-5">

        <div className="relative overflow-hidden rounded-3xl border border-slate-300/80 dark:border-white/15 shadow-lg dark:shadow-2xl ring-1 ring-slate-200/50 dark:ring-white/[0.03]">
          <div className="absolute inset-0 bg-linear-to-br from-white via-slate-50 to-emerald-50/70 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/8 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-blue-500/6 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23fff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />

          <div className="relative p-5 sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Link href="/driver/profile" className="p-2.5 rounded-xl bg-background/80 dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 transition-colors border border-border/80 dark:border-white/15 backdrop-blur-sm shadow-sm">
                  <ArrowLeft className="size-4.5 text-foreground/80 dark:text-white/80" />
                </Link>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">Equipment & Rig</h1>
                    <Badge className={cn('text-[10px] font-black px-2.5 h-5 bg-linear-to-r text-white border-0 shadow-lg', th.grad, th.glow)}>{sel?.capacity || 'Not configured'}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">Configure your truck, trailer, and capabilities</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <span className="text-4xl font-black tabular-nums text-foreground">{pct}%</span>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                    {equipmentReadiness.complete ? 'Ready' : 'Setup'}
                  </p>
                </div>
                <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2 border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-500 font-extrabold shadow-lg shadow-emerald-500/20 rounded-xl">
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save
                </Button>
              </div>
            </div>

            <div className="mt-6">
              <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden border border-slate-300/70 dark:border-white/10">
                <motion.div className="h-full rounded-full bg-linear-to-r from-emerald-400 to-teal-400" initial={false} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, ease: 'easeOut' }} />
              </div>
              {!equipmentReadiness.complete && equipmentReadiness.missing.length > 0 && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Required for Equipment Readiness: {equipmentReadiness.missing.map((item) => item.label).join(', ')}
                </p>
              )}
              <p className="mt-1 text-[10px] text-muted-foreground/80">
                Progress is saved automatically before you move to another Equipment section.
              </p>
            </div>

            <div className="flex gap-1.5 mt-5">
              {NAVS.map(n => {
                const active = nav === n.id;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => void handleNavigate(n.id)}
                    disabled={saving}
                    className={cn(
                      'flex-1 flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2.5 p-3 sm:p-3.5 rounded-xl transition-all border relative overflow-hidden disabled:cursor-wait disabled:opacity-60',
                      active ? 'bg-background/90 dark:bg-white/10 border-primary/35 dark:border-white/25 shadow-md' : 'bg-background/55 dark:bg-white/[0.04] border-border/70 dark:border-white/10 hover:bg-muted/70 dark:hover:bg-white/[0.07]'
                    )}>
                    {active && <motion.div layoutId="nav-glow" className={cn('absolute inset-x-0 top-0 h-0.5 bg-linear-to-r', n.color)} transition={{ type: 'spring', stiffness: 400, damping: 35 }} />}
                    <div className={cn('size-8 rounded-lg flex items-center justify-center shrink-0', active ? 'bg-primary/10 dark:bg-white/10' : 'bg-muted/60 dark:bg-white/5')}>
                      <n.icon className={cn('size-4', active ? 'text-foreground' : 'text-muted-foreground')} />
                    </div>
                    <span className={cn('text-[11px] sm:text-xs font-bold', active ? 'text-foreground' : 'text-muted-foreground')}>{n.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={nav} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>

            {nav === 'rig' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-linear-to-br from-background via-background to-background/50 backdrop-blur-sm shadow-xl">
                  <div className="absolute inset-0 bg-linear-to-br from-blue-500/5 via-transparent to-indigo-500/5" />
                  <div className="relative p-6 sm:p-8 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="size-14 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30"><Truck className="size-7" /></div>
                      <div className="flex-1">
                        <h2 className="text-2xl sm:text-3xl font-black">Truck & Engine</h2>
                        <p className="text-sm text-muted-foreground mt-1">Primary vehicle specifications and details</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border-2 border-border/60 bg-muted/10 p-5 space-y-4">
                      <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Truck Details</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}>
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground">Make</Label>
                            <Input value={form.truckMake} onChange={e => patch({ truckMake: e.target.value })} placeholder="e.g. Peterbilt" className="h-11 bg-linear-to-br from-background to-muted/30 border-2 border-border/70 rounded-xl hover:border-primary/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                          </div>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground">Model</Label>
                            <Input value={form.truckModel} onChange={e => patch({ truckModel: e.target.value })} placeholder="e.g. 389" className="h-11 bg-linear-to-br from-background to-muted/30 border-2 border-border/70 rounded-xl hover:border-primary/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                          </div>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground">Year</Label>
                            <Input type="number" min={1990} max={2030} value={form.truckYear || ''} onChange={e => patch({ truckYear: parseInt(e.target.value) || undefined })} placeholder="2024" className="h-11 bg-linear-to-br from-background to-muted/30 border-2 border-border/70 rounded-xl hover:border-primary/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                          </div>
                        </motion.div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground">Color</Label>
                            <Input value={form.truckColor} onChange={e => patch({ truckColor: e.target.value })} placeholder="e.g. White" className="h-11 bg-linear-to-br from-background to-muted/30 border-2 border-border/70 rounded-xl hover:border-primary/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                          </div>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground">Engine Type</Label>
                            <Input value={form.engineType} onChange={e => patch({ engineType: e.target.value })} placeholder="e.g. Cummins X15" className="h-11 bg-linear-to-br from-background to-muted/30 border-2 border-border/70 rounded-xl hover:border-primary/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                          </div>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground">Truck GVWR (lbs)</Label>
                            <Input type="number" min={0} max={100000} value={form.gvwr || ''} onChange={e => patch({ gvwr: parseInt(e.target.value) || undefined })} placeholder="e.g. 26000" className="h-11 bg-linear-to-br from-background to-muted/30 border-2 border-border/70 rounded-xl hover:border-primary/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                          </div>
                        </motion.div>
                      </div>
                    </div>

                    <div className="rounded-2xl border-2 border-border/60 bg-muted/10 p-5 space-y-4">
                      <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Operating Authority</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground">VIN</Label>
                            <Input value={form.vin} onChange={e => patch({ vin: e.target.value.toUpperCase() })} placeholder="e.g. 1HGCM82633A004352" maxLength={17} className="h-11 font-mono uppercase bg-linear-to-br from-background to-muted/30 border-2 border-border/70 rounded-xl hover:border-primary/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                          </div>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground">License Plate</Label>
                            <Input value={form.plateNumber} onChange={e => patch({ plateNumber: e.target.value.toUpperCase() })} placeholder="e.g. ABC-1234" maxLength={15} className="h-11 font-mono uppercase bg-linear-to-br from-background to-muted/30 border-2 border-border/70 rounded-xl hover:border-primary/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                          </div>
                        </motion.div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }}>
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground">DOT Number</Label>
                            <Input value={form.dotNumber} onChange={e => patch({ dotNumber: e.target.value })} placeholder="e.g. 1234567" className="h-11 font-mono bg-linear-to-br from-background to-muted/30 border-2 border-border/70 rounded-xl hover:border-primary/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                          </div>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground">MC Number</Label>
                            <Input value={form.mcNumber} onChange={e => patch({ mcNumber: e.target.value })} placeholder="e.g. MC-123456" className="h-11 font-mono bg-linear-to-br from-background to-muted/30 border-2 border-border/70 rounded-xl hover:border-primary/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                          </div>
                        </motion.div>
                      </div>
                    </div>

                    <motion.div layout className="flex items-center justify-between border-t border-border/50 pt-6">
                      <Button variant="ghost" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="gap-2 text-muted-foreground rounded-xl"><ArrowLeft className="size-4" /> Back</Button>
                      <Button onClick={() => void handleNavigate('trailer')} disabled={saving} className="gap-2 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20">
                        Next: Trailer <ChevronRight className="size-4" />
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}

            {nav === 'trailer' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-linear-to-br from-background via-background to-background/50 backdrop-blur-sm shadow-xl">
                  <div className="absolute inset-0 bg-linear-to-br from-emerald-500/5 via-transparent to-teal-500/5" />
                  <div className="relative p-6 sm:p-8 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="size-14 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30"><Box className="size-7" /></div>
                      <div className="flex-1">
                        <h2 className="text-2xl sm:text-3xl font-black">Trailer Configuration</h2>
                        <p className="text-sm text-muted-foreground mt-1">Trailer type, details and hitch configuration</p>
                      </div>
                      {sel && <Badge className={cn('text-xs font-bold px-3 py-1.5 bg-linear-to-r text-white border-0 shadow-lg', th.grad)}>{sel.capacity}</Badge>}
                    </div>

                    <div className="rounded-2xl border-2 border-border/60 bg-muted/10 p-5 space-y-4">
                      <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Trailer Type *</h3>
                      <motion.button type="button" onClick={() => setTypeDialogOpen(true)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full relative overflow-hidden rounded-2xl border-2 border-border/70 bg-linear-to-br from-background to-muted/30 p-4 text-left transition-all hover:border-primary/50 hover:shadow-md group">
                        <div className="flex items-center gap-4">
                          <div className={cn('w-20 h-14 rounded-xl flex items-center justify-center shrink-0', th.bg)}>
                            {sel ? (
                              <TSvg cat={cat} className="w-full h-full p-2" />
                            ) : (
                              <Box className="size-7 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-base">{sel?.label || 'Select Trailer Type'}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{sel?.description || 'Click to select your trailer configuration'}</p>
                          </div>
                          <ChevronRight className="size-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                        </div>
                      </motion.button>
                      {form.trailerType === 'other' && (
                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 pt-2">
                          <Label className="text-xs font-bold text-muted-foreground">Custom Trailer Name *</Label>
                          <Input value={form.customTrailerName} onChange={e => patch({ customTrailerName: e.target.value })} placeholder="e.g. Custom 4-Car Enclosed Wedge" maxLength={80}
                            className="h-11 bg-linear-to-br from-background to-muted/30 border-2 border-border/70 rounded-xl hover:border-primary/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                          <p className="text-[10px] text-muted-foreground">Describe your trailer so dispatchers know what you haul</p>
                        </motion.div>
                      )}
                    </div>

                    <div className="rounded-2xl border-2 border-border/60 bg-muted/10 p-5 space-y-4">
                      <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Trailer Details</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}>
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground">Make</Label>
                            <Input value={form.trailerMake} onChange={e => patch({ trailerMake: e.target.value })} placeholder="e.g. Kaufman" className="h-11 bg-linear-to-br from-background to-muted/30 border-2 border-border/70 rounded-xl hover:border-primary/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                          </div>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground">Model</Label>
                            <Input value={form.trailerModel} onChange={e => patch({ trailerModel: e.target.value })} placeholder="e.g. Deluxe" className="h-11 bg-linear-to-br from-background to-muted/30 border-2 border-border/70 rounded-xl hover:border-primary/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                          </div>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground">Year</Label>
                            <Input type="number" min={1990} max={2030} value={form.trailerYear || ''} onChange={e => patch({ trailerYear: parseInt(e.target.value) || undefined })} placeholder="2024" className="h-11 bg-linear-to-br from-background to-muted/30 border-2 border-border/70 rounded-xl hover:border-primary/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                          </div>
                        </motion.div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Hitch Type</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {hitchTypeOptions.map((opt, idx) => {
                            const a = form.hitchType === opt.value;
                            return (
                              <motion.button key={opt.value} type="button" onClick={() => patch({ hitchType: a ? '' : opt.value })} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                className={cn('flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center',
                                  a ? 'border-emerald-500 bg-emerald-500/10 shadow-md ring-1 ring-emerald-500/30' : 'border-border/60 hover:border-border/80')}>
                                <span className={cn('text-xs font-bold', a && 'text-emerald-600 dark:text-emerald-400')}>{opt.label}</span>
                                {a && <CheckCircle2 className="size-4 text-emerald-500" />}
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <motion.div layout className="flex items-center justify-between border-t border-border/50 pt-6">
                      <Button variant="ghost" onClick={() => void handleNavigate('rig')} disabled={saving} className="gap-2 text-muted-foreground rounded-xl"><ArrowLeft className="size-4" /> Back</Button>
                      <Button onClick={() => void handleNavigate('specs')} disabled={saving} className="gap-2 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20">
                        Next: Specs <ChevronRight className="size-4" />
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}

            {nav === 'specs' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-linear-to-br from-background via-background to-background/50 backdrop-blur-sm shadow-xl">
                  <div className="absolute inset-0 bg-linear-to-br from-emerald-500/5 via-transparent to-teal-500/5" />
                  <div className="relative p-6 sm:p-8 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="size-14 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30"><Gauge className="size-7" /></div>
                      <div className="flex-1">
                        <h2 className="text-2xl sm:text-3xl font-black">Trailer Specifications</h2>
                        <p className="text-sm text-muted-foreground mt-1">Capacity, dimensions, and weight specifications</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0 }} className="relative overflow-hidden rounded-2xl border-2 border-border/60 bg-muted/10 p-5 space-y-4 h-full">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-xl bg-linear-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
                            <Gauge className="size-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-black">Max Vehicles</h4>
                            <p className="text-xs text-muted-foreground">{form.maxVehicleCapacity} of {getCapLimit(form.trailerType)}</p>
                          </div>
                        </div>
                        <input type="range" min={1} max={getCapLimit(form.trailerType)} value={form.maxVehicleCapacity} onChange={e => patch({ maxVehicleCapacity: parseInt(e.target.value) })}
                          className="w-full h-4 bg-muted/30 rounded-full appearance-none cursor-pointer accent-amber-500" />
                        <div className="flex items-center justify-between text-base text-muted-foreground font-bold">
                          <span>1</span>
                          <span className="text-amber-600 text-lg font-black">{form.maxVehicleCapacity}</span>
                          <span>{getCapLimit(form.trailerType)}</span>
                        </div>
                        <div className="pt-1 flex justify-center">
                          <div className="flex gap-1.5">
                            {Array.from({ length: getCapLimit(form.trailerType) }, (_, i) => (
                              <motion.div key={i} initial={false}
                                animate={{ scale: i < form.maxVehicleCapacity ? 1 : 0.6, opacity: i < form.maxVehicleCapacity ? 1 : 0.2 }}
                                className={cn('size-3 rounded-full', i < form.maxVehicleCapacity ? 'bg-amber-500 shadow-sm shadow-amber-500/30' : 'bg-border')} />
                            ))}
                          </div>
                        </div>
                      </motion.div>

                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="relative overflow-hidden rounded-2xl border-2 border-border/60 bg-muted/10 p-5 space-y-4 h-full">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-xl bg-linear-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/30">
                            <Ruler className="size-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-black">Trailer Length</h4>
                            <p className="text-xs text-muted-foreground">{form.trailerLength || 0} feet</p>
                          </div>
                        </div>
                        <input type="range" min={0} max={80} value={form.trailerLength || 0} onChange={e => patch({ trailerLength: parseInt(e.target.value) || undefined })}
                          className="w-full h-4 bg-muted/30 rounded-full appearance-none cursor-pointer accent-violet-500" />
                        <div className="flex items-center justify-between text-base text-muted-foreground font-bold">
                          <span>0 ft</span>
                          <span className="text-violet-600 text-lg font-black">{form.trailerLength || 0} ft</span>
                          <span>80 ft</span>
                        </div>
                        <div className="pt-1">
                          <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                            <motion.div className="h-full rounded-full bg-linear-to-r from-violet-500 to-purple-500 shadow-lg shadow-violet-500/30" initial={false}
                              animate={{ width: `${((form.trailerLength || 0) / 80) * 100}%` }} transition={{ duration: 0.3, ease: 'easeOut' }} />
                          </div>
                        </div>
                      </motion.div>

                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="relative overflow-hidden rounded-2xl border-2 border-border/60 bg-muted/10 p-5 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-xl bg-linear-to-br from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/30">
                            <Settings2 className="size-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-black">Axle Count</h4>
                            <p className="text-xs text-muted-foreground">{form.trailerAxles} axles</p>
                          </div>
                        </div>
                        <input type="range" min={1} max={10} value={form.trailerAxles} onChange={e => patch({ trailerAxles: parseInt(e.target.value) })}
                          className="w-full h-4 bg-muted/30 rounded-full appearance-none cursor-pointer accent-rose-500" />
                        <div className="flex items-center justify-between text-base text-muted-foreground font-bold">
                          <span>1</span>
                          <span className="text-rose-600 text-lg font-black">{form.trailerAxles}</span>
                          <span>10</span>
                        </div>
                      </motion.div>

                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="relative overflow-hidden rounded-2xl border-2 border-border/60 bg-muted/10 p-5 space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="size-10 rounded-xl bg-linear-to-br from-orange-500 to-red-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
                            <Gauge className="size-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-black">Trailer GVWR</h4>
                            <p className="text-xs text-muted-foreground">Gross Vehicle Weight Rating</p>
                          </div>
                        </div>
                        <Input type="number" min={0} max={100000} value={form.trailerGvwr || ''} onChange={e => patch({ trailerGvwr: parseInt(e.target.value) || undefined })}
                          placeholder="e.g. 14000" className="h-12 text-lg font-bold text-center bg-linear-to-br from-background to-muted/30 border-2 border-border/70 rounded-xl hover:border-primary/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                        <p className="text-xs text-muted-foreground text-center font-medium">Weight in pounds (lbs)</p>
                      </motion.div>
                    </div>

                    <motion.div layout className="flex items-center justify-between border-t border-border/50 pt-6">
                      <Button variant="ghost" onClick={() => void handleNavigate('trailer')} disabled={saving} className="gap-2 text-muted-foreground rounded-xl"><ArrowLeft className="size-4" /> Back</Button>
                      <Button onClick={() => void handleNavigate('features')} disabled={saving} className="gap-2 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20">
                        Next: Features <ChevronRight className="size-4" />
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}

            {nav === 'features' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-linear-to-br from-background via-background to-background/50 backdrop-blur-sm shadow-xl">
                  <div className="absolute inset-0 bg-linear-to-br from-emerald-500/5 via-transparent to-teal-500/5" />
                  <div className="relative p-6 sm:p-8 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="size-14 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30"><Star className="size-7" /></div>
                      <div className="flex-1">
                        <h2 className="text-2xl sm:text-3xl font-black">Special Features</h2>
                        <p className="text-sm text-muted-foreground mt-1">Capabilities and special features on your rig</p>
                      </div>
                      <Badge className="text-xs font-bold bg-linear-to-r from-emerald-600 to-teal-600 text-white border-0 shadow-lg">{form.specialFeatures.length} selected</Badge>
                    </div>

                    <div className="rounded-2xl border-2 border-border/60 bg-muted/10 p-5 space-y-4">
                      <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Available Features</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {specialFeatureOptions.map((opt, idx) => {
                          const a = form.specialFeatures.includes(opt.value);
                          return (
                            <motion.button key={opt.value} type="button" onClick={() => toggleFeature(opt.value)}
                              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.03 }}
                              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              className={cn('relative flex items-center justify-between gap-2 p-3 rounded-xl border-2 transition-all text-left',
                                a ? 'border-emerald-500 bg-emerald-500/10 shadow-md ring-1 ring-emerald-500/30' : 'border-border/60 hover:border-border/80 hover:shadow-md')}>
                              <span className={cn('text-xs font-bold truncate flex-1', a && 'text-emerald-600 dark:text-emerald-400')}>{opt.label}</span>
                              {a ? <CheckCircle2 className="size-5 text-emerald-500 shrink-0" /> : <Circle className="size-4 text-border shrink-0" />}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {form.specialFeatures.filter(f => !specialFeatureOptions.find(o => o.value === f)).length > 0 && (
                      <div className="rounded-2xl border-2 border-border/60 bg-muted/10 p-5 space-y-3">
                        <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Custom Features</h3>
                        <div className="flex flex-wrap gap-2">
                          {form.specialFeatures.filter(f => !specialFeatureOptions.find(o => o.value === f)).map((f, idx) => (
                            <motion.div key={f} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }}>
                              <Badge className="gap-1.5 pr-1.5 text-xs capitalize border-emerald-500/30 bg-emerald-500/10 border">
                                {f.replace(/_/g, ' ')}
                                <button type="button" onClick={() => patch({ specialFeatures: form.specialFeatures.filter(x => x !== f) })} className="hover:text-destructive transition-colors">
                                  <X className="size-3.5" />
                                </button>
                              </Badge>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="rounded-2xl border-2 border-border/60 bg-muted/10 p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Add Custom Features</h3>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setCustomInputs(p => [...p, ''])} disabled={form.specialFeatures.length >= 20}
                          className="gap-1.5 text-xs h-7 text-primary hover:text-primary hover:bg-primary/10 rounded-lg">
                          <Plus className="size-3.5" /> Add
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {customInputs.map((v, idx) => (
                          <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }} className="flex gap-2">
                            <Input value={v} onChange={e => setCustomInputs(p => p.map((x, i) => i === idx ? e.target.value : x))}
                              placeholder="e.g. Satellite GPS" className="h-11 bg-linear-to-br from-background to-muted/30 border-2 border-border/70 rounded-xl hover:border-primary/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm flex-1"
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (addCustomFeature(customInputs[idx])) setCustomInputs(p => p.length === 1 ? [''] : p.filter((_, i) => i !== idx));
                                }
                              }} />
                            <Button type="button" variant="outline" size="icon" className="size-11 shrink-0 rounded-xl hover:bg-emerald-500/10"
                              onClick={() => { if (addCustomFeature(customInputs[idx])) setCustomInputs(p => p.length === 1 ? [''] : p.filter((_, i) => i !== idx)); }}
                              disabled={!v.trim()}>
                              <Plus className="size-4" />
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    <motion.div layout className="flex items-center justify-between border-t border-border/50 pt-6">
                      <Button variant="ghost" onClick={() => void handleNavigate('specs')} disabled={saving} className="gap-2 text-muted-foreground rounded-xl"><ArrowLeft className="size-4" /> Back</Button>
                      <Button onClick={handleSave} disabled={saving} className="gap-2 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20">
                        {saving ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Save Equipment
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}

          </motion.div>
        </AnimatePresence>

        <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
          <DialogContent className="max-w-5xl h-[85vh] p-0 gap-0 rounded-3xl overflow-hidden shadow-2xl border border-border/60 flex flex-col bg-background">
            {/* Header - Fixed */}
            <div className="shrink-0 bg-background border-b border-border/50 p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={cn('size-14 rounded-xl bg-linear-to-br flex items-center justify-center text-white shadow-lg', th.grad, th.glow)}>
                    <Box className="size-7" />
                  </div>
                  <DialogHeader className="space-y-1 text-left">
                    <DialogTitle className="text-xl font-black">
                      Select Trailer Type
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Choose the right configuration for your needs.
                    </DialogDescription>
                  </DialogHeader>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setTypeDialogOpen(false)} className="rounded-xl h-10 w-10">
                  <X className="size-5" />
                </Button>
              </div>
            </div>

            {/* Category Tabs - Fixed, Horizontal Scroll */}
            <div className="shrink-0 border-b border-border/50 bg-muted/5 px-6 py-4 overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent">
              <div className="flex gap-3 min-w-max">
                {TRAILER_CATEGORIES.map((c) => {
                  const a = dialogCategory === c.id;
                  const count = trailerTypeOptions.filter(t => t.category === c.id).length;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setDialogCategory(c.id)}
                      className={cn(
                        'px-5 py-2 rounded-lg border-2 whitespace-nowrap transition-all font-semibold text-sm flex items-center gap-2',
                        a
                          ? `border-foreground text-foreground bg-foreground/5`
                          : 'border-border/70 text-muted-foreground hover:border-primary/60 hover:bg-muted/10'
                      )}>
                      <span>{c.label}</span>
                      <span className={cn('text-xs px-2 py-0.5 rounded-md font-bold', a ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground')}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content Grid - Scrollable */}
            <div className="flex-1 overflow-y-auto px-8 py-8 scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent">
              <AnimatePresence mode="wait">
                <motion.div
                  key={dialogCategory}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                  className="grid grid-cols-1 gap-5">
                  {trailerTypeOptions.filter(t => t.category === dialogCategory).map((opt, idx) => {
                    const s = form.trailerType === opt.value;
                    const ct = TH[opt.category] || TH.open;
                    return (
                      <motion.button
                        key={opt.value}
                        type="button"
                        onClick={() => { patch({ trailerType: opt.value }); setTypeDialogOpen(false); }}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.08, duration: 0.3 }}
                        whileHover={{ scale: 1.02, x: 8 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          'relative flex flex-row rounded-2xl border-2 transition-all overflow-hidden group cursor-pointer h-44',
                          s
                            ? cn('shadow-xl ring-2 border-current', ct.ring, ct.glow, 'bg-muted/50')
                            : 'border-border/70 hover:border-border/70 hover:shadow-lg hover:bg-muted/20 bg-muted/5'
                        )}>
                        {/* Image Area - Left Side */}
                        <div className={cn('shrink-0 w-44 h-full flex items-center justify-center relative overflow-hidden bg-linear-to-br', ct.bg)}>
                          <div className={cn('absolute inset-0 opacity-10 bg-linear-to-r', ct.grad)} />
                          <TSvg cat={opt.category} className="w-2/3 h-2/3 relative drop-shadow-sm" />
                          {s && <motion.div className={cn('absolute inset-0 rounded-2xl pointer-events-none border-2', ct.ring)} />}
                        </div>

                        {/* Text Content - Right Side */}
                        <div className="flex-1 p-5 flex flex-col justify-between">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <h3 className="font-bold text-base leading-tight">{opt.label}</h3>
                              <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
                            </div>
                            {s && <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 500 }} className="shrink-0">
                              <CheckCircle2 className={cn('size-6', ct.text)} />
                            </motion.div>}
                          </div>
                          <div className={cn('text-xs font-bold px-3 py-1.5 rounded-lg w-fit bg-linear-to-r text-white', ct.grad)}>
                            {opt.capacity}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer - Simple */}
            <div className="shrink-0 border-t border-border/50 px-8 py-4 bg-muted/5 text-center">
              <p className="text-xs font-semibold text-muted-foreground">
                {trailerTypeOptions.filter(t => t.category === dialogCategory).length} trailer types in <span className="text-foreground font-bold">{TRAILER_CATEGORIES.find(c => c.id === dialogCategory)?.label}</span>
              </p>
            </div>
          </DialogContent>
        </Dialog>

      </motion.div>
    </div>
  );
};
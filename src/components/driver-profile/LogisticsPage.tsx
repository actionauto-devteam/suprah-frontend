'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api-client';
import { DriverProfile } from '@/types/driver-profile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Loader2, MapPin, Save, Navigation, Route, Calendar,
  ArrowLeft, CheckCircle2, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { operationalStatusOptions, US_STATES, AVAILABLE_DAYS } from './driver-profile-constants';
import { PreferredRoutesEditor } from './PreferredRoutesEditor';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.06 } } };

export const LogisticsPage: React.FC = () => {
  const { getToken } = useAuth();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [opStatus, setOpStatus] = useState('active');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [radius, setRadius] = useState(500);
  const [routes, setRoutes] = useState<string[]>([]);
  const [days, setDays] = useState<string[]>(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);

  const fetchProfile = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await apiClient.get('/api/driver-profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data?.data;
      if (data) {
        setProfile(data);
        setOpStatus(data.operationalStatus || 'active');
        setAddress(data.homeBase?.address || '');
        setCity(data.homeBase?.city || '');
        setState(data.homeBase?.state || '');
        setZip(data.homeBase?.zip || '');
        setRadius(data.serviceRadius || 500);
        setRoutes(data.preferredRoutes || []);
        setDays(data.availableDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
      }
    } catch {
      toast.error('Failed to load logistics data');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const toggleDay = (d: string) => setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      const res = await apiClient.patch('/api/driver-profile/logistics', {
        operationalStatus: opStatus,
        homeBase: { address: address.trim(), city: city.trim(), state, zip: zip.trim() },
        serviceRadius: radius,
        preferredRoutes: routes,
        availableDays: days,
      }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.data) setProfile(res.data.data);
      toast.success('Logistics saved successfully');
    } catch {
      toast.error('Failed to save logistics');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="size-10 animate-spin text-emerald-600" />
        <p className="text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest text-xs animate-pulse">Loading Logistics</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
      <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">

        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/driver/profile" className="p-2 rounded-xl hover:bg-muted/50 transition-colors">
              <ArrowLeft className="size-5" />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Logistics & Operations</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Manage your availability, home base, and service area</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2 shadow-lg">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save All
          </Button>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="border-border/50 shadow-md overflow-hidden">
            <CardHeader className="pb-4 border-b border-border/10 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <Zap className="size-6 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-xl font-extrabold">Work Availability</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Set whether you are available for new dispatch work</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 sm:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {operationalStatusOptions.map((opt) => (
                  <motion.button
                    key={opt.value}
                    type="button"
                    onClick={() => setOpStatus(opt.value)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className={cn(
                      "flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all",
                      opStatus === opt.value
                        ? "border-emerald-500 bg-emerald-500/5 shadow-md ring-2 ring-emerald-500/20"
                        : "border-border/40 hover:border-border"
                    )}
                  >
                    <div className={cn("size-5 rounded-full", opt.color)} />
                    <span className="text-sm font-bold">{opt.label}</span>
                    <span className="text-[10px] text-muted-foreground text-center leading-tight">{opt.description}</span>
                  </motion.button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="border-border/50 shadow-md overflow-hidden">
            <CardHeader className="pb-4 border-b border-border/10 bg-gradient-to-br from-blue-500/5 to-indigo-500/5">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                  <MapPin className="size-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl font-extrabold">Home Base</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Your base for load matching and return trips</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Street Address</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" className="h-11" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">City</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Salt Lake City" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">State</Label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Select</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">ZIP Code</Label>
                  <Input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="84101" maxLength={10} className="h-11" />
                </div>
              </div>
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Service Radius</Label>
                  <span className="text-xl font-black text-emerald-600">{radius} mi</span>
                </div>
                <Slider value={[radius]} onValueChange={([v]) => setRadius(v)} min={25} max={3000} step={25} className="w-full" />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>25 mi</span>
                  <span>3,000 mi</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="border-border/50 shadow-md overflow-hidden">
            <CardHeader className="pb-4 border-b border-border/10 bg-gradient-to-br from-violet-500/5 to-purple-500/5">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                  <Calendar className="size-6 text-violet-600" />
                </div>
                <div>
                  <CardTitle className="text-xl font-extrabold">Availability</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Your regular working schedule</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 space-y-5">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 block">Available Days</Label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_DAYS.map((d) => (
                    <motion.button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDay(d.value)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        "px-5 py-3 rounded-xl border-2 text-sm font-bold transition-all",
                        days.includes(d.value)
                          ? "border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-400 shadow-sm"
                          : "border-border/40 text-muted-foreground hover:border-border"
                      )}
                    >
                      {d.label}
                    </motion.button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 block">
                  <div className="flex items-center gap-1.5"><Route className="size-3" /> Preferred Routes</div>
                </Label>
                <PreferredRoutesEditor
                  routes={routes}
                  onChange={setRoutes}
                  defaultFromState={state}
                  defaultFromCity={city}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} className="flex justify-end pb-8">
          <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2 shadow-lg px-8">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save Logistics
          </Button>
        </motion.div>

      </motion.div>
    </div>
  );
};